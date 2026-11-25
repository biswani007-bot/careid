import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from '../application/use-cases/admin.service';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { Logger } from 'nestjs-pino';

const mockAdminUserId = 'admin-user-uuid-1';

const mockRepo = {
  getDashboardSummary: jest.fn(),
  findUsers: jest.fn(),
  findUserById: jest.fn(),
  findUserByPhone: jest.fn(),
  findUserByEmail: jest.fn(),
  findDoctorByRegistrationNumber: jest.fn(),
  findDoctorByLicenseNumber: jest.fn(),
  findDoctorProfileByUserId: jest.fn(),
  createUser: jest.fn(),
  updateUser: jest.fn(),
  resetUserPassword: jest.fn(),
  updateUserStatus: jest.fn(),
  assignUserRoles: jest.fn(),
  softDeleteUser: jest.fn(),
  restoreUser: jest.fn(),
  findRoles: jest.fn(),
  findRoleById: jest.fn(),
  findRoleByName: jest.fn(),
  createRole: jest.fn(),
  updateRole: jest.fn(),
  deleteRole: jest.fn(),
  findPermissions: jest.fn(),
  findPermissionGroups: jest.fn(),
  createPermissionGroup: jest.fn(),
  createPermission: jest.fn(),
  assignPermissionsToRole: jest.fn(),
  getPermissionMatrix: jest.fn(),
  createOrganization: jest.fn(),
  findOrganizations: jest.fn(),
  findOrganizationById: jest.fn(),
  updateOrganization: jest.fn(),
  softDeleteOrganization: jest.fn(),
  getSettings: jest.fn(),
  upsertSetting: jest.fn(),
  findAuditLogs: jest.fn(),
  findAuditLogById: jest.fn(),
  findFilteredAuditLogs: jest.fn(),
  createAuditLog: jest.fn(),
};

const mockLogger = { log: jest.fn(), error: jest.fn(), warn: jest.fn() };

