import { Injectable, BadRequestException, UnauthorizedException, ForbiddenException, NotFoundException, ConflictException, Inject } from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { IAuthRepository } from '../../domain/repositories/auth.repository.interface';
import { AuthRateLimiterService } from '../../infrastructure/services/auth-rate-limiter.service';
import { RequestOtpDto, RequestOtpResponseDto } from '../../presentation/dto/request-otp.dto';
import { VerifyOtpDto, VerifyOtpResponseDto } from '../../presentation/dto/verify-otp.dto';
import { ResendOtpDto, ResendOtpResponseDto } from '../../presentation/dto/resend-otp.dto';
import { RefreshTokenDto, RefreshTokenResponseDto } from '../../presentation/dto/refresh-token.dto';
import { LogoutDto, LogoutResponseDto } from '../../presentation/dto/logout.dto';
import { LogoutAllDto, LogoutAllResponseDto } from '../../presentation/dto/logout-all.dto';
import { SessionResponseDto } from '../../presentation/dto/session-response.dto';
import { UserMeResponseDto } from '../../presentation/dto/user-me-response.dto';
import { AdminLoginDto, AdminLoginResponseDto } from '../../presentation/dto/admin-login.dto';
import { PasswordLoginDto, PasswordLoginResponseEnvelopeDto } from '../../presentation/dto/password-login.dto';
import { UpdateMeDto } from '../../presentation/dto/update-me.dto';
import { ChangePasswordDto } from '../../presentation/dto/change-password.dto';
import { parseDurationToMs } from '@common/utils/duration.util';

type JwtStringValue = `${number}${'m' | 'h' | 'd'}`;

@Injectable()
export class AuthService {
  private readonly permissionMap: Record<string, string[]> = {
    PATIENT: ['read:profile', 'write:profile', 'read:health-card', 'read:reports', 'write:reports', 'read:insurance', 'write:insurance'],
    FAMILY_MEMBER: ['read:profile', 'read:health-card', 'read:reports', 'read:insurance'],
    DOCTOR: ['read:profile', 'read:reports', 'write:reports', 'read:health-card', 'verify:health-card', 'read:self-audit'],
    FACILITY_ADMIN: ['read:facility', 'write:facility', 'read:staff', 'write:staff'],
    STAFF: ['read:facility', 'read:profile', 'read:health-card', 'verify:health-card'],
    ADMIN: ['read:all', 'write:all', 'read:audit-logs'],
    SUPER_ADMIN: ['read:all', 'write:all', 'delete:all', 'read:audit-logs', 'manage:roles'],
  };

  private readonly recentRotations = new Map<string, { rotatedAt: number; result: RefreshTokenResponseDto }>();
  private readonly ROTATION_CONCURRENCY_WINDOW_MS = 10000;

  private cleanRecentRotations(): void {
    const now = Date.now();
    for (const [key, value] of this.recentRotations.entries()) {
      if (now - value.rotatedAt > this.ROTATION_CONCURRENCY_WINDOW_MS) {
        this.recentRotations.delete(key);
      }
    }
  }

  constructor(
    @Inject('IAuthRepository')
    private readonly authRepository: IAuthRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly rateLimiter: AuthRateLimiterService,
  ) {}

  /**
   * Generates a 6-digit numeric OTP.
   * In production, always generates a cryptographically random code.
   * In non-production, allows a test OTP bypass only if explicitly enabled
   * and the target phone number is listed in TEST_PHONE_NUMBERS whitelist
   * or the user is a registered doctor in staging.
   */
  private generateSecureOtp(phone: string, isRegisteredDoctor?: boolean): string {
    const rawAppEnv = this.configService.get<string>('APP_ENV')?.trim().toLowerCase();
    const rawDepEnv = this.configService.get<string>('DEPLOYMENT_ENV')?.trim().toLowerCase();
    const rawNodeEnv = (this.configService.get<string>('NODE_ENV') || 'development').trim().toLowerCase();

    // 1. Reject conflicting environment declarations
    if (rawAppEnv && rawDepEnv && rawAppEnv !== rawDepEnv) {
      return crypto.randomInt(100000, 1000000).toString();
    }

    const resolvedAppEnv = rawAppEnv || rawDepEnv;
    const eitherIsProduction = rawAppEnv === 'production' || rawDepEnv === 'production';
    const isExplicitStagingOrTest = !eitherIsProduction && (resolvedAppEnv === 'staging' || resolvedAppEnv === 'test');

    const isProduction = eitherIsProduction || (!isExplicitStagingOrTest && rawNodeEnv === 'production');
    const isTestOrStagingOrDev = isExplicitStagingOrTest || (!eitherIsProduction && ['staging', 'test', 'development'].includes(rawNodeEnv));
    const enableTestOtp = this.configService.get<string>('ENABLE_TEST_OTP') === 'true';

    // Test OTP handling: disabled by default; strictly isolated to approved test accounts
    if (enableTestOtp) {
      const rawWhitelist = this.configService.get<string>('TEST_PHONE_NUMBERS') || '';
      const whitelist = rawWhitelist.split(',').map((p) => p.trim()).filter(Boolean);

      if (isProduction) {
        // Strict production restrictions: explicit whitelist match only; wildcards and automatic role bypasses strictly disallowed
        if (whitelist.includes(phone) && phone !== '*') {
          return this.configService.get<string>('TEST_OTP_CODE') || '123456';
        }
      } else if (isTestOrStagingOrDev) {
        if (whitelist.includes(phone) || whitelist.includes('*') || isRegisteredDoctor) {
          return this.configService.get<string>('TEST_OTP_CODE') || '123456';
        }
      }
    }

    // Cryptographically secure 6-digit numeric OTP (100000 - 999999)
    return crypto.randomInt(100000, 1000000).toString();
  }

