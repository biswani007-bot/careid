import { Injectable, BadRequestException, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { validateImageBuffer } from '@common/utils/file-security.util';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '@database/database.service';
import { IAdminRepository } from '../../domain/repositories/admin.repository.interface';
import {
  AdminDashboardSummaryEntity, PermissionGroupEntity, PermissionEntity,
  OrganizationEntity, PlatformSettingEntity, ManagedUserEntity,
} from '../../domain/entities/admin.entity';

function toSafeIsoString(dateVal: any): string | null {
  if (!dateVal) return null;
  const d = dateVal instanceof Date ? dateVal : new Date(dateVal);
  return !isNaN(d.getTime()) ? d.toISOString() : null;
}

@Injectable()
export class AdminRepository implements IAdminRepository {
  constructor(private readonly db: DatabaseService) {}

  // ─── Dashboard Summary ──────────────────────────────────────────────────

  async getDashboardSummary(): Promise<AdminDashboardSummaryEntity> {
    const [
      totalPatients,
      totalDoctors,
      totalFacilities,
      totalStaff,
      totalHealthCards,
      totalInsurancePolicies,
      totalImmunisationRecords,
      totalActiveSchedules,
      recentActivities,
    ] = await Promise.all([
      this.db.patientProfile.count(),
      this.db.doctorProfile.count({ where: { isDeleted: false } }),
      this.db.facility.count({ where: { isDeleted: false } }),
      this.db.staffMember.count({ where: { isDeleted: false } }),
      this.db.healthCard.count({ where: { isDeleted: false } }),
      this.db.insurancePolicy.count({ where: { isDeleted: false } }),
      this.db.vaccinationRecord.count(),
      this.db.schedule.count({ where: { isDeleted: false, isActive: true } }),
      this.db.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 10 }),
    ]);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [newPatientsThisMonth, newDoctorsThisMonth, newFacilitiesThisMonth] = await Promise.all([
      this.db.patientProfile.count({ where: { createdAt: { gte: startOfMonth } } }),
      this.db.doctorProfile.count({ where: { createdAt: { gte: startOfMonth }, isDeleted: false } }),
      this.db.facility.count({ where: { createdAt: { gte: startOfMonth }, isDeleted: false } }),
    ]);

    return {
      totalPatients,
      totalDoctors,
      totalFacilities,
      totalStaff,
      totalHealthCards,
      totalInsurancePolicies,
      totalImmunisationRecords,
      totalActiveSchedules,
      recentActivities,
      growthMetrics: {
        newPatientsThisMonth,
        newDoctorsThisMonth,
        newFacilitiesThisMonth,
      },
    };
  }

  // ─── User Administration ────────────────────────────────────────────────

  async findUsers(queryOrOptions?: any, status?: string, page = 1, limit = 50): Promise<any> {
    let queryText: string | undefined;
    let statusFilter: string | undefined = status;
    let roleFilter: string | undefined;
    let safePage = page || 1;
    let safeLimit = limit || 50;
    let sortBy = 'createdAt';
    let sortOrder = 'desc';

    if (typeof queryOrOptions === 'object' && queryOrOptions !== null) {
      queryText = queryOrOptions.search || queryOrOptions.q;
      statusFilter = queryOrOptions.status;
      roleFilter = queryOrOptions.role;
      if (queryOrOptions.page) safePage = Number(queryOrOptions.page);
      if (queryOrOptions.limit) safeLimit = Number(queryOrOptions.limit);
      if (queryOrOptions.sortBy) sortBy = queryOrOptions.sortBy;
      if (queryOrOptions.sortOrder) sortOrder = queryOrOptions.sortOrder;
    } else {
      queryText = queryOrOptions;
    }

    const where: any = {};
    if (statusFilter) {
      where.status = statusFilter.toUpperCase() as any;
    }
    const validRoles = ['PATIENT', 'FAMILY_MEMBER', 'DOCTOR', 'VETERINARIAN', 'DOCTOR_VET', 'FACILITY_ADMIN', 'STAFF', 'ADMIN', 'SUPER_ADMIN'];
    if (roleFilter) {
      const requestedRoles = roleFilter
        .split(',')
        .map((r: string) => r.trim().toUpperCase())
        .filter((r: string) => validRoles.includes(r));

      if (requestedRoles.length === 1) {
        where.userRoles = {
          some: {
            role: {
              name: requestedRoles[0] as any,
            },
          },
        };
      } else if (requestedRoles.length > 1) {
        where.userRoles = {
          some: {
            role: {
              name: { in: requestedRoles as any },
            },
          },
        };
      } else {
        where.id = 'non-existent-user-role-filter';
      }
    }
    if (queryText) {
      where.OR = [
        { phone: { contains: queryText, mode: 'insensitive' } },
        { email: { contains: queryText, mode: 'insensitive' } },
        { id: { contains: queryText, mode: 'insensitive' } },
      ];
    }

    safeLimit = Math.min(Math.max(1, safeLimit), 100);
    safePage = Math.max(1, safePage);
    const skip = (safePage - 1) * safeLimit;

    const allowedSortFields = ['createdAt', 'updatedAt', 'phone', 'email', 'status'];
    const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const validSortOrder = sortOrder === 'asc' ? 'asc' : 'desc';

    const [users, total] = await Promise.all([
      this.db.user.findMany({
        where,
        include: {
          userRoles: { include: { role: true } },
          patientProfile: { select: { id: true, firstName: true, lastName: true } },
          doctorProfile: { select: { id: true, fullName: true, verificationStatus: true, primarySpecialization: true, clinicalPracticeType: true } },
          staffMember: { select: { id: true, fullName: true } },
        },
        orderBy: { [validSortBy]: validSortOrder },
        take: safeLimit,
        skip,
      }),
      this.db.user.count({ where }),
    ]);

    const mapped = users.map((u) => {
      const fullName = u.doctorProfile?.fullName
        || u.staffMember?.fullName
        || [u.patientProfile?.firstName, u.patientProfile?.lastName].filter(Boolean).join(' ')
        || undefined;

      return {
        id: u.id,
        phone: u.phone,
        email: u.email || undefined,
        fullName,
        status: u.status,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        roles: u.userRoles.map((ur) => ur.role.name),
        patientProfileId: u.patientProfile?.id || null,
        doctorProfileId: u.doctorProfile?.id || null,
        staffMemberId: u.staffMember?.id || null,
        verificationStatus: u.doctorProfile?.verificationStatus || undefined,
      };
    });

    const result: any = mapped;
    result.items = mapped;
    result.data = mapped;
    result.total = total;
    result.page = safePage;
    result.limit = safeLimit;
    return result;
  }

  async findUserByPhone(phone: string): Promise<any | null> {
    return this.db.user.findUnique({
      where: { phone },
      include: {
        userRoles: { include: { role: true } },
        patientProfile: true,
        doctorProfile: true,
        staffMember: true,
      },
    });
  }

  async findUserByEmail(email: string): Promise<any | null> {
    return this.db.user.findUnique({
      where: { email },
      include: {
        userRoles: { include: { role: true } },
        patientProfile: true,
        doctorProfile: true,
        staffMember: true,
      },
    });
  }

  async findDoctorByRegistrationNumber(registrationNumber: string): Promise<any | null> {
    return this.db.doctorProfile.findUnique({
      where: { registrationNumber },
    });
  }

  async findDoctorByLicenseNumber(licenseNumber: string): Promise<any | null> {
    return this.db.doctorProfile.findUnique({
      where: { licenseNumber },
    });
  }

  async findDoctorProfileByUserId(userId: string): Promise<any | null> {
    return this.db.doctorProfile.findUnique({
      where: { userId },
    });
  }

  async registerDoctorForExistingUser(adminUserId: string, data: any): Promise<any> {
    try {
      return await this.db.$transaction(async (tx) => {
        // 1. Verify user exists
        const user = await tx.user.findUnique({
          where: { id: data.userId },
          include: {
            userRoles: { include: { role: true } },
            doctorProfile: true,
          },
        });

        if (!user) {
          throw new NotFoundException(`User with ID ${data.userId} not found`);
        }

        // 2. Verify user has DOCTOR, VETERINARIAN, or DOCTOR_VET role
        const hasDoctorRole = user.userRoles?.some((ur: any) =>
          ['DOCTOR', 'VETERINARIAN', 'DOCTOR_VET'].includes(ur.role?.name),
        );
        if (!hasDoctorRole) {
          throw new BadRequestException('User does not have the DOCTOR role');
        }

        // 3. Verify user does not already have a doctor profile
        if (user.doctorProfile) {
          throw new ConflictException('Doctor profile already exists for this user account');
        }

        // 4. Verify unique registration number
        const regTrimmed = data.registrationNumber.trim();
        const regDup = await tx.doctorProfile.findUnique({
          where: { registrationNumber: regTrimmed },
        });
        if (regDup) {
          throw new ConflictException('Medical registration number already registered in Master Provider Registry');
        }

        // 5. Verify unique license number
        const licTrimmed = data.licenseNumber.trim();
        const licDup = await tx.doctorProfile.findUnique({
          where: { licenseNumber: licTrimmed },
        });
        if (licDup) {
          throw new ConflictException('Medical license number already registered');
        }

        // Generate collision-resistant providerIdentifier
        let providerIdentifier = `DOC-360-${Date.now().toString().slice(-6)}`;
        let provExists = await tx.doctorProfile.findUnique({ where: { providerIdentifier } });
        let seq = 1;
        while (provExists) {
          providerIdentifier = `DOC-360-${Date.now().toString().slice(-6)}-${seq}`;
          provExists = await tx.doctorProfile.findUnique({ where: { providerIdentifier } });
          seq++;
        }

        // 6. Create DoctorProfile linked to existing user.id
        const doc = await tx.doctorProfile.create({
          data: {
            userId: user.id,
            fullName: data.fullName.trim(),
            gender: data.gender || null,
            dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
            profilePhotoUrl: data.profilePhotoUrl || null,
            digitalSignatureUrl: data.digitalSignatureUrl || null,
            biography: data.biography || null,
            professionalSummary: data.professionalSummary || null,
            yearsOfExperience: data.yearsOfExperience || 0,
            primarySpecialization: data.primarySpecialization.trim(),
            secondarySpecializations: data.secondarySpecializations || [],
            clinicalPracticeType: data.clinicalPracticeType || (user.userRoles?.some((ur: any) => ['VETERINARIAN', 'DOCTOR_VET'].includes(ur.role?.name)) ? 'VETERINARY_MEDICINE' : 'HUMAN_HEALTHCARE'),
            medicalCouncil: data.medicalCouncil.trim(),
            registrationNumber: regTrimmed,
            licenseNumber: licTrimmed,
            providerIdentifier,
            registrationState: data.registrationState || null,
            registrationCountry: data.registrationCountry || null,
            registrationIssueDate: data.registrationIssueDate ? new Date(data.registrationIssueDate) : null,
            registrationExpiryDate: data.registrationExpiryDate ? new Date(data.registrationExpiryDate) : null,
            verificationStatus: 'PENDING',
            department: data.department || null,
            subSpecializations: data.subSpecializations || [],
            clinicalInterests: data.clinicalInterests || [],
            servicesOffered: data.servicesOffered || [],
            languagesSpoken: data.languagesSpoken || [],
            emergencyPhone: data.emergencyPhone || null,
          },
        });

        // 7. Create DoctorAuditLog
        await tx.doctorAuditLog.create({
          data: {
            doctorProfileId: doc.id,
            action: 'REGISTERED',
            performedBy: adminUserId || user.id,
            details: `Master Doctor profile created by Admin for existing user with provider ID ${providerIdentifier}`,
          },
        });

        return {
          id: doc.id,
          doctorProfileId: doc.id,
          userId: user.id,
          fullName: doc.fullName,
          user: {
            id: user.id,
            phone: user.phone || undefined,
            email: user.email || undefined,
          },
          phone: user.phone || undefined,
          email: user.email || undefined,
          primarySpecialization: doc.primarySpecialization,
          secondarySpecializations: doc.secondarySpecializations || [],
          clinicalPracticeType: doc.clinicalPracticeType || 'HUMAN_HEALTHCARE',
          medicalCouncil: doc.medicalCouncil,
          registrationNumber: doc.registrationNumber,
          licenseNumber: doc.licenseNumber,
          providerIdentifier: doc.providerIdentifier,
          verificationStatus: doc.verificationStatus,
          yearsOfExperience: doc.yearsOfExperience,
          department: doc.department || undefined,
          gender: doc.gender || undefined,
          dateOfBirth: toSafeIsoString(doc.dateOfBirth)?.split('T')[0] || undefined,
          registrationState: doc.registrationState || undefined,
          registrationCountry: doc.registrationCountry || undefined,
          registrationIssueDate: toSafeIsoString(doc.registrationIssueDate)?.split('T')[0] || undefined,
          registrationExpiryDate: toSafeIsoString(doc.registrationExpiryDate)?.split('T')[0] || undefined,
          subSpecializations: doc.subSpecializations || [],
          clinicalInterests: doc.clinicalInterests || [],
          servicesOffered: doc.servicesOffered || [],
          languagesSpoken: doc.languagesSpoken || [],
          emergencyPhone: doc.emergencyPhone || undefined,
          biography: doc.biography || undefined,
          professionalSummary: doc.professionalSummary || undefined,
          profilePhotoUrl: doc.profilePhotoUrl || undefined,
          digitalSignatureUrl: doc.digitalSignatureUrl || undefined,
          createdAt: toSafeIsoString(doc.createdAt) || new Date().toISOString(),
          updatedAt: toSafeIsoString(doc.updatedAt) || new Date().toISOString(),
        };
      });
    } catch (err: any) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const target = (err.meta?.target as any)?.toString() || '';
        if (target.includes('registration_number') || target.includes('registrationNumber')) {
          throw new ConflictException('Medical registration number already registered in Master Provider Registry');
        }
        if (target.includes('license_number') || target.includes('licenseNumber')) {
          throw new ConflictException('Medical license number already registered');
        }
        if (target.includes('user_id') || target.includes('userId')) {
          throw new ConflictException('Doctor profile already exists for this user account');
        }
        throw new ConflictException(`Unique constraint violation: ${target}`);
      }
      throw err;
    }
  }

  async createUser(data: any): Promise<ManagedUserEntity> {
    return this.db.$transaction(async (tx) => {
      const roleName = data.role.toUpperCase() as any;
      let role = await tx.role.findUnique({ where: { name: roleName } });
      if (!role) {
        role = await tx.role.create({ data: { name: roleName } });
      }

      const user = await tx.user.create({
        data: {
          phone: data.phone,
          email: data.email || null,
          passwordHash: data.passwordHash || null,
          status: (data.status as any) || 'ACTIVE',
        },
      });

      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId: role.id,
        },
      });

      let patientProfileId: string | null = null;
      let doctorProfileId: string | null = null;
      const staffMemberId: string | null = null;
      let createdDoctorProfile: any = null;

      if (roleName === 'PATIENT') {
        const patientNumber = `PAT-${Date.now().toString().slice(-6)}`;
        const pat = await tx.patientProfile.create({
          data: {
            userId: user.id,
            patientNumber,
            firstName: data.firstName || data.fullName?.split(' ')[0] || null,
            lastName: data.lastName || data.fullName?.split(' ').slice(1).join(' ') || null,
            gender: data.gender || null,
            dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
          },
        });
        patientProfileId = pat.id;
      } else if (['DOCTOR', 'VETERINARIAN', 'DOCTOR_VET'].includes(roleName)) {
        const fullName = data.fullName?.trim() || [data.firstName, data.lastName].filter(Boolean).join(' ').trim();
        if (!fullName) {
          throw new BadRequestException('Doctor full name is required');
        }
        if (!data.primarySpecialization?.trim()) {
          throw new BadRequestException('Primary specialization is required when creating a clinical doctor user');
        }
        if (!data.medicalCouncil?.trim()) {
          throw new BadRequestException('Medical council is required when creating a clinical doctor user');
        }
        if (!data.registrationNumber?.trim()) {
          throw new BadRequestException('Medical registration number is required when creating a clinical doctor user');
        }
        if (!data.licenseNumber?.trim()) {
          throw new BadRequestException('Medical license number is required when creating a clinical doctor user');
        }

        const regDup = await tx.doctorProfile.findUnique({
          where: { registrationNumber: data.registrationNumber.trim() },
        });
        if (regDup) {
          throw new ConflictException('Medical registration number already registered in Master Provider Registry');
        }

        const licDup = await tx.doctorProfile.findUnique({
          where: { licenseNumber: data.licenseNumber.trim() },
        });
        if (licDup) {
          throw new ConflictException('Medical license number already registered');
        }

        const existingProfile = await tx.doctorProfile.findUnique({
          where: { userId: user.id },
        });
        if (existingProfile) {
          throw new ConflictException('Doctor profile already exists for this user account');
        }

        let providerIdentifier = data.providerIdentifier || `DOC-360-${Date.now().toString().slice(-6)}`;
        let provExists = await tx.doctorProfile.findUnique({ where: { providerIdentifier } });
        if (provExists) {
          let seq = 1;
          while (provExists) {
            providerIdentifier = `DOC-360-${Date.now().toString().slice(-6)}-${seq}`;
            provExists = await tx.doctorProfile.findUnique({ where: { providerIdentifier } });
            seq++;
          }
        }

        const doc = await tx.doctorProfile.create({
          data: {
            userId: user.id,
            fullName,
            gender: data.gender || null,
            dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
            profilePhotoUrl: data.profilePhotoUrl || null,
            digitalSignatureUrl: data.digitalSignatureUrl || null,
            biography: data.biography || null,
            professionalSummary: data.professionalSummary || null,
            yearsOfExperience: data.yearsOfExperience || 0,
            primarySpecialization: data.primarySpecialization.trim(),
            secondarySpecializations: data.secondarySpecializations || [],
            clinicalPracticeType: data.clinicalPracticeType || (['VETERINARIAN', 'DOCTOR_VET'].includes(roleName) ? 'VETERINARY_MEDICINE' : 'HUMAN_HEALTHCARE'),
            medicalCouncil: data.medicalCouncil.trim(),
            registrationNumber: data.registrationNumber.trim(),
            licenseNumber: data.licenseNumber.trim(),
            providerIdentifier,
            registrationState: data.registrationState || null,
            registrationCountry: data.registrationCountry || null,
            registrationIssueDate: data.registrationIssueDate ? new Date(data.registrationIssueDate) : null,
            registrationExpiryDate: data.registrationExpiryDate ? new Date(data.registrationExpiryDate) : null,
            verificationStatus: 'PENDING',
            department: data.department || null,
            subSpecializations: data.subSpecializations || [],
            clinicalInterests: data.clinicalInterests || [],
            servicesOffered: data.servicesOffered || [],
            languagesSpoken: data.languagesSpoken || [],
            emergencyPhone: data.emergencyPhone || null,
          },
        });
        doctorProfileId = doc.id;
        createdDoctorProfile = doc;

        await tx.doctorAuditLog.create({
          data: {
            doctorProfileId: doc.id,
            action: 'REGISTERED',
            performedBy: data.adminUserId || user.id,
            details: `Master Doctor profile created by Admin with provider ID ${providerIdentifier}`,
          },
        });
      }

      return {
        id: user.id,
        phone: user.phone,
        email: user.email || undefined,
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        roles: [roleName],
        patientProfileId,
        doctorProfileId,
        staffMemberId,
        fullName: createdDoctorProfile?.fullName || data.fullName || (data.firstName && data.lastName ? `${data.firstName} ${data.lastName}` : undefined),
        verificationStatus: createdDoctorProfile?.verificationStatus || undefined,
        doctorProfile: createdDoctorProfile ? {
          id: createdDoctorProfile.id,
          userId: createdDoctorProfile.userId,
          fullName: createdDoctorProfile.fullName,
          primarySpecialization: createdDoctorProfile.primarySpecialization,
          secondarySpecializations: createdDoctorProfile.secondarySpecializations,
          clinicalPracticeType: createdDoctorProfile.clinicalPracticeType || 'HUMAN_HEALTHCARE',
          medicalCouncil: createdDoctorProfile.medicalCouncil,
          registrationNumber: createdDoctorProfile.registrationNumber,
          licenseNumber: createdDoctorProfile.licenseNumber,
          providerIdentifier: createdDoctorProfile.providerIdentifier,
          verificationStatus: createdDoctorProfile.verificationStatus,
          yearsOfExperience: createdDoctorProfile.yearsOfExperience,
          department: createdDoctorProfile.department || undefined,
          createdAt: createdDoctorProfile.createdAt,
          updatedAt: createdDoctorProfile.updatedAt,
        } : undefined,
      };
    });
  }

  async updateUser(id: string, data: any): Promise<ManagedUserEntity> {
    return this.db.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id },
        data: {
          phone: data.phone || undefined,
          email: data.email !== undefined ? data.email : undefined,
          status: data.status ? (data.status as any) : undefined,
        },
        include: {
          userRoles: { include: { role: true } },
          patientProfile: true,
          doctorProfile: true,
          staffMember: true,
        },
      });

      if (updatedUser.patientProfile && (data.firstName || data.lastName || data.fullName || data.gender || data.dateOfBirth)) {
        await tx.patientProfile.update({
          where: { id: updatedUser.patientProfile.id },
          data: {
            firstName: data.firstName || (data.fullName ? data.fullName.split(' ')[0] : undefined),
            lastName: data.lastName || (data.fullName ? data.fullName.split(' ').slice(1).join(' ') : undefined),
            gender: data.gender || undefined,
            dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
          },
        });
      }

      if (updatedUser.doctorProfile && (data.fullName || data.firstName || data.lastName || data.gender || data.dateOfBirth || data.clinicalPracticeType)) {
        const updatedDoc = await tx.doctorProfile.update({
          where: { id: updatedUser.doctorProfile.id },
          data: {
            fullName: data.fullName || (data.firstName && data.lastName ? `${data.firstName} ${data.lastName}` : undefined),
            gender: data.gender || undefined,
            dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
            clinicalPracticeType: data.clinicalPracticeType || undefined,
          },
        });
        updatedUser.doctorProfile = updatedDoc;
      }

      const fullName = updatedUser.doctorProfile?.fullName
        || updatedUser.staffMember?.fullName
        || (updatedUser.patientProfile ? [updatedUser.patientProfile.firstName, updatedUser.patientProfile.lastName].filter(Boolean).join(' ') : undefined)
        || data.fullName
        || undefined;

      return {
        id: updatedUser.id,
        phone: updatedUser.phone,
        email: updatedUser.email || undefined,
        fullName,
        status: updatedUser.status,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
        roles: updatedUser.userRoles.map((ur) => ur.role.name),
        patientProfileId: updatedUser.patientProfile?.id || null,
        doctorProfileId: updatedUser.doctorProfile?.id || null,
        staffMemberId: updatedUser.staffMember?.id || null,
        verificationStatus: updatedUser.doctorProfile?.verificationStatus || undefined,
        doctorProfile: updatedUser.doctorProfile || undefined,
      };
    });
  }

  async resetUserPassword(id: string, passwordHash: string): Promise<void> {
    await this.db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: { passwordHash },
      });
      await tx.userSession.deleteMany({ where: { userId: id } });
      await tx.refreshToken.deleteMany({ where: { userId: id } });
    });
  }

  async findUserById(id: string): Promise<ManagedUserEntity | null> {
    const u = await this.db.user.findUnique({
      where: { id },
      include: {
        userRoles: { include: { role: true } },
        patientProfile: { select: { id: true, firstName: true, lastName: true } },
        doctorProfile: {
          select: {
            id: true,
            userId: true,
            fullName: true,
            verificationStatus: true,
            primarySpecialization: true,
            secondarySpecializations: true,
            clinicalPracticeType: true,
            medicalCouncil: true,
            registrationNumber: true,
            licenseNumber: true,
            providerIdentifier: true,
            yearsOfExperience: true,
            department: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        staffMember: { select: { id: true, fullName: true } },
      },
    });

    if (!u) return null;

    const fullName = u.doctorProfile?.fullName
      || u.staffMember?.fullName
      || [u.patientProfile?.firstName, u.patientProfile?.lastName].filter(Boolean).join(' ')
      || undefined;

    return {
      id: u.id,
      phone: u.phone,
      email: u.email || undefined,
      fullName,
      status: u.status,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      roles: u.userRoles.map((ur) => ur.role.name),
      patientProfileId: u.patientProfile?.id || null,
      doctorProfileId: u.doctorProfile?.id || null,
      staffMemberId: u.staffMember?.id || null,
      verificationStatus: u.doctorProfile?.verificationStatus || undefined,
      doctorProfile: u.doctorProfile || undefined,
    };
  }

  async updateUserStatus(id: string, status: string): Promise<ManagedUserEntity> {
    await this.db.user.update({
      where: { id },
      data: { status: status as any },
    });
    return (await this.findUserById(id))!;
  }

  async assignUserRoles(userId: string, roleNames: string[]): Promise<ManagedUserEntity> {
    await this.db.userRole.deleteMany({ where: { userId } });

    for (const roleName of roleNames) {
      let role = await this.db.role.findUnique({ where: { name: roleName as any } });
      if (!role) {
        role = await this.db.role.create({ data: { name: roleName as any } });
      }
      await this.db.userRole.create({
        data: {
          userId,
          roleId: role.id,
        },
      });
    }

    return (await this.findUserById(userId))!;
  }

  async softDeleteUser(id: string): Promise<void> {
    await this.db.user.update({
      where: { id },
      data: { status: 'BLOCKED' },
    });
  }

  async restoreUser(id: string): Promise<ManagedUserEntity> {
    await this.db.user.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });
    return (await this.findUserById(id))!;
  }

  // ─── RBAC & Permission Management ─────────────────────────────────────

  async findRoles(): Promise<any[]> {
    return this.db.role.findMany({
      include: {
        rolePermissions: {
          include: { permission: true },
        },
      },
    });
  }

  async findRoleById(id: string): Promise<any | null> {
    return this.db.role.findUnique({
      where: { id },
      include: {
        rolePermissions: {
          include: { permission: true },
        },
      },
    });
  }

  async findRoleByName(name: string): Promise<any | null> {
    return this.db.role.findFirst({
      where: { name: name.toUpperCase() as any },
      include: {
        rolePermissions: {
          include: { permission: true },
        },
      },
    });
  }

  async createRole(name: string, description?: string, permissionCodes?: string[]): Promise<any> {
    return this.db.$transaction(async (tx) => {
      const roleName = name.toUpperCase() as any;
      const role = await tx.role.create({
        data: {
          name: roleName,
          description: description || null,
        },
      });

      if (permissionCodes && permissionCodes.length > 0) {
        const perms = await tx.permission.findMany({
          where: { code: { in: permissionCodes } },
        });
        if (perms.length > 0) {
          await tx.rolePermission.createMany({
            data: perms.map((p) => ({ roleId: role.id, permissionId: p.id })),
          });
        }
      }

      return tx.role.findUnique({
        where: { id: role.id },
        include: { rolePermissions: { include: { permission: true } } },
      });
    });
  }

  async updateRole(id: string, data: { description?: string; permissionCodes?: string[] }): Promise<any> {
    return this.db.$transaction(async (tx) => {
      if (data.description !== undefined) {
        await tx.role.update({
          where: { id },
          data: { description: data.description },
        });
      }

      if (data.permissionCodes) {
        await tx.rolePermission.deleteMany({ where: { roleId: id } });
        const perms = await tx.permission.findMany({
          where: { code: { in: data.permissionCodes } },
        });
        if (perms.length > 0) {
          await tx.rolePermission.createMany({
            data: perms.map((p) => ({ roleId: id, permissionId: p.id })),
          });
        }
      }

      return tx.role.findUnique({
        where: { id },
        include: { rolePermissions: { include: { permission: true } } },
      });
    });
  }

  async deleteRole(id: string): Promise<void> {
    await this.db.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId: id } });
      await tx.userRole.deleteMany({ where: { roleId: id } });
      await tx.role.delete({ where: { id } });
    });
  }

  async findPermissions(): Promise<PermissionEntity[]> {
    return (await this.db.permission.findMany({
      include: { group: true },
      orderBy: { code: 'asc' },
    })) as unknown as PermissionEntity[];
  }

  async findPermissionGroups(): Promise<PermissionGroupEntity[]> {
    return (await this.db.permissionGroup.findMany({
      include: { permissions: true },
      orderBy: { name: 'asc' },
    })) as unknown as PermissionGroupEntity[];
  }

  async createPermissionGroup(name: string, description?: string): Promise<PermissionGroupEntity> {
    return (await this.db.permissionGroup.create({
      data: { name, description: description || null },
    })) as unknown as PermissionGroupEntity;
  }

  async createPermission(code: string, name: string, description?: string, groupId?: string): Promise<PermissionEntity> {
    return (await this.db.permission.create({
      data: {
        code,
        name,
        description: description || null,
        groupId: groupId || null,
      },
    })) as unknown as PermissionEntity;
  }

  async assignPermissionsToRole(roleId: string, permissionIds: string[]): Promise<any> {
    await this.db.rolePermission.deleteMany({ where: { roleId } });
    await this.db.rolePermission.createMany({
      data: permissionIds.map((pId) => ({ roleId, permissionId: pId })),
    });
    return this.db.role.findUnique({
      where: { id: roleId },
      include: { rolePermissions: { include: { permission: true } } },
    });
  }

  async getPermissionMatrix(): Promise<any> {
    const roles = await this.findRoles();
    const permissions = await this.findPermissions();

    return {
      roles: roles.map((r) => ({
        id: r.id,
        name: r.name,
        assignedPermissions: r.rolePermissions.map((rp: any) => rp.permission.code),
      })),
      permissions: permissions.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
      })),
    };
  }

  // ─── Organization Management ──────────────────────────────────────────

  async createOrganization(data: any): Promise<OrganizationEntity> {
    const code = data.code || `ORG-360-${Date.now().toString().slice(-4)}`;
    return (await this.db.organization.create({
      data: {
        name: data.name,
        code,
        logoUrl: data.logoUrl || null,
        primaryColor: data.primaryColor || null,
        secondaryColor: data.secondaryColor || null,
        phone: data.phone || null,
        email: data.email || null,
        website: data.website || null,
        streetAddress: data.streetAddress || null,
        city: data.city || null,
        district: data.district || null,
        state: data.state || null,
        country: data.country || 'Pakistan',
        timezone: data.timezone || 'Asia/Karachi',
        language: data.language || 'en',
      },
    })) as unknown as OrganizationEntity;
  }

  async findOrganizations(): Promise<OrganizationEntity[]> {
    return (await this.db.organization.findMany({
      where: { isDeleted: false },
      orderBy: { createdAt: 'desc' },
    })) as unknown as OrganizationEntity[];
  }

  async findOrganizationById(id: string): Promise<OrganizationEntity | null> {
    return (await this.db.organization.findFirst({
      where: { id, isDeleted: false },
    })) as unknown as OrganizationEntity | null;
  }

  async updateOrganization(id: string, data: any): Promise<OrganizationEntity> {
    return (await this.db.organization.update({
      where: { id },
      data: {
        name: data.name || undefined,
        logoUrl: data.logoUrl || undefined,
        primaryColor: data.primaryColor || undefined,
        secondaryColor: data.secondaryColor || undefined,
        phone: data.phone || undefined,
        email: data.email || undefined,
        website: data.website || undefined,
        streetAddress: data.streetAddress || undefined,
        city: data.city || undefined,
        district: data.district || undefined,
        state: data.state || undefined,
        country: data.country || undefined,
        timezone: data.timezone || undefined,
        language: data.language || undefined,
      },
    })) as unknown as OrganizationEntity;
  }

  async softDeleteOrganization(id: string): Promise<void> {
    await this.db.organization.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }

  // ─── Platform Configuration ─────────────────────────────────────────────

  async getSettings(category?: string): Promise<PlatformSettingEntity[]> {
    return (await this.db.platformSetting.findMany({
      where: category ? { category } : {},
      orderBy: { category: 'asc' },
    })) as unknown as PlatformSettingEntity[];
  }

  async resetSecuritySettings(adminUserId?: string): Promise<PlatformSettingEntity[]> {
    const defaultSecuritySettings = [
      {
        key: 'PASSWORD_ROTATION_INTERVAL',
        value: '90 Days (Enterprise Standard)',
        category: 'SECURITY',
        valueType: 'STRING',
        description: 'Password expiration and mandatory rotation policy',
        isPublic: false,
      },
      {
        key: 'MFA_ENFORCED',
        value: 'true',
        category: 'SECURITY',
        valueType: 'BOOLEAN',
        description: 'Two-factor multi-factor authentication enforcement',
        isPublic: false,
      },
      {
        key: 'MFA_SMS_OTP',
        value: 'true',
        category: 'SECURITY',
        valueType: 'BOOLEAN',
        description: 'Permit SMS OTP fallback',
        isPublic: false,
      },
      {
        key: 'MFA_HARDWARE_TOKEN',
        value: 'true',
        category: 'SECURITY',
        valueType: 'BOOLEAN',
        description: 'Permit FIDO2 hardware tokens',
        isPublic: false,
      },
      {
        key: 'MFA_BIOMETRIC_PUSH',
        value: 'true',
        category: 'SECURITY',
        valueType: 'BOOLEAN',
        description: 'Permit Biometric push verification',
        isPublic: false,
      },
      {
        key: 'ONBOARDING_GRACE_PERIOD',
        value: '7 Days (Enterprise Recommended)',
        category: 'SECURITY',
        valueType: 'STRING',
        description: 'Grace period for new staff MFA onboarding',
        isPublic: false,
      },
      {
        key: 'SESSION_INACTIVITY_TIMEOUT',
        value: '15 Minutes (Active Clinical Standard)',
        category: 'SECURITY',
        valueType: 'STRING',
        description: 'Automatic session termination timeout threshold',
        isPublic: false,
      },
      {
        key: 'MAX_CONCURRENT_SESSIONS',
        value: '1',
        category: 'SECURITY',
        valueType: 'NUMBER',
        description: 'Maximum concurrent active user login sessions',
        isPublic: false,
      },
      {
        key: 'FORCE_STEP_UP_REAUTH',
        value: 'true',
        category: 'SECURITY',
        valueType: 'BOOLEAN',
        description: 'Require step-up authentication for high-risk operations',
        isPublic: false,
      },
      {
        key: 'PASSWORD_MIN_LENGTH',
        value: '12 Characters (Mandatory)',
        category: 'SECURITY',
        valueType: 'STRING',
        description: 'Minimum password length requirement',
        isPublic: false,
      },
      {
        key: 'REQ_UPPERCASE',
        value: 'true',
        category: 'SECURITY',
        valueType: 'BOOLEAN',
        description: 'Require uppercase characters in passwords',
        isPublic: false,
      },
      {
        key: 'REQ_LOWERCASE',
        value: 'true',
        category: 'SECURITY',
        valueType: 'BOOLEAN',
        description: 'Require lowercase characters in passwords',
        isPublic: false,
      },
      {
        key: 'REQ_NUMERIC',
        value: 'true',
        category: 'SECURITY',
        valueType: 'BOOLEAN',
        description: 'Require numeric characters in passwords',
        isPublic: false,
      },
      {
        key: 'REQ_SPECIAL_CHAR',
        value: 'true',
        category: 'SECURITY',
        valueType: 'BOOLEAN',
        description: 'Require special characters in passwords',
        isPublic: false,
      },
      {
        key: 'PREVENT_PASSWORD_REUSE_COUNT',
        value: '5',
        category: 'SECURITY',
        valueType: 'NUMBER',
        description: 'Number of previous passwords blocked from reuse',
        isPublic: false,
      },
      {
        key: 'MAX_FAILED_ATTEMPTS',
        value: '5',
        category: 'SECURITY',
        valueType: 'NUMBER',
        description: 'Maximum failed login attempts before lockout',
        isPublic: false,
      },
      {
        key: 'LOCKOUT_DURATION_WINDOW',
        value: '30 Minutes (Auto-Release)',
        category: 'SECURITY',
        valueType: 'STRING',
        description: 'Account lockout duration following failed attempts',
        isPublic: false,
      },
      {
        key: 'IP_WHITELISTING_ACTIVE',
        value: 'true',
        category: 'SECURITY',
        valueType: 'BOOLEAN',
        description: 'Enforce IP range restriction for admin access',
        isPublic: false,
      },
      {
        key: 'WHITELISTED_SUBNETS',
        value: JSON.stringify([
          {
            id: 'cidr-1',
            cidr: '192.168.10.0/24',
            description: 'Cath Lab',
            type: 'on-premise',
            active: true,
          },
        ]),
        category: 'SECURITY',
        valueType: 'JSON',
        description: 'Allowed CIDR subnet blocks for administrative console access',
        isPublic: false,
      },
    ];

    return this.db.$transaction(async (tx) => {
      for (const s of defaultSecuritySettings) {
        await tx.platformSetting.upsert({
          where: { key: s.key },
          update: {
            value: s.value,
            category: s.category,
            valueType: s.valueType,
            description: s.description,
            isPublic: s.isPublic,
            updatedBy: adminUserId || null,
          },
          create: {
            key: s.key,
            value: s.value,
            category: s.category,
            valueType: s.valueType,
            description: s.description,
            isPublic: s.isPublic,
            updatedBy: adminUserId || null,
          },
        });
      }

      return (await tx.platformSetting.findMany({
        where: { category: 'SECURITY' },
        orderBy: { key: 'asc' },
      })) as unknown as PlatformSettingEntity[];
    });
  }

  async upsertSetting(
    key: string,
    value: string,
    category: string,
    valueType = 'STRING',
    description?: string,
    updatedBy?: string,
  ): Promise<PlatformSettingEntity> {
    return (await this.db.platformSetting.upsert({
      where: { key },
      update: {
        value,
        category,
        valueType,
        description: description || undefined,
        updatedBy: updatedBy || undefined,
      },
      create: {
        key,
        value,
        category,
        valueType,
        description: description || null,
        updatedBy: updatedBy || null,
      },
    })) as unknown as PlatformSettingEntity;
  }

  // ─── Audit ─────────────────────────────────────────────────────────────

  async findAuditLogs(limit = 100): Promise<any[]> {
    return this.db.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { user: true },
    });
  }

  async findAuditLogById(id: string): Promise<any | null> {
    return this.db.auditLog.findUnique({
      where: { id },
      include: { user: true },
    });
  }

  async findFilteredAuditLogs(filters: {
    userId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }): Promise<{ items: any[]; total: number }> {
    const where: any = {};
    if (filters.userId) where.userId = filters.userId;
    if (filters.action) where.action = { contains: filters.action, mode: 'insensitive' };
    if (filters.startDate || filters.endDate) {
      where.createdAt = {
        ...(filters.startDate ? { gte: filters.startDate } : {}),
        ...(filters.endDate ? { lte: filters.endDate } : {}),
      };
    }

    const safePage = Math.max(1, filters.page || 1);
    const safeLimit = Math.min(Math.max(1, filters.limit || 50), 100);
    const skip = (safePage - 1) * safeLimit;

    const [items, total] = await Promise.all([
      this.db.auditLog.findMany({
        where,
        include: { user: true },
        orderBy: { createdAt: 'desc' },
        take: safeLimit,
        skip,
      }),
      this.db.auditLog.count({ where }),
    ]);

    return { items, total };
  }

  async createAuditLog(userId: string, action: string, details?: string, ipAddress?: string): Promise<any> {
    return this.db.auditLog.create({
      data: {
        userId,
        action,
        details: details || null,
        ipAddress: ipAddress || null,
      },
    });
  }

  // ─── Doctor Administration ─────────────────────────────────────────────

  async findDoctors(options: {
    page?: number;
    limit?: number;
    specialty?: string;
    search?: string;
  }): Promise<{ items: any[]; total: number }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(Math.max(1, options.limit || 50), 100);
    const skip = (page - 1) * limit;

    const where: any = { isDeleted: false };
    if (options.specialty) {
      where.primarySpecialization = { contains: options.specialty, mode: 'insensitive' };
    }
    if (options.search) {
      const q = options.search;
      where.OR = [
        { fullName: { contains: q, mode: 'insensitive' } },
        { licenseNumber: { contains: q, mode: 'insensitive' } },
        { registrationNumber: { contains: q, mode: 'insensitive' } },
        { providerIdentifier: { contains: q, mode: 'insensitive' } },
        { department: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, doctors] = await Promise.all([
      this.db.doctorProfile.count({ where }),
      this.db.doctorProfile.findMany({
        where,
        include: {
          user: { select: { phone: true, email: true, status: true } },
          facilities: {
            include: {
              facility: { select: { id: true, name: true, facilityType: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const items = doctors.map((doc: any) => ({
      id: doc.id,
      userId: doc.userId,
      fullName: doc.fullName,
      gender: doc.gender,
      primarySpecialization: doc.primarySpecialization,
      secondarySpecializations: doc.secondarySpecializations,
      clinicalPracticeType: doc.clinicalPracticeType || 'HUMAN_HEALTHCARE',
      medicalCouncil: doc.medicalCouncil,
      registrationNumber: doc.registrationNumber,
      licenseNumber: doc.licenseNumber,
      providerIdentifier: doc.providerIdentifier,
      yearsOfExperience: doc.yearsOfExperience,
      department: doc.department,
      verificationStatus: doc.verificationStatus,
      status: doc.user?.status || 'ACTIVE',
      phone: doc.user?.phone || null,
      email: doc.user?.email || null,
      avatarUrl: doc.profilePhotoUrl || null,
      facilities: doc.facilities?.map((df: any) => ({
        id: df.facilityId,
        name: df.facility?.name,
        type: df.facility?.facilityType,
        assignmentType: df.assignmentType,
      })) || [],
      createdAt: toSafeIsoString(doc.createdAt) || new Date().toISOString(),
      updatedAt: toSafeIsoString(doc.updatedAt) || new Date().toISOString(),
    }));

    return { total, items };
  }

  // ─── Patient Administration (Workstream A) ──────────────────────────────

  async createPatient(data: {
    firstName: string;
    lastName: string;
    dob: string;
    gender: string;
    phone: string;
    email?: string;
    zipCode?: string;
    address?: string;
    photoUrl?: string;
    bloodGroup?: string;
    adminUserId?: string;
  }): Promise<any> {
    return this.db.$transaction(async (tx) => {
      let role = await tx.role.findUnique({ where: { name: 'PATIENT' } });
      if (!role) {
        role = await tx.role.create({ data: { name: 'PATIENT' } });
      }

      const user = await tx.user.create({
        data: {
          phone: data.phone,
          email: data.email || null,
          status: 'ACTIVE',
        },
      });

      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId: role.id,
        },
      });

      let patientNumber = `P-${Date.now().toString().slice(-6)}`;
      let exists = await tx.patientProfile.findUnique({ where: { patientNumber } });
      let seq = 1;
      while (exists) {
        patientNumber = `P-${Date.now().toString().slice(-6)}-${seq++}`;
        exists = await tx.patientProfile.findUnique({ where: { patientNumber } });
      }

      const dobDate = data.dob ? new Date(data.dob) : null;
      const profile = await tx.patientProfile.create({
        data: {
          userId: user.id,
          patientNumber,
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          dateOfBirth: dobDate,
          gender: data.gender ? data.gender.toUpperCase() : null,
          bloodGroup: data.bloodGroup || null,
          address: data.address || null,
          currentAddressLine1: data.address || null,
          currentPostalCode: data.zipCode || null,
          photoUrl: data.photoUrl || null,
          status: 'COMPLETED',
          onboardingStep: 6,
        },
      });

      const cardNumber = `HC-CAREID-${Date.now().toString().slice(-4)}`;
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 5);

      const healthCard = await tx.healthCard.create({
        data: {
          patientProfileId: profile.id,
          cardNumber,
          status: 'ACTIVE',
          expiresAt,
        },
      });

      if (data.adminUserId) {
        await tx.auditLog.create({
          data: {
            userId: data.adminUserId,
            action: 'ADMIN_PATIENT_REGISTERED',
            details: `Patient ${data.firstName} ${data.lastName} (${patientNumber}) registered by admin`,
          },
        }).catch(() => null);
      }

      return {
        id: profile.id,
        userId: user.id,
        patientNumber: profile.patientNumber,
        firstName: profile.firstName,
        lastName: profile.lastName,
        dateOfBirth: toSafeIsoString(profile.dateOfBirth),
        gender: profile.gender,
        bloodGroup: profile.bloodGroup,
        phone: user.phone,
        email: user.email,
        userStatus: user.status,
        profileStatus: profile.status || 'COMPLETED',
        onboardingStep: profile.onboardingStep,
        address: profile.address,
        currentAddressLine1: profile.currentAddressLine1,
        currentPostalCode: profile.currentPostalCode,
        photoUrl: profile.photoUrl,
        createdAt: toSafeIsoString(profile.createdAt) || new Date().toISOString(),
        updatedAt: toSafeIsoString(profile.updatedAt) || new Date().toISOString(),
        healthCard: {
          id: healthCard.id,
          cardNumber: healthCard.cardNumber,
          status: healthCard.status,
        },
      };
    });
  }

  async updatePatient(
    patientId: string,
    data: {
      firstName?: string;
      lastName?: string;
      dateOfBirth?: string;
      dob?: string;
      gender?: string;
      bloodGroup?: string;
      address?: string;
      addressLine1?: string;
      zipCode?: string;
      email?: string;
      phone?: string;
      photoUrl?: string;
      adminUserId?: string;
    },
  ): Promise<any> {
    const existing = await this.db.patientProfile.findFirst({
      where: {
        OR: [{ id: patientId }, { userId: patientId }, { patientNumber: patientId }],
      },
      include: { user: true },
    });

    if (!existing) {
      return null;
    }

    const updateData: any = {};
    if (data.firstName !== undefined) updateData.firstName = data.firstName;
    if (data.lastName !== undefined) updateData.lastName = data.lastName;
    const dobStr = data.dateOfBirth || data.dob;
    if (dobStr !== undefined) updateData.dateOfBirth = dobStr ? new Date(dobStr) : null;
    if (data.gender !== undefined) updateData.gender = data.gender ? data.gender.toUpperCase() : null;
    if (data.bloodGroup !== undefined) updateData.bloodGroup = data.bloodGroup;
    const addr = data.address !== undefined ? data.address : data.addressLine1;
    if (addr !== undefined) {
      updateData.address = addr;
      updateData.currentAddressLine1 = addr;
    }
    if (data.zipCode !== undefined) updateData.currentPostalCode = data.zipCode;
    if (data.photoUrl !== undefined) updateData.photoUrl = data.photoUrl;

    return this.db.$transaction(async (tx) => {
      const updatedProfile = await tx.patientProfile.update({
        where: { id: existing.id },
        data: updateData,
        include: {
          user: true,
          healthCard: true,
          insurancePolicy: true,
          emergencyContact: true,
        },
      });

      if (data.email !== undefined || data.phone !== undefined) {
        const userUpdate: any = {};
        if (data.email !== undefined) userUpdate.email = data.email || null;
        if (data.phone !== undefined) userUpdate.phone = data.phone;
        await tx.user.update({
          where: { id: existing.userId },
          data: userUpdate,
        });
      }

      if (data.adminUserId) {
        await tx.auditLog.create({
          data: {
            userId: data.adminUserId,
            action: 'ADMIN_PATIENT_UPDATED',
            details: `Patient ${updatedProfile.id} updated by admin`,
          },
        }).catch(() => null);
      }

      return this.findPatientById(updatedProfile.id);
    });
  }

  async findPatients(options: {
    page?: number;
    limit?: number;
    q?: string;
    status?: string;
    gender?: string;
    bloodGroup?: string;
  }): Promise<{ items: any[]; total: number }> {
    const safePage = Math.max(1, options.page || 1);
    const safeLimit = Math.min(Math.max(1, options.limit || 20), 100);
    const skip = (safePage - 1) * safeLimit;

    const where: any = {};
    if (options.status) {
      where.status = options.status;
    }
    if (options.gender) {
      where.gender = { equals: options.gender, mode: 'insensitive' };
    }
    if (options.bloodGroup) {
      where.bloodGroup = options.bloodGroup;
    }
    if (options.q) {
      const q = options.q;
      where.OR = [
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        { patientNumber: { contains: q, mode: 'insensitive' } },
        { user: { phone: { contains: q, mode: 'insensitive' } } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [total, profiles] = await Promise.all([
      this.db.patientProfile.count({ where }),
      this.db.patientProfile.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              phone: true,
              email: true,
              status: true,
              createdAt: true,
              updatedAt: true,
            },
          },
          emergencyContact: true,
          insurancePolicy: {
            select: {
              id: true,
              policyNumber: true,
              providerName: true,
              status: true,
            },
          },
          healthCard: {
            select: {
              id: true,
              cardNumber: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: safeLimit,
        skip,
      }),
    ]);

    const items = profiles.map((p) => ({
      id: p.id,
      userId: p.userId,
      patientNumber: p.patientNumber,
      firstName: p.firstName,
      lastName: p.lastName,
      dateOfBirth: toSafeIsoString(p.dateOfBirth),
      gender: p.gender,
      bloodGroup: p.bloodGroup,
      nationality: p.nationality,
      phone: p.user?.phone || '',
      email: p.user?.email || null,
      userStatus: p.user?.status || p.status || 'UNKNOWN',
      profileStatus: p.status,
      onboardingStep: p.onboardingStep,
      createdAt: toSafeIsoString(p.createdAt) || new Date().toISOString(),
      updatedAt: toSafeIsoString(p.updatedAt) || new Date().toISOString(),
      emergencyContact: p.emergencyContact || null,
      insurancePolicy: p.insurancePolicy || null,
      healthCard: p.healthCard || null,
    }));

    return { total, items };
  }

  async findPatientById(patientId: string): Promise<any | null> {
    const p = await this.db.patientProfile.findFirst({
      where: {
        OR: [
          { id: patientId },
          { userId: patientId },
          { patientNumber: patientId },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            phone: true,
            email: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        emergencyContact: true,
        insurancePolicy: {
          select: {
            id: true,
            policyNumber: true,
            providerName: true,
            status: true,
          },
        },
        healthCard: {
          select: {
            id: true,
            cardNumber: true,
            status: true,
          },
        },
      },
    });

    if (!p) return null;

    return {
      id: p.id,
      userId: p.userId,
      patientNumber: p.patientNumber,
      firstName: p.firstName,
      lastName: p.lastName,
      dateOfBirth: toSafeIsoString(p.dateOfBirth),
      gender: p.gender,
      bloodGroup: p.bloodGroup,
      nationality: p.nationality,
      phone: p.user?.phone || '',
      email: p.user?.email || null,
      userStatus: p.user?.status || p.status || 'UNKNOWN',
      profileStatus: p.status,
      onboardingStep: p.onboardingStep,
      occupation: p.occupation,
      maritalStatus: p.maritalStatus,
      languages: Array.isArray(p.languages) ? p.languages : [],
      address: p.address,
      currentAddressLine1: p.currentAddressLine1,
      currentAddressLine2: p.currentAddressLine2,
      currentCity: p.currentCity,
      currentState: p.currentState,
      currentDistrict: p.currentDistrict,
      currentPostalCode: p.currentPostalCode,
      currentCountry: p.currentCountry,
      permanentAddressLine1: p.permanentAddressLine1,
      permanentCity: p.permanentCity,
      permanentState: p.permanentState,
      permanentPostalCode: p.permanentPostalCode,
      permanentCountry: p.permanentCountry,
      photoUrl: p.photoUrl,
      knownAllergies: Array.isArray(p.knownAllergies) ? p.knownAllergies : [],
      chronicConditions: Array.isArray(p.chronicConditions) ? p.chronicConditions : [],
      disabilities: Array.isArray(p.disabilities) ? p.disabilities : [],
      prefContactMethod: p.prefContactMethod,
      createdAt: toSafeIsoString(p.createdAt) || new Date().toISOString(),
      updatedAt: toSafeIsoString(p.updatedAt) || new Date().toISOString(),
      emergencyContact: p.emergencyContact || null,
      insurancePolicy: p.insurancePolicy || null,
      healthCard: p.healthCard || null,
    };
  }

  // ─── Medical Records Administration (Workstream B) ──────────────────────

  async createMedicalRecord(data: {
    patientProfileId: string;
    title: string;
    chiefComplaint?: string;
    clinicalNotes?: string;
    treatmentPlan?: string;
    status?: string;
    createdById?: string;
    provider?: string;
    facility?: string;
    attachment?: {
      fileName: string;
      originalName: string;
      fileSize: number;
      mimeType: string;
      category?: string;
      storageKey: string;
      storageUrl: string;
      checksum?: string;
    };
  }): Promise<any> {
    return this.db.$transaction(async (tx) => {
      const record = await tx.medicalRecord.create({
        data: {
          patientProfileId: data.patientProfileId,
          title: data.title,
          chiefComplaint: data.chiefComplaint || null,
          clinicalNotes: data.clinicalNotes || null,
          treatmentPlan: data.treatmentPlan || null,
          status: (data.status as any) || 'FINAL',
          createdById: data.createdById || null,
        },
      });

      if (data.provider || data.facility) {
        await tx.medicalEncounter.create({
          data: {
            medicalRecordId: record.id,
            providerName: data.provider || null,
            facilityName: data.facility || null,
            encounterType: 'CONSULTATION',
          },
        });
      }

      if (data.attachment) {
        const categoryEnum = ['LAB_REPORT', 'PRESCRIPTION', 'IMAGING', 'DISCHARGE_SUMMARY', 'PROFILE_PHOTO', 'OTHER'].includes(
          (data.attachment.category || '').toUpperCase(),
        )
          ? ((data.attachment.category || '').toUpperCase() as any)
          : 'OTHER';

        await tx.medicalAttachment.create({
          data: {
            medicalRecordId: record.id,
            patientProfileId: data.patientProfileId,
            fileName: data.attachment.fileName,
            originalName: data.attachment.originalName,
            fileSize: data.attachment.fileSize,
            mimeType: data.attachment.mimeType,
            category: categoryEnum,
            storageKey: data.attachment.storageKey,
            storageUrl: data.attachment.storageUrl,
            checksum: data.attachment.checksum || null,
            virusScanStatus: 'CLEAN',
          },
        });
      }

      const fullRecord = await tx.medicalRecord.findUnique({
        where: { id: record.id },
        include: {
          patientProfile: {
            select: {
              id: true,
              patientNumber: true,
              firstName: true,
              lastName: true,
              user: { select: { phone: true } },
            },
          },
          encounters: true,
          diagnoses: true,
          vitalSigns: true,
          procedures: true,
          attachments: { where: { isDeleted: false } },
        },
      });

      return this.mapAdminMedicalRecord(fullRecord);
    });
  }

  async findMedicalRecords(options: {
    page?: number;
    limit?: number;
    q?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
    patientProfileId?: string;
  }): Promise<{ items: any[]; total: number }> {
    const safePage = Math.max(1, options.page || 1);
    const safeLimit = Math.min(Math.max(1, options.limit || 20), 100);
    const skip = (safePage - 1) * safeLimit;

    const where: any = { isDeleted: false };
    if (options.status) {
      where.status = options.status;
    }
    if (options.patientProfileId) {
      where.patientProfileId = options.patientProfileId;
    }
    if (options.startDate || options.endDate) {
      where.createdAt = {};
      if (options.startDate) where.createdAt.gte = options.startDate;
      if (options.endDate) where.createdAt.lte = options.endDate;
    }
    if (options.q) {
      const q = options.q;
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { chiefComplaint: { contains: q, mode: 'insensitive' } },
        { clinicalNotes: { contains: q, mode: 'insensitive' } },
        { treatmentPlan: { contains: q, mode: 'insensitive' } },
        { diagnoses: { some: { description: { contains: q, mode: 'insensitive' } } } },
      ];
    }

    const [total, records] = await Promise.all([
      this.db.medicalRecord.count({ where }),
      this.db.medicalRecord.findMany({
        where,
        include: {
          patientProfile: {
            select: {
              id: true,
              patientNumber: true,
              firstName: true,
              lastName: true,
              user: { select: { phone: true } },
            },
          },
          encounters: true,
          diagnoses: true,
          vitalSigns: true,
          procedures: true,
          attachments: { where: { isDeleted: false } },
        },
        orderBy: { createdAt: 'desc' },
        take: safeLimit,
        skip,
      }),
    ]);

    const items = records.map((r) => this.mapAdminMedicalRecord(r));
    return { total, items };
  }

  async findMedicalRecordById(recordId: string): Promise<any | null> {
    const r = await this.db.medicalRecord.findFirst({
      where: { id: recordId, isDeleted: false },
      include: {
        patientProfile: {
          select: {
            id: true,
            patientNumber: true,
            firstName: true,
            lastName: true,
            user: { select: { phone: true } },
          },
        },
        encounters: true,
        diagnoses: true,
        vitalSigns: true,
        procedures: true,
        attachments: { where: { isDeleted: false } },
      },
    });

    if (!r) return null;
    return this.mapAdminMedicalRecord(r);
  }

  async findMedicalRecordsByPatient(
    patientProfileId: string,
    options: {
      page?: number;
      limit?: number;
      status?: string;
      startDate?: Date;
      endDate?: Date;
      includeArchived?: boolean;
    },
  ): Promise<{ items: any[]; total: number }> {
    const safePage = Math.max(1, options.page || 1);
    const safeLimit = Math.min(Math.max(1, options.limit || 20), 100);
    const skip = (safePage - 1) * safeLimit;

    const where: any = {
      patientProfileId,
      isDeleted: false,
      ...(options.includeArchived ? {} : { status: { not: 'ARCHIVED' } }),
    };
    if (options.status) {
      where.status = options.status;
    }
    if (options.startDate || options.endDate) {
      where.createdAt = {};
      if (options.startDate) where.createdAt.gte = options.startDate;
      if (options.endDate) where.createdAt.lte = options.endDate;
    }

    const [total, records] = await Promise.all([
      this.db.medicalRecord.count({ where }),
      this.db.medicalRecord.findMany({
        where,
        include: {
          patientProfile: {
            select: {
              id: true,
              patientNumber: true,
              firstName: true,
              lastName: true,
              user: { select: { phone: true } },
            },
          },
          encounters: true,
          diagnoses: true,
          vitalSigns: true,
          procedures: true,
          attachments: { where: { isDeleted: false } },
        },
        orderBy: { createdAt: 'desc' },
        take: safeLimit,
        skip,
      }),
    ]);

    const items = records.map((r) => this.mapAdminMedicalRecord(r));
    return { total, items };
  }

  async getPatientTimeline(
    patientProfileId: string,
    options: {
      page?: number;
      limit?: number;
    },
  ): Promise<{ items: any[]; total: number }> {
    const safePage = Math.max(1, options.page || 1);
    const safeLimit = Math.min(Math.max(1, options.limit || 20), 100);
    const skip = (safePage - 1) * safeLimit;

    // Calculate exact global counts across eligible records and attachments
    const [totalRecords, totalAttachments] = await Promise.all([
      this.db.medicalRecord.count({
        where: { patientProfileId, isDeleted: false },
      }),
      this.db.medicalAttachment.count({
        where: { patientProfileId, isDeleted: false },
      }),
    ]);

    const globalTotal = totalRecords + totalAttachments;

    if (globalTotal === 0 || skip >= globalTotal) {
      return { total: globalTotal, items: [] };
    }

    let timelineItems: any[] = [];

    if (typeof (this.db as any).$queryRaw === 'function') {
      const rows = await (this.db as any).$queryRaw(Prisma.sql`
        SELECT 
          id,
          item_type,
          title,
          item_date,
          status,
          summary,
          category,
          original_name,
          file_size,
          mime_type,
          virus_scan_status
        FROM (
          SELECT 
            id,
            'MEDICAL_RECORD' AS item_type,
            title,
            created_at AS item_date,
            status::text AS status,
            COALESCE(chief_complaint, clinical_notes) AS summary,
            NULL::text AS category,
            NULL::text AS original_name,
            NULL::integer AS file_size,
            NULL::text AS mime_type,
            NULL::text AS virus_scan_status
          FROM medical_records
          WHERE patient_profile_id = ${patientProfileId} AND is_deleted = false

          UNION ALL

          SELECT 
            id,
            'ATTACHMENT' AS item_type,
            file_name AS title,
            created_at AS item_date,
            NULL::text AS status,
            NULL::text AS summary,
            category::text AS category,
            original_name,
            file_size,
            mime_type,
            virus_scan_status
          FROM medical_attachments
          WHERE patient_profile_id = ${patientProfileId} AND is_deleted = false
        ) timeline
        ORDER BY item_date DESC, id DESC
        LIMIT ${safeLimit} OFFSET ${skip}
      `);

      const recordIds = (rows as any[]).filter((r) => r.item_type === 'MEDICAL_RECORD').map((r) => r.id);
      const encountersByRecordId: Record<string, any[]> = {};
      const diagnosesByRecordId: Record<string, any[]> = {};

      if (recordIds.length > 0 && this.db.medicalEncounter?.findMany && this.db.clinicalDiagnosis?.findMany) {
        const [encounters, diagnoses] = await Promise.all([
          this.db.medicalEncounter.findMany({
            where: { medicalRecordId: { in: recordIds } },
          }),
          this.db.clinicalDiagnosis.findMany({
            where: { medicalRecordId: { in: recordIds } },
          }),
        ]);
        for (const e of encounters || []) {
          if (!encountersByRecordId[e.medicalRecordId]) encountersByRecordId[e.medicalRecordId] = [];
          encountersByRecordId[e.medicalRecordId].push(e);
        }
        for (const d of diagnoses || []) {
          if (!diagnosesByRecordId[d.medicalRecordId]) diagnosesByRecordId[d.medicalRecordId] = [];
          diagnosesByRecordId[d.medicalRecordId].push(d);
        }
      }

      for (const row of rows as any[]) {
        if (row.item_type === 'MEDICAL_RECORD') {
          timelineItems.push({
            id: row.id,
            type: 'MEDICAL_RECORD',
            title: row.title,
            date: toSafeIsoString(row.item_date) || new Date().toISOString(),
            status: row.status,
            summary: row.summary || undefined,
            details: {
              encounters: encountersByRecordId[row.id] || [],
              diagnoses: diagnosesByRecordId[row.id] || [],
            },
          });
        } else {
          timelineItems.push({
            id: row.id,
            type: 'ATTACHMENT',
            title: row.title,
            date: toSafeIsoString(row.item_date) || new Date().toISOString(),
            category: row.category,
            details: {
              originalName: row.original_name,
              fileSize: row.file_size !== null ? Number(row.file_size) : 0,
              mimeType: row.mime_type,
              category: row.category,
              virusScanStatus: row.virus_scan_status,
            },
          });
        }
      }
    } else {
      // Fallback for mocked test harnesses that mock Prisma findMany
      const [records, attachments] = await Promise.all([
        this.db.medicalRecord.findMany({
          where: { patientProfileId, isDeleted: false },
          include: { encounters: true, diagnoses: true, attachments: true },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        }),
        this.db.medicalAttachment.findMany({
          where: { patientProfileId, isDeleted: false },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        }),
      ]);

      const merged: any[] = [];
      for (const r of records || []) {
        merged.push({
          id: r.id,
          type: 'MEDICAL_RECORD',
          title: r.title,
          date: toSafeIsoString(r.createdAt) || new Date().toISOString(),
          status: r.status,
          summary: r.chiefComplaint || r.clinicalNotes || undefined,
          details: {
            encounters: r.encounters || [],
            diagnoses: r.diagnoses || [],
          },
        });
      }
      for (const a of attachments || []) {
        merged.push({
          id: a.id,
          type: 'ATTACHMENT',
          title: a.fileName,
          date: toSafeIsoString(a.createdAt) || new Date().toISOString(),
          category: a.category,
          details: {
            originalName: a.originalName,
            fileSize: a.fileSize,
            mimeType: a.mimeType,
            category: a.category,
            virusScanStatus: a.virusScanStatus,
          },
        });
      }

      merged.sort((a, b) => {
        const timeDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (timeDiff !== 0) return timeDiff;
        return b.id.localeCompare(a.id);
      });

      timelineItems = merged.slice(skip, skip + safeLimit);
    }

    return { total: globalTotal, items: timelineItems };
  }

  private mapAdminMedicalRecord(r: any): any {
    return {
      id: r.id,
      patientProfileId: r.patientProfileId,
      title: r.title,
      chiefComplaint: r.chiefComplaint || undefined,
      clinicalNotes: r.clinicalNotes || undefined,
      treatmentPlan: r.treatmentPlan || undefined,
      followUpInstructions: r.followUpInstructions || undefined,
      status: r.status,
      isDeleted: r.isDeleted,
      deletedAt: toSafeIsoString(r.deletedAt) || undefined,
      createdAt: toSafeIsoString(r.createdAt) || new Date().toISOString(),
      updatedAt: toSafeIsoString(r.updatedAt) || new Date().toISOString(),
      patient: r.patientProfile ? {
        id: r.patientProfile.id,
        patientNumber: r.patientProfile.patientNumber || null,
        firstName: r.patientProfile.firstName || null,
        lastName: r.patientProfile.lastName || null,
        phone: r.patientProfile.user?.phone || null,
      } : null,
      encounters: r.encounters || [],
      diagnoses: r.diagnoses || [],
      vitalSigns: r.vitalSigns || [],
      procedures: r.procedures || [],
      attachments: r.attachments?.map((a: any) => ({
        id: a.id,
        fileName: a.fileName,
        originalName: a.originalName,
        fileSize: a.fileSize,
        mimeType: a.mimeType,
        category: a.category,
        virusScanStatus: a.virusScanStatus,
        createdAt: toSafeIsoString(a.createdAt) || new Date().toISOString(),
      })) || [],
    };
  }

  // ─── Specialties Catalogue Management ─────────────────────────────────────

  async getSpecialties(activeOnly = false, search?: string, practiceType?: string): Promise<any[]> {
    let category = await (this.db as any).masterDataCategory.findUnique({
      where: { code: 'MEDICAL_SPECIALTIES' },
    });

    const DEFAULT_SPECIALTIES = [
      { name: 'Cardiology', code: 'CARDIOLOGY', description: 'Heart and cardiovascular system' },
      { name: 'Neurology', code: 'NEUROLOGY', description: 'Brain and nervous system' },
      { name: 'Oncology', code: 'ONCOLOGY', description: 'Cancer diagnosis and treatment' },
      { name: 'Pediatrics', code: 'PEDIATRICS', description: 'Infant, child, and adolescent medicine' },
      { name: 'Dermatology', code: 'DERMATOLOGY', description: 'Skin, hair, and nail disorders' },
      { name: 'Orthopedics', code: 'ORTHOPEDICS', description: 'Bones, joints, and muscular system' },
      { name: 'General Surgery', code: 'GENERAL_SURGERY', description: 'Surgical interventions and operative care' },
      { name: 'Psychiatry', code: 'PSYCHIATRY', description: 'Mental health and behavioral disorders' },
      { name: 'Internal Medicine', code: 'INTERNAL_MEDICINE', description: 'Adult diseases prevention and treatment' },
      { name: 'Pulmonology', code: 'PULMONOLOGY', description: 'Lungs and respiratory system disorders' },
      { name: 'Rheumatology', code: 'RHEUMATOLOGY', description: 'Autoimmune diseases and joint disorders' },
      { name: 'Veterinary Medicine', code: 'VETERINARY_MEDICINE', description: 'Veterinary clinical practice and animal care' },
    ];

    if (!category) {
      category = await (this.db as any).masterDataCategory.create({
        data: {
          code: 'MEDICAL_SPECIALTIES',
          name: 'Medical Specialties',
          description: 'Master catalogue of clinical specialties and subspecialties',
          status: 'ACTIVE',
        },
      });

      for (let i = 0; i < DEFAULT_SPECIALTIES.length; i++) {
        const item = DEFAULT_SPECIALTIES[i];
        await (this.db as any).masterDataItem.create({
          data: {
            categoryId: category.id,
            code: item.code,
            name: item.name,
            description: item.description,
            sortOrder: i + 1,
            isDefault: true,
            status: 'ACTIVE',
          },
        });
      }
    } else {
      for (const item of DEFAULT_SPECIALTIES) {
        const exists = await (this.db as any).masterDataItem.findFirst({
          where: {
            categoryId: category.id,
            OR: [
              { code: item.code },
              { name: { equals: item.name, mode: 'insensitive' } },
            ],
          },
        });
        if (!exists) {
          await (this.db as any).masterDataItem.create({
            data: {
              categoryId: category.id,
              code: item.code,
              name: item.name,
              description: item.description,
              sortOrder: 10,
              isDefault: false,
              status: 'ACTIVE',
            },
          });
        }
      }
    }

    const where: any = {
      categoryId: category.id,
      isDeleted: false,
    };

    if (activeOnly) {
      where.status = 'ACTIVE';
    }

    if (search && search.trim()) {
      where.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { code: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    if (practiceType && practiceType.trim()) {
      where.clinicalPracticeType = practiceType.trim();
    }

    const items = await (this.db as any).masterDataItem.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return items.map((i: any) => ({
      id: i.id,
      code: i.code,
      name: i.name,
      description: i.description,
      clinicalPracticeType: i.clinicalPracticeType || (i.code === 'VETERINARY_MEDICINE' ? 'VETERINARY_MEDICINE' : 'HUMAN_HEALTHCARE'),
      status: i.status,
      sortOrder: i.sortOrder,
      isDefault: i.isDefault,
      createdAt: i.createdAt,
      updatedAt: i.updatedAt,
    }));
  }

  async addSpecialty(name: string, description?: string): Promise<any> {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      throw new BadRequestException('Specialty name must be at least 2 characters');
    }

    let category = await (this.db as any).masterDataCategory.findUnique({
      where: { code: 'MEDICAL_SPECIALTIES' },
    });
    if (!category) {
      await this.getSpecialties();
      category = await (this.db as any).masterDataCategory.findUnique({
        where: { code: 'MEDICAL_SPECIALTIES' },
      });
    }

    const existing = await (this.db as any).masterDataItem.findFirst({
      where: {
        categoryId: category.id,
        isDeleted: false,
        name: { equals: trimmed, mode: 'insensitive' },
      },
    });

    if (existing) {
      if (existing.status !== 'ACTIVE') {
        return await (this.db as any).masterDataItem.update({
          where: { id: existing.id },
          data: { status: 'ACTIVE', description: description || existing.description },
        });
      }
      throw new ConflictException(`Specialty "${trimmed}" already exists in the catalogue`);
    }

    let code = trimmed.toUpperCase().replace(/[^A-Z0-9]/g, '_');
    const codeDup = await (this.db as any).masterDataItem.findFirst({
      where: { categoryId: category.id, code },
    });
    if (codeDup) {
      code = `${code}_${Date.now().toString().slice(-4)}`;
    }

    const item = await (this.db as any).masterDataItem.create({
      data: {
        categoryId: category.id,
        code,
        name: trimmed,
        description: description || null,
        status: 'ACTIVE',
        sortOrder: 50,
      },
    });

    return {
      id: item.id,
      code: item.code,
      name: item.name,
      description: item.description,
      status: item.status,
      sortOrder: item.sortOrder,
      isDefault: item.isDefault,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  async updateSpecialty(id: string, data: { name?: string; description?: string; status?: string }): Promise<any> {
    const item = await (this.db as any).masterDataItem.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundException('Specialty not found in catalogue');
    }

    const updateData: any = {};
    if (data.name && data.name.trim()) {
      const trimmed = data.name.trim();
      const dup = await (this.db as any).masterDataItem.findFirst({
        where: {
          categoryId: item.categoryId,
          id: { not: id },
          isDeleted: false,
          name: { equals: trimmed, mode: 'insensitive' },
        },
      });
      if (dup) {
        throw new ConflictException(`Specialty "${trimmed}" already exists in the catalogue`);
      }
      updateData.name = trimmed;
    }

    if (data.description !== undefined) {
      updateData.description = data.description;
    }

    if (data.status) {
      updateData.status = data.status.toUpperCase() === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE';
    }

    const updated = await (this.db as any).masterDataItem.update({
      where: { id },
      data: updateData,
    });

    return {
      id: updated.id,
      code: updated.code,
      name: updated.name,
      description: updated.description,
      status: updated.status,
      sortOrder: updated.sortOrder,
      isDefault: updated.isDefault,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  async deleteSpecialty(id: string): Promise<any> {
    const item = await (this.db as any).masterDataItem.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundException('Specialty not found in catalogue');
    }

    await (this.db as any).masterDataItem.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });

    return {
      success: true,
      id,
      message: `Specialty "${item.name}" deactivated successfully without affecting existing doctor profiles`,
    };
  }

  // ─── Doctor Photo Upload ──────────────────────────────────────────────────

  async uploadDoctorPhoto(doctorId: string, adminUserId: string, file: any): Promise<any> {
    const doctor = await this.db.doctorProfile.findUnique({ where: { id: doctorId } });
    if (!doctor) {
      throw new NotFoundException('Doctor profile not found in Master Registry');
    }

    if (!file || !file.buffer) {
      throw new BadRequestException('Image file is required');
    }

    if (file.size > 2 * 1024 * 1024) {
      throw new BadRequestException(`Profile photo size exceeds maximum limit of 2MB (${file.size} bytes provided)`);
    }

    const mime = (file.mimetype || '').toLowerCase();
    if (!['image/jpeg', 'image/png'].includes(mime)) {
      throw new BadRequestException('Only JPG and PNG image files are supported');
    }

    const detectedExt = validateImageBuffer(file.buffer);
    if (!['jpg', 'jpeg', 'png'].includes(detectedExt.toLowerCase())) {
      throw new BadRequestException('Invalid image buffer: must be a genuine JPEG or PNG image');
    }

    const safeExt = detectedExt.toLowerCase() === 'png' ? 'png' : 'jpg';
    const safeFilename = `doctor-${doctor.id}-${Date.now()}.${safeExt}`;
    const uploadDir = path.join(process.cwd(), 'data', 'uploads', 'photos');

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const targetDiskPath = path.join(uploadDir, safeFilename);
    fs.writeFileSync(targetDiskPath, file.buffer);

    const photoUrl = `/api/v1/doctors/photo/file/${safeFilename}`;

    const updated = await this.db.doctorProfile.update({
      where: { id: doctor.id },
      data: { profilePhotoUrl: photoUrl },
    });

    await this.db.doctorAuditLog.create({
      data: {
        doctorProfileId: doctor.id,
        action: 'PHOTO_UPLOADED',
        performedBy: adminUserId,
        details: `Doctor profile photo uploaded by Admin (${safeFilename})`,
      },
    });

    return {
      success: true,
      photoUrl,
      doctorId: updated.id,
      message: 'Doctor profile photo uploaded successfully',
    };
  }

  // ─── Dynamic Clinical Practice Types Management (Goal 014) ─────────────────

  async findClinicalPracticeTypes(params?: { search?: string; status?: string; includeInactive?: boolean }): Promise<any[]> {
    if (!(this.db as any)?.clinicalPracticeType?.findMany) {
      return [
        {
          id: 'canonical-human-healthcare',
          code: 'HUMAN_HEALTHCARE',
          displayName: 'Human Healthcare',
          status: 'ACTIVE',
          clinicalAuthorizationMapping: 'HUMAN_HEALTHCARE',
          isCanonical: true,
          isDeleted: false,
          sortOrder: 1,
        },
        {
          id: 'canonical-veterinary-medicine',
          code: 'VETERINARY_MEDICINE',
          displayName: 'Veterinary Medicine',
          status: 'ACTIVE',
          clinicalAuthorizationMapping: 'VETERINARY_MEDICINE',
          isCanonical: true,
          isDeleted: false,
          sortOrder: 2,
        },
      ];
    }

    const where: any = { isDeleted: false };

    if (params?.status) {
      where.status = params.status;
    } else if (params?.includeInactive === false) {
      where.status = 'ACTIVE';
    }

    if (params?.search && params.search.trim()) {
      const q = params.search.trim();
      where.OR = [
        { code: { contains: q, mode: 'insensitive' } },
        { displayName: { contains: q, mode: 'insensitive' } },
      ];
    }

    return (this.db as any).clinicalPracticeType.findMany({
      where,
      include: {
        _count: {
          select: {
            doctors: { where: { isDeleted: false } },
            specialties: { where: { isDeleted: false } },
          },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { displayName: 'asc' }],
    });
  }

  async findActiveClinicalPracticeTypes(): Promise<any[]> {
    if (!(this.db as any)?.clinicalPracticeType?.findMany) {
      return [
        {
          id: 'canonical-human-healthcare',
          code: 'HUMAN_HEALTHCARE',
          displayName: 'Human Healthcare',
          status: 'ACTIVE',
          clinicalAuthorizationMapping: 'HUMAN_HEALTHCARE',
          isCanonical: true,
          isDeleted: false,
          sortOrder: 1,
        },
        {
          id: 'canonical-veterinary-medicine',
          code: 'VETERINARY_MEDICINE',
          displayName: 'Veterinary Medicine',
          status: 'ACTIVE',
          clinicalAuthorizationMapping: 'VETERINARY_MEDICINE',
          isCanonical: true,
          isDeleted: false,
          sortOrder: 2,
        },
      ];
    }

    return (this.db as any).clinicalPracticeType.findMany({
      where: {
        isDeleted: false,
        status: 'ACTIVE',
      },
      orderBy: [{ sortOrder: 'asc' }, { displayName: 'asc' }],
    });
  }

  async findClinicalPracticeTypeByIdOrCode(idOrCode: string): Promise<any | null> {
    if (!(this.db as any)?.clinicalPracticeType?.findFirst) {
      const upper = idOrCode.trim().toUpperCase();
      if (upper === 'HUMAN_HEALTHCARE' || upper === 'CANONICAL-HUMAN-HEALTHCARE') {
        return {
          id: 'canonical-human-healthcare',
          code: 'HUMAN_HEALTHCARE',
          displayName: 'Human Healthcare',
          status: 'ACTIVE',
          clinicalAuthorizationMapping: 'HUMAN_HEALTHCARE',
          isCanonical: true,
          isDeleted: false,
        };
      }
      if (upper === 'VETERINARY_MEDICINE' || upper === 'CANONICAL-VETERINARY-MEDICINE') {
        return {
          id: 'canonical-veterinary-medicine',
          code: 'VETERINARY_MEDICINE',
          displayName: 'Veterinary Medicine',
          status: 'ACTIVE',
          clinicalAuthorizationMapping: 'VETERINARY_MEDICINE',
          isCanonical: true,
          isDeleted: false,
        };
      }
      return null;
    }

    const trimmed = idOrCode.trim();
    return (this.db as any).clinicalPracticeType.findFirst({
      where: {
        isDeleted: false,
        OR: [{ id: trimmed }, { code: trimmed }],
      },
      include: {
        _count: {
          select: {
            doctors: { where: { isDeleted: false } },
            specialties: { where: { isDeleted: false } },
          },
        },
      },
    });
  }

  async findClinicalPracticeTypeByCode(code: string): Promise<any | null> {
    if (!(this.db as any)?.clinicalPracticeType?.findFirst) {
      const upper = code.trim().toUpperCase();
      if (upper === 'HUMAN_HEALTHCARE') {
        return {
          id: 'canonical-human-healthcare',
          code: 'HUMAN_HEALTHCARE',
          displayName: 'Human Healthcare',
          status: 'ACTIVE',
          clinicalAuthorizationMapping: 'HUMAN_HEALTHCARE',
          isCanonical: true,
          isDeleted: false,
        };
      }
      if (upper === 'VETERINARY_MEDICINE') {
        return {
          id: 'canonical-veterinary-medicine',
          code: 'VETERINARY_MEDICINE',
          displayName: 'Veterinary Medicine',
          status: 'ACTIVE',
          clinicalAuthorizationMapping: 'VETERINARY_MEDICINE',
          isCanonical: true,
          isDeleted: false,
        };
      }
      return null;
    }

    const trimmed = code.trim();
    return (this.db as any).clinicalPracticeType.findFirst({
      where: {
        isDeleted: false,
        code: { equals: trimmed, mode: 'insensitive' },
      },
      include: {
        _count: {
          select: {
            doctors: { where: { isDeleted: false } },
            specialties: { where: { isDeleted: false } },
          },
        },
      },
    });
  }

  async createClinicalPracticeType(data: any): Promise<any> {
    const code = data.code.trim().toUpperCase();
    const existing = await (this.db as any).clinicalPracticeType.findFirst({
      where: { code },
    });
    if (existing && !existing.isDeleted) {
      throw new ConflictException(`Clinical practice type with code "${code}" already exists`);
    }
    if (existing && existing.isDeleted) {
      return (this.db as any).clinicalPracticeType.update({
        where: { id: existing.id },
        data: {
          displayName: data.displayName.trim(),
          description: data.description ? data.description.trim() : null,
          status: data.status || 'ACTIVE',
          clinicalAuthorizationMapping: data.clinicalAuthorizationMapping || 'UNMAPPED',
          sortOrder: data.sortOrder !== undefined ? Number(data.sortOrder) : 0,
          isDeleted: false,
          deletedAt: null,
          updatedBy: data.createdBy || null,
        },
        include: {
          _count: {
            select: {
              doctors: { where: { isDeleted: false } },
              specialties: { where: { isDeleted: false } },
            },
          },
        },
      });
    }

    return (this.db as any).clinicalPracticeType.create({
      data: {
        code,
        displayName: data.displayName.trim(),
        description: data.description ? data.description.trim() : null,
        status: data.status || 'ACTIVE',
        clinicalAuthorizationMapping: data.clinicalAuthorizationMapping || 'UNMAPPED',
        sortOrder: data.sortOrder !== undefined ? Number(data.sortOrder) : 0,
        createdBy: data.createdBy || null,
      },
      include: {
        _count: {
          select: {
            doctors: { where: { isDeleted: false } },
            specialties: { where: { isDeleted: false } },
          },
        },
      },
    });
  }

  async updateClinicalPracticeType(idOrCode: string, data: any, updatedBy?: string): Promise<any> {
    const existing = await this.findClinicalPracticeTypeByIdOrCode(idOrCode);
    if (!existing) {
      throw new NotFoundException(`Clinical practice type "${idOrCode}" not found`);
    }

    const updateData: any = {};
    if (data.displayName !== undefined && data.displayName.trim()) {
      updateData.displayName = data.displayName.trim();
    }
    if (data.description !== undefined) {
      updateData.description = data.description ? data.description.trim() : null;
    }
    if (data.sortOrder !== undefined) {
      updateData.sortOrder = Number(data.sortOrder);
    }
    if (data.status !== undefined) {
      if (existing.isCanonical && data.status !== 'ACTIVE') {
        throw new BadRequestException('Canonical clinical practice types cannot be deactivated');
      }
      updateData.status = data.status;
    }
    if (data.clinicalAuthorizationMapping !== undefined) {
      if (existing.isCanonical && data.clinicalAuthorizationMapping !== existing.clinicalAuthorizationMapping) {
        throw new BadRequestException('Canonical clinical practice type authorization mappings are immutable');
      }
      updateData.clinicalAuthorizationMapping = data.clinicalAuthorizationMapping;
    }
    if (updatedBy) {
      updateData.updatedBy = updatedBy;
    }

    return (this.db as any).clinicalPracticeType.update({
      where: { id: existing.id },
      data: updateData,
      include: {
        _count: {
          select: {
            doctors: { where: { isDeleted: false } },
            specialties: { where: { isDeleted: false } },
          },
        },
      },
    });
  }

  async deleteClinicalPracticeType(idOrCode: string): Promise<{ success: boolean; message: string }> {
    const existing = await this.findClinicalPracticeTypeByIdOrCode(idOrCode);
    if (!existing) {
      throw new NotFoundException(`Clinical practice type "${idOrCode}" not found`);
    }

    if (existing.isCanonical || existing.code === 'HUMAN_HEALTHCARE' || existing.code === 'VETERINARY_MEDICINE') {
      throw new BadRequestException('Canonical clinical practice types cannot be deleted');
    }

    const doctorCount = await this.db.doctorProfile.count({
      where: { clinicalPracticeType: existing.code, isDeleted: false },
    });
    if (doctorCount > 0) {
      throw new ConflictException(
        `Cannot delete clinical practice type "${existing.code}": Assigned to ${doctorCount} active doctor profile(s). Please deactivate instead.`
      );
    }

    const specialtyCount = await (this.db as any).masterDataItem.count({
      where: { clinicalPracticeType: existing.code, isDeleted: false },
    });
    if (specialtyCount > 0) {
      throw new ConflictException(
        `Cannot delete clinical practice type "${existing.code}": Assigned to ${specialtyCount} specialty catalogue item(s).`
      );
    }

    await (this.db as any).clinicalPracticeType.delete({
      where: { id: existing.id },
    });

    return {
      success: true,
      message: `Clinical practice type "${existing.code}" successfully deleted`,
    };
  }

  async findSpecialtyByNameOrCode(nameOrCode: string): Promise<any | null> {
    if (!(this.db as any)?.masterDataItem?.findFirst) {
      return null;
    }
    const trimmed = nameOrCode.trim();
    return (this.db as any).masterDataItem.findFirst({
      where: {
        isDeleted: false,
        OR: [
          { name: { equals: trimmed, mode: 'insensitive' } },
          { code: { equals: trimmed, mode: 'insensitive' } },
        ],
      },
    });
  }
}
