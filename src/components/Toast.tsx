import { useStore } from '../store';

export default function Toast() {
  const toast = useStore((s) => s.toast);
  if (!toast) return null;
  const color =
    toast.kind === 'error'
      ? 'bg-red-600 text-white'
      : toast.kind === 'success'
        ? 'bg-spotify text-black'
        : 'bg-bg-elev text-fg border border-line';
  return (
    <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2">
      <div className={`rounded-md px-4 py-2 text-sm shadow-lg ${color}`}>{toast.message}</div>
    </div>
  );
}
