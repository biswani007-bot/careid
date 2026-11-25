import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@database/database.service';

@Injectable()
export class LaboratoryRepository {
  constructor(private readonly db: DatabaseService) {}

  async createReport(data: {
    patientProfileId: string;
    doctorId?: string;
    laboratoryName: string;
    specimenType?: string;
    collectedDate?: Date;
    reportedDate?: Date;
    status?: string;
    overallNotes?: string;
    attachmentId?: string;
    testItems: any[];
  }) {
    return this.db.laboratoryReport.create({
      data: {
        patientProfileId: data.patientProfileId,
        doctorId: data.doctorId || null,
        laboratoryName: data.laboratoryName,
        specimenType: data.specimenType || null,
        collectedDate: data.collectedDate || new Date(),
        reportedDate: data.reportedDate || new Date(),
        status: data.status || 'FINAL',
        overallNotes: data.overallNotes || null,
        attachmentId: data.attachmentId || null,
        testItems: {
          create: (data.testItems || []).map((ti) => ({
            testName: ti.testName,
            testCategory: ti.testCategory || null,
            numericValue: ti.numericValue !== undefined ? ti.numericValue : null,
            textValue: ti.textValue || null,
            unit: ti.unit || null,
            referenceRange: ti.referenceRange,
            referenceLow: ti.referenceLow !== undefined ? ti.referenceLow : null,
            referenceHigh: ti.referenceHigh !== undefined ? ti.referenceHigh : null,
            flag: ti.flag || 'NORMAL',
            status: ti.status || 'COMPLETED',
          })),
        },
      },
      include: {
        testItems: true,
        attachment: true,
      },
    });
  }

  async findReportById(id: string) {
    return this.db.laboratoryReport.findUnique({
      where: { id },
      include: {
        testItems: true,
        attachment: true,
      },
    });
  }

  async findReportsByPatient(patientProfileId: string) {
    return this.db.laboratoryReport.findMany({
      where: { patientProfileId },
      orderBy: { reportedDate: 'desc' },
      include: {
        testItems: true,
        attachment: true,
      },
    });
  }

  async updateReport(id: string, data: any) {
    return this.db.laboratoryReport.update({
      where: { id },
      data,
      include: {
        testItems: true,
        attachment: true,
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

