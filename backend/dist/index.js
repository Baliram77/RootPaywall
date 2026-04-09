"use strict";
/**
 * @x402/unlocker - Rootstock micropayment paywall SDK
 *
 * Usage:
 *   import { initializeX402, x402Middleware, createUnlockRoute } from '@x402/unlocker';
 *   const service = initializeX402({ rpcUrl, recipientAddress, requiredAmount, minConfirmations, jwtSecret });
 *   app.use('/premium', x402Middleware({ resourceId: 'premium-api', price: '0.0001' }));
 *   app.post('/unlock', createUnlockRoute());
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_ROOTSTOCK_TESTNET_RPC = exports.ROOTSTOCK_TESTNET_CHAIN_ID = exports.ROOTSTOCK_MAINNET_CHAIN_ID = exports.UnlockService = exports.UsageLogger = exports.AccessController = exports.PaymentVerifier = exports.getUnlockService = exports.setUnlockService = exports.createUnlockRoute = exports.x402Middleware = void 0;
exports.initializeX402 = initializeX402;
const unlockService_1 = require("./unlockService");
const x402Middleware_1 = require("./x402Middleware");
const types_1 = require("./types");
var x402Middleware_2 = require("./x402Middleware");
Object.defineProperty(exports, "x402Middleware", { enumerable: true, get: function () { return x402Middleware_2.x402Middleware; } });
Object.defineProperty(exports, "createUnlockRoute", { enumerable: true, get: function () { return x402Middleware_2.createUnlockRoute; } });
Object.defineProperty(exports, "setUnlockService", { enumerable: true, get: function () { return x402Middleware_2.setUnlockService; } });
Object.defineProperty(exports, "getUnlockService", { enumerable: true, get: function () { return x402Middleware_2.getUnlockService; } });
var PaymentVerifier_1 = require("./PaymentVerifier");
Object.defineProperty(exports, "PaymentVerifier", { enumerable: true, get: function () { return PaymentVerifier_1.PaymentVerifier; } });
var AccessController_1 = require("./AccessController");
Object.defineProperty(exports, "AccessController", { enumerable: true, get: function () { return AccessController_1.AccessController; } });
var UsageLogger_1 = require("./UsageLogger");
Object.defineProperty(exports, "UsageLogger", { enumerable: true, get: function () { return UsageLogger_1.UsageLogger; } });
var unlockService_2 = require("./unlockService");
Object.defineProperty(exports, "UnlockService", { enumerable: true, get: function () { return unlockService_2.UnlockService; } });
var types_2 = require("./types");
Object.defineProperty(exports, "ROOTSTOCK_MAINNET_CHAIN_ID", { enumerable: true, get: function () { return types_2.ROOTSTOCK_MAINNET_CHAIN_ID; } });
Object.defineProperty(exports, "ROOTSTOCK_TESTNET_CHAIN_ID", { enumerable: true, get: function () { return types_2.ROOTSTOCK_TESTNET_CHAIN_ID; } });
Object.defineProperty(exports, "DEFAULT_ROOTSTOCK_TESTNET_RPC", { enumerable: true, get: function () { return types_2.DEFAULT_ROOTSTOCK_TESTNET_RPC; } });
/**
 * Initialize the x402 SDK. Call this once before using x402Middleware or createUnlockRoute.
 * Uses Rootstock testnet RPC by default.
 */
function initializeX402(options) {
    const service = new unlockService_1.UnlockService({
        rpcUrl: options.rpcUrl ?? types_1.DEFAULT_ROOTSTOCK_TESTNET_RPC,
        recipientAddress: options.recipientAddress,
        requiredAmount: options.requiredAmount,
        minConfirmations: options.minConfirmations ?? 6,
        jwtSecret: options.jwtSecret,
        chainId: options.chainId ?? 31,
        storagePath: options.storagePath,
        rateLimitMax: options.rateLimitMax,
        rateLimitWindowMs: options.rateLimitWindowMs,
        merchantSigPrivateKey: options.merchantSigPrivateKey,
        merchantSigTtlSeconds: options.merchantSigTtlSeconds,
    });
    (0, x402Middleware_1.setUnlockService)(service);
    return service;
}
//# sourceMappingURL=index.js.map