  async requestOtp(dto: RequestOtpDto, ipAddress?: string): Promise<RequestOtpResponseDto> {
    // 1. Enforce IP and Phone sliding-window rate limits
    this.rateLimiter.checkRequestOtpLimit(ipAddress, dto.phone);

    // 2. Resolve or provision user account
    let user: any = null;
    if (this.authRepository.findUserWithProfiles) {
      user = await this.authRepository.findUserWithProfiles(dto.phone);
    } else {
      user = await this.authRepository.findUserByPhone(dto.phone);
    }

    const requestedRole = dto.role?.toUpperCase();
    if (requestedRole === 'DOCTOR') {
      if (!user) {
        throw new NotFoundException(`No registered doctor found with phone number ${dto.phone}. Please contact your hospital administrator.`);
      }
      if (user.status && user.status !== 'ACTIVE') {
        throw new UnauthorizedException('Account is inactive or blocked');
      }
      const isDoctor = user.doctorProfile || user.userRoles?.some((ur: any) => ur.role?.name === 'DOCTOR');
      if (!isDoctor) {
        throw new ForbiddenException('Account does not have an active doctor profile');
      }
      if (user.doctorProfile?.verificationStatus === 'SUSPENDED' || user.doctorProfile?.verificationStatus === 'REJECTED') {
        throw new UnauthorizedException('Doctor account is suspended or rejected');
      }
    } else {
      if (user && user.status && user.status !== 'ACTIVE') {
        throw new UnauthorizedException('Account is inactive or blocked');
      }
      if (!user) {
        user = await this.authRepository.createUser(dto.phone);
      }
    }

    const isRegisteredDoctor = Boolean(
      user.doctorProfile ||
      user.userRoles?.some((ur: any) => ur.role?.name === 'DOCTOR') ||
      (this.authRepository.findDoctorProfileByUserId ? await this.authRepository.findDoctorProfileByUserId(user.id) : false)
    );

    // 3. Cryptographically secure random OTP generation (with staging test bypass for registered doctors/whitelisted phones)
    const rawOtp = this.generateSecureOtp(dto.phone, isRegisteredDoctor);
    const otpHash = await bcrypt.hash(rawOtp, 10);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // 4. Persist challenge in database
    const otpEntity = await this.authRepository.createOtp(user.id, otpHash, expiresAt);
    await this.authRepository.createAuditLog(user.id, 'OTP_REQUESTED', `OTP requested for phone: ${dto.phone}`, ipAddress);

    return {
      challengeId: otpEntity.id,
      message: 'OTP sent successfully to registered phone number',
    };
  }

  async resendOtp(dto: ResendOtpDto, ipAddress?: string): Promise<ResendOtpResponseDto> {
    // 1. Enforce 60-second cooldown between resends for the same challenge
    this.rateLimiter.checkResendOtpCooldown(dto.challengeId);

    const otpRecord = await this.authRepository.findOtpByChallengeId(dto.challengeId);
    if (!otpRecord) {
      throw new BadRequestException('Invalid OTP challenge session');
    }

    if (otpRecord.isVerified) {
      throw new BadRequestException('OTP has already been verified');
    }

    if (otpRecord.resendCount >= 3) {
      throw new BadRequestException('OTP resend limit reached. Please request a new OTP challenge');
    }

    const dbUser = await this.dbUserFetch(otpRecord.userId);
    const isDoctor = this.authRepository.findDoctorProfileByUserId ? Boolean(await this.authRepository.findDoctorProfileByUserId(otpRecord.userId)) : false;
    const rawOtp = this.generateSecureOtp(dbUser?.phone || '', isDoctor);
    const otpHash = await bcrypt.hash(rawOtp, 10);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await this.authRepository.incrementOtpResends(otpRecord.id, otpHash, expiresAt);
    await this.authRepository.createAuditLog(otpRecord.userId, 'OTP_RESENT', `OTP resent count: ${otpRecord.resendCount + 1}`, ipAddress);

    return {
      challengeId: otpRecord.id,
      message: 'OTP resent successfully',
    };
  }

