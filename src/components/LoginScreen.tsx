import { redirectToSpotify } from '../lib/auth';

export default function LoginScreen() {
  return (
    <div className="flex h-full items-center justify-center px-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="space-y-2">
          <div className="mx-auto h-14 w-14 rounded-full bg-spotify flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="h-9 w-9 text-black" aria-hidden>
              <path
                fill="currentColor"
                d="M17.5 16.3a.75.75 0 0 1-1.03.25c-2.83-1.73-6.4-2.12-10.6-1.16a.75.75 0 1 1-.33-1.46c4.6-1.05 8.55-.6 11.71 1.34.36.22.47.69.25 1.03Zm1.47-3.27a.94.94 0 0 1-1.29.31c-3.24-1.99-8.18-2.57-12.01-1.4a.94.94 0 1 1-.55-1.8c4.4-1.34 9.86-.7 13.6 1.6.44.27.58.85.25 1.29Zm.13-3.4C15.32 7.4 8.95 7.16 5.36 8.27a1.13 1.13 0 1 1-.66-2.16C8.83 4.83 15.92 5.1 20.4 7.74a1.13 1.13 0 1 1-1.16 1.94Z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold">Spotify Cleanup</h1>
          <p className="text-fg-muted text-sm">
            Bulk-curate or wipe your saved tracks, albums, follows and playlists.
          </p>
        </div>
        <button
          className="btn-primary w-full text-base py-2.5"
          onClick={() => redirectToSpotify().catch(console.error)}
        >
          Connect Spotify
        </button>
        <p className="text-xs text-fg-dim">
          PKCE flow · token stays in this browser · no server.
        </p>
      </div>
    </div>
  );
}
