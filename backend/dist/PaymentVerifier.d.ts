/**
 * @x402/unlocker - Rootstock payment verification
 * Uses raw JSON-RPC (no ethers provider) to avoid RPC quirks like "Unknown block".
 */
import type { PaymentVerificationResult } from './types';
export interface PaymentVerifierOptions {
    rpcUrl: string;
    recipientAddress: string;
    requiredAmountWei: string;
    minConfirmations: number;
    isTxHashUsed: (txHash: string) => Promise<boolean>;
    chainId?: number;
}
export declare class PaymentVerifier {
    private rpcUrl;
    private recipientAddress;
    private requiredAmountWei;
    private minConfirmations;
    private isTxHashUsed;
    constructor(options: PaymentVerifierOptions);
    verifyPayment(txHash: string): Promise<PaymentVerificationResult>;
}
//# sourceMappingURL=PaymentVerifier.d.ts.map