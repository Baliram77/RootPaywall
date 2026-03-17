"use strict";
/**
 * @x402/unlocker - Express middleware for paywalled routes
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.setUnlockService = setUnlockService;
exports.getUnlockService = getUnlockService;
exports.x402Middleware = x402Middleware;
exports.createUnlockRoute = createUnlockRoute;
/** Module-level unlock service set by initializeX402 */
let unlockServiceInstance = null;
function setUnlockService(service) {
    unlockServiceInstance = service;
}
function getUnlockService() {
    return unlockServiceInstance;
}
const PAYMENT_REQUIRED_STATUS = 402;
/**
 * Express middleware: protects routes behind x402 payment.
 * - If valid JWT access token present → next()
 * - Otherwise → 402 Payment Required with price and merchant address
 */
function x402Middleware(options) {
    const resourceId = options.resourceId;
    const price = typeof options.price === 'number' ? String(options.price) : options.price;
    const recipientAddress = options.recipientAddress;
    const accessDurationSeconds = options.accessDurationSeconds;
    return function middleware(req, res, next) {
        const service = getUnlockService();
        if (!service) {
            res.status(500).json({ error: 'x402 not initialized. Call initializeX402() first.' });
            return;
        }
        const config = service.getResourceConfig(resourceId);
        service.registerResource({
            resourceId,
            price,
            currency: 'tRBTC',
            recipientAddress: recipientAddress ?? config.recipientAddress,
            accessDurationSeconds: accessDurationSeconds ?? config.accessDurationSeconds,
            isActive: true,
        });
        const merged = service.getResourceConfig(resourceId);
        const address = merged.recipientAddress;
        const displayPrice = merged.price;
        if (!merged.isActive) {
            res.status(503).json({ error: 'Resource is not available' });
            return;
        }
        const authHeader = req.headers.authorization;
        const token = authHeader?.startsWith('Bearer ')
            ? authHeader.slice(7)
            : req.query?.token ?? req.body?.token;
        if (!token) {
            const body = {
                error: 'Payment Required',
                price: displayPrice,
                address,
                resourceId,
            };
            res.status(PAYMENT_REQUIRED_STATUS).json(body);
            return;
        }
        const access = service.getAccessController();
        const payload = access.validateAccessToken(token);
        if (!payload) {
            const body = {
                error: 'Payment Required',
                price: displayPrice,
                address,
                resourceId,
            };
            res.status(PAYMENT_REQUIRED_STATUS).json(body);
            return;
        }
        if (payload.resourceId !== resourceId) {
            const body = {
                error: 'Payment Required',
                price: displayPrice,
                address,
                resourceId,
            };
            res.status(PAYMENT_REQUIRED_STATUS).json(body);
            return;
        }
        req.x402 = {
            userAddress: payload.userAddress,
            resourceId: payload.resourceId,
        };
        next();
    };
}
/**
 * Returns an Express handler for the unlock endpoint: POST body { txHash, resourceId }.
 * Verifies payment and returns { token, expiresIn } or { error }.
 */
function createUnlockRoute(rateLimitKey) {
    return function unlockHandler(req, res, next) {
        const run = async () => {
            const service = getUnlockService();
            if (!service) {
                res.status(500).json({ error: 'x402 not initialized' });
                return;
            }
            const txHash = req.body?.txHash ?? req.query?.txHash;
            const resourceId = req.body?.resourceId ?? req.query?.resourceId;
            if (!txHash || !resourceId) {
                res.status(400).json({ error: 'Missing txHash or resourceId' });
                return;
            }
            const key = rateLimitKey ? rateLimitKey(req) : req.ip ?? req.socket?.remoteAddress ?? 'unknown';
            const result = await service.verifyAndUnlock(txHash, resourceId, key);
            if (result.success) {
                res.json({ token: result.token, expiresIn: result.expiresIn });
            }
            else {
                res.status(400).json({ error: result.error });
            }
        };
        run().catch(next);
    };
}
//# sourceMappingURL=x402Middleware.js.map