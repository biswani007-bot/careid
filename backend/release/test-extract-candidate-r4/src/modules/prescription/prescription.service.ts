import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrescriptionRepository } from './prescription.repository';
import { DrugInteractionService } from './drug-interaction.service';
import {
  CreatePrescriptionDto,
  DiscontinuePrescriptionDto,
  CreateRefillDto,
  CheckDrugInteractionRequestDto,
  CheckDrugInteractionResponseDto,
  PrescriptionResponseDto,
  PrescriptionItemResponseDto,
  PrescriptionRefillResponseDto,
} from './dto/prescription.dto';

@Injectable()
export class PrescriptionService {
  constructor(
    private readonly repo: PrescriptionRepository,
    private readonly interactionService: DrugInteractionService,
  ) {}

  private mapDto(p: any): PrescriptionResponseDto {
    const docUser = p.doctorProfile?.user;
    const doctorName = docUser
      ? `Dr. ${docUser.firstName || ''} ${docUser.lastName || ''}`.trim()
      : undefined;

    return {
      id: p.id,
      patientProfileId: p.patientProfileId,
      doctorId: p.doctorId,
      doctorName,
      diagnosisCode: p.diagnosisCode || undefined,
      status: p.status,
      discontinueReason: p.discontinueReason || undefined,
      notes: p.notes || undefined,
      prescribedAt: p.prescribedAt instanceof Date ? p.prescribedAt.toISOString() : new Date(p.prescribedAt).toISOString(),
      createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : new Date(p.createdAt).toISOString(),
      updatedAt: p.updatedAt instanceof Date ? p.updatedAt.toISOString() : new Date(p.updatedAt).toISOString(),
      items: (p.items || []).map((it: any): PrescriptionItemResponseDto => ({
        id: it.id,
        prescriptionId: it.prescriptionId,
        drugName: it.drugName,
        dosage: it.dosage,
        form: it.form,
        route: it.route,
        frequency: it.frequency,
        durationDays: it.durationDays,
        instructions: it.instructions || undefined,
      })),
      refills: (p.refills || []).map((rf: any): PrescriptionRefillResponseDto => ({
        id: rf.id,
        prescriptionId: rf.prescriptionId,
        refillDate: rf.refillDate instanceof Date ? rf.refillDate.toISOString() : new Date(rf.refillDate).toISOString(),
        refillNumber: rf.refillNumber,
        notes: rf.notes || undefined,
      })),
    };
  }

  async createForPatient(
    userId: string,
    patientProfileId: string,
    dto: CreatePrescriptionDto,
    roles: string[] = [],
  ): Promise<PrescriptionResponseDto> {
    const isDoctor = roles.includes('DOCTOR') || roles.includes('ADMIN') || roles.includes('SUPER_ADMIN');
    if (!isDoctor) {
      throw new ForbiddenException('Only clinicians may write and submit official prescriptions');
    }

    const patient = await this.repo.findPatientProfile(patientProfileId);
    if (!patient) {
      throw new NotFoundException(`Patient profile '${patientProfileId}' not found`);
    }

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Prescription must contain at least one medication item');
    }

    let doctorId = userId;
    const docProfile = await this.repo.findDoctorProfileByUserId(userId);
    if (docProfile) {
      doctorId = docProfile.id;
    }

    const created = await this.repo.create({
      patientProfileId: patient.id,
      doctorId,
      diagnosisCode: dto.diagnosisCode,
      notes: dto.notes,
      items: dto.items,
    });

