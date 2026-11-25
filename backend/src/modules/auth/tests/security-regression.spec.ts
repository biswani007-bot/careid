import { Reflector } from '@nestjs/core';
import { ExecutionContext, HttpStatus, HttpException, ForbiddenException } from '@nestjs/common';
import { RolesGuard } from '../infrastructure/guards/roles.guard';
import { ROLES_KEY } from '../infrastructure/decorators/roles.decorator';
import { validateEnvironment } from '../../../config/env.validation';
import { HealthController } from '../../../core/health/health.controller';
import { MedicalRecordService } from '../../medical-record/application/use-cases/medical-record.service';

describe('CareID Phase 1 & 2 Security Regression Tests', () => {
  describe('RolesGuard & Cross-Role Access Control (SEC-07)', () => {
    let rolesGuard: RolesGuard;
    let reflector: Reflector;

    beforeEach(() => {
      reflector = new Reflector();
      rolesGuard = new RolesGuard(reflector);
    });

    function createMockContext(userRoles?: string[], routeRoles?: string[]): ExecutionContext {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(routeRoles);
      return {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            user: userRoles ? { userId: 'test-user', roles: userRoles } : undefined,
          }),
        }),
      } as unknown as ExecutionContext;
    }

    it('should deny access when a PATIENT attempts to access an ADMIN route', () => {
      const context = createMockContext(['PATIENT'], ['ADMIN', 'SUPER_ADMIN']);
      const canActivate = rolesGuard.canActivate(context);
      expect(canActivate).toBe(false);
    });

    it('should deny access when a DOCTOR attempts to access an ADMIN route', () => {
      const context = createMockContext(['DOCTOR'], ['ADMIN', 'SUPER_ADMIN']);
      const canActivate = rolesGuard.canActivate(context);
      expect(canActivate).toBe(false);
    });

    it('should allow access when an ADMIN accesses an ADMIN route', () => {
      const context = createMockContext(['ADMIN'], ['ADMIN', 'SUPER_ADMIN']);
      const canActivate = rolesGuard.canActivate(context);
      expect(canActivate).toBe(true);
    });

    it('should allow access when a user has multiple roles including the required role', () => {
      const context = createMockContext(['STAFF', 'ADMIN'], ['ADMIN']);
      const canActivate = rolesGuard.canActivate(context);
      expect(canActivate).toBe(true);
    });

    it('should deny access when request has no user or no roles attached', () => {
      const context = createMockContext(undefined, ['ADMIN']);
      const canActivate = rolesGuard.canActivate(context);
      expect(canActivate).toBe(false);
    });

    it('should allow access when route has no required roles defined', () => {
      const context = createMockContext(['PATIENT'], undefined);
      const canActivate = rolesGuard.canActivate(context);
      expect(canActivate).toBe(true);
    });
  });

  describe('Patient Data Isolation & Object-Level Access Control (SEC-07)', () => {
    let medicalRecordService: MedicalRecordService;
    let mockRepo: any;
    let mockQrService: any;

    beforeEach(() => {
      mockRepo = {
        findProfileByUserId: jest.fn(),
        findRecordById: jest.fn(),
        createAuditLog: jest.fn(),
      };
      mockQrService = {} as any;
      medicalRecordService = new MedicalRecordService(mockRepo, mockQrService);
    });

    it('should strictly reject access when a user attempts to access another patients medical record', async () => {
      // User A's profile is profile-A
      mockRepo.findProfileByUserId.mockResolvedValue({ id: 'profile-A', userId: 'user-A' });
      // Record belongs to profile-B (Patient B)
      mockRepo.findRecordById.mockResolvedValue({
        id: 'record-999',
        patientProfileId: 'profile-B',
        title: 'Confidential Diagnosis',
      });

      await expect(
        medicalRecordService.getRecordById('user-A', 'record-999'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Health Readiness DB Failure Response (Phase 2, Item 1)', () => {
    let healthController: HealthController;
    let mockDb: any;

    beforeEach(() => {
      mockDb = {
        $queryRaw: jest.fn(),
      };
      healthController = new HealthController(mockDb);
    });

    it('should return HTTP 200 ready when database query succeeds', async () => {
      mockDb.$queryRaw.mockResolvedValue([{ 1: 1 }]);
      const res = await healthController.getReadiness();
      expect(res.status).toBe('ready');
      expect(res.database).toBe('connected');
    });

    it('should throw HTTP 503 SERVICE_UNAVAILABLE when database query fails', async () => {
      mockDb.$queryRaw.mockRejectedValue(new Error('Connection terminated unexpectedly'));

      await expect(healthController.getReadiness()).rejects.toThrow(HttpException);

      try {
        await healthController.getReadiness();
      } catch (err: any) {
        expect(err.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
        const response = err.getResponse();
        expect(response.status).toBe('unready');
        expect(response.database).toBe('disconnected');
      }
    });
  });

  describe('Production Environment Validation (Phase 2, Items 2 & 3)', () => {
    const baseValidConfig = {
      PORT: 3000,
      GLOBAL_PREFIX: 'api',
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/db',
    };

    it('should reject production boot when JWT_SECRET is missing', () => {
      expect(() => {
        validateEnvironment({
          ...baseValidConfig,
          NODE_ENV: 'production',
          CORS_ALLOWED_ORIGINS: 'https://app.careid.com',
        });
      }).toThrow('JWT_SECRET is required in production');
    });

    it('should reject production boot when JWT_SECRET is the default secret key', () => {
      expect(() => {
        validateEnvironment({
          ...baseValidConfig,
          NODE_ENV: 'production',
          JWT_SECRET: 'hvapi_default_secret_key',
          CORS_ALLOWED_ORIGINS: 'https://app.careid.com',
        });
      }).toThrow('cannot use a known default secret');
    });

    it('should reject production boot when JWT_SECRET is shorter than 32 characters', () => {
      expect(() => {
        validateEnvironment({
          ...baseValidConfig,
          NODE_ENV: 'production',
          JWT_SECRET: 'short_secret_only_24_chars',
          CORS_ALLOWED_ORIGINS: 'https://app.careid.com',
        });
      }).toThrow('must be at least 32 characters');
    });

    it('should reject production boot when CORS_ALLOWED_ORIGINS is missing or empty', () => {
      expect(() => {
        validateEnvironment({
          ...baseValidConfig,
          NODE_ENV: 'production',
          JWT_SECRET: 'a_very_strong_cryptographic_production_jwt_secret_key_32_bytes_long',
          CORS_ALLOWED_ORIGINS: '',
        });
      }).toThrow('Production requires explicitly configured CORS_ALLOWED_ORIGINS');
    });

    it('should allow valid production configuration with strong secret and allowed origins', () => {
      const result = validateEnvironment({
        ...baseValidConfig,
        NODE_ENV: 'production',
        JWT_SECRET: 'a_very_strong_cryptographic_production_jwt_secret_key_32_bytes_long',
        CORS_ALLOWED_ORIGINS: 'https://app.careid.com,https://admin.careid.com',
      });
      expect(result).toBeDefined();
      expect(result.NODE_ENV).toBe('production');
    });

    it('should strictly reject production boot if ENABLE_TEST_OTP is enabled with wildcard (*)', () => {
      expect(() => {
        validateEnvironment({
          ...baseValidConfig,
          NODE_ENV: 'production',
          JWT_SECRET: 'a_very_strong_cryptographic_production_jwt_secret_key_32_bytes_long',
          CORS_ALLOWED_ORIGINS: 'https://app.careid.com',
          ENABLE_TEST_OTP: 'true',
          TEST_PHONE_NUMBERS: '*',
          TEST_OTP_CODE: '123456',
        });
      }).toThrow('CRITICAL SECURITY ERROR: Wildcard (*) is strictly forbidden in TEST_PHONE_NUMBERS in a production environment.');
    });

    it('should strictly reject boot if APP_ENV is production and ENABLE_TEST_OTP has wildcard (*)', () => {
      expect(() => {
        validateEnvironment({
          ...baseValidConfig,
          NODE_ENV: 'development',
          APP_ENV: 'production',
          JWT_SECRET: 'a_very_strong_cryptographic_production_jwt_secret_key_32_bytes_long',
          CORS_ALLOWED_ORIGINS: 'https://app.careid.com',
          ENABLE_TEST_OTP: 'true',
          TEST_PHONE_NUMBERS: '+16505550001,*',
          TEST_OTP_CODE: '123456',
        });
      }).toThrow('CRITICAL SECURITY ERROR: Wildcard (*) is strictly forbidden in TEST_PHONE_NUMBERS in a production environment.');
    });

    it('should allow production boot when ENABLE_TEST_OTP is enabled with explicit approved test accounts', () => {
      const config = validateEnvironment({
        ...baseValidConfig,
        NODE_ENV: 'production',
        JWT_SECRET: 'a_very_strong_cryptographic_production_jwt_secret_key_32_bytes_long',
        CORS_ALLOWED_ORIGINS: 'https://app.careid.com',
        ENABLE_TEST_OTP: 'true',
        TEST_PHONE_NUMBERS: '+16505550001, +16505550002',
        TEST_OTP_CODE: '123456',
      });
      expect(config.ENABLE_TEST_OTP).toBe('true');
    });

    it('should reject staging boot when ENABLE_TEST_OTP is true but TEST_OTP_CODE is not 6 digits', () => {
      expect(() => {
        validateEnvironment({
          ...baseValidConfig,
          NODE_ENV: 'production',
          APP_ENV: 'staging',
          JWT_SECRET: 'a_very_strong_cryptographic_production_jwt_secret_key_32_bytes_long',
          ENABLE_TEST_OTP: 'true',
          TEST_OTP_CODE: '123',
          TEST_PHONE_NUMBERS: '+16505550001',
        });
      }).toThrow('TEST_OTP_CODE must be a valid 6-digit numeric string');
    });

    it('should reject staging boot when ENABLE_TEST_OTP is true but TEST_PHONE_NUMBERS is empty', () => {
      expect(() => {
        validateEnvironment({
          ...baseValidConfig,
          NODE_ENV: 'production',
          APP_ENV: 'staging',
          JWT_SECRET: 'a_very_strong_cryptographic_production_jwt_secret_key_32_bytes_long',
          ENABLE_TEST_OTP: 'true',
          TEST_OTP_CODE: '123456',
          TEST_PHONE_NUMBERS: '',
        });
      }).toThrow('TEST_PHONE_NUMBERS must contain at least one allowlisted phone number');
    });

    it('should allow valid staging configuration under NODE_ENV=production with APP_ENV=staging and valid test OTP config', () => {
      const result = validateEnvironment({
        ...baseValidConfig,
        NODE_ENV: 'production',
        APP_ENV: 'staging',
        JWT_SECRET: 'a_very_strong_cryptographic_production_jwt_secret_key_32_bytes_long',
        ENABLE_TEST_OTP: 'true',
        TEST_OTP_CODE: '123456',
        TEST_PHONE_NUMBERS: '+16505550001, +16505550002',
      });
      expect(result).toBeDefined();
      expect(result.APP_ENV).toBe('staging');
    });

    it('should reject boot when APP_ENV=staging and DEPLOYMENT_ENV=production (conflicting declarations)', () => {
      expect(() => {
        validateEnvironment({
          ...baseValidConfig,
          NODE_ENV: 'production',
          APP_ENV: 'staging',
          DEPLOYMENT_ENV: 'production',
          JWT_SECRET: 'a_very_strong_cryptographic_production_jwt_secret_key_32_bytes_long',
          CORS_ALLOWED_ORIGINS: 'https://staging.careid.com',
        });
      }).toThrow(/Conflicting environment declarations detected/);
    });

    it('should reject boot when APP_ENV=production and DEPLOYMENT_ENV=staging (conflicting declarations)', () => {
      expect(() => {
        validateEnvironment({
          ...baseValidConfig,
          NODE_ENV: 'production',
          APP_ENV: 'production',
          DEPLOYMENT_ENV: 'staging',
          JWT_SECRET: 'a_very_strong_cryptographic_production_jwt_secret_key_32_bytes_long',
          CORS_ALLOWED_ORIGINS: 'https://staging.careid.com',
        });
      }).toThrow(/Conflicting environment declarations detected/);
    });

    it('should allow valid staging configuration when NODE_ENV=production and both APP_ENV and DEPLOYMENT_ENV are staging', () => {
      const result = validateEnvironment({
        ...baseValidConfig,
        NODE_ENV: 'production',
        APP_ENV: 'staging',
        DEPLOYMENT_ENV: 'staging',
        JWT_SECRET: 'a_very_strong_cryptographic_production_jwt_secret_key_32_bytes_long',
        ENABLE_TEST_OTP: 'true',
        TEST_OTP_CODE: '123456',
        TEST_PHONE_NUMBERS: '+16505550001',
      });
      expect(result).toBeDefined();
      expect(result.APP_ENV).toBe('staging');
      expect(result.DEPLOYMENT_ENV).toBe('staging');
    });

    it('should reject boot when test OTP is enabled with conflicting DEPLOYMENT_ENV=production and APP_ENV=staging', () => {
      expect(() => {
        validateEnvironment({
          ...baseValidConfig,
          NODE_ENV: 'production',
          APP_ENV: 'staging',
          DEPLOYMENT_ENV: 'production',
          JWT_SECRET: 'a_very_strong_cryptographic_production_jwt_secret_key_32_bytes_long',
          ENABLE_TEST_OTP: 'true',
          TEST_OTP_CODE: '123456',
          TEST_PHONE_NUMBERS: '+16505550001',
        });
      }).toThrow(/Conflicting environment declarations detected/);
    });

    it('should reject boot when test OTP is enabled with conflicting APP_ENV=production and DEPLOYMENT_ENV=staging', () => {
      expect(() => {
        validateEnvironment({
          ...baseValidConfig,
          NODE_ENV: 'production',
          APP_ENV: 'production',
          DEPLOYMENT_ENV: 'staging',
          JWT_SECRET: 'a_very_strong_cryptographic_production_jwt_secret_key_32_bytes_long',
          ENABLE_TEST_OTP: 'true',
          TEST_OTP_CODE: '123456',
          TEST_PHONE_NUMBERS: '+16505550001',
        });
      }).toThrow(/Conflicting environment declarations detected/);
    });

    it('should reject boot when test OTP is enabled in DEPLOYMENT_ENV=production with wildcard (*)', () => {
      expect(() => {
        validateEnvironment({
          ...baseValidConfig,
          NODE_ENV: 'development',
          DEPLOYMENT_ENV: 'production',
          JWT_SECRET: 'a_very_strong_cryptographic_production_jwt_secret_key_32_bytes_long',
          ENABLE_TEST_OTP: 'true',
          TEST_OTP_CODE: '123456',
          TEST_PHONE_NUMBERS: '+16505550001,*',
        });
      }).toThrow(/CRITICAL SECURITY ERROR: Wildcard \(\*\) is strictly forbidden in TEST_PHONE_NUMBERS in a production environment\./);
    });
  });
});
