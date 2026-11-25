import { BadRequestException } from '@nestjs/common';

export const MAX_ATTACHMENT_FILE_SIZE = 15 * 1024 * 1024; // 15MB in bytes

export const DANGEROUS_FILE_EXTENSIONS: readonly string[] = Object.freeze([
  '.exe',
  '.bat',
  '.cmd',
  '.sh',
  '.bash',
  '.php',
  '.phtml',
  '.php3',
  '.php4',
  '.php5',
  '.phps',
  '.js',
  '.ts',
  '.py',
  '.pl',
  '.cgi',
  '.jar',
  '.vbs',
  '.vbe',
  '.wsf',
  '.wsh',
  '.msi',
  '.dll',
  '.com',
  '.scr',
  '.ps1',
  '.psm1',
  '.apk',
  '.app',
  '.dmg',
  '.iso',
  '.bin',
  '.elf',
  '.hta',
  '.cpl',
]);

export const MIME_EXTENSION_MAP: Record<string, readonly string[]> = Object.freeze({
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/tiff': ['.tif', '.tiff'],
  'application/dicom': ['.dcm', '.dicom'],
});

export const BLOCKED_METADATA_HOSTS: readonly string[] = Object.freeze([
  '169.254.169.254',
  'metadata.google.internal',
  'instance-data',
  '100.100.100.200',
]);

export interface ValidateFileSecurityOptions {
  fileName: string;
  mimeType: string;
  fileSize?: number;
  storageKey?: string;
  storageUrl?: string;
  allowedMimeTypes?: readonly string[];
}

/**
 * Enforces file security validations on uploads and attachment registrations:
 * 1. MIME type authorization
 * 2. File size ceiling (max 15MB)
 * 3. Filename path traversal prevention
 * 4. Dangerous/executable extension rejection
 * 5. Extension-to-MIME consistency verification
 * 6. Storage key path traversal prevention
 * 7. Storage URL protocol and SSRF (metadata endpoint) guard
 */
export function validateFileSecurity(opts: ValidateFileSecurityOptions): void {
  const { fileName, mimeType, fileSize, storageKey, storageUrl, allowedMimeTypes } = opts;

  // 1. MIME type check
  if (!mimeType || typeof mimeType !== 'string') {
    throw new BadRequestException('MIME type is required');
  }
  const normalizedMime = mimeType.trim().toLowerCase();
  if (allowedMimeTypes && !allowedMimeTypes.map((m) => m.toLowerCase()).includes(normalizedMime)) {
    throw new BadRequestException(`MIME type '${mimeType}' is not supported. Allowed: ${allowedMimeTypes.join(', ')}`);
  }

  // 2. File size check
  if (fileSize !== undefined) {
    if (typeof fileSize !== 'number' || !Number.isFinite(fileSize) || fileSize <= 0) {
      throw new BadRequestException('fileSize must be a positive number');
    }
    if (fileSize > MAX_ATTACHMENT_FILE_SIZE) {
      throw new BadRequestException(`File size exceeds maximum limit of 15MB (${fileSize} bytes provided)`);
    }
  }

  // 3. Filename validation & path traversal prevention
  if (!fileName || typeof fileName !== 'string' || fileName.trim() === '') {
    throw new BadRequestException('fileName is required');
  }
  const trimmedName = fileName.trim();
  if (
    trimmedName.includes('..') ||
    trimmedName.includes('/') ||
    trimmedName.includes('\\') ||
    trimmedName.includes('\0')
  ) {
    throw new BadRequestException('Invalid fileName: path traversal or directory separators detected');
  }

  // 4. Dangerous executable/script extension check
  const lowerName = trimmedName.toLowerCase();
  for (const dangerousExt of DANGEROUS_FILE_EXTENSIONS) {
    if (lowerName.endsWith(dangerousExt) || lowerName.includes(`${dangerousExt}.`)) {
      throw new BadRequestException(`File contains dangerous or executable extension '${dangerousExt}'`);
    }
  }

  // 5. Extension-to-MIME consistency check
  const expectedExtensions = MIME_EXTENSION_MAP[normalizedMime];
  if (expectedExtensions) {
    const hasValidExtension = expectedExtensions.some((ext) => lowerName.endsWith(ext));
    if (!hasValidExtension) {
      throw new BadRequestException(
        `File extension does not match declared MIME type '${mimeType}'. Expected: ${expectedExtensions.join(', ')}`,
      );
    }
  }

  // 6. Storage key validation
  if (storageKey !== undefined && storageKey !== null) {
    if (typeof storageKey !== 'string') {
      throw new BadRequestException('storageKey must be a string');
    }
    if (storageKey.includes('..') || storageKey.includes('\\') || storageKey.includes('\0')) {
      throw new BadRequestException('Invalid storageKey: path traversal detected');
    }
  }

  // 7. Storage URL SSRF / protocol validation
  if (storageUrl !== undefined && storageUrl !== null) {
    if (typeof storageUrl !== 'string') {
      throw new BadRequestException('storageUrl must be a string');
    }
    let parsed: URL;
    try {
      parsed = new URL(storageUrl);
    } catch {
      throw new BadRequestException('Invalid storageUrl: malformed URL');
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new BadRequestException('Invalid storageUrl: only HTTP and HTTPS protocols are allowed');
    }
    const host = parsed.hostname.toLowerCase();
    if (BLOCKED_METADATA_HOSTS.includes(host)) {
      throw new BadRequestException('Invalid storageUrl: access to cloud metadata services is forbidden');
    }
  }
}

