const cors = require('cors');
import {
  parseAllowedOrigins,
  normalizeOrigin,
  createCorsOriginCallback,
  getCorsOptions,
  DEFAULT_DEV_ORIGINS,
  CORS_ALLOWED_METHODS,
  CORS_ALLOWED_HEADERS,
} from '../cors.util';
import { validateEnvironment } from '../../../config/env.validation';

describe('CORS Security Hardening (CRIT-SEC-01 / Workstream A)', () => {
  describe('normalizeOrigin', () => {
    it('should normalize valid origins by removing trailing slashes', () => {
      expect(normalizeOrigin('https://app.careid.com/')).toBe('https://app.careid.com');
      expect(normalizeOrigin('http://localhost:3000///')).toBe('http://localhost:3000');
    });

    it('should reject wildcard origins (*)', () => {
      expect(normalizeOrigin('*')).toBeNull();
      expect(normalizeOrigin('https://*.careid.com')).toBeNull();
    });

    it('should reject non-HTTP/HTTPS protocols', () => {
      expect(normalizeOrigin('javascript:alert(1)')).toBeNull();
      expect(normalizeOrigin('file:///etc/passwd')).toBeNull();
      expect(normalizeOrigin('data:text/html,test')).toBeNull();
    });

    it('should reject malformed or non-URL strings', () => {
      expect(normalizeOrigin('not-a-url')).toBeNull();
      expect(normalizeOrigin('')).toBeNull();
      expect(normalizeOrigin(null as any)).toBeNull();
    });
  });

  describe('parseAllowedOrigins', () => {
    it('should return default development origins when no config is provided in non-production', () => {
      const origins = parseAllowedOrigins(undefined, false);
      expect(origins).toEqual(DEFAULT_DEV_ORIGINS);
    });

    it('should fail closed (return empty array) in production when no config is provided', () => {
      const origins = parseAllowedOrigins(undefined, true);
      expect(origins).toEqual([]);
    });

    it('should parse and deduplicate comma-separated valid origins', () => {
      const input = 'https://app.careid.com, https://admin.careid.com , https://app.careid.com/';
      const origins = parseAllowedOrigins(input, true);
      expect(origins).toEqual(['https://app.careid.com', 'https://admin.careid.com']);
    });

    it('should discard invalid or wildcard entries and retain valid ones', () => {
      const input = 'https://app.careid.com, *, invalid-url, https://portal.careid.com';
      const origins = parseAllowedOrigins(input, true);
      expect(origins).toEqual(['https://app.careid.com', 'https://portal.careid.com']);
    });

    it('should fail closed in production if all entries in config are invalid or wildcards', () => {
      const input = '*, invalid-url, javascript:alert(1)';
      const origins = parseAllowedOrigins(input, true);
      expect(origins).toEqual([]);
    });
  });

  describe('createCorsOriginCallback', () => {
    const allowed = ['https://app.careid.com', 'https://admin.careid.com'];
    const originCallback = createCorsOriginCallback(allowed);

    it('should allow requests with no Origin header (mobile apps, server-to-server, curl)', (done) => {
      originCallback(undefined, (err, allow) => {
        expect(err).toBeNull();
        expect(allow).toBe(true);
        done();
      });
    });

    it('should allow explicitly listed trusted origins', (done) => {
      originCallback('https://app.careid.com', (err, allow) => {
        expect(err).toBeNull();
        expect(allow).toBe(true);
        done();
      });
    });

    it('should allow listed origins regardless of trailing slash in incoming request', (done) => {
      originCallback('https://app.careid.com/', (err, allow) => {
        expect(err).toBeNull();
        expect(allow).toBe(true);
        done();
      });
    });

    it('should allow listed origins regardless of case in hostname', (done) => {
      originCallback('https://APP.CAREID.COM', (err, allow) => {
        expect(err).toBeNull();
        expect(allow).toBe(true);
        done();
      });
    });

    it('should reject untrusted/malicious origins safely with false (no exception thrown)', (done) => {
      originCallback('https://evil.attacker.com', (err, allow) => {
        expect(err).toBeNull();
        expect(allow).toBe(false);
        done();
      });
    });
  });

  describe('Express cors Middleware Integration', () => {
    const corsOptions = getCorsOptions('https://app.careid.com,https://admin.careid.com', true);
    const corsMiddleware = cors(corsOptions as any);

    it('should emit Access-Control-Allow-Origin and credentials for a trusted origin', (done) => {
      const req: any = { headers: { origin: 'https://app.careid.com' }, method: 'GET' };
      const headers: Record<string, string> = {};
      const res: any = {
        setHeader(key: string, value: string) {
          headers[key] = value;
        },
        getHeader(key: string) {
          return headers[key];
        },
      };

      corsMiddleware(req, res, () => {
        expect(headers['Access-Control-Allow-Origin']).toBe('https://app.careid.com');
        expect(headers['Access-Control-Allow-Credentials']).toBe('true');
        expect(headers['Vary']).toBe('Origin');
        done();
      });
    });

    it('should NOT emit Access-Control-Allow-Origin for an untrusted origin', (done) => {
      const req: any = { headers: { origin: 'https://evil.attacker.com' }, method: 'GET' };
      const headers: Record<string, string> = {};
      const res: any = {
        setHeader(key: string, value: string) {
          headers[key] = value;
        },
        getHeader(key: string) {
          return headers[key];
        },
      };

      corsMiddleware(req, res, () => {
        expect(headers['Access-Control-Allow-Origin']).toBeUndefined();
        expect(headers['Access-Control-Allow-Credentials']).toBeUndefined();
        done();
      });
    });

    it('should properly handle preflight OPTIONS request for a trusted origin', (done) => {
      const req: any = {
        headers: {
          origin: 'https://app.careid.com',
          'access-control-request-method': 'POST',
        },
        method: 'OPTIONS',
      };
      const headers: Record<string, string> = {};
      let statusCode = 0;
      const res: any = {
        statusCode: 0,
        setHeader(key: string, value: string) {
          headers[key] = value;
        },
        getHeader(key: string) {
          return headers[key];
        },
        end() {
          statusCode = this.statusCode;
          expect(headers['Access-Control-Allow-Origin']).toBe('https://app.careid.com');
          expect(headers['Access-Control-Allow-Credentials']).toBe('true');
          expect(headers['Access-Control-Allow-Methods']).toBe(CORS_ALLOWED_METHODS.join(','));
          expect(headers['Access-Control-Allow-Headers']).toBe(CORS_ALLOWED_HEADERS.join(','));
          expect(statusCode).toBe(204);
          done();
        },
      };

      corsMiddleware(req, res, () => {
        done(new Error('Preflight should have ended without calling next()'));
      });
    });

    it('should deny preflight OPTIONS request for an untrusted origin by omitting allow headers', (done) => {
      const req: any = {
        headers: {
          origin: 'https://evil.attacker.com',
          'access-control-request-method': 'POST',
        },
        method: 'OPTIONS',
      };
      const headers: Record<string, string> = {};
      const res: any = {
        setHeader(key: string, value: string) {
          headers[key] = value;
        },
        getHeader(key: string) {
          return headers[key];
        },
      };

      corsMiddleware(req, res, () => {
        expect(headers['Access-Control-Allow-Origin']).toBeUndefined();
        expect(headers['Access-Control-Allow-Credentials']).toBeUndefined();
        done();
      });
    });
  });

  describe('Production Environment Validation for CORS Wildcards', () => {
    const baseValidConfig = {
      PORT: 3000,
      GLOBAL_PREFIX: 'api',
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/db',
      JWT_SECRET: 'a_very_strong_cryptographic_production_jwt_secret_key_32_bytes_long',
    };

    it('should reject production boot when CORS_ALLOWED_ORIGINS contains wildcard (*)', () => {
      expect(() => {
        validateEnvironment({
          ...baseValidConfig,
          NODE_ENV: 'production',
          CORS_ALLOWED_ORIGINS: 'https://app.careid.com,*',
        });
      }).toThrow('Production CORS_ALLOWED_ORIGINS cannot contain wildcards (*)');
    });
  });
});
