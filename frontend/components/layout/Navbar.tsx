'use client';

import Link from 'next/link';
import { useRouter } from 'next/router';
import { cn } from '@/components/ui/cn';

const nav = [
  { href: '/', label: 'Dashboard' },
  { href: '/public', label: 'Public' },
  { href: '/premium', label: 'Premium' },
];

export default function Navbar() {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-40 border-b border-rsk-border bg-rsk-bg/80 backdrop-blur">
      <div className="rsk-container">
        <div className="flex h-16 items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-rsk-gradient shadow-glow" />
            <div className="leading-tight">
              <div className="text-sm font-semibold text-rsk-text">x402 Unlocker</div>
              <div className="text-[11px] text-rsk-muted">powered by Rootstock</div>
            </div>
          </Link>

          <nav className="hidden items-center gap-2 sm:flex">
            {nav.map((item) => {
              const active = router.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-sm transition',
                    active
                      ? 'border-rsk-primary/40 bg-white/5 text-rsk-text shadow-glow'
                      : 'border-transparent text-rsk-muted hover:text-rsk-text hover:bg-white/5 hover:border-rsk-border'
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}

