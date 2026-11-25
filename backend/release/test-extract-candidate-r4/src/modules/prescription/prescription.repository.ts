import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@database/database.service';

@Injectable()
export class PrescriptionRepository {
  constructor(private readonly db: DatabaseService) {}

  async create(data: {
    patientProfileId: string;
    doctorId: string;
    diagnosisCode?: string;
    notes?: string;
    items: Array<{
      drugName: string;
      dosage: string;
      form: string;
      route?: string;
      frequency: string;
      durationDays: number;
      instructions?: string;
    }>;
  }) {
    return this.db.prescription.create({
      data: {
        patientProfileId: data.patientProfileId,
        doctorId: data.doctorId,
        diagnosisCode: data.diagnosisCode || null,
        notes: data.notes || null,
        status: 'ACTIVE',
        items: {
          create: data.items.map((item) => ({
            drugName: item.drugName,
            dosage: item.dosage,
            form: item.form,
            route: item.route || 'ORAL',
            frequency: item.frequency,
            durationDays: item.durationDays,
            instructions: item.instructions || null,
          })),
        },
      },
      include: {
        items: true,
        refills: true,
        doctorProfile: {
          include: { user: true },
        },
      },
    });
  }

  async findById(id: string) {
    return this.db.prescription.findUnique({
      where: { id },
      include: {
        items: true,
        refills: { orderBy: { refillNumber: 'asc' } },
        doctorProfile: {
          include: { user: true },
        },
      },
    });
  }

  async findByPatient(patientProfileId: string) {
    return this.db.prescription.findMany({
      where: { patientProfileId },
      orderBy: { prescribedAt: 'desc' },
      include: {
        items: true,
        refills: true,
        doctorProfile: {
          include: { user: true },
        },
      },
    });
  }

  async discontinue(id: string, reason: string) {
    return this.db.prescription.update({
      where: { id },
      data: {
        status: 'DISCONTINUED',
        discontinueReason: reason,
      },
      include: {
        items: true,
        refills: true,
        doctorProfile: {
          include: { user: true },
        },
      },
    });
  }

  async addRefill(prescriptionId: string, notes?: string) {
    const existingRefills = await this.db.prescriptionRefill.count({
      where: { prescriptionId },
    });
    const refillNumber = existingRefills + 1;

    await this.db.prescriptionRefill.create({
      data: {
        prescriptionId,
        refillNumber,
        notes: notes || null,
      },
    });

    return this.findById(prescriptionId);
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

  async getPatientAllergies(patientProfileId: string): Promise<string[]> {
    try {
      // Find diagnoses or reports mentioning allergies
      const diagnoses = await this.db.clinicalDiagnosis.findMany({
        where: {
          medicalRecord: { patientProfileId },
          description: { contains: 'allergy', mode: 'insensitive' },
        },
        select: { description: true },
      });
      return diagnoses.map((d) => d.description);
    } catch {
      return [];
    }
  }
}
