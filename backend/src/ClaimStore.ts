/**
 * Atomic tx-hash claiming for double-spend protection.
 * - File store: shared storagePath + TTL stale-claim recovery (multi-instance on shared volume).
 * - Redis store: SET NX EX when X402_REDIS_URL is configured (multi-instance without shared FS).
 */

import * as fs from 'fs';
import * as path from 'path';

const DEFAULT_CLAIM_TTL_MS = 10 * 60 * 1000;
const STORAGE_LOCK_STALE_MS = 30_000;

export type UsedTxRecord =
  | true
  | { s: 'used' }
  | { s: 'claiming'; t: number };

export interface ClaimStoreOptions {
  storagePath?: string;
  /** Stale in-flight claim TTL (default 10 minutes). */
  claimTtlMs?: number;
  /** Redis URL for cluster-wide claims (env: X402_REDIS_URL). */
  redisUrl?: string;
}

export interface ClaimStore {
  claimTxHash(txHash: string): Promise<boolean>;
  releaseTxHash(txHash: string): Promise<void>;
  markTxUsed(txHash: string): Promise<void>;
  isTxUsed(txHash: string): Promise<boolean>;
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function atomicWriteJson(filePath: string, data: unknown): void {
  ensureDir(path.dirname(filePath));
  const tmp = `${filePath}.tmp.${process.pid}.${Date.now()}`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmp, filePath);
}

function readJsonRecord(filePath: string): Record<string, UsedTxRecord> {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as Record<string, UsedTxRecord>;
  } catch {
    return {};
  }
}

function isUsedRecord(entry: UsedTxRecord | undefined, claimTtlMs: number): boolean {
  if (entry === true || entry?.s === 'used') return true;
  if (entry?.s === 'claiming') {
    return Date.now() - entry.t < claimTtlMs;
  }
  return false;
}

class FileClaimStore implements ClaimStore {
  private usedTxPath: string;
  private storageLockPath: string;
  private claimTtlMs: number;

  constructor(base: string, claimTtlMs: number) {
    this.usedTxPath = path.join(base, 'used-tx.json');
    this.storageLockPath = path.join(base, 'used-tx.storage.lock');
    this.claimTtlMs = claimTtlMs;
  }

  private withStorageLock<T>(fn: () => T): T {
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      try {
        const fd = fs.openSync(this.storageLockPath, 'wx');
        fs.writeFileSync(fd, String(process.pid));
        fs.closeSync(fd);
        try {
          return fn();
        } finally {
          try {
            if (fs.existsSync(this.storageLockPath)) fs.unlinkSync(this.storageLockPath);
          } catch {
            // ignore
          }
        }
      } catch {
        try {
          const stat = fs.statSync(this.storageLockPath);
          if (Date.now() - stat.mtimeMs > STORAGE_LOCK_STALE_MS) {
            fs.unlinkSync(this.storageLockPath);
          }
        } catch {
          // ignore
        }
      }
    }
    throw new Error('Could not acquire storage lock for tx claim');
  }

  async claimTxHash(txHash: string): Promise<boolean> {
    const normalized = txHash.toLowerCase();
    return this.withStorageLock(() => {
      const data = readJsonRecord(this.usedTxPath);
      const entry = data[normalized];
      if (isUsedRecord(entry, this.claimTtlMs)) return false;
      data[normalized] = { s: 'claiming', t: Date.now() };
      atomicWriteJson(this.usedTxPath, data);
      return true;
    });
  }

  async releaseTxHash(txHash: string): Promise<void> {
    const normalized = txHash.toLowerCase();
    this.withStorageLock(() => {
      const data = readJsonRecord(this.usedTxPath);
      const entry = data[normalized];
      if (typeof entry === 'object' && entry !== null && entry.s === 'claiming') {
        delete data[normalized];
        atomicWriteJson(this.usedTxPath, data);
      }
    });
  }

  async markTxUsed(txHash: string): Promise<void> {
    const normalized = txHash.toLowerCase();
    this.withStorageLock(() => {
      const data = readJsonRecord(this.usedTxPath);
      data[normalized] = { s: 'used' };
      atomicWriteJson(this.usedTxPath, data);
    });
  }

  async isTxUsed(txHash: string): Promise<boolean> {
    const normalized = txHash.toLowerCase();
    const data = readJsonRecord(this.usedTxPath);
    return isUsedRecord(data[normalized], this.claimTtlMs);
  }
}

class RedisClaimStore implements ClaimStore {
  private client: import('redis').RedisClientType;
  private claimTtlSec: number;
  private connected = false;

  constructor(redisUrl: string, claimTtlMs: number) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient } = require('redis') as typeof import('redis');
    this.client = createClient({ url: redisUrl });
    this.claimTtlSec = Math.max(1, Math.ceil(claimTtlMs / 1000));
    this.client.on('error', () => {
      // surfaced on command failure
    });
  }

  private async ensureConnected(): Promise<void> {
    if (!this.connected) {
      await this.client.connect();
      this.connected = true;
    }
  }

  private usedKey(txHash: string): string {
    return `x402:used:${txHash.toLowerCase()}`;
  }

  private claimKey(txHash: string): string {
    return `x402:claim:${txHash.toLowerCase()}`;
  }

  async claimTxHash(txHash: string): Promise<boolean> {
    await this.ensureConnected();
    const normalized = txHash.toLowerCase();
    if (await this.client.exists(this.usedKey(normalized))) return false;
    const result = await this.client.set(this.claimKey(normalized), '1', {
      NX: true,
      EX: this.claimTtlSec,
    });
    return result === 'OK';
  }

  async releaseTxHash(txHash: string): Promise<void> {
    await this.ensureConnected();
    await this.client.del(this.claimKey(txHash.toLowerCase()));
  }

  async markTxUsed(txHash: string): Promise<void> {
    await this.ensureConnected();
    const normalized = txHash.toLowerCase();
    await this.client.set(this.usedKey(normalized), '1');
    await this.client.del(this.claimKey(normalized));
  }

  async isTxUsed(txHash: string): Promise<boolean> {
    await this.ensureConnected();
    const normalized = txHash.toLowerCase();
    if (await this.client.exists(this.usedKey(normalized))) return true;
    return (await this.client.exists(this.claimKey(normalized))) === 1;
  }
}

export function createClaimStore(options: ClaimStoreOptions = {}): ClaimStore {
  const claimTtlMs = options.claimTtlMs ?? DEFAULT_CLAIM_TTL_MS;
  const redisUrl = (options.redisUrl ?? process.env.X402_REDIS_URL ?? '').trim();
  if (redisUrl) {
    try {
      require.resolve('redis');
    } catch {
      throw new Error(
        'X402_REDIS_URL is set but the redis package is not installed. Run: npm install redis'
      );
    }
    return new RedisClaimStore(redisUrl, claimTtlMs);
  }
  const base = options.storagePath
    ? path.resolve(options.storagePath)
    : path.join(process.cwd(), '.x402');
  ensureDir(base);
  return new FileClaimStore(base, claimTtlMs);
}
