import { useEffect, useRef } from 'react';
import { useStore } from '../store';
import type { TabKey } from '../types';

const SORTS: { key: 'added' | 'name' | 'artist'; label: string }[] = [
  { key: 'added', label: 'Recently added' },
  { key: 'name', label: 'Name' },
  { key: 'artist', label: 'Artist / Owner' },
];

interface Props {
  tab: TabKey;
  hasAddedAt: boolean;
}

export default function FilterBar({ tab, hasAddedAt }: Props) {
  const filter = useStore((s) => s.filters[tab]);
  const setFilter = useStore((s) => s.setFilter);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inField =
        target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');
      if (!inField && e.key === '/') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="flex items-center gap-2 px-4 h-12 border-b border-line bg-bg-elev">
      <input
        ref={inputRef}
        type="search"
        placeholder={`Filter… (press / to focus)`}
        value={filter.search}
        onChange={(e) => setFilter(tab, { search: e.target.value })}
        className="input flex-1 max-w-md"
      />
      <select
        className="input max-w-[180px]"
        value={filter.sortBy}
        onChange={(e) => setFilter(tab, { sortBy: e.target.value as 'added' | 'name' | 'artist' })}
      >
        {SORTS.filter((s) => s.key !== 'added' || hasAddedAt).map((s) => (
          <option key={s.key} value={s.key}>
            {s.label}
          </option>
        ))}
      </select>
      <label className="flex items-center gap-2 text-xs text-fg-muted cursor-pointer select-none">
        <input
          type="checkbox"
          checked={filter.groupByArtist}
          onChange={(e) => setFilter(tab, { groupByArtist: e.target.checked })}
          className="accent-spotify"
        />
        Group by artist
      </label>
    </div>
  );
}
