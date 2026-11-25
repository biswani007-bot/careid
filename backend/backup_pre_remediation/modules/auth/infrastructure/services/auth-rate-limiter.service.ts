import { Injectable, HttpException, HttpStatus, Optional, Inject } from '@nestjs/common';

export interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
}

interface ClientRecord {
  timestamps: number[];
}

@Injectable()
export class AuthRateLimiterService {
  // Key format: "ip:127.0.0.1", "phone:+14155552671", "resend:challenge-uuid", etc.
  private readonly records: Map<string, ClientRecord> = new Map();

  // Rate Limiting Policy Thresholds:
  // 1. IP limit for OTP request: Max 10 requests per 15 minutes
  private readonly ipOtpRequestPolicy: RateLimiterOptions = {
    windowMs: 15 * 60 * 1000,
    maxRequests: 10,
  };

  // 2. Phone limit for OTP request: Max 3 requests per 10 minutes
  private readonly phoneOtpRequestPolicy: RateLimiterOptions = {
    windowMs: 10 * 60 * 1000,
    maxRequests: 3,
  };

  // 3. Resend cooldown: Minimum 60 seconds between resends for the same challenge
  private readonly resendCooldownMs: number = 60 * 1000;

  // 4. IP limit for OTP verification: Max 10 verification attempts per minute to prevent brute-forcing
  private readonly ipVerifyPolicy: RateLimiterOptions = {
    windowMs: 60 * 1000,
    maxRequests: 10,
  };

  // 5. IP limit for Token Refresh: Max 30 refresh requests per minute per IP
  private readonly ipRefreshPolicy: RateLimiterOptions = {
    windowMs: 60 * 1000,
    maxRequests: 30,
  };

  public readonly maxRecords: number;

  constructor(
    @Optional()
    @Inject('RATE_LIMITER_MAX_RECORDS')
    maxRecords?: number,
  ) {
    this.maxRecords = maxRecords !== undefined && maxRecords > 0 ? maxRecords : 10000;
    // Automatically prune stale rate-limit entries every 5 minutes to avoid memory leaks
    const timer = setInterval(() => this.pruneStaleRecords(), 5 * 60 * 1000);
    if (timer.unref) {
      timer.unref();
    }
  }

  getRecordCount(): number {
    return this.records.size;
  }

  private ensureCapacity(key: string): void {
    if (this.records.has(key)) {
      return;
    }
    if (this.records.size >= this.maxRecords) {
      this.pruneStaleRecords();
      while (this.records.size >= this.maxRecords) {
        const oldestKey = this.records.keys().next().value;
        if (oldestKey !== undefined) {
          this.records.delete(oldestKey);
        } else {
          break;
        }
      }
    }
  }

  /**
   * Normalizes client IP address. If absent, empty, or 'unknown',
   * returns 'unknown_client' so rate limiting cannot be bypassed.
   */
  private resolveClientIp(ipAddress?: string): string {
    if (!ipAddress || typeof ipAddress !== 'string' || ipAddress.trim() === '' || ipAddress.trim().toLowerCase() === 'unknown') {
      return 'unknown_client';
    }
    return ipAddress.trim();
  }

  /**
   * Enforces IP and Phone rate limits for OTP request generation.
   * Throws 429 Too Many Requests if either threshold is exceeded.
   */
  checkRequestOtpLimit(ipAddress?: string, phone?: string): void {
    const now = Date.now();
    const clientIp = this.resolveClientIp(ipAddress);

    // Check IP limit
    const ipKey = `ip_request:${clientIp}`;
    this.enforceSlidingWindow(ipKey, this.ipOtpRequestPolicy, now, 'Too many OTP requests from this IP address. Please try again later.');

    // Check Phone limit
    if (phone) {
      const phoneKey = `phone_request:${phone}`;
      this.enforceSlidingWindow(phoneKey, this.phoneOtpRequestPolicy, now, 'Too many OTP requests for this phone number. Please wait before requesting another code.');
    }
  }

  /**
   * Enforces a minimum 60-second cooldown between resends for the same challenge.
   */
  checkResendOtpCooldown(challengeId: string): void {
    const now = Date.now();
    const resendKey = `resend_cooldown:${challengeId}`;
    const record = this.records.get(resendKey);

    if (record && record.timestamps.length > 0) {
      const lastResendTime = record.timestamps[record.timestamps.length - 1];
      const timeSinceLastResend = now - lastResendTime;

      if (timeSinceLastResend < this.resendCooldownMs) {
        const waitSeconds = Math.ceil((this.resendCooldownMs - timeSinceLastResend) / 1000);
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: `Please wait ${waitSeconds} seconds before requesting another code.`,
            error: 'Too Many Requests',
            retryAfter: waitSeconds,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    // Record this resend timestamp
    if (!record) {
      this.ensureCapacity(resendKey);
      this.records.set(resendKey, { timestamps: [now] });
    } else {
      record.timestamps.push(now);
    }
  }

  /**
   * Enforces IP verification attempt frequency limits.
   */
  checkVerifyOtpLimit(ipAddress?: string): void {
    const now = Date.now();
    const clientIp = this.resolveClientIp(ipAddress);
    const verifyKey = `ip_verify:${clientIp}`;
    this.enforceSlidingWindow(verifyKey, this.ipVerifyPolicy, now, 'Too many verification attempts from this IP address. Please wait a moment before trying again.');
  }

  /**
   * Enforces IP rate limits for token refresh requests.
   */
  checkRefreshTokenLimit(ipAddress?: string): void {
    const now = Date.now();
    const clientIp = this.resolveClientIp(ipAddress);
    const refreshKey = `ip_refresh:${clientIp}`;
    this.enforceSlidingWindow(refreshKey, this.ipRefreshPolicy, now, 'Too many token refresh requests from this IP address. Please wait a moment before trying again.');
  }

  /**
   * Sliding window algorithm implementation.
   */
  private enforceSlidingWindow(key: string, policy: RateLimiterOptions, now: number, errorMessage: string): void {
    let record = this.records.get(key);
    if (!record) {
      this.ensureCapacity(key);
      record = { timestamps: [] };
      this.records.set(key, record);
    }

    // Prune timestamps outside current window
    const windowStart = now - policy.windowMs;
    record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

    if (record.timestamps.length >= policy.maxRequests) {
      const oldestValid = record.timestamps[0];
      const waitSeconds = Math.ceil((oldestValid + policy.windowMs - now) / 1000);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: errorMessage,
          error: 'Too Many Requests',
          retryAfter: waitSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Record current attempt
    record.timestamps.push(now);
  }

  /**
   * Prunes records that have no timestamps in the last 15 minutes.
   */
  private pruneStaleRecords(): void {
    const cutoff = Date.now() - 15 * 60 * 1000;
    for (const [key, record] of this.records.entries()) {
      record.timestamps = record.timestamps.filter((ts) => ts > cutoff);
      if (record.timestamps.length === 0) {
        this.records.delete(key);
      }
    }
  }

  /**
   * Clear all records (useful for test isolation).
   */
  reset(): void {
    this.records.clear();
  }
}
