import { TABS } from '../lib/tabs';
import { useStore } from '../store';
import type { TabKey } from '../types';

const ORDER: TabKey[] = ['tracks', 'albums', 'episodes', 'shows', 'artists', 'playlists'];

export default function Sidebar() {
  const activeTab = useStore((s) => s.activeTab);
  const setActiveTab = useStore((s) => s.setActiveTab);
  const loading = useStore((s) => s.loading);
  const library = useStore((s) => s.library);

  return (
    <aside
      className="flex flex-col border-r border-line bg-bg-elev"
      style={{ width: 220, minWidth: 220 }}
    >
      <div className="flex h-12 items-center gap-2 border-b border-line px-4">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-spotify">
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-black">
            <path
              fill="currentColor"
              d="M17.5 16.3a.75.75 0 0 1-1.03.25c-2.83-1.73-6.4-2.12-10.6-1.16a.75.75 0 1 1-.33-1.46c4.6-1.05 8.55-.6 11.71 1.34.36.22.47.69.25 1.03Zm1.47-3.27a.94.94 0 0 1-1.29.31c-3.24-1.99-8.18-2.57-12.01-1.4a.94.94 0 1 1-.55-1.8c4.4-1.34 9.86-.7 13.6 1.6.44.27.58.85.25 1.29Zm.13-3.4C15.32 7.4 8.95 7.16 5.36 8.27a1.13 1.13 0 1 1-.66-2.16C8.83 4.83 15.92 5.1 20.4 7.74a1.13 1.13 0 1 1-1.16 1.94Z"
            />
          </svg>
        </div>
        <div className="text-sm font-semibold">Cleanup</div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {ORDER.map((key) => {
          const tab = TABS[key];
          const items = library[key];
          const ld = loading[key];
          const count = items.length;
          const isActive = activeTab === key;
          let countLabel = count.toLocaleString();
          if (ld.loading) {
            countLabel = ld.total
              ? `${ld.loaded.toLocaleString()} / ${ld.total.toLocaleString()}`
              : `${ld.loaded.toLocaleString()}…`;
          }
          return (
            <button
              key={key}
              className={isActive ? 'tab-btn-active' : 'tab-btn'}
              onClick={() => setActiveTab(key)}
            >
              <span className="truncate">{tab.label}</span>
              <span className="font-mono text-xs text-fg-dim">{countLabel}</span>
            </button>
          );
        })}
      </nav>

      <div className="border-t border-line p-3 text-[11px] leading-relaxed text-fg-dim">
        <p className="mb-1">Listening history & algorithm aren't API-accessible.</p>
        <a
          href="https://www.spotify.com/account/privacy/"
          className="underline hover:text-fg"
          target="_blank"
          rel="noreferrer"
        >
          Spotify privacy / GDPR
        </a>
      </div>
    </aside>
  );
}
