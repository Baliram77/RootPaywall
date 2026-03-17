import Link from 'next/link';
import WalletConnect from '@/components/WalletConnect';
import { Card, CardDescription, CardHeader, CardTitle, GradientCard } from '@/components/ui/Card';
import Button from '@/components/ui/Button';

export default function Home() {
  return (
    <div className="space-y-8">
      <GradientCard>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-rsk-text">x402 Unlocker</h1>
            <p className="mt-2 max-w-2xl text-sm text-rsk-muted">
              A production-style Web3 paywall demo. Unlock premium content using Rootstock (tRBTC) micropayments.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/premium">
              <Button variant="primary">Go to Premium</Button>
            </Link>
            <Link href="/public">
              <Button variant="secondary">View Public</Button>
            </Link>
          </div>
        </div>
      </GradientCard>

      <WalletConnect />

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/public"
          className="group"
        >
          <Card className="transition hover:shadow-glow hover:border-rsk-primary/30">
            <CardHeader>
              <div>
                <CardTitle>Public article</CardTitle>
                <CardDescription>Free content, no payment required.</CardDescription>
              </div>
              <span className="text-rsk-muted group-hover:text-rsk-text transition">→</span>
            </CardHeader>
          </Card>
        </Link>
        <Link
          href="/premium"
          className="group"
        >
          <Card className="transition hover:shadow-glow hover:border-rsk-primary/30">
            <CardHeader>
              <div>
                <CardTitle>Premium article</CardTitle>
                <CardDescription>Protected by x402 (402 → pay → unlock → read).</CardDescription>
              </div>
              <span className="text-rsk-muted group-hover:text-rsk-text transition">→</span>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
