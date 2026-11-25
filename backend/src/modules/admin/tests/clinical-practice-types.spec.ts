import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AdminRepository } from '../infrastructure/database/admin.repository';
import { AdminService } from '../application/use-cases/admin.service';
import { DoctorService } from '@modules/doctor/application/use-cases/doctor.service';
import { GovernanceStatus, ClinicalAuthorizationScope } from '@prisma/client';

describe('Goal 014: Dynamic Clinical Practice Types & Security Safety Suite', () => {
  let adminRepository: AdminRepository;
  let adminService: AdminService;
  let mockDb: any;
  let mockDoctorRepo: any;
  let doctorService: DoctorService;

  beforeEach(() => {
    jest.clearAllMocks();

    mockDb = {
      clinicalPracticeType: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      masterDataItem: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      doctorProfile: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
        update: jest.fn(),
      },
      doctorAuditLog: {
        create: jest.fn().mockResolvedValue({ id: 'dal-1' }),
      },
      role: {
        findUnique: jest.fn().mockResolvedValue({ id: 'role-doctor', name: 'DOCTOR' }),
        create: jest.fn().mockResolvedValue({ id: 'role-doctor', name: 'DOCTOR' }),
      },
      user: {
        create: jest.fn(),
        findUnique: jest.fn().mockResolvedValue(null),
      },
      userRole: {
        create: jest.fn().mockResolvedValue({ id: 'ur-1' }),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'al-1' }),
      },
      $transaction: jest.fn((callback: any) => callback(mockDb)),
    };

    adminRepository = new AdminRepository(mockDb as any);

    const mockPinoLogger: any = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      log: jest.fn(),
    };

    adminService = new AdminService(adminRepository as any, mockPinoLogger);

    mockDoctorRepo = {
      db: mockDb,
      findDoctorById: jest.fn(),
      updateDoctor: jest.fn(),
      createAuditLog: jest.fn(),
    };

    const mockQrService: any = {
      generateAndPersistQrPayload: jest.fn(),
    };

    doctorService = new DoctorService(mockDoctorRepo, mockQrService, mockPinoLogger);
  });

  describe('Admin Catalogue CRUD & Listing', () => {
    it('1. should list all clinical practice types with doctor and specialty counts', async () => {
      const mockTypes = [
        {
          id: 'cpt-1',
          code: 'HUMAN_HEALTHCARE',
          displayName: 'Human Healthcare',
          status: 'ACTIVE',
          clinicalAuthorizationMapping: 'HUMAN_HEALTHCARE',
          isCanonical: true,
          sortOrder: 1,
          _count: { doctors: 23, specialties: 12 },
        },
        {
          id: 'cpt-2',
          code: 'VETERINARY_MEDICINE',
          displayName: 'Veterinary Medicine',
          status: 'ACTIVE',
          clinicalAuthorizationMapping: 'VETERINARY_MEDICINE',
          isCanonical: true,
          sortOrder: 2,
          _count: { doctors: 2, specialties: 1 },
        },
      ];
      mockDb.clinicalPracticeType.findMany.mockResolvedValue(mockTypes);

      const result = await adminService.getClinicalPracticeTypes();
      expect(result).toHaveLength(2);
      expect(result[0].code).toBe('HUMAN_HEALTHCARE');
      expect(result[0]._count.doctors).toBe(23);
      expect(result[1]._count.specialties).toBe(1);
    });

    it('2. should retrieve practice type by ID or code', async () => {
      mockDb.clinicalPracticeType.findFirst.mockResolvedValue({
        id: 'cpt-1',
        code: 'HUMAN_HEALTHCARE',
        displayName: 'Human Healthcare',
        status: 'ACTIVE',
      });

      const result = await adminService.getClinicalPracticeTypeById('HUMAN_HEALTHCARE');
      expect(result.code).toBe('HUMAN_HEALTHCARE');
    });

    it('3. should throw NotFoundException when practice type does not exist', async () => {
      mockDb.clinicalPracticeType.findFirst.mockResolvedValue(null);

      await expect(adminService.getClinicalPracticeTypeById('NON_EXISTENT'))
        .rejects.toThrow(NotFoundException);
    });

    it('4. should create a new clinical practice type and reject duplicate codes', async () => {
      mockDb.clinicalPracticeType.findFirst.mockResolvedValue(null);
      mockDb.clinicalPracticeType.create.mockResolvedValue({
        id: 'cpt-new',
        code: 'DENTAL_CLINIC',
        displayName: 'Dental Medicine',
        status: 'ACTIVE',
        clinicalAuthorizationMapping: 'HUMAN_HEALTHCARE',
        isCanonical: false,
      });

      const created = await adminService.createClinicalPracticeType({
        code: 'DENTAL_CLINIC',
        displayName: 'Dental Medicine',
        clinicalAuthorizationMapping: ClinicalAuthorizationScope.HUMAN_HEALTHCARE,
      }, 'admin-123');

      expect(created.code).toBe('DENTAL_CLINIC');

      // Duplicate code rejection
      mockDb.clinicalPracticeType.findFirst.mockResolvedValue({ id: 'cpt-dup', code: 'DENTAL_CLINIC', isDeleted: false });
      await expect(adminService.createClinicalPracticeType({
        code: 'DENTAL_CLINIC',
        displayName: 'Dental Clinic 2',
      }, 'admin-123')).rejects.toThrow(ConflictException);
    });

    it('5. should update display name and description of a practice type', async () => {
      mockDb.clinicalPracticeType.findFirst.mockResolvedValue({
        id: 'cpt-1',
        code: 'HUMAN_HEALTHCARE',
        displayName: 'Human Healthcare',
        isCanonical: true,
        clinicalAuthorizationMapping: 'HUMAN_HEALTHCARE',
      });
      mockDb.clinicalPracticeType.update.mockResolvedValue({
        id: 'cpt-1',
        code: 'HUMAN_HEALTHCARE',
        displayName: 'Human Healthcare (Updated)',
        isCanonical: true,
      });

      const updated = await adminService.updateClinicalPracticeType('HUMAN_HEALTHCARE', {
        displayName: 'Human Healthcare (Updated)',
      }, 'admin-123');

      expect(updated.displayName).toBe('Human Healthcare (Updated)');
    });
  });

  describe('Canonical Protection & In-Use Deletion Rules', () => {
    it('6. should reject deactivation of canonical practice types with 400 Bad Request', async () => {
      mockDb.clinicalPracticeType.findFirst.mockResolvedValue({
        id: 'cpt-1',
        code: 'HUMAN_HEALTHCARE',
        isCanonical: true,
        status: 'ACTIVE',
      });

      await expect(adminService.updateClinicalPracticeTypeStatus(
        'HUMAN_HEALTHCARE',
        GovernanceStatus.INACTIVE,
        'admin-123',
      )).rejects.toThrow(BadRequestException);
    });

    it('7. should reject mutating authorization mapping of canonical practice types with 400 Bad Request', async () => {
      mockDb.clinicalPracticeType.findFirst.mockResolvedValue({
        id: 'cpt-1',
        code: 'HUMAN_HEALTHCARE',
        isCanonical: true,
        clinicalAuthorizationMapping: 'HUMAN_HEALTHCARE',
      });

      await expect(adminService.updateClinicalPracticeType(
        'HUMAN_HEALTHCARE',
        { clinicalAuthorizationMapping: ClinicalAuthorizationScope.VETERINARY_MEDICINE },
        'admin-123',
      )).rejects.toThrow(BadRequestException);
    });

    it('8. should reject deletion of canonical practice types with 400 Bad Request', async () => {
      mockDb.clinicalPracticeType.findFirst.mockResolvedValue({
        id: 'cpt-1',
        code: 'HUMAN_HEALTHCARE',
        isCanonical: true,
      });

      await expect(adminService.deleteClinicalPracticeType('HUMAN_HEALTHCARE', 'admin-123'))
        .rejects.toThrow(BadRequestException);
    });

    it('9. should reject deletion of practice type assigned to active doctors with 409 Conflict', async () => {
      mockDb.clinicalPracticeType.findFirst.mockResolvedValue({
        id: 'cpt-custom',
        code: 'DENTAL_CLINIC',
        isCanonical: false,
      });
      mockDb.doctorProfile.count.mockResolvedValue(3); // 3 doctors assigned

      await expect(adminService.deleteClinicalPracticeType('DENTAL_CLINIC', 'admin-123'))
        .rejects.toThrow(ConflictException);
    });

    it('10. should reject deletion of practice type assigned to specialties with 409 Conflict', async () => {
      mockDb.clinicalPracticeType.findFirst.mockResolvedValue({
        id: 'cpt-custom',
        code: 'DENTAL_CLINIC',
        isCanonical: false,
      });
      mockDb.doctorProfile.count.mockResolvedValue(0);
      mockDb.masterDataItem.count.mockResolvedValue(5); // 5 specialties assigned

      await expect(adminService.deleteClinicalPracticeType('DENTAL_CLINIC', 'admin-123'))
        .rejects.toThrow(ConflictException);
    });

    it('11. should delete practice type when completely unused', async () => {
      mockDb.clinicalPracticeType.findFirst.mockResolvedValue({
        id: 'cpt-unused',
        code: 'UNUSED_PRACTICE',
        isCanonical: false,
      });
      mockDb.doctorProfile.count.mockResolvedValue(0);
      mockDb.masterDataItem.count.mockResolvedValue(0);
      mockDb.clinicalPracticeType.delete.mockResolvedValue({ id: 'cpt-unused' });

      const result = await adminService.deleteClinicalPracticeType('UNUSED_PRACTICE', 'admin-123');
      expect(result.success).toBe(true);
      expect(mockDb.clinicalPracticeType.delete).toHaveBeenCalledWith({ where: { id: 'cpt-unused' } });
    });
  });

  describe('Database-Backed Specialty Compatibility & Role Assignment', () => {
    it('12. should assign DOCTOR role for HUMAN_HEALTHCARE and validate compatible specialty', async () => {
      mockDb.clinicalPracticeType.findFirst.mockResolvedValue({
        code: 'HUMAN_HEALTHCARE',
        status: 'ACTIVE',
        isDeleted: false,
        clinicalAuthorizationMapping: 'HUMAN_HEALTHCARE',
      });
      mockDb.masterDataItem.findFirst.mockResolvedValue({
        name: 'Cardiology',
        code: 'CARDIOLOGY',
        clinicalPracticeType: 'HUMAN_HEALTHCARE',
      });

      const userDto: any = {
        phone: '+16505559999',
        email: 'doc.cardio@careid.test',
        fullName: 'Dr. Human Cardio',
        clinicalPracticeType: 'HUMAN_HEALTHCARE',
        primarySpecialization: 'Cardiology',
        medicalCouncil: 'PMDC',
        registrationNumber: 'REG-CARDIO-1',
        licenseNumber: 'LIC-CARDIO-1',
      };

      mockDb.user.create.mockResolvedValue({ id: 'u-1', ...userDto });
      mockDb.doctorProfile.create.mockResolvedValue({ id: 'dp-1', userId: 'u-1' });

      const created = await adminService.createUser('admin-123', userDto);
      expect(created).toBeDefined();
      expect(userDto.role).toBe('DOCTOR');
    });

    it('13. should reject doctor creation when primarySpecialization is incompatible in DB', async () => {
      mockDb.clinicalPracticeType.findFirst.mockResolvedValue({
        code: 'HUMAN_HEALTHCARE',
        status: 'ACTIVE',
        isDeleted: false,
        clinicalAuthorizationMapping: 'HUMAN_HEALTHCARE',
      });
      mockDb.masterDataItem.findFirst.mockResolvedValue({
        name: 'Equine Surgery',
        code: 'EQUINE_SURGERY',
        clinicalPracticeType: 'VETERINARY_MEDICINE', // Incompatible!
      });

      const userDto: any = {
        phone: '+16505558888',
        email: 'doc.bad@careid.test',
        fullName: 'Dr. Incompatible Spec',
        clinicalPracticeType: 'HUMAN_HEALTHCARE',
        primarySpecialization: 'Equine Surgery',
        medicalCouncil: 'PMDC',
        registrationNumber: 'REG-BAD-1',
        licenseNumber: 'LIC-BAD-1',
      };

      await expect(adminService.createUser('admin-123', userDto))
        .rejects.toThrow(BadRequestException);
    });

    it('14. should assign VETERINARIAN role for VETERINARY_MEDICINE mapping', async () => {
      mockDb.clinicalPracticeType.findFirst.mockResolvedValue({
        code: 'VETERINARY_MEDICINE',
        status: 'ACTIVE',
        isDeleted: false,
        clinicalAuthorizationMapping: 'VETERINARY_MEDICINE',
      });
      mockDb.masterDataItem.findFirst.mockResolvedValue({
        name: 'Veterinary Medicine',
        code: 'VETERINARY_MEDICINE',
        clinicalPracticeType: 'VETERINARY_MEDICINE',
      });

      const userDto: any = {
        phone: '+16505557777',
        email: 'doc.vet@careid.test',
        fullName: 'Dr. John Vet',
        clinicalPracticeType: 'VETERINARY_MEDICINE',
        primarySpecialization: 'Veterinary Medicine',
        medicalCouncil: 'PVMC',
        registrationNumber: 'REG-VET-1',
        licenseNumber: 'LIC-VET-1',
      };

      mockDb.user.create.mockResolvedValue({ id: 'u-2', ...userDto });
      mockDb.doctorProfile.create.mockResolvedValue({ id: 'dp-2', userId: 'u-2' });

      await adminService.createUser('admin-123', userDto);
      expect(userDto.role).toBe('VETERINARIAN');
    });

    it('15. should fail-closed into non-clinical STAFF role for UNMAPPED practice types', async () => {
      mockDb.clinicalPracticeType.findFirst.mockResolvedValue({
        code: 'ALLIED_HEALTH',
        status: 'ACTIVE',
        isDeleted: false,
        clinicalAuthorizationMapping: 'UNMAPPED',
      });

      const userDto: any = {
        phone: '+16505556666',
        email: 'staff.allied@careid.test',
        fullName: 'Allied Practitioner',
        clinicalPracticeType: 'ALLIED_HEALTH',
      };

      mockDb.user.create.mockResolvedValue({ id: 'u-3', ...userDto });

      await adminService.createUser('admin-123', userDto);
      expect(userDto.role).toBe('STAFF');
    });
  });

  describe('Doctor Scope Modification Lockdown', () => {
    it('16. should forbid clinicians from modifying their own clinicalPracticeType', async () => {
      mockDoctorRepo.findDoctorById.mockResolvedValue({
        id: 'doc-1',
        userId: 'user-doc-1',
        clinicalPracticeType: 'HUMAN_HEALTHCARE',
      });

      // Caller is clinician (doctor himself)
      const caller = { userId: 'user-doc-1', roles: ['DOCTOR'] };

      await expect(doctorService.updateDoctor(
        'doc-1',
        { clinicalPracticeType: 'VETERINARY_MEDICINE' } as any,
        caller,
      )).rejects.toThrow(ForbiddenException);
    });

    it('17. should permit Admins to update doctor profile fields without scope block', async () => {
      mockDoctorRepo.findDoctorById.mockResolvedValue({
        id: 'doc-1',
        userId: 'user-doc-1',
        clinicalPracticeType: 'HUMAN_HEALTHCARE',
      });
      mockDoctorRepo.updateDoctor.mockResolvedValue({
        id: 'doc-1',
        userId: 'user-doc-1',
        fullName: 'Dr. Fleming Updated',
        clinicalPracticeType: 'HUMAN_HEALTHCARE',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const caller = { userId: 'admin-user-id', roles: ['ADMIN'] };

      const updated = await doctorService.updateDoctor(
        'doc-1',
        { fullName: 'Dr. Fleming Updated' },
        caller,
      );

      expect(updated.fullName).toBe('Dr. Fleming Updated');
      expect(mockDoctorRepo.updateDoctor).toHaveBeenCalled();
    });
  });
});
