/**
 * @x402/unlocker - Revocation storage (memory or file-backed)
 *
 * Note: This is a best-effort revocation layer. Tokens are still time-bounded via JWT expiry.
 */
export interface RevocationStore {
    /** Revoke a key until unix seconds `until` (or indefinitely if omitted). */
    revoke(key: string, until?: number): void;
    /** True if revoked (and not expired). */
    isRevoked(key: string, nowSeconds?: number): boolean;
    /** Optional cleanup hook. */
    cleanup(nowSeconds?: number): void;
}
export declare class MemoryRevocationStore implements RevocationStore {
    private revoked;
    revoke(key: string, until?: number): void;
    isRevoked(key: string, nowSeconds?: number): boolean;
    cleanup(nowSeconds?: number): void;
}
export declare class FileRevocationStore implements RevocationStore {
    private filePath;
    constructor(filePath: string);
    revoke(key: string, until?: number): void;
    isRevoked(key: string, nowSeconds?: number): boolean;
    cleanup(nowSeconds?: number): void;
}
//# sourceMappingURL=RevocationStore.d.ts.map