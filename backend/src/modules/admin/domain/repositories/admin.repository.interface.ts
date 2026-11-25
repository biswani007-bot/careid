import {
  AdminDashboardSummaryEntity, PermissionGroupEntity, PermissionEntity,
  RolePermissionEntity, OrganizationEntity, PlatformSettingEntity, ManagedUserEntity,
} from '../entities/admin.entity';

export interface IAdminRepository {
  // Dashboard Summary
  getDashboardSummary(): Promise<AdminDashboardSummaryEntity>;

  // User Administration
  findUsers(queryOrOptions?: any, status?: string, page?: number, limit?: number): Promise<any>;
  findUserById(id: string): Promise<ManagedUserEntity | null>;
  findUserByPhone?(phone: string): Promise<any | null>;
  findUserByEmail?(email: string): Promise<any | null>;
  findDoctorByRegistrationNumber?(registrationNumber: string): Promise<any | null>;
  findDoctorByLicenseNumber?(licenseNumber: string): Promise<any | null>;
  findDoctorProfileByUserId?(userId: string): Promise<any | null>;
  registerDoctorForExistingUser(adminUserId: string, data: any): Promise<any>;
  createUser?(data: any): Promise<ManagedUserEntity>;
  updateUser?(id: string, data: any): Promise<ManagedUserEntity>;
  resetUserPassword?(id: string, passwordHash: string): Promise<void>;
  updateUserStatus(id: string, status: string): Promise<ManagedUserEntity>;
  assignUserRoles(userId: string, roleNames: string[]): Promise<ManagedUserEntity>;
  softDeleteUser(id: string): Promise<void>;
  restoreUser(id: string): Promise<ManagedUserEntity>;

  // Doctor Administration
  findDoctors?(options: {
    page?: number;
    limit?: number;
    specialty?: string;
    search?: string;
  }): Promise<{ items: any[]; total: number }>;

  // Patient Administration (Workstream B)
  createPatient?(data: any): Promise<any>;
  updatePatient?(patientId: string, data: any): Promise<any>;
  findPatients(options: {
    page?: number;
    limit?: number;
    q?: string;
    status?: string;
    gender?: string;
    bloodGroup?: string;
  }): Promise<{ items: any[]; total: number }>;
  findPatientById(patientId: string): Promise<any | null>;

  // Medical Records Administration (Workstream C)
  createMedicalRecord?(data: any): Promise<any>;
  findMedicalRecords(options: {
    page?: number;
    limit?: number;
    q?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
    patientProfileId?: string;
  }): Promise<{ items: any[]; total: number }>;
  findMedicalRecordById(recordId: string): Promise<any | null>;
  findMedicalRecordsByPatient(
    patientProfileId: string,
    options: {
      page?: number;
      limit?: number;
      status?: string;
      startDate?: Date;
      endDate?: Date;
      includeArchived?: boolean;
    },
  ): Promise<{ items: any[]; total: number }>;
  getPatientTimeline(
    patientProfileId: string,
    options: {
      page?: number;
      limit?: number;
    },
  ): Promise<{ items: any[]; total: number }>;

  // RBAC & Permission Management
  findRoles(): Promise<any[]>;
  findRoleById?(id: string): Promise<any | null>;
  findRoleByName?(name: string): Promise<any | null>;
  createRole?(name: string, description?: string, permissionCodes?: string[]): Promise<any>;
  updateRole?(id: string, data: { description?: string; permissionCodes?: string[] }): Promise<any>;
  deleteRole?(id: string): Promise<void>;
  findPermissions(): Promise<PermissionEntity[]>;
  findPermissionGroups(): Promise<PermissionGroupEntity[]>;
  createPermissionGroup(name: string, description?: string): Promise<PermissionGroupEntity>;
  createPermission(code: string, name: string, description?: string, groupId?: string): Promise<PermissionEntity>;
  assignPermissionsToRole(roleId: string, permissionIds: string[]): Promise<any>;
  getPermissionMatrix(): Promise<any>;

  // Organization Management
  createOrganization(data: any): Promise<OrganizationEntity>;
  findOrganizations(): Promise<OrganizationEntity[]>;
  findOrganizationById(id: string): Promise<OrganizationEntity | null>;
  updateOrganization(id: string, data: any): Promise<OrganizationEntity>;
  softDeleteOrganization(id: string): Promise<void>;

  // Platform Configuration
  getSettings(category?: string): Promise<PlatformSettingEntity[]>;
  upsertSetting(key: string, value: string, category: string, valueType?: string, description?: string, updatedBy?: string): Promise<PlatformSettingEntity>;
  resetSecuritySettings?(adminUserId?: string): Promise<PlatformSettingEntity[]>;

  // Audit
  findAuditLogs(limit?: number): Promise<any[]>;
  findAuditLogById?(id: string): Promise<any | null>;
  findFilteredAuditLogs?(filters: {
    userId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }): Promise<{ items: any[]; total: number }>;
  createAuditLog(userId: string, action: string, details?: string, ipAddress?: string): Promise<any>;

  // Specialties Catalogue
  getSpecialties?(activeOnly?: boolean, search?: string, practiceType?: string): Promise<any[]>;
  addSpecialty?(name: string, description?: string): Promise<any>;
  updateSpecialty?(id: string, data: any): Promise<any>;
  deleteSpecialty?(id: string): Promise<any>;
  uploadDoctorPhoto?(doctorId: string, adminUserId: string, file: any): Promise<any>;
}