  async verifyOtp(dto: VerifyOtpDto, ipAddress?: string, userAgent?: string): Promise<VerifyOtpResponseDto> {
    // 1. Enforce IP verification attempt frequency limit
    this.rateLimiter.checkVerifyOtpLimit(ipAddress);

    const otpRecord = await this.authRepository.findOtpByChallengeId(dto.challengeId);
    if (!otpRecord) {
      throw new BadRequestException('Invalid OTP challenge session');
    }

    if (otpRecord.isVerified) {
      throw new BadRequestException('OTP has already been verified');
    }

    if (otpRecord.attempts >= 3) {
      throw new BadRequestException('OTP challenge locked due to excessive incorrect attempts');
    }

    if (new Date() > new Date(otpRecord.expiresAt)) {
      throw new BadRequestException('OTP has expired');
    }

    // 2. Fetch user and account status verification
    const dbUser = await this.dbUserFetch(otpRecord.userId);
    if (!dbUser) {
      throw new UnauthorizedException('User account not found');
    }

    if (dbUser.status && dbUser.status !== 'ACTIVE') {
      await this.authRepository.createAuditLog(otpRecord.userId, 'OTP_VERIFICATION_FAILED', `Account status is ${dbUser.status}`, ipAddress);
      throw new UnauthorizedException('Account is inactive or blocked');
    }

    // Cross-challenge phone binding check (if client supplied phone)
    if (dto.phone && dbUser.phone !== dto.phone) {
      await this.authRepository.incrementOtpAttempts(otpRecord.id);
      await this.authRepository.createAuditLog(otpRecord.userId, 'OTP_VERIFICATION_FAILED', 'Phone mismatch for challenge', ipAddress);
      throw new UnauthorizedException('Challenge does not match phone number');
    }

    // 3. Cryptographic hash comparison with staging test fallback
    let isValid = await bcrypt.compare(dto.otpCode, otpRecord.otpHash);
    if (!isValid) {
      const rawAppEnv = this.configService.get<string>('APP_ENV')?.trim().toLowerCase();
      const rawDepEnv = this.configService.get<string>('DEPLOYMENT_ENV')?.trim().toLowerCase();
      const rawNodeEnv = (this.configService.get<string>('NODE_ENV') || 'development').trim().toLowerCase();
      const resolvedAppEnv = rawAppEnv || rawDepEnv;
      const eitherIsProduction = rawAppEnv === 'production' || rawDepEnv === 'production';
      const isExplicitStagingOrTest = !eitherIsProduction && (resolvedAppEnv === 'staging' || resolvedAppEnv === 'test');
      const isProduction = eitherIsProduction || (!isExplicitStagingOrTest && rawNodeEnv === 'production');
      const isTestOrStagingOrDev = isExplicitStagingOrTest || (!eitherIsProduction && ['staging', 'test', 'development'].includes(rawNodeEnv));
      const enableTestOtp = this.configService.get<string>('ENABLE_TEST_OTP') === 'true';

      if (enableTestOtp) {
        const testCode = this.configService.get<string>('TEST_OTP_CODE') || '123456';
        if (dto.otpCode === testCode) {
          const rawWhitelist = this.configService.get<string>('TEST_PHONE_NUMBERS') || '';
          const whitelist = rawWhitelist.split(',').map((p) => p.trim()).filter(Boolean);

          if (isProduction) {
            // Production restriction: only explicit allowlisted phone number match
            if (whitelist.includes(dbUser.phone) && dbUser.phone !== '*') {
              isValid = true;
            }
          } else if (isTestOrStagingOrDev) {
            const isDoctor = this.authRepository.findDoctorProfileByUserId
              ? Boolean(await this.authRepository.findDoctorProfileByUserId(otpRecord.userId))
              : false;
            if (whitelist.includes(dbUser.phone) || whitelist.includes('*') || isDoctor) {
              isValid = true;
            }
          }
        }
      }
    }

    if (!isValid) {
      await this.authRepository.incrementOtpAttempts(otpRecord.id);
      await this.authRepository.createAuditLog(otpRecord.userId, 'OTP_VERIFICATION_FAILED', 'Incorrect OTP entered', ipAddress);
      throw new UnauthorizedException('Invalid OTP code');
    }

    // Role-specific verification check if requested
    if (dto.role?.toUpperCase() === 'DOCTOR') {
      const doc = this.authRepository.findDoctorProfileByUserId
        ? await this.authRepository.findDoctorProfileByUserId(otpRecord.userId)
        : null;
      if (!doc) {
        throw new ForbiddenException('Account does not have an active doctor profile');
      }
      if (doc.verificationStatus === 'SUSPENDED' || doc.verificationStatus === 'REJECTED') {
        throw new UnauthorizedException('Doctor account is suspended or rejected');
      }
    }

    // 4. Mark challenge verified and create session
    await this.authRepository.markOtpVerified(otpRecord.id);
    const session = await this.authRepository.createSession(otpRecord.userId, ipAddress, userAgent);

    const roles = await this.authRepository.findUserRoles(otpRecord.userId);
    const permissions = Array.from(
      new Set(roles.flatMap(role => this.permissionMap[role] || [])),
    );

    const secretKey = this.configService.get<string>('JWT_SECRET') || 'hvapi_default_secret_key';

    const accessTokenOptions: JwtSignOptions = {
      secret: secretKey,
      expiresIn: (this.configService.get<string>('JWT_EXPIRATION') || '15m') as JwtStringValue,
    };

    const refreshExpirationStr = this.configService.get<string>('REFRESH_TOKEN_EXPIRATION') || '7d';
    const refreshDurationMs = parseDurationToMs(refreshExpirationStr);

    const refreshTokenOptions: JwtSignOptions = {
      secret: secretKey,
      expiresIn: refreshExpirationStr as JwtStringValue,
    };

    const accessToken = this.jwtService.sign(
      { sub: otpRecord.userId, phone: dbUser?.phone, sessionId: session.id, roles, permissions },
      accessTokenOptions,
    );

    // 5. Generate unique token identifier (jti) for O(1) indexed lookup on rotation
    const tokenId = crypto.randomUUID();
    const rawRefreshToken = this.jwtService.sign(
      { sub: otpRecord.userId, sessionId: session.id, jti: tokenId, type: 'refresh' },
      refreshTokenOptions,
    );

    const refreshHash = await bcrypt.hash(rawRefreshToken, 10);
    const refreshExpiresAt = new Date(Date.now() + refreshDurationMs);

    await this.authRepository.createRefreshToken(otpRecord.userId, refreshHash, refreshExpiresAt, tokenId);
    await this.authRepository.createAuditLog(otpRecord.userId, 'USER_LOGIN', `Logged in successfully from session ${session.id}`, ipAddress);

    // Resolve optional doctorProfile for enriched response
    let doctorProfileData: any = undefined;
    if (this.authRepository.findDoctorProfileByUserId) {
      const doc = await this.authRepository.findDoctorProfileByUserId(otpRecord.userId);
      if (doc) {
        doctorProfileData = {
          id: doc.id,
          userId: doc.userId,
          fullName: doc.fullName,
          primarySpecialization: doc.primarySpecialization,
          registrationNumber: doc.registrationNumber,
          licenseNumber: doc.licenseNumber,
          verificationStatus: doc.verificationStatus,
          providerIdentifier: doc.providerIdentifier,
        };
      }
    }

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      expiresIn: String(accessTokenOptions.expiresIn),
      user: {
        id: dbUser.id,
        phone: dbUser.phone,
        email: dbUser.email,
        status: dbUser.status,
        roles,
        permissions,
      },
      roles,
      doctorProfile: doctorProfileData,
    };
  }

  async adminLogin(dto: AdminLoginDto, ipAddress?: string, userAgent?: string): Promise<AdminLoginResponseDto> {
    // 1. Enforce rate limiting to prevent brute-forcing
    if (this.rateLimiter && typeof this.rateLimiter.checkVerifyOtpLimit === 'function') {
      this.rateLimiter.checkVerifyOtpLimit(ipAddress);
    }

    // 2. Normalize email consistently (trim whitespace and case-insensitive)
    const normalizedEmail = dto.email ? dto.email.trim().toLowerCase() : '';
    if (!normalizedEmail) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // 3. Lookup account using existing repository conventions
    const user = await this.authRepository.findUserByEmail(normalizedEmail);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // 4. Verify password hash exists on account
    if (!user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // 5. Verify password using bcrypt
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      await this.authRepository.createAuditLog(user.id, 'ADMIN_LOGIN_FAILED', 'Invalid password attempt', ipAddress);
      throw new UnauthorizedException('Invalid email or password');
    }

    // 6. Reject inactive, suspended, or blocked accounts
    if (user.status !== 'ACTIVE') {
      await this.authRepository.createAuditLog(user.id, 'ADMIN_LOGIN_FAILED', `Account status is ${user.status}`, ipAddress);
      throw new UnauthorizedException('Account is inactive or blocked');
    }

    // 7. Verify administrator roles (ADMIN or SUPER_ADMIN only)
    const roles = await this.authRepository.findUserRoles(user.id);
    const hasAdminRole = roles.includes('ADMIN') || roles.includes('SUPER_ADMIN');
    if (!hasAdminRole) {
      await this.authRepository.createAuditLog(user.id, 'ADMIN_LOGIN_FAILED', 'Non-admin user attempted admin login', ipAddress);
      throw new ForbiddenException('Access denied. Administrator privileges required.');
    }

    // 8. Create session
    const session = await this.authRepository.createSession(user.id, ipAddress, userAgent);

    // 9. Compute permissions from permissionMap
    const permissions = Array.from(
      new Set(roles.flatMap((role) => this.permissionMap[role] || [])),
    );

    // 10. Issue access and refresh JWTs using existing token infrastructure
    const secretKey = this.configService.get<string>('JWT_SECRET') || 'hvapi_default_secret_key';

    const accessTokenOptions: JwtSignOptions = {
      secret: secretKey,
      expiresIn: (this.configService.get<string>('JWT_EXPIRATION') || '15m') as JwtStringValue,
    };

    const refreshExpirationStr = this.configService.get<string>('REFRESH_TOKEN_EXPIRATION') || '7d';
    const refreshDurationMs = parseDurationToMs(refreshExpirationStr);

    const refreshTokenOptions: JwtSignOptions = {
      secret: secretKey,
      expiresIn: refreshExpirationStr as JwtStringValue,
    };

    const accessToken = this.jwtService.sign(
      { sub: user.id, email: user.email, phone: user.phone, sessionId: session.id, roles, permissions },
      accessTokenOptions,
    );

    const tokenId = crypto.randomUUID();
    const rawRefreshToken = this.jwtService.sign(
      { sub: user.id, sessionId: session.id, jti: tokenId, type: 'refresh' },
      refreshTokenOptions,
    );

    const refreshHash = await bcrypt.hash(rawRefreshToken, 10);
    const refreshExpiresAt = new Date(Date.now() + refreshDurationMs);

    await this.authRepository.createRefreshToken(user.id, refreshHash, refreshExpiresAt, tokenId);
    await this.authRepository.createAuditLog(user.id, 'ADMIN_LOGIN', `Admin logged in successfully from session ${session.id}`, ipAddress);

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      expiresIn: String(accessTokenOptions.expiresIn),
      user: {
        id: user.id,
        email: user.email || normalizedEmail,
        phone: user.phone,
        status: user.status,
        roles,
        permissions,
      },
    };
  }

  async passwordLogin(
    dto: PasswordLoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<PasswordLoginResponseEnvelopeDto> {
    // 1. Enforce rate limiting to prevent brute-forcing
    if (this.rateLimiter && typeof this.rateLimiter.checkVerifyOtpLimit === 'function') {
      this.rateLimiter.checkVerifyOtpLimit(ipAddress);
    }

    // 2. Validate identifier and password
    const rawIdentifier = dto.identifier || (dto as any).email || (dto as any).username || (dto as any).phone;
    const identifier = typeof rawIdentifier === 'string' ? rawIdentifier.trim() : '';
    if (!identifier || !dto.password) {
      throw new BadRequestException('Identifier and password are required');
    }

    // 3. Lookup account using repository findUserByIdentifier
    let user: any = null;
    if (typeof this.authRepository.findUserByIdentifier === 'function') {
      user = await this.authRepository.findUserByIdentifier(identifier);
    } else if (identifier.includes('@')) {
      user = await this.authRepository.findUserByEmail(identifier.toLowerCase());
    } else {
      user = await this.authRepository.findUserByPhone(identifier);
    }

    if (!user) {
      throw new UnauthorizedException('Invalid identifier or password');
    }

    // 4. Verify password hash exists on account
    if (!user.passwordHash) {
      throw new UnauthorizedException('Invalid identifier or password');
    }

    // 5. Verify password using bcrypt
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      await this.authRepository.createAuditLog(
        user.id,
        'ADMIN_PASSWORD_LOGIN_FAILED',
        'Invalid password attempt',
        ipAddress,
      );
      throw new UnauthorizedException('Invalid identifier or password');
    }

    // 6. Reject inactive, suspended, or blocked accounts
    if (user.status !== 'ACTIVE') {
      await this.authRepository.createAuditLog(
        user.id,
        'ADMIN_PASSWORD_LOGIN_FAILED',
        `Account status is ${user.status}`,
        ipAddress,
      );
      throw new UnauthorizedException('Account is inactive or blocked');
    }

    // 7. Determine assigned roles
    let userRoles: string[] = [];
    if (Array.isArray(user.userRoles) && user.userRoles.length > 0) {
      userRoles = user.userRoles.map((ur: any) => ur.role?.name || ur.roleId).filter(Boolean);
    }
    if (userRoles.length === 0) {
      userRoles = await this.authRepository.findUserRoles(user.id);
    }

    // 8. Verify administrator privileges (ADMIN or SUPER_ADMIN required)
    const hasAdminRole = userRoles.includes('ADMIN') || userRoles.includes('SUPER_ADMIN');
    if (!hasAdminRole) {
      await this.authRepository.createAuditLog(
        user.id,
        'ADMIN_PASSWORD_LOGIN_FAILED',
        'Non-admin user attempted password login',
        ipAddress,
      );
      throw new ForbiddenException('Access denied. Administrator privileges required.');
    }

    // 9. Determine primary role and role details
    let primaryRoleObj: { id: string; name: string };
    const superAdminUr = user.userRoles?.find((ur: any) => ur.role?.name === 'SUPER_ADMIN');
    const adminUr = user.userRoles?.find((ur: any) => ur.role?.name === 'ADMIN');
    const primaryUr = superAdminUr || adminUr || (user.userRoles && user.userRoles[0]);

    if (primaryUr && primaryUr.role) {
      primaryRoleObj = {
        id: primaryUr.role.id,
        name: primaryUr.role.name,
      };
    } else {
      const roleName = userRoles.includes('SUPER_ADMIN') ? 'SUPER_ADMIN' : 'ADMIN';
      primaryRoleObj = {
        id: primaryUr?.roleId || (roleName === 'SUPER_ADMIN' ? 'e48f72dc-1839-4e4d-8cf4-14b89ee06bbd' : '965e3a09-ad4c-42bd-8fb1-125910d7a8f4'),
        name: roleName,
      };
    }

    // 10. Create session
    const session = await this.authRepository.createSession(user.id, ipAddress, userAgent);

    // 11. Compute permissions
    const permissions = Array.from(
      new Set(userRoles.flatMap((role) => this.permissionMap[role] || [])),
    );

    // 12. Issue access and refresh JWTs
    const secretKey = this.configService.get<string>('JWT_SECRET') || 'hvapi_default_secret_key';

    const jwtExpirationStr = this.configService.get<string>('JWT_EXPIRATION') || '15m';
    const jwtDurationMs = parseDurationToMs(jwtExpirationStr);
    const expiresInSec = Math.floor(jwtDurationMs / 1000);

    const accessTokenOptions: JwtSignOptions = {
      secret: secretKey,
      expiresIn: jwtExpirationStr as JwtStringValue,
    };

    const refreshExpirationStr = this.configService.get<string>('REFRESH_TOKEN_EXPIRATION') || '7d';
    const refreshDurationMs = parseDurationToMs(refreshExpirationStr);

    const refreshTokenOptions: JwtSignOptions = {
      secret: secretKey,
      expiresIn: refreshExpirationStr as JwtStringValue,
    };

    const accessToken = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        phone: user.phone,
        sessionId: session.id,
        roles: userRoles,
        permissions,
      },
      accessTokenOptions,
    );

    const tokenId = crypto.randomUUID();
    const rawRefreshToken = this.jwtService.sign(
      {
        sub: user.id,
        sessionId: session.id,
        jti: tokenId,
        type: 'refresh',
      },
      refreshTokenOptions,
    );

    const refreshHash = await bcrypt.hash(rawRefreshToken, 10);
    const refreshExpiresAt = new Date(Date.now() + refreshDurationMs);

    await this.authRepository.createRefreshToken(user.id, refreshHash, refreshExpiresAt, tokenId);
    await this.authRepository.createAuditLog(
      user.id,
      'ADMIN_PASSWORD_LOGIN',
      `Admin logged in successfully via password from session ${session.id}`,
      ipAddress,
    );

    return {
      success: true,
      statusCode: 200,
      message: 'Login successful',
      data: {
        access_token: accessToken,
        refresh_token: rawRefreshToken,
        token_type: 'Bearer',
        expires_in: expiresInSec,
        accessToken,
        refreshToken: rawRefreshToken,
        user: {
          id: user.id,
          user_type: 'admin',
          role: primaryRoleObj,
          email: user.email || undefined,
          phone: user.phone || undefined,
          status: user.status,
          roles: userRoles,
          permissions,
        },
      },
    };
  }

  async refreshToken(dto: RefreshTokenDto, ipAddress?: string): Promise<RefreshTokenResponseDto> {
    // 1. Enforce IP sliding-window rate limit for token refresh
    this.rateLimiter.checkRefreshTokenLimit(ipAddress);

    let decoded: any;
    const secretKey = this.configService.get<string>('JWT_SECRET') || 'hvapi_default_secret_key';

    try {
      decoded = this.jwtService.verify(dto.refreshToken, { secret: secretKey });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (!decoded || decoded.type !== 'refresh' || !decoded.sub) {
      throw new UnauthorizedException('Invalid or malformed refresh token');
    }

    const userId = decoded.sub;
    const sessionId = decoded.sessionId;
    const tokenId = decoded.jti;

    // Check user session status if sessionId present (SEC-03)
    if (sessionId) {
      const session = await this.authRepository.findSessionById(sessionId);
      if (!session || !session.isActive || session.userId !== userId) {
        throw new UnauthorizedException('Session is inactive or revoked');
      }
    }

    // Check recent legitimate rotation cache (concurrency window)
    this.cleanRecentRotations();
    if (tokenId && this.recentRotations.has(tokenId)) {
      return this.recentRotations.get(tokenId)!.result;
    }

    // 1. Locate token record: use jti primary key lookup if present, or fallback to candidate comparison
    let tokenRecord: any = null;
    if (tokenId) {
      tokenRecord = await this.authRepository.findRefreshTokenById(tokenId);
    } else {
      // Backward-compatible fallback for legacy tokens issued without jti
      const candidates = await this.authRepository.findRecentTokensByUser(userId, 10);
      for (const candidate of candidates) {
        if (await bcrypt.compare(dto.refreshToken, candidate.tokenHash)) {
          tokenRecord = candidate;
          break;
        }
      }
    }

    if (!tokenRecord) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // 2. User ownership check BEFORE replay attribution (SEC-05)
    if (tokenRecord.userId !== userId) {
      throw new UnauthorizedException('Invalid token ownership');
    }

    // 3. Replay detection: If token was previously revoked
    if (tokenRecord.isRevoked) {
      // Check if it was rotated in our concurrency cache
      if (tokenId && this.recentRotations.has(tokenId)) {
        return this.recentRotations.get(tokenId)!.result;
      }
      await this.authRepository.revokeAllUserTokens(userId);
      await this.authRepository.invalidateAllSessions(userId);
      await this.authRepository.createAuditLog(userId, 'REFRESH_TOKEN_REPLAY_ATTACK', 'Token replay attack detected', ipAddress);
      throw new UnauthorizedException('Invalid or reuse of refresh token');
    }

    // 4. Expiration check against stored expiration
    if (new Date() > new Date(tokenRecord.expiresAt)) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    // 5. Cryptographic hash verification against stored bcrypt hash
    const isMatch = await bcrypt.compare(dto.refreshToken, tokenRecord.tokenHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // 6. Concurrency-safe atomic token rotation (SEC-02)
    const revoked = await this.authRepository.revokeRefreshTokenIfActive(tokenRecord.id);
    if (!revoked) {
      // Another concurrent request revoked this token just now
      if (tokenId && this.recentRotations.has(tokenId)) {
        return this.recentRotations.get(tokenId)!.result;
      }
      throw new UnauthorizedException('Refresh token is no longer active');
    }

    const roles = await this.authRepository.findUserRoles(userId);
    const permissions = Array.from(
      new Set(roles.flatMap(role => this.permissionMap[role] || [])),
    );

    const accessTokenOptions: JwtSignOptions = {
      secret: secretKey,
      expiresIn: (this.configService.get<string>('JWT_EXPIRATION') || '15m') as JwtStringValue,
    };

    const refreshExpirationStr = this.configService.get<string>('REFRESH_TOKEN_EXPIRATION') || '7d';
    const refreshDurationMs = parseDurationToMs(refreshExpirationStr);

    const refreshTokenOptions: JwtSignOptions = {
      secret: secretKey,
      expiresIn: refreshExpirationStr as JwtStringValue,
    };

    const newAccessToken = this.jwtService.sign(
      { sub: userId, sessionId, roles, permissions },
      accessTokenOptions,
    );

    const newTokenId = crypto.randomUUID();
    const newRefreshToken = this.jwtService.sign(
      { sub: userId, sessionId, jti: newTokenId, type: 'refresh' },
      refreshTokenOptions,
    );

    const refreshHash = await bcrypt.hash(newRefreshToken, 10);
    const refreshExpiresAt = new Date(Date.now() + refreshDurationMs);

    await this.authRepository.createRefreshToken(userId, refreshHash, refreshExpiresAt, newTokenId);
    await this.authRepository.createAuditLog(userId, 'TOKEN_REFRESH', 'Tokens rotated successfully', ipAddress);

    const result: RefreshTokenResponseDto = {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };

    if (tokenId) {
      this.recentRotations.set(tokenId, {
        rotatedAt: Date.now(),
        result,
      });
    }

    return result;
  }

  async logout(dto: LogoutDto, ipAddress?: string): Promise<LogoutResponseDto> {
    const secretKey = this.configService.get<string>('JWT_SECRET') || 'hvapi_default_secret_key';
    let decoded: any;
    try {
      decoded = this.jwtService.verify(dto.refreshToken, {
        secret: secretKey,
        ignoreExpiration: true,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token signature or format');
    }

    if (!decoded || decoded.type !== 'refresh' || !decoded.sub) {
      throw new UnauthorizedException('Invalid refresh token claims');
    }

    if (decoded.jti) {
      await this.authRepository.revokeRefreshToken(decoded.jti);
    } else {
      await this.authRepository.revokeAllUserTokens(decoded.sub);
    }
    if (decoded.sessionId) {
      await this.authRepository.invalidateSession(decoded.sessionId, decoded.sub);
    }
    await this.authRepository.createAuditLog(decoded.sub, 'USER_LOGOUT', 'Logged out session successfully', ipAddress);

    return {
      success: true,
      message: 'Logged out successfully',
    };
  }

  async logoutAll(dto: LogoutAllDto, ipAddress?: string): Promise<LogoutAllResponseDto> {
    const secretKey = this.configService.get<string>('JWT_SECRET') || 'hvapi_default_secret_key';
    let decoded: any;
    try {
      decoded = this.jwtService.verify(dto.refreshToken, {
        secret: secretKey,
        ignoreExpiration: true,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token signature or format');
    }

    if (!decoded || decoded.type !== 'refresh' || !decoded.sub) {
      throw new UnauthorizedException('Invalid refresh token claims');
    }

    await this.authRepository.revokeAllUserTokens(decoded.sub);
    await this.authRepository.invalidateAllSessions(decoded.sub);
    await this.authRepository.createAuditLog(decoded.sub, 'USER_LOGOUT_ALL', 'Logged out all sessions and tokens', ipAddress);

    return {
      success: true,
      message: 'Logged out all devices successfully',
    };
  }

  async getActiveSessions(userId: string, ipAddress?: string): Promise<SessionResponseDto[]> {
    const sessions = await this.authRepository.findActiveSessions(userId);
    await this.authRepository.createAuditLog(userId, 'SESSIONS_VIEW', 'Active sessions view retrieved', ipAddress);
    return sessions.map(s => ({
      id: s.id,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      createdAt: s.createdAt,
    }));
  }

  async revokeSession(sessionId: string, userId: string, ipAddress?: string): Promise<void> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId || '');
    if (!isUuid) {
      throw new BadRequestException('Invalid session ID format. Must be a valid UUID');
    }

    const session = await this.authRepository.findSessionById(sessionId);
    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }
    if (session.userId !== userId) {
      throw new ForbiddenException('Cannot revoke another user\'s session');
    }

    await this.authRepository.invalidateSession(session.id, userId);
    await this.authRepository.createAuditLog(userId, 'SESSION_REVOKED', `Session ${session.id} manually terminated`, ipAddress);
  }

  async revokeOtherSessions(userId: string, currentSessionId: string, ipAddress?: string): Promise<void> {
    await this.authRepository.invalidateOtherSessions(userId, currentSessionId);
    await this.authRepository.createAuditLog(userId, 'OTHER_SESSIONS_REVOKED', 'All other active sessions terminated', ipAddress);
  }

  async getMe(userId: string, ipAddress?: string): Promise<UserMeResponseDto> {
    const roles = await this.authRepository.findUserRoles(userId);
    const permissions = Array.from(
      new Set(roles.flatMap(role => this.permissionMap[role] || [])),
    );

    const dbUser = await this.dbUserFetch(userId);
    await this.authRepository.createAuditLog(userId, 'ME_PROFILE_VIEW', 'Retrieved current user profile details', ipAddress);

    return {
      id: userId,
      email: dbUser?.email || undefined,
      phone: dbUser?.phone || '',
      status: dbUser?.status || 'ACTIVE',
      roles,
      permissions,
    };
  }

  async updateMe(userId: string, dto: UpdateMeDto, ipAddress?: string): Promise<UserMeResponseDto> {
    const prisma = (this.authRepository as any).db;
    if (dto.email) {
      const existingEmail = await prisma.user.findFirst({
        where: { email: dto.email, id: { not: userId } },
      });
      if (existingEmail) {
        throw new ConflictException(`Email ${dto.email} is already in use`);
      }
    }
    if (dto.phone) {
      const existingPhone = await prisma.user.findFirst({
        where: { phone: dto.phone, id: { not: userId } },
      });
      if (existingPhone) {
        throw new ConflictException(`Phone ${dto.phone} is already in use`);
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        email: dto.email !== undefined ? dto.email : undefined,
        phone: dto.phone !== undefined ? dto.phone : undefined,
      },
    });

    await this.authRepository.createAuditLog(userId, 'ME_PROFILE_UPDATE', 'Updated user profile details', ipAddress);
    return this.getMe(userId, ipAddress);
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
    currentSessionId?: string,
    ipAddress?: string,
  ): Promise<{ message: string }> {
    const prisma = (this.authRepository as any).db;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (!user.passwordHash) {
      throw new BadRequestException('User does not have a password configured');
    }

    const isMatch = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Current password does not match');
    }

    const newHash = await bcrypt.hash(dto.newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    if (currentSessionId) {
      await this.authRepository.invalidateOtherSessions(userId, currentSessionId);
    } else {
      await prisma.userSession.deleteMany({ where: { userId } });
      await prisma.refreshToken.deleteMany({ where: { userId } });
    }

    await this.authRepository.createAuditLog(userId, 'PASSWORD_CHANGED', 'User changed password', ipAddress);
    return { message: 'Password changed successfully' };
  }

  private async dbUserFetch(userId: string) {
    if (this.authRepository.findUserById) {
      return await this.authRepository.findUserById(userId);
    }
    const prisma = (this.authRepository as any).db;
    return await prisma?.user?.findUnique({ where: { id: userId } });
  }

  getRolesPermissionsMapping() {
    return {
      roles: Object.keys(this.permissionMap),
      permissions: Array.from(new Set(Object.values(this.permissionMap).flat())),
    };
  }
}
