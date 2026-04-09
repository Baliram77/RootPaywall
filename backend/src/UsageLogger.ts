/**
 * @x402/unlocker - Usage and double-spend tracking (JSON file storage)
 */

import * as fs from 'fs';
import * as path from 'path';
import type { UsageLogEntry } from './types';

const DEFAULT_STORAGE_DIR = '.x402';
const USAGE_LOG_FILE = 'usage.json';
const USED_TX_FILE = 'used-tx.json';
const CLAIMS_DIR = 'claims';

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

function writeJson(filePath: string, data: unknown): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export interface UsageLoggerOptions {
  storagePath?: string;
}

export class UsageLogger {
  private usagePath: string;
  private usedTxPath: string;
  private claimsDir: string;

  constructor(options: UsageLoggerOptions = {}) {
    const base = options.storagePath
      ? path.resolve(options.storagePath)
      : path.join(process.cwd(), DEFAULT_STORAGE_DIR);
    this.usagePath = path.join(base, USAGE_LOG_FILE);
    this.usedTxPath = path.join(base, USED_TX_FILE);
    this.claimsDir = path.join(base, CLAIMS_DIR);
  }

  /** Log a usage event (payment + resource access). */
  log(entry: UsageLogEntry): void {
    const logs = readJson<UsageLogEntry[]>(this.usagePath, []);
    logs.push(entry);
    writeJson(this.usagePath, logs);
  }

  /** Record a tx hash as used to prevent double spending. */
  markTxUsed(txHash: string): void {
    const set = readJson<Record<string, true>>(this.usedTxPath, {});
    set[txHash.toLowerCase()] = true;
    writeJson(this.usedTxPath, set);
  }

  /**
   * Atomically claim a tx hash to prevent concurrent verification (TOCTOU).
   * Uses an exclusive lock file per tx hash, which is safe across processes.
   *
   * Returns true if claimed, false if already claimed/used.
   */
  claimTxHash(txHash: string): boolean {
    const normalized = txHash.toLowerCase();
    if (this.isTxUsed(normalized)) return false;
    ensureDir(this.claimsDir);
    const lockPath = path.join(this.claimsDir, `${normalized}.lock`);
    try {
      const fd = fs.openSync(lockPath, 'wx');
      fs.closeSync(fd);
      return true;
    } catch {
      return false;
    }
  }

  /** Release a previously claimed tx hash (best-effort). */
  releaseTxHash(txHash: string): void {
    const normalized = txHash.toLowerCase();
    const lockPath = path.join(this.claimsDir, `${normalized}.lock`);
    try {
      if (fs.existsSync(lockPath)) fs.unlinkSync(lockPath);
    } catch {
      // ignore
    }
  }

  /** Check if a tx hash was already used. */
  isTxUsed(txHash: string): boolean {
    const set = readJson<Record<string, true>>(this.usedTxPath, {});
    return !!set[txHash.toLowerCase()];
  }

  /** Async version for PaymentVerifier. */
  async isTxUsedAsync(txHash: string): Promise<boolean> {
    return Promise.resolve(this.isTxUsed(txHash));
  }

  /** Get all usage logs (for admin/debug). */
  getLogs(): UsageLogEntry[] {
    return readJson<UsageLogEntry[]>(this.usagePath, []);
  }
}
