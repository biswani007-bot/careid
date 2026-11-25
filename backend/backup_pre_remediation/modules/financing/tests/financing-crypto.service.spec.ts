import { FinancingCryptoService } from '../infrastructure/security/financing-crypto.service';
import * as crypto from 'crypto';

describe('FinancingCryptoService (AES-256-GCM Field Encryption)', () => {
  const originalEnv = process.env.FINANCING_ENCRYPTION_KEY;
  const testKey = crypto.randomBytes(32).toString('hex');

  beforeAll(() => {
    process.env.FINANCING_ENCRYPTION_KEY = testKey;
  });

  afterAll(() => {
    process.env.FINANCING_ENCRYPTION_KEY = originalEnv;
  });

  it('should encrypt and decrypt a sensitive National ID correctly', () => {
    const service = new FinancingCryptoService();
    const sensitiveId = 'ABCDE1234F';
    const aad = 'fin-app-1001:panOrNationalId';

    const encrypted = service.encrypt(sensitiveId, aad);
    expect(encrypted).toBeDefined();
    expect(encrypted.startsWith('v1:')).toBe(true);
    expect(encrypted).not.toContain(sensitiveId);

    const decrypted = service.decrypt(encrypted, aad);
    expect(decrypted).toBe(sensitiveId);
  });

  it('should encrypt and decrypt numeric monthly income as string correctly', () => {
    const service = new FinancingCryptoService();
    const income = '85000.00';
    const aad = 'fin-app-1002:monthlyIncome';

    const encrypted = service.encrypt(income, aad);
    expect(encrypted.startsWith('v1:')).toBe(true);
    expect(encrypted).not.toContain(income);

    const decrypted = service.decrypt(encrypted, aad);
    expect(decrypted).toBe(income);
  });

  it('should generate a fresh, unique IV for every encryption call', () => {
    const service = new FinancingCryptoService();
    const value = 'SAME_DATA_TWICE';
    const aad = 'fin-app-1003';

    const enc1 = service.encrypt(value, aad);
    const enc2 = service.encrypt(value, aad);

    expect(enc1).not.toBe(enc2);
    const iv1 = enc1.split(':')[1];
    const iv2 = enc2.split(':')[1];
    expect(iv1).not.toBe(iv2);

    expect(service.decrypt(enc1, aad)).toBe(value);
    expect(service.decrypt(enc2, aad)).toBe(value);
  });

  it('should fail decryption when ciphertext is tampered with', () => {
    const service = new FinancingCryptoService();
    const value = 'CRITICAL_DATA';
    const aad = 'fin-app-1004';
    const encrypted = service.encrypt(value, aad);

    const parts = encrypted.split(':');
    // Tamper with last character of ciphertext
    const tamperedData = parts[3].slice(0, -1) + (parts[3].slice(-1) === 'a' ? 'b' : 'a');
    const tampered = `${parts[0]}:${parts[1]}:${parts[2]}:${tamperedData}`;

    expect(() => service.decrypt(tampered, aad)).toThrow(/Decryption failed|integrity verification/);
  });

  it('should fail decryption when authentication tag is tampered with', () => {
    const service = new FinancingCryptoService();
    const value = 'CRITICAL_DATA';
    const aad = 'fin-app-1005';
    const encrypted = service.encrypt(value, aad);

    const parts = encrypted.split(':');
    // Tamper with tag
    const tamperedTag = parts[2].slice(0, -2) + '00';
    const tampered = `${parts[0]}:${parts[1]}:${tamperedTag}:${parts[3]}`;

    expect(() => service.decrypt(tampered, aad)).toThrow(/Decryption failed|integrity verification/);
  });

  it('should fail decryption when AAD context does not match', () => {
    const service = new FinancingCryptoService();
    const value = 'SENSITIVE_PII';
    const encrypted = service.encrypt(value, 'app-1:pan');

    // Mismatched AAD
    expect(() => service.decrypt(encrypted, 'app-2:pan')).toThrow(/Decryption failed|integrity verification/);
    expect(() => service.decrypt(encrypted, undefined)).toThrow(/Decryption failed|integrity verification/);
  });

  it('should fail safely when encryption key is missing or invalid', () => {
    process.env.FINANCING_ENCRYPTION_KEY = '';
    const unconfiguredService = new FinancingCryptoService();
    expect(() => unconfiguredService.encrypt('test')).toThrow(/missing or not configured/);

    process.env.FINANCING_ENCRYPTION_KEY = 'invalid-short-key';
    expect(() => new FinancingCryptoService()).toThrow(/must be a 64-character hexadecimal/);

    // Restore test key
    process.env.FINANCING_ENCRYPTION_KEY = testKey;
  });
});

