import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@database/database.service';
import { IMedicalRecordRepository } from '../../domain/repositories/medical-record.repository.interface';
import {
  MedicalRecordEntity,
  MedicalAttachmentEntity,
  AttachmentVersionEntity,
  MedicalRecordAuditLogEntity,
} from '../../domain/entities/medical-record.entity';

@Injectable()
export class MedicalRecordRepository implements IMedicalRecordRepository {
  constructor(private readonly db: DatabaseService) {}

  async findProfileByUserId(userId: string): Promise<{ id: string } | null> {
    const byUser = await this.db.patientProfile.findUnique({ where: { userId }, select: { id: true } });
    if (byUser) return byUser;
    return this.db.patientProfile.findUnique({ where: { id: userId }, select: { id: true } });
  }

  async findPatientProfileById(idOrUserId: string): Promise<{ id: string; userId: string } | null> {
    if (!idOrUserId || typeof idOrUserId !== 'string') return null;
    return this.db.patientProfile.findFirst({
      where: {
        OR: [{ id: idOrUserId }, { userId: idOrUserId }, { patientNumber: idOrUserId }],
      },
      select: { id: true, userId: true },
    });
  }

  async verifyDoctorAccessToPatient(doctorUserId: string, patientProfileId: string): Promise<boolean> {
    const doctor = await this.db.doctorProfile.findUnique({
      where: { userId: doctorUserId },
      select: { id: true },
    });
    const doctorIdentifiers = [doctor?.id, doctorUserId].filter(Boolean) as string[];

    const patient = await this.findPatientProfileById(patientProfileId);
    const patientIds = [patientProfileId];
    if (patient?.id && !patientIds.includes(patient.id)) patientIds.push(patient.id);
    if (patient?.userId && !patientIds.includes(patient.userId)) patientIds.push(patient.userId);

    // 1. Appointment
    if ((this.db as any).appointment?.findFirst) {
      const appointment = await (this.db as any).appointment.findFirst({
        where: {
          patientProfileId: { in: patientIds },
          doctorProfileId: { in: doctorIdentifiers },
        },
      });
      if (appointment) return true;
    }

    // 2. Active Referral
    const referral = await this.db.patientReferral.findFirst({
      where: {
        patientId: { in: patientIds },
        isDeleted: false,
        status: { in: ['ACCEPTED', 'IN_PROGRESS'] },
        OR: [
          { referringDoctorId: { in: doctorIdentifiers } },
          { receivingDoctorId: { in: doctorIdentifiers } },
        ],
      },
    });
    if (referral) return true;

    // 3. Security Consent
    const consent = await this.db.securityConsentRecord.findFirst({
      where: {
        patientId: { in: patientIds },
        isDeleted: false,
        status: 'GRANTED',
        withdrawnAt: null,
        authorizedDoctorId: { in: doctorIdentifiers },
      },
    });
    if (consent) return true;

    return false;
  }