/**
 * Checks whether an IP address belongs to private, loopback, link-local, or reserved ranges.
 */
export function isPrivateOrReservedIp(ip: string): boolean {
  // IPv4 checks
  const v4Match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip);
  if (v4Match) {
    const parts = [Number(v4Match[1]), Number(v4Match[2]), Number(v4Match[3]), Number(v4Match[4])];
    if (parts.some((p) => isNaN(p) || p < 0 || p > 255)) return true;
    if (parts[0] === 0) return true; // 0.0.0.0/8
    if (parts[0] === 10) return true; // 10.0.0.0/8
    if (parts[0] === 127) return true; // 127.0.0.0/8 (Loopback)
    if (parts[0] === 169 && parts[1] === 254) return true; // 169.254.0.0/16 (Link-local & cloud metadata)
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true; // 172.16.0.0/12
    if (parts[0] === 192 && parts[1] === 168) return true; // 192.168.0.0/16
    if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true; // 100.64.0.0/10 (CGNAT)
    if (parts[0] === 198 && (parts[1] === 18 || parts[1] === 19)) return true; // Benchmark
    if (parts[0] >= 224) return true; // Multicast / Class E reserved
    return false;
  }

  // IPv6 checks
  const normalized = ip.toLowerCase().trim();
  if (normalized === '::1' || normalized === '::') return true;
  if (
    normalized.startsWith('fe8') ||
    normalized.startsWith('fe9') ||
    normalized.startsWith('fea') ||
    normalized.startsWith('feb')
  ) {
    return true; // Link-local
  }
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) {
    return true; // Unique local
  }
  if (normalized.includes('::ffff:')) {
    const v4Part = normalized.split('::ffff:')[1];
    if (v4Part && isPrivateOrReservedIp(v4Part)) return true;
  }

  return false;
}

/**
 * Validates a remote URL against Server-Side Request Forgery (SSRF) attacks:
 * - Requires HTTP or HTTPS protocol
 * - Rejects private/loopback/cloud metadata IP addresses (both IPv4 and IPv6)
 * - Rejects integer/hex representations of IP addresses
 * - Rejects sensitive internal ports
 * - Rejects local hostnames (localhost, internal domains)
 */
export function validateSafeUrl(urlStr: string, fieldName: string = 'URL'): URL {
  if (!urlStr || typeof urlStr !== 'string') {
    throw new BadRequestException(`${fieldName} is required and must be a string`);
  }

  let parsed: URL;
  try {
    parsed = new URL(urlStr.trim());
  } catch {
    throw new BadRequestException(`${fieldName} is not a valid URL`);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new BadRequestException(`${fieldName} must use HTTP or HTTPS protocol`);
  }

  const hostname = parsed.hostname.toLowerCase().trim();

  // Block localhost and internal names
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.corp') ||
    hostname.endsWith('.lan') ||
    BLOCKED_METADATA_HOSTS.includes(hostname)
  ) {
    throw new BadRequestException(`${fieldName} points to a restricted or internal network address`);
  }

  // Block integer or hex representation of IPs (e.g. http://2130706433 or http://0x7f000001)
  if (/^\d+$/.test(hostname) || /^0x[0-9a-fA-F]+$/.test(hostname)) {
    throw new BadRequestException(`${fieldName} uses an invalid IP format`);
  }

  // Check IPv4 or bracketed IPv6
  const cleanIp = hostname.replace(/^\[/, '').replace(/\]$/, '');
  if (isPrivateOrReservedIp(cleanIp)) {
    throw new BadRequestException(`${fieldName} points to a private or reserved network address`);
  }

  // Restrict to standard web ports if port is explicitly provided
  if (parsed.port) {
    const portNum = parseInt(parsed.port, 10);
    const allowedPorts = [80, 443, 8080, 8443];
    if (!allowedPorts.includes(portNum)) {
      throw new BadRequestException(`${fieldName} uses a disallowed port (${portNum})`);
    }
  }

  return parsed;
}

/**
 * Validates magic bytes of an uploaded image file (JPEG, PNG, WEBP).
 */
export function validateImageBuffer(buffer: Buffer): 'jpg' | 'png' | 'webp' {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length < 12) {
    throw new BadRequestException('Uploaded file is empty or corrupted');
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'png';
  }

  // WEBP: RIFF .... WEBP
  const riff = buffer.toString('ascii', 0, 4);
  const webp = buffer.toString('ascii', 8, 12);
  if (riff === 'RIFF' && webp === 'WEBP') {
    return 'webp';
  }

  throw new BadRequestException('File contents do not match a valid image format (JPEG, PNG, WEBP)');
}

/**
 * Validates magic bytes of an insurance document or card (JPEG, PNG, WEBP, PDF).
 */
export function validateDocumentBuffer(buffer: Buffer): 'jpg' | 'png' | 'webp' | 'pdf' {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length < 4) {
    throw new BadRequestException('Uploaded file is empty or corrupted');
  }

  // PDF: %PDF
  if (buffer.toString('ascii', 0, 4) === '%PDF') {
    return 'pdf';
  }

  // Fallback to image magic bytes
  try {
    return validateImageBuffer(buffer);
  } catch {
    throw new BadRequestException('File contents do not match a valid document or image format (PDF, JPEG, PNG, WEBP)');
  }
}
