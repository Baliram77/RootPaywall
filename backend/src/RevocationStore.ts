/**
 * @x402/unlocker - Revocation storage (memory or file-backed)
 *
 * Note: This is a best-effort revocation layer. Tokens are still time-bounded via JWT expiry.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface RevocationStore {
  /** Revoke a key until unix seconds `until` (or indefinitely if omitted). */
  revoke(key: string, until?: number): void;
  /** True if revoked (and not expired). */
  isRevoked(key: string, nowSeconds?: number): boolean;
  /** Optional cleanup hook. */
  cleanup(nowSeconds?: number): void;
}

export class MemoryRevocationStore implements RevocationStore {
  private revoked = new Map<string, number | null>(); // key -> until (unix seconds) or null

  revoke(key: string, until?: number): void {
    this.revoked.set(key, typeof until === 'number' ? until : null);
  }

  isRevoked(key: string, nowSeconds = Math.floor(Date.now() / 1000)): boolean {
    const until = this.revoked.get(key);
    if (until == null) return this.revoked.has(key);
    if (until <= nowSeconds) {
      this.revoked.delete(key);
      return false;
    }
    return true;
  }

  cleanup(nowSeconds = Math.floor(Date.now() / 1000)): void {
    for (const [k, until] of this.revoked.entries()) {
      if (until != null && until <= nowSeconds) this.revoked.delete(k);
    }
  }
}

type FileState = Record<string, number | null>;

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
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

export class FileRevocationStore implements RevocationStore {
  private filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  revoke(key: string, until?: number): void {
    const state = readJson<FileState>(this.filePath, {});
    state[key] = typeof until === 'number' ? until : null;
    writeJson(this.filePath, state);
  }

  isRevoked(key: string, nowSeconds = Math.floor(Date.now() / 1000)): boolean {
    const state = readJson<FileState>(this.filePath, {});
    if (!(key in state)) return false;
    const until = state[key];
    if (until == null) return true;
    if (until <= nowSeconds) {
      delete state[key];
      writeJson(this.filePath, state);
      return false;
    }
    return true;
  }

  cleanup(nowSeconds = Math.floor(Date.now() / 1000)): void {
    const state = readJson<FileState>(this.filePath, {});
    let changed = false;
    for (const [k, until] of Object.entries(state)) {
      if (until != null && until <= nowSeconds) {
        delete state[k];
        changed = true;
      }
    }
    if (changed) writeJson(this.filePath, state);
  }
}

