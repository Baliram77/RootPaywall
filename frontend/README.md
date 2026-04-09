# x402 Unlocker (frontend)

Modern Web3 UI (Next.js + Tailwind) that unlocks premium content using Rootstock (tRBTC) micropayments against the local `demo-backend`.

## Features

- **Rootstock-style dark UI**: dashboard layout, gradients, glow effects, responsive design
- **Wallet connection**: MetaMask connect + network display (Rootstock Testnet, Chain ID 31)
- **Public content**: `GET /public/article` rendered in `/public`
- **Premium paywall**: `/premium` calls the backend; on **HTTP 402** it shows an unlock modal
- **Unlock flow**:
  - user sends tRBTC payment in MetaMask
  - frontend posts `txHash` to `POST /unlock`
  - backend returns a JWT token
  - token is stored in `sessionStorage` and premium request is retried automatically
  - the last submitted `txHash` is cached in `sessionStorage` so the user can **retry verification without paying again**
- **UX polish**: skeleton loaders, toasts, animated modal + status indicators

## Tech stack

- Next.js (Pages Router)
- TypeScript + React
- ethers.js
- Tailwind CSS
- MetaMask

## Setup

Install dependencies:

```bash
cd frontend
npm install
```

Create `.env.local`:

```bash
cp .env.example .env.local
```

Environment variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_BACKEND_URL` | yes | Demo backend base URL (default: `http://localhost:3000`) |
| `NEXT_PUBLIC_MERCHANT_SIG_SIGNER` | no | If set, the frontend will **require** a valid signature on the 402 response and verify it against this signer address |

## Run (local development)

1. Start the backend (in another terminal):

```bash
cd demo-backend
npm install
npm run dev
```

2. Start the frontend:

```bash
cd frontend
npm run dev
```

If port 3000 is already used, Next.js will offer a different port, or run:

```bash
PORT=3001 npm run dev
```

Open the URL printed by Next.js (e.g. `http://localhost:3000` or `http://localhost:3001`).

## Build & start (production-like)

```bash
cd frontend
npm run build
npm run start
```

## User flow (premium unlock)

1. Visit `/premium`
2. Backend returns **402** with `{ price, address, resourceId, chainId, addressSig, addressSigExpiresAt, addressSigSigner }` (signature fields optional unless you enforce them via `NEXT_PUBLIC_MERCHANT_SIG_SIGNER`)
3. Click **Unlock with tRBTC**
4. Confirm payment in MetaMask
5. Frontend calls `POST /unlock` with `txHash`
6. If confirmations are still low, click **Verify unlock** / **Retry verification** (reuses the same `txHash`, no new payment)
6. Token is saved and premium content loads

## Project structure

```
frontend/
  pages/
    _app.tsx        # App shell (navbar, footer, toasts)
    index.tsx       # Dashboard
    public.tsx      # Free article
    premium.tsx     # 402 paywall + unlock flow
  public/
    rootstock-logo.png  # Rootstock logo used in the navbar
  components/
    WalletConnect.tsx
    UnlockStatus.tsx
    PremiumContent.tsx
    PaymentModal.tsx
    layout/
      Navbar.tsx
      Footer.tsx
    ui/
      Button.tsx
      Card.tsx
      Modal.tsx
      Badge.tsx
      Loader.tsx
      Toast.tsx
      cn.ts
  lib/
    api.ts          # fetchPublicArticle, fetchPremiumArticle, unlockWithTxHash
    blockchain.ts   # MetaMask + Rootstock testnet payment
  styles/
    globals.css
```

## Rootstock Testnet

- **Chain ID**: 31
- **RPC**: `https://public-node.testnet.rsk.co`
- **Symbol**: tRBTC
- Faucet: use the Rootstock testnet faucet at `https://faucet.rsk.co/`
