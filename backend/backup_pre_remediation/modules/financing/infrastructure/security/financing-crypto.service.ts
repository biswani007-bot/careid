import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

export const CURRENT_CIPHER_VERSION = 'v1';
export const ALGORITHM = 'aes-256-gcm';
export const IV_LENGTH_BYTES = 12; // Standard 96-bit IV for AES-GCM
export const AUTH_TAG_LENGTH_BYTES = 16; // 128-bit auth tag

@Injectable()
export class FinancingCryptoService {
  private readonly logger = new Logger(FinancingCryptoService.name);
  private keyBuffer: Buffer | null = null;

  constructor() {
    this.initializeKey();
  }

  private initializeKey(): void {
    const rawKey = process.env.FINANCING_ENCRYPTION_KEY?.trim();
    if (!rawKey) {
      this.logger.warn('FINANCING_ENCRYPTION_KEY is not configured. Encryption operations will fail.');
      return;
    }

    if (!/^[0-9a-fA-F]{64}$/.test(rawKey)) {
      throw new Error('FINANCING_ENCRYPTION_KEY must be a 64-character hexadecimal string (32 bytes).');
    }

    this.keyBuffer = Buffer.from(rawKey, 'hex');
  }

  private getKey(): Buffer {
    if (!this.keyBuffer) {
      // Re-attempt initialization in case env was loaded after instantiation
      this.initializeKey();
    }
    if (!this.keyBuffer) {
      throw new Error('Financing encryption key is missing or not configured.');
    }
    return this.keyBuffer;
  }

  /**
   * Encrypts plaintext using AES-256-GCM with fresh 12-byte random IV.
   * Format: v1:<iv_hex>:<tag_hex>:<ciphertext_hex>
   *
   * @param plaintext Sensitive value to encrypt
   * @param contextAad Optional Authenticated Additional Data binding context
   */
  encrypt(plaintext: string, contextAad?: string): string {
    if (!plaintext) {
      throw new Error('Cannot encrypt empty or null plaintext');
    }

    const key = this.getKey();
    const iv = crypto.randomBytes(IV_LENGTH_BYTES);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    if (contextAad) {
      cipher.setAAD(Buffer.from(contextAad, 'utf8'));
    }

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return `${CURRENT_CIPHER_VERSION}:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypts versioned ciphertext using AES-256-GCM and verifies authentication tag.
   *
   * @param ciphertext Versioned encrypted payload
   * @param contextAad Optional Authenticated Additional Data binding context
   */
  decrypt(ciphertext: string, contextAad?: string): string {
    if (!ciphertext || typeof ciphertext !== 'string') {
      throw new Error('Invalid ciphertext input');
    }

    const parts = ciphertext.split(':');
    if (parts.length !== 4) {
      throw new Error('Malformed ciphertext format: expected version:iv:tag:data');
    }

    const [version, ivHex, tagHex, dataHex] = parts;
    if (version !== CURRENT_CIPHER_VERSION) {
      throw new Error(`Unsupported ciphertext version '${version}'`);
    }

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(tagHex, 'hex');

    if (iv.length !== IV_LENGTH_BYTES) {
      throw new Error('Invalid IV length');
    }
    if (authTag.length !== AUTH_TAG_LENGTH_BYTES) {
      throw new Error('Invalid authentication tag length');
    }

    const key = this.getKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    if (contextAad) {
      decipher.setAAD(Buffer.from(contextAad, 'utf8'));
    }

    try {
      let decrypted = decipher.update(dataHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (err: any) {
      throw new Error('Decryption failed: integrity verification / authentication tag mismatch');
    }
  }

  /**
   * Tests whether a string is a valid versioned ciphertext format.
   */
  isCiphertext(value: string): boolean {
    if (!value || typeof value !== 'string') return false;
    const parts = value.split(':');
    return parts.length === 4 && parts[0] === CURRENT_CIPHER_VERSION;
  }
}

