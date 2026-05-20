/**
 * Cluster-safe fixed-window rate limiter (file store on shared volume, or Redis).
 */

import * as fs from 'fs';
import * as path from 'path';
import { getRedisClient } from './RedisConnection';

const STORAGE_LOCK_STALE_MS = 30_000;

export interface RateLimiterOptions {
  storagePath?: string;
  redisUrl?: string;
  maxPerWindow: number;
  windowMs: number;
}

export interface RateLimiter {
  isAllowed(key: string): Promise<boolean>;
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

function readJson<T>(filePath: string, defaultValue: T): T {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
  } catch {
    return defaultValue;
  }
}

class FileRateLimiter implements RateLimiter {
  private dataPath: string;
  private lockPath: string;
  private maxPerWindow: number;
  private windowMs: number;

  constructor(base: string, maxPerWindow: number, windowMs: number) {
    this.dataPath = path.join(base, 'rate-limit.json');
    this.lockPath = path.join(base, 'rate-limit.storage.lock');
    this.maxPerWindow = maxPerWindow;
    this.windowMs = windowMs;
  }

  private withStorageLock<T>(fn: () => T): T {
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      try {
        const fd = fs.openSync(this.lockPath, 'wx');
        fs.writeFileSync(fd, String(process.pid));
        fs.closeSync(fd);
        try {
          return fn();
        } finally {
          try {
            if (fs.existsSync(this.lockPath)) fs.unlinkSync(this.lockPath);
          } catch {
            // ignore
          }
        }
      } catch {
        try {
          const stat = fs.statSync(this.lockPath);
          if (Date.now() - stat.mtimeMs > STORAGE_LOCK_STALE_MS) {
            fs.unlinkSync(this.lockPath);
          }
        } catch {
          // ignore
        }
      }
    }
    throw new Error('Could not acquire storage lock for rate limit');
  }

  async isAllowed(key: string): Promise<boolean> {
    return this.withStorageLock(() => {
      type Bucket = { windowStart: number; count: number };
      const data = readJson<Record<string, Bucket>>(this.dataPath, {});
      const now = Date.now();
      const existing = data[key];
      if (!existing || now - existing.windowStart >= this.windowMs) {
        data[key] = { windowStart: now, count: 1 };
        atomicWriteJson(this.dataPath, data);
        return true;
      }
      if (existing.count >= this.maxPerWindow) return false;
      existing.count += 1;
      atomicWriteJson(this.dataPath, data);
      return true;
    });
  }
}

class RedisRateLimiter implements RateLimiter {
  private redisUrl: string;
  private maxPerWindow: number;
  private windowSec: number;

  constructor(redisUrl: string, maxPerWindow: number, windowMs: number) {
    this.redisUrl = redisUrl;
    this.maxPerWindow = maxPerWindow;
    this.windowSec = Math.max(1, Math.ceil(windowMs / 1000));
  }

  async isAllowed(key: string): Promise<boolean> {
    const client = await getRedisClient(this.redisUrl);
    const redisKey = `x402:ratelimit:${key}`;
    const count = await client.incr(redisKey);
    if (count === 1) {
      await client.expire(redisKey, this.windowSec);
    }
    return count <= this.maxPerWindow;
  }
}

export function createRateLimiter(options: RateLimiterOptions): RateLimiter {
  const redisUrl = (options.redisUrl ?? process.env.X402_REDIS_URL ?? '').trim();
  if (redisUrl) {
    return new RedisRateLimiter(redisUrl, options.maxPerWindow, options.windowMs);
  }
  const base = options.storagePath
    ? path.resolve(options.storagePath)
    : path.join(process.cwd(), '.x402');
  ensureDir(base);
  return new FileRateLimiter(base, options.maxPerWindow, options.windowMs);
}
