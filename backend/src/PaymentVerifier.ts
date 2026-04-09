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

const RPC_TIMEOUT_MS = 30_000;
const UNKNOWN_BLOCK_RETRIES = 4;
const UNKNOWN_BLOCK_DELAY_MS = 3_000;

async function rpcCallOnce(rpcUrl: string, method: string, params: unknown[]): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RPC_TIMEOUT_MS);
  try {
    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method,
        params,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`RPC HTTP ${res.status}: ${text}`);
    }
    const data = JSON.parse(text) as { result?: unknown; error?: { code?: number; message?: string } };
    if (data.error) {
      const msg = data.error.message || `RPC error ${data.error.code}`;
      throw new Error(msg);
    }
    return data.result;
  } catch (e) {
    clearTimeout(timeout);
    throw e;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function rpcCall(rpcUrl: string, method: string, params: unknown[]): Promise<unknown> {
  let lastErr: Error | null = null;
  for (let attempt = 0; attempt <= UNKNOWN_BLOCK_RETRIES; attempt++) {
    try {
      return await rpcCallOnce(rpcUrl, method, params);
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
      const isUnknownBlock =
        lastErr.message.includes('Unknown block') || lastErr.message.includes('unknown block');
      if (isUnknownBlock && attempt < UNKNOWN_BLOCK_RETRIES) {
        await sleep(UNKNOWN_BLOCK_DELAY_MS);
        continue;
      }
      throw lastErr;
    }
  }
  throw lastErr || new Error('RPC failed');
}

function hexToBigInt(hex: string | undefined): bigint {
  if (hex == null || hex === '') return BigInt(0);
  const s = hex.startsWith('0x') ? hex.slice(2) : hex;
  return BigInt('0x' + s || '0');
}

function isValidTxHash(txHash: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(txHash);
}

export class PaymentVerifier {
  private rpcUrl: string;
  private recipientAddress: string;
  private requiredAmountWei: bigint;
  private minConfirmations: number;
  private isTxHashUsed: (txHash: string) => Promise<boolean>;

  constructor(options: PaymentVerifierOptions) {
    this.rpcUrl = options.rpcUrl.replace(/\/$/, '');
    this.recipientAddress = options.recipientAddress.toLowerCase();
    this.requiredAmountWei = BigInt(options.requiredAmountWei);
    this.minConfirmations = options.minConfirmations;
    this.isTxHashUsed = options.isTxHashUsed;
  }

  async verifyPayment(txHash: string): Promise<PaymentVerificationResult> {
    try {
      if (!isValidTxHash(txHash)) {
        return { valid: false, errorCode: 'INVALID_TX_HASH', error: 'Invalid txHash format' };
      }
      const used = await this.isTxHashUsed(txHash);
      if (used) {
        return { valid: false, errorCode: 'TX_ALREADY_USED', error: 'Transaction already used' };
      }

      const txRaw = await rpcCall(this.rpcUrl, 'eth_getTransactionByHash', [txHash]);
      if (txRaw == null || (typeof txRaw === 'object' && (txRaw as Record<string, unknown>).blockHash == null)) {
        return { valid: false, errorCode: 'TX_NOT_FOUND', error: 'Transaction not found' };
      }
      const tx = txRaw as { to?: string; from?: string; value?: string; blockNumber?: string };
      const to = tx.to;
      if (!to) {
        return { valid: false, errorCode: 'INVALID_TX_NO_RECIPIENT', error: 'Invalid transaction (no recipient)' };
      }
      const recipient = to.toLowerCase();
      if (recipient !== this.recipientAddress) {
        return {
          valid: false,
          errorCode: 'RECIPIENT_MISMATCH',
          error: `Recipient mismatch: expected ${this.recipientAddress}, got ${recipient}`,
        };
      }
      const value = hexToBigInt(tx.value);
      if (value < this.requiredAmountWei) {
        return {
          valid: false,
          errorCode: 'INSUFFICIENT_AMOUNT',
          error: `Insufficient amount: required ${this.requiredAmountWei.toString()}, got ${value.toString()}`,
        };
      }

      const receiptRaw = await rpcCall(this.rpcUrl, 'eth_getTransactionReceipt', [txHash]);
      if (receiptRaw == null || typeof receiptRaw !== 'object') {
        return { valid: false, errorCode: 'RECEIPT_NOT_FOUND', error: 'Transaction receipt not found' };
      }
      const receipt = receiptRaw as { blockNumber?: string };
      if (!receipt.blockNumber) {
        return { valid: false, errorCode: 'TX_NOT_MINED', error: 'Transaction not yet mined' };
      }

      const receiptBlock = Number(hexToBigInt(receipt.blockNumber));
      if (!Number.isFinite(receiptBlock) || receiptBlock <= 0) {
        return { valid: false, errorCode: 'INVALID_RECEIPT_BLOCKNUMBER', error: 'Invalid receipt: missing blockNumber' };
      }

      const headRaw = await rpcCall(this.rpcUrl, 'eth_blockNumber', []);
      const headHex = typeof headRaw === 'string' ? headRaw : '';
      const headBlock = Number(hexToBigInt(headHex));
      if (!Number.isFinite(headBlock) || headBlock <= 0) {
        return { valid: false, errorCode: 'RPC_HEAD_BLOCK_FAILED', error: 'RPC error: could not read current block number' };
      }

      const confirmations = Math.max(0, headBlock - receiptBlock + 1);
      if (confirmations < this.minConfirmations) {
        return {
          valid: false,
          confirmations,
          errorCode: 'INSUFFICIENT_CONFIRMATIONS',
          error: `Insufficient confirmations: required ${this.minConfirmations}, got ${confirmations}`,
        };
      }

      const from = (tx.from || '').toLowerCase();
      return {
        valid: true,
        amount: value.toString(),
        sender: from,
        recipient,
        confirmations,
        txHash,
      };
    } catch (err: unknown) {
      let message = 'Unknown error';
      const agg = err as { errors?: unknown[]; message?: string } | null;
      if (agg && Array.isArray(agg.errors) && agg.errors.length > 0) {
        const first = agg.errors[0];
        message = first instanceof Error ? (first.message || first.name) : String(first);
      } else if (err instanceof Error) {
        message = err.message || err.name || 'Unknown error';
      } else {
        message = String(err) || 'Unknown error';
      }
      if (message.toLowerCase().includes('unknown block')) {
        message =
          'Transaction not yet indexed by the RPC. Wait 15–30 seconds after confirming in MetaMask, then click Try again.';
      } else {
        message = `Verification failed: ${message}`;
      }
      return { valid: false, errorCode: 'VERIFICATION_FAILED', error: message };
    }
  }
}
