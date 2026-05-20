/**
 * Shared Redis client pool (one connection per URL).
 */

interface RedisClientMinimal {
  isOpen: boolean;
  connect(): Promise<void>;
  exists(key: string): Promise<number>;
  set(
    key: string,
    value: string,
    options?: { NX?: boolean; EX?: number }
  ): Promise<string | null>;
  del(key: string | string[]): Promise<number>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<boolean>;
}

const clients = new Map<string, RedisClientMinimal>();

export async function getRedisClient(redisUrl: string): Promise<RedisClientMinimal> {
  const existing = clients.get(redisUrl);
  if (existing?.isOpen) return existing;

  try {
    require.resolve('redis');
  } catch {
    throw new Error(
      'X402_REDIS_URL is set but the redis package is not installed. Run: npm install redis'
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient } = require('redis') as typeof import('redis');
  const client = createClient({ url: redisUrl }) as unknown as RedisClientMinimal;
  await client.connect();
  clients.set(redisUrl, client);
  return client;
}

/**
 * Production deployments must use Redis (multi-instance safe) or explicitly opt into single-instance file storage.
 */
export function assertProductionStorage(options: {
  redisUrl?: string;
  allowSingleInstance?: boolean;
}): void {
  if (process.env.NODE_ENV !== 'production') return;

  const redisUrl = (options.redisUrl ?? process.env.X402_REDIS_URL ?? '').trim();
  const singleInstance =
    options.allowSingleInstance === true || process.env.X402_SINGLE_INSTANCE === 'true';

  if (!redisUrl && !singleInstance) {
    throw new Error(
      'Production requires X402_REDIS_URL for cluster-safe claims and rate limits, ' +
        'or set X402_SINGLE_INSTANCE=true for a known single-node deployment.'
    );
  }
}
