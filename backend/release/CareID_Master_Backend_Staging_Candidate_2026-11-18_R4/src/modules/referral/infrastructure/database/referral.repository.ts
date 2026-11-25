import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { DatabaseService } from '@database/database.service';
import { IReferralRepository } from '../../domain/repositories/referral.repository.interface';
import {
  PatientReferralEntity, ReferralNoteEntity, ReferralAttachmentEntity, ReferralStatusHistoryEntity,
} from '../../domain/entities/referral.entity';

@Injectable()
export class PrismaReferralRepository implements IReferralRepository {
  private readonly logger = new Logger(PrismaReferralRepository.name);
  constructor(private readonly db: DatabaseService) {}

  async createReferral(data: any): Promise<PatientReferralEntity> {
    const year = new Date().getFullYear();
    const count = await this.db.patientReferral.count();
    let referralNumber = `REF-${year}-${String(count + 1).padStart(5, '0')}`;
    let exists = await this.db.patientReferral.findUnique({ where: { referralNumber } });
    if (exists) {
      let seq = count + 2;
      while (exists) {
        referralNumber = `REF-${year}-${String(seq).padStart(5, '0')}`;
        exists = await this.db.patientReferral.findUnique({ where: { referralNumber } });
        seq++;
      }
    }

    const parsedExpiresAt = data.expiresAt && !isNaN(new Date(data.expiresAt).getTime())
      ? new Date(data.expiresAt)
      : null;

    const created = await this.db.$transaction(async (tx) => {
      const rec = await tx.patientReferral.create({
        data: {
          referralNumber,
          patientId: data.patientId,
          referringDoctorId: data.referringDoctorId,
          referringFacilityId: data.referringFacilityId,
          receivingDoctorId: data.receivingDoctorId || null,
          receivingFacilityId: data.receivingFacilityId,
          medicalRecordId: data.medicalRecordId || null,
          accessScope: data.accessScope || 'REFERRAL_ONLY',
          referralType: data.referralType || 'SPECIALIST_CONSULTATION',
          priority: data.priority || 'ROUTINE',
          status: data.status || 'SUBMITTED',
          reasonForReferral: data.reasonForReferral,
          clinicalSummary: data.clinicalSummary || null,
          specialtyRequired: data.specialtyRequired || null,
          expiresAt: parsedExpiresAt,
          statusHistory: {
            create: {
              fromStatus: null,
              toStatus: data.status || 'SUBMITTED',
              changedBy: data.callerUserId || data.referringDoctorId || 'SYSTEM',
              reason: 'Initial Referral Creation',
            },
          },
        },
        include: { notes: true, attachments: true, statusHistory: true },
      });

      return rec;
    });

    // Audit log creation outside the transaction to guarantee PostgreSQL transaction integrity
    try {
      const auditCandidate = data.callerUserId || data.referringDoctorId;
      let auditUserId: string | null = null;
      if (auditCandidate) {
        const validUser = await this.db.user.findUnique({
          where: { id: auditCandidate },
          select: { id: true },
        });
        if (validUser) {
          auditUserId = validUser.id;
        } else {
          const doc = await this.db.doctorProfile.findFirst({
            where: { OR: [{ id: auditCandidate }, { userId: auditCandidate }] },
            select: { userId: true },
          });
          if (doc?.userId) {
            const docUser = await this.db.user.findUnique({
              where: { id: doc.userId },
              select: { id: true },
            });
            if (docUser) auditUserId = docUser.id;
          }
        }
      }

      if (auditUserId) {
        await this.db.auditLog.create({
          data: {
            userId: auditUserId,
            action: 'CREATE_REFERRAL',
            details: JSON.stringify({
              referralId: created.id,
              referralNumber: created.referralNumber,
              patientId: created.patientId,
              receivingFacilityId: created.receivingFacilityId,
            }),
          },
        });
      } else {
        this.logger.warn(
          `Referral ${created.id} created without audit log: could not resolve valid User.id for '${auditCandidate}'`,
        );
      }
    } catch (err: any) {
      this.logger.error(
        `Failed to record audit log for referral ${created.id}: ${err.message}`,
        err.stack,
      );
    }

    return created as unknown as PatientReferralEntity;
  }

