/**
 * @x402/unlocker - JWT access token management
 */

import jwt from 'jsonwebtoken';
import type { AccessTokenPayload } from './types';
import type { RevocationStore } from './RevocationStore';
import { MemoryRevocationStore } from './RevocationStore';

export interface AccessControllerOptions {
  jwtSecret: string;
  defaultExpirySeconds?: number;
  revocationStore?: RevocationStore;
}

export class AccessController {
  private secret: string;
  private defaultExpirySeconds: number;
  private revocations: RevocationStore;

  constructor(options: AccessControllerOptions) {
    this.secret = options.jwtSecret;
    this.defaultExpirySeconds = options.defaultExpirySeconds ?? 3600; // 1 hour
    this.revocations = options.revocationStore ?? new MemoryRevocationStore();
  }

  /**
   * Generate a JWT access token for a user and resource.
   */
  generateAccessToken(
    userAddress: string,
    resourceId: string,
    expirySeconds?: number
  ): string {
    const now = Math.floor(Date.now() / 1000);
    const expiry = now + (expirySeconds ?? this.defaultExpirySeconds);
    const payload: AccessTokenPayload = {
      userAddress: userAddress.toLowerCase(),
      resourceId,
      expiry,
      iat: now,
    };
    return jwt.sign(payload, this.secret, { expiresIn: expiry - now });
  }

  /**
   * Validate an access token and return payload if valid.
   */
  validateAccessToken(token: string): AccessTokenPayload | null {
    try {
      const decoded = jwt.verify(token, this.secret) as AccessTokenPayload;
      const key = `${decoded.userAddress}:${decoded.resourceId}`;
      if (this.revocations.isRevoked(key)) return null;
      if (decoded.expiry && decoded.expiry < Math.floor(Date.now() / 1000)) {
        return null;
      }
      return decoded;
    } catch {
      return null;
    }
  }

  /**
   * Mark a token as expired (best-effort: revoke by user+resource).
   */
  expireAccessToken(token: string): void {
    try {
      const decoded = jwt.decode(token) as AccessTokenPayload | null;
      if (decoded?.userAddress && decoded?.resourceId) {
        this.revocations.revoke(
          `${decoded.userAddress}:${decoded.resourceId}`,
          typeof decoded.expiry === 'number' ? decoded.expiry : undefined
        );
      }
    } catch {
      // ignore
    }
  }

  /**
   * Revoke all access for a user on a resource.
   */
  revokeAccess(userAddress: string, resourceId: string): void {
    this.revocations.revoke(`${userAddress.toLowerCase()}:${resourceId}`);
  }
}
