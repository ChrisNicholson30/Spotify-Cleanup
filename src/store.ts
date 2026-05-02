import { create } from 'zustand';
import type {
  Artist,
  Playlist,
  SavedAlbum,
  SavedEpisode,
  SavedShow,
  SavedTrack,
  SpotifyUser,
  TabKey,
} from './types';

export type SortBy = 'added' | 'name' | 'artist';

interface LoadingMap {
  tracks: { loading: boolean; loaded: number; total?: number };
  albums: { loading: boolean; loaded: number; total?: number };
  episodes: { loading: boolean; loaded: number; total?: number };
  shows: { loading: boolean; loaded: number; total?: number };
  artists: { loading: boolean; loaded: number; total?: number };
  playlists: { loading: boolean; loaded: number; total?: number };
}

interface Library {
  tracks: SavedTrack[];
  albums: SavedAlbum[];
  episodes: SavedEpisode[];
  shows: SavedShow[];
  artists: Artist[];
  playlists: Playlist[];
}

interface FiltersByTab {
  tracks: { search: string; sortBy: SortBy; groupByArtist: boolean };
  albums: { search: string; sortBy: SortBy; groupByArtist: boolean };
  episodes: { search: string; sortBy: SortBy; groupByArtist: boolean };
  shows: { search: string; sortBy: SortBy; groupByArtist: boolean };
  artists: { search: string; sortBy: SortBy; groupByArtist: boolean };
  playlists: { search: string; sortBy: SortBy; groupByArtist: boolean };
}

const emptyFilters = (): FiltersByTab[TabKey] => ({
  search: '',
  sortBy: 'added',
  groupByArtist: false,
});

interface State {
  user: SpotifyUser | null;
  setUser: (u: SpotifyUser | null) => void;

  library: Library;
  loading: LoadingMap;
  setLibraryItems: <K extends keyof Library>(key: K, items: Library[K]) => void;
  setLoading: (key: TabKey, patch: Partial<LoadingMap[TabKey]>) => void;

  activeTab: TabKey;
  setActiveTab: (tab: TabKey) => void;

  selection: Record<TabKey, Set<string>>;
  toggleSelected: (tab: TabKey, id: string) => void;
  setSelectedRange: (tab: TabKey, ids: string[]) => void;
  selectAll: (tab: TabKey, ids: string[]) => void;
  clearSelection: (tab: TabKey) => void;
  removeFromLibraryAndSelection: (tab: TabKey, ids: string[]) => void;

  filters: FiltersByTab;
  setFilter: (tab: TabKey, patch: Partial<FiltersByTab[TabKey]>) => void;

  rateLimitedUntil: number | null;
  setRateLimitedUntil: (t: number | null) => void;

  toast: { message: string; kind: 'info' | 'error' | 'success' } | null;
  pushToast: (message: string, kind?: 'info' | 'error' | 'success') => void;
}

const initialLoading: LoadingMap = {
  tracks: { loading: false, loaded: 0 },
  albums: { loading: false, loaded: 0 },
  episodes: { loading: false, loaded: 0 },
  shows: { loading: false, loaded: 0 },
  artists: { loading: false, loaded: 0 },
  playlists: { loading: false, loaded: 0 },
};

const emptySelection = (): Record<TabKey, Set<string>> => ({
  tracks: new Set(),
  albums: new Set(),
  episodes: new Set(),
  shows: new Set(),
  artists: new Set(),
  playlists: new Set(),
});

export const useStore = create<State>((set) => ({
  user: null,
  setUser: (user) => set({ user }),

  library: {
    tracks: [],
    albums: [],
    episodes: [],
    shows: [],
    artists: [],
    playlists: [],
  },
  loading: initialLoading,
  setLibraryItems: (key, items) => set((s) => ({ library: { ...s.library, [key]: items } })),
  setLoading: (key, patch) =>
    set((s) => ({
      loading: { ...s.loading, [key]: { ...s.loading[key], ...patch } },
    })),

  activeTab: 'tracks',
  setActiveTab: (activeTab) => set({ activeTab }),

  selection: emptySelection(),
  toggleSelected: (tab, id) =>
    set((s) => {
      const next = new Set(s.selection[tab]);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { selection: { ...s.selection, [tab]: next } };
    }),
  setSelectedRange: (tab, ids) =>
    set((s) => {
      const next = new Set(s.selection[tab]);
      for (const id of ids) next.add(id);
      return { selection: { ...s.selection, [tab]: next } };
    }),
  selectAll: (tab, ids) => set((s) => ({ selection: { ...s.selection, [tab]: new Set(ids) } })),
  clearSelection: (tab) => set((s) => ({ selection: { ...s.selection, [tab]: new Set() } })),
  removeFromLibraryAndSelection: (tab, ids) =>
    set((s) => {
      const idSet = new Set(ids);
      const lib = { ...s.library };
      const filterById = <T>(arr: T[], getId: (x: T) => string) =>
        arr.filter((x) => !idSet.has(getId(x)));
      switch (tab) {
        case 'tracks':
          lib.tracks = filterById(lib.tracks, (x) => x.track.id);
          break;
        case 'albums':
          lib.albums = filterById(lib.albums, (x) => x.album.id);
          break;
        case 'episodes':
          lib.episodes = filterById(lib.episodes, (x) => x.episode.id);
          break;
        case 'shows':
          lib.shows = filterById(lib.shows, (x) => x.show.id);
          break;
        case 'artists':
          lib.artists = filterById(lib.artists, (x) => x.id);
          break;
        case 'playlists':
          lib.playlists = filterById(lib.playlists, (x) => x.id);
          break;
      }
      const sel = new Set(s.selection[tab]);
      for (const id of ids) sel.delete(id);
      return { library: lib, selection: { ...s.selection, [tab]: sel } };
    }),

  filters: {
    tracks: emptyFilters(),
    albums: emptyFilters(),
    episodes: emptyFilters(),
    shows: emptyFilters(),
    artists: emptyFilters(),
    playlists: emptyFilters(),
  },
  setFilter: (tab, patch) =>
    set((s) => ({
      filters: { ...s.filters, [tab]: { ...s.filters[tab], ...patch } },
    })),

  rateLimitedUntil: null,
  setRateLimitedUntil: (t) => set({ rateLimitedUntil: t }),

  toast: null,
  pushToast: (message, kind = 'info') => {
    set({ toast: { message, kind } });
    setTimeout(() => set((s) => (s.toast?.message === message ? { toast: null } : s)), 3500);
  },
}));
