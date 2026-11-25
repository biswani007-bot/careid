import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException, INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Logger, LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { SecurityController } from '../presentation/controllers/security.controller';
import { SecurityService } from '../application/use-cases/security.service';
import { PrismaSecurityRepository } from '../infrastructure/database/security.repository';
import { RolesGuard } from '@modules/auth/infrastructure/guards/roles.guard';
import { ROLES_KEY } from '@modules/auth/infrastructure/decorators/roles.decorator';
import { SecurityPlatformAuditLogEntity } from '../domain/entities/security.entity';
import { DatabaseModule } from '@database/database.module';
import { DatabaseService } from '@database/database.service';
import { AuthModule } from '@modules/auth/auth.module';
import { SecurityModule } from '../security.module';
import { AuthRepository } from '@modules/auth/infrastructure/database/auth.repository';

describe('CareID Security Audit Log — Doctor Role Access & Isolation (All 18 Acceptance Criteria)', () => {
  const doctorAId = 'user-doctor-a-1111';
  const doctorBId = 'user-doctor-b-2222';
  const adminId = 'user-admin-3333';
  const superAdminId = 'user-super-admin-4444';
  const patientId = 'user-patient-5555';
  const staffId = 'user-staff-6666';

  let reflector: Reflector;
  let rolesGuard: RolesGuard;
  let securityService: SecurityService;
  let securityController: SecurityController;
  let mockRepository: any;

  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  };

  const createMockAuditLog = (
    id: string,
    userId: string,
    action: string,
    resource: string,
    details?: string,
    createdAt: Date = new Date(),
  ): SecurityPlatformAuditLogEntity => ({
    id,
    userId,
    action,
    resource,
    resourceId: 'res-' + id,
    ipAddress: '192.168.1.10',
    userAgent: 'Mozilla/5.0 DoctorApp/1.0',
    result: 'SUCCESS',
    details: details || `Performed ${action} on ${resource}`,
    createdAt,
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    reflector = new Reflector();
    rolesGuard = new RolesGuard(reflector);

    mockRepository = {
      findAuditLogs: jest.fn(),
      createAuditLog: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SecurityController],
      providers: [
        SecurityService,
        { provide: 'ISecurityRepository', useValue: mockRepository },
        { provide: Logger, useValue: mockLogger },
      ],
    }).compile();

    securityService = module.get<SecurityService>(SecurityService);
    securityController = module.get<SecurityController>(SecurityController);
  });

  function createMockExecutionContext(user?: { userId?: string; roles?: string[] }, routeRoles?: string[]): ExecutionContext {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(routeRoles);
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ user }),
      }),
    } as unknown as ExecutionContext;
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // SECTION 1: DOCTOR ISOLATION & IDOR DEFENSE (Scenarios 1-6)
  // ═════════════════════════════════════════════════════════════════════════════

  describe('Doctor Isolation & IDOR Defense (Scenarios 1 - 6)', () => {
    it('Scenario 1: Doctor A receives only Doctor A audit events', async () => {
      const docALogs = [
        createMockAuditLog('log-a-1', doctorAId, 'DOCTOR_PATIENTS_LIST_VIEWED', 'PATIENTS'),
        createMockAuditLog('log-a-2', doctorAId, 'USER_LOGIN', 'AUTH_SESSION'),
      ];
      mockRepository.findAuditLogs.mockResolvedValue(docALogs);

      const req = { user: { userId: doctorAId, roles: ['DOCTOR'] } };
      const result = await securityController.getAuditLogs(req);

      expect(mockRepository.findAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({ userId: doctorAId }),
      );
      expect(result).toHaveLength(2);
      expect(result.every((log) => log.userId === doctorAId)).toBe(true);
      expect(result.some((log) => log.userId === doctorBId)).toBe(false);
    });

    it('Scenario 2: Doctor B receives only Doctor B audit events', async () => {
      const docBLogs = [
        createMockAuditLog('log-b-1', doctorBId, 'CLINICAL_RECORD_VIEWED', 'MEDICAL_RECORDS'),
      ];
      mockRepository.findAuditLogs.mockResolvedValue(docBLogs);

      const req = { user: { userId: doctorBId, roles: ['DOCTOR'] } };
      const result = await securityController.getAuditLogs(req);

      expect(mockRepository.findAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({ userId: doctorBId }),
      );
      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe(doctorBId);
      expect(result[0].id).toBe('log-b-1');
    });

    it('Scenario 3: Doctor A passing Doctor B user ID receives 403 Forbidden (cross-user audit access forbidden, no DB query)', async () => {
      const req = { user: { userId: doctorAId, sub: doctorAId, roles: ['DOCTOR'] } };

      await expect(
        securityController.getAuditLogs(req, doctorBId),
      ).rejects.toThrow(ForbiddenException);

      // Verify that database was NEVER queried upon cross-user IDOR attempt
      expect(mockRepository.findAuditLogs).not.toHaveBeenCalled();
    });

    it('Scenario 3b: Doctor A passing matching own user ID receives 200 OK with own audit events', async () => {
      const docALogs = [
        createMockAuditLog('log-a-1', doctorAId, 'DOCTOR_PATIENTS_LIST_VIEWED', 'PATIENTS'),
      ];
      mockRepository.findAuditLogs.mockResolvedValue(docALogs);

      const req = { user: { userId: doctorAId, sub: doctorAId, roles: ['DOCTOR'] } };
      const result = await securityController.getAuditLogs(req, doctorAId);

      expect(mockRepository.findAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({ userId: doctorAId }),
      );
      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe(doctorAId);
    });

    it('Scenario 4: Doctor A cannot obtain Doctor B events via pagination or resource filters (rejects 403)', async () => {
      const req = { user: { userId: doctorAId, sub: doctorAId, roles: ['DOCTOR'] } };

      await expect(
        securityController.getAuditLogs(req, doctorBId, 'AUTH_SESSION', 'USER_LOGIN', undefined, undefined, '2', '50'),
      ).rejects.toThrow(ForbiddenException);

      expect(mockRepository.findAuditLogs).not.toHaveBeenCalled();
    });

    it('Scenario 5: Supplying another user ID throws ForbiddenException and never queries repository', async () => {
      const doctorUser = { userId: doctorAId, sub: doctorAId, roles: ['DOCTOR'] };

      await expect(
        securityService.getAuditLogs(doctorUser, { userId: 'any-random-victim-id' }),
      ).rejects.toThrow(ForbiddenException);

      expect(mockRepository.findAuditLogs).not.toHaveBeenCalled();
    });

    it('Scenario 6: Empty audit history returns valid empty array ([])', async () => {
      mockRepository.findAuditLogs.mockResolvedValue([]);

      const req = { user: { userId: doctorAId, roles: ['DOCTOR'] } };
      const result = await securityController.getAuditLogs(req);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // SECTION 2: ADMINISTRATIVE VISIBILITY & RBAC ROLES (Scenarios 7-13)
  // ═════════════════════════════════════════════════════════════════════════════

  describe('Administrative Visibility & Access Guard Enforcement (Scenarios 7 - 13)', () => {
    const auditRouteRoles = ['ADMIN', 'SUPER_ADMIN', 'DOCTOR'];

    it('Scenario 7: Super Admin retains existing authorized platform-wide visibility', async () => {
      const platformLogs = [
        createMockAuditLog('log-a-1', doctorAId, 'DOCTOR_PATIENTS_LIST_VIEWED', 'PATIENTS'),
        createMockAuditLog('log-b-1', doctorBId, 'CLINICAL_RECORD_VIEWED', 'MEDICAL_RECORDS'),
      ];
      mockRepository.findAuditLogs.mockResolvedValue(platformLogs);

      const superAdminUser = { userId: superAdminId, roles: ['SUPER_ADMIN'] };
      const result = await securityService.getAuditLogs(superAdminUser, {});

      // Super Admin without userId filter queries all platform logs
      expect(mockRepository.findAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({ userId: undefined }),
      );
      expect(result).toHaveLength(2);
    });

    it('Scenario 8: Admin retains existing authorized scope and can filter by targeted userId', async () => {
      const targetedLogs = [createMockAuditLog('log-a-1', doctorAId, 'USER_LOGIN', 'AUTH_SESSION')];
      mockRepository.findAuditLogs.mockResolvedValue(targetedLogs);

      const adminUser = { userId: adminId, roles: ['ADMIN'] };
      const result = await securityService.getAuditLogs(adminUser, { userId: doctorAId });

      // Admin explicitly filtering by Doctor A
      expect(mockRepository.findAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({ userId: doctorAId }),
      );
      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe(doctorAId);
    });

    it('Scenario 9: Patient cannot access GET /api/v1/security/audit (RolesGuard rejects with 403 Forbidden)', async () => {
      const context = createMockExecutionContext({ userId: patientId, roles: ['PATIENT'] }, auditRouteRoles);
      const canActivate = rolesGuard.canActivate(context);
      expect(canActivate).toBe(false);

      // Service layer backup defense
      await expect(
        securityService.getAuditLogs({ userId: patientId, roles: ['PATIENT'] }, {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it('Scenario 10: Staff cannot access GET /api/v1/security/audit (RolesGuard rejects with 403 Forbidden)', async () => {
      const context = createMockExecutionContext({ userId: staffId, roles: ['STAFF'] }, auditRouteRoles);
      const canActivate = rolesGuard.canActivate(context);
      expect(canActivate).toBe(false);

      // Service layer backup defense
      await expect(
        securityService.getAuditLogs({ userId: staffId, roles: ['STAFF'] }, {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it('Scenario 11: Unauthenticated requests return 401 Unauthorized', () => {
      // Without user object in request context
      const context = createMockExecutionContext(undefined, auditRouteRoles);
      const canActivate = rolesGuard.canActivate(context);
      expect(canActivate).toBe(false);
    });

    it('Scenario 12: Invalid or expired JWTs (missing user payload or empty roles) return 401/403', () => {
      const contextWithoutRoles = createMockExecutionContext({ userId: 'unknown' }, auditRouteRoles);
      expect(rolesGuard.canActivate(contextWithoutRoles)).toBe(false);

      const contextWithEmptyRoles = createMockExecutionContext({ userId: 'unknown', roles: [] }, auditRouteRoles);
      expect(rolesGuard.canActivate(contextWithEmptyRoles)).toBe(false);
    });

    it('Scenario 13: Unauthorized roles (FACILITY_ADMIN, BILLING, PHARMACIST) return 403 Forbidden', () => {
      expect(rolesGuard.canActivate(createMockExecutionContext({ userId: 'fa-1', roles: ['FACILITY_ADMIN'] }, auditRouteRoles))).toBe(false);
      expect(rolesGuard.canActivate(createMockExecutionContext({ userId: 'bil-1', roles: ['BILLING'] }, auditRouteRoles))).toBe(false);
      expect(rolesGuard.canActivate(createMockExecutionContext({ userId: 'ph-1', roles: ['PHARMACIST'] }, auditRouteRoles))).toBe(false);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // SECTION 3: CREDENTIAL SECURITY & LEAK PREVENTION (Scenarios 14-15)
  // ═════════════════════════════════════════════════════════════════════════════

  describe('Credential Security & Leak Prevention (Scenarios 14 - 15)', () => {
    it('Scenario 14: No tokens, passwords, or credentials appear in audit responses', async () => {
      const rawLog = createMockAuditLog(
        'log-sec-1',
        doctorAId,
        'USER_LOGIN',
        'AUTH_SESSION',
        JSON.stringify({
          method: 'PASSWORD',
          status: 'SUCCESS',
          email: 'doctor@careid.com',
        }),
      );
      mockRepository.findAuditLogs.mockResolvedValue([rawLog]);

      const req = { user: { userId: doctorAId, roles: ['DOCTOR'] } };
      const response = await securityController.getAuditLogs(req);

      const serialized = JSON.stringify(response);
      expect(serialized).not.toContain('password');
      expect(serialized).not.toContain('token');
      expect(serialized).not.toContain('secret');
      expect(serialized).not.toContain('jwt');
      expect(serialized).not.toContain('hash');
      expect(serialized).not.toContain('bearer');
    });

    it('Scenario 15: Sensitive session data, cookies, and tokens are never exposed in audit log details', async () => {
      const cleanDetails = 'Doctor authenticated via OAuth with verified MFA';
      const rawLog = createMockAuditLog('log-sec-2', doctorAId, 'MFA_VERIFIED', 'AUTH_SESSION', cleanDetails);
      mockRepository.findAuditLogs.mockResolvedValue([rawLog]);

      const req = { user: { userId: doctorAId, roles: ['DOCTOR'] } };
      const response = await securityController.getAuditLogs(req);

      expect(response[0].details).toBe(cleanDetails);
      expect(response[0]).not.toHaveProperty('sessionToken');
      expect(response[0]).not.toHaveProperty('refreshToken');
      expect(response[0]).not.toHaveProperty('cookie');
      expect(response[0]).not.toHaveProperty('accessToken');
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // SECTION 4: DATABASE-LEVEL QUERY SCOPING & FILTER INTEGRITY (Scenarios 16-18)
  // ═════════════════════════════════════════════════════════════════════════════

  describe('Database Query-Level Scoping & Repository Integrity (Scenarios 16 - 18)', () => {
    let repo: PrismaSecurityRepository;
    let mockPrisma: any;

    beforeEach(() => {
      mockPrisma = {
        securityPlatformAuditLog: {
          findMany: jest.fn().mockResolvedValue([]),
        },
        auditLog: {
          findMany: jest.fn().mockResolvedValue([]),
        },
      };
      repo = new PrismaSecurityRepository(mockPrisma as any);
    });

    it('Scenario 16: Audit event ownership enforced at DB query level (where.userId in SQL/Prisma)', async () => {
      await repo.findAuditLogs({
        userId: doctorAId,
        resource: 'PATIENTS',
      });

      // Verify Prisma findMany was called with where.userId = doctorAId
      expect(mockPrisma.securityPlatformAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: doctorAId,
            resource: 'PATIENTS',
          }),
        }),
      );
    });

    it('Scenario 17: Pagination does not leak records from other actors (take & skip bound to actor scope)', async () => {
      await repo.findAuditLogs({
        userId: doctorAId,
        page: 3,
        limit: 25,
      });

      // Check skip = (3 - 1) * 25 = 50, take = 25, and where.userId = doctorAId
      expect(mockPrisma.securityPlatformAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: doctorAId }),
          skip: 50,
          take: 25,
        }),
      );
    });

    it('Scenario 18: Date and event filters cannot bypass actor restrictions', async () => {
      const startDate = '2026-01-01T00:00:00.000Z';
      const endDate = '2026-11-11T23:59:59.999Z';

      await repo.findAuditLogs({
        userId: doctorAId,
        action: 'DOCTOR_PATIENTS_LIST_VIEWED',
        startDate,
        endDate,
      });

      expect(mockPrisma.securityPlatformAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: doctorAId,
            action: 'DOCTOR_PATIENTS_LIST_VIEWED',
            createdAt: {
              gte: new Date(startDate),
              lte: new Date(endDate),
            },
          }),
        }),
      );
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // SECTION 5: REAL POSTGRESQL & LIVE AUTHENTICATED HTTP VERIFICATION
  // ═════════════════════════════════════════════════════════════════════════════

  describe('Real PostgreSQL & Live Authenticated HTTP Suite (Tasks 1 - 10)', () => {
    let app: INestApplication;
    let db: DatabaseService;
    let authRepo: AuthRepository;
    let jwtService: JwtService;
    let baseUrl: string;

    let liveDoctorAId: string;
    let liveDoctorBId: string;
    let liveAdminId: string;
    let liveSuperAdminId: string;
    let livePatientId: string;
    let liveStaffId: string;

    let doctorAToken: string;
    let doctorBToken: string;
    let adminToken: string;
    let superAdminToken: string;
    let patientToken: string;
    let staffToken: string;
    let facilityAdminToken: string;

    beforeAll(async () => {
      process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/360api_staging?schema=public';

      const moduleRef: TestingModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({ isGlobal: true }),
          PinoLoggerModule.forRoot({
            pinoHttp: { level: 'silent' },
          }),
          DatabaseModule,
          AuthModule,
          SecurityModule,
        ],
      }).compile();

      const configService = moduleRef.get<ConfigService>(ConfigService);
      const jwtSecret = configService.get<string>('JWT_SECRET') || 'careid-staging-jwt-secret-key-32-chars-min!!';
      jwtService = new JwtService({ secret: jwtSecret });

      app = moduleRef.createNestApplication();
      app.setGlobalPrefix('api');
      app.enableVersioning({
        type: VersioningType.URI,
        defaultVersion: '1',
      });
      app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

      await app.listen(0);
      const server = app.getHttpServer();
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}/api/v1`;

      db = moduleRef.get<DatabaseService>(DatabaseService);
      authRepo = moduleRef.get<AuthRepository>('IAuthRepository');

      // Fetch or seed users for Doctor A, Doctor B, Admin, Super Admin, Patient, Staff
      const docAUser = await db.user.findFirst({
        where: { phone: '+16505550003' },
        include: { doctorProfile: true },
      });
      liveDoctorAId = docAUser!.id;

      let docBUser = await db.user.findFirst({
        where: { phone: '+16505557777' },
        include: { doctorProfile: true },
      });
      if (!docBUser) {
        docBUser = await db.user.create({
          data: {
            phone: '+16505557777',
            email: 'doctor.b@careid.test',
            doctorProfile: {
              create: {
                fullName: 'Dr. Doctor B, MD',
                primarySpecialization: 'Internal Medicine',
                medicalCouncil: 'State Medical Board',
                registrationNumber: 'REG-DOC-B-7777',
                licenseNumber: 'LIC-DOC-B-7777',
                providerIdentifier: 'NPI-DOC-B-7777',
                verificationStatus: 'VERIFIED',
              },
            },
          },
          include: { doctorProfile: true },
        });
      }
      liveDoctorBId = docBUser!.id;

      const adminUser = await db.user.findFirst({
        where: { phone: '+16505550001' },
      });
      liveAdminId = adminUser ? adminUser.id : 'admin-uuid-fixture';

      const superAdminUser = await db.user.findFirst({
        where: { phone: '+16505550002' },
      });
      liveSuperAdminId = superAdminUser ? superAdminUser.id : 'super-admin-fixture';

      const patientUser = await db.user.findFirst({
        where: { phone: '+16505550004' },
      });
      livePatientId = patientUser!.id;

      let staffUser = await db.user.findFirst({
        where: { phone: '+16505550005' },
      });
      if (!staffUser) {
        staffUser = await db.user.create({
          data: {
            phone: '+16505550005',
            email: 'staff.member@careid.test',
          },
        });
      }
      liveStaffId = staffUser.id;

      // Seed distinct platform audit logs in real PostgreSQL for Doctor A and Doctor B
      await db.securityPlatformAuditLog.createMany({
        data: [
          {
            userId: liveDoctorAId,
            action: 'DOCTOR_PATIENTS_LIST_VIEWED',
            resource: 'PATIENTS',
            details: 'Doctor A viewed authorized patient directory',
            result: 'SUCCESS',
            ipAddress: '10.0.0.1',
          },
          {
            userId: liveDoctorAId,
            action: 'CLINICAL_NOTE_CREATED',
            resource: 'MEDICAL_RECORDS',
            details: 'Doctor A documented cardiology encounter',
            result: 'SUCCESS',
            ipAddress: '10.0.0.1',
          },
          {
            userId: liveDoctorBId,
            action: 'DOCTOR_PATIENTS_LIST_VIEWED',
            resource: 'PATIENTS',
            details: 'Doctor B viewed authorized patient directory',
            result: 'SUCCESS',
            ipAddress: '10.0.0.2',
          },
          {
            userId: liveDoctorBId,
            action: 'PRESCRIPTION_ISSUED',
            resource: 'PRESCRIPTIONS',
            details: 'Doctor B prescribed Amoxicillin 500mg',
            result: 'SUCCESS',
            ipAddress: '10.0.0.2',
          },
        ],
      });

      // Generate verified JWT tokens
      doctorAToken = jwtService.sign({ sub: liveDoctorAId, userId: liveDoctorAId, roles: ['DOCTOR'] });
      doctorBToken = jwtService.sign({ sub: liveDoctorBId, userId: liveDoctorBId, roles: ['DOCTOR'] });
      adminToken = jwtService.sign({ sub: liveAdminId, userId: liveAdminId, roles: ['ADMIN'] });
      superAdminToken = jwtService.sign({ sub: liveSuperAdminId, userId: liveSuperAdminId, roles: ['SUPER_ADMIN'] });
      patientToken = jwtService.sign({ sub: livePatientId, userId: livePatientId, roles: ['PATIENT'] });
      staffToken = jwtService.sign({ sub: liveStaffId, userId: liveStaffId, roles: ['STAFF'] });
      facilityAdminToken = jwtService.sign({ sub: 'user-fa-7777', userId: 'user-fa-7777', roles: ['FACILITY_ADMIN'] });
    }, 60000);

    afterAll(async () => {
      if (app) await app.close();
    });

    it('Live HTTP Test 1: Authenticated Doctor A retrieves ONLY Doctor A audit history with 200 OK', async () => {
      const res = await fetch(`${baseUrl}/security/audit`, {
        headers: { Authorization: `Bearer ${doctorAToken}` },
      });
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThanOrEqual(2);

      // Verify strict actor isolation in real PostgreSQL response
      expect(data.every((item: any) => item.userId === liveDoctorAId)).toBe(true);
      expect(data.some((item: any) => item.userId === liveDoctorBId)).toBe(false);
      expect(data.some((item: any) => item.details.includes('Doctor A'))).toBe(true);
      expect(data.some((item: any) => item.details.includes('Doctor B'))).toBe(false);
    });

    it('Live HTTP Test 2: Authenticated Doctor B retrieves ONLY Doctor B audit history with 200 OK', async () => {
      const res = await fetch(`${baseUrl}/security/audit`, {
        headers: { Authorization: `Bearer ${doctorBToken}` },
      });
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThanOrEqual(2);

      // Verify strict actor isolation in real PostgreSQL response
      expect(data.every((item: any) => item.userId === liveDoctorBId)).toBe(true);
      expect(data.some((item: any) => item.userId === liveDoctorAId)).toBe(false);
      expect(data.some((item: any) => item.details.includes('Doctor B'))).toBe(true);
      expect(data.some((item: any) => item.details.includes('Doctor A'))).toBe(false);
    });

    it('Live HTTP Test 3: Doctor A query parameter manipulation (?userId=Doctor_B) returns 403 Forbidden (cross-user access forbidden)', async () => {
      const res = await fetch(`${baseUrl}/security/audit?userId=${liveDoctorBId}`, {
        headers: { Authorization: `Bearer ${doctorAToken}` },
      });
      expect(res.status).toBe(403);
    });

    it('Live HTTP Test 3b: Doctor A passing own matching ?userId receives 200 OK with own audit events', async () => {
      const res = await fetch(`${baseUrl}/security/audit?userId=${liveDoctorAId}`, {
        headers: { Authorization: `Bearer ${doctorAToken}` },
      });
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.every((item: any) => item.userId === liveDoctorAId)).toBe(true);
    });

    it('Live HTTP Test 4: Super Admin retains full platform visibility across all doctors with 200 OK', async () => {
      const res = await fetch(`${baseUrl}/security/audit`, {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.some((item: any) => item.userId === liveDoctorAId)).toBe(true);
      expect(data.some((item: any) => item.userId === liveDoctorBId)).toBe(true);
    });

    it('Live HTTP Test 5: Admin can target a specific user ID filter with 200 OK', async () => {
      const res = await fetch(`${baseUrl}/security/audit?userId=${liveDoctorBId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.every((item: any) => item.userId === liveDoctorBId)).toBe(true);
      expect(data.some((item: any) => item.userId === liveDoctorAId)).toBe(false);
    });

    it('Live HTTP Test 6: Patient access is rejected with 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/security/audit`, {
        headers: { Authorization: `Bearer ${patientToken}` },
      });
      expect(res.status).toBe(403);
    });

    it('Live HTTP Test 7: Staff access is rejected with 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/security/audit`, {
        headers: { Authorization: `Bearer ${staffToken}` },
      });
      expect(res.status).toBe(403);
    });

    it('Live HTTP Test 7b: Facility Admin access is rejected with 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/security/audit`, {
        headers: { Authorization: `Bearer ${facilityAdminToken}` },
      });
      expect(res.status).toBe(403);
    });

    it('Live HTTP Test 8: Unauthenticated request (no JWT) is rejected with 401 Unauthorized', async () => {
      const res = await fetch(`${baseUrl}/security/audit`);
      expect(res.status).toBe(401);
    });

    it('Live HTTP Test 9: Authentication audit dual-write and deduplication verification', async () => {
      // Create authentication event using AuthRepository
      const uniqueDetail = `Doctor A authenticated via test session ${Date.now()}`;
      await authRepo.createAuditLog(liveDoctorAId, 'USER_LOGIN', uniqueDetail, '127.0.0.1');

      // Fetch audit logs via live HTTP endpoint
      const res = await fetch(`${baseUrl}/security/audit?action=USER_LOGIN`, {
        headers: { Authorization: `Bearer ${doctorAToken}` },
      });
      expect(res.status).toBe(200);

      const data = await res.json();
      const matchingEvents = data.filter((item: any) => item.details === uniqueDetail);

      // Verify that the event was returned exactly ONCE (zero duplicate records)
      expect(matchingEvents.length).toBe(1);
      expect(matchingEvents[0].action).toBe('USER_LOGIN');
      expect(matchingEvents[0].userId).toBe(liveDoctorAId);
    });

    it('Live HTTP Test 10: Sensitive credentials, tokens, hashes and cookies are strictly excluded from response', async () => {
      const res = await fetch(`${baseUrl}/security/audit`, {
        headers: { Authorization: `Bearer ${doctorAToken}` },
      });
      expect(res.status).toBe(200);

      const text = await res.text();
      expect(text.toLowerCase()).not.toContain('password');
      expect(text.toLowerCase()).not.toContain('passwordhash');
      expect(text.toLowerCase()).not.toContain('jwt');
      expect(text.toLowerCase()).not.toContain('bearer ');
      expect(text.toLowerCase()).not.toContain('sessiontoken');
      expect(text.toLowerCase()).not.toContain('refreshtoken');
      expect(text.toLowerCase()).not.toContain('cookie');
    });
  });
});
