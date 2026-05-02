import { TABS } from '../lib/tabs';
import { useStore } from '../store';
import type { LibraryItem, TabKey } from '../types';

interface Props {
  tab: TabKey;
  visibleItems: LibraryItem[];
  onDelete: () => void;
  onExport: () => void;
  onNuke: () => void;
}

export default function SelectionBar({ tab, visibleItems, onDelete, onExport, onNuke }: Props) {
  const selection = useStore((s) => s.selection[tab]);
  const selectAll = useStore((s) => s.selectAll);
  const clearSelection = useStore((s) => s.clearSelection);
  const total = useStore((s) => s.library[tab]).length;
  const config = TABS[tab];

  const count = selection.size;

  return (
    <div className="flex h-12 items-center justify-between border-b border-line bg-bg-elev px-4">
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm text-fg">
          {count > 0 ? (
            <>
              {count.toLocaleString()} selected
              <span className="text-fg-dim"> / {visibleItems.length.toLocaleString()} shown</span>
            </>
          ) : (
            <>
              {visibleItems.length.toLocaleString()} shown
              <span className="text-fg-dim"> / {total.toLocaleString()} total</span>
            </>
          )}
        </span>
        <button
          className="btn-ghost text-xs"
          onClick={() =>
            selectAll(
              tab,
              visibleItems.map((i) => i.id),
            )
          }
          disabled={visibleItems.length === 0}
        >
          Select all visible
        </button>
        {count > 0 && (
          <button className="btn-ghost text-xs" onClick={() => clearSelection(tab)}>
            Clear
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button className="btn-secondary text-xs" onClick={onExport} disabled={total === 0}>
          Export JSON
        </button>
        <button
          className="btn-secondary border-red-900/50 text-xs text-red-400 hover:text-red-300"
          onClick={onNuke}
          disabled={total === 0}
          title={`Delete every item in this tab`}
        >
          Wipe all
        </button>
        <button className="btn-danger text-xs" onClick={onDelete} disabled={count === 0}>
          {config.deleteVerb} {count > 0 ? count : ''}
        </button>
      </div>
    </div>
  );
}
