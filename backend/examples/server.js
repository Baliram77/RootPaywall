/**
 * Example Express server using @x402/unlocker with Rootstock testnet.
 *
 * Run: node examples/server.js
 * (from backend directory after npm install && npm run build)
 *
 * 1. GET /premium/data -> 402 with price and address
 * 2. Send tRBTC to that address on Rootstock testnet
 * 3. POST /unlock { "txHash": "...", "resourceId": "premium-api" } -> { token, expiresIn }
 * 4. GET /premium/data with Header: Authorization: Bearer <token> -> 200 + data
 */

const path = require('path');
const express = require('express');
const { initializeX402, x402Middleware, createUnlockRoute } = require(path.join(__dirname, '../dist'));

const app = express();
app.use(express.json());

const MERCHANT_ADDRESS = process.env.MERCHANT_ADDRESS || '0x1234567890123456789012345678901234567890';
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

initializeX402({
  rpcUrl: 'https://public-node.testnet.rsk.co',
  recipientAddress: MERCHANT_ADDRESS,
  requiredAmount: '0.0001',
  minConfirmations: 2,
  jwtSecret: JWT_SECRET,
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
  console.log('  POST /unlock           -> body: { txHash, resourceId }`);
});
