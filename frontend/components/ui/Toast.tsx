'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { cn } from './cn';

type ToastTone = 'success' | 'error' | 'info';

type ToastItem = {
  id: string;
  tone: ToastTone;
  title: string;
  message?: string;
};

const ToastCtx = createContext<{
  push: (t: Omit<ToastItem, 'id'>) => void;
} | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((t: Omit<ToastItem, 'id'>) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const item: ToastItem = { id, ...t };
    setItems((prev) => [item, ...prev].slice(0, 4));
    setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== id)), 4500);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-[60] space-y-3">
        {items.map((t) => (
          <div
            key={t.id}
            className={cn(
              'rsk-card w-[min(420px,calc(100vw-2rem))] px-4 py-3 animate-fade-up',
              t.tone === 'success' && 'border-rsk-success/30',
              t.tone === 'error' && 'border-rsk-error/30',
              t.tone === 'info' && 'border-rsk-primary/30'
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p
                  className={cn(
                    'text-sm font-semibold',
                    t.tone === 'success' && 'text-rsk-success',
                    t.tone === 'error' && 'text-rsk-error',
                    t.tone === 'info' && 'text-rsk-text'
                  )}
                >
                  {t.title}
                </p>
                {t.message && <p className="mt-1 text-xs text-rsk-muted">{t.message}</p>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) {
    return { push: () => {} };
  }
  return ctx;
}

