import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '@database/database.service';
import { Prisma } from '@prisma/client';
import { IDoctorRepository } from '../../domain/repositories/doctor.repository.interface';
import {
  DoctorPatientsQueryDto,
  CreateDoctorPrescriptionDto,
  CreateDoctorVitalsDto,
  UpdatePrescriptionDto,
  CreateHospitalAdmissionDto,
} from '../../presentation/dto/doctor-patient-management.dto';
import { DoctorRegisterPatientDto } from '../../presentation/dto/doctor-register-patient.dto';
import {
  DoctorProfileEntity,
  DoctorQualificationEntity,
  DoctorCertificationEntity,
  DoctorExperienceEntity,
  DoctorDocumentEntity,
  DoctorScheduleSlotEntity,
  DoctorHistoryEntity,
  DoctorAuditLogEntity,
} from '../../domain/entities/doctor.entity';

@Injectable()
export class DoctorRepository implements IDoctorRepository {
  constructor(private readonly db: DatabaseService) {}

  async findProfileByUserId(userId: string): Promise<DoctorProfileEntity | null> {
    return (await this.db.doctorProfile.findUnique({
      where: { userId },
      include: {
        qualifications: true,
        certifications: true,
        experiences: true,
        documents: { include: { medicalAttachment: true } },
        history: { orderBy: { createdAt: 'desc' } },
      },
    })) as unknown as DoctorProfileEntity | null;
  }

