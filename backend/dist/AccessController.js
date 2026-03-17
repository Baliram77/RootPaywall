"use strict";
/**
 * @x402/unlocker - JWT access token management
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccessController = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
/** In-memory revocation set: token jti or "address:resourceId" */
const revokedSet = new Set();
class AccessController {
    constructor(options) {
        this.secret = options.jwtSecret;
        this.defaultExpirySeconds = options.defaultExpirySeconds ?? 3600; // 1 hour
    }
    /**
     * Generate a JWT access token for a user and resource.
     */
    generateAccessToken(userAddress, resourceId, expirySeconds) {
        const now = Math.floor(Date.now() / 1000);
        const expiry = now + (expirySeconds ?? this.defaultExpirySeconds);
        const payload = {
            userAddress: userAddress.toLowerCase(),
            resourceId,
            expiry,
            iat: now,
        };
        return jsonwebtoken_1.default.sign(payload, this.secret, { expiresIn: expiry - now });
    }
    /**
     * Validate an access token and return payload if valid.
     */
    validateAccessToken(token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, this.secret);
            const key = `${decoded.userAddress}:${decoded.resourceId}`;
            if (revokedSet.has(key))
                return null;
            if (decoded.expiry && decoded.expiry < Math.floor(Date.now() / 1000)) {
                return null;
            }
            return decoded;
        }
        catch {
            return null;
        }
    }
    /**
     * Mark a token as expired (best-effort: revoke by user+resource).
     */
    expireAccessToken(token) {
        try {
            const decoded = jsonwebtoken_1.default.decode(token);
            if (decoded?.userAddress && decoded?.resourceId) {
                revokedSet.add(`${decoded.userAddress}:${decoded.resourceId}`);
            }
        }
        catch {
            // ignore
        }
    }
    /**
     * Revoke all access for a user on a resource.
     */
    revokeAccess(userAddress, resourceId) {
        revokedSet.add(`${userAddress.toLowerCase()}:${resourceId}`);
    }
}
exports.AccessController = AccessController;
//# sourceMappingURL=AccessController.js.map