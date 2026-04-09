/**
 * @x402/unlocker - Verify payment and issue access token (with rate limiting)
 */

import * as path from 'path';
import { parseEther } from 'ethers';
import { Wallet, verifyMessage } from 'ethers';
import { PaymentVerifier } from './PaymentVerifier';
import { AccessController } from './AccessController';
import { UsageLogger } from './UsageLogger';
import { FileRevocationStore } from './RevocationStore';
import type { ResourceConfig, X402Config } from './types';

/** Simple in-memory fixed-window rate limiter with TTL cleanup. */
function createRateLimiter(maxPerWindow: number, windowMs: number) {
  const buckets = new Map<string, { windowStart: number; count: number; lastSeen: number }>();
  let lastGc = 0;
  const gcEveryMs = Math.max(windowMs, 30_000);

  return function isAllowed(key: string): boolean {
    const now = Date.now();
    if (now - lastGc > gcEveryMs) {
      lastGc = now;
      for (const [k, v] of buckets.entries()) {
        if (now - v.lastSeen > windowMs * 2) buckets.delete(k);
      }
    }

    const existing = buckets.get(key);
    if (!existing || now - existing.windowStart >= windowMs) {
      buckets.set(key, { windowStart: now, count: 1, lastSeen: now });
      return true;
    }

    existing.lastSeen = now;
    if (existing.count >= maxPerWindow) return false;
    existing.count += 1;
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
  code?: string;
}

export type UnlockResponse = UnlockResult | UnlockError;

export class UnlockService {
  private rpcUrl: string;
  private defaultRecipient: string;
  private defaultConfirmations: number;
  private defaultAccessDuration: number;
  private chainId: number;
  private access: AccessController;
  private logger: UsageLogger;
  private rateLimit: (key: string) => boolean;
  private resourceConfigs: Map<string, ResourceConfig>;
  private merchantSigWallet: Wallet | null;
  private merchantSigTtlSeconds: number;

  constructor(options: UnlockServiceOptions) {
    this.rpcUrl = options.rpcUrl;
    this.defaultRecipient = options.recipientAddress;
    this.chainId = options.chainId ?? 31;
    this.defaultConfirmations = options.minConfirmations;
    this.defaultAccessDuration = 3600;
    this.logger = new UsageLogger({ storagePath: options.storagePath });
    // Persist token revocations to the same storage base as usage logs (if configured).
    const base = options.storagePath
      ? path.resolve(options.storagePath)
      : path.join(process.cwd(), '.x402');
    this.access = new AccessController({
      jwtSecret: options.jwtSecret,
      defaultExpirySeconds: 3600,
      revocationStore: new FileRevocationStore(path.join(base, 'revoked.json')),
    });
    this.rateLimit = createRateLimiter(
      options.rateLimitMax ?? 30,
      options.rateLimitWindowMs ?? 60_000
    );
    this.resourceConfigs = new Map();
    this.merchantSigWallet = options.merchantSigPrivateKey
      ? new Wallet(options.merchantSigPrivateKey)
      : null;
    this.merchantSigTtlSeconds = options.merchantSigTtlSeconds ?? 300;
  }

  createPaymentRequiredSignature(params: {
    address: string;
    price: string;
    resourceId: string;
  }): { sig: string; expiresAt: number; signer: string } | null {
    if (!this.merchantSigWallet) return null;
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + this.merchantSigTtlSeconds;
    const message = [
      'x402',
      'payment-required',
      params.address.toLowerCase(),
      params.price,
      params.resourceId,
      String(this.chainId),
      String(expiresAt),
    ].join('|');
    const sig = this.merchantSigWallet.signMessageSync(message);

    // Self-check to avoid shipping a bad signature due to misconfig.
    const recovered = verifyMessage(message, sig).toLowerCase();
    if (recovered !== this.merchantSigWallet.address.toLowerCase()) return null;

    return { sig, expiresAt, signer: this.merchantSigWallet.address };
  }

  /** Register or override resource config (for dynamic pricing). */
  registerResource(config: ResourceConfig): void {
    this.resourceConfigs.set(config.resourceId, config);
  }

  /** Get resource config; returns default pricing if not registered. */
  getResourceConfig(resourceId: string): ResourceConfig {
    const existing = this.resourceConfigs.get(resourceId);
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

    let amountWei: string;
    try {
      amountWei = parseEther(config.price).toString();
    } catch {
      return { success: false, error: 'Invalid price configuration' };
    }

    // Atomically claim txHash before verification to prevent races.
    const claimed = this.logger.claimTxHash(txHash);
    if (!claimed) {
      return { success: false, error: 'Transaction already used' };
    }

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
      // Release claim so user can retry after confirmations/indexing.
      this.logger.releaseTxHash(txHash);
      return {
        success: false,
        code: result.errorCode ?? 'PAYMENT_VERIFICATION_FAILED',
        error: result.error ?? 'Payment verification failed',
      };
    }

    this.logger.markTxUsed(txHash);
    this.logger.releaseTxHash(txHash);
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

  getChainId(): number {
    return this.chainId;
  }
}
