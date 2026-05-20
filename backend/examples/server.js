/**
 * LOCAL DEVELOPMENT EXAMPLE ONLY — not for production use.
 *
 * Run: node examples/server.js
 * (from backend directory after npm install && npm run build)
 *
 * Requires env:
 *   JWT_SECRET
 *   MERCHANT_ADDRESS
 *   MERCHANT_SIG_PRIVATE_KEY
 *
 * 1. GET /premium/data -> 402 with signed price and address
 * 2. Send tRBTC to that address on Rootstock testnet
 * 3. POST /unlock { "txHash": "...", "resourceId": "premium-api" } -> { token, expiresIn }
 * 4. GET /premium/data with Header: Authorization: Bearer <token> -> 200 + data
 */

if (process.env.NODE_ENV === 'production') {
  console.error(
    'ERROR: backend/examples/server.js is for local development only. Use demo-backend or your own hardened server in production.'
  );
  process.exit(1);
}

const path = require('path');
const express = require('express');
const { initializeX402, x402Middleware, createUnlockRoute } = require(path.join(__dirname, '../dist'));

const JWT_SECRET = (process.env.JWT_SECRET || '').trim();
const MERCHANT_ADDRESS = (process.env.MERCHANT_ADDRESS || '').trim();
const MERCHANT_SIG_PRIVATE_KEY = (process.env.MERCHANT_SIG_PRIVATE_KEY || '').trim();

if (!JWT_SECRET) {
  console.error('JWT_SECRET is required');
  process.exit(1);
}
if (!MERCHANT_ADDRESS) {
  console.error('MERCHANT_ADDRESS is required');
  process.exit(1);
}
if (!MERCHANT_SIG_PRIVATE_KEY) {
  console.error('MERCHANT_SIG_PRIVATE_KEY is required for signed 402 challenges');
  process.exit(1);
}

const app = express();
app.use(express.json());

initializeX402({
  rpcUrl: 'https://public-node.testnet.rsk.co',
  recipientAddress: MERCHANT_ADDRESS,
  requiredAmount: '0.0001',
  minConfirmations: 2,
  jwtSecret: JWT_SECRET,
  merchantSigPrivateKey: MERCHANT_SIG_PRIVATE_KEY,
});

app.use('/premium', x402Middleware({
  resourceId: 'premium-api',
  price: '0.0001',
  recipientAddress: MERCHANT_ADDRESS,
}));

app.get('/premium/data', (req, res) => {
  res.json({ message: 'Premium content unlocked!', user: req.x402?.userAddress });
});

app.post('/unlock', createUnlockRoute((req) => req.ip || req.socket?.remoteAddress || 'unknown'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Example server on http://localhost:${PORT}`);
  console.log('  GET  /premium/data     -> 402 until you unlock');
  console.log('  POST /unlock           -> body: { txHash, resourceId }');
});
