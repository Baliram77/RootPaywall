import * as path from 'path';
import * as fs from 'fs';

function loadEnv(): void {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const eq = trimmed.indexOf('=');
        if (eq > 0) {
          const key = trimmed.slice(0, eq).trim();
          const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
          if (!process.env[key]) process.env[key] = value;
        }
      }
    }
  }
}

loadEnv();

const PLACEHOLDER_ADDRESS = '0xYourRootstockAddress';
const RAW_MERCHANT = (process.env.MERCHANT_ADDRESS ?? '').trim();
const merchantAddress =
  RAW_MERCHANT && RAW_MERCHANT.toLowerCase() !== PLACEHOLDER_ADDRESS.toLowerCase()
    ? RAW_MERCHANT
    : '';

export const config = {
  port: parseInt(process.env.PORT ?? '3000', 10),
  rootstockRpcUrl: process.env.ROOTSTOCK_RPC_URL ?? 'https://public-node.testnet.rsk.co',
  merchantAddress,
  jwtSecret: process.env.JWT_SECRET ?? 'demo-secret-change-in-production',
  premiumPrice: '0.0001',
  resourceId: 'premium-article',
} as const;

if (!config.merchantAddress) {
  console.warn(
    'MERCHANT_ADDRESS not set or still the placeholder. Set it in .env to your Rootstock address to receive payments. Using zero address for demo.'
  );
}
