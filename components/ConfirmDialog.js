'use client';
import { useEffect } from 'react';

export default function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', danger = true, loading = false, onConfirm, onCancel }) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => { if (e.key === 'Escape') onCancel?.(); };
    document.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 md:pl-[260px]"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel?.(); }}
    >
      <div className="bg-white rounded-sm p-6 max-w-md w-full">
        <h3 className="font-serif text-xl mb-2">{title}</h3>
        <p className="text-sethi-gray500 text-sm mb-5">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} disabled={loading} className="btn-ghost disabled:opacity-60">Cancel</button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`inline-flex items-center gap-2 min-h-[48px] px-6 font-semibold rounded-sm disabled:opacity-60 ${danger ? 'bg-red-600 text-white hover:bg-red-700' : 'btn-primary'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
