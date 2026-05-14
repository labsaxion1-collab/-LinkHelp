import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

type ToastKind = 'success' | 'error' | 'info';

export type ToastItem = { id: number; message: string; kind: ToastKind };

type ToastContextValue = {
  toasts: ToastItem[];
  showToast: (message: string, kind?: ToastKind) => void;
  dismissToast: (id: number) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev.slice(-4), { id, message, kind }]);
    window.setTimeout(() => dismissToast(id), 5200);
  }, [dismissToast]);

  const value = useMemo(() => ({ toasts, showToast, dismissToast }), [toasts, showToast, dismissToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-20 md:bottom-6 right-4 z-[100] flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={[
              'pointer-events-auto rounded-2xl px-4 py-3 text-sm font-semibold shadow-lg border',
              t.kind === 'success' && 'bg-emerald-50 text-emerald-900 border-emerald-200',
              t.kind === 'error' && 'bg-red-50 text-red-900 border-red-200',
              t.kind === 'info' && 'bg-slate-900 text-white border-slate-800',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
