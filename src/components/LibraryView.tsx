import { useEffect, useMemo, useRef, useState } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { useStore } from '../store';
import { TABS, getTabRaw } from '../lib/tabs';
import type { LibraryItem, TabKey } from '../types';
import FilterBar from './FilterBar';
import SelectionBar from './SelectionBar';
import Row from './Row';
import ConfirmDialog from './ConfirmDialog';
import { exportJson } from '../lib/export';

interface Props {
  tab: TabKey;
}

interface ConfirmState {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  holdMs: number;
  destructive: boolean;
  onConfirm: () => void;
}

const CLOSED: ConfirmState = {
  open: false,
  title: '',
  description: '',
  confirmLabel: '',
  holdMs: 0,
  destructive: false,
  onConfirm: () => {},
};

export default function LibraryView({ tab }: Props) {
  const config = TABS[tab];
  const rawItems = useStore((s) => s.library[tab]);
  const filter = useStore((s) => s.filters[tab]);
  const selection = useStore((s) => s.selection[tab]);
  const toggleSelected = useStore((s) => s.toggleSelected);
  const setSelectedRange = useStore((s) => s.setSelectedRange);
  const clearSelection = useStore((s) => s.clearSelection);
  const selectAll = useStore((s) => s.selectAll);
  const removeFromLibraryAndSelection = useStore((s) => s.removeFromLibraryAndSelection);
  const pushToast = useStore((s) => s.pushToast);
  const loading = useStore((s) => s.loading[tab]);

  const items: LibraryItem[] = useMemo(
    () => config.toItems(rawItems as unknown[]),
    [config, rawItems],
  );

  const visibleItems = useMemo(() => {
    const q = filter.search.trim().toLowerCase();
    let out = items;
    if (q) {
      out = out.filter(
        (i) =>
          i.primary.toLowerCase().includes(q) ||
          i.secondary.toLowerCase().includes(q) ||
          (i.tertiary?.toLowerCase().includes(q) ?? false),
      );
    }
    out = [...out].sort((a, b) => {
      switch (filter.sortBy) {
        case 'name':
          return a.primary.localeCompare(b.primary);
        case 'artist':
          return (a.secondary || '').localeCompare(b.secondary || '');
        case 'added':
          if (a.added_at && b.added_at) return b.added_at.localeCompare(a.added_at);
          return 0;
      }
    });
    if (filter.groupByArtist) {
      out = [...out].sort((a, b) => {
        const cmp = (a.secondary || '').localeCompare(b.secondary || '');
        if (cmp !== 0) return cmp;
        return a.primary.localeCompare(b.primary);
      });
    }
    return out;
  }, [items, filter]);

  const lastClickIndex = useRef<number | null>(null);
  const [deleting, setDeleting] = useState<{ done: number; total: number } | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(CLOSED);
  const abortRef = useRef<AbortController | null>(null);

  const handleRowClick = (e: React.MouseEvent, idx: number) => {
    const item = visibleItems[idx];
    if (!item) return;
    if (e.shiftKey && lastClickIndex.current != null) {
      const [from, to] = [lastClickIndex.current, idx].sort((a, b) => a - b);
      const ids = visibleItems.slice(from, to + 1).map((i) => i.id);
      setSelectedRange(tab, ids);
    } else {
      toggleSelected(tab, item.id);
      lastClickIndex.current = idx;
    }
  };

  // Keyboard shortcuts: cmd/ctrl+A select all visible; Delete to delete selected
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inField = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');
      if (inField) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        selectAll(
          tab,
          visibleItems.map((i) => i.id),
        );
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selection.size === 0) return;
        e.preventDefault();
        startDelete();
      } else if (e.key === 'Escape') {
        if (selection.size > 0) clearSelection(tab);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, visibleItems, selection]);

  const performDelete = async (ids: string[]) => {
    if (ids.length === 0) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setDeleting({ done: 0, total: ids.length });
    let committed = 0;
    try {
      await config.delete(
        ids,
        (done, total) => setDeleting({ done, total }),
        {
          signal: controller.signal,
          // Drop each batch from the library + selection as soon as Spotify
          // confirms it. Keeps progress visible if the user cancels or a later
          // batch fails after retries.
          onBatchComplete: (batchIds) => {
            committed += batchIds.length;
            removeFromLibraryAndSelection(tab, batchIds);
          },
        },
      );
      pushToast(
        `${config.deleteVerb}d ${ids.length.toLocaleString()} item${ids.length === 1 ? '' : 's'}`,
        'success',
      );
    } catch (e) {
      const isAbort =
        (e as { name?: string })?.name === 'AbortError' || controller.signal.aborted;
      if (isAbort) {
        pushToast(
          `Cancelled — ${committed.toLocaleString()} of ${ids.length.toLocaleString()} ${config.deleteVerb.toLowerCase()}d`,
          'info',
        );
      } else {
        pushToast(
          `${config.deleteVerb} stopped after ${committed.toLocaleString()} of ${ids.length.toLocaleString()}: ${(e as Error).message}`,
          'error',
        );
      }
    } finally {
      abortRef.current = null;
      setDeleting(null);
    }
  };

  const cancelDelete = () => {
    abortRef.current?.abort();
  };

  const startDelete = () => {
    const ids = Array.from(selection);
    if (ids.length === 0) return;
    setConfirm({
      open: true,
      title: `${config.deleteVerb} ${ids.length} item${ids.length === 1 ? '' : 's'}?`,
      description:
        ids.length > 100
          ? `This will ${config.deleteVerb.toLowerCase()} ${ids.length} items. Hold the button for 3 seconds to confirm.`
          : `This action cannot be undone.`,
      confirmLabel: config.deleteVerb,
      holdMs: ids.length > 100 ? 3000 : 0,
      destructive: true,
      onConfirm: () => {
        setConfirm(CLOSED);
        performDelete(ids);
      },
    });
  };

  const handleExport = () => {
    const data = getTabRaw(tab);
    if (data.length === 0) {
      pushToast('Nothing to export', 'info');
      return;
    }
    exportJson(tab, data);
    pushToast(`Exported ${data.length.toLocaleString()} ${tab} as JSON`, 'success');
  };

  const handleNuke = () => {
    const allIds = items.map((i) => i.id);
    if (allIds.length === 0) return;
    setConfirm({
      open: true,
      title: `Wipe ALL ${allIds.length} ${config.label.toLowerCase()}?`,
      description: `Step 1 of 2 — this will export a JSON backup, then ${config.deleteVerb.toLowerCase()} every item in this tab. Continue?`,
      confirmLabel: 'Continue',
      holdMs: 0,
      destructive: true,
      onConfirm: () => {
        exportJson(tab, getTabRaw(tab));
        setConfirm({
          open: true,
          title: `Final confirmation`,
          description: `Backup downloaded. Hold the button for 3 seconds to ${config.deleteVerb.toLowerCase()} all ${allIds.length} items.`,
          confirmLabel: config.deleteVerb,
          holdMs: 3000,
          destructive: true,
          onConfirm: () => {
            setConfirm(CLOSED);
            performDelete(allIds);
          },
        });
      },
    });
  };

  const isLoading = loading.loading;
  const hasAddedAt = items.some((i) => !!i.added_at);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <FilterBar tab={tab} hasAddedAt={hasAddedAt} />
      <SelectionBar
        tab={tab}
        visibleItems={visibleItems}
        onDelete={startDelete}
        onExport={handleExport}
        onNuke={handleNuke}
      />

      {deleting && (
        <DeletingBar
          verb={config.deleteVerb}
          done={deleting.done}
          total={deleting.total}
          onCancel={cancelDelete}
        />
      )}

      <div className="min-h-0 flex-1">
        {visibleItems.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-fg-muted">
            {isLoading
              ? `Loading ${config.label.toLowerCase()}…`
              : items.length === 0
                ? config.emptyMessage
                : 'No items match the filter'}
          </div>
        ) : (
          <Virtuoso
            data={visibleItems}
            computeItemKey={(_, item) => item.id}
            itemContent={(idx, item) => (
              <Row
                item={item}
                selected={selection.has(item.id)}
                onClick={(e) => handleRowClick(e, idx)}
              />
            )}
          />
        )}
      </div>

      <ConfirmDialog
        open={confirm.open}
        title={confirm.title}
        description={confirm.description}
        confirmLabel={confirm.confirmLabel}
        destructive={confirm.destructive}
        holdToConfirmMs={confirm.holdMs}
        onConfirm={confirm.onConfirm}
        onCancel={() => setConfirm(CLOSED)}
      />
    </div>
  );
}

