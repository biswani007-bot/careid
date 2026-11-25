import { Controller, Get, Post, Query, NotFoundException, ForbiddenException, HttpCode, HttpStatus, Optional } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { SmsGatewayService } from '../../../notifications/infrastructure/sms-gateway.service';
import { AuthRateLimiterService } from '../../infrastructure/services/auth-rate-limiter.service';

@ApiTags('Test Support (Local Integration Sandbox Only)')
@Controller('test-support')
export class TestInboxController {
  constructor(
    private readonly smsGateway: SmsGatewayService,
    @Optional() private readonly rateLimiter?: AuthRateLimiterService,
  ) {}

  @Get('sms-inbox/latest')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retrieve the latest dynamic OTP from local test inbox (Integration Testing Only)' })
  @ApiQuery({ name: 'phone', description: 'Synthetic test phone number in E.164 format (e.g. +16505550003)' })
  async getLatestOtp(@Query('phone') phone: string) {
    if (!this.smsGateway.isTestInboxEnabled()) {
      throw new NotFoundException('Test SMS sandbox is disabled in this environment');
    }
    if (!phone) {
      throw new ForbiddenException('Phone parameter is required');
    }
    if (!this.smsGateway.isSyntheticTestPhone(phone)) {
      throw new ForbiddenException('Only synthetic test phone numbers (+1...555... or whitelisted test numbers) are allowed in sandbox');
    }
    const message = this.smsGateway.getLatestOtpForPhone(phone);
    if (!message) {
      throw new NotFoundException(`No test SMS message found for synthetic phone: ${phone}`);
    }
    return {
      success: true,
      statusCode: 200,
      data: {
        to: message.to,
        maskedPhone: message.maskedPhone,
        otpCode: message.otpCode,
        receivedAt: message.receivedAt.toISOString(),
        expiresAt: message.expiresAt.toISOString(),
      },
    };
  }

  @Post('sms-inbox/clear')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear the local test SMS sandbox inbox and reset rate limits' })
  async clearInbox() {
    if (!this.smsGateway.isTestInboxEnabled()) {
      throw new NotFoundException('Test SMS sandbox is disabled in this environment');
    }
    this.smsGateway.clearTestInbox();
    this.rateLimiter?.reset();
    return {
      success: true,
      statusCode: 200,
      message: 'Local test SMS sandbox and rate limits cleared',
    };
  }

  @Post('rate-limit/reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset all in-memory rate limits (Integration Testing Only)' })
  async resetRateLimits() {
    if (!this.smsGateway.isTestInboxEnabled()) {
      throw new NotFoundException('Test SMS sandbox is disabled in this environment');
    }
    this.rateLimiter?.reset();
    return {
      success: true,
      statusCode: 200,
      message: 'In-memory rate limits successfully reset',
    };
  }
}
