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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let rateLimitNotifier: ((retryAfterSec: number) => void) | null = null;
export function setRateLimitNotifier(fn: ((sec: number) => void) | null) {
  rateLimitNotifier = fn;
}

export async function request<T>(path: string, opts: RequestOpts = {}): Promise<T> {
  const url = buildUrl(path, opts.query);
  let didRefresh = false;
  for (let attempt = 0; attempt < 12; attempt++) {
    const token = await getAccessToken();
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    };
    let body: BodyInit | undefined;
    if (opts.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(opts.body);
    }
    const res = await fetch(url, {
      method: opts.method ?? 'GET',
      headers,
      body,
      signal: opts.signal,
    });

    if (res.status === 204) return undefined as T;

    if (res.status === 429) {
      const retryAfter = parseInt(res.headers.get('Retry-After') ?? '1', 10);
      rateLimitNotifier?.(retryAfter);
      await sleep((retryAfter + 1) * 1000);
      continue;
    }

    if (res.status === 401 && !didRefresh) {
      didRefresh = true;
      // Force refresh by clearing access expiry — getAccessToken will re-fetch.
      // Then retry once.
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
  throw new Error('Spotify request: too many retries');
}

export async function paginate<T>(
  path: string,
  query: RequestOpts['query'] = { limit: 50 },
  onProgress?: (loaded: number, total?: number) => void,
): Promise<T[]> {
  const out: T[] = [];
  let next: string | null = buildUrl(path, query);
  let total: number | undefined;
  while (next) {
    const page: PageResponse<T> = await request<PageResponse<T>>(next);
    out.push(...page.items);
    total = page.total ?? total;
    onProgress?.(out.length, total);
    next = page.next;
  }
  return out;
}

export async function paginateArtists(
  onProgress?: (loaded: number, total?: number) => void,
): Promise<Artist[]> {
  const out: Artist[] = [];
  let url: string | null = buildUrl('/v1/me/following', { type: 'artist', limit: 50 });
  let total: number | undefined;
  while (url) {
    const res: { artists: { items: Artist[]; next: string | null; total?: number } } =
      await request<{ artists: { items: Artist[]; next: string | null; total?: number } }>(url);
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

export async function getSavedTracks(onProgress?: (n: number, t?: number) => void) {
  return paginate<SavedTrack>('/v1/me/tracks', { limit: 50 }, onProgress);
}
export async function getSavedAlbums(onProgress?: (n: number, t?: number) => void) {
  return paginate<SavedAlbum>('/v1/me/albums', { limit: 50 }, onProgress);
}
export async function getSavedEpisodes(onProgress?: (n: number, t?: number) => void) {
  return paginate<SavedEpisode>('/v1/me/episodes', { limit: 50 }, onProgress);
}
export async function getSavedShows(onProgress?: (n: number, t?: number) => void) {
  return paginate<SavedShow>('/v1/me/shows', { limit: 50 }, onProgress);
}
export async function getPlaylists(onProgress?: (n: number, t?: number) => void) {
  return paginate<Playlist>('/v1/me/playlists', { limit: 50 }, onProgress);
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function deleteInBatches(
  ids: string[],
  fn: (batch: string[]) => Promise<void>,
  onProgress?: (done: number, total: number) => void,
): Promise<void> {
  const batches = chunk(ids, 50);
  let done = 0;
  for (const b of batches) {
    await fn(b);
    done += b.length;
    onProgress?.(done, ids.length);
  }
}

export async function removeSavedTracks(ids: string[]) {
  await request('/v1/me/tracks', { method: 'DELETE', body: { ids } });
}
export async function removeSavedAlbums(ids: string[]) {
  await request('/v1/me/albums', { method: 'DELETE', body: { ids } });
}
export async function removeSavedEpisodes(ids: string[]) {
  await request('/v1/me/episodes', { method: 'DELETE', body: { ids } });
}
export async function removeSavedShows(ids: string[]) {
  await request('/v1/me/shows', { method: 'DELETE', query: { ids: ids.join(',') } });
}
export async function unfollowArtists(ids: string[]) {
  await request('/v1/me/following', {
    method: 'DELETE',
    query: { type: 'artist', ids: ids.join(',') },
  });
}
export async function unfollowPlaylist(playlistId: string) {
  await request(`/v1/playlists/${playlistId}/followers`, { method: 'DELETE' });
}

export async function getPlaylistTracks(
  playlistId: string,
  onProgress?: (n: number, t?: number) => void,
) {
  return paginate<{ track: { id: string; uri: string; name: string; artists: { name: string }[] } | null }>(
    `/v1/playlists/${playlistId}/tracks`,
    { limit: 100, fields: 'items(track(id,uri,name,artists(name))),next,total' },
    onProgress,
  );
}

export async function removePlaylistTracks(playlistId: string, uris: string[]) {
  await request(`/v1/playlists/${playlistId}/tracks`, {
    method: 'DELETE',
    body: { tracks: uris.map((uri) => ({ uri })) },
  });
}
