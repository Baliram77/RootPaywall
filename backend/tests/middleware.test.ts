import express, { Request, Response } from 'express';
import request from 'supertest';
import {
  initializeX402,
  x402Middleware,
  createUnlockRoute,
  getUnlockService,
  AccessController,
  configureExpressTrustProxy,
} from '../src/index';

describe('x402 middleware and unlock', () => {
  const jwtSecret = 'test-jwt-secret';
  const merchant = '0x1234567890123456789012345678901234567890';

  let app: express.Express;

  beforeAll(() => {
    initializeX402({
      rpcUrl: 'https://public-node.testnet.rsk.co',
      recipientAddress: merchant,
      requiredAmount: '0.0001',
      minConfirmations: 1,
      jwtSecret,
      requireMerchantSig: false,
    });
  });

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  it('should return 402 when no token', async () => {
    app.use('/premium', x402Middleware({ resourceId: 'premium-api', price: '0.0001' }));
    app.get('/premium/data', (_req: Request, res: Response) => res.json({ data: 'secret' }));

    const res = await request(app).get('/premium/data');
    expect(res.status).toBe(402);
    expect(res.body.error).toBe('Payment Required');
    expect(res.body.price).toBeDefined();
    expect(res.body.address).toBeDefined();
  });

  it('unlock route should require txHash and resourceId', async () => {
    app.post('/unlock', createUnlockRoute());

    const res = await request(app).post('/unlock').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Missing');
  });

  it('unlock route should reject HTTP when HTTPS enforced', async () => {
    const prev = process.env.X402_ENFORCE_HTTPS;
    process.env.X402_ENFORCE_HTTPS = 'true';
    try {
      app.post('/unlock', createUnlockRoute());
      const res = await request(app)
        .post('/unlock')
        .send({ txHash: '0x' + 'a'.repeat(64), resourceId: 'premium-api' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('HTTPS is required');
    } finally {
      if (prev === undefined) delete process.env.X402_ENFORCE_HTTPS;
      else process.env.X402_ENFORCE_HTTPS = prev;
    }
  });

  it('accepts HTTPS via X-Forwarded-Proto only when trust proxy is configured', async () => {
    const prevEnforce = process.env.X402_ENFORCE_HTTPS;
    const prevTrust = process.env.X402_TRUST_PROXY;
    process.env.X402_ENFORCE_HTTPS = 'true';
    process.env.X402_TRUST_PROXY = 'true';
    try {
      configureExpressTrustProxy(app);
      app.post('/unlock', createUnlockRoute());
      const res = await request(app)
        .post('/unlock')
        .set('X-Forwarded-Proto', 'https')
        .send({ txHash: '0x' + 'a'.repeat(64), resourceId: 'premium-api' });
      expect(res.body.error).not.toBe('HTTPS is required');
    } finally {
      if (prevEnforce === undefined) delete process.env.X402_ENFORCE_HTTPS;
      else process.env.X402_ENFORCE_HTTPS = prevEnforce;
      if (prevTrust === undefined) delete process.env.X402_TRUST_PROXY;
      else process.env.X402_TRUST_PROXY = prevTrust;
    }
  });

  it('does not accept token from query string', async () => {
    const access = new AccessController({ jwtSecret });
    const token = access.generateAccessToken('0xuser', 'premium-api');
    app.use('/premium', x402Middleware({ resourceId: 'premium-api', price: '0.0001' }));
    app.get('/premium/data', (_req: Request, res: Response) => res.json({ data: 'secret' }));

    const res = await request(app).get('/premium/data').query({ token });
    expect(res.status).toBe(402);
  });

  it('getUnlockService should return service after init', () => {
    expect(getUnlockService()).not.toBeNull();
  });
});
