import { getAccessToken, logout } from './auth';
import type {
  Artist,
  Playlist,
  SavedAlbum,
  SavedEpisode,
  SavedShow,
  SavedTrack,
  SpotifyUser,
} from '../types';

const API = 'https://api.spotify.com';

export interface PageResponse<T> {
  items: T[];
  next: string | null;
  total?: number;
}

export interface CursorPageResponse<T> {
  artists?: { items: T[]; next: string | null; cursors?: { after?: string }; total?: number };
}

interface RequestOpts {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: RequestOpts['query']): string {
  const url = path.startsWith('http') ? new URL(path) : new URL(API + path);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined) continue;
      url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const id = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(id);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });

let rateLimitNotifier: ((retryAfterSec: number) => void) | null = null;
export function setRateLimitNotifier(fn: ((sec: number) => void) | null) {
  rateLimitNotifier = fn;
}

// Retry-After is sometimes missing, malformed, or absurdly large. Clamp to
// keep us responsive without hammering Spotify when it asks us to back off.
const MIN_RETRY_AFTER_SEC = 2;
const MAX_RETRY_AFTER_SEC = 60;
function parseRetryAfter(header: string | null): number {
  const n = header == null ? NaN : parseInt(header, 10);
  if (!Number.isFinite(n) || n <= 0) return 5;
  return Math.min(MAX_RETRY_AFTER_SEC, Math.max(MIN_RETRY_AFTER_SEC, n));
}

const isAbortError = (e: unknown): boolean =>
  e instanceof DOMException ? e.name === 'AbortError' : (e as { name?: string })?.name === 'AbortError';

// Total attempts allowed for transient (network / 5xx) failures per request.
// 429s do not consume this budget — those retry indefinitely with backoff.
const MAX_TRANSIENT_ATTEMPTS = 8;

