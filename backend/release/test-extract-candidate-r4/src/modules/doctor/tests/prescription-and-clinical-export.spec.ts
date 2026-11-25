import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { DoctorService } from '../application/use-cases/doctor.service';
import { QrService } from '@modules/qr/application/use-cases/qr.service';

describe('Prescription Refill (D01), Export (D02) & Unified Clinical Export (Phase 5)', () => {
  let service: DoctorService;

  const mockRepo = {
    findProfileByUserId: jest.fn(),
    findPrescriptionById: jest.fn(),
    updatePrescription: jest.fn(),
    refillPrescriptionAtomic: jest.fn(),
    createMedicalRecordAuditLog: jest.fn(),
    createSecurityAuditLog: jest.fn(),
    verifyDoctorPatientAccess: jest.fn(),
    getDoctorActiveFacilityIds: jest.fn(),
    findPatientProfileById: jest.fn(),
    findPatientPrescriptions: jest.fn(),
    findPatientMedicalRecords: jest.fn(),
    getPatientTimeline: jest.fn(),
    findPatientAdmissions: jest.fn(),
  };

  const mockQrService = {
    generateQr: jest.fn(),
    verifyQrPayload: jest.fn(),
  };

  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  };

  const mockPrescriptionId = '11111111-2222-3333-4444-555555555555';
  const mockPatientUserId = 'patient-user-001';
  const mockPatientProfileId = '22222222-3333-4444-5555-666666666666';
  const mockDoctorUserId = 'doctor-user-001';
  const mockDoctorProfileId = '33333333-4444-5555-6666-777777777777';

  const basePrescription = {
    id: mockPrescriptionId,
    patientProfileId: mockPatientProfileId,
    title: 'Hypertension Regimen',
    category: 'PRESCRIPTION',
    status: 'ACTIVE',
    reportDate: new Date('2026-03-01'),
    prescribedBy: 'Dr. Evelyn Reed',
    doctorName: 'Dr. Evelyn Reed',
    providerName: 'Cardiology Specialist',
    facilityName: 'St. Jude Heart Institute',
    verifiedBy: mockDoctorUserId,
    verificationStatus: 'VERIFIED',
    notes: 'Take with food.\n[JSON_MEDICATIONS]:[{"name":"Amlodipine","dosage":"5mg","frequency":"Once daily"}]',
    createdAt: new Date('2026-03-01'),
    updatedAt: new Date('2026-03-01'),
    patientProfile: {
      id: mockPatientProfileId,
      userId: mockPatientUserId,
      patientNumber: 'PAT-8890',
      user: {
        id: mockPatientUserId,
        firstName: 'John',
        lastName: 'Doe',
        phone: '+15551234567',
        email: 'john.doe@example.com',
        gender: 'MALE',
        dateOfBirth: new Date('1980-05-12'),
      },
    },
    attachments: [],
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DoctorService,
        { provide: 'IDoctorRepository', useValue: mockRepo },
        { provide: QrService, useValue: mockQrService },
        { provide: Logger, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<DoctorService>(DoctorService);
  });

  // ─── D01: Prescription Refill ───────────────────────────────────────────────

  describe('D01: Prescription Refill (POST /api/v1/prescriptions/:prescriptionId/refill)', () => {
    it('should allow authorized patient to refill their own prescription with atomic transaction', async () => {
      mockRepo.findPrescriptionById.mockResolvedValue({ ...basePrescription });
      mockRepo.refillPrescriptionAtomic.mockImplementation(async (id, notes, audit) => ({
        ...basePrescription,
        notes,
        updatedAt: new Date(),
      }));

      const result = await service.refillPrescription(
        mockPatientUserId,
        mockPrescriptionId,
        { quantity: 1, notes: 'Patient requested refill via portal' },
        ['PATIENT'],
      );

      expect(result).toBeDefined();
      expect(result.id).toBe(mockPrescriptionId);
      expect(result.refills).toHaveLength(1);
      expect(result.refills[0].refillNumber).toBe(1);
      expect(result.refills[0].refilledBy).toBe(mockPatientUserId);
      expect(mockRepo.refillPrescriptionAtomic).toHaveBeenCalledTimes(1);
      const auditArg = mockRepo.refillPrescriptionAtomic.mock.calls[0][2];
      expect(auditArg.action).toBe('PRESCRIPTION_REFILLED');
      expect(auditArg.performedBy).toBe(mockPatientUserId);
    });

    it('should reject patient attempting to refill another patient prescription', async () => {
      mockRepo.findPrescriptionById.mockResolvedValue({ ...basePrescription });

      await expect(
        service.refillPrescription(
          'malicious-other-patient-user',
          mockPrescriptionId,
          { quantity: 1 },
          ['PATIENT'],
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(mockRepo.refillPrescriptionAtomic).not.toHaveBeenCalled();
    });

    it('should allow authorized doctor to refill patient prescription after clinical verification', async () => {
      const nonAuthoringDoctorUserId = 'other-doctor-user-999';
      mockRepo.findPrescriptionById.mockResolvedValue({ ...basePrescription });
      mockRepo.findProfileByUserId.mockResolvedValue({
        id: 'doc-prof-999',
        userId: nonAuthoringDoctorUserId,
        fullName: 'Dr. Sarah Smith',
        verificationStatus: 'VERIFIED',
      });
      mockRepo.getDoctorActiveFacilityIds.mockResolvedValue(['fac-1']);
      mockRepo.findPatientProfileById.mockResolvedValue({ id: mockPatientProfileId, isDeleted: false });
      mockRepo.verifyDoctorPatientAccess.mockResolvedValue({ isAuthorized: true, authSource: 'ENCOUNTER' });

      mockRepo.refillPrescriptionAtomic.mockImplementation(async (id, notes) => ({
        ...basePrescription,
        notes,
        updatedAt: new Date(),
      }));

      const result = await service.refillPrescription(
        nonAuthoringDoctorUserId,
        mockPrescriptionId,
        { quantity: 2, notes: 'Follow-up 60-day refill approved' },
        ['DOCTOR'],
      );

      expect(result).toBeDefined();
      expect(result.refills[0].quantity).toBe(2);
      expect(result.refills[0].refilledByName).toBe('Dr. Sarah Smith');
      expect(mockRepo.verifyDoctorPatientAccess).toHaveBeenCalled();
      expect(mockRepo.refillPrescriptionAtomic).toHaveBeenCalled();
    });

    it('should reject unauthorized doctor with no active relationship to patient', async () => {
      const unauthorizedDoctorId = 'unauth-doc-user';
      mockRepo.findPrescriptionById.mockResolvedValue({ ...basePrescription });
      mockRepo.findProfileByUserId.mockResolvedValue({
        id: 'unauth-doc-prof',
        userId: unauthorizedDoctorId,
        fullName: 'Dr. Hacker',
        verificationStatus: 'VERIFIED',
      });
      mockRepo.getDoctorActiveFacilityIds.mockResolvedValue(['fac-1']);
      mockRepo.findPatientProfileById.mockResolvedValue({ id: mockPatientProfileId, isDeleted: false });
      mockRepo.verifyDoctorPatientAccess.mockResolvedValue({ isAuthorized: false, reason: 'No encounter' });
      mockRepo.createSecurityAuditLog.mockResolvedValue({});

      await expect(
        service.refillPrescription(
          unauthorizedDoctorId,
          mockPrescriptionId,
          { quantity: 1 },
          ['DOCTOR'],
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(mockRepo.refillPrescriptionAtomic).not.toHaveBeenCalled();
    });

    it('should reject invalid or negative quantity with BadRequestException', async () => {
      mockRepo.findPrescriptionById.mockResolvedValue({ ...basePrescription });

      await expect(
        service.refillPrescription(
          mockPatientUserId,
          mockPrescriptionId,
          { quantity: 0 },
          ['PATIENT'],
        ),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.refillPrescription(
          mockPatientUserId,
          mockPrescriptionId,
          { quantity: -5 },
          ['PATIENT'],
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should prevent duplicate rapid refills within 30 seconds with ConflictException', async () => {
      const existingRefillDate = new Date().toISOString();
      const prescriptionWithRecentRefill = {
        ...basePrescription,
        notes: `Take with food.\n[JSON_MEDICATIONS]:[{"name":"Amlodipine"}]\n[JSON_REFILLS]:[{"id":"ref-1","refillNumber":1,"refilledAt":"${existingRefillDate}","refilledBy":"${mockPatientUserId}","quantity":1,"notes":"Refill"}]`,
      };
      mockRepo.findPrescriptionById.mockResolvedValue(prescriptionWithRecentRefill);

      await expect(
        service.refillPrescription(
          mockPatientUserId,
          mockPrescriptionId,
          { quantity: 1 },
          ['PATIENT'],
        ),
      ).rejects.toThrow(ConflictException);

      expect(mockRepo.refillPrescriptionAtomic).not.toHaveBeenCalled();
    });

    it('should reject refill if prescription is discontinued', async () => {
      const discontinuedPrescription = {
        ...basePrescription,
        notes: `Take with food.\n[DISCONTINUED]:{"isDiscontinued":true,"discontinueReason":"Adverse allergic reaction"}`,
      };
      mockRepo.findPrescriptionById.mockResolvedValue(discontinuedPrescription);

      await expect(
        service.refillPrescription(
          mockPatientUserId,
          mockPrescriptionId,
          { quantity: 1 },
          ['PATIENT'],
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── D02: Prescription Export ───────────────────────────────────────────────

  describe('D02: Prescription Export (GET /api/v1/prescriptions/:prescriptionId/export)', () => {
    it('should export structured JSON prescription summary preserving existing contract', async () => {
      mockRepo.findPrescriptionById.mockResolvedValue({ ...basePrescription });
      mockRepo.createMedicalRecordAuditLog.mockResolvedValue({});

      const result = await service.exportPrescription(
        mockPatientUserId,
        mockPrescriptionId,
        ['PATIENT'],
      );

      expect(result).toBeDefined();
      expect(result.prescriptionId).toBe(mockPrescriptionId);
      expect(result.rxNumber).toMatch(/^RX-/);
      expect(result.patient.fullName).toBe('John Doe');
      expect(result.medications).toHaveLength(1);
      expect(result.medications[0].name).toBe('Amlodipine');
      expect(mockRepo.createMedicalRecordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'PRESCRIPTION_EXPORTED' }),
      );
    });

    it('should generate valid standard binary PDF starting with %PDF-1.4 when exporting PDF', async () => {
      mockRepo.findPrescriptionById.mockResolvedValue({ ...basePrescription });
      mockRepo.createMedicalRecordAuditLog.mockResolvedValue({});

      const pdfBuffer = await service.exportPrescriptionPdf(
        mockPatientUserId,
        mockPrescriptionId,
        ['PATIENT'],
      );

      expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
      expect(pdfBuffer.length).toBeGreaterThan(500);
      expect(pdfBuffer.subarray(0, 8).toString('latin1')).toBe('%PDF-1.4');
      expect(pdfBuffer.toString('latin1')).toContain('%%EOF');
      expect(pdfBuffer.toString('latin1')).toContain('CAREID CLINICAL PRESCRIPTION');
    });

    it('should throw BadRequestException if prescriptionId is not a valid UUID', async () => {
      await expect(
        service.exportPrescription('user-1', 'not-a-valid-uuid', ['PATIENT']),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if prescription does not exist', async () => {
      mockRepo.findPrescriptionById.mockResolvedValue(null);

      await expect(
        service.exportPrescription(mockPatientUserId, mockPrescriptionId, ['PATIENT']),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── Phase 5: Unified Clinical PDF Export ───────────────────────────────────

  describe('Phase 5: Unified Clinical PDF Export (GET /doctors/patients/:patientProfileId/medical-records/export)', () => {
    beforeEach(() => {
      mockRepo.findProfileByUserId.mockResolvedValue({
        id: mockDoctorProfileId,
        userId: mockDoctorUserId,
        fullName: 'Dr. Evelyn Reed',
        primarySpecialization: 'Cardiology',
        verificationStatus: 'VERIFIED',
      });
      mockRepo.getDoctorActiveFacilityIds.mockResolvedValue(['fac-100']);
      mockRepo.findPatientProfileById.mockResolvedValue({
        id: mockPatientProfileId,
        patientNumber: 'PAT-8890',
        fullName: 'John Doe',
        user: {
          firstName: 'John',
          lastName: 'Doe',
          dateOfBirth: new Date('1980-05-12'),
          gender: 'MALE',
          phone: '+15551234567',
          email: 'john.doe@example.com',
        },
      });
      mockRepo.verifyDoctorPatientAccess.mockResolvedValue({
        isAuthorized: true,
        authSource: 'APPOINTMENT',
      });
      mockRepo.findPatientPrescriptions.mockResolvedValue({
        items: [{ ...basePrescription }],
        total: 1,
      });
      mockRepo.findPatientMedicalRecords.mockResolvedValue({
        items: [
          {
            id: 'rec-1',
            title: 'Cardiology Outpatient Consultation',
            encounterDate: new Date('2026-02-15'),
            chiefComplaint: 'Mild chest tightness on exertion',
            clinicalNotes: 'ECG normal sinus rhythm. Stable hemodynamics.',
            status: 'FINAL',
          },
        ],
        total: 1,
      });
      mockRepo.getPatientTimeline.mockResolvedValue({
        items: [{ eventType: 'CONSULTATION', timestamp: '2026-02-15T10:00:00Z' }],
        total: 1,
      });
      mockRepo.findPatientAdmissions.mockResolvedValue({
        items: [],
        total: 0,
      });
      mockRepo.createMedicalRecordAuditLog.mockResolvedValue({});
    });

    it('should generate compliant PDF binary buffer when format=PDF is requested', async () => {
      const result = await service.exportPatientMedicalRecords(
        mockDoctorUserId,
        mockPatientProfileId,
        'PDF',
        ['DOCTOR'],
      );

      expect(result.format).toBe('PDF');
      expect(Buffer.isBuffer(result.buffer)).toBe(true);
      expect(result.buffer!.subarray(0, 8).toString('latin1')).toBe('%PDF-1.4');
      expect(result.buffer!.toString('latin1')).toContain('CAREID UNIFIED PATIENT CLINICAL RECORD');
      expect(result.buffer!.toString('latin1')).toContain('PATIENT DEMOGRAPHICS');
      expect(mockRepo.createMedicalRecordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CLINICAL_EXPORT_GENERATED' }),
      );
    });

    it('should return structured clinical data when format=JSON is requested', async () => {
      const result = await service.exportPatientMedicalRecords(
        mockDoctorUserId,
        mockPatientProfileId,
        'JSON',
        ['DOCTOR'],
      );

      expect(result.format).toBe('JSON');
      expect(result.data).toBeDefined();
      expect(result.data.patient.patientNumber).toBe('PAT-8890');
      expect(result.data.prescriptions).toHaveLength(1);
      expect(result.data.medicalRecords).toHaveLength(1);
      expect(mockRepo.createMedicalRecordAuditLog).toHaveBeenCalled();
    });

    it('should reject unauthorized doctor without clinical relationship to patient', async () => {
      mockRepo.verifyDoctorPatientAccess.mockResolvedValue({
        isAuthorized: false,
        reason: 'No clinical appointment or facility consent',
      });
      mockRepo.createSecurityAuditLog.mockResolvedValue({});

      await expect(
        service.exportPatientMedicalRecords(
          mockDoctorUserId,
          mockPatientProfileId,
          'PDF',
          ['DOCTOR'],
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
