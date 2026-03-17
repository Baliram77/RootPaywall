'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchPremiumArticle, unlockWithTxHash, type PaymentRequired402 } from '@/lib/api';
import PaymentModal from '@/components/PaymentModal';
import UnlockStatus from '@/components/UnlockStatus';
import PremiumContent from '@/components/PremiumContent';
import WalletConnect from '@/components/WalletConnect';
import Button from '@/components/ui/Button';
import { GradientCard } from '@/components/ui/Card';

const TOKEN_KEY = 'x402_premium_token';
const RESOURCE_ID = 'premium-article';

function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

function setStoredToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
}

export default function PremiumPage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'locked' | 'unlocked' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [data, setData] = useState<{ title: string; content: string; publishedAt?: string } | null>(null);
  const [paymentRequired, setPaymentRequired] = useState<PaymentRequired402 | null>(null);
  const [showModal, setShowModal] = useState(false);

  const loadPremium = useCallback(async (token: string | null) => {
    setStatus('loading');
    setErrorMessage(null);
    const result = await fetchPremiumArticle(token);
    if (result.ok && result.data) {
      setData(result.data);
      setPaymentRequired(null);
      setStatus('unlocked');
      return;
    }
    if (result.status === 402 && result.paymentRequired) {
      setPaymentRequired(result.paymentRequired);
      setData(null);
      setStatus('locked');
      return;
    }
    setStatus('error');
    setErrorMessage(result.status ? `HTTP ${result.status}` : 'Failed to load');
  }, []);

  useEffect(() => {
    loadPremium(getStoredToken());
  }, [loadPremium]);

  const handleUnlock = async (txHash: string) => {
    const { token } = await unlockWithTxHash(txHash, paymentRequired?.resourceId || RESOURCE_ID);
    setStoredToken(token);
    await loadPremium(token);
  };

  const openPaymentModal = () => {
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      <WalletConnect />
      <UnlockStatus status={status} message={errorMessage || undefined} />

      {status === 'locked' && paymentRequired && (
        <GradientCard className="animate-fade-up">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">🔒</span>
                <h2 className="text-lg font-semibold text-rsk-text">Premium content protected</h2>
              </div>
              <p className="mt-2 text-sm text-rsk-muted">
                This content is protected. Pay with Rootstock to unlock.
              </p>
              <p className="mt-3 text-sm text-rsk-text/90">
                Price: <span className="font-semibold">{paymentRequired.price} tRBTC</span>
              </p>
            </div>
            <Button onClick={openPaymentModal} variant="primary" size="lg">
              Unlock with tRBTC
            </Button>
          </div>
        </GradientCard>
      )}

      {showModal && paymentRequired && (
        <PaymentModal
          paymentRequired={paymentRequired}
          resourceId={paymentRequired.resourceId || RESOURCE_ID}
          onUnlock={handleUnlock}
          onClose={() => setShowModal(false)}
        />
      )}

      {data && <PremiumContent title={data.title} content={data.content} publishedAt={data.publishedAt} />}
    </div>
  );
}
