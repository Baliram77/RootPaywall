'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  loading?: boolean;
}

export default function Button({
  className,
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  loading,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition will-change-transform focus:outline-none focus:ring-2 focus:ring-rsk-primary/40 disabled:cursor-not-allowed disabled:opacity-50';

  const sizes: Record<Size, string> = {
    sm: 'h-9 px-3 text-sm',
    md: 'h-11 px-4 text-sm',
    lg: 'h-12 px-5 text-base',
  };

  const variants: Record<Variant, string> = {
    primary:
      'bg-rsk-gradient text-black shadow-glow hover:shadow-[0_0_0_1px_rgba(255,106,0,0.35),0_0_36px_rgba(255,106,0,0.22)] hover:scale-[1.01] active:scale-[0.99]',
    secondary:
      'bg-rsk-card text-rsk-text border border-rsk-border hover:border-rsk-primary/40 hover:shadow-glow hover:scale-[1.01] active:scale-[0.99]',
    ghost: 'bg-transparent text-rsk-text hover:bg-white/5 border border-transparent hover:border-rsk-border',
  };

  return (
    <button
      className={cn(base, sizes[size], variants[variant], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {!loading && leftIcon}
      <span>{children}</span>
      {!loading && rightIcon}
    </button>
  );
}

