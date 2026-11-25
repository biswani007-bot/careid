import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@database/database.service';
import { IAuthRepository } from '../../domain/repositories/auth.repository.interface';
import { UserEntity, AuthOtpEntity, RefreshTokenEntity } from '../../domain/entities/auth.entity';

@Injectable()
export class AuthRepository implements IAuthRepository {
  constructor(private readonly db: DatabaseService) {}

  async findUserByPhone(phone: string): Promise<UserEntity | null> {
    return (await this.db.user.findUnique({ where: { phone } })) as UserEntity | null;
  }

  async findUserByEmail(email: string): Promise<UserEntity | null> {
    return (await this.db.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: 'insensitive',
        },
      },
    })) as UserEntity | null;
  }

  async findUserByIdentifier(identifier: string): Promise<any | null> {
    const clean = (identifier || '').trim();
    if (!clean) return null;
    const isEmail = clean.includes('@');
    const mode = 'insensitive' as const;
    return await this.db.user.findFirst({
      where: {
        OR: [
          { email: { equals: clean, mode } },
          { phone: clean },
          ...(!isEmail ? [
            { email: { startsWith: clean + '@', mode } },
            { email: { equals: `${clean}@careid.test`, mode } },
          ] : []),
        ],
      },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });
  }

  async createUser(phone: string): Promise<UserEntity> {
    const user = await this.db.user.create({ data: { phone } });
    let role = await this.db.role.findUnique({ where: { name: 'PATIENT' } });
    if (!role) {
      role = await this.db.role.create({
        data: { name: 'PATIENT', description: 'Default Patient Role' },
      });
    }
    await this.db.userRole.create({
      data: {
        userId: user.id,
        roleId: role.id,
      },
    });
    return user as UserEntity;
  }

  async createOtp(userId: string, otpHash: string, expiresAt: Date): Promise<AuthOtpEntity> {
    return (await this.db.authOtp.create({
      data: { userId, otpHash, expiresAt },
    })) as AuthOtpEntity;
  }

  async findOtpByChallengeId(challengeId: string): Promise<AuthOtpEntity | null> {
    return (await this.db.authOtp.findUnique({ where: { id: challengeId } })) as AuthOtpEntity | null;
  }

  async markOtpVerified(otpId: string): Promise<void> {
    await this.db.authOtp.update({
      where: { id: otpId },
      data: { isVerified: true },
    });
  }

  async incrementOtpAttempts(otpId: string): Promise<void> {
    await this.db.authOtp.update({
      where: { id: otpId },
      data: { attempts: { increment: 1 } },
    });
  }

  async incrementOtpResends(otpId: string, newHash: string, newExpiresAt: Date): Promise<void> {
    await this.db.authOtp.update({
      where: { id: otpId },
      data: {
        otpHash: newHash,
        expiresAt: newExpiresAt,
        resendCount: { increment: 1 },
      },
    });
  }

  async createSession(userId: string, ipAddress?: string, userAgent?: string): Promise<any> {
    return await this.db.userSession.create({
      data: { userId, ipAddress, userAgent, isActive: true },
    });
  }

  async findActiveSessions(userId: string): Promise<any[]> {
    return await this.db.userSession.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async invalidateSession(sessionId: string, userId: string): Promise<void> {
    await this.db.userSession.updateMany({
      where: { id: sessionId, userId },
      data: { isActive: false },
    });
  }

  async invalidateAllSessions(userId: string): Promise<void> {
    await this.db.userSession.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });
  }

  async invalidateOtherSessions(userId: string, currentSessionId: string): Promise<void> {
    await this.db.userSession.updateMany({
      where: { userId, id: { not: currentSessionId }, isActive: true },
      data: { isActive: false },
    });
  }

  async createRefreshToken(userId: string, tokenHash: string, expiresAt: Date, tokenId?: string): Promise<RefreshTokenEntity> {
    return (await this.db.refreshToken.create({
      data: {
        id: tokenId || undefined,
        userId,
        tokenHash,
        expiresAt,
      },
    })) as RefreshTokenEntity;
  }

  async findRefreshToken(tokenHash: string): Promise<RefreshTokenEntity | null> {
    return (await this.db.refreshToken.findFirst({ where: { tokenHash } })) as RefreshTokenEntity | null;
  }

  async findRefreshTokenById(tokenId: string): Promise<RefreshTokenEntity | null> {
    return (await this.db.refreshToken.findUnique({ where: { id: tokenId } })) as RefreshTokenEntity | null;
  }

  async findRecentTokensByUser(userId: string, limit = 10): Promise<RefreshTokenEntity[]> {
    return (await this.db.refreshToken.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })) as RefreshTokenEntity[];
  }

  async revokeRefreshToken(tokenId: string): Promise<void> {
    await this.db.refreshToken.update({
      where: { id: tokenId },
      data: { isRevoked: true },
    });
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.db.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
  }

  async findSessionById(sessionId: string): Promise<any | null> {
    if (!sessionId || typeof sessionId !== 'string') return null;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId);
    if (!isUuid) return null;
    return this.db.userSession.findUnique({
      where: { id: sessionId },
    });
  }

  async revokeRefreshTokenIfActive(tokenId: string): Promise<boolean> {
    const result = await this.db.refreshToken.updateMany({
      where: { id: tokenId, isRevoked: false },
      data: { isRevoked: true },
    });
    return result.count > 0;
  }

  async createAuditLog(userId: string, action: string, details?: string, ipAddress?: string): Promise<void> {
    const auditRecord = await this.db.auditLog.create({
      data: { userId, action, details, ipAddress },
    });

    try {
      await this.db.securityPlatformAuditLog.create({
        data: {
          userId,
          action,
          resource: 'AUTH_SESSION',
          resourceId: auditRecord.id,
          ipAddress: ipAddress || null,
          result: action.includes('FAIL') ? 'DENIED' : 'SUCCESS',
          details: details || null,
        },
      });
    } catch {
      // Non-blocking fallback to preserve primary authentication flow
    }
  }

  async findUserRoles(userId: string): Promise<string[]> {
    const userRoles = await this.db.userRole.findMany({
      where: { userId },
      include: { role: true },
    });
    return userRoles.map(ur => ur.role.name);
  }

  async findUserById(userId: string): Promise<UserEntity | null> {
    return (await this.db.user.findUnique({ where: { id: userId } })) as UserEntity | null;
  }

  async findDoctorProfileByUserId(userId: string): Promise<any | null> {
    return this.db.doctorProfile.findUnique({
      where: { userId },
      include: { user: true },
    });
  }

  async findUserWithProfiles(phone: string): Promise<any | null> {
    return this.db.user.findUnique({
      where: { phone },
      include: {
        userRoles: { include: { role: true } },
        doctorProfile: true,
        patientProfile: true,
      },
    });
  }
}
