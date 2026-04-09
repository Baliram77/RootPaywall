import { Request, Response } from 'express';
import type { IRouter } from 'express';
import { initializeX402, x402Middleware, getUnlockService } from '@x402/unlocker';
import { config } from './config';

const PREMIUM_ARTICLE = {
  title: 'Advanced DeFi Trading Strategies',
  content: `
This premium article covers advanced strategies for DeFi trading on Rootstock:

1. **Liquidity provision and yield optimization** – How to maximize returns while managing impermanent loss.
2. **Cross-chain arbitrage** – Using tRBTC and RSK bridges for arbitrage opportunities.
3. **Options and structured products** – Synthetic options and vault strategies.
4. **Risk management** – Position sizing, stop-loss strategies, and portfolio allocation.
5. **MEV and execution** – Minimizing front-running and optimizing trade execution.

— Premium content delivered via x402 paywall.
`.trim(),
  publishedAt: new Date().toISOString(),
};

function logPayment(txHash: string, userAddress: string, resourceId: string, amount: string): void {
  if (process.env.DEBUG) {
    console.log(`[PAYMENT] txHash=${txHash} user=${userAddress} resourceId=${resourceId} amount=${amount}`);
  }
}

function logUnlock(userAddress: string, resourceId: string): void {
  if (process.env.DEBUG) {
    console.log(`[UNLOCK] user=${userAddress} resourceId=${resourceId}`);
  }
}

export function registerRoutes(app: IRouter): void {
  initializeX402({
    rpcUrl: config.rootstockRpcUrl,
    recipientAddress: config.merchantAddress,
    requiredAmount: config.premiumPrice,
    minConfirmations: config.minConfirmations,
    jwtSecret: config.jwtSecret,
    storagePath: '.x402-demo',
    merchantSigPrivateKey: config.merchantSigPrivateKey || undefined,
  });

  app.get('/public/article', (_req: Request, res: Response) => {
    res.json({
      title: 'Free Article',
      content: 'This is free content. No payment required.',
      type: 'public',
    });
  });

  app.use(
    '/premium',
    x402Middleware({
      resourceId: config.resourceId,
      price: config.premiumPrice,
      recipientAddress: config.merchantAddress || undefined,
    })
  );

  app.get('/premium/article', (req: Request, res: Response) => {
    const x402 = (req as Request & { x402?: { userAddress: string; resourceId: string } }).x402;
    if (x402) {
      logUnlock(x402.userAddress, x402.resourceId);
    }
    res.json(PREMIUM_ARTICLE);
  });

  app.post('/unlock', async (req: Request, res: Response, next: (err?: unknown) => void) => {
    try {
      const service = getUnlockService();
      if (!service) {
        res.status(500).json({ error: 'x402 not initialized' });
        return;
      }
      const txHash = req.body?.txHash ?? req.query?.txHash;
      const resourceId = req.body?.resourceId ?? req.query?.resourceId;
      if (!txHash || !resourceId) {
        res.status(400).json({ error: 'Missing txHash or resourceId' });
        return;
      }
      const key = req.ip || (req.socket?.remoteAddress as string) || 'unknown';
      const result = await service.verifyAndUnlock(txHash, resourceId, key);
      if (result.success) {
        const logs = service.getUsageLogger().getLogs();
        const last = logs[logs.length - 1];
        if (last) {
          logPayment(last.txHash, last.userAddress, last.resourceId, last.paymentAmount);
        }
        res.json({ token: result.token, expiresIn: result.expiresIn });
      } else {
        if (process.env.DEBUG) {
          console.error('[unlock] Verification failed:', result.error);
        }
        res.status(400).json({ error: result.error });
      }
    } catch (err) {
      next(err);
    }
  });
}