describe('AdminService (Phase 17)', () => {
  let service: AdminService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: 'IAdminRepository', useValue: mockRepo },
        { provide: Logger, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  describe('getDashboardSummary', () => {
    it('should return aggregated platform metrics', async () => {
      mockRepo.getDashboardSummary.mockResolvedValue({
        totalPatients: 150,
        totalDoctors: 25,
        totalFacilities: 10,
        totalStaff: 40,
        totalHealthCards: 120,
        totalInsurancePolicies: 80,
        totalImmunisationRecords: 200,
        totalActiveSchedules: 15,
        recentActivities: [],
        growthMetrics: { newPatientsThisMonth: 12, newDoctorsThisMonth: 3, newFacilitiesThisMonth: 1 },
      });

      const summary = await service.getDashboardSummary();
      expect(summary.totalPatients).toBe(150);
      expect(summary.totalFacilities).toBe(10);
      expect(summary.growthMetrics.newPatientsThisMonth).toBe(12);
    });
  });

  describe('user administration', () => {
    it('should lock user status to BLOCKED and record audit log', async () => {
      mockRepo.findUserById.mockResolvedValue({ id: 'user-1', status: 'ACTIVE', roles: ['PATIENT'], createdAt: new Date(), updatedAt: new Date() });
      mockRepo.updateUserStatus.mockResolvedValue({ id: 'user-1', status: 'BLOCKED', roles: ['PATIENT'], createdAt: new Date(), updatedAt: new Date() });
      mockRepo.createAuditLog.mockResolvedValue({});

      const updated = await service.updateUserStatus('user-1', { status: 'BLOCKED' }, mockAdminUserId);
      expect(updated.status).toBe('BLOCKED');
      expect(mockRepo.createAuditLog).toHaveBeenCalled();
    });

    it('should throw NotFoundException for invalid user ID', async () => {
      mockRepo.findUserById.mockResolvedValue(null);
      await expect(service.getUserById('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should create new user with arbitrary role and log audit action', async () => {
      mockRepo.findUserByPhone.mockResolvedValue(null);
      mockRepo.findUserByEmail.mockResolvedValue(null);
      mockRepo.createUser.mockResolvedValue({
        id: 'new-user-1',
        phone: '+923001234567',
        status: 'ACTIVE',
        roles: ['DOCTOR'],
        doctorProfileId: 'doc-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockRepo.createAuditLog.mockResolvedValue({});

      const created = await service.createUser(mockAdminUserId, {
        phone: '+923001234567',
        role: 'DOCTOR',
        fullName: 'Dr. Test Senior',
        status: 'ACTIVE',
        primarySpecialization: 'General Medicine',
        medicalCouncil: 'PMDC',
        registrationNumber: 'PMC-REG-998877',
        licenseNumber: 'LIC-2026-MED-1',
      });

      expect(created.id).toBe('new-user-1');
      expect(created.roles).toContain('DOCTOR');
      expect(mockRepo.createUser).toHaveBeenCalled();
      expect(mockRepo.createAuditLog).toHaveBeenCalled();
    });

    it('should throw BadRequestException when creating DOCTOR without mandatory clinical fields', async () => {
      mockRepo.findUserByPhone.mockResolvedValue(null);
      mockRepo.findUserByEmail.mockResolvedValue(null);

      await expect(
        service.createUser(mockAdminUserId, {
          phone: '+923001234568',
          role: 'DOCTOR',
          fullName: 'Dr. Incomplete Profile',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException when creating DOCTOR with existing registration number', async () => {
      mockRepo.findUserByPhone.mockResolvedValue(null);
      mockRepo.findUserByEmail.mockResolvedValue(null);
      mockRepo.findDoctorByRegistrationNumber = jest.fn().mockResolvedValue({ id: 'existing-doc-id' });

      await expect(
        service.createUser(mockAdminUserId, {
          phone: '+923001234569',
          role: 'DOCTOR',
          fullName: 'Dr. Duplicate Reg',
          primarySpecialization: 'Cardiology',
          medicalCouncil: 'PMDC',
          registrationNumber: 'PMC-REG-998877',
          licenseNumber: 'LIC-2026-CARDIO-1',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create non-doctor user (e.g. STAFF) without doctor fields', async () => {
      mockRepo.findUserByPhone.mockResolvedValue(null);
      mockRepo.findUserByEmail.mockResolvedValue(null);
      mockRepo.createUser.mockResolvedValue({
        id: 'new-staff-1',
        phone: '+923009876543',
        status: 'ACTIVE',
        roles: ['STAFF'],
        staffMemberId: 'staff-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockRepo.createAuditLog.mockResolvedValue({});

      const staff = await service.createUser(mockAdminUserId, {
        phone: '+923009876543',
        role: 'STAFF',
        fullName: 'Nurse Jane Doe',
        status: 'ACTIVE',
      });

      expect(staff.id).toBe('new-staff-1');
      expect(staff.roles).toContain('STAFF');
      expect(staff.doctorProfileId).toBeUndefined();
    });

    it('should reset user password and revoke sessions for admin account', async () => {
      mockRepo.findUserById.mockResolvedValue({ id: 'user-reset-1', status: 'ACTIVE', roles: ['ADMIN'] });
      mockRepo.resetUserPassword.mockResolvedValue(undefined);
      mockRepo.createAuditLog.mockResolvedValue({});

      const res = await service.resetUserPassword('user-reset-1', mockAdminUserId, {
        newPassword: 'NewSecurePassword123!',
      });

      expect(res.userId).toBe('user-reset-1');
      expect(mockRepo.resetUserPassword).toHaveBeenCalled();
      expect(mockRepo.createAuditLog).toHaveBeenCalled();
    });

    it('should reject password reset for OTP-only patient accounts', async () => {
      mockRepo.findUserById.mockResolvedValue({ id: 'user-patient-1', status: 'ACTIVE', roles: ['PATIENT'] });
      await expect(
        service.resetUserPassword('user-patient-1', mockAdminUserId, {
          newPassword: 'NewSecurePassword123!',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('role management', () => {
    it('should fetch role details by ID', async () => {
      mockRepo.findRoleById.mockResolvedValue({
        id: 'role-1',
        name: 'ADMIN',
        description: 'Administrator role',
        rolePermissions: [],
      });

      const res = await service.getRoleById('role-1');
      expect(res.id).toBe('role-1');
      expect(res.name).toBe('ADMIN');
    });

    it('should reject deleting a core system role', async () => {
      mockRepo.findRoleById.mockResolvedValue({
        id: 'role-sys-1',
        name: 'SUPER_ADMIN',
      });

      await expect(service.deleteRole('role-sys-1', mockAdminUserId)).rejects.toThrow();
    });
  });

  describe('audit logs', () => {
    it('should export audit logs in CSV format', async () => {
      mockRepo.findFilteredAuditLogs.mockResolvedValue({
        items: [
          {
            id: 'log-1',
            userId: 'user-1',
            action: 'LOGIN',
            ipAddress: '127.0.0.1',
            createdAt: new Date('2026-01-01T00:00:00Z'),
            details: 'Successful login',
          },
        ],
        total: 1,
      });

      const res = await service.exportAuditLogs({ format: 'csv' });
      expect(res.format).toBe('csv');
      expect(res.data).toContain('LOGIN');
      expect(res.data).toContain('127.0.0.1');
    });
  });

  describe('organization management', () => {
    it('should create an organization profile', async () => {
      const mockOrg = {
        id: 'org-1',
        name: 'Health Vault Network',
        code: 'ORG-360-100',
        country: 'Pakistan',
        timezone: 'Asia/Karachi',
        language: 'en',
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRepo.createOrganization.mockResolvedValue(mockOrg);
      mockRepo.createAuditLog.mockResolvedValue({});

      const res = await service.createOrganization({ name: 'Health Vault Network' }, mockAdminUserId);
      expect(res.id).toBe('org-1');
      expect(res.code).toBe('ORG-360-100');
    });
  });

  describe('platform configuration', () => {
    it('should upsert platform settings and log action', async () => {
      const mockSetting = {
        id: 'setting-1',
        category: 'SECURITY',
        key: 'JWT_EXPIRATION',
        value: '86400',
        valueType: 'NUMBER',
        isPublic: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRepo.upsertSetting.mockResolvedValue(mockSetting);
      mockRepo.createAuditLog.mockResolvedValue({});

      const res = await service.upsertSetting({ key: 'JWT_EXPIRATION', value: '86400', category: 'SECURITY' }, mockAdminUserId);
      expect(res.key).toBe('JWT_EXPIRATION');
      expect(res.value).toBe('86400');
    });
  });
});
