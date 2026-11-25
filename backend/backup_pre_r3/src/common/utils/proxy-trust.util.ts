import * as net from 'net';
import { Logger } from '@nestjs/common';

const logger = new Logger('ProxyTrustConfig');

/**
 * Validates and resolves the Express 'trust proxy' setting.
 *
 * Strict Security Rules (DEP-01 Hardening):
 * 1. Default to 'loopback' if unset, empty, or whitespace.
 * 2. Explicitly REJECT boolean 'true' and 'false' (prevents trusting arbitrary external headers).
 * 3. Explicitly REJECT wildcards ('*', 'all', 'any').
 * 4. Explicitly REJECT numeric hop counts (e.g. '1', '2', '3') to prevent arbitrary hop trusting.
 * 5. Explicitly REJECT broad CIDR blocks (e.g. '0.0.0.0/0', '::/0', '/8', '/12', '/16' broad subnets).
 * 6. Explicitly REJECT malformed strings that are neither valid IPs nor 'loopback'.
 * 7. Allow only 'loopback', verified individual IP addresses, or narrow host-specific CIDRs (/28 to /32 for IPv4, /120 to /128 for IPv6).
 *
 * When an unsafe or malformed value is supplied, this function logs a security warning
 * and safely falls back to 'loopback'.
 */
export function resolveTrustProxyConfig(rawConfig?: string): string | string[] {
  if (!rawConfig || typeof rawConfig !== 'string' || rawConfig.trim() === '') {
    return 'loopback';
  }

  const trimmed = rawConfig.trim();
  const lower = trimmed.toLowerCase();

  // 1. Explicit loopback keyword
  if (lower === 'loopback') {
    return 'loopback';
  }

  // 2. Reject boolean strings
  if (lower === 'true' || lower === 'false') {
    logger.warn(`[Security Warning] Insecure TRUST_PROXY value '${trimmed}' rejected. Boolean proxy trust is not permitted. Falling back to 'loopback'.`);
    return 'loopback';
  }

  // 3. Reject wildcards
  if (lower === '*' || lower === 'all' || lower === 'any') {
    logger.warn(`[Security Warning] Insecure TRUST_PROXY wildcard '${trimmed}' rejected. Falling back to 'loopback'.`);
    return 'loopback';
  }

  // 4. Reject numeric hop counts (e.g. '1', '2', '10')
  if (/^\d+$/.test(trimmed)) {
    logger.warn(`[Security Warning] Insecure TRUST_PROXY numeric hop count '${trimmed}' rejected. Numeric hop counts are not permitted without verified network topology. Falling back to 'loopback'.`);
    return 'loopback';
  }

  // 5. Parse comma-separated list of entries
  const entries = trimmed
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);

  if (entries.length === 0) {
    return 'loopback';
  }

  const validatedEntries: string[] = [];

  for (const entry of entries) {
    const entryLower = entry.toLowerCase();

    if (entryLower === 'loopback') {
      validatedEntries.push('loopback');
      continue;
    }

    // Check for CIDR notation (e.g. 192.168.1.1/32)
    if (entry.includes('/')) {
      const parts = entry.split('/');
      if (parts.length !== 2) {
        logger.warn(`[Security Warning] Malformed CIDR in TRUST_PROXY: '${entry}'. Falling back to 'loopback'.`);
        return 'loopback';
      }

      const [ip, maskStr] = parts;
      const mask = parseInt(maskStr, 10);
      const ipVersion = net.isIP(ip);

      if (isNaN(mask) || ipVersion === 0) {
        logger.warn(`[Security Warning] Invalid IP or mask in TRUST_PROXY CIDR: '${entry}'. Falling back to 'loopback'.`);
        return 'loopback';
      }

      // Disallow broad CIDR ranges: IPv4 must be >= 28 (/28 to /32), IPv6 must be >= 120
      if ((ipVersion === 4 && (mask < 28 || mask > 32)) || (ipVersion === 6 && (mask < 120 || mask > 128))) {
        logger.warn(`[Security Warning] Overly broad CIDR mask in TRUST_PROXY '${entry}' (mask /${mask}). Broad subnets are rejected. Falling back to 'loopback'.`);
        return 'loopback';
      }

      validatedEntries.push(entry);
      continue;
    }

    // Check single IP
    const ipVersion = net.isIP(entry);
    if (ipVersion === 0) {
      logger.warn(`[Security Warning] Malformed IP address in TRUST_PROXY: '${entry}'. Falling back to 'loopback'.`);
      return 'loopback';
    }

    validatedEntries.push(entry);
  }

  if (validatedEntries.length === 1) {
    return validatedEntries[0];
  }

  return validatedEntries;
}
