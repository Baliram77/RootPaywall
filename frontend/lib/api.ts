/** Same-origin API proxy path (see next.config.js rewrites). HttpOnly cookie auth — no JS token storage. */
const getBaseUrl = () =>
  typeof window !== 'undefined' ? '/api' : process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

const withCredentials: RequestInit = { credentials: 'include' };

export interface PaymentRequired402 {
  error: string;
  price: string;
  address: string;
  resourceId?: string;
  chainId?: number;
  addressSig?: string;
  addressSigExpiresAt?: number;
  addressSigSigner?: string;
}

export interface UnlockResponse {
  success: boolean;
  expiresIn: number;
}

export async function fetchPublicArticle(): Promise<{ title: string; content: string; type: string }> {
  const res = await fetch(`${getBaseUrl()}/public/article`, withCredentials);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchPremiumArticle(): Promise<{
  status: number;
  ok: boolean;
  data?: { title: string; content: string; publishedAt?: string };
  paymentRequired?: PaymentRequired402;
}> {
  const res = await fetch(`${getBaseUrl()}/premium/article`, withCredentials);
  let data: Record<string, unknown> = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  if (res.status === 402) {
    return { status: 402, ok: false, paymentRequired: data as unknown as PaymentRequired402 };
  }
  if (!res.ok) {
    return { status: res.status, ok: false };
  }
  return {
    status: res.status,
    ok: true,
    data: data as unknown as { title: string; content: string; publishedAt?: string },
  };
}

export async function unlockWithTxHash(txHash: string, resourceId: string): Promise<UnlockResponse> {
  const res = await fetch(`${getBaseUrl()}/unlock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ txHash, resourceId }),
    credentials: 'include',
  });
  let data: UnlockResponse | { error?: string } | null = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) throw new Error((data as { error?: string })?.error || `Unlock failed: ${res.status}`);
  return data as UnlockResponse;
}
