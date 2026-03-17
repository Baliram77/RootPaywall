/**
 * @x402/unlocker - Usage and double-spend tracking (JSON file storage)
 */

import * as fs from 'fs';
import * as path from 'path';
import type { UsageLogEntry } from './types';

const DEFAULT_STORAGE_DIR = '.x402';
const USAGE_LOG_FILE = 'usage.json';
const USED_TX_FILE = 'used-tx.json';

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

  constructor(options: UsageLoggerOptions = {}) {
    const base = options.storagePath
      ? path.resolve(options.storagePath)
      : path.join(process.cwd(), DEFAULT_STORAGE_DIR);
    this.usagePath = path.join(base, USAGE_LOG_FILE);
    this.usedTxPath = path.join(base, USED_TX_FILE);
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
