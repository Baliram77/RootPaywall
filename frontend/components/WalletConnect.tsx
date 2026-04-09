'use client';

import { useState, useEffect } from 'react';
import { getWalletAddress, getNetworkChainId, ensureRootstockTestnet, ROOTSTOCK_TESTNET_CHAIN_ID } from '@/lib/blockchain';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';

export default function WalletConnect() {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const connect = async () => {
    setLoading(true);
    setError(null);
    try {
      await ensureRootstockTestnet();
      const addr = await getWalletAddress();
      const id = await getNetworkChainId();
      setAddress(addr);
      setChainId(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) return;
    const onAccountsChanged = () => {
      getWalletAddress().then(setAddress).catch(() => setAddress(null));
    };
    const onChainChanged = () => {
      getNetworkChainId().then(setChainId).catch(() => setChainId(null));
    };
    window.ethereum?.request?.({ method: 'eth_accounts' })
      .then((accounts: unknown) => {
        if (Array.isArray(accounts) && accounts.length > 0) {
          getWalletAddress().then(setAddress).catch(() => setAddress(null));
          getNetworkChainId().then(setChainId).catch(() => setChainId(null));
        }
      })
      .catch(() => {
        // Leave UI interactive; user can retry via connect button.
        setAddress(null);
      });
    window.ethereum?.on?.('accountsChanged', onAccountsChanged);
    window.ethereum?.on?.('chainChanged', onChainChanged);
    return () => {
      window.ethereum?.removeListener?.('accountsChanged', onAccountsChanged);
      window.ethereum?.removeListener?.('chainChanged', onChainChanged);
    };
  }, []);

  const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';
  const isCorrectNetwork = chainId === ROOTSTOCK_TESTNET_CHAIN_ID;

  return (
    <Card className="p-0 overflow-hidden">
      <div className="bg-[linear-gradient(90deg,rgba(255,106,0,0.14),rgba(255,140,66,0.06),rgba(255,106,0,0))] px-6 py-5">
        <CardHeader className="mb-0">
          <div>
            <CardTitle>Wallet</CardTitle>
            <CardDescription>Connect MetaMask on Rootstock Testnet (Chain ID 31).</CardDescription>
          </div>
          {address ? (
            <Badge tone={isCorrectNetwork ? 'success' : 'warning'}>
              {isCorrectNetwork ? 'Rootstock Testnet' : chainId ? `Chain ${chainId}` : 'Unknown network'}
            </Badge>
          ) : (
            <Badge>Disconnected</Badge>
          )}
        </CardHeader>
      </div>

      <CardBody className="px-6 py-5">
        {!address ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-rsk-muted">
              Connect to unlock premium content using <span className="text-rsk-text">tRBTC</span>.
            </p>
            <Button onClick={connect} loading={loading} variant="primary">
              {loading ? 'Connecting…' : 'Connect Wallet'}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-xs text-rsk-muted">Connected address</p>
              <div className="flex items-center gap-2">
                <code className="rounded-lg border border-rsk-border bg-black/20 px-2 py-1 text-sm text-rsk-text">
                  {shortAddress}
                </code>
                <Badge tone={isCorrectNetwork ? 'success' : 'warning'}>
                  {isCorrectNetwork ? 'Network: Rootstock Testnet' : 'Wrong network'}
                </Badge>
              </div>
            </div>
            {!isCorrectNetwork && (
              <Button onClick={connect} loading={loading} variant="secondary">
                Switch to Rootstock Testnet
              </Button>
            )}
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-rsk-error/30 bg-rsk-error/10 px-4 py-3 text-sm text-rsk-error">
            {error}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
