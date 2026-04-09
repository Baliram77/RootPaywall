# demo-backend (x402 paywall API)

Demo Express API that uses `@x402/unlocker` to protect premium content with Rootstock (tRBTC) payments.

## What this server does

- Serves a free article at `GET /public/article`
- Serves a premium article at `GET /premium/article`
  - Returns **HTTP 402 Payment Required** until unlocked
  - After unlock, accepts `Authorization: Bearer <token>`
- Verifies a Rootstock transaction at `POST /unlock` and returns a JWT access token

## Prerequisites

- Node.js 18+
- A Rootstock wallet address (merchant) to receive testnet tRBTC payments
- An RPC endpoint for Rootstock Testnet (default provided)

## Environment variables

Copy `.env.example` to `.env`:

```bash
cd demo-backend
cp .env.example .env
```

Then set:

| Variable | Required | Description |
|----------|----------|-------------|
| `ROOTSTOCK_RPC_URL` | yes | Rootstock JSON-RPC URL (Testnet) |
| `MERCHANT_ADDRESS` | yes | Your Rootstock address to receive tRBTC |
| `JWT_SECRET` | yes | Secret used to sign access tokens |
| `MIN_CONFIRMATIONS` | no | Confirmations required before unlock (default: `6`) |
| `MERCHANT_SIG_PRIVATE_KEY` | no | If set, demo-backend will sign 402 payment details (recommended) |
| `PORT` | no | Server port (default: `3000`) |

If `MERCHANT_ADDRESS` is missing or still the placeholder, the server will exit on startup with an error.

If you see network timeouts with the default RPC, try:

- `ROOTSTOCK_RPC_URL=https://rootstock-testnet.drpc.org`

## Install & run

This demo depends on the local SDK package in `../backend` (`file:../backend`).

```bash
cd demo-backend
npm install
npm run dev
```

The server runs at `http://localhost:3000` (or your `PORT`).

## API

### `GET /health`

Basic health check.

### `GET /public/article`

Returns free content (no payment).

```bash
curl http://localhost:3000/public/article
```

### `GET /premium/article`

Returns premium content when unlocked.

Without a token, you receive **402**:

```bash
curl -i http://localhost:3000/premium/article
```

Response body contains the payment requirements:

```json
{
  "error": "Payment Required",
  "price": "0.0001",
  "address": "0x...",
  "resourceId": "premium-article",
  "chainId": 31,
  "addressSig": "0x...",
  "addressSigExpiresAt": 1712345678,
  "addressSigSigner": "0x..."
}
```

### `POST /unlock`

Verify a payment transaction and receive an access token.

```bash
curl -X POST http://localhost:3000/unlock \
  -H "Content-Type: application/json" \
  -d '{"txHash":"0x...","resourceId":"premium-article"}'
```

Success:

```json
{ "token": "<jwt>", "expiresIn": 3600 }
```

### Use token for premium access

```bash
curl http://localhost:3000/premium/article \
  -H "Authorization: Bearer <token>"
```

## Notes (production)

- Use a strong `JWT_SECRET`
- Use a reliable RPC provider (or run your own node)
- Use `MIN_CONFIRMATIONS=6` (or higher) in production
- Consider setting `MERCHANT_SIG_PRIVATE_KEY` and configuring the frontend with `NEXT_PUBLIC_MERCHANT_SIG_SIGNER` to prevent MITM address swapping
