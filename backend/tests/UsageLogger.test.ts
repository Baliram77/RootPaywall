import * as fs from 'fs';
import * as path from 'path';
import { UsageLogger } from '../src/UsageLogger';

const testDir = path.join(process.cwd(), '.x402-test');

describe('UsageLogger', () => {
  let logger: UsageLogger;

  beforeEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
    logger = new UsageLogger({ storagePath: testDir });
  });

  afterAll(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  it('should log and mark tx used', () => {
    logger.log({
      txHash: '0xabc',
      userAddress: '0xuser',
      resourceId: 'r1',
      paymentAmount: '0.0001',
      timestamp: new Date().toISOString(),
    });
    logger.markTxUsed('0xabc');
    expect(logger.isTxUsed('0xabc')).toBe(true);
    expect(logger.isTxUsed('0xdef')).toBe(false);
  });

  it('should return logs', () => {
    logger.log({
      txHash: '0x1',
      userAddress: '0xu',
      resourceId: 'r1',
      paymentAmount: '0.0001',
      timestamp: new Date().toISOString(),
    });
    const logs = logger.getLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].txHash).toBe('0x1');
  });

  it('claimTxHash returns true for exactly one concurrent caller', async () => {
    const txHash = '0x' + 'a'.repeat(64);
    const results = await Promise.all(
      Array.from({ length: 20 }, () => Promise.resolve(logger.claimTxHash(txHash)))
    );
    expect(results.filter(Boolean)).toHaveLength(1);
    logger.releaseTxHash(txHash);
  });

  it('claimTxHash rejects second claim on same txHash', () => {
    const txHash = '0x' + 'b'.repeat(64);
    expect(logger.claimTxHash(txHash)).toBe(true);
    expect(logger.claimTxHash(txHash)).toBe(false);
    logger.releaseTxHash(txHash);
  });
});
