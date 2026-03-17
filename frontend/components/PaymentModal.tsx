'use client';

import { useState } from 'react';
import { parseEther } from 'ethers';
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
  onClose: () => void;
}

export default function PaymentModal({ paymentRequired, resourceId, onUnlock, onClose }: PaymentModalProps) {
  const [step, setStep] = useState<'confirm' | 'sending' | 'unlocking' | 'done' | 'error'>('confirm');
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const toast = useToast();

  const handlePayAndUnlock = async () => {
    setError(null);
    setStep('sending');
    try {
      const valueWei = parseEther(paymentRequired.price);
      const hash = await sendPayment(paymentRequired.address, valueWei);
      setTxHash(hash);
      toast.push({ tone: 'info', title: 'Transaction submitted', message: 'Waiting for confirmation…' });
      setStep('unlocking');
      await onUnlock(hash);
      toast.push({ tone: 'success', title: 'Unlocked', message: 'Premium access token saved.' });
      setStep('done');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Payment or unlock failed';
      toast.push({ tone: 'error', title: 'Unlock failed', message: msg });
      setError(msg);
      setStep('error');
    }
  };

  return (
    <Modal
      open
      title="Payment Required"
      description="Send tRBTC on Rootstock Testnet to unlock this premium resource."
      onClose={onClose}
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
                  {step === 'sending' ? 'Waiting for wallet confirmation…' : 'Transaction pending / verifying…'}
                </div>
              )}
            </div>

            <div>
              <p className="text-xs text-rsk-muted">Merchant address</p>
              <code className="mt-1 block rounded-xl border border-rsk-border bg-black/20 p-3 text-xs text-rsk-text break-all">
                {paymentRequired.address}
              </code>
            </div>

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
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          {step === 'confirm' && (
            <Button variant="primary" onClick={handlePayAndUnlock}>
              Unlock with tRBTC
            </Button>
          )}
          {step === 'error' && (
            <Button
              variant="primary"
              onClick={() => {
                setStep('confirm');
                setError(null);
              }}
            >
              Try again
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
