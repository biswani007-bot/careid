import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { TestInboxController } from '../presentation/controllers/test-inbox.controller';
import { SmsGatewayService } from '../../notifications/infrastructure/sms-gateway.service';

describe('Local SMS Test Inbox & TestSupportController (Secure Local Testing)', () => {
  let controller: TestInboxController;
  let smsGateway: SmsGatewayService;
  const originalEnv = process.env;

  beforeEach(async () => {
    process.env = { ...originalEnv };
    process.env.NODE_ENV = 'development';
    process.env.APP_ENV = 'development';
    process.env.ENABLE_LOCAL_SMS_INBOX = 'true';

    smsGateway = new SmsGatewayService();
    controller = new TestInboxController(smsGateway);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Fail-Closed Production Protections', () => {
    it('should strictly disable the test inbox when NODE_ENV is production', async () => {
      process.env.NODE_ENV = 'production';
      expect(smsGateway.isTestInboxEnabled()).toBe(false);

      await expect(controller.getLatestOtp('+16505550003')).rejects.toThrow(NotFoundException);
      await expect(controller.clearInbox()).rejects.toThrow(NotFoundException);
    });

    it('should strictly disable the test inbox when ENABLE_LOCAL_SMS_INBOX is omitted or false', async () => {
      delete process.env.ENABLE_LOCAL_SMS_INBOX;
      expect(smsGateway.isTestInboxEnabled()).toBe(false);

      await expect(controller.getLatestOtp('+16505550003')).rejects.toThrow(NotFoundException);
    });

    it('should reject real/non-synthetic phone numbers with 403 Forbidden', async () => {
      const realPhone = '+14152345678'; // Non-555 real number
      expect(smsGateway.isSyntheticTestPhone(realPhone)).toBe(false);

      await expect(controller.getLatestOtp(realPhone)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Synthetic Test Phone Validation', () => {
    it('should recognize North American 555 fictitious test numbers as synthetic', () => {
      expect(smsGateway.isSyntheticTestPhone('+16505550003')).toBe(true);
      expect(smsGateway.isSyntheticTestPhone('+12125551234')).toBe(true);
      expect(smsGateway.isSyntheticTestPhone('+18005559999')).toBe(true);
    });

    it('should recognize explicitly allowlisted test numbers', () => {
      process.env.TEST_PHONE_NUMBERS = '+923001234567,+447700900123';
      expect(smsGateway.isSyntheticTestPhone('+923001234567')).toBe(true);
      expect(smsGateway.isSyntheticTestPhone('+447700900123')).toBe(true);
      expect(smsGateway.isSyntheticTestPhone('+923009999999')).toBe(false);
    });
  });

  describe('Dynamic OTP Capture & Retrieval', () => {
    it('should capture a dynamically generated OTP in the local inbox and retrieve it', async () => {
      const syntheticPhone = '+16505550003';
      const dynamicOtp = '849201';

      await smsGateway.sendOtpSms(syntheticPhone, dynamicOtp);

      const res = await controller.getLatestOtp(syntheticPhone);
      expect(res.success).toBe(true);
      expect(res.data.to).toBe(syntheticPhone);
      expect(res.data.otpCode).toBe(dynamicOtp);
      expect(res.data.maskedPhone).toBe('+165****03');
    });

    it('should clear test inbox on clear request', async () => {
      const syntheticPhone = '+16505550003';
      await smsGateway.sendOtpSms(syntheticPhone, '654321');

      const clearRes = await controller.clearInbox();
      expect(clearRes.success).toBe(true);

      await expect(controller.getLatestOtp(syntheticPhone)).rejects.toThrow(NotFoundException);
    });
  });
});
