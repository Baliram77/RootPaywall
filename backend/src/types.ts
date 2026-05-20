/**
 * @x402/unlocker - Type definitions
 */

/** Resource configuration for a protected route or content */
export interface ResourceConfig {
  resourceId: string;
  price: string;
  currency: string;
  recipientAddress: string;
  accessDurationSeconds: number;
  isActive: boolean;
}

/** Global SDK configuration */
export interface X402Config {
  rpcUrl: string;
  recipientAddress: string;
  requiredAmount: string;
  minConfirmations: number;
  jwtSecret: string;
  /** Optional: chain ID (e.g. 31 for Rootstock Testnet); avoids RPC network detection issues */
  chainId?: number;
  /** Optional: custom storage path for usage logs and used tx hashes */
  storagePath?: string;
  /** Stale in-flight claim TTL in ms (default 10 minutes). */
  claimTtlMs?: number;
  /** Redis URL for cluster-wide tx claims (env: X402_REDIS_URL). */
  redisUrl?: string;
  /**
   * Optional: private key used to sign 402 payment details (prevents MITM address swapping).
   * If set, middleware will include signature fields in the 402 response.
   */
  merchantSigPrivateKey?: string;
  /** Signature TTL in seconds (default 300). */
  merchantSigTtlSeconds?: number;
  /**
   * Require MERCHANT_SIG_PRIVATE_KEY at startup (default: true).
   * Set false only for local demos that intentionally ship unsigned 402 challenges.
   */
  requireMerchantSig?: boolean;
}

/** Payment verification result */
export interface PaymentVerificationResult {
  valid: boolean;
  amount?: string;
  sender?: string;
  recipient?: string;
  confirmations?: number;
  txHash?: string;
  error?: string;
  errorCode?: string;
}

/** JWT access token payload */
export interface AccessTokenPayload {
  userAddress: string;
  resourceId: string;
  expiry: number;
  iat?: number;
}

/** Log entry for usage tracking */
export interface UsageLogEntry {
  txHash: string;
  userAddress: string;
  resourceId: string;
  paymentAmount: string;
  timestamp: string;
}

/** Middleware options per route */
export interface X402MiddlewareOptions {
  resourceId: string;
  price: string;
  recipientAddress?: string;
  accessDurationSeconds?: number;
  /**
   * Enforce HTTPS (recommended for production).
   * Default: true in production, false otherwise.
   */
  enforceHttps?: boolean;
}

/** HTTP 402 response body */
export interface PaymentRequiredResponse {
  error: string;
  price: string;
  address: string;
  resourceId?: string;
  chainId?: number;
  addressSig?: string;
  addressSigExpiresAt?: number; // unix seconds
  addressSigSigner?: string; // signer address
}

/** Rootstock chain IDs */
export const ROOTSTOCK_MAINNET_CHAIN_ID = 30;
export const ROOTSTOCK_TESTNET_CHAIN_ID = 31;

/** Default Rootstock testnet RPC */
export const DEFAULT_ROOTSTOCK_TESTNET_RPC = 'https://public-node.testnet.rsk.co';
