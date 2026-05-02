export type TabKey = 'tracks' | 'albums' | 'episodes' | 'shows' | 'artists' | 'playlists';

export interface SpotifyImage {
  url: string;
  height: number | null;
  width: number | null;
}

export interface SpotifyUser {
  id: string;
  display_name: string | null;
  email?: string;
  images?: SpotifyImage[];
}

export interface SpotifyArtistRef {
  id: string;
  name: string;
}

export interface Track {
  id: string;
  name: string;
  duration_ms: number;
  artists: SpotifyArtistRef[];
  album: { id: string; name: string; images: SpotifyImage[] };
  uri: string;
}

export interface SavedTrack {
  added_at: string;
  track: Track;
}

export interface Album {
  id: string;
  name: string;
  artists: SpotifyArtistRef[];
  images: SpotifyImage[];
  total_tracks: number;
  release_date: string;
}

export interface SavedAlbum {
  added_at: string;
  album: Album;
}

export interface Episode {
  id: string;
  name: string;
  duration_ms: number;
  release_date: string;
  show?: { id: string; name: string; publisher: string };
  images: SpotifyImage[];
}

export interface SavedEpisode {
  added_at: string;
  episode: Episode;
}

export interface Show {
  id: string;
  name: string;
  publisher: string;
  images: SpotifyImage[];
  total_episodes?: number;
}

export interface SavedShow {
  added_at: string;
  show: Show;
}

export interface Artist {
  id: string;
  name: string;
  images: SpotifyImage[];
  followers?: { total: number };
  genres?: string[];
}

export interface Playlist {
  id: string;
  name: string;
  description: string | null;
  images: SpotifyImage[];
  owner: { id: string; display_name: string | null };
  tracks: { total: number };
  collaborative: boolean;
  public: boolean | null;
  uri: string;
}

export interface AuthState {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface LibraryItem {
  id: string;
  primary: string;
  secondary: string;
  tertiary?: string;
  imageUrl?: string;
  added_at?: string;
  raw: unknown;
}
