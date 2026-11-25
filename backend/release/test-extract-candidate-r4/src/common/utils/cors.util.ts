import { Logger } from '@nestjs/common';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

const logger = new Logger('CorsConfig');

/**
 * Default local development origins permitted in non-production environments
 * when explicit CORS_ALLOWED_ORIGINS is not provided.
 */
export const DEFAULT_DEV_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3073',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3073',
  'http://localhost:5173',
];

/**
 * Standard HTTP methods permitted across the API.
 */
export const CORS_ALLOWED_METHODS = [
  'GET',
  'HEAD',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'OPTIONS',
];

/**
 * Standard HTTP headers allowed in cross-origin requests.
 */
export const CORS_ALLOWED_HEADERS = [
  'Content-Type',
  'Authorization',
  'Accept',
  'Origin',
  'X-Requested-With',
];

/**
 * Normalizes a URL string by trimming whitespace and removing trailing slashes.
 * Returns null if the URL is invalid or malformed.
 */
export function normalizeOrigin(origin: string): string | null {
  if (!origin || typeof origin !== 'string') {
    return null;
  }

  const trimmed = origin.trim();
  if (!trimmed) {
    return null;
  }

  // Reject wildcards explicitly (wildcards cannot be used with credentials: true)
  if (trimmed === '*' || trimmed.includes('*')) {
    logger.warn('[Security Warning] Wildcard origin (*) is not permitted with credentialed CORS. Discarding.');
    return null;
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      logger.warn(`[Security Warning] Insecure or non-HTTP protocol '${url.protocol}' in CORS origin: '${trimmed}'. Discarding.`);
      return null;
    }
    // Standard Origin headers consist of protocol + host + port (no trailing slash, no path)
    return `${url.protocol}//${url.host}`;
  } catch {
    logger.warn(`[Security Warning] Malformed URL in CORS origin configuration: '${trimmed}'. Discarding.`);
    return null;
  }
}

/**
 * Parses a comma-separated list of allowed origins from configuration.
 *
 * Rules:
 * 1. Comma-separated list is trimmed and filtered for valid origins.
 * 2. Wildcard origins are rejected to prevent credential reflection vulnerabilities.
 * 3. In production: If no valid origins are configured, fails closed (returns []).
 * 4. In development: If no valid origins are configured, falls back to DEFAULT_DEV_ORIGINS.
 */
export function parseAllowedOrigins(rawConfig?: string, isProduction: boolean = false): string[] {
  if (!rawConfig || typeof rawConfig !== 'string' || rawConfig.trim() === '') {
    if (isProduction) {
      logger.error('[Security Alert] Production requires explicit CORS_ALLOWED_ORIGINS. No origins allowed.');
      return [];
    }
    logger.log('[CORS] Development mode: No CORS_ALLOWED_ORIGINS configured. Using default local dev origins.');
    return [...DEFAULT_DEV_ORIGINS];
  }

  const candidates = rawConfig.split(',');
  const parsedOrigins: string[] = [];

  for (const candidate of candidates) {
    const normalized = normalizeOrigin(candidate);
    if (normalized && !parsedOrigins.includes(normalized)) {
      parsedOrigins.push(normalized);
    }
  }

  if (parsedOrigins.length === 0) {
    if (isProduction) {
      logger.error('[Security Alert] No valid origins found in CORS_ALLOWED_ORIGINS. Production fails closed.');
      return [];
    }
    logger.warn('[CORS] No valid origins parsed. Falling back to default local dev origins.');
    return [...DEFAULT_DEV_ORIGINS];
  }

  return parsedOrigins;
}

/**
 * Generates an origin evaluation callback for NestJS / Express CORS middleware.
 *
 * Behavior:
 * - Requests without an Origin header (e.g., mobile apps, curl, server-to-server) are ALLOWED.
 * - Origins matching the explicit allowlist are ALLOWED.
 * - Untrusted origins are REJECTED safely by passing callback(null, false),
 *   which ensures the Access-Control-Allow-Origin header is omitted,
 *   preventing credential reflection without crashing the server.
 */
export function createCorsOriginCallback(
  allowedOrigins: string[],
): (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => void {
  const allowedSet = new Set(allowedOrigins.map((o) => o.toLowerCase()));

  return (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Mobile apps, server-to-server, curl have no Origin header
    if (!origin) {
      return callback(null, true);
    }

    const normalized = normalizeOrigin(origin);
    if (normalized && allowedSet.has(normalized.toLowerCase())) {
      return callback(null, true);
    }

    // Safely reject untrusted origin by not reflecting CORS headers
    return callback(null, false);
  };
}

/**
 * Builds the complete CorsOptions object for NestJS application bootstrap.
 */
export function getCorsOptions(rawConfig?: string, isProduction: boolean = false): CorsOptions {
  const allowedOrigins = parseAllowedOrigins(rawConfig, isProduction);

  return {
    origin: createCorsOriginCallback(allowedOrigins),
    credentials: true,
    methods: CORS_ALLOWED_METHODS,
    allowedHeaders: CORS_ALLOWED_HEADERS,
    optionsSuccessStatus: 204,
  };
}

