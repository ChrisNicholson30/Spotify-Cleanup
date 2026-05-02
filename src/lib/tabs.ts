import type { LibraryItem, TabKey } from '../types';
import {
  deleteInBatches,
  getPlaylists,
  getSavedAlbums,
  getSavedEpisodes,
  getSavedShows,
  getSavedTracks,
  paginateArtists,
  removeSavedAlbums,
  removeSavedEpisodes,
  removeSavedShows,
  removeSavedTracks,
  unfollowArtists,
  unfollowPlaylist,
} from './spotify';
import type { Artist, Playlist, SavedAlbum, SavedEpisode, SavedShow, SavedTrack } from '../types';
import { useStore } from '../store';

export interface TabConfig {
  key: TabKey;
  label: string;
  fetch: (onProgress: (n: number, t?: number) => void) => Promise<unknown[]>;
  toItems: (raw: unknown[]) => LibraryItem[];
  delete: (ids: string[], onProgress: (done: number, total: number) => void) => Promise<void>;
  deleteVerb: string;
  emptyMessage: string;
}

function imageUrl(images?: { url: string }[]): string | undefined {
  return images?.[0]?.url;
}

export const TABS: Record<TabKey, TabConfig> = {
  tracks: {
    key: 'tracks',
    label: 'Saved Tracks',
    fetch: (p) => getSavedTracks(p) as Promise<unknown[]>,
    toItems: (raw) =>
      (raw as SavedTrack[]).map((s) => ({
        id: s.track.id,
        primary: s.track.name,
        secondary: s.track.artists.map((a) => a.name).join(', '),
        tertiary: s.track.album.name,
        imageUrl: imageUrl(s.track.album.images),
        added_at: s.added_at,
        raw: s,
      })),
    delete: (ids, p) => deleteInBatches(ids, removeSavedTracks, p),
    deleteVerb: 'Remove',
    emptyMessage: 'No saved tracks',
  },
  albums: {
    key: 'albums',
    label: 'Saved Albums',
    fetch: (p) => getSavedAlbums(p) as Promise<unknown[]>,
    toItems: (raw) =>
      (raw as SavedAlbum[]).map((s) => ({
        id: s.album.id,
        primary: s.album.name,
        secondary: s.album.artists.map((a) => a.name).join(', '),
        tertiary: `${s.album.total_tracks} tracks · ${s.album.release_date?.slice(0, 4) ?? ''}`,
        imageUrl: imageUrl(s.album.images),
        added_at: s.added_at,
        raw: s,
      })),
    delete: (ids, p) => deleteInBatches(ids, removeSavedAlbums, p),
    deleteVerb: 'Remove',
    emptyMessage: 'No saved albums',
  },
  episodes: {
    key: 'episodes',
    label: 'Saved Episodes',
    fetch: (p) => getSavedEpisodes(p) as Promise<unknown[]>,
    toItems: (raw) =>
      (raw as SavedEpisode[]).map((s) => ({
        id: s.episode.id,
        primary: s.episode.name,
        secondary: s.episode.show?.name ?? '',
        tertiary: s.episode.release_date,
        imageUrl: imageUrl(s.episode.images),
        added_at: s.added_at,
        raw: s,
      })),
    delete: (ids, p) => deleteInBatches(ids, removeSavedEpisodes, p),
    deleteVerb: 'Remove',
    emptyMessage: 'No saved episodes',
  },
  shows: {
    key: 'shows',
    label: 'Saved Shows',
    fetch: (p) => getSavedShows(p) as Promise<unknown[]>,
    toItems: (raw) =>
      (raw as SavedShow[]).map((s) => ({
        id: s.show.id,
        primary: s.show.name,
        secondary: s.show.publisher,
        tertiary: s.show.total_episodes ? `${s.show.total_episodes} episodes` : undefined,
        imageUrl: imageUrl(s.show.images),
        added_at: s.added_at,
        raw: s,
      })),
    delete: (ids, p) => deleteInBatches(ids, removeSavedShows, p),
    deleteVerb: 'Remove',
    emptyMessage: 'No saved shows',
  },
  artists: {
    key: 'artists',
    label: 'Followed Artists',
    fetch: (p) => paginateArtists(p) as Promise<unknown[]>,
    toItems: (raw) =>
      (raw as Artist[]).map((a) => ({
        id: a.id,
        primary: a.name,
        secondary: a.genres?.slice(0, 2).join(', ') ?? '',
        tertiary: a.followers ? `${a.followers.total.toLocaleString()} followers` : undefined,
        imageUrl: imageUrl(a.images),
        raw: a,
      })),
    delete: (ids, p) => deleteInBatches(ids, unfollowArtists, p),
    deleteVerb: 'Unfollow',
    emptyMessage: 'Not following any artists',
  },
  playlists: {
    key: 'playlists',
    label: 'Playlists',
    fetch: (p) => getPlaylists(p) as Promise<unknown[]>,
    toItems: (raw) =>
      (raw as Playlist[]).map((pl) => ({
        id: pl.id,
        primary: pl.name,
        secondary: pl.owner.display_name ?? pl.owner.id,
        tertiary: `${pl.tracks.total} tracks`,
        imageUrl: imageUrl(pl.images),
        raw: pl,
      })),
    delete: async (ids, onProgress) => {
      let done = 0;
      for (const id of ids) {
        await unfollowPlaylist(id);
        done++;
        onProgress(done, ids.length);
      }
    },
    deleteVerb: 'Unfollow / Delete',
    emptyMessage: 'No playlists',
  },
};

export function getTabRaw(tab: TabKey): unknown[] {
  const lib = useStore.getState().library;
  switch (tab) {
    case 'tracks':
      return lib.tracks;
    case 'albums':
      return lib.albums;
    case 'episodes':
      return lib.episodes;
    case 'shows':
      return lib.shows;
    case 'artists':
      return lib.artists;
    case 'playlists':
      return lib.playlists;
  }
}
