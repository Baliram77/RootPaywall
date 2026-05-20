/**
 * HttpOnly cookie + Authorization header token handling.
 * Browser clients should use the HttpOnly cookie (not readable by JS / XSS).
 * API clients may continue using Authorization: Bearer.
 */

import type { Request, Response } from 'express';

export const X402_ACCESS_COOKIE = 'x402_access_token';

function readCookie(req: Request, name: string): string | null {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (key !== name) continue;
    const value = trimmed.slice(eq + 1);
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }
  return null;
}

/** Read bearer token from Authorization header only. */
export function readBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  return token || null;
}

/** Prefer HttpOnly cookie; fall back to Authorization header for programmatic clients. */
export function readAccessToken(req: Request): string | null {
  const cookieToken = readCookie(req, X402_ACCESS_COOKIE);
  if (cookieToken) return cookieToken;
  return readBearerToken(req);
}

export interface AccessTokenCookieOptions {
  /** Cookie path (default `/`). */
  path?: string;
  /** Force Secure flag (default: HTTPS enforcement active). */
  secure?: boolean;
}

/** Set HttpOnly access token cookie on unlock success. */
export function setAccessTokenCookie(
  res: Response,
  token: string,
  expiresInSeconds: number,
  options: AccessTokenCookieOptions = {}
): void {
  const secure =
    options.secure ??
    (process.env.NODE_ENV === 'production' || process.env.X402_ENFORCE_HTTPS === 'true');
  const maxAgeMs = Math.max(1, expiresInSeconds) * 1000;
  const parts = [
    `${X402_ACCESS_COOKIE}=${encodeURIComponent(token)}`,
    'HttpOnly',
    `Max-Age=${Math.floor(maxAgeMs / 1000)}`,
    `Path=${options.path ?? '/'}`,
    'SameSite=Lax',
  ];
  if (secure) parts.push('Secure');
  res.append('Set-Cookie', parts.join('; '));
}

/** Clear access token cookie (logout / revoke flows). */
export function clearAccessTokenCookie(res: Response, path = '/'): void {
  res.append(
    'Set-Cookie',
    `${X402_ACCESS_COOKIE}=; HttpOnly; Max-Age=0; Path=${path}; SameSite=Lax`
  );
}
