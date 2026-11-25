import { BadRequestException, ConflictException } from '@nestjs/common';
import { AdminRepository } from '../infrastructure/database/admin.repository';
import { AdminService } from '../application/use-cases/admin.service';
import { DoctorService } from '@modules/doctor/application/use-cases/doctor.service';

describe('Admin Doctor Profile Creation Integration & Safety Tests', () => {
  let adminRepository: AdminRepository;
  let adminService: AdminService;
  let mockDb: any;
  let mockDoctorRepo: any;
  let doctorService: DoctorService;

  const validDoctorDto = {
    phone: '+923001234567',
    email: 'dr.fleming@careid.test',
    role: 'DOCTOR',
    fullName: 'Dr. Alexander Fleming',
    status: 'ACTIVE',
    primarySpecialization: 'Cardiology',
    medicalCouncil: 'Pakistan Medical & Dental Council (PMDC)',
    registrationNumber: 'PMC-REG-998877',
    licenseNumber: 'LIC-2026-CARDIO-1',
    secondarySpecializations: ['Interventional Cardiology'],
    yearsOfExperience: 12,
    department: 'Cardiology',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockDb = {
      role: {
        findUnique: jest.fn().mockResolvedValue({ id: 'role-doctor', name: 'DOCTOR' }),
        create: jest.fn().mockResolvedValue({ id: 'role-doctor', name: 'DOCTOR' }),
      },
      user: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      userRole: {
        create: jest.fn().mockResolvedValue({ id: 'ur-1' }),
      },
      doctorProfile: {
        create: jest.fn(),
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      doctorAuditLog: {
        create: jest.fn().mockResolvedValue({ id: 'dal-1' }),
      },
      patientProfile: {
        create: jest.fn(),
        findUnique: jest.fn().mockResolvedValue(null),
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
    };

    adminService = new AdminService(adminRepository, mockPinoLogger);

    mockDoctorRepo = {
      findDoctors: jest.fn(),
      findPendingDoctors: jest.fn(),
      findDoctorById: jest.fn(),
      findProfileByUserId: jest.fn(),
      updateDoctor: jest.fn(),
      createHistory: jest.fn(),
      createAuditLog: jest.fn(),
    };

    const mockQrService: any = {
      generateQr: jest.fn().mockResolvedValue({ token: 'mock-qr-token' }),
    };

    doctorService = new DoctorService(mockDoctorRepo, mockQrService, mockPinoLogger);
  });

  // 1. Create a DOCTOR user with valid existing mandatory data: User created, Doctor Profile created, linked
  it('1. should create User and Doctor Profile in single transaction and link them', async () => {
    mockDb.user.create.mockResolvedValue({
      id: 'user-doc-uuid',
      phone: validDoctorDto.phone,
      email: validDoctorDto.email,
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    mockDb.doctorProfile.create.mockResolvedValue({
      id: 'doc-profile-uuid',
      userId: 'user-doc-uuid',
      fullName: validDoctorDto.fullName,
      primarySpecialization: validDoctorDto.primarySpecialization,
      secondarySpecializations: validDoctorDto.secondarySpecializations,
      medicalCouncil: validDoctorDto.medicalCouncil,
      registrationNumber: validDoctorDto.registrationNumber,
      licenseNumber: validDoctorDto.licenseNumber,
      providerIdentifier: 'DOC-360-123456',
      verificationStatus: 'PENDING',
      yearsOfExperience: 12,
      department: 'Cardiology',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await adminService.createUser('admin-1', validDoctorDto as any);

    expect(mockDb.$transaction).toHaveBeenCalledTimes(1);
    expect(mockDb.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        phone: validDoctorDto.phone,
        email: validDoctorDto.email,
        status: 'ACTIVE',
      }),
    });
    expect(mockDb.doctorProfile.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-doc-uuid',
        fullName: validDoctorDto.fullName,
        primarySpecialization: validDoctorDto.primarySpecialization,
        registrationNumber: validDoctorDto.registrationNumber,
        licenseNumber: validDoctorDto.licenseNumber,
        verificationStatus: 'PENDING',
      }),
    });
    expect(result.id).toBe('user-doc-uuid');
    expect(result.doctorProfileId).toBe('doc-profile-uuid');
  });

  // 2. Verify doctorProfileId matches persisted Doctor Profile ID
  it('2. should verify doctorProfileId matches actual persisted Doctor Profile ID', async () => {
    mockDb.user.create.mockResolvedValue({
      id: 'user-doc-123',
      phone: validDoctorDto.phone,
      email: validDoctorDto.email,
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    mockDb.doctorProfile.create.mockResolvedValue({
      id: 'doc-profile-777',
      userId: 'user-doc-123',
      fullName: validDoctorDto.fullName,
      primarySpecialization: validDoctorDto.primarySpecialization,
      medicalCouncil: validDoctorDto.medicalCouncil,
      registrationNumber: validDoctorDto.registrationNumber,
      licenseNumber: validDoctorDto.licenseNumber,
      providerIdentifier: 'DOC-360-777888',
      verificationStatus: 'PENDING',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await adminService.createUser('admin-1', validDoctorDto as any);

    expect(result.doctorProfileId).toBe('doc-profile-777');
    expect(result.doctorProfile?.id).toBe('doc-profile-777');
  });

  // 3. Verify DoctorProfile.userId matches actual persisted User ID
  it('3. should verify DoctorProfile.userId matches persisted User ID', async () => {
    const assignedUserId = 'user-auth-uuid-999';
    mockDb.user.create.mockResolvedValue({
      id: assignedUserId,
      phone: validDoctorDto.phone,
      email: validDoctorDto.email,
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    mockDb.doctorProfile.create.mockImplementation((args: any) => ({
      id: 'doc-profile-assigned',
      ...args.data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const result = await adminService.createUser('admin-1', validDoctorDto as any);

    expect(mockDb.doctorProfile.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: assignedUserId,
        }),
      }),
    );
    expect(result.doctorProfile?.userId).toBe(assignedUserId);
  });

  // 4. GET /api/v1/admin/users: Doctor appears with correct full name and profile linkage
  it('4. should return doctor with correct full name and doctorProfileId in findUsers', async () => {
    mockDb.user.findMany.mockResolvedValue([
      {
        id: 'user-doc-1',
        phone: '+923001112233',
        email: 'doc1@careid.test',
        status: 'ACTIVE',
        createdAt: new Date('2026-11-01'),
        updatedAt: new Date('2026-11-01'),
        userRoles: [{ role: { name: 'DOCTOR' } }],
        patientProfile: null,
        doctorProfile: {
          id: 'doc-profile-1',
          fullName: 'Dr. John Watson',
          verificationStatus: 'PENDING',
          primarySpecialization: 'General Medicine',
        },
        staffMember: null,
      },
    ]);
    mockDb.user.count.mockResolvedValue(1);

    const res = await adminService.getUsers({ role: 'DOCTOR' });

    expect(res.data).toHaveLength(1);
    expect(res.data[0].id).toBe('user-doc-1');
    expect(res.data[0].fullName).toBe('Dr. John Watson');
    expect(res.data[0].doctorProfileId).toBe('doc-profile-1');
    expect(res.data[0].verificationStatus).toBe('PENDING');
  });

  // 5. GET /api/v1/doctors: Newly created Doctor Profile is returned according to visibility rules
  it('5. should retrieve newly created Doctor Profile in Doctor module getDoctors', async () => {
    const createdDoctor = {
      id: 'doc-profile-uuid',
      userId: 'user-doc-uuid',
      fullName: 'Dr. Alexander Fleming',
      primarySpecialization: 'Cardiology',
      secondarySpecializations: ['Interventional Cardiology'],
      medicalCouncil: 'PMDC',
      registrationNumber: 'PMC-REG-998877',
      licenseNumber: 'LIC-2026-CARDIO-1',
      providerIdentifier: 'DOC-360-123456',
      verificationStatus: 'PENDING',
      yearsOfExperience: 12,
      isDeleted: false,
      qualifications: [],
      certifications: [],
      experiences: [],
      documents: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockDoctorRepo.findDoctors.mockResolvedValue([createdDoctor]);

    const doctors = await doctorService.getDoctors(1, 50);

    expect(mockDoctorRepo.findDoctors).toHaveBeenCalledWith(false, 1, 50);
    expect(doctors).toHaveLength(1);
    expect(doctors[0].id).toBe('doc-profile-uuid');
    expect(doctors[0].fullName).toBe('Dr. Alexander Fleming');
    expect(doctors[0].verificationStatus).toBe('PENDING');
  });

  // 6. Create PATIENT: Existing behavior unchanged, no Doctor Profile created
  it('6. should preserve PATIENT creation behavior without creating Doctor Profile', async () => {
    mockDb.role.findUnique.mockResolvedValue({ id: 'role-pat', name: 'PATIENT' });
    mockDb.user.create.mockResolvedValue({
      id: 'patient-user-1',
      phone: '+923009988776',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockDb.patientProfile.create.mockResolvedValue({
      id: 'pat-profile-1',
      userId: 'patient-user-1',
      patientNumber: 'PAT-123456',
    });

    const result = await adminService.createUser('admin-1', {
      phone: '+923009988776',
      role: 'PATIENT',
      fullName: 'Marcus Patient',
      status: 'ACTIVE',
    });

    expect(mockDb.patientProfile.create).toHaveBeenCalled();
    expect(mockDb.doctorProfile.create).not.toHaveBeenCalled();
    expect(result.patientProfileId).toBe('pat-profile-1');
    expect(result.doctorProfileId).toBeUndefined();
  });

  // 7. Create STAFF: Existing behavior unchanged, no Doctor Profile created
  it('7. should preserve STAFF creation behavior without creating Doctor Profile', async () => {
    mockDb.role.findUnique.mockResolvedValue({ id: 'role-staff', name: 'STAFF' });
    mockDb.user.create.mockResolvedValue({
      id: 'staff-user-1',
      phone: '+923008877665',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await adminService.createUser('admin-1', {
      phone: '+923008877665',
      role: 'STAFF',
      fullName: 'Nurse Jackie',
      status: 'ACTIVE',
    });

    expect(mockDb.doctorProfile.create).not.toHaveBeenCalled();
    expect(mockDb.patientProfile.create).not.toHaveBeenCalled();
    expect(result.id).toBe('staff-user-1');
    expect(result.doctorProfileId).toBeUndefined();
  });

  // 8. Create ADMIN, SUPER_ADMIN and FACILITY_ADMIN: Existing behavior unchanged, no Doctor Profile
  it('8. should preserve administrative roles without creating Doctor Profile', async () => {
    for (const role of ['ADMIN', 'SUPER_ADMIN', 'FACILITY_ADMIN']) {
      jest.clearAllMocks();
      mockDb.role.findUnique.mockResolvedValue({ id: `role-${role}`, name: role });
      mockDb.user.create.mockResolvedValue({
        id: `user-${role}-1`,
        phone: '+923007766554',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await adminService.createUser('admin-1', {
        phone: '+923007766554',
        role,
        fullName: `Admin Role ${role}`,
        status: 'ACTIVE',
      });

      expect(mockDb.doctorProfile.create).not.toHaveBeenCalled();
      expect(result.doctorProfileId).toBeUndefined();
    }
  });

  // 9. Invalid mandatory Doctor Profile data: Proper validation response, no incomplete user remains
  it('9. should throw BadRequestException when any mandatory doctor field is missing', async () => {
    const requiredFields = [
      'fullName',
      'primarySpecialization',
      'medicalCouncil',
      'registrationNumber',
      'licenseNumber',
    ];

    for (const field of requiredFields) {
      const incompleteDto = { ...validDoctorDto, [field]: undefined };
      await expect(
        adminService.createUser('admin-1', incompleteDto as any),
      ).rejects.toThrow(BadRequestException);

      // Verify no database user was created
      expect(mockDb.user.create).not.toHaveBeenCalled();
      expect(mockDb.doctorProfile.create).not.toHaveBeenCalled();
    }
  });

  // 10. Simulated Doctor Profile database failure: Transaction rolls back user creation
  it('10. should roll back user creation when Doctor Profile write fails in transaction', async () => {
    mockDb.user.create.mockResolvedValue({
      id: 'rollback-user-id',
      phone: validDoctorDto.phone,
      status: 'ACTIVE',
    });

    mockDb.doctorProfile.create.mockRejectedValue(new Error('PostgreSQL doctor_profiles unique constraint failed'));

    await expect(
      adminRepository.createUser({
        ...validDoctorDto,
        passwordHash: 'hashed-pw',
      }),
    ).rejects.toThrow('PostgreSQL doctor_profiles unique constraint failed');

    // Inside transaction, error rejects and aborts callback
    expect(mockDb.doctorProfile.create).toHaveBeenCalled();
  });

  // 11. Existing Doctor account: No duplicate Doctor Profile is created
  it('11. should throw ConflictException if user already has a linked Doctor Profile', async () => {
    mockDb.user.create.mockResolvedValue({
      id: 'existing-doc-user',
      phone: validDoctorDto.phone,
      status: 'ACTIVE',
    });

    mockDb.doctorProfile.findUnique.mockResolvedValueOnce(null); // registration check
    mockDb.doctorProfile.findUnique.mockResolvedValueOnce(null); // license check
    mockDb.doctorProfile.findUnique.mockResolvedValueOnce({ id: 'existing-profile-uuid' }); // userId check

    await expect(
      adminRepository.createUser({
        ...validDoctorDto,
        passwordHash: 'hashed-pw',
      }),
    ).rejects.toThrow(ConflictException);

    expect(mockDb.doctorProfile.create).not.toHaveBeenCalled();
  });

  // 12. Duplicate / concurrent creation: Unique constraints prevent duplicate profiles
  it('12. should throw ConflictException when registrationNumber or licenseNumber already exists', async () => {
    // Duplicate registration number check
    mockDb.doctorProfile.findUnique.mockResolvedValueOnce({ id: 'other-doc', registrationNumber: validDoctorDto.registrationNumber });

    await expect(
      adminService.createUser('admin-1', validDoctorDto as any),
    ).rejects.toThrow(ConflictException);

    expect(mockDb.user.create).not.toHaveBeenCalled();

    // Duplicate license number check
    jest.clearAllMocks();
    mockDb.doctorProfile.findUnique.mockResolvedValueOnce(null); // reg check passes
    mockDb.doctorProfile.findUnique.mockResolvedValueOnce({ id: 'other-doc', licenseNumber: validDoctorDto.licenseNumber }); // license check fails

    await expect(
      adminService.createUser('admin-1', validDoctorDto as any),
    ).rejects.toThrow(ConflictException);

    expect(mockDb.user.create).not.toHaveBeenCalled();
  });

  // 13. Verification workflow: New profile retains PENDING status, can be verified via Doctor workflow
  it('13. should retain PENDING status upon creation and permit verification via Doctor workflow', async () => {
    mockDb.user.create.mockResolvedValue({
      id: 'doc-user-1',
      phone: validDoctorDto.phone,
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    mockDb.doctorProfile.create.mockResolvedValue({
      id: 'doc-prof-1',
      userId: 'doc-user-1',
      fullName: validDoctorDto.fullName,
      primarySpecialization: validDoctorDto.primarySpecialization,
      medicalCouncil: validDoctorDto.medicalCouncil,
      registrationNumber: validDoctorDto.registrationNumber,
      licenseNumber: validDoctorDto.licenseNumber,
      providerIdentifier: 'DOC-360-123456',
      verificationStatus: 'PENDING',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const created = await adminService.createUser('admin-1', validDoctorDto as any);
    expect(created.verificationStatus).toBe('PENDING');

    // Test Doctor module verify workflow
    mockDoctorRepo.findDoctorById.mockResolvedValue({
      id: 'doc-prof-1',
      verificationStatus: 'PENDING',
    });
    mockDoctorRepo.updateDoctor.mockResolvedValue({
      id: 'doc-prof-1',
      userId: 'doc-user-1',
      fullName: validDoctorDto.fullName,
      primarySpecialization: validDoctorDto.primarySpecialization,
      secondarySpecializations: [],
      medicalCouncil: validDoctorDto.medicalCouncil,
      registrationNumber: validDoctorDto.registrationNumber,
      licenseNumber: validDoctorDto.licenseNumber,
      providerIdentifier: 'DOC-360-123456',
      verificationStatus: 'VERIFIED',
      verifiedBy: 'ADMIN',
      verifiedAt: new Date(),
      qualifications: [],
      certifications: [],
      experiences: [],
      documents: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const verified = await doctorService.verifyDoctor('doc-prof-1', { reason: 'Credentials verified' }, 'admin-1');
    expect(verified.verificationStatus).toBe('VERIFIED');
    expect(mockDoctorRepo.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        doctorProfileId: 'doc-prof-1',
        action: 'VERIFIED',
      }),
    );
  });

  // 14. Facility assignment: No automatic facility assignment, facility workflow intact
  it('14. should not automatically assign facilities upon doctor creation', async () => {
    mockDb.user.create.mockResolvedValue({
      id: 'doc-user-no-fac',
      phone: validDoctorDto.phone,
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    mockDb.doctorProfile.create.mockResolvedValue({
      id: 'doc-prof-no-fac',
      userId: 'doc-user-no-fac',
      fullName: validDoctorDto.fullName,
      primarySpecialization: validDoctorDto.primarySpecialization,
      medicalCouncil: validDoctorDto.medicalCouncil,
      registrationNumber: validDoctorDto.registrationNumber,
      licenseNumber: validDoctorDto.licenseNumber,
      providerIdentifier: 'DOC-360-123456',
      verificationStatus: 'PENDING',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await adminService.createUser('admin-1', validDoctorDto as any);

    // Verify doctorProfile.create was NOT called with facilities or doctorFacility relation
    expect(mockDb.doctorProfile.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({
          facilities: expect.anything(),
        }),
      }),
    );
  });
});