export async function request<T>(path: string, opts: RequestOpts = {}): Promise<T> {
  const url = buildUrl(path, opts.query);
  let didRefresh = false;
  let transientAttempts = 0;

  while (true) {
    if (opts.signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }
    const token = await getAccessToken();
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    };
    let body: BodyInit | undefined;
    if (opts.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(opts.body);
    }

    let res: Response;
    try {
      res = await fetch(url, {
        method: opts.method ?? 'GET',
        headers,
        body,
        signal: opts.signal,
      });
    } catch (e) {
      if (isAbortError(e)) throw e;
      // Network failure (offline, DNS, TLS, connection reset). Back off and retry.
      if (transientAttempts >= MAX_TRANSIENT_ATTEMPTS) {
        throw new Error(
          `Spotify network error after ${MAX_TRANSIENT_ATTEMPTS} retries: ${(e as Error)?.message ?? e}`,
        );
      }
      const wait = Math.min(30_000, 500 * 2 ** transientAttempts);
      transientAttempts++;
      await sleep(wait, opts.signal);
      continue;
    }

    if (res.status === 204) return undefined as T;

    if (res.status === 429) {
      const retryAfter = parseRetryAfter(res.headers.get('Retry-After'));
      rateLimitNotifier?.(retryAfter);
      await sleep(retryAfter * 1000, opts.signal);
      continue;
    }

    // 5xx — Spotify side flake. Exponential backoff, bounded retries.
    if (res.status >= 500 && res.status <= 599) {
      if (transientAttempts >= MAX_TRANSIENT_ATTEMPTS) {
        const text = await res.text().catch(() => '');
        throw new Error(`Spotify ${res.status} ${res.statusText} after retries: ${text}`);
      }
      const wait = Math.min(30_000, 500 * 2 ** transientAttempts);
      transientAttempts++;
      await sleep(wait, opts.signal);
      continue;
    }

    if (res.status === 401 && !didRefresh) {
      didRefresh = true;
      try {
        await getAccessToken();
      } catch {
        logout();
        window.location.assign('/');
        throw new Error('Session expired');
      }
      continue;
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Spotify ${res.status} ${res.statusText}: ${text}`);
    }

    const ctype = res.headers.get('Content-Type') ?? '';
    if (ctype.includes('application/json')) {
      return (await res.json()) as T;
    }
    return undefined as T;
  }
}

export async function paginate<T>(
  path: string,
  query: RequestOpts['query'] = { limit: 50 },
  onProgress?: (loaded: number, total?: number) => void,
  signal?: AbortSignal,
): Promise<T[]> {
  const out: T[] = [];
  let next: string | null = buildUrl(path, query);
  let total: number | undefined;
  while (next) {
    const page: PageResponse<T> = await request<PageResponse<T>>(next, { signal });
    out.push(...page.items);
    total = page.total ?? total;
    onProgress?.(out.length, total);
    next = page.next;
  }
  return out;
}

export async function paginateArtists(
  onProgress?: (loaded: number, total?: number) => void,
  signal?: AbortSignal,
): Promise<Artist[]> {
  const out: Artist[] = [];
  let url: string | null = buildUrl('/v1/me/following', { type: 'artist', limit: 50 });
  let total: number | undefined;
  while (url) {
    const res: { artists: { items: Artist[]; next: string | null; total?: number } } =
      await request<{ artists: { items: Artist[]; next: string | null; total?: number } }>(url, {
        signal,
      });
    out.push(...res.artists.items);
    total = res.artists.total ?? total;
    onProgress?.(out.length, total);
    url = res.artists.next;
  }
  return out;
}

export async function getMe(): Promise<SpotifyUser> {
  return request<SpotifyUser>('/v1/me');
}

export async function getSavedTracks(
  onProgress?: (n: number, t?: number) => void,
  signal?: AbortSignal,
) {
  return paginate<SavedTrack>('/v1/me/tracks', { limit: 50 }, onProgress, signal);
}
export async function getSavedAlbums(
  onProgress?: (n: number, t?: number) => void,
  signal?: AbortSignal,
) {
  return paginate<SavedAlbum>('/v1/me/albums', { limit: 50 }, onProgress, signal);
}
export async function getSavedEpisodes(
  onProgress?: (n: number, t?: number) => void,
  signal?: AbortSignal,
) {
  return paginate<SavedEpisode>('/v1/me/episodes', { limit: 50 }, onProgress, signal);
}
export async function getSavedShows(
  onProgress?: (n: number, t?: number) => void,
  signal?: AbortSignal,
) {
  return paginate<SavedShow>('/v1/me/shows', { limit: 50 }, onProgress, signal);
}
export async function getPlaylists(
  onProgress?: (n: number, t?: number) => void,
  signal?: AbortSignal,
) {
  return paginate<Playlist>('/v1/me/playlists', { limit: 50 }, onProgress, signal);
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// Pause between successful batches. Spotify's per-app rolling window penalises
// burst traffic; a small spacing keeps us well below the rate-limit threshold
// when sweeping thousands of items.
const BATCH_PACE_MS = 120;

export interface DeleteBatchOptions {
  signal?: AbortSignal;
  // Called after a batch succeeds so the UI can reflect what was actually
  // removed even if the operation is later cancelled or fails.
  onBatchComplete?: (committedIds: string[]) => void;
}

export async function deleteInBatches(
  ids: string[],
  fn: (batch: string[], signal?: AbortSignal) => Promise<void>,
  onProgress?: (done: number, total: number) => void,
  options: DeleteBatchOptions = {},
): Promise<void> {
  const batches = chunk(ids, 50);
  let done = 0;
  for (let i = 0; i < batches.length; i++) {
    if (options.signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }
    const b = batches[i];
    await fn(b, options.signal);
    done += b.length;
    options.onBatchComplete?.(b);
    onProgress?.(done, ids.length);
    if (i < batches.length - 1) {
      await sleep(BATCH_PACE_MS, options.signal);
    }
  }
}

export async function removeSavedTracks(ids: string[], signal?: AbortSignal) {
  await request('/v1/me/tracks', { method: 'DELETE', body: { ids }, signal });
}
export async function removeSavedAlbums(ids: string[], signal?: AbortSignal) {
  await request('/v1/me/albums', { method: 'DELETE', body: { ids }, signal });
}
export async function removeSavedEpisodes(ids: string[], signal?: AbortSignal) {
  await request('/v1/me/episodes', { method: 'DELETE', body: { ids }, signal });
}
export async function removeSavedShows(ids: string[], signal?: AbortSignal) {
  await request('/v1/me/shows', { method: 'DELETE', query: { ids: ids.join(',') }, signal });
}
export async function unfollowArtists(ids: string[], signal?: AbortSignal) {
  await request('/v1/me/following', {
    method: 'DELETE',
    query: { type: 'artist', ids: ids.join(',') },
    signal,
  });
}
export async function unfollowPlaylist(playlistId: string, signal?: AbortSignal) {
  await request(`/v1/playlists/${playlistId}/followers`, { method: 'DELETE', signal });
}

export async function getPlaylistTracks(
  playlistId: string,
  onProgress?: (n: number, t?: number) => void,
  signal?: AbortSignal,
) {
  return paginate<{
    track: { id: string; uri: string; name: string; artists: { name: string }[] } | null;
  }>(
    `/v1/playlists/${playlistId}/tracks`,
    { limit: 100, fields: 'items(track(id,uri,name,artists(name))),next,total' },
    onProgress,
    signal,
  );
}

export async function removePlaylistTracks(playlistId: string, uris: string[], signal?: AbortSignal) {
  await request(`/v1/playlists/${playlistId}/tracks`, {
    method: 'DELETE',
    body: { tracks: uris.map((uri) => ({ uri })) },
    signal,
  });
}
