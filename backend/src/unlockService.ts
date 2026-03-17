/**
 * @x402/unlocker - Verify payment and issue access token (with rate limiting)
 */

import { parseEther } from 'ethers';
import { PaymentVerifier } from './PaymentVerifier';
import { AccessController } from './AccessController';
import { UsageLogger } from './UsageLogger';
import type { ResourceConfig, X402Config } from './types';

/** Simple in-memory rate limiter: max N calls per key per windowMs */
function createRateLimiter(maxPerWindow: number, windowMs: number) {
  const hits = new Map<string, number[]>();
  return function isAllowed(key: string): boolean {
    const now = Date.now();
    let times = hits.get(key) ?? [];
    times = times.filter((t) => now - t < windowMs);
    if (times.length >= maxPerWindow) return false;
    times.push(now);
    hits.set(key, times);
    return true;
  };
}

export interface UnlockServiceOptions extends X402Config {
  /** Max verification attempts per IP (or key) per window. Default 30. */
  rateLimitMax?: number;
  /** Rate limit window in ms. Default 60000 (1 min). */
  rateLimitWindowMs?: number;
}

export interface UnlockResult {
  success: true;
  token: string;
  expiresIn: number;
}

export interface UnlockError {
  success: false;
  error: string;
}

export type UnlockResponse = UnlockResult | UnlockError;

/** Resource registry: resourceId -> config */
const resourceConfigs = new Map<string, ResourceConfig>();

export class UnlockService {
  private rpcUrl: string;
  private defaultRecipient: string;
  private defaultConfirmations: number;
  private defaultAccessDuration: number;
  private chainId: number;
  private access: AccessController;
  private logger: UsageLogger;
  private rateLimit: (key: string) => boolean;

  constructor(options: UnlockServiceOptions) {
    this.rpcUrl = options.rpcUrl;
    this.defaultRecipient = options.recipientAddress;
    this.chainId = options.chainId ?? 31;
    this.defaultConfirmations = options.minConfirmations;
    this.defaultAccessDuration = 3600;
    this.logger = new UsageLogger({ storagePath: options.storagePath });
    this.access = new AccessController({
      jwtSecret: options.jwtSecret,
      defaultExpirySeconds: 3600,
    });
    this.rateLimit = createRateLimiter(
      options.rateLimitMax ?? 30,
      options.rateLimitWindowMs ?? 60_000
    );
  }

  /** Register or override resource config (for dynamic pricing). */
  registerResource(config: ResourceConfig): void {
    resourceConfigs.set(config.resourceId, config);
  }

  /** Get resource config; returns default pricing if not registered. */
  getResourceConfig(resourceId: string): ResourceConfig {
    const existing = resourceConfigs.get(resourceId);
    if (existing) return existing;
    return {
      resourceId,
      price: '0.0001',
      currency: 'tRBTC',
      recipientAddress: this.defaultRecipient,
      accessDurationSeconds: this.defaultAccessDuration,
      isActive: true,
    };
  }

  /**
   * Verify Rootstock payment and issue access token.
   * Prevents double spend and rate limits verification attempts.
   */
  async verifyAndUnlock(
    txHash: string,
    resourceId: string,
    rateLimitKey?: string
  ): Promise<UnlockResponse> {
    const key = rateLimitKey ?? 'global';
    if (!this.rateLimit(key)) {
      return { success: false, error: 'Too many verification attempts' };
    }

    const config = this.getResourceConfig(resourceId);
    if (!config.isActive) {
      return { success: false, error: 'Resource is not active' };
    }

    const amountWei = parseEther(config.price).toString();
    const verifier = new PaymentVerifier({
      rpcUrl: this.rpcUrl,
      recipientAddress: config.recipientAddress,
      requiredAmountWei: amountWei,
      minConfirmations: this.defaultConfirmations,
      isTxHashUsed: (tx) => this.logger.isTxUsedAsync(tx),
      chainId: this.chainId,
    });

    const result = await verifier.verifyPayment(txHash);

    if (!result.valid) {
      return {
        success: false,
        error: result.error ?? 'Payment verification failed',
      };
    }

    this.logger.markTxUsed(txHash);
    this.logger.log({
      txHash,
      userAddress: result.sender ?? '',
      resourceId,
      paymentAmount: result.amount ?? config.price,
      timestamp: new Date().toISOString(),
    });

    const duration = config.accessDurationSeconds;
    const token = this.access.generateAccessToken(
      result.sender ?? '',
      resourceId,
      duration
    );

    return {
      success: true,
      token,
      expiresIn: duration,
    };
  }

  getAccessController(): AccessController {
    return this.access;
  }

  getUsageLogger(): UsageLogger {
    return this.logger;
  }
}
