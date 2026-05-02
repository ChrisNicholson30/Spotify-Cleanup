import { useEffect, useState } from 'react';
import { handleCallback, hasClientId, isAuthenticated } from './lib/auth';
import { setRateLimitNotifier } from './lib/spotify';
import { useStore } from './store';
import LoginScreen from './components/LoginScreen';
import Layout from './components/Layout';
import Toast from './components/Toast';
import RateLimitBanner from './components/RateLimitBanner';

type Phase = 'boot' | 'login' | 'callback' | 'app' | 'callback-error';

export default function App() {
  const [phase, setPhase] = useState<Phase>('boot');
  const [callbackError, setCallbackError] = useState<string | null>(null);
  const setRateLimitedUntil = useStore((s) => s.setRateLimitedUntil);

  useEffect(() => {
    setRateLimitNotifier((sec) => setRateLimitedUntil(Date.now() + sec * 1000));
    return () => setRateLimitNotifier(null);
  }, [setRateLimitedUntil]);

  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/callback') {
      setPhase('callback');
      handleCallback(new URLSearchParams(window.location.search))
        .then(() => {
          window.history.replaceState({}, '', '/');
          setPhase('app');
        })
        .catch((e) => {
          setCallbackError(e?.message ?? String(e));
          setPhase('callback-error');
        });
      return;
    }
    if (isAuthenticated()) setPhase('app');
    else setPhase('login');
  }, []);

  if (!hasClientId()) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <div className="max-w-md space-y-3">
          <h1 className="text-2xl font-semibold">Setup required</h1>
          <p className="text-sm text-fg-muted">
            Set <code className="font-mono text-fg">VITE_SPOTIFY_CLIENT_ID</code> in{' '}
            <code className="font-mono text-fg">.env.local</code>, then run{' '}
            <code className="font-mono text-fg">npm run dev</code> again.
          </p>
        </div>
      </div>
    );
  }

  if (phase === 'boot' || phase === 'callback') {
    return (
      <div className="flex h-full items-center justify-center text-sm text-fg-muted">
        Connecting to Spotify…
      </div>
    );
  }

  if (phase === 'callback-error') {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <div className="max-w-md space-y-3">
          <h1 className="text-xl font-semibold">Login failed</h1>
          <p className="text-sm text-fg-muted">{callbackError}</p>
          <a href="/" className="btn-secondary inline-block">
            Try again
          </a>
        </div>
      </div>
    );
  }

  if (phase === 'login') return <LoginScreen />;

  return (
    <>
      <Layout />
      <RateLimitBanner />
      <Toast />
    </>
  );
}
