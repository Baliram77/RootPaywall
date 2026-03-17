import { AccessController } from '../src/AccessController';

describe('AccessController', () => {
  const secret = 'test-secret-key';
  let controller: AccessController;

  beforeEach(() => {
    controller = new AccessController({ jwtSecret: secret });
  });

  it('should generate and validate token', () => {
    const token = controller.generateAccessToken(
      '0xuser123',
      'resource-1',
      3600
    );
    expect(token).toBeTruthy();
    const payload = controller.validateAccessToken(token);
    expect(payload).not.toBeNull();
    expect(payload!.userAddress).toBe('0xuser123');
    expect(payload!.resourceId).toBe('resource-1');
  });

  it('should reject invalid token', () => {
    const payload = controller.validateAccessToken('invalid.jwt.token');
    expect(payload).toBeNull();
  });

  it('should revoke access', () => {
    const token = controller.generateAccessToken('0xuser', 'res1');
    controller.revokeAccess('0xuser', 'res1');
    const payload = controller.validateAccessToken(token);
    expect(payload).toBeNull();
  });
});
