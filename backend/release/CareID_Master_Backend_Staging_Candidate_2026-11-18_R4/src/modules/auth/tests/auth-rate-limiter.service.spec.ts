import { AuthRateLimiterService } from '../infrastructure/services/auth-rate-limiter.service';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('AuthRateLimiterService', () => {
  let rateLimiter: AuthRateLimiterService;

  beforeEach(() => {
    rateLimiter = new AuthRateLimiterService();
  });

  afterEach(() => {
    rateLimiter.reset();
  });

  describe('checkRequestOtpLimit', () => {
    it('should allow requests within IP and phone limits', () => {
      expect(() => {
        rateLimiter.checkRequestOtpLimit('192.168.1.1', '+14155552671');
      }).not.toThrow();
    });

    it('should throw 429 when phone limit is exceeded (max 3 per 10 minutes)', () => {
      const phone = '+14155550001';
      rateLimiter.checkRequestOtpLimit('192.168.1.2', phone);
      rateLimiter.checkRequestOtpLimit('192.168.1.3', phone);
      rateLimiter.checkRequestOtpLimit('192.168.1.4', phone);

      expect(() => {
        rateLimiter.checkRequestOtpLimit('192.168.1.5', phone);
      }).toThrow(HttpException);

      try {
        rateLimiter.checkRequestOtpLimit('192.168.1.5', phone);
      } catch (err: any) {
        expect(err.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
        expect(err.message).toContain('Too many OTP requests for this phone number');
      }
    });

    it('should throw 429 when IP limit is exceeded (max 10 per 15 minutes)', () => {
      const ip = '10.0.0.99';
      for (let i = 0; i < 10; i++) {
        rateLimiter.checkRequestOtpLimit(ip, `+141555500${i}`);
      }

      expect(() => {
        rateLimiter.checkRequestOtpLimit(ip, '+14155559999');
      }).toThrow(HttpException);

      try {
        rateLimiter.checkRequestOtpLimit(ip, '+14155559999');
      } catch (err: any) {
        expect(err.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
        expect(err.message).toContain('Too many OTP requests from this IP');
      }
    });
  });

  describe('checkResendOtpCooldown', () => {
    it('should allow first resend and enforce 60-second cooldown for subsequent immediate call', () => {
      const challengeId = 'chal-100';

      // First check sets the cooldown
      rateLimiter.checkResendOtpCooldown(challengeId);

      // Immediate second check should throw 429
      expect(() => {
        rateLimiter.checkResendOtpCooldown(challengeId);
      }).toThrow(HttpException);

      try {
        rateLimiter.checkResendOtpCooldown(challengeId);
      } catch (err: any) {
        expect(err.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
        expect(err.message).toContain('Please wait');
      }
    });
  });

  describe('checkVerifyOtpLimit', () => {
    it('should throw 429 when verify attempts exceed limit (max 10 per minute)', () => {
      const ip = '10.0.0.50';
      for (let i = 0; i < 10; i++) {
        rateLimiter.checkVerifyOtpLimit(ip);
      }

      expect(() => {
        rateLimiter.checkVerifyOtpLimit(ip);
      }).toThrow(HttpException);

      try {
        rateLimiter.checkVerifyOtpLimit(ip);
      } catch (err: any) {
        expect(err.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
        expect(err.message).toContain('Too many verification attempts from this IP');
      }
    });
  });

  describe('checkRefreshTokenLimit', () => {
    it('should throw 429 when refresh requests exceed limit (max 30 per minute)', () => {
      const ip = '10.0.0.60';
      for (let i = 0; i < 30; i++) {
        rateLimiter.checkRefreshTokenLimit(ip);
      }

      expect(() => {
        rateLimiter.checkRefreshTokenLimit(ip);
      }).toThrow(HttpException);

      try {
        rateLimiter.checkRefreshTokenLimit(ip);
      } catch (err: any) {
        expect(err.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
        expect(err.message).toContain('Too many token refresh requests from this IP');
      }
    });
  });

  describe('Bounded Memory Protection', () => {
    it('should enforce maxRecords bound and evict oldest records when capacity is reached', () => {
      const boundedLimiter = new AuthRateLimiterService(5);
      for (let i = 1; i <= 10; i++) {
        boundedLimiter.checkVerifyOtpLimit(`192.168.10.${i}`);
      }

      expect(boundedLimiter.getRecordCount()).toBeLessThanOrEqual(5);
      boundedLimiter.reset();
    });
  });
});

