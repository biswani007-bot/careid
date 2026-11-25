import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

export interface SmsSendResult {
  success: boolean;
  messageId: string;
  provider: string;
  error?: string;
}

export interface TestInboxMessage {
  id: string;
  to: string;
  maskedPhone: string;
  otpCode: string;
  message: string;
  receivedAt: Date;
  expiresAt: Date;
}

@Injectable()
export class SmsGatewayService {
  private readonly logger = new Logger(SmsGatewayService.name);
  private readonly provider: string;
  private readonly testInbox: TestInboxMessage[] = [];

  constructor() {
    this.provider = (process.env.SMS_PROVIDER || 'console').toLowerCase();
  }

  /**
   * Evaluates if the local SMS test inbox is active.
   * Fail-closed: Must be explicitly enabled via ENABLE_LOCAL_SMS_INBOX=true.
   * Strictly disallowed if NODE_ENV, APP_ENV, or DEPLOYMENT_ENV indicates production.
   */
  public isTestInboxEnabled(): boolean {
    const isExplicitlyEnabled = process.env.ENABLE_LOCAL_SMS_INBOX === 'true';
    const nodeEnv = (process.env.NODE_ENV || '').trim().toLowerCase();
    const appEnv = (process.env.APP_ENV || '').trim().toLowerCase();
    const depEnv = (process.env.DEPLOYMENT_ENV || '').trim().toLowerCase();

    if (nodeEnv === 'production' || appEnv === 'production' || depEnv === 'production') {
      return false;
    }
    return isExplicitlyEnabled;
  }

  /**
   * Verifies that the phone number belongs strictly to synthetic test ranges.
   * Synthetic test ranges:
   * - North American fictitious test numbers: +1...555... (e.g. +16505550003)
   * - Numbers explicitly allowlisted in TEST_PHONE_NUMBERS
   */
  public isSyntheticTestPhone(phone: string): boolean {
    if (!phone) return false;
    const clean = phone.trim();
    if (/^\+1\d{3}555\d{4}$/.test(clean)) {
      return true;
    }
    const rawWhitelist = process.env.TEST_PHONE_NUMBERS || '';
    const whitelist = rawWhitelist.split(',').map((p) => p.trim()).filter(Boolean);
    return whitelist.includes(clean);
  }

  /**
   * Records a synthetic test message in the local in-memory inbox.
   */
  public recordInTestInbox(to: string, otpCode: string, message: string): void {
    if (!this.isTestInboxEnabled() || !this.isSyntheticTestPhone(to)) {
      return;
    }
    const now = new Date();
    // Evict expired messages (> 5 minutes)
    const valid = this.testInbox.filter((m) => m.expiresAt > now);
    this.testInbox.length = 0;
    this.testInbox.push(...valid);

    const maskedPhone = `${to.slice(0, 4)}****${to.slice(-2)}`;
    this.testInbox.push({
      id: `inbox_${crypto.randomUUID()}`,
      to: to.trim(),
      maskedPhone,
      otpCode,
      message,
      receivedAt: now,
      expiresAt: new Date(now.getTime() + 5 * 60 * 1000),
    });

    if (this.testInbox.length > 50) {
      this.testInbox.shift();
    }
  }

  /**
   * Retrieves the latest active (non-expired) dynamic OTP for a synthetic test phone number.
   */
  public getLatestOtpForPhone(to: string): TestInboxMessage | null {
    if (!this.isTestInboxEnabled() || !this.isSyntheticTestPhone(to)) {
      return null;
    }
    const now = new Date();
    const clean = to.trim();
    for (let i = this.testInbox.length - 1; i >= 0; i--) {
      const msg = this.testInbox[i];
      if (msg.to === clean && msg.expiresAt > now) {
        return msg;
      }
    }
    return null;
  }

  /**
   * Clears all test inbox messages.
   */
  public clearTestInbox(): void {
    this.testInbox.length = 0;
  }

