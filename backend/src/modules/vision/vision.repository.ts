import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@database/database.service';

@Injectable()
export class VisionRepository {
  constructor(private readonly db: DatabaseService) {}

  async create(data: any) {
    return this.db.visionRecord.create({
      data: {
        patientProfileId: data.patientProfileId,
        doctorId: data.doctorId,
        examinationDate: data.examinationDate || new Date(),
        odSphere: data.odSphere ?? null,
        odCylinder: data.odCylinder ?? null,
        odAxis: data.odAxis ?? null,
        odAddition: data.odAddition ?? null,
        odVisualAcuity: data.odVisualAcuity ?? null,
        odIopMmHg: data.odIopMmHg ?? null,
        osSphere: data.osSphere ?? null,
        osCylinder: data.osCylinder ?? null,
        osAxis: data.osAxis ?? null,
        osAddition: data.osAddition ?? null,
        osVisualAcuity: data.osVisualAcuity ?? null,
        osIopMmHg: data.osIopMmHg ?? null,
        contactLensBaseCurve: data.contactLensBaseCurve ?? null,
        contactLensDiameter: data.contactLensDiameter ?? null,
        clinicalNotes: data.clinicalNotes ?? null,
        recommendations: data.recommendations ?? null,
        status: data.status || 'FINAL',
      },
      include: {
        attachments: { where: { isDeleted: false } },
      },
    });
  }

  async findById(id: string) {
    return this.db.visionRecord.findUnique({
      where: { id },
      include: {
        attachments: { where: { isDeleted: false } },
      },
    });
  }

  async findByPatient(patientProfileId: string, includeArchived = false) {
    return this.db.visionRecord.findMany({
      where: {
        patientProfileId,
        ...(includeArchived ? {} : { isArchived: false }),
      },
      orderBy: { examinationDate: 'desc' },
      include: {
        attachments: { where: { isDeleted: false } },
      },
    });
  }

  async update(id: string, data: any) {
    return this.db.visionRecord.update({
      where: { id },
      data,
      include: {
        attachments: { where: { isDeleted: false } },
      },
    });
  }

  async setArchived(id: string, isArchived: boolean) {
    return this.db.visionRecord.update({
      where: { id },
      data: { isArchived },
      include: {
        attachments: { where: { isDeleted: false } },
      },
    });
  }

  async findDoctorProfileByUserId(userId: string) {
    return this.db.doctorProfile.findUnique({
      where: { userId },
    });
  }

  async findPatientProfile(idOrUserId: string) {
    return this.db.patientProfile.findFirst({
      where: {
        OR: [{ id: idOrUserId }, { userId: idOrUserId }],
      },
    });
  }
}

