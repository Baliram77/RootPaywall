# @x402/unlocker

Rootstock (tRBTC) micropayment paywall for Express APIs and content.

This package helps you:

- Protect a route behind an **HTTP 402 Payment Required** response
- Verify a **Rootstock Testnet/Mainnet** payment transaction
- Issue a short-lived **JWT access token** to unlock premium content

It is designed to be embedded in your own API (e.g. an Express server).

## How it works

1. Client requests a protected route (e.g. `GET /premium/article`)
2. If no valid token is present, the middleware returns:
   - HTTP **402**
   - JSON body containing `price`, `address` (merchant), and `resourceId`
3. Client sends tRBTC payment to the merchant address and obtains a `txHash`
4. Client calls `POST /unlock` with `{ txHash, resourceId }`
5. Server verifies the payment and returns `{ token, expiresIn }`
6. Client retries the protected request with `Authorization: Bearer <token>`

## Requirements

- Node.js **18+**
- Express **4+** (peer dependency)
- A Rootstock RPC URL (Testnet or Mainnet)

## Install

If you publish this package:

```bash
npm install @x402/unlocker
```

In this repo, the demo backend depends on it via a local file reference.

## Quick start (Express)

```js
import express from "express";
import { initializeX402, x402Middleware, createUnlockRoute } from "@x402/unlocker";

const app = express();
app.use(express.json());

initializeX402({
  // Rootstock RPC (default is testnet public node)
  rpcUrl: "https://public-node.testnet.rsk.co",
  // Address that receives the tRBTC payment
  recipientAddress: process.env.MERCHANT_ADDRESS,
  // Required payment amount in tRBTC (string)
  requiredAmount: "0.0001",
  // Confirmations required before unlock (production recommended: 6+)
  minConfirmations: 6,
  // Secret used to sign JWT tokens
  jwtSecret: process.env.JWT_SECRET,
  // Optional: sign 402 payment details to prevent MITM address swapping
  merchantSigPrivateKey: process.env.MERCHANT_SIG_PRIVATE_KEY,
});

// Protect anything under /premium
app.use(
  "/premium",
  x402Middleware({
    resourceId: "premium-article",
    price: "0.0001",
    // optional: override recipientAddress/accessDurationSeconds per resource
  })
);

app.get("/premium/article", (req, res) => {
  res.json({ title: "Premium", content: "Unlocked!" });
});

// Unlock endpoint (verifies txHash and issues a token)
app.post("/unlock", createUnlockRoute((req) => req.ip));

app.listen(3000);
```

## API

### `initializeX402(options)`

Initializes the unlock service and must be called **once** before using middleware/routes.

Key options:

- `rpcUrl` (optional): Rootstock JSON-RPC URL (default: Rootstock testnet public RPC)
- `recipientAddress`: merchant address (0x…)
- `requiredAmount`: tRBTC amount required (string, e.g. `"0.0001"`)
- `minConfirmations` (optional): confirmations required (default: `6`)
- `jwtSecret`: JWT signing secret
- `chainId` (optional): Rootstock chain id (31 testnet, 30 mainnet)
- `storagePath` (optional): where used tx hashes and usage logs are stored
- `rateLimitMax` / `rateLimitWindowMs` (optional): unlock verification rate limits
- `merchantSigPrivateKey` / `merchantSigTtlSeconds` (optional): signs 402 payment details; verified by frontend

### `x402Middleware({ resourceId, price, recipientAddress?, accessDurationSeconds? })`

Express middleware that:

- Validates a JWT token (Authorization header)
- Returns **402** with `{ price, address, resourceId, chainId, addressSig, addressSigExpiresAt, addressSigSigner }` when payment is required (signature fields included when `merchantSigPrivateKey` is set)

### `createUnlockRoute(rateLimitKey?)`

Express handler for `POST /unlock`:

- Input: `{ txHash, resourceId }`
- Output: `{ token, expiresIn }` on success, `{ error }` on failure

## Example server

There is a runnable example in `examples/server.js`:

```bash
cd backend
npm install
npm run build
node examples/server.js
```

## Development

```bash
cd backend
npm install
npm run build
npm test
```

## Notes

- **Security**: set a strong `JWT_SECRET` in real deployments.
- **Confirmations**: use `minConfirmations >= 6` in production.
- **HTTPS**: enforce HTTPS in production deployments (the middleware supports `enforceHttps`).
- **RPC reliability**: use a reliable Rootstock RPC provider (public RPCs can be slow or rate-limited).

# @x402/unlocker

**x402 Smart Content Unlocker SDK** — a lightweight library to protect APIs and content behind Rootstock (tRBTC) micropayments. One-line integration for Express, HTTP 402 handling, and JWT-based access tokens.

## Features

