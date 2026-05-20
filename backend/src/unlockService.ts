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
import { createRateLimiter, type RateLimiter } from './RateLimiter';
import { assertProductionStorage } from './RedisConnection';
import type { ResourceConfig, UsageLogEntry, X402Config } from './types';

export interface UnlockServiceOptions extends X402Config {
  /** Max verification attempts per IP (or key) per window. Default 30. */
  rateLimitMax?: number;
  /** Rate limit window in ms. Default 60000 (1 min). */
  rateLimitWindowMs?: number;
  claimTtlMs?: number;
  redisUrl?: string;
  /** Allow file-based storage in production for single-node deployments. */
  allowSingleInstance?: boolean;
}

export interface UnlockResult {
  success: true;
  token: string;
  expiresIn: number;
  /** Usage log entry written for this unlock (avoids re-reading the full log file). */
  usage?: UsageLogEntry;
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
  private rateLimit: RateLimiter;
  private resourceConfigs: Map<string, ResourceConfig>;
  private merchantSigWallet: Wallet | null;
  private merchantSigTtlSeconds: number;

  constructor(options: UnlockServiceOptions) {
    const redisUrl = (options.redisUrl ?? process.env.X402_REDIS_URL ?? '').trim();
    assertProductionStorage({
      redisUrl,
      allowSingleInstance: options.allowSingleInstance,
    });

    this.rpcUrl = options.rpcUrl;
    this.defaultRecipient = options.recipientAddress;
    this.chainId = options.chainId ?? 31;
    this.defaultConfirmations = options.minConfirmations;
    this.defaultAccessDuration = 3600;
    this.logger = new UsageLogger({
      storagePath: options.storagePath,
      claimTtlMs: options.claimTtlMs,
      redisUrl: options.redisUrl,
      allowSingleInstance: options.allowSingleInstance,
    });
    const base = options.storagePath
      ? path.resolve(options.storagePath)
      : path.join(process.cwd(), '.x402');
    this.access = new AccessController({
      jwtSecret: options.jwtSecret,
      defaultExpirySeconds: 3600,
      revocationStore: new FileRevocationStore(path.join(base, 'revoked.json')),
    });
    this.rateLimit = createRateLimiter({
      storagePath: base,
      redisUrl: options.redisUrl,
      maxPerWindow: options.rateLimitMax ?? 30,
      windowMs: options.rateLimitWindowMs ?? 60_000,
    });
    this.resourceConfigs = new Map();
    const requireMerchantSig = options.requireMerchantSig ?? true;
    if (requireMerchantSig && !options.merchantSigPrivateKey) {
      throw new Error(
        'merchantSigPrivateKey is required when requireMerchantSig is true (default). ' +
          'Set MERCHANT_SIG_PRIVATE_KEY or pass requireMerchantSig: false for local demo only.'
      );
    }
    if (!options.merchantSigPrivateKey) {
      console.warn(
        '[x402] MERCHANT_SIG_PRIVATE_KEY is not set. 402 challenges will be UNSIGNED.\n' +
          '  This disables MITM protection on the payment-required handshake.\n' +
          '  Set MERCHANT_SIG_PRIVATE_KEY in production deployments.'
      );
    }
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

    const recovered = verifyMessage(message, sig).toLowerCase();
    if (recovered !== this.merchantSigWallet.address.toLowerCase()) return null;

    return { sig, expiresAt, signer: this.merchantSigWallet.address };
  }

  registerResource(config: ResourceConfig): void {
    this.resourceConfigs.set(config.resourceId, config);
  }

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

  async verifyAndUnlock(
    txHash: string,
    resourceId: string,
    rateLimitKey?: string
  ): Promise<UnlockResponse> {
    const key = rateLimitKey ?? 'global';
    if (!(await this.rateLimit.isAllowed(key))) {
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

    const claimed = await this.logger.claimTxHash(txHash);
    if (!claimed) {
      return { success: false, error: 'Transaction already used' };
    }

    const verifier = new PaymentVerifier({
      rpcUrl: this.rpcUrl,
      recipientAddress: config.recipientAddress,
      requiredAmountWei: amountWei,
      minConfirmations: this.defaultConfirmations,
      isTxHashUsed: (tx) => this.logger.isTxUsed(tx),
      chainId: this.chainId,
    });

    const result = await verifier.verifyPayment(txHash);

    if (!result.valid) {
      await this.logger.releaseTxHash(txHash);
      return {
        success: false,
        code: result.errorCode ?? 'PAYMENT_VERIFICATION_FAILED',
        error: result.error ?? 'Payment verification failed',
      };
    }

    await this.logger.markTxUsed(txHash);
    await this.logger.releaseTxHash(txHash);
    const usageEntry: UsageLogEntry = {
      txHash,
      userAddress: result.sender ?? '',
      resourceId,
      paymentAmount: result.amount ?? config.price,
      timestamp: new Date().toISOString(),
    };
    this.logger.log(usageEntry);

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
      usage: usageEntry,
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
