'use client';

import { useEffect, useRef, useState } from 'react';
import { parseEther, verifyMessage } from 'ethers';
import { sendPayment } from '@/lib/blockchain';
import type { PaymentRequired402 } from '@/lib/api';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Loader';
import { useToast } from '@/components/ui/Toast';

interface PaymentModalProps {
  paymentRequired: PaymentRequired402;
  resourceId: string;
  onUnlock: (txHash: string) => Promise<void>;
  initialTxHash?: string | null;
  onTxHashChange?: (txHash: string | null) => void;
  onClose: () => void;
}

export default function PaymentModal({
  paymentRequired,
  resourceId,
  onUnlock,
  initialTxHash,
  onTxHashChange,
  onClose,
}: PaymentModalProps) {
  const [step, setStep] = useState<'confirm' | 'sending' | 'unlocking' | 'done' | 'error'>('confirm');
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [autoRetry, setAutoRetry] = useState(true);
  const [confirmationsHint, setConfirmationsHint] = useState<number | null>(null);
  const toast = useToast();
  const isZeroAddress = paymentRequired.address?.toLowerCase?.() === '0x0000000000000000000000000000000000000000';

  const isProcessing = step === 'sending' || step === 'unlocking';
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (initialTxHash && !txHash) {
      setTxHash(initialTxHash);
    }
  }, [initialTxHash, txHash]);

  useEffect(() => {
    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, []);

  const setTxHashAndPersist = (hash: string | null) => {
    setTxHash(hash);
    onTxHashChange?.(hash);
  };

  const assertSignedPaymentDetails = () => {
    const expectedSigner = (process.env.NEXT_PUBLIC_MERCHANT_SIG_SIGNER || '').trim().toLowerCase();
    const sig = paymentRequired.addressSig;
    const expiresAt = paymentRequired.addressSigExpiresAt;
    const chainId = paymentRequired.chainId ?? 31;

    if (!expectedSigner) return; // demo-friendly: allow unsigned unless app config requires it
    if (!sig || !expiresAt) {
      throw new Error('Unsigned payment details. Refusing to pay (missing merchant signature).');
    }
    const now = Math.floor(Date.now() / 1000);
    if (expiresAt <= now) {
      throw new Error('Merchant signature expired. Refresh and try again.');
    }

    const message = [
      'x402',
      'payment-required',
      paymentRequired.address.toLowerCase(),
      paymentRequired.price,
      resourceId,
      String(chainId),
      String(expiresAt),
    ].join('|');

    const recovered = verifyMessage(message, sig).toLowerCase();
    if (recovered !== expectedSigner) {
      throw new Error('Invalid merchant signature. Refusing to pay.');
    }
  };

  const handlePayAndUnlock = async () => {
    setError(null);
    setTimedOut(false);
    setConfirmationsHint(null);
    setStep('sending');
    try {
      assertSignedPaymentDetails();

      let valueWei;
      try {
        valueWei = parseEther(paymentRequired.price);
      } catch {
        throw new Error('Invalid price format');
      }
      const hash = await sendPayment(paymentRequired.address, valueWei);
      setTxHashAndPersist(hash);
      toast.push({ tone: 'info', title: 'Transaction submitted', message: 'Waiting for confirmation…' });
      setStep('unlocking'); // auto-retry will take over
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Payment or unlock failed';
      if (msg.toLowerCase().includes('timeout')) setTimedOut(true);
      toast.push({ tone: 'error', title: 'Unlock failed', message: msg });
      setError(msg);
      setStep('error');
    }
  };

  const handleVerifyOnly = async (): Promise<void> => {
    if (!txHash) return;
    setError(null);
    setTimedOut(false);
    setConfirmationsHint(null);
    setStep('unlocking');
    try {
      const timeoutMs = 60_000;
      await Promise.race([
        onUnlock(txHash),
        new Promise<void>((_, reject) => setTimeout(() => reject(new Error('Verification timeout')), timeoutMs)),
      ]);
      toast.push({ tone: 'success', title: 'Unlocked', message: 'Premium access token saved.' });
      setStep('done');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unlock failed';
      if (String(msg).toLowerCase().includes('timeout')) setTimedOut(true);
      const m = String(msg);
      const match = m.match(/got\s+(\d+)/i);
      if (match?.[1]) {
        const n = Number(match[1]);
        if (Number.isFinite(n)) setConfirmationsHint(n);
      }
      setError(msg);
      setStep('error');
    }
  };

  // Auto-retry verification while waiting for confirmations / indexing.
  useEffect(() => {
    if (!autoRetry) return;
    if (step !== 'unlocking') return;
    if (!txHash) return;

    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    retryTimerRef.current = setTimeout(async () => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        await handleVerifyOnly();
      } finally {
        inFlightRef.current = false;
      }
    }, 15_000);
  }, [autoRetry, step, txHash]);

  return (
    <Modal
      open
      title="Payment Required"
      description="Send tRBTC on Rootstock Testnet to unlock this premium resource."
      onClose={onClose}
      closeOnBackdrop={!isProcessing}
    >
      <div className="space-y-4">
        <Card className="p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-rsk-border bg-white/5">
            <CardHeader className="mb-0">
              <div>
                <CardTitle className="text-base">Unlock details</CardTitle>
                <CardDescription>Resource: <span className="text-rsk-text">{resourceId}</span></CardDescription>
              </div>
              <Badge tone={step === 'done' ? 'success' : step === 'error' ? 'error' : step === 'confirm' ? 'warning' : 'default'}>
                {step === 'confirm' && 'Ready'}
                {step === 'sending' && 'Wallet'}
                {step === 'unlocking' && 'Verifying'}
                {step === 'done' && 'Success'}
                {step === 'error' && 'Failed'}
              </Badge>
            </CardHeader>
          </div>
          <CardBody className="px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-rsk-muted">Price</p>
                <p className="text-lg font-semibold text-rsk-text">{paymentRequired.price} <span className="text-rsk-muted">tRBTC</span></p>
              </div>
              {(step === 'sending' || step === 'unlocking') && (
                <div className="flex items-center gap-2 text-sm text-rsk-muted">
                  <Spinner className="h-4 w-4 border-rsk-primary" />
                  {step === 'sending'
                    ? 'Waiting for wallet confirmation…'
                    : confirmationsHint != null
                      ? `Waiting for confirmations… (currently ${confirmationsHint})`
                      : 'Transaction pending / verifying…'}
                </div>
              )}
            </div>

            <div>
              <p className="text-xs text-rsk-muted">Merchant address</p>
              <code className="mt-1 block rounded-xl border border-rsk-border bg-black/20 p-3 text-xs text-rsk-text break-all">
                {paymentRequired.address}
              </code>
            </div>
            {isZeroAddress && (
              <div className="rounded-xl border border-rsk-error/30 bg-rsk-error/10 px-4 py-3 text-sm text-rsk-error">
                Backend is not configured with a real <code>MERCHANT_ADDRESS</code>. Set it in <code>demo-backend/.env</code> and restart the backend.
              </div>
            )}

            {txHash && (
              <div>
                <p className="text-xs text-rsk-muted">Transaction</p>
                <code className="mt-1 block rounded-xl border border-rsk-border bg-black/20 p-3 text-xs text-rsk-muted break-all">
                  {txHash}
                </code>
              </div>
            )}

            {step === 'error' && error && (
              <div className="rounded-xl border border-rsk-error/30 bg-rsk-error/10 px-4 py-3 text-sm text-rsk-error">
                {error}
              </div>
            )}
          </CardBody>
        </Card>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} aria-label="Close payment modal">
            Close
          </Button>
          {(step === 'unlocking' || step === 'error') && txHash && (
            <Button
              variant="ghost"
              onClick={() => setAutoRetry((v) => !v)}
              aria-label={autoRetry ? 'Disable auto retry' : 'Enable auto retry'}
            >
              {autoRetry ? 'Auto retry: ON' : 'Auto retry: OFF'}
            </Button>
          )}
          {step === 'confirm' && (
            <div className="flex gap-3">
              {txHash && (
                <Button variant="secondary" onClick={handleVerifyOnly} aria-label="Retry verification">
                  Verify unlock
                </Button>
              )}
              <Button
                variant="primary"
                onClick={handlePayAndUnlock}
                disabled={isZeroAddress}
                aria-label="Unlock content"
              >
                {txHash ? 'Pay again (new tx)' : 'Unlock with tRBTC'}
              </Button>
            </div>
          )}
          {step === 'error' && (
            <div className="flex gap-3">
              {txHash && (
                <Button
                  variant="secondary"
                  onClick={async () => {
                    await handleVerifyOnly();
                  }}
                  aria-label="Retry verification"
                >
                  Retry verification
                </Button>
              )}
              <Button
                variant="primary"
                onClick={() => {
                  setStep('confirm');
                  setError(null);
                  setTimedOut(false);
                  setConfirmationsHint(null);
                }}
                aria-label="Try payment again"
              >
                Try again
              </Button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
