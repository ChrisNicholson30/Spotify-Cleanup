# Spotify Cleanup

Personal-use, browser-only tool to bulk-curate or wipe a Spotify library: saved
tracks, albums, episodes, shows, followed artists, and playlists. Runs on
`localhost`, no backend, no database, no hosting.

## Stack

- Vite + React 18 + TypeScript
- Tailwind CSS, dark by default
- Zustand for state, TanStack Query
- `react-virtuoso` for virtualised lists (handles libraries of 5,000+ items)
- Spotify Web API directly from the browser via PKCE

## Setup

1. Register an app at https://developer.spotify.com/dashboard.
2. Add `http://localhost:5173/callback` to the app's **Redirect URIs**.
3. Add your own Spotify account under **User Management**.
4. Copy `.env.example` to `.env.local` and paste your Client ID:

   ```
   VITE_SPOTIFY_CLIENT_ID=...
   VITE_SPOTIFY_REDIRECT_URI=http://localhost:5173/callback
   ```

5. Install and run:

   ```
   npm install
   npm run dev
   ```

6. Open http://localhost:5173 and click **Connect Spotify**.

## Scopes requested

```
user-read-email user-read-private
user-library-read user-library-modify
playlist-read-private playlist-modify-private playlist-modify-public
user-follow-read user-follow-modify
```

## Behaviour notes

- All tabs fetch in parallel after auth; the sidebar shows live `loaded / total`
  counts.
- Selection: click toggles, shift-click range-selects. `cmd/ctrl+A` selects all
  visible (filtered) items, `Esc` clears, `Delete`/`Backspace` deletes selected,
  `/` focuses the filter.
- Bulk deletes batch into 50s and surface a 3-second hold-to-confirm for
  payloads > 100.
- Each tab has **Export JSON** (`spotify-{tab}-{YYYY-MM-DD}.json`) and **Wipe
  all** (forces export, then double-confirm).
- Rate limiting is handled automatically: on 429 the UI shows a countdown and
  resumes when `Retry-After` elapses.
- The refresh token persists in `localStorage`; access tokens stay in memory and
  refresh on demand.

## Out of scope

- Listening history wipe — not API-accessible. See
  [Spotify privacy / GDPR export](https://www.spotify.com/account/privacy/).
- Algorithm reset — bulk-removing saves and unfollows nudges it over time, but
  there's no direct API.
- Account deletion, multi-user, hosting.
