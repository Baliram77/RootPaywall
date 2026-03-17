/**
 * @x402/unlocker - Express middleware for paywalled routes
 */
import type { Request, Response, NextFunction } from 'express';
import type { X402MiddlewareOptions } from './types';
export declare function setUnlockService(service: import('./unlockService').UnlockService): void;
export declare function getUnlockService(): import('./unlockService').UnlockService | null;
/**
 * Express middleware: protects routes behind x402 payment.
 * - If valid JWT access token present → next()
 * - Otherwise → 402 Payment Required with price and merchant address
 */
export declare function x402Middleware(options: X402MiddlewareOptions): (req: Request, res: Response, next: NextFunction) => void;
/**
 * Returns an Express handler for the unlock endpoint: POST body { txHash, resourceId }.
 * Verifies payment and returns { token, expiresIn } or { error }.
 */
export declare function createUnlockRoute(rateLimitKey?: (req: Request) => string): (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=x402Middleware.d.ts.map