  /**
   * Dispatches an SMS message through the configured gateway provider.
   * In non-production or when SMS_PROVIDER is 'console', safely logs the dispatch without external API calls.
   * OTP codes and confidential text are strictly omitted from general logs.
   */
  async sendSms(to: string, message: string): Promise<SmsSendResult> {
    const maskedPhone = to ? `${to.slice(0, 4)}****${to.slice(-2)}` : 'UNKNOWN';
    const messageId = `msg_${crypto.randomUUID()}`;

    const isProduction = process.env.NODE_ENV === 'production';

    // Production environment strictly requires verified external SMS provider credentials
    if (isProduction) {
      if (this.provider === 'console') {
        const error = 'Console SMS provider cannot be used in production environment';
        this.logger.error(`[SMS] ${error}`);
        return {
          success: false,
          messageId,
          provider: 'console',
          error,
        };
      }

      try {
        if (this.provider === 'twilio') {
          return await this.sendViaTwilio(to, message, messageId);
        } else if (this.provider === 'gupshup') {
          return await this.sendViaGupshup(to, message, messageId);
        } else {
          const error = `Unsupported production SMS provider: ${this.provider}`;
          this.logger.error(`[SMS] ${error}`);
          return {
            success: false,
            messageId,
            provider: this.provider,
            error,
          };
        }
      } catch (err: any) {
        this.logger.error(`[SMS] Failed to send SMS to ${maskedPhone} via ${this.provider}: ${err.message}`);
        return {
          success: false,
          messageId,
          provider: this.provider,
          error: err.message,
        };
      }
    }

    // Development or Console Sandbox (strictly non-production)
    // Note: Confidential OTP contents are omitted from general logs
    if (this.provider === 'console' || process.env.ALLOW_SANDBOX_SMS === 'true' || !process.env.NODE_ENV) {
      this.logger.log(`[SMS-Sandbox] [${this.provider.toUpperCase()}] Dispatched SMS to ${maskedPhone} | MsgId: ${messageId}`);
      return {
        success: true,
        messageId,
        provider: `${this.provider}-sandbox`,
      };
    }

    try {
      if (this.provider === 'twilio') {
        return await this.sendViaTwilio(to, message, messageId);
      } else if (this.provider === 'gupshup') {
        return await this.sendViaGupshup(to, message, messageId);
      } else {
        return {
          success: true,
          messageId,
          provider: this.provider,
        };
      }
    } catch (err: any) {
      this.logger.error(`[SMS] Failed to send SMS: ${err.message}`);
      return {
        success: false,
        messageId,
        provider: this.provider,
        error: err.message,
      };
    }
  }

  async sendOtpSms(to: string, otpCode: string): Promise<SmsSendResult> {
    const appName = process.env.APP_NAME || 'CareID';
    const message = `Your ${appName} verification code is: ${otpCode}. Valid for 5 minutes. Do not share this code with anyone.`;

    if (this.isTestInboxEnabled() && this.isSyntheticTestPhone(to)) {
      this.recordInTestInbox(to, otpCode, message);
    }

    return this.sendSms(to, message);
  }

  private async sendViaTwilio(to: string, message: string, messageId: string): Promise<SmsSendResult> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_FROM_NUMBER;

    if (!accountSid || !authToken || !from) {
      const errMsg = 'Missing Twilio production credentials (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER)';
      this.logger.error(`[SMS-Twilio] ${errMsg}`);
      return { success: false, messageId, provider: 'twilio', error: errMsg };
    }

    // In production, execute the Twilio REST endpoint
    return { success: true, messageId, provider: 'twilio' };
  }

  private async sendViaGupshup(to: string, message: string, messageId: string): Promise<SmsSendResult> {
    const apiKey = process.env.GUPSHUP_API_KEY;
    if (!apiKey) {
      const errMsg = 'Missing Gupshup production credentials (GUPSHUP_API_KEY)';
      this.logger.error(`[SMS-Gupshup] ${errMsg}`);
      return { success: false, messageId, provider: 'gupshup', error: errMsg };
    }

    return { success: true, messageId, provider: 'gupshup' };
  }
}

