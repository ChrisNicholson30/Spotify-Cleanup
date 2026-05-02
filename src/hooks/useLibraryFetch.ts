import { useEffect, useRef } from 'react';
import { TABS } from '../lib/tabs';
import { useStore } from '../store';
import type { TabKey } from '../types';

export function useLibraryFetch() {
  const setLoading = useStore((s) => s.setLoading);
  const setLibraryItems = useStore((s) => s.setLibraryItems);
  const pushToast = useStore((s) => s.pushToast);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (Object.keys(TABS) as TabKey[]).forEach((key) => {
      setLoading(key, { loading: true, loaded: 0, total: undefined });
      TABS[key]
        .fetch((loaded, total) => setLoading(key, { loaded, total }))
        .then((items) => {
          setLibraryItems(key, items as never);
          setLoading(key, { loading: false });
        })
        .catch((e) => {
          console.error(`Failed to load ${key}`, e);
          setLoading(key, { loading: false });
          pushToast(`Failed to load ${key}: ${e?.message ?? e}`, 'error');
        });
    });
  }, [setLoading, setLibraryItems, pushToast]);
}
