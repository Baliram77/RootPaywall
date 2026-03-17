'use client';

export default function Footer() {
  return (
    <footer className="border-t border-rsk-border py-10">
      <div className="rsk-container">
        <div className="flex flex-col gap-2 text-xs text-rsk-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            <span className="text-rsk-text">x402 Unlocker</span> — Web3 paywall demo.
          </p>
          <p>Built for Rootstock Testnet (tRBTC).</p>
        </div>
      </div>
    </footer>
  );
}

