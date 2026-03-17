const getBaseUrl = () => process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

export interface PaymentRequired402 {
  error: string;
  price: string;
  address: string;
  resourceId?: string;
}

export interface UnlockResponse {
  token: string;
  expiresIn: number;
}

export async function fetchPublicArticle(): Promise<{ title: string; content: string; type: string }> {
  const res = await fetch(`${getBaseUrl()}/public/article`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchPremiumArticle(token?: string | null): Promise<{
  status: number;
  ok: boolean;
  data?: { title: string; content: string; publishedAt?: string };
  paymentRequired?: PaymentRequired402;
}> {
  const headers: HeadersInit = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${getBaseUrl()}/premium/article`, { headers });
  const data = await res.json().catch(() => ({}));
  if (res.status === 402) {
    return { status: 402, ok: false, paymentRequired: data as PaymentRequired402 };
  }
  if (!res.ok) {
    return { status: res.status, ok: false };
  }
  return { status: res.status, ok: true, data };
}

export async function unlockWithTxHash(txHash: string, resourceId: string): Promise<UnlockResponse> {
  const res = await fetch(`${getBaseUrl()}/unlock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ txHash, resourceId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `Unlock failed: ${res.status}`);
  return data as UnlockResponse;
}
