'use client';

import type { HTMLAttributes } from 'react';
import { cn } from './cn';

type Tone = 'default' | 'success' | 'warning' | 'error';

export default function Badge({ className, tone = 'default', ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  const tones: Record<Tone, string> = {
    default: 'bg-white/5 text-rsk-text border-rsk-border',
    success: 'bg-rsk-success/10 text-rsk-success border-rsk-success/30',
    warning: 'bg-rsk-primary/10 text-rsk-secondary border-rsk-primary/30',
    error: 'bg-rsk-error/10 text-rsk-error border-rsk-error/30',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium',
        tones[tone],
        className
      )}
      {...props}
    />
  );
}

