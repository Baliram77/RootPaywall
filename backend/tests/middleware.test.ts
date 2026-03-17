import express, { Request, Response } from 'express';
import request from 'supertest';
import {
  initializeX402,
  x402Middleware,
  createUnlockRoute,
  getUnlockService,
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

  it('getUnlockService should return service after init', () => {
    expect(getUnlockService()).not.toBeNull();
  });
});
