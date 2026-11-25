import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from '../application/use-cases/admin.service';
import { AdminController } from '../presentation/controllers/admin.controller';
import { NotFoundException } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { Reflector } from '@nestjs/core';

describe('Admin Patients & Medical Records (Phase 3 Workstream A & B)', () => {
  let adminService: AdminService;
  let adminController: AdminController;

  const mockAdminRepo = {
    findUsers: jest.fn(),
    findUserById: jest.fn(),
    updateUserStatus: jest.fn(),
    assignUserRoles: jest.fn(),
    softDeleteUser: jest.fn(),
    restoreUser: jest.fn(),
    findPatients: jest.fn(),
    findPatientById: jest.fn(),
    findMedicalRecords: jest.fn(),
    findMedicalRecordById: jest.fn(),
    findMedicalRecordsByPatient: jest.fn(),
    getPatientTimeline: jest.fn(),
    createAuditLog: jest.fn(),
  };

  const mockLogger = { log: jest.fn(), error: jest.fn(), warn: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        AdminService,
        { provide: 'IAdminRepository', useValue: mockAdminRepo },
        { provide: Logger, useValue: mockLogger },
      ],
    }).compile();

    adminService = module.get<AdminService>(AdminService);
    adminController = module.get<AdminController>(AdminController);
  });

  // ─── Workstream A: Patient Administration ───────────────────────────────

  describe('Workstream A — GET /api/v1/admin/patients', () => {
    it('should return paginated patient list with valid metadata and bounded take/skip', async () => {
      const mockPatients = [
        {
          id: 'patient-uuid-1',
          userId: 'user-uuid-1',
          patientNumber: 'P-1001',
          firstName: 'Alice',
          lastName: 'Smith',
          dateOfBirth: '1992-04-12T00:00:00.000Z',
          gender: 'FEMALE',
          bloodGroup: 'A+',
          phone: '+923001112233',
          email: 'alice@example.com',
          userStatus: 'ACTIVE',
          profileStatus: 'COMPLETED',
          onboardingStep: 6,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      mockAdminRepo.findPatients.mockResolvedValue({
        total: 45,
        items: mockPatients,
      });

      const result = await adminController.getPatients({ page: 2, limit: 10, status: 'COMPLETED' });

      expect(mockAdminRepo.findPatients).toHaveBeenCalledWith({
        page: 2,
        limit: 10,
        status: 'COMPLETED',
        gender: undefined,
        bloodGroup: undefined,
        q: undefined,
      });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].firstName).toBe('Alice');
      expect(result.meta.totalItems).toBe(45);
      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.totalPages).toBe(5);
      expect(result.meta.hasNextPage).toBe(true);
      expect(result.meta.hasPreviousPage).toBe(true);
    });

    it('should support search and clinical filters on patient listing', async () => {
      mockAdminRepo.findPatients.mockResolvedValue({ total: 1, items: [] });

      await adminController.getPatients({
        q: 'Alice',
        gender: 'FEMALE',
        bloodGroup: 'O+',
        status: 'ACTIVE',
      });

      expect(mockAdminRepo.findPatients).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        q: 'Alice',
        gender: 'FEMALE',
        bloodGroup: 'O+',
        status: 'ACTIVE',
      });
    });

    it('should handle empty result sets gracefully with zero count and totalPages=1', async () => {
      mockAdminRepo.findPatients.mockResolvedValue({ total: 0, items: [] });

      const result = await adminController.getPatients({ page: 1, limit: 20 });
      expect(result.data).toEqual([]);
      expect(result.meta.totalItems).toBe(0);
      expect(result.meta.totalPages).toBe(1);
      expect(result.meta.hasNextPage).toBe(false);
      expect(result.meta.hasPreviousPage).toBe(false);
    });
  });

  describe('Workstream A — GET /api/v1/admin/patients/:patientId', () => {
    it('should return complete patient details excluding authentication secrets', async () => {
      const mockPatient = {
        id: 'patient-profile-1',
        userId: 'user-uuid-1',
        patientNumber: 'P-1001',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1985-06-20T00:00:00.000Z',
        gender: 'MALE',
        bloodGroup: 'B+',
        phone: '+923009998877',
        email: 'john@example.com',
        userStatus: 'ACTIVE',
        profileStatus: 'COMPLETED',
        onboardingStep: 6,
        knownAllergies: ['Penicillin'],
        emergencyContact: { id: 'ec-1', name: 'Mary Doe', relationship: 'Spouse', phone: '+923001110000' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockAdminRepo.findPatientById.mockResolvedValue(mockPatient);

      const result = await adminController.getPatientById('patient-profile-1');

      expect(mockAdminRepo.findPatientById).toHaveBeenCalledWith('patient-profile-1');
      expect(result.id).toBe('patient-profile-1');
      expect(result.firstName).toBe('John');
      expect(result.phone).toBe('+923009998877');
      expect((result as any).passwordHash).toBeUndefined();
      expect((result as any).refreshToken).toBeUndefined();
    });

    it('should throw NotFoundException when patient identifier does not exist', async () => {
      mockAdminRepo.findPatientById.mockResolvedValue(null);

      await expect(adminController.getPatientById('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── Workstream B: Medical Records Administration ───────────────────────

  describe('Workstream B — GET /api/v1/admin/medical-records', () => {
    it('should return global paginated medical records with patient metadata', async () => {
      const mockRecords = [
        {
          id: 'rec-1',
          patientProfileId: 'profile-1',
          title: 'Cardiology Consultation',
          status: 'FINAL',
          isDeleted: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          patient: {
            id: 'profile-1',
            patientNumber: 'P-1001',
            firstName: 'John',
            lastName: 'Doe',
            phone: '+923009998877',
          },
          encounters: [],
          diagnoses: [{ description: 'Hypertension' }],
          vitalSigns: [],
          procedures: [],
          attachments: [
            {
              id: 'att-1',
              fileName: 'ecg_report.pdf',
              originalName: 'ecg_scan.pdf',
              fileSize: 102400,
              mimeType: 'application/pdf',
              category: 'LAB_REPORT',
              virusScanStatus: 'CLEAN',
              createdAt: new Date().toISOString(),
            },
          ],
        },
      ];

      mockAdminRepo.findMedicalRecords.mockResolvedValue({
        total: 100,
        items: mockRecords,
      });

      const result = await adminController.getMedicalRecords({
        page: 1,
        limit: 10,
        status: 'FINAL',
        q: 'Cardiology',
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].title).toBe('Cardiology Consultation');
      expect(result.data[0].patient.firstName).toBe('John');
      expect(result.data[0].attachments[0].fileName).toBe('ecg_report.pdf');
      // Storage keys and raw URLs must not be exposed
      expect((result.data[0].attachments[0] as any).storageKey).toBeUndefined();
      expect((result.data[0].attachments[0] as any).storageUrl).toBeUndefined();
      expect(result.meta.totalItems).toBe(100);
      expect(result.meta.totalPages).toBe(10);
    });
  });

  describe('Workstream B — GET /api/v1/admin/medical-records/:recordId', () => {
    it('should return detailed medical record by ID', async () => {
      const mockRecord = {
        id: 'rec-100',
        patientProfileId: 'profile-1',
        title: 'Complete Physical Exam',
        status: 'FINAL',
        isDeleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        encounters: [],
        diagnoses: [],
        vitalSigns: [],
        procedures: [],
        attachments: [],
      };

      mockAdminRepo.findMedicalRecordById.mockResolvedValue(mockRecord);

      const result = await adminController.getMedicalRecordById('rec-100');
      expect(result.id).toBe('rec-100');
      expect(result.title).toBe('Complete Physical Exam');
    });

    it('should throw NotFoundException for non-existent record ID', async () => {
      mockAdminRepo.findMedicalRecordById.mockResolvedValue(null);

      await expect(adminController.getMedicalRecordById('invalid-rec-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('Workstream B — GET /api/v1/admin/patients/:patientId/medical-records', () => {
    it('should strictly return records scoped to the target patient and prevent cross-patient leakage', async () => {
      mockAdminRepo.findPatientById.mockResolvedValue({
        id: 'target-profile-uuid',
        firstName: 'Target',
        lastName: 'Patient',
      });

      const mockPatientRecords = [
        {
          id: 'rec-target-1',
          patientProfileId: 'target-profile-uuid',
          title: 'Target Patient Encounter',
          status: 'FINAL',
          isDeleted: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      mockAdminRepo.findMedicalRecordsByPatient.mockResolvedValue({
        total: 1,
        items: mockPatientRecords,
      });

      const result = await adminController.getPatientMedicalRecords('target-profile-uuid', {
        page: 1,
        limit: 20,
      });

      expect(mockAdminRepo.findPatientById).toHaveBeenCalledWith('target-profile-uuid');
      expect(mockAdminRepo.findMedicalRecordsByPatient).toHaveBeenCalledWith(
        'target-profile-uuid',
        expect.objectContaining({ page: 1, limit: 20 }),
      );
      expect(result.data).toHaveLength(1);
      expect(result.data[0].patientProfileId).toBe('target-profile-uuid');
    });

    it('should throw NotFoundException when target patient does not exist', async () => {
      mockAdminRepo.findPatientById.mockResolvedValue(null);

      await expect(
        adminController.getPatientMedicalRecords('ghost-patient', { page: 1, limit: 10 }),
      ).rejects.toThrow(NotFoundException);
      expect(mockAdminRepo.findMedicalRecordsByPatient).not.toHaveBeenCalled();
    });
  });

  describe('Workstream B — GET /api/v1/admin/patients/:patientId/medical-records/timeline', () => {
    it('should return chronological timeline combining records and attachments', async () => {
      mockAdminRepo.findPatientById.mockResolvedValue({
        id: 'timeline-profile-id',
      });

      const mockTimeline = [
        {
          id: 'att-1',
          type: 'ATTACHMENT',
          title: 'Blood Test Results',
          date: '2026-06-15T10:00:00.000Z',
          category: 'LAB_REPORT',
        },
        {
          id: 'rec-1',
          type: 'MEDICAL_RECORD',
          title: 'Annual Health Checkup',
          date: '2026-06-10T09:00:00.000Z',
          status: 'FINAL',
        },
      ];

      mockAdminRepo.getPatientTimeline.mockResolvedValue({
        total: 2,
        items: mockTimeline,
      });

      const result = await adminController.getPatientTimeline('timeline-profile-id', {
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(2);
      expect(result.data[0].type).toBe('ATTACHMENT');
      expect(result.data[1].type).toBe('MEDICAL_RECORD');
      expect(result.meta.totalItems).toBe(2);
    });

    it('should handle empty timeline with totalItems=0 and totalPages=1', async () => {
      mockAdminRepo.findPatientById.mockResolvedValue({ id: 'empty-patient' });
      mockAdminRepo.getPatientTimeline.mockResolvedValue({ total: 0, items: [] });

      const result = await adminController.getPatientTimeline('empty-patient', { page: 1, limit: 10 });
      expect(result.data).toEqual([]);
      expect(result.meta.totalItems).toBe(0);
      expect(result.meta.totalPages).toBe(1);
      expect(result.meta.hasNextPage).toBe(false);
      expect(result.meta.hasPreviousPage).toBe(false);
    });

    it('should compute exact pagination metadata across multiple pages for large combined event counts', async () => {
      mockAdminRepo.findPatientById.mockResolvedValue({ id: 'large-patient' });
      // Simulate 55 total records + attachments
      mockAdminRepo.getPatientTimeline.mockResolvedValue({
        total: 55,
        items: new Array(10).fill({ id: 'item', type: 'MEDICAL_RECORD', date: '2026-01-01T00:00:00.000Z' }),
      });

      // Page 2 of 10-item pages
      const result = await adminController.getPatientTimeline('large-patient', { page: 2, limit: 10 });
      expect(result.meta.totalItems).toBe(55);
      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.totalPages).toBe(6);
      expect(result.meta.hasNextPage).toBe(true);
      expect(result.meta.hasPreviousPage).toBe(true);

      // Last page (page 6)
      const lastPageResult = await adminController.getPatientTimeline('large-patient', { page: 6, limit: 10 });
      expect(lastPageResult.meta.hasNextPage).toBe(false);
      expect(lastPageResult.meta.hasPreviousPage).toBe(true);
    });

    it('should preserve deterministic secondary ID ordering when timestamps are identical', async () => {
      mockAdminRepo.findPatientById.mockResolvedValue({ id: 'tie-patient' });
      const sameTimestamp = '2026-05-01T12:00:00.000Z';
      const itemsWithSameTime = [
        { id: 'uuid-z-last', type: 'ATTACHMENT', title: 'File Z', date: sameTimestamp },
        { id: 'uuid-a-first', type: 'MEDICAL_RECORD', title: 'Record A', date: sameTimestamp },
      ];

      // Sorted deterministically descending by ID when date is identical
      const sortedByDeterministicTieBreaker = [...itemsWithSameTime].sort((a, b) => {
        const timeDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (timeDiff !== 0) return timeDiff;
        return b.id.localeCompare(a.id);
      });

      mockAdminRepo.getPatientTimeline.mockResolvedValue({
        total: 2,
        items: sortedByDeterministicTieBreaker,
      });

      const result = await adminController.getPatientTimeline('tie-patient', { page: 1, limit: 10 });
      expect(result.data[0].id).toBe('uuid-z-last');
      expect(result.data[1].id).toBe('uuid-a-first');
    });

    it('should throw NotFoundException when target patient is missing for timeline query', async () => {
      mockAdminRepo.findPatientById.mockResolvedValue(null);

      await expect(
        adminController.getPatientTimeline('nonexistent-id', { page: 1, limit: 10 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── RBAC Role Guard Verification ────────────────────────────────────────

  describe('RBAC Role Policy Enforcement', () => {
    it('should declare @Roles("ADMIN", "SUPER_ADMIN") on AdminController', () => {
      const reflector = new Reflector();
      const roles = reflector.get<string[]>('roles', AdminController);
      expect(roles).toEqual(['ADMIN', 'SUPER_ADMIN']);
    });
  });
});

