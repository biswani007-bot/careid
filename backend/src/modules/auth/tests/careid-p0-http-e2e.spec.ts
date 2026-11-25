import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs';

import { AttachmentController, MedicalRecordController } from '@modules/medical-record/presentation/controllers/medical-record.controller';
import { MedicalRecordService } from '@modules/medical-record/application/use-cases/medical-record.service';
import { InsuranceController } from '@modules/insurance/presentation/controllers/insurance.controller';
import { InsuranceService } from '@modules/insurance/application/use-cases/insurance.service';
import { PatientController } from '@modules/patient/presentation/controllers/patient.controller';
import { PatientService } from '@modules/patient/application/use-cases/patient.service';
import { SecurityController } from '@modules/security/presentation/controllers/security.controller';
import { SecurityService } from '@modules/security/application/use-cases/security.service';
import { B2StorageService } from '@modules/storage/infrastructure/b2-storage.service';
import { JwtStrategy } from '@modules/auth/infrastructure/validators/jwt.strategy';
import { RolesGuard } from '@modules/auth/infrastructure/guards/roles.guard';
import { QrService } from '@modules/qr/application/use-cases/qr.service';
import { Logger } from 'nestjs-pino';
import { OcrWorkerClient } from '@modules/ocr/infrastructure/clients/ocr-worker.client';

