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
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
      <div className={`px-4 py-2 rounded-md shadow-lg text-sm ${color}`}>{toast.message}</div>
    </div>
  );
}
