import { UserEntity, AuthOtpEntity, RefreshTokenEntity } from '../entities/auth.entity';

export interface IAuthRepository {
  findUserByPhone(phone: string): Promise<UserEntity | null>;
  findUserByEmail(email: string): Promise<UserEntity | null>;
  findUserByIdentifier(identifier: string): Promise<any | null>;
  createUser(phone: string): Promise<UserEntity>;
  createOtp(userId: string, otpHash: string, expiresAt: Date): Promise<AuthOtpEntity>;
  findOtpByChallengeId(challengeId: string): Promise<AuthOtpEntity | null>;
  markOtpVerified(otpId: string): Promise<void>;
  incrementOtpAttempts(otpId: string): Promise<void>;
  incrementOtpResends(otpId: string, newHash: string, newExpiresAt: Date): Promise<void>;
  createSession(userId: string, ipAddress?: string, userAgent?: string): Promise<any>;
  findActiveSessions(userId: string): Promise<any[]>;
  invalidateSession(sessionId: string, userId: string): Promise<void>;
  invalidateAllSessions(userId: string): Promise<void>;
  invalidateOtherSessions(userId: string, currentSessionId: string): Promise<void>;
  createRefreshToken(userId: string, tokenHash: string, expiresAt: Date, tokenId?: string): Promise<RefreshTokenEntity>;
  findRefreshToken(tokenHash: string): Promise<RefreshTokenEntity | null>;
  findRefreshTokenById(tokenId: string): Promise<RefreshTokenEntity | null>;
  findRecentTokensByUser(userId: string, limit?: number): Promise<RefreshTokenEntity[]>;
  revokeRefreshToken(tokenId: string): Promise<void>;
  revokeAllUserTokens(userId: string): Promise<void>;
  createAuditLog(userId: string, action: string, details?: string, ipAddress?: string): Promise<void>;
  findSessionById(sessionId: string): Promise<any | null>;
  revokeRefreshTokenIfActive(tokenId: string): Promise<boolean>;
  findUserRoles(userId: string): Promise<string[]>;
  findUserById?(userId: string): Promise<UserEntity | null>;
  findDoctorProfileByUserId?(userId: string): Promise<any | null>;
  findUserWithProfiles?(phone: string): Promise<any | null>;
}