    return this.mapDto(created);
  }

  async getPatientPrescriptions(
    userId: string,
    patientProfileId: string,
    roles: string[] = [],
  ): Promise<PrescriptionResponseDto[]> {
    const patient = await this.repo.findPatientProfile(patientProfileId);
    if (!patient) {
      throw new NotFoundException(`Patient profile '${patientProfileId}' not found`);
    }

    const isAuthorized = roles.some((r) =>
      ['DOCTOR', 'STAFF', 'ADMIN', 'SUPER_ADMIN', 'FACILITY_ADMIN'].includes(r.toUpperCase()),
    );
    if (!isAuthorized && patient.userId !== userId) {
      throw new ForbiddenException('Access to prescription history denied');
    }

    const list = await this.repo.findByPatient(patient.id);
    return list.map((item) => this.mapDto(item));
  }

  async getById(id: string, userId: string, roles: string[] = []): Promise<PrescriptionResponseDto> {
    const p = await this.repo.findById(id);
    if (!p) {
      throw new NotFoundException(`Prescription '${id}' not found`);
    }

    const isAuthorized = roles.some((r) =>
      ['DOCTOR', 'STAFF', 'ADMIN', 'SUPER_ADMIN', 'FACILITY_ADMIN'].includes(r.toUpperCase()),
    );
    if (!isAuthorized) {
      const patient = await this.repo.findPatientProfile(p.patientProfileId);
      if (!patient || patient.userId !== userId) {
        throw new ForbiddenException('Access to prescription details denied');
      }
    }

    return this.mapDto(p);
  }

  async getPreview(id: string, userId: string, roles: string[] = []): Promise<any> {
    const p = await this.getById(id, userId, roles);
    const patient = await this.repo.findPatientProfile(p.patientProfileId);

    return {
      header: {
        organization: 'CareID Health Vault 360 - Clinical Network',
        prescriptionId: p.id,
        issueDate: p.prescribedAt,
        status: p.status,
      },
      prescriber: {
        doctorId: p.doctorId,
        doctorName: p.doctorName || 'Authorized Clinician',
      },
      patient: {
        patientProfileId: p.patientProfileId,
        patientName: patient ? `${patient.firstName || ''} ${patient.lastName || ''}`.trim() : 'Patient',
        gender: patient?.gender,
        dateOfBirth: patient?.dateOfBirth,
      },
      diagnosisCode: p.diagnosisCode,
      medications: p.items.map((it, idx) => ({
        itemNumber: idx + 1,
        drugName: it.drugName,
        dosage: it.dosage,
        form: it.form,
        route: it.route,
        frequency: it.frequency,
        durationDays: it.durationDays,
        instructions: it.instructions,
      })),
      refills: p.refills,
      legalDisclaimer: 'This prescription is digitally verified and legally binding under telemedicine and healthcare governance guidelines.',
    };
  }

  async discontinue(
    id: string,
    dto: DiscontinuePrescriptionDto,
    userId: string,
    roles: string[] = [],
  ): Promise<PrescriptionResponseDto> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundException(`Prescription '${id}' not found`);
    }

    const isDoctor = roles.includes('DOCTOR') || roles.includes('ADMIN') || roles.includes('SUPER_ADMIN');
    if (!isDoctor) {
      throw new ForbiddenException('Only doctors may discontinue prescriptions');
    }

    const updated = await this.repo.discontinue(id, dto.reason);
    return this.mapDto(updated);
  }

  async addRefill(
    id: string,
    dto: CreateRefillDto,
    userId: string,
    roles: string[] = [],
  ): Promise<PrescriptionResponseDto> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundException(`Prescription '${id}' not found`);
    }
    if (existing.status === 'DISCONTINUED') {
      throw new BadRequestException('Cannot refill a discontinued prescription');
    }

    const updated = await this.repo.addRefill(id, dto.notes);
    return this.mapDto(updated);
  }

  async checkInteractions(dto: CheckDrugInteractionRequestDto): Promise<CheckDrugInteractionResponseDto> {
    let patientAllergies: string[] = [];
    if (dto.patientProfileId) {
      patientAllergies = await this.repo.getPatientAllergies(dto.patientProfileId);
    }
    return this.interactionService.checkInteractions(dto, patientAllergies);
  }
}