- **Express middleware** — protect routes with `app.use('/premium', x402Middleware({ ... }))`
- **Rootstock payment verification** — tRBTC on Rootstock mainnet or testnet
- **JWT access tokens** — time-limited access after payment
- **Double-spend prevention** — used transaction hashes are stored and rejected
- **Rate limiting** — configurable limits on verification attempts
- **Dynamic pricing** — per-resource price and recipient
- **Usage logging** — JSON-file storage for tx hash, user, resource, amount, timestamp

## Install

```bash
npm install @x402/unlocker
# peer dependency
npm install express
```

## Quick start

```js
const express = require('express');
const { initializeX402, x402Middleware, createUnlockRoute } = require('@x402/unlocker');

const app = express();
app.use(express.json());

// 1. Initialize once (e.g. at app startup)
const merchantAddress = '0xYourRootstockAddress';
initializeX402({
  rpcUrl: 'https://public-node.testnet.rsk.co',  // optional, testnet default
  recipientAddress: merchantAddress,
  requiredAmount: '0.0001',   // tRBTC per access
  minConfirmations: 3,
  jwtSecret: process.env.JWT_SECRET || 'your-secret',
});

// 2. Protect a route — returns 402 if no valid payment token
app.use('/premium', x402Middleware({
  resourceId: 'premium-api',
  price: '0.0001',
  recipientAddress: merchantAddress,
}));
app.get('/premium/data', (req, res) => res.json({ data: 'secret' }));

// 3. Unlock endpoint: client sends txHash + resourceId, receives JWT
app.post('/unlock', createUnlockRoute((req) => req.ip));

app.listen(3000);
```

## API

### `initializeX402(options)`

Call once before using middleware or unlock route.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `rpcUrl` | string | Rootstock testnet RPC | JSON-RPC URL (e.g. `https://public-node.testnet.rsk.co`) |
| `recipientAddress` | string | required | Merchant Rootstock address |
| `requiredAmount` | string | required | Amount in tRBTC (e.g. `'0.0001'`) |
| `minConfirmations` | number | `3` | Block confirmations required |
| `jwtSecret` | string | required | Secret for signing access JWTs |
| `storagePath` | string | `.x402` in cwd | Directory for usage log and used-tx storage |
| `rateLimitMax` | number | `30` | Max verification attempts per key per window |
| `rateLimitWindowMs` | number | `60000` | Rate limit window (ms) |

Returns the `UnlockService` instance.

### `x402Middleware(options)`

Express middleware. If request has no valid `Authorization: Bearer <token>` (or `token` query/body), responds with **402 Payment Required** and body:

```json
{
  "error": "Payment Required",
  "price": "0.0001",
  "address": "0x...",
  "resourceId": "premium-api"
}
```

Options: `resourceId`, `price` (string or number), optional `recipientAddress`, optional `accessDurationSeconds`.

### `createUnlockRoute(rateLimitKey?)`

Returns an Express handler for `POST /unlock`. Body or query: `txHash`, `resourceId`. On success: `{ token, expiresIn }`. On failure: `{ error }`.  
Optional `rateLimitKey(req)` to use e.g. `req.ip` for rate limiting.

### Programmatic use

```js
const { getUnlockService } = require('@x402/unlocker');

const service = getUnlockService();
const result = await service.verifyAndUnlock(txHash, resourceId, rateLimitKey);
if (result.success) {
  console.log(result.token, result.expiresIn);
} else {
  console.log(result.error);
}
```

### Rootstock networks

- **Testnet** — RPC: `https://public-node.testnet.rsk.co`, Chain ID: 31, tRBTC
- **Mainnet** — Chain ID: 30, RBTC

## Client flow

1. Request protected resource → server responds **402** with `price` and `address`.
2. User sends tRBTC to `address` for `price` (e.g. via wallet).
3. Client calls `POST /unlock` with `{ txHash, resourceId }`.
4. Server verifies tx on Rootstock, issues JWT, returns `{ token, expiresIn }`.
5. Client retries original request with `Authorization: Bearer <token>` and gets the resource.

## Project structure

```
src/
  PaymentVerifier.ts   # Rootstock tx verification
  AccessController.ts  # JWT issue/validate/revoke
  UsageLogger.ts       # Usage log + used tx storage
  x402Middleware.ts    # Express middleware + unlock route
  unlockService.ts     # verifyAndUnlock, rate limit, resource config
  types.ts
  index.ts
tests/
```

## Tests

```bash
npm test
```

## Building

```bash
npm run build
```

Output: `dist/` (JS + declarations).

## Publishing to npm

1. **Login**
   ```bash
   npm login
   ```

2. **Scope**  
   Package is scoped as `@x402/unlocker`. To publish under a scope you have access to:
   - Create org `x402` on npm, or
   - Use a different scope and set `"name": "@your-scope/unlocker"` in `package.json`.

3. **Publish**
   ```bash
   npm run build
   npm publish --access public
   ```
   `--access public` is required for scoped packages if the org is not paid.

4. **Version bumps**
   ```bash
   npm version patch   # or minor / major
   npm publish --access public
   ```

## License

MIT
