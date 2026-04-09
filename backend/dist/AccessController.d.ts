/**
 * @x402/unlocker - JWT access token management
 */
import type { AccessTokenPayload } from './types';
import type { RevocationStore } from './RevocationStore';
export interface AccessControllerOptions {
    jwtSecret: string;
    defaultExpirySeconds?: number;
    revocationStore?: RevocationStore;
}
export declare class AccessController {
    private secret;
    private defaultExpirySeconds;
    private revocations;
    constructor(options: AccessControllerOptions);
    /**
     * Generate a JWT access token for a user and resource.
     */
    generateAccessToken(userAddress: string, resourceId: string, expirySeconds?: number): string;
    /**
     * Validate an access token and return payload if valid.
     */
    validateAccessToken(token: string): AccessTokenPayload | null;
    /**
     * Mark a token as expired (best-effort: revoke by user+resource).
     */
    expireAccessToken(token: string): void;
    /**
     * Revoke all access for a user on a resource.
     */
    revokeAccess(userAddress: string, resourceId: string): void;
}
//# sourceMappingURL=AccessController.d.ts.map