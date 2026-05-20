/**
 * @x402/unlocker - Usage and double-spend tracking (JSON file storage + claim store)
 */

import * as fs from 'fs';
import * as path from 'path';
import { createClaimStore, type ClaimStore } from './ClaimStore';
import type { UsageLogEntry } from './types';

const DEFAULT_STORAGE_DIR = '.x402';
const USAGE_LOG_FILE = 'usage.json';

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readJson<T>(filePath: string, defaultValue: T): T {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}

function atomicWriteJson(filePath: string, data: unknown): void {
  ensureDir(path.dirname(filePath));
  const tmp = `${filePath}.tmp.${process.pid}.${Date.now()}`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmp, filePath);
}

export interface UsageLoggerOptions {
  storagePath?: string;
  claimTtlMs?: number;
  redisUrl?: string;
}

export class UsageLogger {
  private usagePath: string;
  private claims: ClaimStore;

  constructor(options: UsageLoggerOptions = {}) {
    const base = options.storagePath
      ? path.resolve(options.storagePath)
      : path.join(process.cwd(), DEFAULT_STORAGE_DIR);
    ensureDir(base);
    this.usagePath = path.join(base, USAGE_LOG_FILE);
    this.claims = createClaimStore({
      storagePath: base,
      claimTtlMs: options.claimTtlMs,
      redisUrl: options.redisUrl,
    });
  }

  /** Log a usage event (payment + resource access). */
  log(entry: UsageLogEntry): void {
    const logs = readJson<UsageLogEntry[]>(this.usagePath, []);
    logs.push(entry);
    atomicWriteJson(this.usagePath, logs);
  }

  /** Record a tx hash as used to prevent double spending. */
  async markTxUsed(txHash: string): Promise<void> {
    await this.claims.markTxUsed(txHash);
  }

  /**
   * Atomically claim a tx hash to prevent concurrent verification (TOCTOU).
   * File store: persists claiming state in shared used-tx.json (multi-instance on shared volume).
   * Redis store: cluster-wide SET NX when X402_REDIS_URL is set.
   */
  async claimTxHash(txHash: string): Promise<boolean> {
    return this.claims.claimTxHash(txHash);
  }

  /** Release a previously claimed tx hash (best-effort). */
  async releaseTxHash(txHash: string): Promise<void> {
    await this.claims.releaseTxHash(txHash);
  }

  /** Check if a tx hash was already used or actively claimed. */
  async isTxUsed(txHash: string): Promise<boolean> {
    return this.claims.isTxUsed(txHash);
  }

  /** Alias for PaymentVerifier integration. */
  async isTxUsedAsync(txHash: string): Promise<boolean> {
    return this.isTxUsed(txHash);
  }

  /** Get all usage logs (for admin/debug). */
  getLogs(): UsageLogEntry[] {
    return readJson<UsageLogEntry[]>(this.usagePath, []);
  }
}
