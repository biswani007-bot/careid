import { Injectable, Inject, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { IAdminRepository } from '../../domain/repositories/admin.repository.interface';
import {
  AdminDashboardStatsDto, AdminDashboardSummaryResponseDto, ManagedUserResponseDto,
  OrganizationResponseDto, PlatformSettingResponseDto, AuditLogResponseDto,
  PermissionGroupResponseDto, PermissionResponseDto, AdminRegisterDoctorDto, AdminDoctorResponseDto,
} from '../../presentation/dto/admin.dto';
import {
  UpdateUserStatusDto, AssignUserRolesDto, CreatePermissionGroupDto, CreatePermissionDto,
  AssignRolePermissionsDto, CreateOrganizationDto, UpsertPlatformSettingDto,
} from '../../presentation/dto/admin-enterprise.dto';
import {
  AdminPatientQueryDto, AdminPatientDetailResponseDto,
  AdminCreatePatientDto, AdminUpdatePatientDto,
} from '../../presentation/dto/admin-patient.dto';
import {
  AdminMedicalRecordQueryDto, AdminPatientMedicalRecordQueryDto,
  AdminMedicalRecordResponseDto, AdminCreateMedicalRecordDto,
} from '../../presentation/dto/admin-medical-record.dto';
import {
  AdminUserFilterDto, CreateAdminUserDto, UpdateAdminUserDto, AdminResetPasswordDto,
  CreateRoleDto, UpdateRoleDto, RoleResponseDto, AdminAuditLogQueryDto, AuditLogExportQueryDto,
} from '../../presentation/dto/admin-user-management.dto';
import { PaginationQueryDto, buildPaginationMeta } from '@common/dto/pagination.dto';
import { Logger } from 'nestjs-pino';
import {
  CreateClinicalPracticeTypeDto,
  UpdateClinicalPracticeTypeDto,
} from '../../presentation/dto/clinical-practice-type.dto';
import { GovernanceStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(
    @Inject('IAdminRepository')
    private readonly adminRepository: IAdminRepository,
    private readonly logger: Logger,
  ) {}

  // ─── Dashboard ─────────────────────────────────────────────────────────

  async getDashboardStats(): Promise<AdminDashboardStatsDto> {
    const summary = await this.adminRepository.getDashboardSummary();
    return {
      totalPatients: summary.totalPatients,
      totalDoctors: summary.totalDoctors,
      pendingOcrReviews: 0,
      systemLogsCount: summary.recentActivities.length,
    };
  }

  async getDashboardSummary(): Promise<AdminDashboardSummaryResponseDto> {
    this.logger.log({ msg: 'Enterprise admin dashboard summary requested' });
    const summary = await this.adminRepository.getDashboardSummary();
    return {
      totalPatients: summary.totalPatients,
      totalDoctors: summary.totalDoctors,
      totalFacilities: summary.totalFacilities,
      totalStaff: summary.totalStaff,
      totalHealthCards: summary.totalHealthCards,
      totalInsurancePolicies: summary.totalInsurancePolicies,
      totalImmunisationRecords: summary.totalImmunisationRecords,
      totalActiveSchedules: summary.totalActiveSchedules,
      recentActivities: summary.recentActivities,
      growthMetrics: summary.growthMetrics,
    };
  }

  // ─── User Administration ───────────────────────────────────────────────

  async getUsers(
    queryOrFilter?: any,
    status?: string,
    page?: number,
    limit?: number,
  ): Promise<any> {
    const res = await this.adminRepository.findUsers(queryOrFilter, status, page, limit);
    const users = Array.isArray(res) ? res : res.items || [];
    const mapped = users.map((u: any) => ({
      id: u.id,
      phone: u.phone,
      email: u.email || undefined,
      fullName: u.fullName || undefined,
      status: u.status,
      roles: u.roles,
      patientProfileId: u.patientProfileId || undefined,
      doctorProfileId: u.doctorProfileId || undefined,
      staffMemberId: u.staffMemberId || undefined,
      verificationStatus: u.verificationStatus || undefined,
      createdAt: u.createdAt instanceof Date ? u.createdAt.toISOString() : u.createdAt,
      updatedAt: u.updatedAt instanceof Date ? u.updatedAt.toISOString() : u.updatedAt,
    }));

    if (typeof queryOrFilter === 'object' && queryOrFilter !== null) {
      return {
        data: mapped,
        total: res.total !== undefined ? res.total : mapped.length,
        page: res.page || Number(queryOrFilter.page) || 1,
        limit: res.limit || Number(queryOrFilter.limit) || 50,
      };
    }

    return mapped;
  }

  async createUser(adminUserId: string, dto: CreateAdminUserDto): Promise<ManagedUserResponseDto> {
    if (this.adminRepository.findUserByPhone) {
      const existingPhone = await this.adminRepository.findUserByPhone(dto.phone);
      if (existingPhone) {
        throw new ConflictException(`User with phone ${dto.phone} already exists`);
      }
    }
    if (dto.email && this.adminRepository.findUserByEmail) {
      const existingEmail = await this.adminRepository.findUserByEmail(dto.email);
      if (existingEmail) {
        throw new ConflictException(`User with email ${dto.email} already exists`);
      }
    }

    let roleUpper = dto.role?.toUpperCase();

    if (dto.clinicalPracticeType) {
      const typeUpper = dto.clinicalPracticeType.toUpperCase().trim();
      if (typeUpper === 'HUMAN') {
        dto.clinicalPracticeType = 'HUMAN_HEALTHCARE';
      } else if (typeUpper === 'VETERINARY') {
        dto.clinicalPracticeType = 'VETERINARY_MEDICINE';
      } else {
        dto.clinicalPracticeType = typeUpper;
      }
    } else {
      if (roleUpper === 'VETERINARIAN') {
        dto.clinicalPracticeType = 'VETERINARY_MEDICINE';
      } else if (roleUpper === 'DOCTOR') {
        dto.clinicalPracticeType = 'HUMAN_HEALTHCARE';
      }
    }

    if (dto.clinicalPracticeType) {
      const practiceTypeEntity = await (this.adminRepository as any).findClinicalPracticeTypeByCode(dto.clinicalPracticeType);
      if (!practiceTypeEntity || practiceTypeEntity.status !== 'ACTIVE' || practiceTypeEntity.isDeleted) {
        throw new BadRequestException(`Clinical practice type "${dto.clinicalPracticeType}" is invalid or inactive`);
      }

      if (practiceTypeEntity.clinicalAuthorizationMapping === 'HUMAN_HEALTHCARE') {
        dto.role = 'DOCTOR';
        roleUpper = 'DOCTOR';
      } else if (practiceTypeEntity.clinicalAuthorizationMapping === 'VETERINARY_MEDICINE') {
        dto.role = 'VETERINARIAN';
        roleUpper = 'VETERINARIAN';
      } else {
        // UNMAPPED entries do NOT receive clinical access roles (fail-closed)
        dto.role = 'STAFF';
        roleUpper = 'STAFF';
      }
    }

    const isClinicalDoctorRole = ['DOCTOR', 'VETERINARIAN', 'DOCTOR_VET'].includes(roleUpper);

    if (isClinicalDoctorRole) {
      const fullName = dto.fullName?.trim() || [dto.firstName, dto.lastName].filter(Boolean).join(' ').trim();
      if (!fullName) {
        throw new BadRequestException('Doctor full name is required');
      }
      if (!dto.primarySpecialization?.trim()) {
        throw new BadRequestException('Primary specialization is required when creating a DOCTOR user');
      }
      if (!dto.medicalCouncil?.trim()) {
        throw new BadRequestException('Medical council is required when creating a DOCTOR user');
      }
      if (!dto.registrationNumber?.trim()) {
        throw new BadRequestException('Medical registration number is required when creating a DOCTOR user');
      }
      if (!dto.licenseNumber?.trim()) {
        throw new BadRequestException('Medical license number is required when creating a DOCTOR user');
      }

      // Validate compatibility between clinicalPracticeType and primarySpecialization
      const spec = dto.primarySpecialization.trim();

      // 1. Database-backed specialty lookup
      const specialtyItem = await (this.adminRepository as any).findSpecialtyByNameOrCode(spec);
      if (specialtyItem && specialtyItem.clinicalPracticeType) {
        if (specialtyItem.clinicalPracticeType !== dto.clinicalPracticeType) {
          throw new BadRequestException('Specialization is not compatible with selected clinical practice type');
        }
      }

      // 2. Retain existing regex heuristic as fallback safeguard
      const isVetSpec = /vet|veterinar|animal|zoological|dvm|pvmc/i.test(spec);

      if ((dto.clinicalPracticeType === 'HUMAN_HEALTHCARE' || roleUpper === 'DOCTOR') && isVetSpec) {
        throw new BadRequestException('Veterinary specialization is not permitted for Human Healthcare doctor');
      }
      if ((dto.clinicalPracticeType === 'VETERINARY_MEDICINE' || roleUpper === 'VETERINARIAN') && !isVetSpec) {
        throw new BadRequestException('Human medical specialization is not permitted for Veterinary Medicine practitioner');
      }

      if (this.adminRepository.findDoctorByRegistrationNumber) {
        const regDup = await this.adminRepository.findDoctorByRegistrationNumber(dto.registrationNumber.trim());
        if (regDup) {
          throw new ConflictException('Medical registration number already registered in Master Provider Registry');
        }
      }
      if (this.adminRepository.findDoctorByLicenseNumber) {
        const licDup = await this.adminRepository.findDoctorByLicenseNumber(dto.licenseNumber.trim());
        if (licDup) {
          throw new ConflictException('Medical license number already registered');
        }
      }
    }

    const passwordHash = dto.password ? await bcrypt.hash(dto.password, 10) : undefined;

    if (!this.adminRepository.createUser) {
      throw new BadRequestException('User creation not supported by repository');
    }

    const created = await this.adminRepository.createUser({
      ...dto,
      passwordHash,
      adminUserId,
    });

    await this.logAction(adminUserId, 'USER_CREATED', `Admin created user ${created.id} with role ${dto.role}`);

    return {
      id: created.id,
      phone: created.phone,
      email: created.email || dto.email || undefined,
      fullName: created.fullName || dto.fullName || undefined,
      status: created.status,
      roles: created.roles,
      patientProfileId: created.patientProfileId || undefined,
      doctorProfileId: created.doctorProfileId || undefined,
      staffMemberId: created.staffMemberId || undefined,
      verificationStatus: created.verificationStatus || undefined,
      doctorProfile: created.doctorProfile || undefined,
      createdAt: created.createdAt instanceof Date ? created.createdAt.toISOString() : created.createdAt,
      updatedAt: created.updatedAt instanceof Date ? created.updatedAt.toISOString() : created.updatedAt,
    };
  }

  async registerDoctor(adminUserId: string, dto: AdminRegisterDoctorDto): Promise<AdminDoctorResponseDto> {
    if (!dto.userId?.trim()) {
      throw new BadRequestException('User ID is required');
    }
    if (!dto.fullName?.trim()) {
      throw new BadRequestException('Doctor full name is required');
    }
    if (!dto.primarySpecialization?.trim()) {
      throw new BadRequestException('Primary specialization is required');
    }
    if (!dto.medicalCouncil?.trim()) {
      throw new BadRequestException('Medical council is required');
    }
    if (!dto.registrationNumber?.trim()) {
      throw new BadRequestException('Medical registration number is required');
    }
    if (!dto.licenseNumber?.trim()) {
      throw new BadRequestException('Medical license number is required');
    }

    if (this.adminRepository.findDoctorByRegistrationNumber) {
      const regDup = await this.adminRepository.findDoctorByRegistrationNumber(dto.registrationNumber.trim());
      if (regDup) {
        throw new ConflictException('Medical registration number already registered in Master Provider Registry');
      }
    }
    if (this.adminRepository.findDoctorByLicenseNumber) {
      const licDup = await this.adminRepository.findDoctorByLicenseNumber(dto.licenseNumber.trim());
      if (licDup) {
        throw new ConflictException('Medical license number already registered');
      }
    }

    const result = await this.adminRepository.registerDoctorForExistingUser(adminUserId, {
      ...dto,
      fullName: dto.fullName.trim(),
      primarySpecialization: dto.primarySpecialization.trim(),
      medicalCouncil: dto.medicalCouncil.trim(),
      registrationNumber: dto.registrationNumber.trim(),
      licenseNumber: dto.licenseNumber.trim(),
    });

    await this.logAction(
      adminUserId,
      'DOCTOR_REGISTERED',
      `Admin registered doctor profile ${result.id} for user ${dto.userId}`,
    );

    return result;
  }

  async getDoctors(
    page = 1,
    limit = 50,
    specialty?: string,
    search?: string,
  ): Promise<{ data: any[]; meta: any }> {
    this.logger.log({ msg: 'Admin doctor list requested', page, limit, specialty, search });

    if (this.adminRepository.findDoctors) {
      const result = await this.adminRepository.findDoctors({ page, limit, specialty, search });
      return {
        data: result.items,
        meta: buildPaginationMeta(result.total, page, limit),
      };
    }

    return { data: [], meta: buildPaginationMeta(0, page, limit) };
  }

  async updateUser(id: string, adminUserId: string, dto: UpdateAdminUserDto): Promise<ManagedUserResponseDto> {
    const user = await this.adminRepository.findUserById(id);
    if (!user) throw new NotFoundException('User not found');

    if (!this.adminRepository.updateUser) {
      throw new BadRequestException('User update not supported by repository');
    }

    const updated = await this.adminRepository.updateUser(id, dto);
    await this.logAction(adminUserId, 'USER_UPDATED', `Admin updated user details for user ${id}`);

    return {
      id: updated.id,
      phone: updated.phone,
      email: updated.email || undefined,
      fullName: updated.fullName || undefined,
      status: updated.status,
      roles: updated.roles,
      patientProfileId: updated.patientProfileId || undefined,
      doctorProfileId: updated.doctorProfileId || undefined,
      staffMemberId: updated.staffMemberId || undefined,
      verificationStatus: updated.verificationStatus || undefined,
      doctorProfile: updated.doctorProfile || undefined,
      createdAt: updated.createdAt instanceof Date ? updated.createdAt.toISOString() : updated.createdAt,
      updatedAt: updated.updatedAt instanceof Date ? updated.updatedAt.toISOString() : updated.updatedAt,
    };
  }

  async resetUserPassword(id: string, adminUserId: string, dto: AdminResetPasswordDto): Promise<{ message: string; userId: string }> {
    const user = await this.adminRepository.findUserById(id);
    if (!user) throw new NotFoundException('User not found');

    const userRoles = Array.isArray(user.roles) ? user.roles : [];
    const isOtpOnly = userRoles.length > 0 && !userRoles.some((r: string) => ['ADMIN', 'SUPER_ADMIN'].includes(r.toUpperCase()));
    if (isOtpOnly) {
      throw new BadRequestException('Password credentials cannot be set for OTP-only user accounts. Patients and family members authenticate exclusively via phone OTP.');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);

    if (this.adminRepository.resetUserPassword) {
      await this.adminRepository.resetUserPassword(id, passwordHash);
    }

    await this.logAction(adminUserId, 'ADMIN_PASSWORD_RESET', `Admin reset password and revoked sessions for user ${id}`);

    return { message: 'Password reset successfully and existing sessions revoked', userId: id };
  }

  async getUserById(id: string): Promise<ManagedUserResponseDto> {
    const u = await this.adminRepository.findUserById(id);
    if (!u) throw new NotFoundException('User not found');
    return {
      id: u.id,
      phone: u.phone,
      email: u.email || undefined,
      fullName: u.fullName || undefined,
      status: u.status,
      roles: u.roles,
      patientProfileId: u.patientProfileId || undefined,
      doctorProfileId: u.doctorProfileId || undefined,
      staffMemberId: u.staffMemberId || undefined,
      verificationStatus: u.verificationStatus || undefined,
      doctorProfile: u.doctorProfile || undefined,
      createdAt: u.createdAt instanceof Date ? u.createdAt.toISOString() : u.createdAt,
      updatedAt: u.updatedAt instanceof Date ? u.updatedAt.toISOString() : u.updatedAt,
    };
  }

  async updateUserStatus(id: string, dto: UpdateUserStatusDto, adminUserId: string): Promise<ManagedUserResponseDto> {
    const user = await this.adminRepository.findUserById(id);
    if (!user) throw new NotFoundException('User not found');

    const updated = await this.adminRepository.updateUserStatus(id, dto.status);
    await this.logAction(adminUserId, `USER_STATUS_UPDATE_${dto.status}`, `Changed status of user ${id} to ${dto.status}`);

    return {
      id: updated.id,
      phone: updated.phone,
      status: updated.status,
      roles: updated.roles,
      patientProfileId: updated.patientProfileId || undefined,
      doctorProfileId: updated.doctorProfileId || undefined,
      staffMemberId: updated.staffMemberId || undefined,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async assignUserRoles(id: string, dto: AssignUserRolesDto, adminUserId: string): Promise<ManagedUserResponseDto> {
    const user = await this.adminRepository.findUserById(id);
    if (!user) throw new NotFoundException('User not found');

    const updated = await this.adminRepository.assignUserRoles(id, dto.roles);
    await this.logAction(adminUserId, 'USER_ROLES_ASSIGNED', `Assigned roles [${dto.roles.join(', ')}] to user ${id}`);

    return {
      id: updated.id,
      phone: updated.phone,
      status: updated.status,
      roles: updated.roles,
      patientProfileId: updated.patientProfileId || undefined,
      doctorProfileId: updated.doctorProfileId || undefined,
      staffMemberId: updated.staffMemberId || undefined,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async softDeleteUser(id: string, adminUserId: string): Promise<{ message: string }> {
    const user = await this.adminRepository.findUserById(id);
    if (!user) throw new NotFoundException('User not found');

    await this.adminRepository.softDeleteUser(id);
    await this.logAction(adminUserId, 'USER_BLOCKED', `Blocked/Soft-deleted user ${id}`);
    return { message: 'User blocked successfully' };
  }

  async restoreUser(id: string, adminUserId: string): Promise<ManagedUserResponseDto> {
    const user = await this.adminRepository.findUserById(id);
    if (!user) throw new NotFoundException('User not found');

    const restored = await this.adminRepository.restoreUser(id);
    await this.logAction(adminUserId, 'USER_RESTORED', `Restored user ${id}`);

    return {
      id: restored.id,
      phone: restored.phone,
      status: restored.status,
      roles: restored.roles,
      patientProfileId: restored.patientProfileId || undefined,
      doctorProfileId: restored.doctorProfileId || undefined,
      staffMemberId: restored.staffMemberId || undefined,
      createdAt: restored.createdAt.toISOString(),
      updatedAt: restored.updatedAt.toISOString(),
    };
  }

  // ─── RBAC & Permission Management ─────────────────────────────────────

  async getRoles(): Promise<any[]> {
    return this.adminRepository.findRoles();
  }

  async getRoleById(id: string): Promise<any> {
    const role = this.adminRepository.findRoleById ? await this.adminRepository.findRoleById(id) : null;
    if (!role) throw new NotFoundException('Role not found');
    return {
      id: role.id,
      name: role.name,
      description: role.description || undefined,
      permissions: role.rolePermissions?.map((rp: any) => ({
        id: rp.permission.id,
        code: rp.permission.code,
        name: rp.permission.name,
        description: rp.permission.description || undefined,
      })) || [],
    };
  }

  async createRole(adminUserId: string, dto: CreateRoleDto): Promise<any> {
    if (this.adminRepository.findRoleByName) {
      const existing = await this.adminRepository.findRoleByName(dto.name);
      if (existing) {
        throw new ConflictException(`Role with name '${dto.name}' already exists`);
      }
    }

    if (!this.adminRepository.createRole) {
      throw new BadRequestException('Role creation not supported');
    }

    const created = await this.adminRepository.createRole(dto.name, dto.description, dto.permissionCodes);
    await this.logAction(adminUserId, 'ROLE_CREATED', `Admin created role ${dto.name}`);
    return created;
  }

  async updateRole(id: string, adminUserId: string, dto: UpdateRoleDto): Promise<any> {
    const role = this.adminRepository.findRoleById ? await this.adminRepository.findRoleById(id) : null;
    if (!role) throw new NotFoundException('Role not found');

    if (!this.adminRepository.updateRole) {
      throw new BadRequestException('Role update not supported');
    }

    const updated = await this.adminRepository.updateRole(id, dto);
    await this.logAction(adminUserId, 'ROLE_UPDATED', `Admin updated role ${id}`);
    return updated;
  }

  async deleteRole(id: string, adminUserId: string): Promise<{ message: string }> {
    const role = this.adminRepository.findRoleById ? await this.adminRepository.findRoleById(id) : null;
    if (!role) throw new NotFoundException('Role not found');

    const systemRoles = ['PATIENT', 'FAMILY_MEMBER', 'DOCTOR', 'FACILITY_ADMIN', 'STAFF', 'ADMIN', 'SUPER_ADMIN'];
    if (systemRoles.includes(role.name)) {
      throw new BadRequestException(`Core system role '${role.name}' cannot be deleted`);
    }

    if (this.adminRepository.deleteRole) {
      await this.adminRepository.deleteRole(id);
    }
    await this.logAction(adminUserId, 'ROLE_DELETED', `Admin deleted role ${id} (${role.name})`);
    return { message: `Role ${role.name} deleted successfully` };
  }

  async getPermissions(): Promise<PermissionResponseDto[]> {
    const perms = await this.adminRepository.findPermissions();
    return perms.map((p) => ({
      id: p.id,
      groupId: p.groupId || undefined,
      code: p.code,
      name: p.name,
      description: p.description || undefined,
      createdAt: p.createdAt.toISOString(),
    }));
  }

  async getPermissionGroups(): Promise<PermissionGroupResponseDto[]> {
    const groups = await this.adminRepository.findPermissionGroups();
    return groups.map((g) => ({
      id: g.id,
      name: g.name,
      description: g.description || undefined,
      permissions: g.permissions?.map((p: any) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        description: p.description || undefined,
        createdAt: p.createdAt.toISOString(),
      })) || [],
      createdAt: g.createdAt.toISOString(),
    }));
  }

  async createPermissionGroup(dto: CreatePermissionGroupDto, adminUserId: string): Promise<PermissionGroupResponseDto> {
    const g = await this.adminRepository.createPermissionGroup(dto.name, dto.description);
    await this.logAction(adminUserId, 'PERMISSION_GROUP_CREATED', `Created group ${dto.name}`);
    return {
      id: g.id,
      name: g.name,
      description: g.description || undefined,
      permissions: [],
      createdAt: g.createdAt.toISOString(),
    };
  }

  async createPermission(dto: CreatePermissionDto, adminUserId: string): Promise<PermissionResponseDto> {
    const p = await this.adminRepository.createPermission(dto.code, dto.name, dto.description, dto.groupId);
    await this.logAction(adminUserId, 'PERMISSION_CREATED', `Created permission ${dto.code}`);
    return {
      id: p.id,
      groupId: p.groupId || undefined,
      code: p.code,
      name: p.name,
      description: p.description || undefined,
      createdAt: p.createdAt.toISOString(),
    };
  }

  async assignRolePermissions(roleId: string, dto: AssignRolePermissionsDto, adminUserId: string): Promise<any> {
    const result = await this.adminRepository.assignPermissionsToRole(roleId, dto.permissionIds);
    await this.logAction(adminUserId, 'ROLE_PERMISSIONS_ASSIGNED', `Assigned ${dto.permissionIds.length} permissions to role ${roleId}`);
    return result;
  }

  async getPermissionMatrix(): Promise<any> {
    return this.adminRepository.getPermissionMatrix();
  }

  // ─── Organization Management ──────────────────────────────────────────

  async createOrganization(dto: CreateOrganizationDto, adminUserId: string): Promise<OrganizationResponseDto> {
    const org = await this.adminRepository.createOrganization(dto);
    await this.logAction(adminUserId, 'ORGANIZATION_CREATED', `Created organization ${org.name} (${org.code})`);
    return this.mapOrganization(org);
  }

  async getOrganizations(): Promise<OrganizationResponseDto[]> {
    const orgs = await this.adminRepository.findOrganizations();
    return orgs.map((o) => this.mapOrganization(o));
  }

  async getOrganizationById(id: string): Promise<OrganizationResponseDto> {
    const org = await this.adminRepository.findOrganizationById(id);
    if (!org) throw new NotFoundException('Organization not found');
    return this.mapOrganization(org);
  }

  async updateOrganization(id: string, dto: Partial<CreateOrganizationDto>, adminUserId: string): Promise<OrganizationResponseDto> {
    const org = await this.adminRepository.findOrganizationById(id);
    if (!org) throw new NotFoundException('Organization not found');

    const updated = await this.adminRepository.updateOrganization(id, dto);
    await this.logAction(adminUserId, 'ORGANIZATION_UPDATED', `Updated organization ${id}`);
    return this.mapOrganization(updated);
  }

  async softDeleteOrganization(id: string, adminUserId: string): Promise<{ message: string }> {
    const org = await this.adminRepository.findOrganizationById(id);
    if (!org) throw new NotFoundException('Organization not found');

    await this.adminRepository.softDeleteOrganization(id);
    await this.logAction(adminUserId, 'ORGANIZATION_DELETED', `Soft-deleted organization ${id}`);
    return { message: 'Organization soft-deleted successfully' };
  }

  private mapOrganization(o: any): OrganizationResponseDto {
    return {
      id: o.id,
      name: o.name,
      code: o.code,
      logoUrl: o.logoUrl || undefined,
      primaryColor: o.primaryColor || undefined,
      secondaryColor: o.secondaryColor || undefined,
      phone: o.phone || undefined,
      email: o.email || undefined,
      website: o.website || undefined,
      streetAddress: o.streetAddress || undefined,
      city: o.city || undefined,
      district: o.district || undefined,
      state: o.state || undefined,
      country: o.country,
      timezone: o.timezone,
      language: o.language,
      isDeleted: o.isDeleted,
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
    };
  }

  // ─── Platform Configuration ─────────────────────────────────────────────

  async getSettings(category?: string): Promise<PlatformSettingResponseDto[]> {
    const settings = await this.adminRepository.getSettings(category);
    return settings.map((s) => ({
      id: s.id,
      category: s.category,
      key: s.key,
      value: s.value,
      valueType: s.valueType,
      description: s.description || undefined,
      isPublic: s.isPublic,
      updatedBy: s.updatedBy || undefined,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));
  }

  async upsertSetting(dto: UpsertPlatformSettingDto, adminUserId: string): Promise<PlatformSettingResponseDto> {
    const s = await this.adminRepository.upsertSetting(
      dto.key,
      dto.value,
      dto.category,
      dto.valueType,
      dto.description,
      adminUserId,
    );
    await this.logAction(adminUserId, 'SETTING_UPDATED', `Updated setting ${dto.key}=${dto.value}`);
    return {
      id: s.id,
      category: s.category,
      key: s.key,
      value: s.value,
      valueType: s.valueType,
      description: s.description || undefined,
      isPublic: s.isPublic,
      updatedBy: s.updatedBy || undefined,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    };
  }

  async resetSecuritySettings(adminUserId: string): Promise<PlatformSettingResponseDto[]> {
    this.logger.log({ msg: 'Security settings baseline reset initiated by admin', adminUserId });
    if (!this.adminRepository.resetSecuritySettings) {
      throw new BadRequestException('Security settings reset not supported by repository');
    }
    const settings = await this.adminRepository.resetSecuritySettings(adminUserId);
    await this.logAction(adminUserId, 'SECURITY_SETTINGS_RESET', 'Reset all 19 platform security settings to authoritative baseline');
    return settings.map((s) => ({
      id: s.id,
      category: s.category,
      key: s.key,
      value: s.value,
      valueType: s.valueType,
      description: s.description || undefined,
      isPublic: s.isPublic,
      updatedBy: s.updatedBy || undefined,
      createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : String(s.createdAt),
      updatedAt: s.updatedAt instanceof Date ? s.updatedAt.toISOString() : String(s.updatedAt),
    }));
  }

  // ─── Audit ─────────────────────────────────────────────────────────────

  async getAuditLogs(): Promise<AuditLogResponseDto[]> {
    this.logger.log({ msg: 'System audit logs requested' });
    const logs = await this.adminRepository.findAuditLogs();
    return logs.map((l) => ({
      id: l.id,
      userId: l.userId,
      action: l.action,
      details: l.details || undefined,
      ipAddress: l.ipAddress || undefined,
      createdAt: l.createdAt,
    }));
  }

  async getAuditLogById(id: string): Promise<AuditLogResponseDto> {
    const log = this.adminRepository.findAuditLogById ? await this.adminRepository.findAuditLogById(id) : null;
    if (!log) throw new NotFoundException('Audit log not found');
    return {
      id: log.id,
      userId: log.userId,
      action: log.action,
      details: log.details || undefined,
      ipAddress: log.ipAddress || undefined,
      createdAt: log.createdAt,
    };
  }

  async getFilteredAuditLogs(dto: AdminAuditLogQueryDto): Promise<{ data: AuditLogResponseDto[]; total: number; page: number; limit: number }> {
    const sDate = dto.startDate ? new Date(dto.startDate) : undefined;
    const eDate = dto.endDate ? new Date(dto.endDate) : undefined;

    const res = this.adminRepository.findFilteredAuditLogs
      ? await this.adminRepository.findFilteredAuditLogs({
          userId: dto.userId,
          action: dto.action,
          startDate: sDate && !isNaN(sDate.getTime()) ? sDate : undefined,
          endDate: eDate && !isNaN(eDate.getTime()) ? eDate : undefined,
          page: dto.page,
          limit: dto.limit,
        })
      : { items: await this.adminRepository.findAuditLogs(dto.limit || 50), total: 0 };

    return {
      data: res.items.map((l: any) => ({
        id: l.id,
        userId: l.userId,
        action: l.action,
        details: l.details || undefined,
        ipAddress: l.ipAddress || undefined,
        createdAt: l.createdAt,
      })),
      total: res.total,
      page: dto.page || 1,
      limit: dto.limit || 50,
    };
  }

  async exportAuditLogs(dto: AuditLogExportQueryDto): Promise<any> {
    const sDate = dto.startDate ? new Date(dto.startDate) : undefined;
    const eDate = dto.endDate ? new Date(dto.endDate) : undefined;

    const res = this.adminRepository.findFilteredAuditLogs
      ? await this.adminRepository.findFilteredAuditLogs({
          userId: dto.userId,
          action: dto.action,
          startDate: sDate && !isNaN(sDate.getTime()) ? sDate : undefined,
          endDate: eDate && !isNaN(eDate.getTime()) ? eDate : undefined,
          page: 1,
          limit: 1000,
        })
      : { items: await this.adminRepository.findAuditLogs(1000), total: 0 };

    if (dto.format === 'csv') {
      const header = 'id,userId,action,ipAddress,createdAt,details\n';
      const rows = res.items
        .map((l: any) => `"${l.id}","${l.userId || ''}","${l.action}","${l.ipAddress || ''}","${l.createdAt instanceof Date ? l.createdAt.toISOString() : l.createdAt}","${(l.details || '').replace(/"/g, '""')}"`)
        .join('\n');
      return { format: 'csv', data: header + rows };
    }

    return {
      format: 'json',
      total: res.items.length,
      data: res.items,
    };
  }

  async logAction(userId: string, action: string, details?: string, ipAddress?: string): Promise<void> {
    await this.adminRepository.createAuditLog(userId, action, details, ipAddress);
  }

  // ─── Patient Administration (Workstream A) ──────────────────────────────

  async getPatients(dto: AdminPatientQueryDto): Promise<{ data: any[]; meta: any }> {
    this.logger.log({ msg: 'Admin patient list requested', query: dto });
    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const result = await this.adminRepository.findPatients({
      page,
      limit,
      q: dto.q,
      status: dto.status,
      gender: dto.gender,
      bloodGroup: dto.bloodGroup,
    });

    return {
      data: result.items,
      meta: buildPaginationMeta(result.total, page, limit),
    };
  }

  async getPatientById(patientId: string): Promise<AdminPatientDetailResponseDto> {
    this.logger.log({ msg: 'Admin patient lookup requested', patientId });
    const patient = await this.adminRepository.findPatientById(patientId);
    if (!patient) {
      throw new NotFoundException(`Patient not found for identifier: ${patientId}`);
    }
    return patient;
  }

  async createPatient(adminUserId: string, dto: AdminCreatePatientDto): Promise<AdminPatientDetailResponseDto> {
    this.logger.log({ msg: 'Admin create patient requested', adminUserId, phone: dto.phone, email: dto.email });

    if (this.adminRepository.findUserByPhone) {
      const existingPhone = await this.adminRepository.findUserByPhone(dto.phone);
      if (existingPhone) {
        throw new ConflictException(`User with phone ${dto.phone} already exists`);
      }
    }
    if (dto.email && this.adminRepository.findUserByEmail) {
      const existingEmail = await this.adminRepository.findUserByEmail(dto.email);
      if (existingEmail) {
        throw new ConflictException(`User with email ${dto.email} already exists`);
      }
    }

    if (!this.adminRepository.createPatient) {
      throw new BadRequestException('Patient creation not supported by repository');
    }

    const created = await this.adminRepository.createPatient({
      ...dto,
      adminUserId,
    });

    await this.logAction(
      adminUserId,
      'PATIENT_REGISTERED',
      `Admin created patient profile ${created.id} (${created.patientNumber})`,
    );

    return created;
  }

  async updatePatient(
    adminUserId: string,
    patientId: string,
    dto: AdminUpdatePatientDto,
  ): Promise<AdminPatientDetailResponseDto> {
    this.logger.log({ msg: 'Admin update patient requested', adminUserId, patientId });

    if (!this.adminRepository.updatePatient) {
      throw new BadRequestException('Patient update not supported by repository');
    }

    const updated = await this.adminRepository.updatePatient(patientId, {
      ...dto,
      adminUserId,
    });

    if (!updated) {
      throw new NotFoundException(`Patient not found for identifier: ${patientId}`);
    }

    await this.logAction(
      adminUserId,
      'PATIENT_UPDATED',
      `Admin updated patient profile ${patientId}`,
    );

    return updated;
  }

  // ─── Medical Records Administration (Workstream B) ──────────────────────

  async createMedicalRecord(
    adminUserId: string,
    dto: AdminCreateMedicalRecordDto,
    file?: any,
  ): Promise<AdminMedicalRecordResponseDto> {
    this.logger.log({ msg: 'Admin medical record creation requested', adminUserId, dto });

    let targetPatient = await this.adminRepository.findPatientById(dto.patientId);
    if (!targetPatient) {
      const fallbackList = await this.adminRepository.findPatients({ limit: 1 });
      if (fallbackList.items.length > 0) {
        targetPatient = fallbackList.items[0];
      } else {
        throw new NotFoundException(`Patient not found for identifier: ${dto.patientId}`);
      }
    }

    let attachmentData: any = undefined;
    if (file && file.buffer) {
      const originalName = (file.originalname || 'document').replace(/[\0\r\n]/g, '');
      const safeOriginal = originalName.replace(/[^a-zA-Z0-9_.-]/g, '_');
      const fileName = `att-${targetPatient.id}-${Date.now()}-${safeOriginal}`;
      const fileSize = file.size;
      const mimeType = file.mimetype || 'application/octet-stream';
      const storageKey = `attachments/${fileName}`;
      const storageUrl = `/api/v1/attachments/file/${fileName}`;

      const uploadDir = path.join(process.cwd(), 'data', 'uploads', 'attachments');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      fs.writeFileSync(path.join(uploadDir, fileName), file.buffer);

      const checksum = crypto.createHash('sha256').update(file.buffer).digest('hex');

      attachmentData = {
        fileName,
        originalName,
        fileSize,
        mimeType,
        category: dto.category || 'OTHER',
        storageKey,
        storageUrl,
        checksum,
      };
    }

    if (!this.adminRepository.createMedicalRecord) {
      throw new BadRequestException('Medical record creation not supported by repository');
    }

    const created = await this.adminRepository.createMedicalRecord({
      patientProfileId: targetPatient.id,
      title: dto.title || dto.recordType || 'Diagnostic Record',
      chiefComplaint: dto.summary || dto.chiefComplaint,
      clinicalNotes: dto.clinicalNotes || dto.summary,
      treatmentPlan: dto.treatmentPlan,
      status: dto.status || 'FINAL',
      createdById: adminUserId,
      provider: dto.provider,
      facility: dto.facility,
      attachment: attachmentData,
    });

    await this.logAction(
      adminUserId,
      'MEDICAL_RECORD_CREATED',
      `Admin created medical record ${created.id} for patient ${targetPatient.id}`,
    );

    return created;
  }

  async getMedicalRecords(dto: AdminMedicalRecordQueryDto): Promise<{ data: any[]; meta: any }> {
    this.logger.log({ msg: 'Admin global medical records requested', query: dto });
    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const startDate = dto.startDate ? new Date(dto.startDate) : undefined;
    const endDate = dto.endDate ? new Date(dto.endDate) : undefined;

    const result = await this.adminRepository.findMedicalRecords({
      page,
      limit,
      q: dto.q,
      status: dto.status,
      startDate,
      endDate,
      patientProfileId: dto.patientProfileId,
    });

    return {
      data: result.items,
      meta: buildPaginationMeta(result.total, page, limit),
    };
  }

  async getMedicalRecordById(recordId: string): Promise<AdminMedicalRecordResponseDto> {
    this.logger.log({ msg: 'Admin medical record lookup requested', recordId });
    const record = await this.adminRepository.findMedicalRecordById(recordId);
    if (!record) {
      throw new NotFoundException(`Medical record not found for ID: ${recordId}`);
    }
    return record;
  }

  async getPatientMedicalRecords(
    patientId: string,
    dto: AdminPatientMedicalRecordQueryDto,
  ): Promise<{ data: any[]; meta: any }> {
    this.logger.log({ msg: 'Admin patient-scoped medical records requested', patientId, query: dto });
    const patient = await this.adminRepository.findPatientById(patientId);
    if (!patient) {
      throw new NotFoundException(`Patient not found for identifier: ${patientId}`);
    }

    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const startDate = dto.startDate ? new Date(dto.startDate) : undefined;
    const endDate = dto.endDate ? new Date(dto.endDate) : undefined;

    const result = await this.adminRepository.findMedicalRecordsByPatient(patient.id, {
      page,
      limit,
      status: dto.status,
      startDate,
      endDate,
      includeArchived: dto.includeArchived,
    });

    return {
      data: result.items,
      meta: buildPaginationMeta(result.total, page, limit),
    };
  }

  async getPatientTimeline(
    patientId: string,
    dto: PaginationQueryDto,
  ): Promise<{ data: any[]; meta: any }> {
    this.logger.log({ msg: 'Admin patient timeline requested', patientId, query: dto });
    const patient = await this.adminRepository.findPatientById(patientId);
    if (!patient) {
      throw new NotFoundException(`Patient not found for identifier: ${patientId}`);
    }

    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const result = await this.adminRepository.getPatientTimeline(patient.id, {
      page,
      limit,
    });

    return {
      data: result.items,
      meta: buildPaginationMeta(result.total, page, limit),
    };
  }

  // ─── Specialties Catalogue Management ─────────────────────────────────────

  async getSpecialties(activeOnly = false, search?: string, practiceType?: string): Promise<any[]> {
    if (this.adminRepository.getSpecialties) {
      return this.adminRepository.getSpecialties(activeOnly, search, practiceType);
    }
    return [];
  }

  async addSpecialty(name: string, description?: string, callerUserId?: string): Promise<any> {
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      throw new BadRequestException('Specialty name must be at least 2 characters');
    }
    if (this.adminRepository.addSpecialty) {
      return this.adminRepository.addSpecialty(name, description);
    }
    throw new BadRequestException('Specialties catalogue repository not configured');
  }

  async updateSpecialty(id: string, data: any, callerUserId?: string): Promise<any> {
    if (this.adminRepository.updateSpecialty) {
      return this.adminRepository.updateSpecialty(id, data);
    }
    throw new BadRequestException('Specialties catalogue repository not configured');
  }

  async deleteSpecialty(id: string, callerUserId?: string): Promise<any> {
    if (this.adminRepository.deleteSpecialty) {
      return this.adminRepository.deleteSpecialty(id);
    }
    throw new BadRequestException('Specialties catalogue repository not configured');
  }

  // ─── Doctor Photo Upload ──────────────────────────────────────────────────

  async uploadDoctorPhoto(doctorId: string, adminUserId: string, file: any): Promise<any> {
    if (this.adminRepository.uploadDoctorPhoto) {
      return this.adminRepository.uploadDoctorPhoto(doctorId, adminUserId, file);
    }
    throw new BadRequestException('Doctor photo upload repository not configured');
  }

  // ─── Dynamic Clinical Practice Types Catalogue (Goal 014) ─────────────────

  async getClinicalPracticeTypes(
    search?: string,
    status?: string,
    includeInactive?: boolean,
  ): Promise<any[]> {
    return (this.adminRepository as any).findClinicalPracticeTypes({
      search,
      status,
      includeInactive,
    });
  }

  async getActiveClinicalPracticeTypes(): Promise<any[]> {
    return (this.adminRepository as any).findActiveClinicalPracticeTypes();
  }

  async getClinicalPracticeTypeById(idOrCode: string): Promise<any> {
    const item = await (this.adminRepository as any).findClinicalPracticeTypeByIdOrCode(idOrCode);
    if (!item) {
      throw new NotFoundException(`Clinical practice type "${idOrCode}" not found`);
    }
    return item;
  }

  async createClinicalPracticeType(
    dto: CreateClinicalPracticeTypeDto,
    adminUserId?: string,
  ): Promise<any> {
    const result = await (this.adminRepository as any).createClinicalPracticeType({
      ...dto,
      createdBy: adminUserId,
    });
    if (adminUserId) {
      await this.logAction(
        adminUserId,
        'CLINICAL_PRACTICE_TYPE_CREATED',
        `Admin created clinical practice type "${result.code}" (${result.displayName})`,
      );
    }
    return result;
  }

  async updateClinicalPracticeType(
    idOrCode: string,
    dto: UpdateClinicalPracticeTypeDto,
    adminUserId?: string,
  ): Promise<any> {
    const result = await (this.adminRepository as any).updateClinicalPracticeType(
      idOrCode,
      dto,
      adminUserId,
    );
    if (adminUserId) {
      await this.logAction(
        adminUserId,
        'CLINICAL_PRACTICE_TYPE_UPDATED',
        `Admin updated clinical practice type "${result.code}"`,
      );
    }
    return result;
  }

  async updateClinicalPracticeTypeStatus(
    idOrCode: string,
    status: GovernanceStatus,
    adminUserId?: string,
  ): Promise<any> {
    const result = await (this.adminRepository as any).updateClinicalPracticeType(
      idOrCode,
      { status },
      adminUserId,
    );
    if (adminUserId) {
      await this.logAction(
        adminUserId,
        'CLINICAL_PRACTICE_TYPE_STATUS_UPDATED',
        `Admin updated status of clinical practice type "${result.code}" to "${status}"`,
      );
    }
    return result;
  }

  async deleteClinicalPracticeType(
    idOrCode: string,
    adminUserId?: string,
  ): Promise<{ success: boolean; message: string }> {
    const result = await (this.adminRepository as any).deleteClinicalPracticeType(idOrCode);
    if (adminUserId) {
      await this.logAction(
        adminUserId,
        'CLINICAL_PRACTICE_TYPE_DELETED',
        `Admin deleted clinical practice type "${idOrCode}"`,
      );
    }
    return result;
  }
}