interface DeletingBarProps {
  verb: string;
  done: number;
  total: number;
  onCancel: () => void;
}

function DeletingBar({ verb, done, total, onCancel }: DeletingBarProps) {
  const rateLimitedUntil = useStore((s) => s.rateLimitedUntil);
  const [now, setNow] = useState(() => Date.now());
  const waitingForRateLimit = rateLimitedUntil != null && rateLimitedUntil > now;

  useEffect(() => {
    if (rateLimitedUntil == null) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [rateLimitedUntil]);

  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  const remainingSec = waitingForRateLimit
    ? Math.max(0, Math.ceil((rateLimitedUntil! - now) / 1000))
    : 0;

  return (
    <div className="border-b border-line bg-bg-elev px-4 py-2">
      <div className="flex items-center justify-between gap-4">
        <span className="font-mono text-xs text-fg-muted">
          {verb}ing {done.toLocaleString()} / {total.toLocaleString()} ({pct}%)
          {waitingForRateLimit && (
            <span className="ml-2 text-yellow-400">
              · paused by Spotify rate limit, retrying in {remainingSec}s
            </span>
          )}
        </span>
        <button className="btn-ghost text-xs" onClick={onCancel}>
          Cancel
        </button>
      </div>
      <div className="mt-1 h-1 w-full overflow-hidden rounded bg-bg">
        <div
          className="h-full bg-fg-muted transition-[width] duration-150"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
