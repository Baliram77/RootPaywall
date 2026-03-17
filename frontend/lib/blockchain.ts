import { BrowserProvider, JsonRpcSigner, getAddress } from 'ethers';

export const ROOTSTOCK_TESTNET_CHAIN_ID = 31;
export const ROOTSTOCK_TESTNET_RPC = 'https://public-node.testnet.rsk.co';
export const ROOTSTOCK_TESTNET_PARAMS = {
  chainId: `0x${ROOTSTOCK_TESTNET_CHAIN_ID.toString(16)}`,
  chainName: 'Rootstock Testnet',
  nativeCurrency: { name: 'tRBTC', symbol: 'tRBTC', decimals: 18 },
  rpcUrls: [ROOTSTOCK_TESTNET_RPC],
  blockExplorerUrls: ['https://explorer.testnet.rootstock.io/'],
};

export async function getProvider(): Promise<BrowserProvider> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask not found. Please install MetaMask.');
  }
  return new BrowserProvider(window.ethereum);
}

export async function getSigner(): Promise<JsonRpcSigner> {
  const provider = await getProvider();
  return provider.getSigner();
}

export async function getWalletAddress(): Promise<string> {
  const signer = await getSigner();
  return signer.getAddress();
}

export async function getNetworkChainId(): Promise<number> {
  const provider = await getProvider();
  const network = await provider.getNetwork();
  return Number(network.chainId);
}

export async function ensureRootstockTestnet(): Promise<boolean> {
  const chainId = await getNetworkChainId();
  if (chainId === ROOTSTOCK_TESTNET_CHAIN_ID) return true;
  try {
    await window.ethereum!.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: ROOTSTOCK_TESTNET_PARAMS.chainId }],
    });
    return true;
  } catch (err: unknown) {
    const e = err as { code?: number };
    if (e?.code === 4902) {
      await window.ethereum!.request({
        method: 'wallet_addEthereumChain',
        params: [ROOTSTOCK_TESTNET_PARAMS],
      });
      return true;
    }
    throw err;
  }
}

export async function sendPayment(to: string, valueWei: bigint): Promise<string> {
  const signer = await getSigner();
  // Use raw checksummed address so ethers doesn't try ENS (Rootstock doesn't support ENS)
  const toAddress = getAddress(to);
  const tx = await signer.sendTransaction({ to: toAddress, value: valueWei, gasLimit: 21000 });
  const receipt = await tx.wait();
  return receipt!.hash;
}

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on?: (event: string, callback: () => void) => void;
      removeListener?: (event: string, callback: () => void) => void;
    };
  }
}
