import { assertProductionStorage } from '../src/RedisConnection';
import { UnlockService } from '../src/unlockService';
import * as path from 'path';
import * as fs from 'fs';

describe('production storage guard', () => {
  const prevNodeEnv = process.env.NODE_ENV;
  const prevRedis = process.env.X402_REDIS_URL;
  const prevSingle = process.env.X402_SINGLE_INSTANCE;

  afterEach(() => {
    process.env.NODE_ENV = prevNodeEnv;
    if (prevRedis === undefined) delete process.env.X402_REDIS_URL;
    else process.env.X402_REDIS_URL = prevRedis;
    if (prevSingle === undefined) delete process.env.X402_SINGLE_INSTANCE;
    else process.env.X402_SINGLE_INSTANCE = prevSingle;
  });

  it('throws in production without Redis or single-instance opt-in', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.X402_REDIS_URL;
    delete process.env.X402_SINGLE_INSTANCE;
    expect(() => assertProductionStorage({})).toThrow(/X402_REDIS_URL/);
  });

  it('allows production with X402_SINGLE_INSTANCE=true', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.X402_REDIS_URL;
    process.env.X402_SINGLE_INSTANCE = 'true';
    expect(() => assertProductionStorage({})).not.toThrow();
  });

  it('UnlockService starts in production when allowSingleInstance is set', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.X402_REDIS_URL;
    const dir = path.join(process.cwd(), '.x402-prod-test');
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true });
    expect(
      () =>
        new UnlockService({
          rpcUrl: 'https://public-node.testnet.rsk.co',
          recipientAddress: '0x1234567890123456789012345678901234567890',
          requiredAmount: '0.0001',
          minConfirmations: 1,
          jwtSecret: 'test',
          storagePath: dir,
          allowSingleInstance: true,
          requireMerchantSig: false,
        })
    ).not.toThrow();
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true });
    process.env.NODE_ENV = prevNodeEnv;
  });
});
