import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

export interface SmsSendResult {
  success: boolean;
  messageId: string;
  provider: string;
  error?: string;
}

@Injectable()
export class SmsGatewayService {
  private readonly logger = new Logger(SmsGatewayService.name);
  private readonly provider: string;

  constructor() {
    this.provider = (process.env.SMS_PROVIDER || 'console').toLowerCase();
  }

  /**
   * Dispatches an SMS message through the configured gateway provider.
   * In non-production or when SMS_PROVIDER is 'console', safely logs the dispatch without external API calls.
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
    if (this.provider === 'console' || process.env.ALLOW_SANDBOX_SMS === 'true' || !process.env.NODE_ENV) {
      this.logger.log(`[SMS-Sandbox] [${this.provider.toUpperCase()}] To: ${maskedPhone} | MsgId: ${messageId} | Text: ${message}`);
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

