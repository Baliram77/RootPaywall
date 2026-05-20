import * as fs from 'fs';
import * as path from 'path';
import { createRateLimiter } from '../src/RateLimiter';

const testDir = path.join(process.cwd(), '.x402-ratelimit-test');

describe('RateLimiter', () => {
  beforeEach(() => {
    if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true });
  });

  afterAll(() => {
    if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true });
  });

  it('allows up to maxPerWindow then blocks (file store)', async () => {
    const limiter = createRateLimiter({
      storagePath: testDir,
      maxPerWindow: 2,
      windowMs: 60_000,
    });
    expect(await limiter.isAllowed('ip-1')).toBe(true);
    expect(await limiter.isAllowed('ip-1')).toBe(true);
    expect(await limiter.isAllowed('ip-1')).toBe(false);
    expect(await limiter.isAllowed('ip-2')).toBe(true);
  });
});
