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
    status?: string;
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
        status: data.status || 'ACTIVE',
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
        reminderSchedule: true,
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
        reminderSchedule: true,
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
        reminderSchedule: true,
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

  async findAll(filters?: { status?: string; limit?: number; page?: number }) {
    const limit = filters?.limit && filters.limit > 0 ? filters.limit : 50;
    const page = filters?.page && filters.page > 0 ? filters.page : 1;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (filters?.status && filters.status !== 'ALL') {
      where.status = filters.status;
    }
    return this.db.prescription.findMany({
      where,
      skip,
      take: limit,
      orderBy: { prescribedAt: 'desc' },
      include: {
        items: true,
        refills: true,
        reminderSchedule: true,
        doctorProfile: {
          include: { user: true },
        },
      },
    });
  }

  async markCollected(id: string, notes: string) {
    return this.db.prescription.update({
      where: { id },
      data: {
        notes,
      },
      include: {
        items: true,
        refills: true,
        reminderSchedule: true,
        doctorProfile: {
          include: { user: true },
        },
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

  async getPatientAllergies(patientProfileId: string): Promise<string[]> {
    const list: string[] = [];
    try {
      const profile = await this.db.patientProfile.findUnique({
        where: { id: patientProfileId },
        select: { knownAllergies: true },
      });
      if (profile?.knownAllergies && Array.isArray(profile.knownAllergies)) {
        list.push(...profile.knownAllergies);
      }
      const diagnoses = await this.db.clinicalDiagnosis.findMany({
        where: {
          medicalRecord: { patientProfileId },
          description: { contains: 'allergy', mode: 'insensitive' },
        },
        select: { description: true },
      });
      list.push(...diagnoses.map((d) => d.description));
      return list;
    } catch {
      return list;
    }
  }
}
