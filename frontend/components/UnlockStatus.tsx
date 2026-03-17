'use client';

type Status = 'idle' | 'loading' | 'locked' | 'unlocked' | 'error';

interface UnlockStatusProps {
  status: Status;
  message?: string;
}

export default function UnlockStatus({ status, message }: UnlockStatusProps) {
  if (status === 'idle') return null;

  const config: Record<Status, { bg: string; text: string; label: string; dot: string }> = {
    idle: { bg: '', text: '', label: '', dot: 'bg-rsk-border' },
    loading: { bg: 'bg-white/5', text: 'text-rsk-text', label: 'Loading…', dot: 'bg-rsk-primary' },
    locked: { bg: 'bg-rsk-primary/10', text: 'text-rsk-secondary', label: 'Payment required', dot: 'bg-rsk-secondary' },
    unlocked: { bg: 'bg-rsk-success/10', text: 'text-rsk-success', label: 'Unlocked', dot: 'bg-rsk-success' },
    error: { bg: 'bg-rsk-error/10', text: 'text-rsk-error', label: message || 'Error', dot: 'bg-rsk-error' },
  };

  const { bg, text, label, dot } = config[status];
  if (!label && status !== 'error') return null;

  return (
    <div className={`rounded-xl border border-rsk-border px-4 py-3 ${bg}`}>
      <div className="flex items-center gap-3">
        {status === 'loading' ? (
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-rsk-primary border-t-transparent" />
        ) : (
          <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
        )}
        <span className={`text-sm font-medium ${text}`}>{message || label}</span>
      </div>
    </div>
  );
}