  // ─── Medical Records ──────────────────────────────────────────────────────
  async createRecord(patientProfileId: string, data: any): Promise<MedicalRecordEntity> {
    return (await this.db.medicalRecord.create({
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
        attachments: { where: { isDeleted: false } },
      },
    })) as unknown as MedicalRecordEntity;
  }

  async findRecordById(id: string, includeDeleted = false): Promise<MedicalRecordEntity | null> {
    return (await this.db.medicalRecord.findFirst({
      where: { id, ...(includeDeleted ? {} : { isDeleted: false }) },
      include: {
        encounters: true,
        diagnoses: true,
        vitalSigns: true,
        procedures: true,
        attachments: { where: { isDeleted: false } },
      },
    })) as unknown as MedicalRecordEntity | null;
  }

  async findRecordsByProfile(patientProfileId: string, includeArchived = true): Promise<MedicalRecordEntity[]> {
    return (await this.db.medicalRecord.findMany({
      where: {
        patientProfileId,
        isDeleted: false,
        ...(includeArchived ? {} : { status: { not: 'ARCHIVED' } }),
      },
      include: {
        encounters: true,
        diagnoses: true,
        vitalSigns: true,
        procedures: true,
        attachments: { where: { isDeleted: false } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })) as unknown as MedicalRecordEntity[];
  }

  async updateRecord(id: string, data: any): Promise<MedicalRecordEntity> {
    return (await this.db.medicalRecord.update({
      where: { id },
      data: {
        title: data.title || undefined,
        chiefComplaint: data.chiefComplaint || undefined,
        clinicalNotes: data.clinicalNotes || undefined,
        treatmentPlan: data.treatmentPlan || undefined,
        followUpInstructions: data.followUpInstructions || undefined,
        status: data.status || undefined,
      },
      include: {
        encounters: true,
        diagnoses: true,
        vitalSigns: true,
        procedures: true,
        attachments: { where: { isDeleted: false } },
      },
    })) as unknown as MedicalRecordEntity;
  }

  async softDeleteRecord(id: string): Promise<void> {
    await this.db.medicalRecord.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }

  async restoreRecord(id: string): Promise<MedicalRecordEntity> {
    return (await this.db.medicalRecord.update({
      where: { id },
      data: { isDeleted: false, deletedAt: null, status: 'FINAL' },
      include: {
        encounters: true,
        diagnoses: true,
        vitalSigns: true,
        procedures: true,
        attachments: { where: { isDeleted: false } },
      },
    })) as unknown as MedicalRecordEntity;
  }

  async searchRecords(patientProfileId: string, query: string): Promise<MedicalRecordEntity[]> {
    const q = query.toLowerCase();
    return (await this.db.medicalRecord.findMany({
      where: {
        patientProfileId,
        isDeleted: false,
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { chiefComplaint: { contains: q, mode: 'insensitive' } },
          { clinicalNotes: { contains: q, mode: 'insensitive' } },
          { treatmentPlan: { contains: q, mode: 'insensitive' } },
          { diagnoses: { some: { description: { contains: q, mode: 'insensitive' } } } },
        ],
      },
      include: {
        encounters: true,
        diagnoses: true,
        vitalSigns: true,
        procedures: true,
        attachments: { where: { isDeleted: false } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })) as unknown as MedicalRecordEntity[];
  }

  async getTimeline(patientProfileId: string): Promise<any[]> {
    const [records, attachments, reports, vaccines, appointments] = await Promise.all([
      this.findRecordsByProfile(patientProfileId, true),
      this.findAttachmentsByProfile(patientProfileId, false),
      this.db.medicalReport.findMany({
        where: { patientProfileId, isDeleted: false },
        orderBy: { reportDate: 'desc' },
      }),
      this.db.vaccinationRecord.findMany({
        where: { patientProfileId },
        include: { vaccine: true },
        orderBy: { administeredDate: 'desc' },
      }),
      this.db.appointment.findMany({
        where: { patientProfileId },
        orderBy: { appointmentDate: 'desc' },
      }),
    ]);

    const events: any[] = [];

    (records || []).forEach((r: any) => {
      const isAdmission = r.encounters?.some((enc: any) => enc.encounterType === 'ADMISSION');
      events.push({
        id: r.id,
        eventType: isAdmission ? 'HOSPITAL_ADMISSION' : 'MEDICAL_RECORD',
        title: r.title,
        status: r.status,
        date: r.createdAt,
        details: {
          chiefComplaint: r.chiefComplaint,
          clinicalNotes: r.clinicalNotes,
          diagnoses: r.diagnoses?.map((d: any) => d.description),
        },
      });
    });

    (attachments || []).forEach((a: any) => {
      events.push({
        id: a.id,
        eventType: 'ATTACHMENT_UPLOAD',
        title: a.originalName,
        category: a.category,
        date: a.createdAt,
        details: {
          fileSize: a.fileSize,
          mimeType: a.mimeType,
          storageUrl: a.storageUrl,
        },
      });
    });

    (reports || []).forEach((rep: any) => {
      events.push({
        id: rep.id,
        eventType: rep.category === 'PRESCRIPTION' ? 'PRESCRIPTION' : 'MEDICAL_REPORT',
        title: rep.title,
        status: rep.status,
        date: rep.reportDate || rep.createdAt,
        details: {
          prescribedBy: rep.prescribedBy || rep.doctorName,
          providerName: rep.providerName,
          facilityName: rep.facilityName,
          description: rep.description,
        },
      });
    });

    (vaccines || []).forEach((v: any) => {
      events.push({
        id: v.id,
        eventType: 'IMMUNISATION',
        title: v.vaccine?.name ? `Vaccine: ${v.vaccine.name}` : `Vaccine Dose ${v.doseNumber}`,
        status: v.status,
        date: v.administeredDate || v.createdAt,
        details: {
          vaccineName: v.vaccine?.name,
          doseNumber: v.doseNumber,
          administeredBy: v.administeredBy,
          facilityName: v.facilityName,
        },
      });
    });

    (appointments || []).forEach((apt: any) => {
      events.push({
        id: apt.id,
        eventType: 'APPOINTMENT',
        title: apt.reason || `Appointment ${apt.appointmentNumber || ''}`.trim(),
        status: apt.status,
        date: apt.appointmentDate,
        details: {
          appointmentType: apt.appointmentType,
          status: apt.status,
          notes: apt.notes,
        },
      });
    });

    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  // ─── Medical Attachments ──────────────────────────────────────────────────
  async createAttachment(data: any): Promise<MedicalAttachmentEntity> {
    const created = await this.db.medicalAttachment.create({
      data: {
        medicalRecordId: data.medicalRecordId || null,
        patientProfileId: data.patientProfileId,
        fileName: data.fileName,
        originalName: data.originalName,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        category: data.category || 'OTHER',
        storageKey: data.storageKey,
        storageUrl: data.storageUrl,
        checksum: data.checksum || null,
        virusScanStatus: data.virusScanStatus || 'PENDING',
        version: 1,
      },
    });

    // Create initial version record
    await this.createAttachmentVersion({
      attachmentId: created.id,
      version: 1,
      storageKey: data.storageKey,
      storageUrl: data.storageUrl,
      fileSize: data.fileSize,
      createdById: data.createdById || null,
    });

    return created as unknown as MedicalAttachmentEntity;
  }

  async updatePatientProfilePhoto(patientProfileId: string, photoUrl: string, photoKey?: string): Promise<void> {
    await this.db.patientProfile.update({
      where: { id: patientProfileId },
      data: {
        photoUrl,
        ...(photoKey ? { photoKey } : {}),
      },
    });
  }

  async findAttachmentById(id: string, includeDeleted = false): Promise<MedicalAttachmentEntity | null> {
    return (await this.db.medicalAttachment.findFirst({
      where: { id, ...(includeDeleted ? {} : { isDeleted: false }) },
    })) as unknown as MedicalAttachmentEntity | null;
  }

  async findAttachmentsByRecord(medicalRecordId: string, includeDeleted = false): Promise<MedicalAttachmentEntity[]> {
    return (await this.db.medicalAttachment.findMany({
      where: { medicalRecordId, ...(includeDeleted ? {} : { isDeleted: false }) },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })) as unknown as MedicalAttachmentEntity[];
  }

  async findAttachmentsByProfile(patientProfileId: string, includeDeleted = false): Promise<MedicalAttachmentEntity[]> {
    return (await this.db.medicalAttachment.findMany({
      where: { patientProfileId, ...(includeDeleted ? {} : { isDeleted: false }) },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })) as unknown as MedicalAttachmentEntity[];
  }

  async updateAttachment(id: string, data: any): Promise<MedicalAttachmentEntity> {
    const existing = await this.findAttachmentById(id);
    if (!existing) throw new Error('Attachment not found');

    const newVersion = data.storageKey ? existing.version + 1 : existing.version;

    const updated = await this.db.medicalAttachment.update({
      where: { id },
      data: {
        category: data.category || undefined,
        fileName: data.fileName || undefined,
        originalName: data.originalName || undefined,
        fileSize: data.fileSize || undefined,
        mimeType: data.mimeType || undefined,
        storageKey: data.storageKey || undefined,
        storageUrl: data.storageUrl || undefined,
        virusScanStatus: data.storageKey ? 'PENDING' : undefined,
        version: newVersion,
      },
    });

    if (data.storageKey) {
      await this.createAttachmentVersion({
        attachmentId: id,
        version: newVersion,
        storageKey: data.storageKey,
        storageUrl: data.storageUrl,
        fileSize: data.fileSize || existing.fileSize,
        createdById: data.createdById || null,
      });
    }

    return updated as unknown as MedicalAttachmentEntity;
  }

  async softDeleteAttachment(id: string): Promise<void> {
    await this.db.medicalAttachment.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }

  async restoreAttachment(id: string): Promise<MedicalAttachmentEntity> {
    return (await this.db.medicalAttachment.update({
      where: { id },
      data: { isDeleted: false, deletedAt: null },
    })) as unknown as MedicalAttachmentEntity;
  }

  // ─── Attachment Versions ──────────────────────────────────────────────────
  async createAttachmentVersion(data: any): Promise<AttachmentVersionEntity> {
    return (await this.db.attachmentVersion.create({
      data: {
        attachmentId: data.attachmentId,
        version: data.version,
        storageKey: data.storageKey,
        storageUrl: data.storageUrl,
        fileSize: data.fileSize,
        createdById: data.createdById || null,
      },
    })) as unknown as AttachmentVersionEntity;
  }

  async findAttachmentVersions(attachmentId: string): Promise<AttachmentVersionEntity[]> {
    return (await this.db.attachmentVersion.findMany({
      where: { attachmentId },
      orderBy: { version: 'desc' },
    })) as unknown as AttachmentVersionEntity[];
  }

  // ─── Intra-Op Clinical Workflow ──────────────────────────────────────────
  async addProcedureToRecord(medicalRecordId: string, data: any): Promise<any> {
    return this.db.medicalProcedure.create({
      data: {
        medicalRecordId,
        name: data.name,
        code: data.code || null,
        performedAt: data.performedAt ? new Date(data.performedAt) : new Date(),
        notes: data.notes || null,
      },
    });
  }

  async addVitalSignsToRecord(medicalRecordId: string, data: any): Promise<any> {
    return this.db.vitalSigns.create({
      data: {
        medicalRecordId,
        systolicBp: data.systolicBp || null,
        diastolicBp: data.diastolicBp || null,
        pulseBpm: data.pulseBpm || null,
        respirationRate: data.respirationRate || null,
        temperatureC: data.temperatureC || null,
        oxygenSaturation: data.oxygenSaturation || null,
        heightCm: data.heightCm || null,
        weightKg: data.weightKg || null,
        bloodSugarMgDl: data.bloodSugarMgDl || null,
        recordedAt: data.recordedAt ? new Date(data.recordedAt) : new Date(),
      },
    });
  }

  async findEncounterById(encounterId: string): Promise<any | null> {
    return this.db.medicalEncounter.findUnique({
      where: { id: encounterId },
    });
  }

  // ─── Audit Logs ───────────────────────────────────────────────────────────
  async createAuditLog(data: {
    medicalRecordId?: string;
    attachmentId?: string;
    action: string;
    performedBy?: string;
    details?: string;
  }): Promise<MedicalRecordAuditLogEntity> {
    return (await this.db.medicalRecordAuditLog.create({
      data: {
        medicalRecordId: data.medicalRecordId || null,
        attachmentId: data.attachmentId || null,
        action: data.action,
        performedBy: data.performedBy || null,
        details: data.details || null,
      },
    })) as unknown as MedicalRecordAuditLogEntity;
  }

  // ─── Addenda Implementation ───────────────────────────────────────────────
  async createAddendum(data: {
    medicalRecordId: string;
    authorDoctorId: string;
    authorName: string;
    addendumNotes: string;
    reason?: string;
  }): Promise<any> {
    return this.db.medicalRecordAddendum.create({
      data: {
        medicalRecordId: data.medicalRecordId,
        authorDoctorId: data.authorDoctorId,
        authorName: data.authorName,
        addendumNotes: data.addendumNotes,
        reason: data.reason || null,
      },
    });
  }

  async findAddendaByRecordId(medicalRecordId: string): Promise<any[]> {
    return this.db.medicalRecordAddendum.findMany({
      where: { medicalRecordId },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ─── Record Share Grants Implementation ───────────────────────────────────
  async createShareGrant(data: {
    medicalRecordId: string;
    grantedByDoctorId: string;
    recipientType: string;
    recipientTarget: string;
    purpose: string;
    shareToken: string;
    expiresAt: Date;
  }): Promise<any> {
    return this.db.recordShareGrant.create({
      data: {
        medicalRecordId: data.medicalRecordId,
        grantedByDoctorId: data.grantedByDoctorId,
        recipientType: data.recipientType,
        recipientTarget: data.recipientTarget,
        purpose: data.purpose,
        shareToken: data.shareToken,
        expiresAt: data.expiresAt,
      },
    });
  }

  async findShareGrantByToken(shareToken: string): Promise<any | null> {
    return this.db.recordShareGrant.findUnique({
      where: { shareToken },
      include: {
        medicalRecord: {
          include: {
            encounters: true,
            diagnoses: true,
            vitalSigns: true,
            procedures: true,
            attachments: { where: { isDeleted: false } },
            addenda: { orderBy: { createdAt: 'asc' } },
          },
        },
      },
    });
  }

  async findShareGrantsByRecordId(medicalRecordId: string): Promise<any[]> {
    return this.db.recordShareGrant.findMany({
      where: { medicalRecordId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeShareGrant(medicalRecordId: string, grantId: string): Promise<any | null> {
    const grant = await this.db.recordShareGrant.findFirst({
      where: { id: grantId, medicalRecordId },
    });
    if (!grant) return null;
    return this.db.recordShareGrant.update({
      where: { id: grantId },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    });
  }

  async incrementShareAccessCount(grantId: string): Promise<void> {
    await this.db.recordShareGrant.update({
      where: { id: grantId },
      data: {
        accessCount: { increment: 1 },
      },
    });
  }

  async getFavoriteRecordIds(patientProfileId: string, userId: string): Promise<string[]> {
    const logs = await this.db.medicalRecordAuditLog.findMany({
      where: {
        performedBy: userId,
        action: { in: ['RECORD_FAVORITED', 'RECORD_UNFAVORITED'] },
        medicalRecordId: { not: null },
      },
      orderBy: { createdAt: 'desc' },
    });

    const statusMap = new Map<string, string>();
    for (const log of logs) {
      if (log.medicalRecordId && !statusMap.has(log.medicalRecordId)) {
        statusMap.set(log.medicalRecordId, log.action);
      }
    }

    const favIds: string[] = [];
    for (const [recId, action] of statusMap.entries()) {
      if (action === 'RECORD_FAVORITED') {
        favIds.push(recId);
      }
    }
    return favIds;
  }

  async setFavoriteRecord(recordId: string, userId: string, isFav: boolean): Promise<void> {
    await this.createAuditLog({
      medicalRecordId: recordId,
      action: isFav ? 'RECORD_FAVORITED' : 'RECORD_UNFAVORITED',
      performedBy: userId,
      details: isFav ? 'Record marked as favorite' : 'Record removed from favorites',
    });
  }
}
