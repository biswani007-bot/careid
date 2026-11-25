import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AdminRepository } from '../infrastructure/database/admin.repository';
import { AdminService } from '../application/use-cases/admin.service';
import { AdminController } from '../presentation/controllers/admin.controller';
import { DoctorService } from '@modules/doctor/application/use-cases/doctor.service';
import { AdminRegisterDoctorDto } from '../presentation/dto/admin-doctor-registration.dto';

describe('Admin Doctor Registration for Existing Users (18 Scenarios)', () => {
  let adminRepository: AdminRepository;
  let adminService: AdminService;
  let adminController: AdminController;
  let mockDb: any;
  let mockDoctorRepo: any;
  let doctorService: DoctorService;

  const adminUserId = 'admin-user-uuid-999';
  const existingDoctorUserId = 'user-doctor-uuid-111';

  const validExistingUser = {
    id: existingDoctorUserId,
    phone: '+923001234567',
    email: 'dr.sarah@careid.test',
    status: 'ACTIVE',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    userRoles: [{ role: { id: 'role-doctor', name: 'DOCTOR' } }],
    doctorProfile: null,
  };

  const validDoctorRegistrationDto: AdminRegisterDoctorDto = {
    userId: existingDoctorUserId,
    fullName: 'Dr. Sarah Jenkins, MD',
    primarySpecialization: 'Cardiology',
    medicalCouncil: 'Pakistan Medical & Dental Council (PMDC)',
    registrationNumber: 'PMC-REG-998877',
    licenseNumber: 'LIC-2026-CARDIO-1',
    secondarySpecializations: ['Interventional Cardiology'],
    yearsOfExperience: 12,
    department: 'Cardiology',
    gender: 'FEMALE',
    dateOfBirth: '1985-06-20',
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
        findFirst: jest.fn().mockResolvedValue(null),
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
      doctorFacility: {
        create: jest.fn(),
        findUnique: jest.fn(),
      },
      facility: {
        findUnique: jest.fn(),
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
    adminController = new AdminController(adminService);

    mockDoctorRepo = {
      findDoctors: jest.fn(),
      findPendingDoctors: jest.fn(),
      findDoctorById: jest.fn(),
      findProfileByUserId: jest.fn(),
      findDoctorByRegistrationNumber: jest.fn(),
      findDoctorByLicenseNumber: jest.fn(),
      createDoctor: jest.fn(),
      updateDoctor: jest.fn(),
      createHistory: jest.fn(),
      createAuditLog: jest.fn(),
    };

    const mockQrService: any = {
      generateQr: jest.fn().mockResolvedValue({ token: 'mock-qr-token' }),
    };

    doctorService = new DoctorService(mockDoctorRepo, mockQrService, mockPinoLogger);
  });

  // Scenario 1: Admin creates a Doctor Profile for an existing User with DOCTOR role
  it('Scenario 1: should allow Admin to create a Doctor Profile for an existing User with DOCTOR role', async () => {
    mockDb.user.findUnique.mockResolvedValue({ ...validExistingUser });
    const mockCreatedDoc = {
      id: 'doc-uuid-001',
      userId: existingDoctorUserId,
      fullName: validDoctorRegistrationDto.fullName,
      primarySpecialization: validDoctorRegistrationDto.primarySpecialization,
      secondarySpecializations: validDoctorRegistrationDto.secondarySpecializations,
      medicalCouncil: validDoctorRegistrationDto.medicalCouncil,
      registrationNumber: validDoctorRegistrationDto.registrationNumber,
      licenseNumber: validDoctorRegistrationDto.licenseNumber,
      providerIdentifier: 'DOC-360-123456',
      verificationStatus: 'PENDING',
      yearsOfExperience: 12,
      department: 'Cardiology',
      gender: 'FEMALE',
      dateOfBirth: new Date('1985-06-20'),
      createdAt: new Date('2026-11-03T18:00:00.000Z'),
      updatedAt: new Date('2026-11-03T18:00:00.000Z'),
    };
    mockDb.doctorProfile.create.mockResolvedValue(mockCreatedDoc);

    const result = await adminController.registerDoctor(
      { user: { userId: adminUserId } },
      validDoctorRegistrationDto,
    );

    expect(result).toBeDefined();
    expect(result.id).toBe('doc-uuid-001');
    expect(result.fullName).toBe('Dr. Sarah Jenkins, MD');
    expect(mockDb.doctorProfile.create).toHaveBeenCalledTimes(1);
    expect(mockDb.doctorAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          doctorProfileId: 'doc-uuid-001',
          action: 'REGISTERED',
          performedBy: adminUserId,
        }),
      }),
    );
  });

  // Scenario 2: Returned doctorProfileId matches the actual database record
  it('Scenario 2: returned doctorProfileId must match the actual database record ID', async () => {
    mockDb.user.findUnique.mockResolvedValue({ ...validExistingUser });
    const expectedDocId = 'doc-exact-uuid-777';
    mockDb.doctorProfile.create.mockResolvedValue({
      id: expectedDocId,
      userId: existingDoctorUserId,
      fullName: validDoctorRegistrationDto.fullName,
      primarySpecialization: validDoctorRegistrationDto.primarySpecialization,
      secondarySpecializations: [],
      medicalCouncil: validDoctorRegistrationDto.medicalCouncil,
      registrationNumber: validDoctorRegistrationDto.registrationNumber,
      licenseNumber: validDoctorRegistrationDto.licenseNumber,
      providerIdentifier: 'DOC-360-654321',
      verificationStatus: 'PENDING',
      yearsOfExperience: 0,
      createdAt: new Date('2026-11-03T18:00:00.000Z'),
      updatedAt: new Date('2026-11-03T18:00:00.000Z'),
    });

    const result = await adminService.registerDoctor(adminUserId, validDoctorRegistrationDto);

    expect(result.doctorProfileId).toBe(expectedDocId);
    expect(result.id).toBe(expectedDocId);
  });

  // Scenario 3: DoctorProfile.userId matches the selected existing User ID
  it('Scenario 3: DoctorProfile.userId must match the selected existing User ID', async () => {
    mockDb.user.findUnique.mockResolvedValue({ ...validExistingUser });
    mockDb.doctorProfile.create.mockImplementation((args: any) => ({
      id: 'doc-id-123',
      ...args.data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const result = await adminService.registerDoctor(adminUserId, validDoctorRegistrationDto);

    expect(result.userId).toBe(existingDoctorUserId);
    expect(mockDb.doctorProfile.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: existingDoctorUserId,
        }),
      }),
    );
  });

  // Scenario 4: No new User account is created
  it('Scenario 4: must NEVER create another User account during registration', async () => {
    mockDb.user.findUnique.mockResolvedValue({ ...validExistingUser });
    mockDb.doctorProfile.create.mockResolvedValue({
      id: 'doc-uuid-444',
      userId: existingDoctorUserId,
      fullName: validDoctorRegistrationDto.fullName,
      primarySpecialization: validDoctorRegistrationDto.primarySpecialization,
      medicalCouncil: validDoctorRegistrationDto.medicalCouncil,
      registrationNumber: validDoctorRegistrationDto.registrationNumber,
      licenseNumber: validDoctorRegistrationDto.licenseNumber,
      providerIdentifier: 'DOC-360-444444',
      verificationStatus: 'PENDING',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await adminService.registerDoctor(adminUserId, validDoctorRegistrationDto);

    expect(mockDb.user.create).not.toHaveBeenCalled();
  });

  // Scenario 5: Non-existent User ID returns 404
  it('Scenario 5: non-existent User ID must return NotFoundException (404)', async () => {
    mockDb.user.findUnique.mockResolvedValue(null);

    await expect(
      adminService.registerDoctor(adminUserId, {
        ...validDoctorRegistrationDto,
        userId: 'non-existent-user-uuid',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  // Scenario 6: User without DOCTOR role returns an appropriate validation error (400)
  it('Scenario 6: user without DOCTOR role must return BadRequestException (400)', async () => {
    mockDb.user.findUnique.mockResolvedValue({
      ...validExistingUser,
      userRoles: [{ role: { id: 'role-patient', name: 'PATIENT' } }],
    });

    await expect(
      adminService.registerDoctor(adminUserId, validDoctorRegistrationDto),
    ).rejects.toThrow(new BadRequestException('User does not have the DOCTOR role'));
  });

  // Scenario 7: Existing Doctor Profile returns 409 without creating duplicates
  it('Scenario 7: existing Doctor Profile for this user must return ConflictException (409)', async () => {
    mockDb.user.findUnique.mockResolvedValue({
      ...validExistingUser,
      doctorProfile: { id: 'existing-doc-profile-id' },
    });

    await expect(
      adminService.registerDoctor(adminUserId, validDoctorRegistrationDto),
    ).rejects.toThrow(new ConflictException('Doctor profile already exists for this user account'));

    expect(mockDb.doctorProfile.create).not.toHaveBeenCalled();
  });

  it('Scenario 7b: Prisma P2002 unique constraint on user_id must throw ConflictException (409)', async () => {
    mockDb.user.findUnique.mockResolvedValue({ ...validExistingUser });
    const p2002Error = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '7.0.0',
      meta: { target: ['user_id'] },
    });
    mockDb.doctorProfile.create.mockRejectedValue(p2002Error);

    await expect(
      adminService.registerDoctor(adminUserId, validDoctorRegistrationDto),
    ).rejects.toThrow(new ConflictException('Doctor profile already exists for this user account'));
  });

  // Scenario 8: Duplicate registration number returns 409
  it('Scenario 8: duplicate registration number must return ConflictException (409)', async () => {
    mockDb.doctorProfile.findUnique.mockImplementation(({ where }: any) => {
      if (where.registrationNumber === validDoctorRegistrationDto.registrationNumber) {
        return Promise.resolve({ id: 'existing-doc-with-reg' });
      }
      return Promise.resolve(null);
    });

    await expect(
      adminService.registerDoctor(adminUserId, validDoctorRegistrationDto),
    ).rejects.toThrow(
      new ConflictException('Medical registration number already registered in Master Provider Registry'),
    );

    expect(mockDb.doctorProfile.create).not.toHaveBeenCalled();
  });

  it('Scenario 8b: Prisma P2002 on registration_number must throw ConflictException (409)', async () => {
    mockDb.user.findUnique.mockResolvedValue({ ...validExistingUser });
    const p2002Error = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '7.0.0',
      meta: { target: ['registration_number'] },
    });
    mockDb.doctorProfile.create.mockRejectedValue(p2002Error);

    await expect(
      adminService.registerDoctor(adminUserId, validDoctorRegistrationDto),
    ).rejects.toThrow(
      new ConflictException('Medical registration number already registered in Master Provider Registry'),
    );
  });

  // Scenario 9: Duplicate license number returns 409
  it('Scenario 9: duplicate license number must return ConflictException (409)', async () => {
    mockDb.doctorProfile.findUnique.mockImplementation(({ where }: any) => {
      if (where.licenseNumber === validDoctorRegistrationDto.licenseNumber) {
        return Promise.resolve({ id: 'existing-doc-with-lic' });
      }
      return Promise.resolve(null);
    });

    await expect(
      adminService.registerDoctor(adminUserId, validDoctorRegistrationDto),
    ).rejects.toThrow(new ConflictException('Medical license number already registered'));

    expect(mockDb.doctorProfile.create).not.toHaveBeenCalled();
  });

  it('Scenario 9b: Prisma P2002 on license_number must throw ConflictException (409)', async () => {
    mockDb.user.findUnique.mockResolvedValue({ ...validExistingUser });
    const p2002Error = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '7.0.0',
      meta: { target: ['license_number'] },
    });
    mockDb.doctorProfile.create.mockRejectedValue(p2002Error);

    await expect(
      adminService.registerDoctor(adminUserId, validDoctorRegistrationDto),
    ).rejects.toThrow(new ConflictException('Medical license number already registered'));
  });

  // Scenario 10: Missing mandatory fields return 400
  it('Scenario 10: missing mandatory fields must return BadRequestException (400)', async () => {
    // Missing userId
    await expect(
      adminService.registerDoctor(adminUserId, { ...validDoctorRegistrationDto, userId: '' }),
    ).rejects.toThrow(BadRequestException);

    // Missing fullName
    await expect(
      adminService.registerDoctor(adminUserId, { ...validDoctorRegistrationDto, fullName: ' ' }),
    ).rejects.toThrow(BadRequestException);

    // Missing primarySpecialization
    await expect(
      adminService.registerDoctor(adminUserId, { ...validDoctorRegistrationDto, primarySpecialization: '' }),
    ).rejects.toThrow(BadRequestException);

    // Missing medicalCouncil
    await expect(
      adminService.registerDoctor(adminUserId, { ...validDoctorRegistrationDto, medicalCouncil: '' }),
    ).rejects.toThrow(BadRequestException);

    // Missing registrationNumber
    await expect(
      adminService.registerDoctor(adminUserId, { ...validDoctorRegistrationDto, registrationNumber: '' }),
    ).rejects.toThrow(BadRequestException);

    // Missing licenseNumber
    await expect(
      adminService.registerDoctor(adminUserId, { ...validDoctorRegistrationDto, licenseNumber: '' }),
    ).rejects.toThrow(BadRequestException);
  });

  // Scenario 11: Database failure rolls back profile and audit writes
  it('Scenario 11: database failure during audit write must roll back profile in transaction', async () => {
    mockDb.user.findUnique.mockResolvedValue({ ...validExistingUser });
    mockDb.doctorProfile.create.mockResolvedValue({
      id: 'doc-uuid-rollback',
      userId: existingDoctorUserId,
      fullName: validDoctorRegistrationDto.fullName,
      primarySpecialization: validDoctorRegistrationDto.primarySpecialization,
      medicalCouncil: validDoctorRegistrationDto.medicalCouncil,
      registrationNumber: validDoctorRegistrationDto.registrationNumber,
      licenseNumber: validDoctorRegistrationDto.licenseNumber,
      providerIdentifier: 'DOC-360-999999',
      verificationStatus: 'PENDING',
    });
    mockDb.doctorAuditLog.create.mockRejectedValue(new Error('Audit log storage connection lost'));

    await expect(
      adminService.registerDoctor(adminUserId, validDoctorRegistrationDto),
    ).rejects.toThrow('Audit log storage connection lost');

    expect(mockDb.$transaction).toHaveBeenCalledTimes(1);
  });

  // Scenario 12: Non-admin caller is rejected
  it('Scenario 12: non-admin caller must be rejected by AdminController Roles metadata', () => {
    const roles = Reflect.getMetadata('roles', AdminController);
    expect(roles).toBeDefined();
    expect(roles).toEqual(['ADMIN', 'SUPER_ADMIN']);
    expect(roles).not.toContain('DOCTOR');
    expect(roles).not.toContain('PATIENT');
  });

  // Scenario 13: New profile retains PENDING verification status
  it('Scenario 13: newly created profile must retain PENDING verification status and never auto-verify', async () => {
    mockDb.user.findUnique.mockResolvedValue({ ...validExistingUser });
    mockDb.doctorProfile.create.mockImplementation((args: any) => ({
      id: 'doc-uuid-pending',
      ...args.data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const result = await adminService.registerDoctor(adminUserId, validDoctorRegistrationDto);

    expect(result.verificationStatus).toBe('PENDING');
    expect(mockDb.doctorProfile.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          verificationStatus: 'PENDING',
        }),
      }),
    );
  });

  // Scenario 14: Existing self-registration still works (POST /api/v1/doctors)
  it('Scenario 14: existing self-registration via DoctorService.registerDoctor must remain fully functional', async () => {
    mockDoctorRepo.findProfileByUserId.mockResolvedValue(null);
    mockDoctorRepo.findDoctorByRegistrationNumber.mockResolvedValue(null);
    mockDoctorRepo.findDoctorByLicenseNumber.mockResolvedValue(null);
    mockDoctorRepo.createDoctor.mockResolvedValue({
      id: 'self-registered-doc-id',
      userId: 'self-user-id',
      fullName: 'Dr. Self Register',
      primarySpecialization: 'Neurology',
      medicalCouncil: 'PMDC',
      registrationNumber: 'PMC-SELF-112233',
      licenseNumber: 'LIC-SELF-445566',
      providerIdentifier: 'DOC-360-778899',
      verificationStatus: 'PENDING',
      yearsOfExperience: 5,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const selfDto = {
      fullName: 'Dr. Self Register',
      primarySpecialization: 'Neurology',
      medicalCouncil: 'PMDC',
      registrationNumber: 'PMC-SELF-112233',
      licenseNumber: 'LIC-SELF-445566',
      yearsOfExperience: 5,
    };

    const selfResult = await doctorService.registerDoctor('self-user-id', selfDto as any);

    expect(selfResult).toBeDefined();
    expect(selfResult.id).toBe('self-registered-doc-id');
    expect(selfResult.userId).toBe('self-user-id');
    expect(mockDoctorRepo.createDoctor).toHaveBeenCalledTimes(1);
    expect(mockDoctorRepo.createAuditLog).toHaveBeenCalledTimes(1);
  });

  // Scenario 15: Existing /admin/users automatic Doctor Profile creation still works
  it('Scenario 15: existing POST /api/v1/admin/users automatic Doctor Profile creation must remain functional', async () => {
    mockDb.user.create.mockResolvedValue({
      id: 'new-user-doc-id',
      phone: '+923009998877',
      email: 'newdoc@careid.test',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockDb.doctorProfile.create.mockResolvedValue({
      id: 'auto-doc-profile-id',
      userId: 'new-user-doc-id',
      fullName: 'Dr. Auto Generated',
      primarySpecialization: 'Pediatrics',
      medicalCouncil: 'PMDC',
      registrationNumber: 'PMC-AUTO-1234',
      licenseNumber: 'LIC-AUTO-5678',
      providerIdentifier: 'DOC-360-990011',
      verificationStatus: 'PENDING',
    });

    const createAdminUserDto = {
      phone: '+923009998877',
      email: 'newdoc@careid.test',
      role: 'DOCTOR',
      fullName: 'Dr. Auto Generated',
      status: 'ACTIVE',
      primarySpecialization: 'Pediatrics',
      medicalCouncil: 'PMDC',
      registrationNumber: 'PMC-AUTO-1234',
      licenseNumber: 'LIC-AUTO-5678',
    };

    const createdUser = await adminService.createUser(adminUserId, createAdminUserDto as any);

    expect(createdUser).toBeDefined();
    expect(createdUser.id).toBe('new-user-doc-id');
    expect(createdUser.doctorProfileId).toBe('auto-doc-profile-id');
    expect(createdUser.roles).toContain('DOCTOR');
    expect(mockDb.user.create).toHaveBeenCalledTimes(1);
    expect(mockDb.doctorProfile.create).toHaveBeenCalledTimes(1);
  });

  // Scenario 16: Existing verification and facility assignment workflows remain intact
  it('Scenario 16: existing doctor verification and facility assignment workflows remain intact', async () => {
    mockDoctorRepo.findDoctorById.mockResolvedValue({
      id: 'doc-verify-id',
      userId: existingDoctorUserId,
      fullName: 'Dr. Sarah Jenkins',
      verificationStatus: 'PENDING',
      isDeleted: false,
    });
    mockDoctorRepo.updateDoctor.mockResolvedValue({
      id: 'doc-verify-id',
      userId: existingDoctorUserId,
      fullName: 'Dr. Sarah Jenkins',
      verificationStatus: 'VERIFIED',
      verifiedBy: adminUserId,
      verifiedAt: new Date(),
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const verifiedResult = await doctorService.verifyDoctor('doc-verify-id', {
      action: 'APPROVE',
      notes: 'Credentials verified against PMDC database',
    } as any, adminUserId);

    expect(verifiedResult).toBeDefined();
    expect(verifiedResult.verificationStatus).toBe('VERIFIED');
    expect(mockDoctorRepo.updateDoctor).toHaveBeenCalledWith(
      'doc-verify-id',
      expect.objectContaining({ verificationStatus: 'VERIFIED' }),
    );
  });

  // Scenario 17: GET /api/v1/admin/users returns correct Doctor Profile linkage
  it('Scenario 17: GET /api/v1/admin/users and findUserById return correct Doctor Profile linkage', async () => {
    mockDb.user.findUnique.mockResolvedValue({
      id: existingDoctorUserId,
      phone: '+923001234567',
      email: 'dr.sarah@careid.test',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
      userRoles: [{ role: { name: 'DOCTOR' } }],
      doctorProfile: {
        id: 'doc-uuid-linked',
        userId: existingDoctorUserId,
        fullName: 'Dr. Sarah Jenkins',
        verificationStatus: 'PENDING',
        primarySpecialization: 'Cardiology',
        registrationNumber: 'PMC-REG-998877',
        licenseNumber: 'LIC-2026-CARDIO-1',
      },
    });

    const userDetails = await adminRepository.findUserById(existingDoctorUserId);

    expect(userDetails).toBeDefined();
    expect(userDetails!.id).toBe(existingDoctorUserId);
    expect(userDetails!.doctorProfileId).toBe('doc-uuid-linked');
    expect(userDetails!.fullName).toBe('Dr. Sarah Jenkins');
    expect(userDetails!.verificationStatus).toBe('PENDING');
    expect(userDetails!.roles).toContain('DOCTOR');
  });

  // Scenario 18: GET /api/v1/doctors returns the newly created profile according to existing visibility rules
  it('Scenario 18: GET /api/v1/doctors returns newly created profile (isDeleted: false)', async () => {
    const mockDoctorsInDb = [
      {
        id: 'doc-uuid-001',
        userId: existingDoctorUserId,
        fullName: 'Dr. Sarah Jenkins',
        primarySpecialization: 'Cardiology',
        secondarySpecializations: [],
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
      },
    ];

    mockDoctorRepo.findDoctors.mockResolvedValue(mockDoctorsInDb);

    const doctorsList = await doctorService.getDoctors(1, 50);

    expect(doctorsList).toHaveLength(1);
    expect(doctorsList[0].id).toBe('doc-uuid-001');
    expect(doctorsList[0].userId).toBe(existingDoctorUserId);
    expect(doctorsList[0].fullName).toBe('Dr. Sarah Jenkins');
    expect(doctorsList[0].verificationStatus).toBe('PENDING');
    expect(mockDoctorRepo.findDoctors).toHaveBeenCalledWith(false, 1, 50);
  });
});