describe('CareID P0 Authenticated HTTP Integration E2E Suite', () => {
  jest.setTimeout(30000);
  let app: INestApplication;
  let baseUrl: string;
  let jwtService: JwtService;

  const PATIENT_USER_1 = '11111111-1111-1111-1111-111111111111';
  const PATIENT_PROFILE_1 = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const PATIENT_USER_2 = '22222222-2222-2222-2222-222222222222';
  const PATIENT_PROFILE_2 = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  const DOCTOR_USER_1 = '33333333-3333-3333-3333-333333333333';
  const ADMIN_USER_1 = '44444444-4444-4444-4444-444444444444';

  let patient1Token: string;
  let patient2Token: string;
  let doctorToken: string;
  let adminToken: string;

  let mockMedicalRepo: any;
  let mockInsuranceRepo: any;
  let mockPatientRepo: any;
  let mockSecurityRepo: any;

  beforeAll(async () => {
    jwtService = new JwtService({ secret: 'hvapi_default_secret_key' });
    patient1Token = jwtService.sign({ sub: PATIENT_USER_1, roles: ['PATIENT'] });
    patient2Token = jwtService.sign({ sub: PATIENT_USER_2, roles: ['PATIENT'] });
    doctorToken = jwtService.sign({ sub: DOCTOR_USER_1, roles: ['DOCTOR'] });
    adminToken = jwtService.sign({ sub: ADMIN_USER_1, roles: ['ADMIN'] });

    mockMedicalRepo = {
      findProfileByUserId: jest.fn().mockImplementation((uid) => {
        if (uid === PATIENT_USER_1) return Promise.resolve({ id: PATIENT_PROFILE_1, userId: uid });
        if (uid === PATIENT_USER_2) return Promise.resolve({ id: PATIENT_PROFILE_2, userId: uid });
        return Promise.resolve(null);
      }),
      findPatientProfileById: jest.fn().mockImplementation((id) => {
        if (id === PATIENT_PROFILE_1) return Promise.resolve({ id: PATIENT_PROFILE_1, userId: PATIENT_USER_1 });
        if (id === PATIENT_PROFILE_2) return Promise.resolve({ id: PATIENT_PROFILE_2, userId: PATIENT_USER_2 });
        return Promise.resolve(null);
      }),
      verifyDoctorAccessToPatient: jest.fn().mockImplementation((docId, pid) => {
        // Doctor 1 only has access to Patient 1, not Patient 2
        return Promise.resolve(docId === DOCTOR_USER_1 && pid === PATIENT_PROFILE_1);
      }),
      createAttachment: jest.fn().mockImplementation((data) => Promise.resolve({ id: 'att-uuid-1', ...data, createdAt: new Date(), updatedAt: new Date() })),
      createAuditLog: jest.fn().mockResolvedValue({}),
      findAttachmentById: jest.fn(),
      findRecordById: jest.fn(),
    };

    mockInsuranceRepo = {
      findProfileByUserId: jest.fn().mockImplementation((uid) => {
        if (uid === PATIENT_USER_1) return Promise.resolve({ id: PATIENT_PROFILE_1 });
        if (uid === PATIENT_USER_2) return Promise.resolve({ id: PATIENT_PROFILE_2 });
        return Promise.resolve(null);
      }),
      saveOcrRecord: jest.fn().mockImplementation((pid, url, ext) => Promise.resolve({
        id: 'ocr-uuid-1',
        patientProfileId: pid,
        imageUrl: url,
        extractedData: ext,
        createdAt: new Date(),
      })),
      findOcrRecordById: jest.fn(),
      findProviders: jest.fn().mockResolvedValue([]),
    };

    mockPatientRepo = {
      findProfileByUserId: jest.fn().mockImplementation((uid) => {
        if (uid === PATIENT_USER_1) return Promise.resolve({ id: PATIENT_PROFILE_1, photoUrl: null, photoKey: null });
        if (uid === PATIENT_USER_2) return Promise.resolve({ id: PATIENT_PROFILE_2, photoUrl: null, photoKey: null });
        return Promise.resolve(null);
      }),
      updateProfile: jest.fn().mockResolvedValue({}),
      createProfileAuditLog: jest.fn().mockResolvedValue({}),
      findEmergencyContactByProfileId: jest.fn().mockResolvedValue(null),
      findInsurancePolicyByProfileId: jest.fn().mockResolvedValue(null),
      findHealthCardByProfileId: jest.fn().mockResolvedValue(null),
    };

    mockSecurityRepo = {
      findPatientProfileByUserId: jest.fn().mockImplementation((uid) => {
        if (uid === PATIENT_USER_1) return Promise.resolve({ id: PATIENT_PROFILE_1, userId: uid });
        if (uid === PATIENT_USER_2) return Promise.resolve({ id: PATIENT_PROFILE_2, userId: uid });
        return Promise.resolve(null);
      }),
      validatePatientExists: jest.fn().mockImplementation((pid) => Promise.resolve(pid === PATIENT_PROFILE_1 || pid === PATIENT_PROFILE_2)),
      validateDoctorExists: jest.fn().mockResolvedValue(true),
      validateFacilityExists: jest.fn().mockResolvedValue(true),
      createConsent: jest.fn().mockImplementation((data) => Promise.resolve({
        id: 'consent-uuid-1',
        status: data.status || 'GRANTED',
        grantedAt: data.grantedAt,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      createAuditLog: jest.fn().mockResolvedValue({}),
      findConsentById: jest.fn().mockImplementation((id) => {
        if (id === 'consent-uuid-1') {
          return Promise.resolve({
            id: 'consent-uuid-1',
            patientId: PATIENT_PROFILE_1,
            status: 'PENDING',
            consentType: 'TREATMENT',
            purpose: 'General treatment',
            expiresAt: new Date(Date.now() + 86400000),
            createdAt: new Date(),
          });
        }
        if (id === 'consent-expired-1') {
          return Promise.resolve({
            id: 'consent-expired-1',
            patientId: PATIENT_PROFILE_1,
            status: 'PENDING',
            consentType: 'TREATMENT',
            purpose: 'Expired treatment',
            expiresAt: new Date(Date.now() - 86400000), // Expired
            createdAt: new Date(),
          });
        }
        return Promise.resolve(null);
      }),
      confirmConsent: jest.fn().mockImplementation((id) => Promise.resolve({
        id,
        patientId: PATIENT_PROFILE_1,
        status: 'GRANTED',
        grantedAt: new Date(),
        updatedAt: new Date(),
      })),
      withdrawConsent: jest.fn().mockImplementation((id) => Promise.resolve({
        id,
        patientId: PATIENT_PROFILE_1,
        status: 'WITHDRAWN',
        withdrawnAt: new Date(),
        updatedAt: new Date(),
      })),
      findActiveConsents: jest.fn().mockResolvedValue([]),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({
          secret: 'hvapi_default_secret_key',
          signOptions: { expiresIn: '1h' },
        }),
        ConfigModule.forRoot({ isGlobal: true }),
      ],
      controllers: [
        AttachmentController,
        InsuranceController,
        PatientController,
        SecurityController,
      ],
      providers: [
        MedicalRecordService,
        InsuranceService,
        PatientService,
        SecurityService,
        {
          provide: B2StorageService,
          useValue: {
            isConfigured: jest.fn().mockReturnValue(false),
            uploadFile: jest.fn().mockResolvedValue({ key: 'test', location: 'test' }),
            getDownloadUrl: jest.fn().mockResolvedValue('https://test.com/file'),
          },
        },
        JwtStrategy,
        RolesGuard,
        { provide: 'IMedicalRecordRepository', useValue: mockMedicalRepo },
        { provide: 'IInsuranceRepository', useValue: mockInsuranceRepo },
        { provide: 'IPatientRepository', useValue: mockPatientRepo },
        { provide: 'ISecurityRepository', useValue: mockSecurityRepo },
        {
          provide: OcrWorkerClient,
          useValue: {
            isReady: jest.fn().mockResolvedValue(true),
            processBuffer: jest.fn().mockResolvedValue({
              success: true,
              documentType: 'INSURANCE_CARD',
              sourceFile: 'insurance-front.jpg',
              pageCount: 1,
              overallConfidence: 0.95,
              combinedText: 'HEALTH VAULT 360 INSURANCE\nProvider: State Life\nPolicy: POL-999',
              pages: [],
              durationMs: 250,
              engine: 'PP-OCRv4-Mobile-CPU',
            }),
            processFile: jest.fn(),
          },
        },
        { provide: QrService, useValue: { generateQr: jest.fn(), verifyQrPayload: jest.fn() } },
        { provide: Logger, useValue: { log: jest.fn(), warn: jest.fn(), error: jest.fn() } },
        { provide: ConfigService, useValue: { get: (k: string) => k === 'JWT_SECRET' ? 'hvapi_default_secret_key' : undefined } },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

    await app.init();
    await app.listen(0);
    const address = app.getHttpServer().address();
    baseUrl = `http://127.0.0.1:${address.port}/api/v1`;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  // ─── A1.1 Missing Authentication & Invalid Token ──────────────────────────
  describe('HTTP Authentication Guards', () => {
    it('should return 401 Unauthorized when Authorization header is missing', async () => {
      const res = await fetch(`${baseUrl}/security/consents`);
      expect(res.status).toBe(401);
    });

    it('should return 401 Unauthorized when an invalid Bearer token is provided', async () => {
      const res = await fetch(`${baseUrl}/security/consents`, {
        headers: { Authorization: 'Bearer invalid.bogus.jwt' },
      });
      expect(res.status).toBe(401);
    });
  });

  // ─── A1.2 Patient & Doctor Attachment Uploads ─────────────────────────────
  describe('Attachment Upload Endpoints (POST /api/v1/attachments)', () => {
    it('should allow authenticated patient to upload attachment for self', async () => {
      const formData = new FormData();
      const pdfBuffer = Buffer.from('%PDF-1.5 test content');
      const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
      formData.append('file', blob, 'lab-report.pdf');

      const res = await fetch(`${baseUrl}/attachments`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${patient1Token}` },
        body: formData,
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.id).toBe('att-uuid-1');
      expect(body.patientProfileId).toBe(PATIENT_PROFILE_1);
      expect(body.fileName).toContain(`att-${PATIENT_PROFILE_1}-`);
    });

    it('should reject patient attempt to upload attachment for another patient (Cross-patient)', async () => {
      const formData = new FormData();
      const pdfBuffer = Buffer.from('%PDF-1.5 test content');
      const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
      formData.append('file', blob, 'lab-report.pdf');
      formData.append('patientProfileId', PATIENT_PROFILE_2); // Target is Patient 2

      const res = await fetch(`${baseUrl}/attachments`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${patient1Token}` }, // Caller is Patient 1
        body: formData,
      });

      expect(res.status).toBe(403);
    });

    it('should allow authorized doctor to upload clinical attachment for target patient', async () => {
      const formData = new FormData();
      const pdfBuffer = Buffer.from('%PDF-1.5 clinical note');
      const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
      formData.append('file', blob, 'clinical-notes.pdf');
      formData.append('patientProfileId', PATIENT_PROFILE_1); // Target is Patient 1 (authorized)

      const res = await fetch(`${baseUrl}/attachments`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${doctorToken}` },
        body: formData,
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.patientProfileId).toBe(PATIENT_PROFILE_1);
    });

    it('should reject doctor upload when doctor lacks relationship with target patient', async () => {
      const formData = new FormData();
      const pdfBuffer = Buffer.from('%PDF-1.5 clinical note');
      const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
      formData.append('file', blob, 'clinical-notes.pdf');
      formData.append('patientProfileId', PATIENT_PROFILE_2); // Doctor has NO access to Patient 2

      const res = await fetch(`${baseUrl}/attachments`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${doctorToken}` },
        body: formData,
      });

      expect(res.status).toBe(403);
    });

    it('should reject doctor upload when target patientProfileId does not exist', async () => {
      const formData = new FormData();
      const pdfBuffer = Buffer.from('%PDF-1.5 clinical note');
      const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
      formData.append('file', blob, 'clinical-notes.pdf');
      formData.append('patientProfileId', '00000000-0000-0000-0000-000000000000');

      const res = await fetch(`${baseUrl}/attachments`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${doctorToken}` },
        body: formData,
      });

      expect(res.status).toBe(404);
    });

    it('should reject upload when file extension is not permitted', async () => {
      const formData = new FormData();
      const exeBuffer = Buffer.from('MZ evil executable payload');
      const blob = new Blob([exeBuffer], { type: 'application/x-dosexec' });
      formData.append('file', blob, 'malware.exe');

      const res = await fetch(`${baseUrl}/attachments`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${patient1Token}` },
        body: formData,
      });

      expect(res.status).toBe(400);
    });

    it('should reject upload when file size exceeds limit (15MB)', async () => {
      const formData = new FormData();
      // Fake a 16MB file using Blob
      const oversizedBuffer = Buffer.alloc(16 * 1024 * 1024);
      const blob = new Blob([oversizedBuffer], { type: 'application/pdf' });
      formData.append('file', blob, 'huge.pdf');

      const res = await fetch(`${baseUrl}/attachments`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${patient1Token}` },
        body: formData,
      });

      // 400 Bad Request or 413 Payload Too Large
      expect([400, 413]).toContain(res.status);
    });
  });

  // ─── A1.3 Insurance Card Uploads ──────────────────────────────────────────
  describe('Insurance Card Upload (POST /api/v1/insurance/ocr)', () => {
    it('should allow patient to upload insurance card image and receive extracted preview', async () => {
      const formData = new FormData();
      const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
      const blob = new Blob([jpegBuffer], { type: 'image/jpeg' });
      formData.append('file', blob, 'insurance-front.jpg');

      const res = await fetch(`${baseUrl}/insurance/ocr`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${patient1Token}` },
        body: formData,
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ocrId).toBe('ocr-uuid-1');
      expect(body.extractedData).toBeDefined();
    });
  });

  // ─── A1.4 Patient Profile Photo Upload & Retrieval ────────────────────────
  describe('Patient Profile Photo (POST & GET /api/v1/patients/me/photo)', () => {
    let uploadedPhotoFilename: string;

    it('should allow patient to upload photo and save locally', async () => {
      const formData = new FormData();
      const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
      const blob = new Blob([jpegBuffer], { type: 'image/jpeg' });
      formData.append('file', blob, 'avatar.jpg');

      const res = await fetch(`${baseUrl}/patients/me/photo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${patient1Token}` },
        body: formData,
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.photoUrl).toBeDefined();
      uploadedPhotoFilename = path.basename(body.photoUrl);
    });

    it('should stream uploaded profile photo with private security headers', async () => {
      if (!uploadedPhotoFilename) return;

      const res = await fetch(`${baseUrl}/patients/me/photo/file/${uploadedPhotoFilename}`, {
        headers: { Authorization: `Bearer ${patient1Token}` },
      });

      expect(res.status).toBe(200);
      expect(res.headers.get('cache-control')).toContain('private, no-store');
      expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    });

    it('should reject unauthorized cross-patient attempt to view photo', async () => {
      if (!uploadedPhotoFilename) return;

      const res = await fetch(`${baseUrl}/patients/me/photo/file/${uploadedPhotoFilename}`, {
        headers: { Authorization: `Bearer ${patient2Token}` }, // Patient 2 attempting to view Patient 1's photo
      });

      expect(res.status).toBe(403);
    });
  });

  // ─── A4. Security Consent HTTP Endpoints ──────────────────────────────────
  describe('Security Consent Endpoints (POST /api/v1/security/consents)', () => {
    it('should allow patient to grant consent for own profile with immediate GRANTED status', async () => {
      const res = await fetch(`${baseUrl}/security/consents`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${patient1Token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientId: PATIENT_PROFILE_1,
          consentType: 'TREATMENT',
          purpose: 'Surgery authorization',
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.status).toBe('GRANTED');
      expect(body.patientId).toBe(PATIENT_PROFILE_1);
    });

    it('should reject patient attempt to grant consent for another patient (Cross-patient)', async () => {
      const res = await fetch(`${baseUrl}/security/consents`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${patient1Token}`, // Caller is Patient 1
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientId: PATIENT_PROFILE_2, // Target is Patient 2
          consentType: 'TREATMENT',
          purpose: 'Unauthorized consent',
        }),
      });

      expect(res.status).toBe(403);
    });

    it('should auto-resolve patientId when patient submits Postman placeholder "string"', async () => {
      const res = await fetch(`${baseUrl}/security/consents`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${patient1Token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientId: 'string', // Swagger default
          consentType: 'TREATMENT',
          purpose: 'General checkup',
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.patientId).toBe(PATIENT_PROFILE_1);
      expect(body.status).toBe('GRANTED');
    });

    it('should enforce PENDING status when doctor creates a consent request', async () => {
      const res = await fetch(`${baseUrl}/security/consents`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${doctorToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientId: PATIENT_PROFILE_1,
          consentType: 'DATA_SHARING',
          purpose: 'Share scans with oncology specialist',
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.status).toBe('PENDING'); // Must be PENDING, waiting for patient confirmation
    });

    it('should allow target patient to confirm a PENDING consent record', async () => {
      const res = await fetch(`${baseUrl}/security/consents/consent-uuid-1/confirm`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${patient1Token}` },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe('GRANTED');
    });

    it('should reject another patient attempt to confirm consent (Cross-patient confirm)', async () => {
      const res = await fetch(`${baseUrl}/security/consents/consent-uuid-1/confirm`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${patient2Token}` }, // Patient 2 tries to confirm Patient 1's consent
      });

      expect(res.status).toBe(403);
    });

    it('should reject confirmation of an expired consent record', async () => {
      const res = await fetch(`${baseUrl}/security/consents/consent-expired-1/confirm`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${patient1Token}` },
      });

      expect(res.status).toBe(400);
    });

    it('should allow patient to withdraw their own consent', async () => {
      const res = await fetch(`${baseUrl}/security/consents/consent-uuid-1/withdraw`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${patient1Token}` },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe('WITHDRAWN');
    });

    it('should reject doctor attempt to withdraw a patient consent', async () => {
      const res = await fetch(`${baseUrl}/security/consents/consent-uuid-1/withdraw`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${doctorToken}` },
      });

      expect(res.status).toBe(403);
    });
  });
});
