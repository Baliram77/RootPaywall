import { UnlockService } from '../src/unlockService';
import * as path from 'path';
import * as fs from 'fs';

const testStorage = path.join(process.cwd(), '.x402-unlock-test');

describe('UnlockService', () => {
  let service: UnlockService;

  beforeEach(() => {
    if (fs.existsSync(testStorage)) fs.rmSync(testStorage, { recursive: true });
    service = new UnlockService({
      rpcUrl: 'https://public-node.testnet.rsk.co',
      recipientAddress: '0x1234567890123456789012345678901234567890',
      requiredAmount: '0.0001',
      minConfirmations: 1,
      jwtSecret: 'test-secret',
      storagePath: testStorage,
      rateLimitMax: 2,
      rateLimitWindowMs: 10000,
    });
  });

  afterAll(() => {
    if (fs.existsSync(testStorage)) fs.rmSync(testStorage, { recursive: true });
  });

  it('should register and return resource config', () => {
    service.registerResource({
      resourceId: 'r1',
      price: '0.0002',
      currency: 'tRBTC',
      recipientAddress: '0xabc',
      accessDurationSeconds: 7200,
      isActive: true,
    });
    const config = service.getResourceConfig('r1');
    expect(config.price).toBe('0.0002');
    expect(config.recipientAddress).toBe('0xabc');
  });

  it('should return default config for unknown resource', () => {
    const config = service.getResourceConfig('unknown');
    expect(config.resourceId).toBe('unknown');
    expect(config.price).toBeDefined();
    expect(config.isActive).toBe(true);
  });

  it('should rate limit after max attempts', async () => {
    const result1 = await service.verifyAndUnlock('0xinvalid', 'r1', 'ip1');
    const result2 = await service.verifyAndUnlock('0xinvalid2', 'r1', 'ip1');
    const result3 = await service.verifyAndUnlock('0xinvalid3', 'r1', 'ip1');
    expect(result1.success).toBe(false);
    expect(result2.success).toBe(false);
    expect(result3.success).toBe(false);
    expect(result3.success).toBe(false);
    if (!result3.success) expect(result3.error).toContain('Too many');
  });
});
