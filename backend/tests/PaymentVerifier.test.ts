import { PaymentVerifier } from '../src/PaymentVerifier';

describe('PaymentVerifier', () => {
  const mockIsTxHashUsed = jest.fn().mockResolvedValue(false);

  beforeEach(() => {
    mockIsTxHashUsed.mockClear();
    mockIsTxHashUsed.mockResolvedValue(false);
  });

  it('should reject when tx hash already used', async () => {
    mockIsTxHashUsed.mockResolvedValue(true);
    const verifier = new PaymentVerifier({
      rpcUrl: 'https://public-node.testnet.rsk.co',
      recipientAddress: '0x1234567890123456789012345678901234567890',
      requiredAmountWei: '100000000000000',
      minConfirmations: 1,
      isTxHashUsed: mockIsTxHashUsed,
    });
    const result = await verifier.verifyPayment('0xabc');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('already used');
  });

  it('should have verifyPayment method', () => {
    const verifier = new PaymentVerifier({
      rpcUrl: 'https://public-node.testnet.rsk.co',
      recipientAddress: '0x1234567890123456789012345678901234567890',
      requiredAmountWei: '100000000000000',
      minConfirmations: 1,
      isTxHashUsed: mockIsTxHashUsed,
    });
    expect(typeof verifier.verifyPayment).toBe('function');
  });
});
