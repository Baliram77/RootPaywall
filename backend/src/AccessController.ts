/**
 * @x402/unlocker - JWT access token management
 */

import jwt from 'jsonwebtoken';
import type { AccessTokenPayload } from './types';

export interface AccessControllerOptions {
  jwtSecret: string;
  defaultExpirySeconds?: number;
}

/** In-memory revocation set: token jti or "address:resourceId" */
const revokedSet = new Set<string>();

export class AccessController {
  private secret: string;
  private defaultExpirySeconds: number;

  constructor(options: AccessControllerOptions) {
    this.secret = options.jwtSecret;
    this.defaultExpirySeconds = options.defaultExpirySeconds ?? 3600; // 1 hour
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
      if (revokedSet.has(key)) return null;
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
        revokedSet.add(`${decoded.userAddress}:${decoded.resourceId}`);
      }
    } catch {
      // ignore
    }
  }

  /**
   * Revoke all access for a user on a resource.
   */
  revokeAccess(userAddress: string, resourceId: string): void {
    revokedSet.add(`${userAddress.toLowerCase()}:${resourceId}`);
  }
}
