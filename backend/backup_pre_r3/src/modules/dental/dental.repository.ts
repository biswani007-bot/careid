import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@database/database.service';

@Injectable()
export class DentalRepository {
  constructor(private readonly db: DatabaseService) {}

  async create(data: {
    patientProfileId: string;
    doctorId: string;
    toothNumber?: string;
    toothSurface?: string;
    procedureName: string;
    procedureCode?: string;
    clinicalFindings?: string;
    treatmentDate?: Date;
    followUpDate?: Date;
    status?: string;
  }) {
    return this.db.dentalRecord.create({
      data: {
        patientProfileId: data.patientProfileId,
        doctorId: data.doctorId,
        toothNumber: data.toothNumber || null,
        toothSurface: data.toothSurface || null,
        procedureName: data.procedureName,
        procedureCode: data.procedureCode || null,
        clinicalFindings: data.clinicalFindings || null,
        treatmentDate: data.treatmentDate || new Date(),
        followUpDate: data.followUpDate || null,
        status: data.status || 'COMPLETED',
      },
      include: {
        attachments: { where: { isDeleted: false } },
      },
    });
  }

  async findById(id: string) {
    return this.db.dentalRecord.findUnique({
      where: { id },
      include: {
        attachments: { where: { isDeleted: false } },
      },
    });
  }

  async findByPatient(patientProfileId: string, includeArchived = false) {
    return this.db.dentalRecord.findMany({
      where: {
        patientProfileId,
        ...(includeArchived ? {} : { isArchived: false }),
      },
      orderBy: { treatmentDate: 'desc' },
      include: {
        attachments: { where: { isDeleted: false } },
      },
    });
  }

  async update(id: string, data: any) {
    return this.db.dentalRecord.update({
      where: { id },
      data,
      include: {
        attachments: { where: { isDeleted: false } },
      },
    });
  }

  async setArchived(id: string, isArchived: boolean) {
    return this.db.dentalRecord.update({
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