  async createDoctor(data: any): Promise<DoctorProfileEntity> {
    const providerIdentifier = `DOC-360-${Date.now().toString().slice(-6)}`;
    const created = await this.db.doctorProfile.create({
      data: {
        userId: data.userId,
        fullName: data.fullName,
        gender: data.gender || null,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        profilePhotoUrl: data.profilePhotoUrl || null,
        digitalSignatureUrl: data.digitalSignatureUrl || null,
        biography: data.biography || null,
        professionalSummary: data.professionalSummary || null,
        yearsOfExperience: data.yearsOfExperience || 0,
        primarySpecialization: data.primarySpecialization,
        secondarySpecializations: data.secondarySpecializations || [],
        medicalCouncil: data.medicalCouncil,
        registrationNumber: data.registrationNumber,
        licenseNumber: data.licenseNumber,
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
      include: {
        qualifications: true,
        certifications: true,
        experiences: true,
        documents: true,
        history: true,
      },
    });

    await this.createHistory(created.id, {
      action: 'REGISTERED',
      newStatus: 'PENDING',
      reason: 'Initial master doctor profile registration',
      performedBy: data.userId,
    });

    return created as unknown as DoctorProfileEntity;
  }

  async findDoctorById(id: string, includeDeleted = false): Promise<DoctorProfileEntity | null> {
    return (await this.db.doctorProfile.findFirst({
      where: { id, ...(includeDeleted ? {} : { isDeleted: false }) },
      include: {
        qualifications: true,
        certifications: true,
        experiences: true,
        documents: { include: { medicalAttachment: true } },
        history: { orderBy: { createdAt: 'desc' } },
      },
    })) as unknown as DoctorProfileEntity | null;
  }

  async findDoctorByRegistrationNumber(registrationNumber: string): Promise<DoctorProfileEntity | null> {
    return (await this.db.doctorProfile.findUnique({
      where: { registrationNumber },
    })) as unknown as DoctorProfileEntity | null;
  }

  async findDoctorByLicenseNumber(licenseNumber: string): Promise<DoctorProfileEntity | null> {
    return (await this.db.doctorProfile.findUnique({
      where: { licenseNumber },
    })) as unknown as DoctorProfileEntity | null;
  }

  async findDoctorByProviderIdentifier(providerIdentifier: string): Promise<DoctorProfileEntity | null> {
    return (await this.db.doctorProfile.findUnique({
      where: { providerIdentifier },
    })) as unknown as DoctorProfileEntity | null;
  }

  async findDoctors(includeDeleted = false, page = 1, limit = 50): Promise<DoctorProfileEntity[]> {
    const safeLimit = Math.min(Math.max(1, limit || 50), 100);
    const safePage = Math.max(1, page || 1);
    const skip = (safePage - 1) * safeLimit;

    return (await this.db.doctorProfile.findMany({
      where: includeDeleted ? {} : { isDeleted: false },
      include: {
        qualifications: true,
        certifications: true,
        experiences: true,
        documents: true,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: safeLimit,
      skip,
    })) as unknown as DoctorProfileEntity[];
  }

  async findPendingDoctors(): Promise<DoctorProfileEntity[]> {
    return (await this.db.doctorProfile.findMany({
      where: { verificationStatus: 'PENDING', isDeleted: false },
      include: { qualifications: true, documents: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 50,
    })) as unknown as DoctorProfileEntity[];
  }

  async updateDoctor(id: string, data: any): Promise<DoctorProfileEntity> {
    return (await this.db.doctorProfile.update({
      where: { id },
      data: {
        fullName: data.fullName || undefined,
        gender: data.gender || undefined,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        profilePhotoUrl: data.profilePhotoUrl || undefined,
        digitalSignatureUrl: data.digitalSignatureUrl || undefined,
        biography: data.biography || undefined,
        professionalSummary: data.professionalSummary || undefined,
        yearsOfExperience: data.yearsOfExperience ?? undefined,
        primarySpecialization: data.primarySpecialization || undefined,
        secondarySpecializations: data.secondarySpecializations || undefined,
        medicalCouncil: data.medicalCouncil || undefined,
        registrationNumber: data.registrationNumber || undefined,
        licenseNumber: data.licenseNumber || undefined,
        registrationState: data.registrationState || undefined,
        registrationCountry: data.registrationCountry || undefined,
        registrationIssueDate: data.registrationIssueDate ? new Date(data.registrationIssueDate) : undefined,
        registrationExpiryDate: data.registrationExpiryDate ? new Date(data.registrationExpiryDate) : undefined,
        verificationStatus: data.verificationStatus as any || undefined,
        verificationNotes: data.verificationNotes || undefined,
        verifiedBy: data.verifiedBy || undefined,
        verifiedAt: data.verifiedAt ? new Date(data.verifiedAt) : undefined,
        department: data.department || undefined,
        subSpecializations: data.subSpecializations || undefined,
        clinicalInterests: data.clinicalInterests || undefined,
        servicesOffered: data.servicesOffered || undefined,
        languagesSpoken: data.languagesSpoken || undefined,
        emergencyPhone: data.emergencyPhone || undefined,
        isDeleted: data.isDeleted ?? undefined,
        deletedAt: data.deletedAt || undefined,
      },
      include: {
        qualifications: true,
        certifications: true,
        experiences: true,
        documents: { include: { medicalAttachment: true } },
        history: { orderBy: { createdAt: 'desc' } },
      },
    })) as unknown as DoctorProfileEntity;
  }

  async softDeleteDoctor(id: string): Promise<void> {
    await this.db.doctorProfile.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }

  async searchDoctors(query: string): Promise<DoctorProfileEntity[]> {
    const q = query.toLowerCase();
    return (await this.db.doctorProfile.findMany({
      where: {
        isDeleted: false,
        OR: [
          { fullName: { contains: q, mode: 'insensitive' } },
          { registrationNumber: { contains: q, mode: 'insensitive' } },
          { licenseNumber: { contains: q, mode: 'insensitive' } },
          { primarySpecialization: { contains: q, mode: 'insensitive' } },
          { department: { contains: q, mode: 'insensitive' } },
        ],
      },
      include: { qualifications: true, documents: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 50,
    })) as unknown as DoctorProfileEntity[];
  }

  async addQualification(doctorProfileId: string, data: any): Promise<DoctorQualificationEntity> {
    return (await this.db.doctorQualification.create({
      data: {
        doctorProfileId,
        degreeName: data.degreeName,
        instituteName: data.instituteName,
        passingYear: data.passingYear,
        specialization: data.specialization || null,
      },
    })) as unknown as DoctorQualificationEntity;
  }

  async addCertification(doctorProfileId: string, data: any): Promise<DoctorCertificationEntity> {
    return (await this.db.doctorCertification.create({
      data: {
        doctorProfileId,
        title: data.title,
        issuingAuthority: data.issuingAuthority,
        issueDate: data.issueDate ? new Date(data.issueDate) : null,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
      },
    })) as unknown as DoctorCertificationEntity;
  }

  async addExperience(doctorProfileId: string, data: any): Promise<DoctorExperienceEntity> {
    return (await this.db.doctorExperience.create({
      data: {
        doctorProfileId,
        designation: data.designation,
        hospitalName: data.hospitalName,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        isCurrent: data.isCurrent ?? false,
      },
    })) as unknown as DoctorExperienceEntity;
  }

  async attachDocument(doctorProfileId: string, data: any): Promise<DoctorDocumentEntity> {
    return (await this.db.doctorDocument.create({
      data: {
        doctorProfileId,
        documentType: data.documentType,
        medicalAttachmentId: data.medicalAttachmentId || null,
        verificationStatus: 'PENDING',
      },
      include: { medicalAttachment: true },
    })) as unknown as DoctorDocumentEntity;
  }

  async findDocumentsByDoctorId(doctorProfileId: string): Promise<DoctorDocumentEntity[]> {
    return (await this.db.doctorDocument.findMany({
      where: { doctorProfileId },
      include: { medicalAttachment: true },
      orderBy: { createdAt: 'desc' },
    })) as unknown as DoctorDocumentEntity[];
  }

  async findSlotsByDoctorId(doctorProfileId: string): Promise<DoctorScheduleSlotEntity[]> {
    return (await this.db.doctorScheduleSlot.findMany({
      where: { doctorProfileId },
      orderBy: { startTime: 'asc' },
    })) as unknown as DoctorScheduleSlotEntity[];
  }

  async createHistory(doctorProfileId: string, data: {
    action: string;
    previousStatus?: string;
    newStatus: string;
    reason?: string;
    performedBy?: string;
  }): Promise<DoctorHistoryEntity> {
    return (await this.db.doctorHistory.create({
      data: {
        doctorProfileId,
        action: data.action,
        previousStatus: data.previousStatus || null,
        newStatus: data.newStatus,
        reason: data.reason || null,
        performedBy: data.performedBy || null,
      },
    })) as unknown as DoctorHistoryEntity;
  }

  async findHistoryByDoctorId(doctorProfileId: string): Promise<DoctorHistoryEntity[]> {
    return (await this.db.doctorHistory.findMany({
      where: { doctorProfileId },
      orderBy: { createdAt: 'desc' },
    })) as unknown as DoctorHistoryEntity[];
  }

  async createAuditLog(data: {
    doctorProfileId: string;
    action: string;
    performedBy?: string;
    details?: string;
  }): Promise<DoctorAuditLogEntity> {
    return (await this.db.doctorAuditLog.create({
      data: {
        doctorProfileId: data.doctorProfileId,
        action: data.action,
        performedBy: data.performedBy || null,
        details: data.details || null,
      },
    })) as unknown as DoctorAuditLogEntity;
  }

  async getStatistics() {
    const totalDoctors = await this.db.doctorProfile.count({ where: { isDeleted: false } });
    const verifiedDoctors = await this.db.doctorProfile.count({ where: { verificationStatus: 'VERIFIED', isDeleted: false } });
    const pendingDoctors = await this.db.doctorProfile.count({ where: { verificationStatus: 'PENDING', isDeleted: false } });
    const suspendedDoctors = await this.db.doctorProfile.count({ where: { verificationStatus: 'SUSPENDED', isDeleted: false } });

    return {
      totalDoctors,
      verifiedDoctors,
      pendingDoctors,
      suspendedDoctors,
    };
  }

  async findPatientProfileById(patientProfileId: string): Promise<any | null> {
    return this.db.patientProfile.findFirst({
      where: {
        OR: [
          { id: patientProfileId },
          { userId: patientProfileId },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            status: true,
          },
        },
      },
    });
  }

  async getDoctorActiveFacilityIds(doctorId: string): Promise<string[]> {
    const facilities = await this.db.doctorFacility.findMany({
      where: { doctorId, isActive: true },
      select: { facilityId: true },
    });
    return facilities.map((f) => f.facilityId);
  }

  async getUserFacilityIds(userId: string): Promise<string[]> {
    const staff = await this.db.staffMember.findFirst({
      where: { userId, isDeleted: false },
      select: { primaryFacilityId: true, secondaryFacilityId: true },
    });
    if (!staff) return [];
    const ids: string[] = [];
    if (staff.primaryFacilityId) ids.push(staff.primaryFacilityId);
    if (staff.secondaryFacilityId) ids.push(staff.secondaryFacilityId);
    return ids;
  }

  async verifyDoctorPatientAccess(
    doctorId: string,
    doctorUserId: string,
    patientProfileId: string,
    activeFacilityIds: string[],
  ): Promise<{
    isAuthorized: boolean;
    authSource?: string;
    scopeRecordId?: string;
    reason?: string;
  }> {
    const patientIds = [patientProfileId];
    const patient = await this.db.patientProfile.findFirst({
      where: {
        OR: [{ id: patientProfileId }, { userId: patientProfileId }],
      },
      select: { id: true, userId: true },
    });
    if (patient) {
      if (patient.id && !patientIds.includes(patient.id)) patientIds.push(patient.id);
      if (patient.userId && !patientIds.includes(patient.userId)) patientIds.push(patient.userId);
    }

    const doctorIdentifiers = [doctorId, doctorUserId].filter(Boolean);

    // 1. Check Active Patient Referral
    // Only ACCEPTED and IN_PROGRESS referrals authorize active clinical access
    const activeReferral = await this.db.patientReferral.findFirst({
      where: {
        patientId: { in: patientIds },
        isDeleted: false,
        status: { in: ['ACCEPTED', 'IN_PROGRESS'] },
        OR: [
          { expiresAt: null },
          { expiresAt: { gte: new Date() } },
        ],
        AND: [
          {
            OR: [
              { referringDoctorId: { in: doctorIdentifiers } },
              { receivingDoctorId: { in: doctorIdentifiers } },
              {
                receivingFacilityId: { in: activeFacilityIds },
                OR: [
                  { receivingDoctorId: null },
                  { receivingDoctorId: { in: doctorIdentifiers } },
                ],
              },
            ],
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    if (activeReferral) {
      if (activeReferral.medicalRecordId) {
        return {
          isAuthorized: true,
          authSource: 'REFERRAL',
          scopeRecordId: activeReferral.medicalRecordId,
        };
      }
      if (activeReferral.accessScope === 'ALL_RECORDS') {
        return {
          isAuthorized: true,
          authSource: 'REFERRAL',
          scopeRecordId: undefined,
        };
      }
      // Referral without medicalRecordId and without explicit ALL_RECORDS scope
      // cannot grant unrestricted EHR access. Continue to check consent.
    }

    // 2. Check Active Patient Security Consent
    // Must be GRANTED, not expired, not withdrawn, and explicitly designate this doctor or their active facility
    const activeConsent = await this.db.securityConsentRecord.findFirst({
      where: {
        patientId: { in: patientIds },
        isDeleted: false,
        status: 'GRANTED',
        consentType: { in: ['TREATMENT', 'DATA_SHARING'] },
        withdrawnAt: null,
        OR: [
          { expiresAt: null },
          { expiresAt: { gte: new Date() } },
        ],
        AND: [
          {
            OR: [
              // Consent explicitly designates this doctor
              { authorizedDoctorId: { in: doctorIdentifiers } },
              // Consent explicitly designates one of the doctor's active facilities
              {
                authorizedFacilityId: { in: activeFacilityIds },
                OR: [
                  { authorizedDoctorId: null },
                  { authorizedDoctorId: { in: doctorIdentifiers } },
                ],
              },
            ],
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    if (activeConsent) {
      return {
        isAuthorized: true,
        authSource: 'CONSENT',
        scopeRecordId: undefined,
      };
    }

    // 3. Check Active Appointment
    // A booked appointment designates an active clinical doctor-patient relationship
    let activeAppointment: any = null;
    if (this.db.appointment?.findFirst) {
      activeAppointment = await this.db.appointment.findFirst({
        where: {
          patientProfileId: { in: patientIds },
          doctorProfileId: { in: doctorIdentifiers },
          isDeleted: false,
          status: { in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'RESCHEDULED', 'NO_SHOW'] },
        },
        orderBy: { appointmentDate: 'desc' },
      });
    }

    if (activeAppointment) {
      return {
        isAuthorized: true,
        authSource: 'APPOINTMENT',
        scopeRecordId: undefined,
      };
    }

    // Historical authorship (MedicalRecord.createdById) is strictly REMOVED as an authorization pathway.

    const failureReason = activeReferral && activeReferral.accessScope !== 'ALL_RECORDS' && !activeReferral.medicalRecordId
      ? 'Referral does not have an attached medical record or explicit clinical access scope'
      : 'No active referral with valid scope or active consent designated for doctor/facility found';

    return {
      isAuthorized: false,
      reason: failureReason,
    };
  }

  async findPatientMedicalRecords(
    patientProfileId: string,
    options: {
      page?: number;
      limit?: number;
      status?: string;
      startDate?: Date;
      endDate?: Date;
      includeArchived?: boolean;
      scopedRecordId?: string;
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

    if (options.scopedRecordId) {
      where.id = options.scopedRecordId;
    }

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
        skip,
        take: safeLimit,
        orderBy: [
          { createdAt: 'desc' },
          { id: 'desc' },
        ],
        include: {
          encounters: true,
          diagnoses: true,
          vitalSigns: true,
          procedures: true,
          attachments: {
            where: { isDeleted: false },
            select: {
              id: true,
              medicalRecordId: true,
              patientProfileId: true,
              fileName: true,
              originalName: true,
              fileSize: true,
              mimeType: true,
              category: true,
              storageUrl: true,
              checksum: true,
              version: true,
              isDeleted: true,
              virusScanStatus: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      }),
    ]);

    return { total, items: records };
  }

  async getPatientTimeline(
    patientProfileId: string,
    options: {
      page?: number;
      limit?: number;
      scopedRecordId?: string;
    },
  ): Promise<{ items: any[]; total: number }> {
    const safePage = Math.max(1, options.page || 1);
    const safeLimit = Math.min(Math.max(1, options.limit || 20), 100);
    const skip = (safePage - 1) * safeLimit;

    const recordWhere: any = { patientProfileId, isDeleted: false };
    if (options.scopedRecordId) {
      recordWhere.id = options.scopedRecordId;
    }

    const [totalRecords, totalAttachments] = await Promise.all([
      this.db.medicalRecord.count({ where: recordWhere }),
      this.db.medicalAttachment.count({
        where: options.scopedRecordId
          ? { patientProfileId, medicalRecordId: options.scopedRecordId, isDeleted: false }
          : { patientProfileId, isDeleted: false },
      }),
    ]);

    const globalTotal = totalRecords + totalAttachments;

    if (globalTotal === 0 || skip >= globalTotal) {
      return { total: globalTotal, items: [] };
    }

    let timelineItems: any[] = [];

    if (typeof (this.db as any).$queryRaw === 'function') {
      const rows = options.scopedRecordId
        ? await (this.db as any).$queryRaw(Prisma.sql`
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
              WHERE patient_profile_id = ${patientProfileId} AND id = ${options.scopedRecordId} AND is_deleted = false

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
              WHERE patient_profile_id = ${patientProfileId} AND medical_record_id = ${options.scopedRecordId} AND is_deleted = false
            ) timeline
            ORDER BY item_date DESC, id DESC
            LIMIT ${safeLimit} OFFSET ${skip}
          `)
        : await (this.db as any).$queryRaw(Prisma.sql`
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
            date: new Date(row.item_date).toISOString(),
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
            date: new Date(row.item_date).toISOString(),
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
      const [records, attachments] = await Promise.all([
        this.db.medicalRecord.findMany({
          where: recordWhere,
          include: { encounters: true, diagnoses: true, attachments: true },
        }),
        options.scopedRecordId
          ? Promise.resolve([])
          : this.db.medicalAttachment.findMany({
              where: { patientProfileId, isDeleted: false },
            }),
      ]);

      const combined: any[] = [
        ...records.map((r: any) => ({
          id: r.id,
          type: 'MEDICAL_RECORD',
          title: r.title,
          date: r.createdAt,
          status: r.status,
          summary: r.chiefComplaint || r.clinicalNotes,
          details: { encounters: r.encounters || [], diagnoses: r.diagnoses || [] },
        })),
        ...attachments.map((a: any) => ({
          id: a.id,
          type: 'ATTACHMENT',
          title: a.fileName,
          date: a.createdAt,
          category: a.category,
          details: { originalName: a.originalName, fileSize: a.fileSize, mimeType: a.mimeType, virusScanStatus: a.virusScanStatus },
        })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.id.localeCompare(a.id));

      timelineItems = combined.slice(skip, skip + safeLimit);
    }

    return { total: globalTotal, items: timelineItems };
  }

  async createMedicalRecordAuditLog(data: {
    action: string;
    performedBy: string;
    details: string;
    ipAddress?: string;
    medicalRecordId?: string;
  }): Promise<any> {
    return this.db.medicalRecordAuditLog.create({
      data: {
        action: data.action,
        performedBy: data.performedBy,
        details: data.details,
        ipAddress: data.ipAddress || null,
        medicalRecordId: data.medicalRecordId || null,
      },
    });
  }

  async createMedicalRecord(patientProfileId: string, data: any): Promise<any> {
    return this.db.medicalRecord.create({
      data: {
        patientProfileId,
        title: data.title,
        chiefComplaint: data.chiefComplaint || null,
        clinicalNotes: data.clinicalNotes || null,
        treatmentPlan: data.treatmentPlan || null,
        followUpInstructions: data.followUpInstructions || null,
        status: data.status || 'FINAL',
        createdById: data.createdById || null,
        encounters: data.encounter ? {
          create: {
            providerName: data.encounter.providerName || null,
            facilityName: data.encounter.facilityName || null,
            encounterType: data.encounter.encounterType || 'CONSULTATION',
            encounterDate: data.encounter.encounterDate ? new Date(data.encounter.encounterDate) : new Date(),
          },
        } : undefined,
        diagnoses: data.diagnoses && data.diagnoses.length > 0 ? {
          create: data.diagnoses.map((d: any) => ({
            code: d.code || null,
            description: d.description,
            type: d.type || 'PRIMARY',
            status: d.status || 'ACTIVE',
          })),
        } : undefined,
        vitalSigns: data.vitalSigns ? {
          create: {
            heightCm: data.vitalSigns.heightCm ?? null,
            weightKg: data.vitalSigns.weightKg ?? null,
            bmi: data.vitalSigns.bmi ?? null,
            systolicBp: data.vitalSigns.systolicBp ?? null,
            diastolicBp: data.vitalSigns.diastolicBp ?? null,
            pulseBpm: data.vitalSigns.pulseBpm ?? null,
            respirationRate: data.vitalSigns.respirationRate ?? null,
            temperatureC: data.vitalSigns.temperatureC ?? null,
            bloodSugarMgDl: data.vitalSigns.bloodSugarMgDl ?? null,
            oxygenSaturation: data.vitalSigns.oxygenSaturation ?? null,
          },
        } : undefined,
        procedures: data.procedures && data.procedures.length > 0 ? {
          create: data.procedures.map((p: any) => ({
            name: p.name,
            code: p.code || null,
            performedAt: p.performedAt ? new Date(p.performedAt) : null,
            notes: p.notes || null,
          })),
        } : undefined,
      },
      include: {
        encounters: true,
        diagnoses: true,
        vitalSigns: true,
        procedures: true,
        attachments: {
          where: { isDeleted: false },
          select: {
            id: true,
            medicalRecordId: true,
            patientProfileId: true,
            fileName: true,
            originalName: true,
            fileSize: true,
            mimeType: true,
            category: true,
            storageUrl: true,
            checksum: true,
            version: true,
            isDeleted: true,
            virusScanStatus: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });
  }

  async findMedicalRecordById(recordId: string): Promise<any | null> {
    return this.db.medicalRecord.findUnique({
      where: { id: recordId },
      include: {
        encounters: true,
        diagnoses: true,
        vitalSigns: true,
        procedures: true,
        attachments: {
          where: { isDeleted: false },
        },
      },
    });
  }

  async updateMedicalRecord(recordId: string, data: any): Promise<any> {
    return this.db.medicalRecord.update({
      where: { id: recordId },
      data: {
        title: data.title ?? undefined,
        chiefComplaint: data.chiefComplaint ?? undefined,
        clinicalNotes: data.clinicalNotes ?? undefined,
        treatmentPlan: data.treatmentPlan ?? undefined,
        followUpInstructions: data.followUpInstructions ?? undefined,
        status: data.status ?? undefined,
      },
      include: {
        encounters: true,
        diagnoses: true,
        vitalSigns: true,
        procedures: true,
        attachments: {
          where: { isDeleted: false },
        },
      },
    });
  }

  async createSecurityAuditLog(data: {
    userId?: string;
    action: string;
    resource: string;
    resourceId?: string;
    result: string;
    details?: string;
    ipAddress?: string;
  }): Promise<any> {
    return this.db.securityPlatformAuditLog.create({
      data: {
        userId: data.userId || null,
        action: data.action,
        resource: data.resource,
        resourceId: data.resourceId || null,
        result: data.result || 'DENIED',
        details: data.details || null,
        ipAddress: data.ipAddress || null,
      },
    });
  }

  async findAuthorizedPatients(
    doctorId: string,
    doctorUserId: string,
    activeFacilityIds: string[],
    query: DoctorPatientsQueryDto,
  ): Promise<{ items: any[]; total: number }> {
    const doctorIdentifiers = [doctorId, doctorUserId].filter(Boolean);
    const authMap = new Map<string, string>(); // patientId -> authSource

    // 1. Appointments
    if (this.db.appointment?.findMany) {
      try {
        const appointments = await this.db.appointment.findMany({
          where: {
            doctorProfileId: { in: doctorIdentifiers },
            isDeleted: false,
            status: { in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'RESCHEDULED', 'NO_SHOW'] },
          },
          select: { patientProfileId: true },
          distinct: ['patientProfileId'],
        });
        for (const a of appointments) {
          if (a.patientProfileId) authMap.set(a.patientProfileId, 'APPOINTMENT');
        }
      } catch (apptErr) {
        // Log defensively without failing the request
      }
    }

    // 2. Referrals
    if (this.db.patientReferral?.findMany) {
      try {
        const referrals = await this.db.patientReferral.findMany({
          where: {
            isDeleted: false,
            status: { in: ['ACCEPTED', 'IN_PROGRESS'] },
            OR: [
              { expiresAt: null },
              { expiresAt: { gte: new Date() } },
            ],
            AND: [
              {
                OR: [
                  { referringDoctorId: { in: doctorIdentifiers } },
                  { receivingDoctorId: { in: doctorIdentifiers } },
                  {
                    receivingFacilityId: { in: activeFacilityIds },
                    OR: [
                      { receivingDoctorId: null },
                      { receivingDoctorId: { in: doctorIdentifiers } },
                    ],
                  },
                ],
              },
            ],
          },
          select: { patientId: true },
          distinct: ['patientId'],
        });
        for (const r of referrals) {
          if (r.patientId && !authMap.has(r.patientId)) {
            authMap.set(r.patientId, 'REFERRAL');
          }
        }
      } catch (refErr) {
        // Log defensively without failing the request
      }
    }

    // 3. Security Consents
    if (this.db.securityConsentRecord?.findMany) {
      try {
        const consents = await this.db.securityConsentRecord.findMany({
          where: {
            isDeleted: false,
            status: 'GRANTED',
            consentType: { in: ['TREATMENT', 'DATA_SHARING'] },
            withdrawnAt: null,
            OR: [
              { expiresAt: null },
              { expiresAt: { gte: new Date() } },
            ],
            AND: [
              {
                OR: [
                  { authorizedDoctorId: { in: doctorIdentifiers } },
                  {
                    authorizedFacilityId: { in: activeFacilityIds },
                    OR: [
                      { authorizedDoctorId: null },
                      { authorizedDoctorId: { in: doctorIdentifiers } },
                    ],
                  },
                ],
              },
            ],
          },
          select: { patientId: true },
          distinct: ['patientId'],
        });
        for (const c of consents) {
          if (c.patientId && !authMap.has(c.patientId)) {
            authMap.set(c.patientId, 'CONSENT');
          }
        }
      } catch (consentErr) {
        // Log defensively without failing the request
      }
    }

    const allAuthorizedIds = Array.from(authMap.keys());
    if (allAuthorizedIds.length === 0) {
      return { items: [], total: 0 };
    }

    const safePage = Math.max(1, query.page || 1);
    const safeLimit = Math.min(Math.max(1, query.limit || 20), 100);
    const skip = (safePage - 1) * safeLimit;

    const searchTerm = (query.search || query.q || '').trim();

    const where: any = {
      OR: [
        { id: { in: allAuthorizedIds } },
        { userId: { in: allAuthorizedIds } },
      ],
    };

    if (query.gender) {
      where.gender = { equals: query.gender, mode: 'insensitive' };
    }
    if (query.bloodGroup) {
      where.bloodGroup = query.bloodGroup;
    }
    if (query.status) {
      where.status = query.status;
    }

    if (searchTerm) {
      where.AND = [
        {
          OR: [
            { firstName: { contains: searchTerm, mode: 'insensitive' } },
            { lastName: { contains: searchTerm, mode: 'insensitive' } },
            { currentCity: { contains: searchTerm, mode: 'insensitive' } },
            {
              user: {
                OR: [
                  { phone: { contains: searchTerm } },
                  { email: { contains: searchTerm, mode: 'insensitive' } },
                ],
              },
            },
          ],
        },
      ];
    }

    const [items, total] = await Promise.all([
      this.db.patientProfile.findMany({
        where,
        skip,
        take: safeLimit,
        include: {
          user: {
            select: { id: true, phone: true, email: true, status: true },
          },
          emergencyContact: true,
        },
        orderBy: { updatedAt: 'desc' },
      }),
      this.db.patientProfile.count({ where }),
    ]);

    const enrichedItems = items.map((item: any) => ({
      ...item,
      authSource: authMap.get(item.id) || authMap.get(item.userId) || 'AUTHORIZED',
    }));

    return { items: enrichedItems, total };
  }

  async findPatientDetailsForDoctor(patientProfileId: string): Promise<any | null> {
    return this.db.patientProfile.findFirst({
      where: {
        OR: [{ id: patientProfileId }, { userId: patientProfileId }],
      },
      include: {
        user: {
          select: { id: true, phone: true, email: true, status: true, createdAt: true },
        },
        emergencyContact: true,
      },
    });
  }

  async findPatientPrescriptions(
    patientProfileId: string,
    options: { page?: number; limit?: number },
  ): Promise<{ items: any[]; total: number }> {
    const safePage = Math.max(1, options.page || 1);
    const safeLimit = Math.min(Math.max(1, options.limit || 20), 100);
    const skip = (safePage - 1) * safeLimit;

    const patient = await this.db.patientProfile.findFirst({
      where: { OR: [{ id: patientProfileId }, { userId: patientProfileId }] },
      select: { id: true },
    });
    const targetPatientId = patient ? patient.id : patientProfileId;

    const where: any = {
      patientProfileId: targetPatientId,
      category: 'PRESCRIPTION',
      isDeleted: false,
    };

    const [items, total] = await Promise.all([
      this.db.medicalReport.findMany({
        where,
        skip,
        take: safeLimit,
        include: {
          attachments: true,
        },
        orderBy: { reportDate: 'desc' },
      }),
      this.db.medicalReport.count({ where }),
    ]);

    return { items, total };
  }

  async createPatientPrescription(
    patientProfileId: string,
    doctor: any,
    dto: CreateDoctorPrescriptionDto,
  ): Promise<any> {
    const patient = await this.db.patientProfile.findFirst({
      where: { OR: [{ id: patientProfileId }, { userId: patientProfileId }] },
      select: { id: true },
    });
    const targetPatientId = patient ? patient.id : patientProfileId;

    const medicationSummary = (dto.medications || [])
      .map(
        (m, idx) =>
          `${idx + 1}. ${m.name} ${m.dosage} - ${m.frequency} for ${m.duration}${m.instructions ? ` (${m.instructions})` : ''}`,
      )
      .join('\n');

    const fullDescription = dto.description
      ? `${dto.description}\n\nMedications:\n${medicationSummary}`
      : `Prescribed Medications:\n${medicationSummary}`;

    const tags = (dto.medications || []).map((m) => m.name);
    if (dto.diagnosis) tags.push(dto.diagnosis);

    const reportDate = dto.reportDate ? new Date(dto.reportDate) : new Date();

    const jsonPayload = JSON.stringify(dto.medications || []);
    const notesContent = dto.notes
      ? `${dto.notes}\n[JSON_MEDICATIONS]:${jsonPayload}`
      : `[JSON_MEDICATIONS]:${jsonPayload}`;

    return this.db.medicalReport.create({
      data: {
        patientProfileId: targetPatientId,
        title: dto.title,
        description: fullDescription,
        category: 'PRESCRIPTION',
        status: 'UPLOADED',
        reportDate,
        prescribedBy: doctor.fullName,
        doctorName: doctor.fullName,
        providerName: doctor.primarySpecialization || 'Physician',
        facilityName: dto.facilityName || 'CareID Health Facility',
        tags,
        notes: notesContent,
        verificationStatus: 'VERIFIED',
        verifiedBy: doctor.userId,
        verifiedAt: new Date(),
      },
      include: {
        attachments: true,
      },
    });
  }

  async findPatientVitals(
    patientProfileId: string,
    options: { page?: number; limit?: number },
  ): Promise<{ items: any[]; total: number }> {
    const safePage = Math.max(1, options.page || 1);
    const safeLimit = Math.min(Math.max(1, options.limit || 20), 100);
    const skip = (safePage - 1) * safeLimit;

    const patient = await this.db.patientProfile.findFirst({
      where: { OR: [{ id: patientProfileId }, { userId: patientProfileId }] },
      select: { id: true },
    });
    const targetPatientId = patient ? patient.id : patientProfileId;

    const where: any = {
      medicalRecord: {
        patientProfileId: targetPatientId,
        isDeleted: false,
      },
    };

    const [items, total] = await Promise.all([
      this.db.vitalSigns.findMany({
        where,
        skip,
        take: safeLimit,
        include: {
          medicalRecord: {
            select: {
              id: true,
              title: true,
              createdById: true,
              createdAt: true,
            },
          },
        },
        orderBy: { recordedAt: 'desc' },
      }),
      this.db.vitalSigns.count({ where }),
    ]);

    return { items, total };
  }

  async createPatientVitals(
    patientProfileId: string,
    doctor: any,
    dto: CreateDoctorVitalsDto,
  ): Promise<any> {
    const patient = await this.db.patientProfile.findFirst({
      where: { OR: [{ id: patientProfileId }, { userId: patientProfileId }] },
      select: { id: true },
    });
    const targetPatientId = patient ? patient.id : patientProfileId;

    let medicalRecordId = dto.medicalRecordId;

    if (medicalRecordId) {
      const existingRecord = await this.db.medicalRecord.findFirst({
        where: { id: medicalRecordId, patientProfileId: targetPatientId, isDeleted: false },
      });
      if (!existingRecord) {
        throw new NotFoundException(`Medical record ${medicalRecordId} not found for this patient`);
      }
    } else {
      const newRecord = await this.db.medicalRecord.create({
        data: {
          patientProfileId: targetPatientId,
          title: 'Vital Signs Entry',
          clinicalNotes: `Vitals recorded by Dr. ${doctor.fullName}`,
          status: 'FINAL',
          createdById: doctor.id,
        },
      });
      medicalRecordId = newRecord.id;
    }

    let calculatedBmi = null;
    if (dto.heightCm && dto.weightKg && dto.heightCm > 0) {
      const heightM = dto.heightCm / 100;
      calculatedBmi = parseFloat((dto.weightKg / (heightM * heightM)).toFixed(2));
    }

    const recordedAt = dto.recordedAt ? new Date(dto.recordedAt) : new Date();

    return this.db.vitalSigns.create({
      data: {
        medicalRecordId,
        heightCm: dto.heightCm ?? null,
        weightKg: dto.weightKg ?? null,
        bmi: calculatedBmi,
        systolicBp: dto.systolicBp ?? null,
        diastolicBp: dto.diastolicBp ?? null,
        pulseBpm: dto.pulseBpm ?? null,
        respirationRate: dto.respirationRate ?? null,
        temperatureC: dto.temperatureC ?? null,
        bloodSugarMgDl: dto.bloodSugarMgDl ?? null,
        oxygenSaturation: dto.oxygenSaturation ?? null,
        recordedAt,
      },
      include: {
        medicalRecord: {
          select: {
            id: true,
            title: true,
            createdById: true,
            createdAt: true,
          },
        },
      },
    });
  }

  async findPrescriptionById(prescriptionId: string): Promise<any | null> {
    return this.db.medicalReport.findFirst({
      where: {
        id: prescriptionId,
        category: 'PRESCRIPTION',
        isDeleted: false,
      },
      include: {
        patientProfile: {
          select: {
            id: true,
            userId: true,
            patientNumber: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            gender: true,
            emergencyContact: true,
            user: {
              select: {
                id: true,
                phone: true,
                email: true,
              },
            },
          },
        },
        attachments: true,
      },
    });
  }

  async updatePrescription(prescriptionId: string, data: any): Promise<any> {
    return this.db.medicalReport.update({
      where: { id: prescriptionId },
      data,
      include: {
        patientProfile: {
          select: {
            id: true,
            userId: true,
            patientNumber: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            gender: true,
            emergencyContact: true,
            user: {
              select: {
                id: true,
                phone: true,
                email: true,
              },
            },
          },
        },
        attachments: true,
      },
    });
  }

  async refillPrescriptionAtomic(prescriptionId: string, newNotes: string, auditData: any): Promise<any> {
    return this.db.$transaction(async (tx) => {
      const updated = await tx.medicalReport.update({
        where: { id: prescriptionId },
        data: {
          notes: newNotes,
          updatedAt: new Date(),
        },
        include: {
          patientProfile: {
            select: {
              id: true,
              userId: true,
              patientNumber: true,
              firstName: true,
              lastName: true,
              dateOfBirth: true,
              gender: true,
              emergencyContact: true,
              user: {
                select: {
                  id: true,
                  phone: true,
                  email: true,
                },
              },
            },
          },
          attachments: true,
        },
      });

      await tx.medicalRecordAuditLog.create({
        data: {
          action: auditData.action,
          performedBy: auditData.performedBy,
          details: auditData.details,
          ipAddress: auditData.ipAddress || null,
          medicalRecordId: null,
        },
      });

      return updated;
    });
  }

  async findPatientAdmissions(
    patientProfileId: string,
    options: { page?: number; limit?: number },
  ): Promise<{ items: any[]; total: number }> {
    const safePage = Math.max(1, options.page || 1);
    const safeLimit = Math.min(Math.max(1, options.limit || 20), 100);
    const skip = (safePage - 1) * safeLimit;

    const patient = await this.db.patientProfile.findFirst({
      where: { OR: [{ id: patientProfileId }, { userId: patientProfileId }] },
      select: { id: true },
    });
    const targetPatientId = patient ? patient.id : patientProfileId;

    const where: Prisma.MedicalEncounterWhereInput = {
      encounterType: 'ADMISSION',
      medicalRecord: {
        patientProfileId: targetPatientId,
        isDeleted: false,
      },
    };

    const [items, total] = await Promise.all([
      this.db.medicalEncounter.findMany({
        where,
        skip,
        take: safeLimit,
        orderBy: { encounterDate: 'desc' },
        include: {
          medicalRecord: {
            include: {
              diagnoses: true,
            },
          },
        },
      }),
      this.db.medicalEncounter.count({ where }),
    ]);

    return { items, total };
  }

  async createPatientAdmission(
    patientProfileId: string,
    doctor: any,
    dto: CreateHospitalAdmissionDto,
  ): Promise<any> {
    const patient = await this.db.patientProfile.findFirst({
      where: { OR: [{ id: patientProfileId }, { userId: patientProfileId }] },
      select: { id: true },
    });
    const targetPatientId = patient ? patient.id : patientProfileId;

    const admissionDate = dto.admissionDate ? new Date(dto.admissionDate) : new Date();
    const facility = dto.facilityName || 'CareID General Hospital';
    const provider = dto.attendingDoctorName || doctor.fullName;
    const admissionTitle = dto.title || `Hospital Admission - ${dto.admissionType || 'Inpatient'}`;

    return this.db.$transaction(async (tx) => {
      const record = await tx.medicalRecord.create({
        data: {
          patientProfileId: targetPatientId,
          title: admissionTitle,
          chiefComplaint: dto.reasonForAdmission || null,
          clinicalNotes:
            dto.clinicalNotes ||
            (dto.ward || dto.roomBed
              ? `Ward: ${dto.ward || 'N/A'}, Bed: ${dto.roomBed || 'N/A'}`
              : null),
          treatmentPlan: dto.treatmentPlan || null,
          status: 'FINAL',
          createdById: doctor.userId,
        },
      });

      const encounter = await tx.medicalEncounter.create({
        data: {
          medicalRecordId: record.id,
          encounterDate: admissionDate,
          providerName: provider,
          facilityName: facility,
          encounterType: 'ADMISSION',
        },
      });

      let diagnoses: any[] = [];
      if (dto.admittingDiagnosis) {
        const diag = await tx.clinicalDiagnosis.create({
          data: {
            medicalRecordId: record.id,
            description: dto.admittingDiagnosis,
            type: 'ADMISSION',
            status: 'ACTIVE',
          },
        });
        diagnoses = [diag];
      }

      return {
        ...encounter,
        medicalRecord: {
          ...record,
          diagnoses,
        },
      };
    });
  }

  async registerPatientByDoctor(doctor: any, dto: DoctorRegisterPatientDto): Promise<any> {
    const cleanPhone = dto.phone.trim();
    const cleanEmail = dto.email ? dto.email.trim().toLowerCase() : null;

    return await this.db.$transaction(async (tx) => {
      // 1. Check existing user - Never automatically link or overwrite existing patient records based only on phone or email
      const existingUser = await tx.user.findFirst({
        where: {
          OR: [
            { phone: cleanPhone },
            ...(cleanEmail ? [{ email: cleanEmail }] : []),
          ],
        },
        include: {
          patientProfile: true,
        },
      });

      if (existingUser) {
        throw new ConflictException(
          'A user or patient profile with this phone number or email is already registered in CareID. Existing patients cannot be automatically linked or overwritten without patient-initiated consent or QR verification.',
        );
      }

      // Create new user for newly onboarded patient
      const user = await tx.user.create({
        data: {
          phone: cleanPhone,
          email: cleanEmail,
          status: 'ACTIVE',
        },
        include: {
          patientProfile: true,
        },
      });

      // Link PATIENT role
      const patientRole = await tx.role.findUnique({
        where: { name: 'PATIENT' },
      });
      if (patientRole) {
        await tx.userRole.create({
          data: {
            userId: user.id,
            roleId: patientRole.id,
          },
        });
      }

      // Create new patient profile
      const patientNumber = `PT-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;
      const patientProfile = await tx.patientProfile.create({
        data: {
          userId: user.id,
          patientNumber,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
          gender: dto.gender || null,
          bloodGroup: dto.bloodGroup || null,
          address: dto.address || null,
          currentAddressLine1: dto.address || null,
          currentCity: dto.city || null,
          currentState: dto.state || null,
          currentPostalCode: dto.postalCode || null,
          currentCountry: dto.country || null,
          status: 'ACTIVE',
          onboardingStep: 6,
        },
      });

      // Create emergency contact if provided
      if (dto.emergencyContact) {
        await tx.emergencyContact.create({
          data: {
            patientProfileId: patientProfile.id,
            name: dto.emergencyContact.name.trim(),
            relationship: dto.emergencyContact.relationship.trim().toUpperCase(),
            phone: dto.emergencyContact.phone.trim(),
          },
        });
      }

      // Issue active Digital Health Card
      const cardNumber = `HC-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);

      const healthCard = await tx.healthCard.create({
        data: {
          patientProfileId: patientProfile.id,
          cardNumber,
          status: 'ACTIVE',
          issuedAt: new Date(),
          expiresAt,
        },
      });

      // Issue QrCode
      const qrPayload = `CAREID:HC:${healthCard.id}:${patientProfile.id}:${Date.now()}`;
      await tx.qrCode.create({
        data: {
          entityId: healthCard.id,
          entityType: 'HEALTH_CARD',
          ownerId: user.id,
          token: qrPayload,
          signature: `SIG_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          nonce: String(Date.now()),
          status: 'ACTIVE',
          expiresAt,
        },
      });

      // 2. Clinical Consent Grant - In-person walk-in registration consent captured by doctor
      const consentRecord = await tx.securityConsentRecord.create({
        data: {
          patientId: patientProfile.id,
          authorizedDoctorId: doctor.id,
          authorizedFacilityId: dto.facilityId || null,
          consentType: 'TREATMENT',
          status: 'GRANTED',
          purpose: 'DOCTOR_INITIATED_CLINICAL_REGISTRATION',
          accessScope: 'ALL',
          capturedBy: doctor.userId,
          evidenceReference: 'IN_PERSON_WALK_IN_VERBAL_CONSENT',
          grantedAt: new Date(),
        },
      });

      // 3. Initial Clinical Record & Encounter
      let initialRecord: any = null;
      if (dto.initialChiefComplaint || dto.initialVitals) {
        initialRecord = await tx.medicalRecord.create({
          data: {
            patientProfileId: patientProfile.id,
            title: dto.initialChiefComplaint?.trim() || 'Doctor Walk-in Clinical Consultation',
            chiefComplaint: dto.initialChiefComplaint?.trim() || null,
            clinicalNotes: dto.clinicalNotes?.trim() || null,
            status: 'FINAL',
            createdById: doctor.userId,
          },
        });

        await tx.medicalEncounter.create({
          data: {
            medicalRecordId: initialRecord.id,
            providerName: doctor.fullName,
            facilityName: dto.facilityId || 'Clinical Facility',
            encounterType: 'WALK_IN_CONSULTATION',
            encounterDate: new Date(),
          },
        });

        if (dto.initialVitals) {
          await tx.vitalSigns.create({
            data: {
              medicalRecordId: initialRecord.id,
              systolicBp: dto.initialVitals.systolicBp,
              diastolicBp: dto.initialVitals.diastolicBp,
              pulseBpm: dto.initialVitals.pulseBpm,
              temperatureC: dto.initialVitals.temperatureC,
              weightKg: dto.initialVitals.weightKg,
              heightCm: dto.initialVitals.heightCm,
              respirationRate: dto.initialVitals.respirationRate,
              oxygenSaturation: dto.initialVitals.oxygenSaturation,
            },
          });
        }
      }

      // 4. Retrieve Active Health Card
      const activeCard = healthCard;
      const qrToken = qrPayload;

      // 5. Audit Log
      await tx.auditLog.create({
        data: {
          userId: doctor.userId,
          action: 'DOCTOR_REGISTERED_PATIENT',
          details: `Doctor ${doctor.fullName} (${doctor.id}) registered patient ${patientProfile.firstName} ${patientProfile.lastName} (${patientProfile.patientNumber})`,
        },
      });

      // 6. Notification
      try {
        await tx.notification.create({
          data: {
            recipientUserId: user.id,
            recipientPhone: cleanPhone,
            recipientEmail: cleanEmail,
            title: 'Welcome to CareID',
            message: `You were registered with CareID by Dr. ${doctor.fullName}. Your CareID number is ${patientProfile.patientNumber}.`,
            notificationType: 'GENERAL',
            channel: 'IN_APP',
            status: 'SENT',
            sentAt: new Date(),
          },
        });
      } catch {}

      return {
        success: true,
        message: 'Patient registered and clinical access authorized successfully',
        isExistingPatient: false,
        patientProfile: {
          id: patientProfile.id,
          userId: user.id,
          patientNumber: patientProfile.patientNumber || '',
          firstName: patientProfile.firstName || dto.firstName.trim(),
          lastName: patientProfile.lastName || dto.lastName.trim(),
          dateOfBirth: patientProfile.dateOfBirth ? patientProfile.dateOfBirth.toISOString().split('T')[0] : null,
          gender: patientProfile.gender || null,
          bloodGroup: patientProfile.bloodGroup || null,
          phone: user.phone,
          email: user.email,
          status: patientProfile.status,
          onboardingStep: patientProfile.onboardingStep,
          createdAt: patientProfile.createdAt.toISOString(),
        },
        healthCard: activeCard
          ? {
              id: activeCard.id,
              cardNumber: activeCard.cardNumber,
              status: activeCard.status,
              expiresAt: activeCard.expiresAt.toISOString(),
              qrPayload: qrToken,
            }
          : null,
        clinicalAuthorization: {
          authorizedDoctorId: doctor.id,
          authSource: 'CONSENT',
          consentGranted: true,
          grantedAt: consentRecord.grantedAt?.toISOString() || new Date().toISOString(),
        },
        initialRecord: initialRecord
          ? {
              id: initialRecord.id,
              title: initialRecord.title,
              chiefComplaint: initialRecord.chiefComplaint,
              clinicalNotes: initialRecord.clinicalNotes,
            }
          : null,
      };
    });
  }
}