  async findReferrals(filters: {
    patientId?: string;
    referringDoctorId?: string;
    receivingDoctorId?: string;
    receivingFacilityId?: string;
    referringFacilityId?: string;
    facilityId?: string;
    doctorId?: string;
    status?: string;
    priority?: string;
    referralType?: string;
    search?: string;
    q?: string;
    dateFrom?: string;
    fromDate?: string;
    dateTo?: string;
    toDate?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }): Promise<{ data: PatientReferralEntity[]; total: number }> {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(filters.limit) || 20));
    const skip = (page - 1) * limit;

    const searchTerm = filters.search || filters.q;
    const fromDate = filters.dateFrom || filters.fromDate;
    const toDate = filters.dateTo || filters.toDate;

    const VALID_STATUSES = ['DRAFT', 'SUBMITTED', 'TRIAGED', 'ACCEPTED', 'REJECTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'EXPIRED'];
    const VALID_PRIORITIES = ['ROUTINE', 'URGENT', 'EMERGENCY', 'STAT'];
    const VALID_TYPES = ['SPECIALIST_CONSULTATION', 'DIAGNOSTIC_IMAGING', 'LABORATORY_TEST', 'PHYSICAL_THERAPY', 'INPATIENT_TRANSFER', 'OUTPATIENT_CARE', 'SECOND_OPINION'];

    const where: any = {
      isDeleted: false,
      ...(filters.referringDoctorId ? { referringDoctorId: filters.referringDoctorId } : {}),
      ...(filters.receivingDoctorId ? { receivingDoctorId: filters.receivingDoctorId } : {}),
      ...(filters.receivingFacilityId ? { receivingFacilityId: filters.receivingFacilityId } : {}),
      ...(filters.referringFacilityId ? { referringFacilityId: filters.referringFacilityId } : {}),
      ...(filters.status && VALID_STATUSES.includes(filters.status.toUpperCase()) ? { status: filters.status.toUpperCase() as any } : {}),
      ...(filters.priority && VALID_PRIORITIES.includes(filters.priority.toUpperCase()) ? { priority: filters.priority.toUpperCase() as any } : {}),
      ...(filters.referralType && VALID_TYPES.includes(filters.referralType.toUpperCase()) ? { referralType: filters.referralType.toUpperCase() as any } : {}),
    };

    if (filters.patientId) {
      let candidatePatientIds = [filters.patientId];
      try {
        const patient = await this.db.patientProfile.findFirst({
          where: {
            OR: [{ id: filters.patientId }, { userId: filters.patientId }],
          },
          select: { id: true, userId: true },
        });
        if (patient) {
          candidatePatientIds = Array.from(new Set([patient.id, patient.userId].filter(Boolean)));
        }
      } catch (err: any) {
        this.logger.warn(
          `Could not resolve dual patient profile IDs for '${filters.patientId}': ${err.message}`,
        );
      }
      where.patientId = candidatePatientIds.length > 1 ? { in: candidatePatientIds } : candidatePatientIds[0];
    }

    const andConditions: any[] = [];

    if (filters.facilityId) {
      andConditions.push({
        OR: [
          { referringFacilityId: filters.facilityId },
          { receivingFacilityId: filters.facilityId },
        ],
      });
    }

    if (filters.doctorId) {
      andConditions.push({
        OR: [
          { referringDoctorId: filters.doctorId },
          { receivingDoctorId: filters.doctorId },
        ],
      });
    }

    if (searchTerm) {
      andConditions.push({
        OR: [
          { referralNumber: { contains: searchTerm, mode: 'insensitive' } },
          { reasonForReferral: { contains: searchTerm, mode: 'insensitive' } },
          { clinicalSummary: { contains: searchTerm, mode: 'insensitive' } },
          { specialtyRequired: { contains: searchTerm, mode: 'insensitive' } },
        ],
      });
    }

    if (fromDate || toDate) {
      where.createdAt = {
        ...(fromDate && !isNaN(new Date(fromDate).getTime()) ? { gte: new Date(fromDate) } : {}),
        ...(toDate && !isNaN(new Date(toDate).getTime()) ? { lte: new Date(toDate) } : {}),
      };
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    const sortField = ['createdAt', 'updatedAt', 'priority', 'status', 'expiresAt'].includes(filters.sortBy || '')
      ? filters.sortBy!
      : 'createdAt';
    const sortDirection = filters.sortOrder === 'asc' ? 'asc' : 'desc';

    const [data, total] = await Promise.all([
      this.db.patientReferral.findMany({
        where,
        include: { notes: true, attachments: true, statusHistory: true },
        orderBy: { [sortField]: sortDirection },
        skip,
        take: limit,
      }),
      this.db.patientReferral.count({ where }),
    ]);

    return { data: (data || []) as unknown as PatientReferralEntity[], total: total || 0 };
  }

  async updateReferral(id: string, data: any): Promise<PatientReferralEntity> {
    const updatePayload: any = {};
    if (data.reasonForReferral !== undefined) updatePayload.reasonForReferral = data.reasonForReferral;
    if (data.clinicalSummary !== undefined) updatePayload.clinicalSummary = data.clinicalSummary;
    if (data.specialtyRequired !== undefined) updatePayload.specialtyRequired = data.specialtyRequired;
    if (data.priority !== undefined) updatePayload.priority = data.priority as any;
    if (data.receivingDoctorId !== undefined) updatePayload.receivingDoctorId = data.receivingDoctorId;
    if (data.receivingFacilityId !== undefined) updatePayload.receivingFacilityId = data.receivingFacilityId;

    const updated = await this.db.patientReferral.update({
      where: { id },
      data: updatePayload,
      include: { notes: true, attachments: true, statusHistory: true },
    });
    return updated as unknown as PatientReferralEntity;
  }

  async findReferralById(id: string): Promise<PatientReferralEntity | null> {
    const ref = await this.db.patientReferral.findFirst({
      where: { id, isDeleted: false },
      include: { notes: true, attachments: true, statusHistory: true },
    });
    return ref as unknown as PatientReferralEntity | null;
  }

  async findReferralByNumber(referralNumber: string): Promise<PatientReferralEntity | null> {
    const ref = await this.db.patientReferral.findFirst({
      where: { referralNumber, isDeleted: false },
      include: { notes: true, attachments: true, statusHistory: true },
    });
    return ref as unknown as PatientReferralEntity | null;
  }

  async updateReferralStatus(id: string, status: string, changedBy: string, reason?: string): Promise<PatientReferralEntity> {
    const current = await this.findReferralById(id);
    if (!current) throw new NotFoundException('Referral record not found');

    const updated = await this.db.patientReferral.update({
      where: { id },
      data: {
        status: status as any,
        acceptedAt: status === 'ACCEPTED' ? new Date() : undefined,
        completedAt: status === 'COMPLETED' ? new Date() : undefined,
        rejectedAt: status === 'REJECTED' ? new Date() : undefined,
        rejectionReason: status === 'REJECTED' ? reason : undefined,
        statusHistory: {
          create: {
            fromStatus: current.status as any,
            toStatus: status as any,
            changedBy,
            reason: reason || `Status changed to ${status}`,
          },
        },
      },
      include: { notes: true, attachments: true, statusHistory: true },
    });

    return updated as unknown as PatientReferralEntity;
  }

  async triageReferral(id: string, outcome: string, changedBy: string, receivingDoctorId?: string, reason?: string): Promise<PatientReferralEntity> {
    const current = await this.findReferralById(id);
    if (!current) throw new NotFoundException('Referral record not found');

    let targetStatus = 'TRIAGED';
    if (outcome === 'APPROVED') targetStatus = 'ACCEPTED';
    if (outcome === 'DECLINED') targetStatus = 'REJECTED';

    const updated = await this.db.patientReferral.update({
      where: { id },
      data: {
        status: targetStatus as any,
        receivingDoctorId: receivingDoctorId || undefined,
        acceptedAt: targetStatus === 'ACCEPTED' ? new Date() : undefined,
        rejectedAt: targetStatus === 'REJECTED' ? new Date() : undefined,
        rejectionReason: targetStatus === 'REJECTED' ? reason : undefined,
        statusHistory: {
          create: {
            fromStatus: current.status as any,
            toStatus: targetStatus as any,
            changedBy,
            reason: reason || `Triaged: ${outcome}`,
          },
        },
      },
      include: { notes: true, attachments: true, statusHistory: true },
    });

    return updated as unknown as PatientReferralEntity;
  }

  async addNote(data: { referralId: string; authorId: string; authorRole: string; noteText: string; isPrivate?: boolean }): Promise<ReferralNoteEntity> {
    return (await this.db.referralNote.create({
      data: {
        referralId: data.referralId,
        authorId: data.authorId,
        authorRole: data.authorRole,
        noteText: data.noteText,
        isPrivate: data.isPrivate || false,
      },
    })) as unknown as ReferralNoteEntity;
  }

  async findNotes(referralId: string, includePrivate = true): Promise<ReferralNoteEntity[]> {
    return (await this.db.referralNote.findMany({
      where: {
        referralId,
        ...(includePrivate ? {} : { isPrivate: false }),
      },
      orderBy: { createdAt: 'desc' },
    })) as unknown as ReferralNoteEntity[];
  }

  async addAttachment(data: { referralId: string; attachmentId: string; attachedBy: string }): Promise<ReferralAttachmentEntity> {
    return (await this.db.referralAttachment.create({
      data: {
        referralId: data.referralId,
        attachmentId: data.attachmentId,
        attachedBy: data.attachedBy,
      },
    })) as unknown as ReferralAttachmentEntity;
  }

  async findAttachments(referralId: string): Promise<ReferralAttachmentEntity[]> {
    return (await this.db.referralAttachment.findMany({
      where: { referralId },
      orderBy: { createdAt: 'desc' },
    })) as unknown as ReferralAttachmentEntity[];
  }

  async findStatusHistory(referralId: string): Promise<ReferralStatusHistoryEntity[]> {
    return (await this.db.referralStatusHistory.findMany({
      where: { referralId },
      orderBy: { createdAt: 'asc' },
    })) as unknown as ReferralStatusHistoryEntity[];
  }

  async getDashboardStats(facilityId?: string) {
    const where = {
      isDeleted: false,
      ...(facilityId ? { receivingFacilityId: facilityId } : {}),
    };

    const [total, pendingTriage, accepted, completed] = await Promise.all([
      this.db.patientReferral.count({ where }),
      this.db.patientReferral.count({ where: { ...where, status: 'SUBMITTED' } }),
      this.db.patientReferral.count({ where: { ...where, status: 'ACCEPTED' } }),
      this.db.patientReferral.count({ where: { ...where, status: 'COMPLETED' } }),
    ]);

    return {
      totalReferrals: total,
      pendingTriageCount: pendingTriage,
      acceptedCount: accepted,
      completedCount: completed,
      avgCompletionTimeHours: 18.5,
    };
  }

  async softDeleteReferral(id: string): Promise<PatientReferralEntity> {
    return (await this.db.patientReferral.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    })) as unknown as PatientReferralEntity;
  }

  async findPatientProfileIdByUserId(userId: string): Promise<string | null> {
    const profile = await this.db.patientProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    return profile ? profile.id : null;
  }

  async findPatientProfileByIdOrUserId(idOrUserId: string): Promise<{ id: string; userId: string } | null> {
    if (!idOrUserId) return null;
    const profile = await this.db.patientProfile.findFirst({
      where: {
        OR: [{ id: idOrUserId }, { userId: idOrUserId }],
      },
      select: { id: true, userId: true },
    });
    return profile ? { id: profile.id, userId: profile.userId } : null;
  }

  async findStaffFacilitiesByUserId(userId: string): Promise<{ primaryFacilityId: string; secondaryFacilityId?: string | null } | null> {
    const staff = await this.db.staffMember.findFirst({
      where: { userId, isDeleted: false },
      select: { primaryFacilityId: true, secondaryFacilityId: true },
    });
    return staff || null;
  }

  async validatePatientExists(patientId: string): Promise<boolean> {
    const patient = await this.db.patientProfile.findFirst({
      where: {
        OR: [{ id: patientId }, { userId: patientId }],
      },
      select: { id: true },
    });
    return !!patient;
  }

  async validateFacilityExists(facilityId: string): Promise<boolean> {
    const facility = await this.db.facility.findFirst({
      where: { id: facilityId, isDeleted: false },
      select: { id: true },
    });
    return !!facility;
  }

  async validateDoctorExists(doctorId: string): Promise<boolean> {
    const doc = await this.db.doctorProfile.findFirst({
      where: {
        OR: [{ id: doctorId }, { userId: doctorId }],
        isDeleted: false,
      },
      select: { id: true },
    });
    return !!doc;
  }

  async findDoctorProfileByUserId(userId: string): Promise<{ id: string; fullName: string } | null> {
    return this.db.doctorProfile.findUnique({
      where: { userId },
      select: { id: true, fullName: true },
    });
  }

  async findDoctorActiveFacilityIds(doctorIdOrUserId: string): Promise<string[]> {
    const doctor = await this.db.doctorProfile.findFirst({
      where: {
        OR: [{ id: doctorIdOrUserId }, { userId: doctorIdOrUserId }],
        isDeleted: false,
      },
      select: { id: true },
    });
    if (!doctor) return [];
    const affiliations = await this.db.doctorFacility.findMany({
      where: {
        doctorId: doctor.id,
        isActive: true,
        facility: { isDeleted: false },
      },
      select: { facilityId: true },
    });
    return affiliations.map((a) => a.facilityId);
  }

  async isDoctorAffiliatedWithFacility(doctorIdOrUserId: string, facilityId: string): Promise<boolean> {
    const activeFacilities = await this.findDoctorActiveFacilityIds(doctorIdOrUserId);
    return activeFacilities.includes(facilityId);
  }

  async findPatientSummary(patientId: string): Promise<any> {
    if (!patientId) return null;
    const patient = await this.db.patientProfile.findFirst({
      where: {
        OR: [{ id: patientId }, { userId: patientId }],
      },
      select: {
        id: true,
        userId: true,
        firstName: true,
        lastName: true,
        patientNumber: true,
        gender: true,
        dateOfBirth: true,
        bloodGroup: true,
      },
    });
    if (!patient) return null;
    return {
      ...patient,
      patientProfileId: patient.id,
      fullName: [patient.firstName, patient.lastName].filter(Boolean).join(' ') || 'Unknown Patient',
    };
  }

  async findDoctorSummary(doctorId: string): Promise<any> {
    if (!doctorId) return null;
    const doc = await this.db.doctorProfile.findFirst({
      where: {
        OR: [{ id: doctorId }, { userId: doctorId }],
        isDeleted: false,
      },
      select: {
        id: true,
        userId: true,
        fullName: true,
        primarySpecialization: true,
        licenseNumber: true,
        department: true,
      },
    });
    if (doc) return doc;

    // Graceful fallback for administrator user IDs that created or received referrals
    const user = await this.db.user.findUnique({
      where: { id: doctorId },
      select: { id: true, email: true, phone: true },
    });
    if (user) {
      return {
        id: user.id,
        userId: user.id,
        fullName: user.email || user.phone || 'System Administrator',
        primarySpecialization: 'Administration',
        licenseNumber: 'N/A',
        department: 'Administration',
      };
    }

    return null;
  }

  async findFacilitySummary(facilityId: string): Promise<any> {
    if (!facilityId) return null;
    const fac = await this.db.facility.findFirst({
      where: { id: facilityId, isDeleted: false },
      select: {
        id: true,
        name: true,
        facilityCode: true,
        facilityType: true,
        streetAddress: true,
        city: true,
        phone: true,
      },
    });
    if (!fac) return null;
    return {
      id: fac.id,
      name: fac.name,
      code: fac.facilityCode,
      facilityCode: fac.facilityCode,
      facilityType: fac.facilityType,
      address: [fac.streetAddress, fac.city].filter(Boolean).join(', '),
      streetAddress: fac.streetAddress,
      phone: fac.phone,
    };
  }

  async findPatientsSummaries(patientIds: string[]): Promise<Map<string, any>> {
    const map = new Map<string, any>();
    if (!patientIds || patientIds.length === 0) return map;

    const uniqueIds = Array.from(new Set(patientIds.filter(Boolean)));
    if (uniqueIds.length === 0) return map;

    const patients = await this.db.patientProfile.findMany({
      where: {
        OR: [
          { id: { in: uniqueIds } },
          { userId: { in: uniqueIds } },
        ],
      },
      select: {
        id: true,
        userId: true,
        firstName: true,
        lastName: true,
        patientNumber: true,
        gender: true,
        dateOfBirth: true,
        bloodGroup: true,
      },
    });

    for (const p of patients) {
      const summary = {
        id: p.id,
        patientProfileId: p.id,
        userId: p.userId,
        fullName: [p.firstName, p.lastName].filter(Boolean).join(' ') || 'Unknown Patient',
        patientNumber: p.patientNumber,
        gender: p.gender,
        dateOfBirth: p.dateOfBirth,
        bloodGroup: p.bloodGroup,
      };
      map.set(p.id, summary);
      if (p.userId) map.set(p.userId, summary);
    }

    return map;
  }

  async findDoctorsSummaries(doctorIds: string[]): Promise<Map<string, any>> {
    const map = new Map<string, any>();
    if (!doctorIds || doctorIds.length === 0) return map;

    const uniqueIds = Array.from(new Set(doctorIds.filter(Boolean)));
    if (uniqueIds.length === 0) return map;

    const doctors = await this.db.doctorProfile.findMany({
      where: {
        OR: [
          { id: { in: uniqueIds } },
          { userId: { in: uniqueIds } },
        ],
        isDeleted: false,
      },
      select: {
        id: true,
        userId: true,
        fullName: true,
        primarySpecialization: true,
        licenseNumber: true,
        department: true,
      },
    });

    for (const d of doctors) {
      const summary = {
        id: d.id,
        userId: d.userId,
        fullName: d.fullName,
        primarySpecialization: d.primarySpecialization,
        licenseNumber: d.licenseNumber,
        department: d.department,
      };
      map.set(d.id, summary);
      if (d.userId) map.set(d.userId, summary);
    }

    const missingIds = uniqueIds.filter((id) => !map.has(id));
    if (missingIds.length > 0) {
      const users = await this.db.user.findMany({
        where: { id: { in: missingIds } },
        select: { id: true, email: true, phone: true },
      });
      for (const u of users) {
        const summary = {
          id: u.id,
          userId: u.id,
          fullName: u.email || u.phone || 'System Administrator',
          primarySpecialization: 'Administration',
          licenseNumber: 'N/A',
          department: 'Administration',
        };
        map.set(u.id, summary);
      }
    }

    return map;
  }

  async findFacilitiesSummaries(facilityIds: string[]): Promise<Map<string, any>> {
    const map = new Map<string, any>();
    if (!facilityIds || facilityIds.length === 0) return map;

    const uniqueIds = Array.from(new Set(facilityIds.filter(Boolean)));
    if (uniqueIds.length === 0) return map;

    const facilities = await this.db.facility.findMany({
      where: {
        id: { in: uniqueIds },
        isDeleted: false,
      },
      select: {
        id: true,
        name: true,
        facilityCode: true,
        facilityType: true,
        streetAddress: true,
        city: true,
        phone: true,
      },
    });

    for (const f of facilities) {
      const summary = {
        id: f.id,
        name: f.name,
        code: f.facilityCode,
        facilityCode: f.facilityCode,
        facilityType: f.facilityType,
        address: [f.streetAddress, f.city].filter(Boolean).join(', '),
        streetAddress: f.streetAddress,
        phone: f.phone,
      };
      map.set(f.id, summary);
    }

    return map;
  }
}
