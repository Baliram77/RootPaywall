/**
 * @x402/unlocker - Usage and double-spend tracking (JSON file storage)
 */
import type { UsageLogEntry } from './types';
export interface UsageLoggerOptions {
    storagePath?: string;
}
export declare class UsageLogger {
    private usagePath;
    private usedTxPath;
    constructor(options?: UsageLoggerOptions);
    /** Log a usage event (payment + resource access). */
    log(entry: UsageLogEntry): void;
    /** Record a tx hash as used to prevent double spending. */
    markTxUsed(txHash: string): void;
    /** Check if a tx hash was already used. */
    isTxUsed(txHash: string): boolean;
    /** Async version for PaymentVerifier. */
    isTxUsedAsync(txHash: string): Promise<boolean>;
    /** Get all usage logs (for admin/debug). */
    getLogs(): UsageLogEntry[];
}
//# sourceMappingURL=UsageLogger.d.ts.map