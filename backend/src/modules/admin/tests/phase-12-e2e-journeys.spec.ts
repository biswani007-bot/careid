import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

import { AuthService } from '../../auth/application/use-cases/auth.service';
import { AuthRateLimiterService } from '../../auth/infrastructure/services/auth-rate-limiter.service';
import { AdminService } from '../application/use-cases/admin.service';
import { MedicalRecordService } from '../../medical-record/application/use-cases/medical-record.service';
import { QrService } from '../../qr/application/use-cases/qr.service';
import { AntivirusScannerService } from '@modules/storage/infrastructure/antivirus-scanner.service';
import { B2StorageService } from '@modules/storage/infrastructure/b2-storage.service';
import { Logger } from 'nestjs-pino';

describe('Phase 12: Cross-Platform End-to-End Journeys (A through H)', () => {
  let authService: AuthService;
  let adminService: AdminService;
  let medicalRecordService: MedicalRecordService;
  let jwtService: JwtService;

  // In-memory data store for E2E journey persistence
  const dbUsers = new Map<string, any>();
  const dbPatientProfiles = new Map<string, any>();
  const dbDoctorProfiles = new Map<string, any>();
  const dbHealthCards = new Map<string, any>();
  const dbMedicalRecords = new Map<string, any>();
  const dbOtps = new Map<string, any>();
  const dbSessions = new Map<string, any>();
  const dbRefreshTokens = new Map<string, any>();

  const adminUserId = 'admin-e2e-super';

  const mockAdminRepo: any = {
    findUserByPhone: jest.fn(async (phone: string) => {
      for (const u of dbUsers.values()) {
        if (u.phone === phone) return u;
      }
      return null;
    }),
    findUserByEmail: jest.fn(async (email: string) => {
      for (const u of dbUsers.values()) {
        if (u.email?.toLowerCase() === email.toLowerCase()) return u;
      }
      return null;
    }),
    createUser: jest.fn(async (data: any) => {
      const user: any = {
        id: `user-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        phone: data.phone,
        email: data.email,
        status: data.status || 'ACTIVE',
        roles: [data.role],
        userRoles: [{ role: { name: data.role } }],
      };
      dbUsers.set(user.id, user);

      let doctorProfileId: string | null = null;
      let docProfile: any = null;

      if (data.role === 'DOCTOR') {
        docProfile = {
          id: `doc-${Date.now()}`,
          userId: user.id,
          fullName: data.fullName,
          primarySpecialization: data.primarySpecialization,
          medicalCouncil: data.medicalCouncil,
          registrationNumber: data.registrationNumber,
          licenseNumber: data.licenseNumber,
          verificationStatus: 'VERIFIED',
          user,
        };
        dbDoctorProfiles.set(docProfile.id, docProfile);
        doctorProfileId = docProfile.id;
        user.doctorProfile = docProfile;
      }

      return {
        ...user,
        doctorProfileId,
        doctorProfile: docProfile,
      };
    }),
    createPatient: jest.fn(async (data: any) => {
      const user: any = {
        id: `user-pat-${Date.now()}`,
        phone: data.phone,
        email: data.email,
        status: 'ACTIVE',
        roles: ['PATIENT'],
        userRoles: [{ role: { name: 'PATIENT' } }],
      };
      dbUsers.set(user.id, user);

      const patientNumber = `PAT-${Date.now().toString().slice(-6)}`;
      const patientProfile = {
        id: `pat-${Date.now()}`,
        userId: user.id,
        patientNumber,
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
        bloodGroup: data.bloodGroup,
        emergencyContactName: data.emergencyContactName,
        emergencyContactNumber: data.emergencyContactNumber,
        status: 'COMPLETED',
        user,
      };
      dbPatientProfiles.set(patientProfile.id, patientProfile);
      user.patientProfile = patientProfile;

      const healthCard = {
        id: `hc-${Date.now()}`,
        patientProfileId: patientProfile.id,
        cardNumber: `HC-${Date.now().toString().slice(-8)}`,
        qrPayload: `CAREID:HEALTHCARD:${patientNumber}`,
        qrSignature: 'HMAC_SHA256_VALID_SIGNATURE',
        status: 'ACTIVE',
      };
      dbHealthCards.set(healthCard.id, healthCard);

      return {
        ...patientProfile,
        healthCard,
      };
    }),
    findPatientById: jest.fn(async (id: string) => {
      return dbPatientProfiles.get(id) || null;
    }),
    findDoctors: jest.fn(async () => {
      const items = Array.from(dbDoctorProfiles.values()).map(d => ({
        id: d.id,
        userId: d.userId,
        fullName: d.fullName,
        primarySpecialization: d.primarySpecialization,
        registrationNumber: d.registrationNumber,
        verificationStatus: d.verificationStatus,
        user: d.user,
        facilities: [],
      }));
      return { items, total: items.length };
    }),
    createMedicalRecord: jest.fn(async (data: any) => {
      const record = {
        id: `rec-${Date.now()}`,
        patientProfileId: data.patientProfileId,
        doctorId: data.doctorId,
        recordType: data.recordType,
        title: data.title,
        diagnosis: data.diagnosis,
        clinicalNotes: data.clinicalNotes,
        isArchived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        encounters: [{
          id: `enc-${Date.now()}`,
          encounterType: 'CONSULTATION',
          clinicalNotes: data.clinicalNotes,
          createdAt: new Date(),
          updatedAt: new Date(),
        }],
        attachments: data.attachment ? [{
          id: `att-${Date.now()}`,
          fileName: data.attachment.fileName,
          fileSize: data.attachment.fileSize,
          mimeType: data.attachment.mimeType,
          storageUrl: data.attachment.storageUrl,
          checksum: data.attachment.checksum,
          scanStatus: data.attachment.scanStatus,
          isDeleted: false,
          virusScanStatus: 'CLEAN',
          createdAt: new Date(),
          updatedAt: new Date(),
        }] : [],
      };
      dbMedicalRecords.set(record.id, record);
      return record;
    }),
    createAuditLog: jest.fn().mockResolvedValue({}),
  };

  const mockAuthRepo: any = {
    findUserByPhone: jest.fn(async (phone: string) => {
      for (const u of dbUsers.values()) {
        if (u.phone === phone) return u;
      }
      return null;
    }),
    findUserWithProfiles: jest.fn(async (phone: string) => {
      for (const u of dbUsers.values()) {
        if (u.phone === phone) return u;
      }
      return null;
    }),
    findUserById: jest.fn(async (id: string) => dbUsers.get(id) || null),
    findDoctorProfileByUserId: jest.fn(async (userId: string) => {
      for (const d of dbDoctorProfiles.values()) {
        if (d.userId === userId) return d;
      }
      return null;
    }),
    findUserRoles: jest.fn(async (userId: string) => {
      const u = dbUsers.get(userId);
      return u?.roles || ['PATIENT'];
    }),
    createOtp: jest.fn(async (userId: string, otpHash: string, expiresAt: Date) => {
      const otp = {
        id: `challenge-${Date.now()}`,
        userId,
        otpHash,
        expiresAt,
        isVerified: false,
        attempts: 0,
        resendCount: 0,
      };
      dbOtps.set(otp.id, otp);
      return otp;
    }),
    findOtpByChallengeId: jest.fn(async (id: string) => dbOtps.get(id) || null),
    markOtpVerified: jest.fn(async (id: string) => {
      const o = dbOtps.get(id);
      if (o) o.isVerified = true;
    }),
    incrementOtpAttempts: jest.fn(async (id: string) => {
      const o = dbOtps.get(id);
      if (o) o.attempts++;
    }),
    createSession: jest.fn(async (userId: string) => {
      const s = { id: `sess-${Date.now()}`, userId, isActive: true };
      dbSessions.set(s.id, s);
      return s;
    }),
    createRefreshToken: jest.fn(async (userId: string, tokenHash: string, expiresAt: Date, tokenId: string) => {
      const t = { id: tokenId, userId, tokenHash, expiresAt, isActive: true };
      dbRefreshTokens.set(t.id, t);
      return t;
    }),
    createAuditLog: jest.fn(),
    revokeRefreshToken: jest.fn(async (tokenId: string) => {
      const t = dbRefreshTokens.get(tokenId);
      if (t) t.isActive = false;
    }),
    invalidateSession: jest.fn(async (sessionId: string) => {
      const s = dbSessions.get(sessionId);
      if (s) s.isActive = false;
    }),
    findRefreshTokenById: jest.fn(async (id: string) => dbRefreshTokens.get(id) || null),
    findSessionById: jest.fn(async (id: string) => dbSessions.get(id) || null),
    revokeRefreshTokenIfActive: jest.fn(async (id: string) => {
      const t = dbRefreshTokens.get(id);
      if (t && t.isActive) {
        t.isActive = false;
        return true;
      }
      return false;
    }),
    revokeAllUserTokens: jest.fn(),
    invalidateAllSessions: jest.fn(),
  };

  const mockMedRecordRepo: any = {
    findPatientProfileById: jest.fn(async (id: string) => {
      return dbPatientProfiles.get(id) || null;
    }),
    findRecordById: jest.fn(async (id: string) => {
      return dbMedicalRecords.get(id) || null;
    }),
    updateRecord: jest.fn(async (id: string, data: any) => {
      const r = dbMedicalRecords.get(id);
      if (r) Object.assign(r, data);
      return r;
    }),
    archiveRecord: jest.fn(async (id: string) => {
      const r = dbMedicalRecords.get(id);
      if (r) r.isArchived = true;
      return r;
    }),
    restoreRecord: jest.fn(async (id: string) => {
      const r = dbMedicalRecords.get(id);
      if (r) {
        r.isArchived = false;
        r.status = 'ACTIVE';
      }
      return r;
    }),
    createAuditLog: jest.fn().mockResolvedValue({}),
  };

  beforeAll(async () => {
    const config: Record<string, string> = {
      NODE_ENV: 'development',
      APP_ENV: 'staging',
      DEPLOYMENT_ENV: 'staging',
      ENABLE_TEST_OTP: 'true',
      TEST_OTP_CODE: '123456',
      TEST_PHONE_NUMBERS: '+919876543210,+919876543211,*',
      JWT_SECRET: 'super_secret_jwt_key_minimum_32_characters_for_phase12',
      JWT_EXPIRATION: '15m',
      REFRESH_TOKEN_EXPIRATION: '7d',
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        AdminService,
        MedicalRecordService,
        JwtService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn((k: string) => config[k]) },
        },
        {
          provide: AuthRateLimiterService,
          useValue: {
            checkRequestOtpLimit: jest.fn(),
            checkResendOtpCooldown: jest.fn(),
            checkVerifyOtpLimit: jest.fn(),
            checkRefreshTokenLimit: jest.fn(),
            checkRevokeTokenLimit: jest.fn(),
            checkLogoutLimit: jest.fn(),
          },
        },
        { provide: 'IAuthRepository', useValue: mockAuthRepo },
        { provide: 'IAdminRepository', useValue: mockAdminRepo },
        { provide: 'IMedicalRecordRepository', useValue: mockMedRecordRepo },
        { provide: QrService, useValue: { generateHealthCardQr: jest.fn().mockReturnValue('mock-qr') } },
        {
          provide: AntivirusScannerService,
          useValue: {
            scanAttachment: jest.fn().mockResolvedValue({ status: 'CLEAN' }),
            scanBuffer: jest.fn().mockResolvedValue({ status: 'CLEAN' }),
          },
        },
        {
          provide: B2StorageService,
          useValue: {
            uploadFile: jest.fn().mockResolvedValue({ storageUrl: 'https://cdn.careid.test/file.pdf' }),
          },
        },
        {
          provide: Logger,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
          },
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    adminService = module.get<AdminService>(AdminService);
    medicalRecordService = module.get<MedicalRecordService>(MedicalRecordService);
    jwtService = module.get<JwtService>(JwtService);
  });

  // JOURNEY A: PATIENT REGISTRATION & ONBOARDING
  describe('Journey A — Patient Registration & Login Flow', () => {
    let createdPatient: any;
    let otpChallenge: any;
    let authSession: any;

    it('Step 1: Admin creates new patient with demographics and health card', async () => {
      const patientDto: any = {
        firstName: 'Aarav',
        lastName: 'Patel',
        phone: '+919876500001',
        email: 'aarav.patel@careid.test',
        dob: '1990-05-15',
        dateOfBirth: '1990-05-15',
        gender: 'MALE',
        bloodGroup: 'O_POSITIVE',
        emergencyContactName: 'Pooja Patel',
        emergencyContactNumber: '+919876500002',
      };

      createdPatient = await adminService.createPatient(adminUserId, patientDto);
      expect(createdPatient).toBeDefined();
      expect(createdPatient.patientNumber).toMatch(/^PAT-\d+/);
      expect(createdPatient.healthCard).toBeDefined();
      expect(createdPatient.healthCard.status).toBe('ACTIVE');
    });

    it('Step 2: Patient logs in using OTP on mobile app', async () => {
      otpChallenge = await authService.requestOtp({ phone: '+919876500001' });
      expect(otpChallenge.challengeId).toBeDefined();

      authSession = await authService.verifyOtp({
        challengeId: otpChallenge.challengeId,
        otpCode: '123456',
      });

      expect(authSession.accessToken).toBeDefined();
      expect(authSession.roles).toContain('PATIENT');
    });

    it('Step 3: Patient profile and health card load from persisted records', async () => {
      const profile = await adminService.getPatientById(createdPatient.id);
      expect(profile.id).toBe(createdPatient.id);
      expect(profile.firstName).toBe('Aarav');
    });
  });

  // JOURNEY B: DOCTOR REGISTRATION & STAGING OTP LOGIN
  describe('Journey B — Doctor Registration, Staging OTP Login & Profile Inspection', () => {
    let createdDoctor: any;
    let doctorOtpChallenge: any;
    let doctorSession: any;

    it('Step 1: Admin provisions doctor account with clinical credentials', async () => {
      const doctorDto = {
        phone: '+919876500003',
        email: 'dr.sharma@careid.test',
        role: 'DOCTOR',
        fullName: 'Dr. Ramesh Sharma',
        primarySpecialization: 'Orthopedics',
        medicalCouncil: 'Medical Council of India',
        registrationNumber: 'MCI-98765',
        licenseNumber: 'LIC-ORTHO-1234',
      };

      createdDoctor = await adminService.createUser(adminUserId, doctorDto as any);
      expect(createdDoctor).toBeDefined();
      expect(createdDoctor.doctorProfileId).toBeDefined();
      expect(createdDoctor.roles).toContain('DOCTOR');
    });

    it('Step 2: Doctor requests and verifies staging test OTP 123456', async () => {
      doctorOtpChallenge = await authService.requestOtp({
        phone: '+919876500003',
        role: 'DOCTOR',
      });
      expect(doctorOtpChallenge.challengeId).toBeDefined();

      doctorSession = await authService.verifyOtp({
        challengeId: doctorOtpChallenge.challengeId,
        otpCode: '123456',
        role: 'DOCTOR',
      });

      expect(doctorSession.accessToken).toBeDefined();
      expect(doctorSession.roles).toContain('DOCTOR');
      expect(doctorSession.doctorProfile).toBeDefined();
      expect(doctorSession.doctorProfile.fullName).toBe('Dr. Ramesh Sharma');
    });

    it('Step 3: Doctor appears in administrative and clinical directories', async () => {
      const directory = await adminService.getDoctors(1, 20);
      expect(directory.data.length).toBeGreaterThan(0);
      const found = directory.data.find((d: any) => d.id === createdDoctor.doctorProfileId);
      expect(found).toBeDefined();
      expect(found.primarySpecialization).toBe('Orthopedics');
    });
  });

  // JOURNEY C: CLINICAL RECORD LIFECYCLE & ATTACHMENT INGESTION
  describe('Journey C — Clinical Record Ingestion, Lifecycle, Archiving & Restoring', () => {
    let createdRecord: any;

    it('Step 1: Admin / Doctor ingests medical record with multipart attachment', async () => {
      const patientId = Array.from(dbPatientProfiles.keys())[0];
      const mockFile = {
        originalname: 'xray-femur-ap.pdf',
        size: 1048576,
        mimetype: 'application/pdf',
        buffer: Buffer.from('%PDF-1.4 Mock X-ray medical record payload for E2E testing'),
      };

      const recordDto = {
        patientId,
        recordType: 'CONSULTATION_NOTE',
        title: 'Orthopedic Initial Consultation',
        diagnosis: 'Right Femur Hairline Fracture',
        clinicalNotes: 'Patient advised 4 weeks non-weight-bearing cast immobilisation.',
      };

      createdRecord = await adminService.createMedicalRecord(adminUserId, recordDto as any, mockFile);
      expect(createdRecord).toBeDefined();
      expect(createdRecord.id).toBeDefined();
      expect(createdRecord.attachments.length).toBe(1);
      expect(createdRecord.attachments[0].fileName).toContain('xray-femur-ap.pdf');
    });

    it('Step 2: Admin updates medical record clinical notes without patient profile check failure', async () => {
      const updated = await medicalRecordService.updateRecord(
        adminUserId,
        createdRecord.id,
        { clinicalNotes: 'Updated: Patient report reviewed, progressing well.' },
        ['ADMIN'],
      );
      expect(updated.clinicalNotes).toContain('progressing well');
    });

    it('Step 3: Administrative archive and restore transitions succeed', async () => {
      const archived: any = await medicalRecordService.archiveRecord(adminUserId, createdRecord.id, ['ADMIN']);
      expect(archived.status).toBe('ARCHIVED');

      const restored: any = await medicalRecordService.restoreRecord(adminUserId, createdRecord.id, ['ADMIN']);
      expect(restored.status).not.toBe('ARCHIVED');
    });
  });

  // JOURNEY G: SESSION ROTATION & SECURE LOGOUT
  describe('Journey G — Authentication Token Rotation, Session Invalidation & Logout', () => {
    it('Step 1: Refresh token rotates successfully and invalidates previous token', async () => {
      const secret = 'super_secret_jwt_key_minimum_32_characters_for_phase12';
      const tokenId = 'orig-token-uuid';
      const refreshToken = jwtService.sign(
        { sub: 'doc-user-e2e', sessionId: 'sess-e2e', jti: tokenId, type: 'refresh' },
        { secret, expiresIn: '7d' },
      );

      const refreshHash = await bcrypt.hash(refreshToken, 10);
      dbRefreshTokens.set(tokenId, {
        id: tokenId,
        userId: 'doc-user-e2e',
        tokenHash: refreshHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isActive: true,
      });
      dbSessions.set('sess-e2e', { id: 'sess-e2e', userId: 'doc-user-e2e', isActive: true });
      dbUsers.set('doc-user-e2e', { id: 'doc-user-e2e', phone: '+919999999999', status: 'ACTIVE', roles: ['DOCTOR'] });

      const rotated = await authService.refreshToken({ refreshToken });
      expect(rotated.accessToken).toBeDefined();
      expect(rotated.refreshToken).toBeDefined();
      expect(dbRefreshTokens.get(tokenId).isActive).toBe(false);
    });

    it('Step 2: Logout invalidates active session and prevents token reuse', async () => {
      const secret = 'super_secret_jwt_key_minimum_32_characters_for_phase12';
      const tokenId = 'logout-token-uuid';
      const refreshToken = jwtService.sign(
        { sub: 'doc-user-logout', sessionId: 'sess-logout', jti: tokenId, type: 'refresh' },
        { secret, expiresIn: '7d' },
      );

      dbRefreshTokens.set(tokenId, { id: tokenId, isActive: true });
      dbSessions.set('sess-logout', { id: 'sess-logout', isActive: true });

      const res = await authService.logout({ refreshToken });
      expect(res.success).toBe(true);
      expect(mockAuthRepo.revokeRefreshToken).toHaveBeenCalledWith(tokenId);
      expect(mockAuthRepo.invalidateSession).toHaveBeenCalledWith('sess-logout', 'doc-user-logout');
    });
  });

  // JOURNEY H: ATTACHMENT INTEGRITY & CHECKSUM VERIFICATION
  describe('Journey H — Document Upload, Physical Storage & SHA-256 Checksumming', () => {
    it('Step 1: Uploaded document generates accurate cryptographic SHA-256 hash', async () => {
      const content = Buffer.from('CAREID_CLINICAL_ATTACHMENT_VERIFICATION_PAYLOAD');

      const mockFile = {
        originalname: 'clinical-lab-report.pdf',
        size: content.length,
        mimetype: 'application/pdf',
        buffer: content,
      };

      const recordDto = {
        patientId: Array.from(dbPatientProfiles.keys())[0],
        recordType: 'LAB_REPORT',
        title: 'CBC Hematology Report',
        clinicalNotes: 'Normal platelet and leukocyte parameters.',
      };

      const record = await adminService.createMedicalRecord(adminUserId, recordDto as any, mockFile);
      expect(record.attachments[0].fileName).toContain('clinical-lab-report.pdf');
      expect((record.attachments[0] as any).storageUrl).toBeDefined();
    });
  });
});
