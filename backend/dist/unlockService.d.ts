/**
 * @x402/unlocker - Verify payment and issue access token (with rate limiting)
 */
import { AccessController } from './AccessController';
import { UsageLogger } from './UsageLogger';
import type { ResourceConfig, X402Config } from './types';
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
export declare class UnlockService {
    private rpcUrl;
    private defaultRecipient;
    private defaultConfirmations;
    private defaultAccessDuration;
    private chainId;
    private access;
    private logger;
    private rateLimit;
    constructor(options: UnlockServiceOptions);
    /** Register or override resource config (for dynamic pricing). */
    registerResource(config: ResourceConfig): void;
    /** Get resource config; returns default pricing if not registered. */
    getResourceConfig(resourceId: string): ResourceConfig;
    /**
     * Verify Rootstock payment and issue access token.
     * Prevents double spend and rate limits verification attempts.
     */
    verifyAndUnlock(txHash: string, resourceId: string, rateLimitKey?: string): Promise<UnlockResponse>;
    getAccessController(): AccessController;
    getUsageLogger(): UsageLogger;
}
//# sourceMappingURL=unlockService.d.ts.map