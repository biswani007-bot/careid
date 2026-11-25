import express from 'express';
import { AuthRateLimiterService } from '../infrastructure/services/auth-rate-limiter.service';
import { AuthController } from '../presentation/controllers/auth.controller';
import { HttpException, HttpStatus } from '@nestjs/common';
import { resolveTrustProxyConfig } from '../../../common/utils/proxy-trust.util';

describe('Proxy Trust & Client IP Hardening (DEP-01)', () => {
  describe('Express "trust proxy: loopback" IP Resolution', () => {
    let app: express.Express;

    beforeEach(() => {
      app = express();
      app.set('trust proxy', 'loopback');
    });

    const createMockRes = () => ({
      setHeader: jest.fn(),
      getHeader: jest.fn(),
      sendStatus: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      end: jest.fn(),
    });

    it('should resolve real client IP when request arrives from trusted loopback Nginx proxy', (done) => {
      app.get('/test-ip', (req, res) => {
        expect(req.ip).toBe('203.0.113.195');
        res.sendStatus(200);
        done();
      });

      // Simulate request from loopback (127.0.0.1) forwarding client IP
      const req: any = {
        method: 'GET',
        url: '/test-ip',
        headers: {
          'x-forwarded-for': '203.0.113.195',
        },
        connection: { remoteAddress: '127.0.0.1' },
        socket: { remoteAddress: '127.0.0.1' },
      };
      (app as any).handle(req, createMockRes());
    });

    it('should ignore spoofed X-Forwarded-For header when request connects directly from an untrusted IP', (done) => {
      app.get('/test-spoof', (req, res) => {
        // Direct untrusted client IP is 198.51.100.22. It must NOT trust the spoofed 1.2.3.4 header!
        expect(req.ip).toBe('198.51.100.22');
        res.sendStatus(200);
        done();
      });

      const req: any = {
        method: 'GET',
        url: '/test-spoof',
        headers: {
          'x-forwarded-for': '1.2.3.4',
        },
        connection: { remoteAddress: '198.51.100.22' },
        socket: { remoteAddress: '198.51.100.22' },
      };
      (app as any).handle(req, createMockRes());
    });

    it('should extract correct client IP and ignore attacker spoofed prefix through Nginx proxy', (done) => {
      app.get('/test-chain', (req, res) => {
        // Attacker sent X-Forwarded-For: 8.8.8.8 to Nginx.
        // Nginx appended real client IP: 8.8.8.8, 203.0.113.195
        // Express walking back from loopback (127.0.0.1) should stop at 203.0.113.195 and ignore 8.8.8.8
        expect(req.ip).toBe('203.0.113.195');
        res.sendStatus(200);
        done();
      });

      const req: any = {
        method: 'GET',
        url: '/test-chain',
        headers: {
          'x-forwarded-for': '8.8.8.8, 203.0.113.195',
        },
        connection: { remoteAddress: '127.0.0.1' },
        socket: { remoteAddress: '127.0.0.1' },
      };
      (app as any).handle(req, createMockRes());
    });

    it('should resolve to remoteAddress when no X-Forwarded-For header is present', (done) => {
      app.get('/test-direct', (req, res) => {
        expect(req.ip).toBe('127.0.0.1');
        res.sendStatus(200);
        done();
      });

      const req: any = {
        method: 'GET',
        url: '/test-direct',
        headers: {},
        connection: { remoteAddress: '127.0.0.1' },
        socket: { remoteAddress: '127.0.0.1' },
      };
      (app as any).handle(req, createMockRes());
    });
  });

  describe('Rate Limiter Protection Against Absent or Malformed Client IP', () => {
    let rateLimiter: AuthRateLimiterService;

    beforeEach(() => {
      rateLimiter = new AuthRateLimiterService();
    });

    afterEach(() => {
      rateLimiter.reset();
    });

    it('should enforce rate limiting under unknown_client when IP is undefined', () => {
      for (let i = 0; i < 10; i++) {
        expect(() => {
          rateLimiter.checkVerifyOtpLimit(undefined);
        }).not.toThrow();
      }

      // 11th request with undefined IP must throw 429 and NOT bypass
      expect(() => {
        rateLimiter.checkVerifyOtpLimit(undefined);
      }).toThrow(HttpException);

      try {
        rateLimiter.checkVerifyOtpLimit(undefined);
      } catch (err: any) {
        expect(err.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      }
    });

    it('should enforce rate limiting under unknown_client when IP is empty string or whitespace', () => {
      for (let i = 0; i < 10; i++) {
        expect(() => {
          rateLimiter.checkVerifyOtpLimit('   ');
        }).not.toThrow();
      }

      expect(() => {
        rateLimiter.checkVerifyOtpLimit('');
      }).toThrow(HttpException);
    });

    it('should enforce OTP request rate limiting even if client IP is absent', () => {
      for (let i = 0; i < 10; i++) {
        expect(() => {
          rateLimiter.checkRequestOtpLimit(undefined, `+141555500${i}`);
        }).not.toThrow();
      }

      // 11th OTP request with undefined IP must be blocked
      expect(() => {
        rateLimiter.checkRequestOtpLimit(undefined, '+14155559999');
      }).toThrow(HttpException);
    });
  });

  describe('AuthController Client IP Extraction', () => {
    let authController: AuthController;
    let mockAuthService: any;

    beforeEach(() => {
      mockAuthService = {
        requestOtp: jest.fn().mockResolvedValue({ challengeId: 'c-1', message: 'OTP sent' }),
        verifyOtp: jest.fn().mockResolvedValue({ accessToken: 'a', refreshToken: 'r', expiresIn: '15m' }),
        resendOtp: jest.fn().mockResolvedValue({ challengeId: 'c-1', message: 'Resent' }),
        refreshToken: jest.fn().mockResolvedValue({ accessToken: 'a', refreshToken: 'r' }),
        logout: jest.fn().mockResolvedValue({ success: true, message: 'Logged out' }),
        logoutAll: jest.fn().mockResolvedValue({ success: true, message: 'Logged out all' }),
      };
      authController = new AuthController(mockAuthService);
    });

    it('should pass validated req.ip and completely ignore req.headers["x-forwarded-for"]', async () => {
      const mockReq: any = {
        ip: '203.0.113.55',
        headers: {
          'x-forwarded-for': 'spoofed.ip.address',
        },
      };

      await authController.requestOtp(mockReq, { phone: '+14155552671' });

      // Must receive validated req.ip ('203.0.113.55'), NOT 'spoofed.ip.address'
      expect(mockAuthService.requestOtp).toHaveBeenCalledWith(
        { phone: '+14155552671' },
        '203.0.113.55',
      );
    });

    it('should pass empty string if req.ip is absent without falling back to x-forwarded-for', async () => {
      const mockReq: any = {
        ip: undefined,
        headers: {
          'x-forwarded-for': 'spoofed.ip.address',
        },
      };

      await authController.requestOtp(mockReq, { phone: '+14155552671' });

      // Must receive empty string, NOT 'spoofed.ip.address'
      expect(mockAuthService.requestOtp).toHaveBeenCalledWith(
        { phone: '+14155552671' },
        '',
      );
    });
  });

  describe('TRUST_PROXY Configuration & Safety Validation', () => {
    it('should default to loopback when TRUST_PROXY is undefined or empty', () => {
      expect(resolveTrustProxyConfig(undefined)).toBe('loopback');
      expect(resolveTrustProxyConfig('')).toBe('loopback');
      expect(resolveTrustProxyConfig('   ')).toBe('loopback');
    });

    it('should accept explicitly configured loopback', () => {
      expect(resolveTrustProxyConfig('loopback')).toBe('loopback');
      expect(resolveTrustProxyConfig('LOOPBACK')).toBe('loopback');
    });

    it('should reject boolean true and fall back to loopback', () => {
      expect(resolveTrustProxyConfig('true')).toBe('loopback');
      expect(resolveTrustProxyConfig('TRUE')).toBe('loopback');
    });

    it('should reject boolean false and fall back to loopback', () => {
      expect(resolveTrustProxyConfig('false')).toBe('loopback');
    });

    it('should reject wildcard * and all and fall back to loopback', () => {
      expect(resolveTrustProxyConfig('*')).toBe('loopback');
      expect(resolveTrustProxyConfig('all')).toBe('loopback');
      expect(resolveTrustProxyConfig('any')).toBe('loopback');
    });

    it('should reject numeric hop counts and fall back to loopback', () => {
      expect(resolveTrustProxyConfig('1')).toBe('loopback');
      expect(resolveTrustProxyConfig('2')).toBe('loopback');
      expect(resolveTrustProxyConfig('10')).toBe('loopback');
    });

    it('should reject broad CIDR 0.0.0.0/0 and ::/0 and fall back to loopback', () => {
      expect(resolveTrustProxyConfig('0.0.0.0/0')).toBe('loopback');
      expect(resolveTrustProxyConfig('::/0')).toBe('loopback');
    });

    it('should reject broad private CIDR ranges and fall back to loopback', () => {
      expect(resolveTrustProxyConfig('10.0.0.0/8')).toBe('loopback');
      expect(resolveTrustProxyConfig('172.16.0.0/12')).toBe('loopback');
      expect(resolveTrustProxyConfig('192.168.0.0/16')).toBe('loopback');
      expect(resolveTrustProxyConfig('192.168.1.0/24')).toBe('loopback');
    });

    it('should reject malformed IP addresses and strings and fall back to loopback', () => {
      expect(resolveTrustProxyConfig('not-an-ip')).toBe('loopback');
      expect(resolveTrustProxyConfig('999.999.999.999')).toBe('loopback');
      expect(resolveTrustProxyConfig('127.0.0.1/invalid')).toBe('loopback');
    });

    it('should accept valid single IP addresses', () => {
      expect(resolveTrustProxyConfig('127.0.0.1')).toBe('127.0.0.1');
      expect(resolveTrustProxyConfig('::1')).toBe('::1');
      expect(resolveTrustProxyConfig('10.0.1.5')).toBe('10.0.1.5');
    });

    it('should accept comma-separated list of valid IPs', () => {
      expect(resolveTrustProxyConfig('127.0.0.1, ::1')).toEqual(['127.0.0.1', '::1']);
      expect(resolveTrustProxyConfig('127.0.0.1, 10.0.1.5')).toEqual(['127.0.0.1', '10.0.1.5']);
    });

    it('should accept narrow host CIDR (/28 to /32)', () => {
      expect(resolveTrustProxyConfig('127.0.0.1/32')).toBe('127.0.0.1/32');
      expect(resolveTrustProxyConfig('10.0.1.0/28')).toBe('10.0.1.0/28');
    });
  });
});
