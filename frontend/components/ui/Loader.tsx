'use client';

import { cn } from './cn';

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn('inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent', className)}
      aria-hidden="true"
    />
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'h-4 w-full rounded-md bg-[linear-gradient(90deg,rgba(255,255,255,0.06),rgba(255,255,255,0.10),rgba(255,255,255,0.06))] bg-[length:200%_100%] animate-shimmer',
        className
      )}
    />
  );
}

