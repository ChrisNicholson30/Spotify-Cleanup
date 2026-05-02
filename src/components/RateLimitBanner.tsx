import { useEffect, useState } from 'react';
import { useStore } from '../store';

export default function RateLimitBanner() {
  const until = useStore((s) => s.rateLimitedUntil);
  const setUntil = useStore((s) => s.setRateLimitedUntil);
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!until) return;
    const tick = () => {
      const ms = until - Date.now();
      if (ms <= 0) {
        setUntil(null);
        return;
      }
      setRemaining(Math.ceil(ms / 1000));
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [until, setUntil]);

  if (!until) return null;
  return (
    <div className="fixed top-0 inset-x-0 z-50 bg-yellow-600/90 text-black text-sm py-2 text-center font-medium">
      Rate limited by Spotify. Resuming in {remaining}s…
    </div>
  );
}
