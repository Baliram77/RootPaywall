"use strict";
/**
 * @x402/unlocker - Verify payment and issue access token (with rate limiting)
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnlockService = void 0;
const path = __importStar(require("path"));
const ethers_1 = require("ethers");
const ethers_2 = require("ethers");
const PaymentVerifier_1 = require("./PaymentVerifier");
const AccessController_1 = require("./AccessController");
const UsageLogger_1 = require("./UsageLogger");
const RevocationStore_1 = require("./RevocationStore");
/** Simple in-memory fixed-window rate limiter with TTL cleanup. */
function createRateLimiter(maxPerWindow, windowMs) {
    const buckets = new Map();
    let lastGc = 0;
    const gcEveryMs = Math.max(windowMs, 30000);
    return function isAllowed(key) {
        const now = Date.now();
        if (now - lastGc > gcEveryMs) {
            lastGc = now;
            for (const [k, v] of buckets.entries()) {
                if (now - v.lastSeen > windowMs * 2)
                    buckets.delete(k);
            }
        }
        const existing = buckets.get(key);
        if (!existing || now - existing.windowStart >= windowMs) {
            buckets.set(key, { windowStart: now, count: 1, lastSeen: now });
            return true;
        }
        existing.lastSeen = now;
        if (existing.count >= maxPerWindow)
            return false;
        existing.count += 1;
        return true;
    };
}
class UnlockService {
    constructor(options) {
        this.rpcUrl = options.rpcUrl;
        this.defaultRecipient = options.recipientAddress;
        this.chainId = options.chainId ?? 31;
        this.defaultConfirmations = options.minConfirmations;
        this.defaultAccessDuration = 3600;
        this.logger = new UsageLogger_1.UsageLogger({ storagePath: options.storagePath });
        // Persist token revocations to the same storage base as usage logs (if configured).
        const base = options.storagePath
            ? path.resolve(options.storagePath)
            : path.join(process.cwd(), '.x402');
        this.access = new AccessController_1.AccessController({
            jwtSecret: options.jwtSecret,
            defaultExpirySeconds: 3600,
            revocationStore: new RevocationStore_1.FileRevocationStore(path.join(base, 'revoked.json')),
        });
        this.rateLimit = createRateLimiter(options.rateLimitMax ?? 30, options.rateLimitWindowMs ?? 60000);
        this.resourceConfigs = new Map();
        this.merchantSigWallet = options.merchantSigPrivateKey
            ? new ethers_2.Wallet(options.merchantSigPrivateKey)
            : null;
        this.merchantSigTtlSeconds = options.merchantSigTtlSeconds ?? 300;
    }
    createPaymentRequiredSignature(params) {
        if (!this.merchantSigWallet)
            return null;
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
        const recovered = (0, ethers_2.verifyMessage)(message, sig).toLowerCase();
        if (recovered !== this.merchantSigWallet.address.toLowerCase())
            return null;
        return { sig, expiresAt, signer: this.merchantSigWallet.address };
    }
    /** Register or override resource config (for dynamic pricing). */
    registerResource(config) {
        this.resourceConfigs.set(config.resourceId, config);
    }
    /** Get resource config; returns default pricing if not registered. */
    getResourceConfig(resourceId) {
        const existing = this.resourceConfigs.get(resourceId);
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
        let amountWei;
        try {
            amountWei = (0, ethers_1.parseEther)(config.price).toString();
        }
        catch {
            return { success: false, error: 'Invalid price configuration' };
        }
        // Atomically claim txHash before verification to prevent races.
        const claimed = this.logger.claimTxHash(txHash);
        if (!claimed) {
            return { success: false, error: 'Transaction already used' };
        }
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
    getChainId() {
        return this.chainId;
    }
}
exports.UnlockService = UnlockService;
//# sourceMappingURL=unlockService.js.map