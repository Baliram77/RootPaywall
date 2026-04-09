/**
 * @x402/unlocker - Rootstock micropayment paywall SDK
 *
 * Usage:
 *   import { initializeX402, x402Middleware, createUnlockRoute } from '@x402/unlocker';
 *   const service = initializeX402({ rpcUrl, recipientAddress, requiredAmount, minConfirmations, jwtSecret });
 *   app.use('/premium', x402Middleware({ resourceId: 'premium-api', price: '0.0001' }));
 *   app.post('/unlock', createUnlockRoute());
 */
import { UnlockService } from './unlockService';
export { x402Middleware, createUnlockRoute, setUnlockService, getUnlockService } from './x402Middleware';
export { PaymentVerifier } from './PaymentVerifier';
export { AccessController } from './AccessController';
export { UsageLogger } from './UsageLogger';
export { UnlockService } from './unlockService';
export type { X402Config, ResourceConfig, PaymentVerificationResult, AccessTokenPayload, UsageLogEntry, X402MiddlewareOptions, PaymentRequiredResponse, } from './types';
export { ROOTSTOCK_MAINNET_CHAIN_ID, ROOTSTOCK_TESTNET_CHAIN_ID, DEFAULT_ROOTSTOCK_TESTNET_RPC } from './types';
export type { UnlockResponse, UnlockResult, UnlockError } from './unlockService';
export interface InitializeX402Options {
    rpcUrl?: string;
    recipientAddress: string;
    requiredAmount: string;
    minConfirmations?: number;
    jwtSecret: string;
    /** Chain ID for RPC (default 31 = Rootstock Testnet); prevents provider network detection failures */
    chainId?: number;
    storagePath?: string;
    rateLimitMax?: number;
    rateLimitWindowMs?: number;
    /** Optional: sign 402 payment details to prevent MITM swapping. */
    merchantSigPrivateKey?: string;
    merchantSigTtlSeconds?: number;
}
/**
 * Initialize the x402 SDK. Call this once before using x402Middleware or createUnlockRoute.
 * Uses Rootstock testnet RPC by default.
 */
export declare function initializeX402(options: InitializeX402Options): UnlockService;
//# sourceMappingURL=index.d.ts.map