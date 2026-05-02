import { useEffect } from 'react';
import { useStore } from '../store';
import { logout } from '../lib/auth';
import { getMe } from '../lib/spotify';
import { TABS } from '../lib/tabs';
import Sidebar from './Sidebar';
import LibraryView from './LibraryView';
import { useLibraryFetch } from '../hooks/useLibraryFetch';

export default function Layout() {
  const user = useStore((s) => s.user);
  const setUser = useStore((s) => s.setUser);
  const activeTab = useStore((s) => s.activeTab);

  useEffect(() => {
    getMe()
      .then(setUser)
      .catch((e) => console.error('getMe failed', e));
  }, [setUser]);

  // Kick off all library fetches in parallel on mount
  useLibraryFetch();

  return (
    <div className="flex h-full">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 items-center justify-between border-b border-line bg-bg-elev px-4">
          <div className="text-sm font-medium text-fg-muted">{TABS[activeTab].label}</div>
          <div className="flex items-center gap-3">
            {user && (
              <div className="flex items-center gap-2 text-sm">
                {user.images?.[0]?.url && (
                  <img src={user.images[0].url} alt="" className="h-6 w-6 rounded-full" />
                )}
                <span className="font-medium">{user.display_name ?? user.id}</span>
              </div>
            )}
            <button
              className="btn-ghost text-xs"
              onClick={() => {
                logout();
                window.location.assign('/');
              }}
            >
              Sign out
            </button>
          </div>
        </header>
        <LibraryView key={activeTab} tab={activeTab} />
      </main>
    </div>
  );
}
