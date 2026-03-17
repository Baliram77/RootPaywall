"use strict";
/**
 * @x402/unlocker - Verify payment and issue access token (with rate limiting)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnlockService = void 0;
const ethers_1 = require("ethers");
const PaymentVerifier_1 = require("./PaymentVerifier");
const AccessController_1 = require("./AccessController");
const UsageLogger_1 = require("./UsageLogger");
/** Simple in-memory rate limiter: max N calls per key per windowMs */
function createRateLimiter(maxPerWindow, windowMs) {
    const hits = new Map();
    return function isAllowed(key) {
        const now = Date.now();
        let times = hits.get(key) ?? [];
        times = times.filter((t) => now - t < windowMs);
        if (times.length >= maxPerWindow)
            return false;
        times.push(now);
        hits.set(key, times);
        return true;
    };
}
/** Resource registry: resourceId -> config */
const resourceConfigs = new Map();
class UnlockService {
    constructor(options) {
        this.rpcUrl = options.rpcUrl;
        this.defaultRecipient = options.recipientAddress;
        this.chainId = options.chainId ?? 31;
        this.defaultConfirmations = options.minConfirmations;
        this.defaultAccessDuration = 3600;
        this.logger = new UsageLogger_1.UsageLogger({ storagePath: options.storagePath });
        this.access = new AccessController_1.AccessController({
            jwtSecret: options.jwtSecret,
            defaultExpirySeconds: 3600,
        });
        this.rateLimit = createRateLimiter(options.rateLimitMax ?? 30, options.rateLimitWindowMs ?? 60000);
    }
    /** Register or override resource config (for dynamic pricing). */
    registerResource(config) {
        resourceConfigs.set(config.resourceId, config);
    }
    /** Get resource config; returns default pricing if not registered. */
    getResourceConfig(resourceId) {
        const existing = resourceConfigs.get(resourceId);
        if (existing)
            return existing;
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
    async verifyAndUnlock(txHash, resourceId, rateLimitKey) {
        const key = rateLimitKey ?? 'global';
        if (!this.rateLimit(key)) {
            return { success: false, error: 'Too many verification attempts' };
        }
        const config = this.getResourceConfig(resourceId);
        if (!config.isActive) {
            return { success: false, error: 'Resource is not active' };
        }
        const amountWei = (0, ethers_1.parseEther)(config.price).toString();
        const verifier = new PaymentVerifier_1.PaymentVerifier({
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
        const token = this.access.generateAccessToken(result.sender ?? '', resourceId, duration);
        return {
            success: true,
            token,
            expiresIn: duration,
        };
    }
    getAccessController() {
        return this.access;
    }
    getUsageLogger() {
        return this.logger;
    }
}
exports.UnlockService = UnlockService;
//# sourceMappingURL=unlockService.js.map