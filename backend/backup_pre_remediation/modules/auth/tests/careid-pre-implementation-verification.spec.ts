import { NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { AuthService } from '@modules/auth/application/use-cases/auth.service';
import { PatientService } from '@modules/patient/application/use-cases/patient.service';
import { FinancingService } from '@modules/financing/application/use-cases/financing.service';
import { QrService } from '@modules/qr/application/use-cases/qr.service';
import { InsuranceService } from '@modules/insurance/application/use-cases/insurance.service';
import { SecurityService } from '@modules/security/application/use-cases/security.service';
import { ImmunisationService } from '@modules/immunisation/application/use-cases/immunisation.service';
import { OCRJobService } from '@modules/ocr/application/use-cases/ocr.service';
import { NotificationService } from '@modules/notifications/application/use-cases/notification.service';
import { NotificationController } from '@modules/notifications/presentation/controllers/notification.controller';
import { MedicalRecordController } from '@modules/medical-record/presentation/controllers/medical-record.controller';
import { MedicalRecordService } from '@modules/medical-record/application/use-cases/medical-record.service';
import { DoctorService } from '@modules/doctor/application/use-cases/doctor.service';

describe('CareID Comprehensive Verification & Security Suite', () => {
  const VALID_UUID_1 = '11111111-1111-1111-1111-111111111111';
  const VALID_UUID_2 = '22222222-2222-2222-2222-222222222222';
  const VALID_UUID_3 = '33333333-3333-3333-3333-333333333333';
  const VALID_UUID_4 = '44444444-4444-4444-4444-444444444444';

  // ─── 1. Auth: DELETE /auth/sessions/:sessionId (Security Hardening) ───────
  describe('Phase 1.A: Auth Session Revocation Hardening', () => {
    let authService: AuthService;
    let mockAuthRepo: any;

    beforeEach(() => {
      mockAuthRepo = {
        findSessionById: jest.fn(),
        findActiveSessions: jest.fn(),
        invalidateSession: jest.fn().mockResolvedValue(undefined),
        createAuditLog: jest.fn().mockResolvedValue(undefined),
      };
      authService = new AuthService(
        mockAuthRepo,
        { sign: jest.fn(), verify: jest.fn() } as any,
        { get: jest.fn() } as any,
        { warn: jest.fn(), info: jest.fn(), error: jest.fn() } as any,
      );
    });

    it('should revoke session owned by user when valid UUID is provided', async () => {
      mockAuthRepo.findSessionById.mockResolvedValue({ id: VALID_UUID_1, userId: 'user-1' });

      await authService.revokeSession(VALID_UUID_1, 'user-1', '127.0.0.1');

      expect(mockAuthRepo.invalidateSession).toHaveBeenCalledWith(VALID_UUID_1, 'user-1');
      expect(mockAuthRepo.createAuditLog).toHaveBeenCalledWith('user-1', 'SESSION_REVOKED', expect.any(String), '127.0.0.1');
    });

    it('should reject non-UUID session ID with 400 BadRequestException without silent fallback', async () => {
      mockAuthRepo.findActiveSessions.mockResolvedValue([{ id: VALID_UUID_1, userId: 'user-1' }]);

      await expect(authService.revokeSession('not-a-uuid', 'user-1')).rejects.toThrow(BadRequestException);
      expect(mockAuthRepo.invalidateSession).not.toHaveBeenCalled();
      expect(mockAuthRepo.findActiveSessions).not.toHaveBeenCalled();
    });

    it('should throw 404 NotFoundException when UUID session does not exist', async () => {
      mockAuthRepo.findSessionById.mockResolvedValue(null);

      await expect(authService.revokeSession(VALID_UUID_1, 'user-1')).rejects.toThrow(NotFoundException);
      expect(mockAuthRepo.invalidateSession).not.toHaveBeenCalled();
    });

    it('should throw 403 ForbiddenException when attempting to revoke another users session', async () => {
      mockAuthRepo.findSessionById.mockResolvedValue({ id: VALID_UUID_1, userId: 'other-user' });

      await expect(authService.revokeSession(VALID_UUID_1, 'user-1')).rejects.toThrow(ForbiddenException);
      expect(mockAuthRepo.invalidateSession).not.toHaveBeenCalled();
    });
  });

  // ─── 2. QR: Rotation & Revocation (Security Hardening) ─────────────────────
  describe('Phase 1.B: QR Subsystem Security Hardening', () => {
    let qrService: QrService;
    let mockQrRepo: any;

    beforeEach(() => {
      mockQrRepo = {
        findProfileByUserId: jest.fn().mockResolvedValue(null),
        findQrById: jest.fn(),
        findQrsByOwner: jest.fn().mockResolvedValue([]),
        updateQr: jest.fn().mockImplementation((id, data) => ({
          id,
          entityId: 'e-1',
          entityType: 'HEALTH_CARD',
          ownerId: 'u-1',
          token: data.token || 'TOKEN-1',
          signature: data.signature || 'SIG-1',
          status: data.status || 'ACTIVE',
          version: data.version || 1,
          issuedAt: new Date(),
          expiresAt: new Date(Date.now() + 365 * 86400000),
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
        createHistory: jest.fn().mockResolvedValue({}),
        createAuditLog: jest.fn().mockResolvedValue({}),
        getAnalytics: jest.fn().mockResolvedValue({
          totalQrs: 0,
          activeQrs: 0,
          revokedQrs: 0,
          totalScans: 0,
          successfulScans: 0,
          failedScans: 0,
          scansByEntity: {},
        }),
      };
      qrService = new QrService(
        mockQrRepo,
        { warn: jest.fn(), info: jest.fn(), error: jest.fn() } as any,
      );
    });

    it('should reject non-UUID explicit QR ID with 400 BadRequestException', async () => {
      await expect(qrService.rotateQr('u-1', 'not-a-uuid')).rejects.toThrow(BadRequestException);
      await expect(qrService.revokeQr('u-1', 'not-a-uuid')).rejects.toThrow(BadRequestException);
    });

    it('should throw 404 NotFoundException for nonexistent explicit UUID', async () => {
      mockQrRepo.findQrById.mockResolvedValue(null);
      await expect(qrService.rotateQr('u-1', VALID_UUID_1)).rejects.toThrow(NotFoundException);
      await expect(qrService.revokeQr('u-1', VALID_UUID_1)).rejects.toThrow(NotFoundException);
    });

    it('should throw 409 ConflictException when multiple active QRs exist and no ID is provided in body', async () => {
      mockQrRepo.findQrsByOwner.mockResolvedValue([
        { id: VALID_UUID_1, ownerId: 'u-1', status: 'ACTIVE', version: 1 },
        { id: VALID_UUID_2, ownerId: 'u-1', status: 'ACTIVE', version: 2 },
      ]);

      await expect(qrService.rotateQr('u-1')).rejects.toThrow(ConflictException);
      await expect(qrService.revokeQr('u-1')).rejects.toThrow(ConflictException);
    });

    it('should throw 404 NotFoundException when 0 active QRs exist and no ID is provided in body', async () => {
      mockQrRepo.findQrsByOwner.mockResolvedValue([
        { id: VALID_UUID_1, ownerId: 'u-1', status: 'REVOKED', version: 1 },
      ]);

      await expect(qrService.rotateQr('u-1')).rejects.toThrow(NotFoundException);
      await expect(qrService.revokeQr('u-1')).rejects.toThrow(NotFoundException);
    });

    it('should rotate unambiguous QR when exactly 1 active QR exists for bodyless call', async () => {
      mockQrRepo.findQrsByOwner.mockResolvedValue([
        { id: VALID_UUID_1, ownerId: 'u-1', status: 'ACTIVE', version: 1, entityId: 'e-1', entityType: 'HEALTH_CARD' },
      ]);

      const rotated = await qrService.rotateQr('u-1');
      expect(rotated.id).toBe(VALID_UUID_1);
      expect(mockQrRepo.updateQr).toHaveBeenCalledWith(VALID_UUID_1, expect.objectContaining({ status: 'ACTIVE', version: 2 }));
    });

    it('should rotate explicit valid UUID QR token', async () => {
      mockQrRepo.findQrById.mockResolvedValue({
        id: VALID_UUID_1,
        ownerId: 'u-1',
        entityId: 'e-1',
        entityType: 'HEALTH_CARD',
        status: 'ACTIVE',
        version: 1,
        token: 'OLD-TOKEN',
      });

      const rotated = await qrService.rotateQr('u-1', VALID_UUID_1, { reason: 'Scheduled rotation' });

      expect(rotated.id).toBe(VALID_UUID_1);
      expect(mockQrRepo.updateQr).toHaveBeenCalledWith(VALID_UUID_1, expect.objectContaining({ status: 'ACTIVE', version: 2 }));
    });

    it('should revoke explicit valid UUID QR token', async () => {
      mockQrRepo.findQrById.mockResolvedValue({
        id: VALID_UUID_1,
        ownerId: 'u-1',
        entityId: 'e-1',
        entityType: 'HEALTH_CARD',
        status: 'ACTIVE',
        version: 1,
      });

      const revoked = await qrService.revokeQr('u-1', VALID_UUID_1, { reason: 'Lost card' });

      expect(revoked.id).toBe(VALID_UUID_1);
      expect(mockQrRepo.updateQr).toHaveBeenCalledWith(VALID_UUID_1, expect.objectContaining({ status: 'REVOKED' }));
    });

    it('should throw BadRequestException when attempting to rotate an already revoked QR', async () => {
      mockQrRepo.findQrById.mockResolvedValue({
        id: VALID_UUID_1,
        ownerId: 'u-1',
        status: 'REVOKED',
      });

      await expect(qrService.rotateQr('u-1', VALID_UUID_1)).rejects.toThrow(BadRequestException);
    });

    it('should handle bulk revoke with valid UUIDs gracefully', async () => {
      mockQrRepo.findQrById
        .mockResolvedValueOnce({ id: VALID_UUID_1, ownerId: 'u-1', status: 'ACTIVE', version: 1 })
        .mockResolvedValueOnce(null);

      const res = await qrService.bulkRevoke('u-1', { qrIds: [VALID_UUID_1, VALID_UUID_2], reason: 'Bulk admin' }, ['ADMIN']);

      expect(res.processed).toBe(1);
      expect(res.message).toContain('1 QR codes');
    });
  });

  // ─── 3. Insurance: Plans (Security Hardening) ─────────────────────────────
  describe('Phase 1.C: Insurance Plan Creation Hardening', () => {
    let insuranceService: InsuranceService;
    let mockInsuranceRepo: any;

    beforeEach(() => {
      mockInsuranceRepo = {
        findProviderById: jest.fn(),
        createPlan: jest.fn().mockImplementation((data) => ({
          id: VALID_UUID_2,
          ...data,
          createdAt: new Date(),
        })),
        findOcrRecordById: jest.fn(),
        createManualReview: jest.fn().mockResolvedValue({ id: 'ocr-1', isConfirmed: true }),
      };
      insuranceService = new InsuranceService(
        mockInsuranceRepo,
        { generateQr: jest.fn() } as any,
        { warn: jest.fn(), info: jest.fn(), error: jest.fn() } as any,
      );
    });

    it('should reject non-UUID providerId with 400 BadRequestException', async () => {
      await expect(
        insuranceService.createPlan({
          providerId: 'invalid-provider-id',
          name: 'Gold Plan',
          planCode: 'GOLD-01',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockInsuranceRepo.createPlan).not.toHaveBeenCalled();
    });

    it('should throw 404 NotFoundException for nonexistent insurance provider without creating fallback', async () => {
      mockInsuranceRepo.findProviderById.mockResolvedValue(null);

      await expect(
        insuranceService.createPlan({
          providerId: VALID_UUID_1,
          name: 'Gold Plan',
          planCode: 'GOLD-01',
        }),
      ).rejects.toThrow(NotFoundException);

      expect(mockInsuranceRepo.createPlan).not.toHaveBeenCalled();
    });

    it('should create plan when valid provider exists', async () => {
      mockInsuranceRepo.findProviderById.mockResolvedValue({ id: VALID_UUID_1, name: 'State Life Insurance' });

      const plan = await insuranceService.createPlan({
        providerId: VALID_UUID_1,
        name: 'Gold Plan',
        planCode: 'GOLD-01',
      });

      expect(plan.id).toBe(VALID_UUID_2);
      expect(mockInsuranceRepo.createPlan).toHaveBeenCalledWith(expect.objectContaining({
        providerId: VALID_UUID_1,
        name: 'Gold Plan',
        planCode: 'GOLD-01',
      }));
    });

    it('should permit staff to submit manual review for OCR record', async () => {
      mockInsuranceRepo.findOcrRecordById.mockResolvedValue({ id: 'ocr-1', extractedData: '{}' });

      const res = await insuranceService.submitManualReview('staff-1', ['STAFF'], {
        ocrRecordId: 'ocr-1',
        reviewStatus: 'APPROVED',
        reviewNotes: 'Verified against physical card',
      });

      expect(res.success).toBe(true);
      expect(res.data.reviewStatus).toBe('APPROVED');
      expect(mockInsuranceRepo.createManualReview).toHaveBeenCalled();
    });

    it('should forbid patients from submitting staff manual reviews', async () => {
      await expect(
        insuranceService.submitManualReview('patient-1', ['PATIENT'], { ocrRecordId: 'ocr-1' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── 4. Doctor Attachment Upload (Phase 2) ────────────────────────────────
  describe('Phase 2: Doctor Attachment Upload & Access Control', () => {
    let recordService: MedicalRecordService;
    let mockRecordRepo: any;

    beforeEach(() => {
      mockRecordRepo = {
        findProfileByUserId: jest.fn(),
        findPatientProfileById: jest.fn(),
        verifyDoctorAccessToPatient: jest.fn(),
        createAttachment: jest.fn().mockImplementation((data) => ({
          id: VALID_UUID_3,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
        createAuditLog: jest.fn().mockResolvedValue({}),
      };
      recordService = new MedicalRecordService(
        mockRecordRepo,
        { generateQr: jest.fn() } as any,
      );
    });

    it('should allow authorized doctor to upload attachment for a target patient', async () => {
      mockRecordRepo.findPatientProfileById.mockResolvedValue({ id: VALID_UUID_2, userId: 'patient-user-1' });
      mockRecordRepo.verifyDoctorAccessToPatient.mockResolvedValue(true);

      const fakePdfBuffer = Buffer.from('%PDF-1.4 test content');
      const fakeFile = {
        buffer: fakePdfBuffer,
        originalname: 'clinical_report.pdf',
        mimetype: 'application/pdf',
        size: fakePdfBuffer.length,
      };

      const result = await recordService.uploadAttachment(
        'doctor-user-1',
        null,
        {
          fileName: 'clinical_report.pdf',
          fileType: 'PDF',
          patientProfileId: VALID_UUID_2,
        },
        ['DOCTOR'],
        fakeFile,
      );

      expect(result.id).toBe(VALID_UUID_3);
      expect(mockRecordRepo.verifyDoctorAccessToPatient).toHaveBeenCalledWith('doctor-user-1', VALID_UUID_2);
      expect(mockRecordRepo.createAttachment).toHaveBeenCalledWith(expect.objectContaining({
        patientProfileId: VALID_UUID_2,
      }));
    });

    it('should throw 403 ForbiddenException when doctor lacks access to target patient', async () => {
      mockRecordRepo.findPatientProfileById.mockResolvedValue({ id: VALID_UUID_2, userId: 'patient-user-1' });
      mockRecordRepo.verifyDoctorAccessToPatient.mockResolvedValue(false);

      await expect(
        recordService.uploadAttachment(
          'unauthorized-doc',
          null,
          {
            fileName: 'report.pdf',
            fileType: 'PDF',
            patientProfileId: VALID_UUID_2,
          },
          ['DOCTOR'],
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(mockRecordRepo.createAttachment).not.toHaveBeenCalled();
    });

    it('should throw 404 NotFoundException when target patient profile does not exist', async () => {
      mockRecordRepo.findPatientProfileById.mockResolvedValue(null);

      await expect(
        recordService.uploadAttachment(
          'doctor-user-1',
          null,
          {
            fileName: 'report.pdf',
            fileType: 'PDF',
            patientProfileId: VALID_UUID_2,
          },
          ['DOCTOR'],
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject file upload with invalid magic bytes', async () => {
      mockRecordRepo.findPatientProfileById.mockResolvedValue({ id: VALID_UUID_2, userId: 'patient-user-1' });
      mockRecordRepo.verifyDoctorAccessToPatient.mockResolvedValue(true);

      const invalidBuffer = Buffer.from('NOT_A_VALID_MAGIC_HEADER_BYTES');
      const fakeFile = {
        buffer: invalidBuffer,
        originalname: 'report.pdf',
        mimetype: 'application/pdf',
        size: invalidBuffer.length,
      };

      await expect(
        recordService.uploadAttachment(
          'doctor-user-1',
          null,
          {
            fileName: 'report.pdf',
            fileType: 'PDF',
            patientProfileId: VALID_UUID_2,
          },
          ['DOCTOR'],
          fakeFile,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject file serving when filename contains path traversal sequences', async () => {
      await expect(
        recordService.serveAttachmentFile('att-../../etc/passwd', 'user-1', ['PATIENT']),
      ).rejects.toThrow(BadRequestException);
    });

    it('should forbid unauthorized doctor from streaming attachment of unrelated patient', async () => {
      mockRecordRepo.verifyDoctorAccessToPatient.mockResolvedValue(false);

      await expect(
        recordService.serveAttachmentFile(`att-${VALID_UUID_2}-12345-report.pdf`, 'doctor-user-1', ['DOCTOR']),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── 5. Standalone Prescriptions (Phase 3) ────────────────────────────────
  describe('Phase 3: Standalone Prescription Management', () => {
    let doctorService: DoctorService;
    let mockDoctorRepo: any;

    const samplePrescription = {
      id: VALID_UUID_1,
      patientProfileId: VALID_UUID_2,
      title: 'Amoxicillin Course',
      description: 'Acute respiratory infection',
      category: 'PRESCRIPTION',
      status: 'UPLOADED',
      reportDate: new Date('2026-11-01T00:00:00Z'),
      prescribedBy: 'Dr. Evelyn Reed',
      doctorName: 'Dr. Evelyn Reed',
      providerName: 'General Practitioner',
      facilityName: 'CareID Health Center',
      notes: 'Take after meals.\n[JSON_MEDICATIONS]:[{"name":"Amoxicillin","dosage":"500mg","frequency":"TID","duration":"7 days"}]',
      verificationStatus: 'VERIFIED',
      verifiedBy: 'doctor-user-1',
      verifiedAt: new Date('2026-11-01T00:00:00Z'),
      attachments: [],
      createdAt: new Date('2026-11-01T00:00:00Z'),
      updatedAt: new Date('2026-11-01T00:00:00Z'),
      patientProfile: {
        id: VALID_UUID_2,
        userId: 'patient-user-1',
        patientNumber: 'PT-360-123',
        user: { firstName: 'Alice', lastName: 'Smith', email: 'alice@example.com', phone: '+1234567890' },
      },
    };

    beforeEach(() => {
      mockDoctorRepo = {
        findProfileByUserId: jest.fn().mockResolvedValue({ id: 'doc-prof-1', userId: 'doctor-user-1', fullName: 'Dr. Evelyn Reed' }),
        findPrescriptionById: jest.fn().mockImplementation((id) => (id === VALID_UUID_1 ? Promise.resolve(samplePrescription) : Promise.resolve(null))),
        updatePrescription: jest.fn().mockImplementation((id, data) => Promise.resolve({ ...samplePrescription, ...data, updatedAt: new Date() })),
        createMedicalRecordAuditLog: jest.fn().mockResolvedValue({}),
        createSecurityAuditLog: jest.fn().mockResolvedValue({}),
        getDoctorActiveFacilityIds: jest.fn().mockResolvedValue(['fac-1']),
        verifyDoctorPatientAccess: jest.fn().mockResolvedValue({ isAuthorized: true, authSource: 'PRIMARY_APPOINTMENT' }),
      };
      doctorService = new DoctorService(
        mockDoctorRepo,
        { generateQr: jest.fn() } as any,
        { warn: jest.fn(), info: jest.fn(), error: jest.fn() } as any,
      );
    });

    it('should reject non-UUID prescriptionId with 400 BadRequestException', async () => {
      await expect(doctorService.getPrescriptionDetails('doctor-user-1', 'invalid-id', ['DOCTOR'])).rejects.toThrow(BadRequestException);
      await expect(doctorService.updatePrescription('doctor-user-1', 'invalid-id', {}, ['DOCTOR'])).rejects.toThrow(BadRequestException);
      await expect(doctorService.refillPrescription('doctor-user-1', 'invalid-id', {}, ['DOCTOR'])).rejects.toThrow(BadRequestException);
      await expect(doctorService.discontinuePrescription('doctor-user-1', 'invalid-id', { reason: 'Adverse reaction' }, ['DOCTOR'])).rejects.toThrow(BadRequestException);
      await expect(doctorService.exportPrescription('doctor-user-1', 'invalid-id', ['DOCTOR'])).rejects.toThrow(BadRequestException);
      await expect(doctorService.getPrescriptionRefills('doctor-user-1', 'invalid-id', ['DOCTOR'])).rejects.toThrow(BadRequestException);
    });

    it('should throw 404 NotFoundException for nonexistent prescription UUID', async () => {
      await expect(doctorService.getPrescriptionDetails('doctor-user-1', VALID_UUID_4, ['DOCTOR'])).rejects.toThrow(NotFoundException);
    });

    it('should retrieve prescription details and parse medications and notes correctly', async () => {
      const details = await doctorService.getPrescriptionDetails('doctor-user-1', VALID_UUID_1, ['DOCTOR']);

      expect(details.id).toBe(VALID_UUID_1);
      expect(details.title).toBe('Amoxicillin Course');
      expect(details.medications.length).toBe(1);
      expect(details.medications[0].name).toBe('Amoxicillin');
      expect(details.notes).toBe('Take after meals.');
      expect(details.isDiscontinued).toBe(false);
      expect(details.refillCount).toBe(0);
    });

    it('should update prescription instructions and medication list', async () => {
      const updated = await doctorService.updatePrescription('doctor-user-1', VALID_UUID_1, {
        title: 'Amoxicillin Extended Course',
        notes: 'Take with food and full glass of water.',
        medications: [{ name: 'Amoxicillin', dosage: '875mg', frequency: 'BID', duration: '10 days' }],
      }, ['DOCTOR']);

      expect(mockDoctorRepo.updatePrescription).toHaveBeenCalled();
      expect(updated.title).toBe('Amoxicillin Extended Course');
      expect(updated.medications[0].dosage).toBe('875mg');
      expect(updated.notes).toBe('Take with food and full glass of water.');
    });

    it('should record refill authorization and increment refill history', async () => {
      const refilled = await doctorService.refillPrescription('doctor-user-1', VALID_UUID_1, {
        quantity: 1,
        notes: '30-day refill authorized by clinic',
      }, ['DOCTOR']);

      expect(mockDoctorRepo.updatePrescription).toHaveBeenCalled();
      expect(refilled.refillCount).toBe(1);
      expect(refilled.refills[0].refillNumber).toBe(1);
      expect(refilled.refills[0].notes).toBe('30-day refill authorized by clinic');
    });

    it('should discontinue prescription with clinical justification', async () => {
      const discontinued = await doctorService.discontinuePrescription('doctor-user-1', VALID_UUID_1, {
        reason: 'Patient developed allergic skin rash; switched to Azithromycin',
      }, ['DOCTOR']);

      expect(discontinued.isDiscontinued).toBe(true);
      expect(discontinued.status).toBe('DISCONTINUED');
      expect(discontinued.discontinueReason).toContain('allergic skin rash');
    });

    it('should reject updating or refilling a discontinued prescription', async () => {
      const discontinuedPrescription = {
        ...samplePrescription,
        notes: `${samplePrescription.notes}\n[DISCONTINUED]:{"reason":"Allergy","discontinuedAt":"2026-11-05T00:00:00Z","discontinuedBy":"doctor-user-1"}`,
      };
      mockDoctorRepo.findPrescriptionById.mockResolvedValue(discontinuedPrescription);

      await expect(
        doctorService.updatePrescription('doctor-user-1', VALID_UUID_1, { title: 'New Title' }, ['DOCTOR']),
      ).rejects.toThrow(BadRequestException);

      await expect(
        doctorService.refillPrescription('doctor-user-1', VALID_UUID_1, {}, ['DOCTOR']),
      ).rejects.toThrow(BadRequestException);
    });

    it('should export formatted clinical prescription payload', async () => {
      mockDoctorRepo.findPrescriptionById.mockResolvedValue(samplePrescription);

      const exported = await doctorService.exportPrescription('doctor-user-1', VALID_UUID_1, ['DOCTOR']);

      expect(exported.prescriptionId).toBe(VALID_UUID_1);
      expect(exported.rxNumber).toContain('RX-');
      expect(exported.patient.fullName).toBe('Alice Smith');
      expect(exported.prescriber.fullName).toBe('Dr. Evelyn Reed');
      expect(exported.medications.length).toBe(1);
      expect(exported.disclaimer).toBeDefined();
    });

    it('should return refill audit history list', async () => {
      const refillPrescription = {
        ...samplePrescription,
        notes: `${samplePrescription.notes}\n[JSON_REFILLS]:[{"id":"rf-1","refillNumber":1,"refilledAt":"2026-11-03T10:00:00Z","refilledBy":"doc-1","quantity":1}]`,
      };
      mockDoctorRepo.findPrescriptionById.mockResolvedValue(refillPrescription);

      const history = await doctorService.getPrescriptionRefills('doctor-user-1', VALID_UUID_1, ['DOCTOR']);

      expect(history.prescriptionId).toBe(VALID_UUID_1);
      expect(history.refillCount).toBe(1);
      expect(history.refills[0].refillNumber).toBe(1);
    });
  });

  // ─── 6. Hospital Admissions (Phase 4) ─────────────────────────────────────
  describe('Phase 4: Hospital Admissions Management', () => {
    let doctorService: DoctorService;
    let mockDoctorRepo: any;

    beforeEach(() => {
      mockDoctorRepo = {
        findProfileByUserId: jest.fn().mockResolvedValue({ id: 'doc-prof-1', userId: 'doctor-user-1', fullName: 'Dr. Evelyn Reed' }),
        findPatientProfileById: jest.fn().mockResolvedValue({ id: VALID_UUID_2, userId: 'patient-user-1' }),
        getDoctorActiveFacilityIds: jest.fn().mockResolvedValue(['fac-1']),
        verifyDoctorPatientAccess: jest.fn().mockResolvedValue({ isAuthorized: true, authSource: 'ACTIVE_APPOINTMENT' }),
        findPatientAdmissions: jest.fn().mockResolvedValue({
          items: [
            {
              id: VALID_UUID_3,
              medicalRecordId: VALID_UUID_4,
              encounterDate: new Date('2026-11-04T12:00:00Z'),
              facilityName: 'CareID Central Hospital',
              providerName: 'Dr. Evelyn Reed',
              encounterType: 'ADMISSION',
              createdAt: new Date('2026-11-04T12:00:00Z'),
              updatedAt: new Date('2026-11-04T12:00:00Z'),
              medicalRecord: {
                id: VALID_UUID_4,
                patientProfileId: VALID_UUID_2,
                title: 'Hospital Admission - Inpatient Care',
                chiefComplaint: 'Acute chest pain',
                clinicalNotes: 'Ward: ICU, Bed: 4B',
                treatmentPlan: 'Continuous monitoring and ECG',
                status: 'FINAL',
                diagnoses: [{ id: 'diag-1', description: 'Acute Coronary Syndrome', type: 'ADMISSION', status: 'ACTIVE' }],
              },
            },
          ],
          total: 1,
        }),
        createPatientAdmission: jest.fn().mockImplementation((patientId, doctor, dto) => Promise.resolve({
          id: VALID_UUID_3,
          medicalRecordId: VALID_UUID_4,
          encounterDate: new Date(),
          facilityName: dto.facilityName || 'CareID Central Hospital',
          providerName: dto.attendingDoctorName || doctor.fullName,
          encounterType: 'ADMISSION',
          createdAt: new Date(),
          updatedAt: new Date(),
          medicalRecord: {
            id: VALID_UUID_4,
            patientProfileId: patientId,
            title: dto.title || 'Hospital Admission - Inpatient Care',
            chiefComplaint: dto.reasonForAdmission || null,
            clinicalNotes: dto.clinicalNotes || null,
            treatmentPlan: dto.treatmentPlan || null,
            status: 'FINAL',
            diagnoses: dto.admittingDiagnosis ? [{ id: 'diag-1', description: dto.admittingDiagnosis }] : [],
          },
        })),
        createMedicalRecordAuditLog: jest.fn().mockResolvedValue({}),
        createSecurityAuditLog: jest.fn().mockResolvedValue({}),
      };
      doctorService = new DoctorService(
        mockDoctorRepo,
        { generateQr: jest.fn() } as any,
        { warn: jest.fn(), info: jest.fn(), error: jest.fn() } as any,
      );
    });

    it('should list hospital admissions for an authorized patient', async () => {
      const res = await doctorService.getPatientAdmissions('doctor-user-1', VALID_UUID_2, { page: 1, limit: 10 });

      expect(res.data.length).toBe(1);
      expect(res.data[0].encounterType).toBe('ADMISSION');
      expect(res.data[0].chiefComplaint).toBe('Acute chest pain');
      expect(res.data[0].diagnoses[0].description).toBe('Acute Coronary Syndrome');
      expect(mockDoctorRepo.findPatientAdmissions).toHaveBeenCalledWith(VALID_UUID_2, { page: 1, limit: 10 });
    });

    it('should record a hospital admission for an authorized patient', async () => {
      const admission = await doctorService.createPatientAdmission('doctor-user-1', VALID_UUID_2, {
        title: 'Emergency Admission',
        admissionType: 'EMERGENCY',
        reasonForAdmission: 'Severe acute asthma exacerbation',
        admittingDiagnosis: 'Status Asthmaticus (J46)',
        ward: 'Pulmonology',
        roomBed: 'Bed 2A',
      });

      expect(admission.id).toBe(VALID_UUID_3);
      expect(admission.encounterType).toBe('ADMISSION');
      expect(admission.chiefComplaint).toBe('Severe acute asthma exacerbation');
      expect(mockDoctorRepo.createPatientAdmission).toHaveBeenCalled();
    });

    it('should throw 403 ForbiddenException when unauthorized doctor attempts to create admission', async () => {
      mockDoctorRepo.verifyDoctorPatientAccess.mockResolvedValue({ isAuthorized: false, reason: 'No relationship' });

      await expect(
        doctorService.createPatientAdmission('unauthorized-doc', VALID_UUID_2, {
          reasonForAdmission: 'Chest pain',
        }),
      ).rejects.toThrow(ForbiddenException);

      expect(mockDoctorRepo.createPatientAdmission).not.toHaveBeenCalled();
    });

    it('should return empty list when patient has no admissions', async () => {
      mockDoctorRepo.findPatientAdmissions.mockResolvedValue({ items: [], total: 0 });

      const res = await doctorService.getPatientAdmissions('doctor-user-1', VALID_UUID_2, { page: 1, limit: 10 });

      expect(res.data).toEqual([]);
      expect(res.meta.totalItems).toBe(0);
    });

    it('should reject admission when discharge date is earlier than admission date', async () => {
      await expect(
        doctorService.createPatientAdmission('doctor-user-1', VALID_UUID_2, {
          title: 'Invalid Admission',
          admissionDate: '2026-11-05T12:00:00Z',
          dischargeDate: '2026-11-04T12:00:00Z',
          reasonForAdmission: 'Routine checkup',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── 7. Medical Record Timeline (Phase 5) ─────────────────────────────────
  describe('Phase 5: Medical Record Timeline Multi-Source Aggregation', () => {
    it('should expose timeline handler and return aggregated chronological records', async () => {
      const mockService = {
        getTimeline: jest.fn().mockResolvedValue([
          { id: 'rec-1', eventType: 'CONSULTATION', title: 'Cardiology Review', date: '2026-11-04T10:00:00Z' },
          { id: 'presc-1', eventType: 'PRESCRIPTION', title: 'Amoxicillin Course', date: '2026-11-03T15:00:00Z' },
          { id: 'att-1', eventType: 'ATTACHMENT', title: 'Chest X-Ray.pdf', date: '2026-11-02T09:00:00Z' },
          { id: 'vax-1', eventType: 'IMMUNISATION', title: 'COVID-19 Booster', date: '2026-10-15T11:00:00Z' },
          { id: 'apt-1', eventType: 'APPOINTMENT', title: 'Annual Checkup', date: '2026-10-01T08:30:00Z' },
        ]),
      };
      const controller = new MedicalRecordController(mockService as any);

      const res = await controller.getTimeline({ user: { id: 'patient-1' } });

      expect(mockService.getTimeline).toHaveBeenCalledWith('patient-1');
      expect(res.length).toBe(5);
      expect(res.map((r: any) => r.eventType)).toEqual([
        'CONSULTATION',
        'PRESCRIPTION',
        'ATTACHMENT',
        'IMMUNISATION',
        'APPOINTMENT',
      ]);
    });
  });

  // ─── 8. Registration: PATCH /patients/register/resume ─────────────────────
  describe('Registration: PATCH /patients/register/resume', () => {
    let patientService: PatientService;
    let mockPatientRepo: any;

    beforeEach(() => {
      mockPatientRepo = {
        findProfileByUserId: jest.fn(),
        createProfile: jest.fn(),
        updateProfile: jest.fn().mockImplementation((id, data) => ({
          status: 'DRAFT',
          onboardingStep: data.onboardingStep,
          patientNumber: 'PT-12345',
        })),
      };
      patientService = new PatientService(mockPatientRepo);
    });

    it('should update valid step correctly', async () => {
      mockPatientRepo.findProfileByUserId.mockResolvedValue({ id: 'prof-1', onboardingStep: 1, status: 'DRAFT' });

      const res = await patientService.resumeRegistration('user-1', 3);

      expect(res.onboardingStep).toBe(3);
      expect(mockPatientRepo.updateProfile).toHaveBeenCalledWith('prof-1', { onboardingStep: 3 });
    });

    it('should handle NaN or undefined step by defaulting to existing step without crashing', async () => {
      mockPatientRepo.findProfileByUserId.mockResolvedValue({ id: 'prof-1', onboardingStep: 2, status: 'DRAFT' });

      const res = await patientService.resumeRegistration('user-1', NaN);

      expect(res.onboardingStep).toBe(2);
      expect(mockPatientRepo.updateProfile).toHaveBeenCalledWith('prof-1', { onboardingStep: 2 });
    });

    it('should auto-create draft profile if user profile does not exist', async () => {
      mockPatientRepo.findProfileByUserId.mockResolvedValue(null);
      mockPatientRepo.createProfile.mockResolvedValue({ id: 'new-prof', onboardingStep: 1, status: 'DRAFT' });

      const res = await patientService.resumeRegistration('user-1', 2);

      expect(mockPatientRepo.createProfile).toHaveBeenCalled();
      expect(res.onboardingStep).toBe(2);
    });
  });

  // ─── 9. Notifications: GET /notifications/templates ───────────────────────
  describe('Notifications: GET /notifications/templates route delegation', () => {
    it('should delegate to getTemplates when id is templates in NotificationController', async () => {
      const mockNotifService = {
        getTemplates: jest.fn().mockResolvedValue([{ id: 'tpl-1', name: 'APPOINTMENT_REMINDER' }]),
        getNotificationById: jest.fn(),
      };
      const controller = new NotificationController(mockNotifService as any);

      const res = await controller.getNotificationById({ user: { userId: 'u1' } }, 'templates');

      expect(mockNotifService.getTemplates).toHaveBeenCalled();
      expect(mockNotifService.getNotificationById).not.toHaveBeenCalled();
      expect(res).toEqual([{ id: 'tpl-1', name: 'APPOINTMENT_REMINDER' }]);
    });
  });

  // ─── 10. OCR: GET /ocr/jobs & POST /ocr/reprocess/:jobId ──────────────────
  describe('OCR: Jobs & Reprocessing', () => {
    let ocrService: OCRJobService;
    let mockOcrRepo: any;

    beforeEach(() => {
      mockOcrRepo = {
        findJobById: jest.fn(),
        updateJobStatus: jest.fn().mockResolvedValue({}),
        findJobs: jest.fn().mockResolvedValue([]),
        createAuditLog: jest.fn().mockResolvedValue({}),
      };
      ocrService = new OCRJobService(
        mockOcrRepo,
        { warn: jest.fn(), info: jest.fn(), error: jest.fn() } as any,
      );
    });

    it('should throw NotFoundException if job does not exist for reprocess', async () => {
      mockOcrRepo.findJobById.mockResolvedValue(null);

      await expect(ocrService.reprocessJob('non-existent-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if non-admin tries to reprocess another users job', async () => {
      mockOcrRepo.findJobById.mockResolvedValue({ id: 'job-1', submittedBy: 'user-2', status: 'FAILED' });

      await expect(
        ocrService.reprocessJob('job-1', { userId: 'user-1', roles: ['PATIENT'] }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── 11. Security: Consents & Active ──────────────────────────────────────
  describe('Security: Active Consents & Grant', () => {
    let securityService: SecurityService;
    let mockSecurityRepo: any;

    beforeEach(() => {
      mockSecurityRepo = {
        findPatientProfileByUserId: jest.fn().mockResolvedValue({ id: 'prof-1' }),
        findActiveConsents: jest.fn().mockResolvedValue([{ id: 'c-1', consentType: 'TREATMENT', status: 'GRANTED' }]),
        validatePatientExists: jest.fn().mockResolvedValue(true),
        createConsent: jest.fn().mockImplementation((data) => ({ id: 'c-new', ...data })),
        createAuditLog: jest.fn().mockResolvedValue({}),
      };
      securityService = new SecurityService(
        mockSecurityRepo,
        { warn: jest.fn(), info: jest.fn(), error: jest.fn() } as any,
      );
    });

    it('should return active consents for caller', async () => {
      const active = await securityService.getActiveConsents({ userId: 'u-1', roles: ['PATIENT'] });

      expect(active.length).toBe(1);
      expect(active[0].status).toBe('GRANTED');
      expect(mockSecurityRepo.findActiveConsents).toHaveBeenCalledWith('prof-1');
    });

    it('should auto-resolve patient profile ID when patient grants with placeholder patientId', async () => {
      const res = await securityService.createConsent(
        { userId: 'u-1', roles: ['PATIENT'] },
        { patientId: 'string', consentType: 'TREATMENT' as any, purpose: 'General care' },
      );

      expect(res.patientId).toBe('prof-1');
      expect(res.status).toBe('GRANTED');
    });
  });

  // ─── 12. Immunisation: Search & Statistics ────────────────────────────────
  describe('Immunisation: Search & Statistics', () => {
    let immunisationService: ImmunisationService;
    let mockImmunisationRepo: any;

    beforeEach(() => {
      mockImmunisationRepo = {
        searchRecords: jest.fn().mockResolvedValue([]),
        getStatistics: jest.fn().mockResolvedValue({
          totalVaccines: 10,
          totalRecords: 50,
          administeredDoses: 45,
          totalCertificates: 40,
        }),
      };
      immunisationService = new ImmunisationService(
        mockImmunisationRepo,
        { generateQr: jest.fn() } as any,
        { warn: jest.fn(), info: jest.fn(), error: jest.fn() } as any,
      );
    });

    it('should return empty list when search query is undefined without throwing TypeError', async () => {
      const res = await immunisationService.searchRecords(undefined);

      expect(res).toEqual([]);
      expect(mockImmunisationRepo.searchRecords).not.toHaveBeenCalled();
    });

    it('should return statistics accurately from repository', async () => {
      const stats = await immunisationService.getStatistics();

      expect(stats.totalVaccines).toBe(10);
      expect(stats.administeredDoses).toBe(45);
    });
  });

  // ─── 13. Financing: Offer Acceptance & Rejection (Decoupled Underwriting) ─
  describe('Financing: Offer Acceptance & Rejection Contracts', () => {
    let financingService: FinancingService;
    let mockFinancingRepo: any;

    const testApp = {
      id: 'fin-app-1',
      applicationNumber: 'FIN-2026-00001',
      userId: 'patient-1',
      optionId: 'opt-zerocost-care',
      partnerName: 'CareCredit Health',
      treatmentName: 'General Healthcare Service',
      requestedAmount: 10000,
      tenureMonths: 6,
      monthlyEstimatedEmi: 1667,
      status: 'PENDING' as const,
      adminNotes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      mockFinancingRepo = {
        getAvailableOptions: jest.fn(),
        getOptionById: jest.fn(),
        findApplicationById: jest.fn().mockImplementation(async (id) => (id === 'fin-app-1' ? testApp : null)),
        updateApplicationStatus: jest.fn().mockImplementation(async (id, status, notes) => ({
          ...testApp,
          status,
          adminNotes: notes || null,
        })),
        createApplication: jest.fn(),
      };
      financingService = new FinancingService(mockFinancingRepo);
    });

    it('should transition offer to UNDER_REVIEW when accepted by patient (not auto-approved)', async () => {
      const res = await financingService.acceptOffer('fin-app-1', 'patient-1');

      expect(res.status).toBe('UNDER_REVIEW');
      expect(mockFinancingRepo.updateApplicationStatus).toHaveBeenCalledWith(
        'fin-app-1',
        'UNDER_REVIEW',
        expect.stringContaining('Underwriting review in progress'),
      );
    });

    it('should forbid accepting an offer belonging to another patient', async () => {
      await expect(financingService.acceptOffer('fin-app-1', 'attacker-patient')).rejects.toThrow(ForbiddenException);
    });

    it('should mark offer as REJECTED when declined by patient', async () => {
      const res = await financingService.rejectOffer('fin-app-1', 'patient-1', 'Too high interest rate');

      expect(res.status).toBe('REJECTED');
      expect(mockFinancingRepo.updateApplicationStatus).toHaveBeenCalledWith(
        'fin-app-1',
        'REJECTED',
        'Too high interest rate',
      );
    });
  });
});
