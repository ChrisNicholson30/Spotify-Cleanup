import { generateCodeChallenge, generateCodeVerifier, generateState } from './pkce';

const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID as string | undefined;
const REDIRECT_URI =
  (import.meta.env.VITE_SPOTIFY_REDIRECT_URI as string | undefined) ??
  'http://localhost:5173/callback';

const SCOPES = [
  'user-read-email',
  'user-read-private',
  'user-library-read',
  'user-library-modify',
  'playlist-read-private',
  'playlist-modify-private',
  'playlist-modify-public',
  'user-follow-read',
  'user-follow-modify',
].join(' ');

const TOKEN_URL = 'https://accounts.spotify.com/api/token';
const AUTH_URL = 'https://accounts.spotify.com/authorize';

const VERIFIER_KEY = 'sp_pkce_verifier';
const STATE_KEY = 'sp_pkce_state';
const REFRESH_KEY = 'sp_refresh_token';

interface InMemoryTokens {
  accessToken: string;
  expiresAt: number;
  refreshToken: string;
}

let tokens: InMemoryTokens | null = null;
let refreshInflight: Promise<InMemoryTokens> | null = null;

export function hasClientId(): boolean {
  return !!CLIENT_ID;
}

export function isAuthenticated(): boolean {
  return !!tokens || !!localStorage.getItem(REFRESH_KEY);
}

export function getStoredRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export async function redirectToSpotify(): Promise<void> {
  if (!CLIENT_ID) throw new Error('VITE_SPOTIFY_CLIENT_ID is not set');
  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  const state = generateState();
  sessionStorage.setItem(VERIFIER_KEY, verifier);
  sessionStorage.setItem(STATE_KEY, state);

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    state,
    scope: SCOPES,
  });
  window.location.assign(`${AUTH_URL}?${params}`);
}

export async function handleCallback(searchParams: URLSearchParams): Promise<void> {
  if (!CLIENT_ID) throw new Error('VITE_SPOTIFY_CLIENT_ID is not set');
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  if (error) throw new Error(`Spotify auth error: ${error}`);
  if (!code) throw new Error('Missing code in callback');

  const expectedState = sessionStorage.getItem(STATE_KEY);
  if (!state || state !== expectedState) throw new Error('State mismatch');
  const verifier = sessionStorage.getItem(VERIFIER_KEY);
  if (!verifier) throw new Error('Missing PKCE verifier');

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    client_id: CLIENT_ID,
    code_verifier: verifier,
  });

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed: ${res.status} ${text}`);
  }
  const data = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
  };

  tokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  localStorage.setItem(REFRESH_KEY, data.refresh_token);
  sessionStorage.removeItem(VERIFIER_KEY);
  sessionStorage.removeItem(STATE_KEY);
}

async function refreshAccessToken(): Promise<InMemoryTokens> {
  if (!CLIENT_ID) throw new Error('VITE_SPOTIFY_CLIENT_ID is not set');
  const refreshToken = tokens?.refreshToken ?? localStorage.getItem(REFRESH_KEY);
  if (!refreshToken) throw new Error('No refresh token');

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: CLIENT_ID,
  });

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    logout();
    throw new Error(`Refresh failed: ${res.status}`);
  }
  const data = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };
  const next: InMemoryTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  tokens = next;
  if (data.refresh_token) localStorage.setItem(REFRESH_KEY, data.refresh_token);
  return next;
}

export async function getAccessToken(): Promise<string> {
  if (tokens && tokens.expiresAt - Date.now() > 60_000) {
    return tokens.accessToken;
  }
  if (!refreshInflight) {
    refreshInflight = refreshAccessToken().finally(() => {
      refreshInflight = null;
    });
  }
  const t = await refreshInflight;
  return t.accessToken;
}

export function logout(): void {
  tokens = null;
  localStorage.removeItem(REFRESH_KEY);
  sessionStorage.removeItem(VERIFIER_KEY);
  sessionStorage.removeItem(STATE_KEY);
}
