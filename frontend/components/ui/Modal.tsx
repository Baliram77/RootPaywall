'use client';

import type { ReactNode } from 'react';
import { cn } from './cn';

export default function Modal({
  open,
  title,
  description,
  onClose,
  children,
}: {
  open: boolean;
  title?: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className={cn('relative w-full max-w-lg animate-scale-in')}>
        <div className="rsk-card overflow-hidden">
          <div className="flex items-start justify-between gap-4 border-b border-rsk-border px-6 py-4">
            <div>
              {title && <h3 className="text-lg font-semibold text-rsk-text">{title}</h3>}
              {description && <p className="mt-1 text-sm text-rsk-muted">{description}</p>}
            </div>
            <button
              onClick={onClose}
              className="rounded-lg border border-rsk-border bg-white/5 px-2 py-1 text-rsk-muted hover:text-rsk-text hover:bg-white/10 transition"
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <div className="px-6 py-5">{children}</div>
        </div>
      </div>
    </div>
  );
}

