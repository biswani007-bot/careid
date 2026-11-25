import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Optional } from '@nestjs/common';
import { PrescriptionRepository } from './prescription.repository';
import { DrugInteractionService } from './drug-interaction.service';
import { PrescriptionReminderService } from './prescription-reminder.service';
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
    @Optional()
    private readonly reminderService?: PrescriptionReminderService,
  ) {}

  private mapDto(p: any): PrescriptionResponseDto {
    const docUser = p.doctorProfile?.user;
    const doctorName = docUser
      ? `Dr. ${docUser.firstName || ''} ${docUser.lastName || ''}`.trim()
      : undefined;

    let pickupReminderEnabled: boolean | undefined = undefined;
    let pickupReminderHours: number | undefined = undefined;
    let collected: boolean | undefined = undefined;
    let collectedAt: string | undefined = undefined;

    if (p.reminderSchedule) {
      const rs = p.reminderSchedule;
      collected = Boolean(rs.collectedAt || rs.status === 'CANCELLED' || rs.status === 'COMPLETED');
      collectedAt = rs.collectedAt ? (rs.collectedAt instanceof Date ? rs.collectedAt.toISOString() : new Date(rs.collectedAt).toISOString()) : undefined;
      pickupReminderEnabled = Boolean(rs.enabled) && !collected && rs.status === 'ACTIVE';
      pickupReminderHours = rs.intervalHours || 4;
    } else if (p.notes && typeof p.notes === 'string' && p.notes.includes('[PICKUP_REMINDER]:')) {
      try {
        const marker = p.notes.split('[PICKUP_REMINDER]:')[1];
        const parsed = JSON.parse(marker.trim());
        collected = !!parsed.collected;
        collectedAt = parsed.collectedAt || undefined;
        pickupReminderEnabled = !!parsed.enabled && !collected;
        pickupReminderHours = parsed.hours || 2;
      } catch {
        pickupReminderEnabled = true;
        pickupReminderHours = 2;
        collected = false;
      }
    }

    const cleanNotes = p.notes && typeof p.notes === 'string'
      ? p.notes.split('[PICKUP_REMINDER]:')[0].trim() || undefined
      : p.notes || undefined;

    return {
      id: p.id,
      patientProfileId: p.patientProfileId,
      doctorId: p.doctorId,
      doctorName,
      diagnosisCode: p.diagnosisCode || undefined,
      status: p.status,
      discontinueReason: p.discontinueReason || undefined,
      notes: cleanNotes,
      pickupReminderEnabled,
      pickupReminderHours,
      collected,
      collectedAt,
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

    if (roles.includes('VETERINARIAN') && !roles.includes('DOCTOR_VET') && !roles.includes('ADMIN') && !roles.includes('SUPER_ADMIN')) {
      throw new ForbiddenException('Access denied: Veterinarians are not authorized to create prescriptions for human patients');
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
      const terms: string[] = [
        docProfile.primarySpecialization,
        docProfile.department,
        ...(docProfile.secondarySpecializations || []),
        ...(docProfile.subSpecializations || []),
      ].filter((s): s is string => Boolean(s)).map((s) => s.toUpperCase());

      const hasVet = terms.some((t: string) =>
        t.includes('VET') || t.includes('VETERINAR') || t.includes('ANIMAL') || t.includes('ZOOLOGICAL'),
      );
      const humanTerms = [
        'CARDIOLOGY', 'GENERAL MEDICINE', 'INTERNAL MEDICINE', 'PEDIATRICS',
        'SURGERY', 'DERMATOLOGY', 'NEUROLOGY', 'ORTHOPEDICS', 'ONCOLOGY',
      ];
      const hasHuman = terms.some((t: string) => humanTerms.some((h) => t.includes(h)));
      if (hasVet && !hasHuman) {
        throw new ForbiddenException('Access denied: Veterinarians are not authorized to create prescriptions for human patients');
      }
    }

    let finalNotes = dto.notes || '';
    const reminderHours = dto.pickupReminderHours || 2;
    const reminderEnabled = Boolean(dto.pickupReminderEnabled);

    if (reminderEnabled) {
      if (this.reminderService) {
        finalNotes = this.reminderService.syncPrescriptionNotesTrailer(
          finalNotes,
          true,
          reminderHours,
          false,
        );
      } else {
        finalNotes += `\n[PICKUP_REMINDER]:${JSON.stringify({
          enabled: true,
          hours: reminderHours,
        })}`;
      }
    }

    const created = await this.repo.create({
      patientProfileId: patient.id,
      doctorId,
      diagnosisCode: dto.diagnosisCode,
      notes: finalNotes || undefined,
      status: dto.status || 'ACTIVE',
      items: dto.items,
    });

    if (reminderEnabled && this.reminderService) {
      try {
        const schedule = await this.reminderService.createOrUpdateSchedule({
          prescriptionId: created.id,
          patientProfileId: patient.id,
          doctorId,
          intervalHours: reminderHours,
          enabled: true,
          reminderStartTime: created.prescribedAt,
        });
        (created as any).reminderSchedule = schedule;
      } catch {}
    }

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

    if (!roles.includes('ADMIN') && !roles.includes('SUPER_ADMIN') && !roles.includes('DOCTOR_VET') && patient.userId !== userId) {
      const docProfile = await this.repo.findDoctorProfileByUserId(userId);
      if (docProfile) {
        const terms: string[] = [
          docProfile.primarySpecialization,
          docProfile.department,
          ...(docProfile.secondarySpecializations || []),
          ...(docProfile.subSpecializations || []),
        ].filter((s): s is string => Boolean(s)).map((s) => s.toUpperCase());

        const hasVet = terms.some((t: string) =>
          t.includes('VET') || t.includes('VETERINAR') || t.includes('ANIMAL') || t.includes('ZOOLOGICAL'),
        );
        const humanTerms = [
          'CARDIOLOGY', 'GENERAL MEDICINE', 'INTERNAL MEDICINE', 'PEDIATRICS',
          'SURGERY', 'DERMATOLOGY', 'NEUROLOGY', 'ORTHOPEDICS', 'ONCOLOGY',
        ];
        const hasHuman = terms.some((t: string) => humanTerms.some((h) => t.includes(h)));
        if (hasVet && !hasHuman) {
          throw new ForbiddenException('Access denied: Veterinarians are not authorized to view human patient prescriptions');
        }
      }
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

  async getAllPrescriptions(
    userId: string,
    roles: string[] = [],
    query?: { status?: string; limit?: number; page?: number },
  ): Promise<PrescriptionResponseDto[]> {
    const isAuthorized = roles.some((r) =>
      ['DOCTOR', 'STAFF', 'ADMIN', 'SUPER_ADMIN', 'FACILITY_ADMIN'].includes(r.toUpperCase()),
    );
    if (!isAuthorized) {
      throw new ForbiddenException('Access to global prescription monitoring denied');
    }
    const list = await this.repo.findAll(query);
    return list.map((item) => this.mapDto(item));
  }

  async markCollected(
    id: string,
    userId: string,
    roles: string[] = [],
  ): Promise<PrescriptionResponseDto> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundException(`Prescription '${id}' not found`);
    }

    const isAuthorized = roles.some((r) =>
      ['DOCTOR', 'STAFF', 'ADMIN', 'SUPER_ADMIN', 'FACILITY_ADMIN'].includes(r.toUpperCase()),
    );
    if (!isAuthorized) {
      throw new ForbiddenException('Only healthcare staff or administrators can mark prescriptions as collected');
    }

    const now = new Date().toISOString();
    let updatedNotes = existing.notes || '';

    if (this.reminderService) {
      try {
        await this.reminderService.markCollected(id, new Date(), userId);
      } catch {}
      const parsed = this.reminderService.parseNotesTrailer(existing.notes);
      const hours = parsed?.hours || 2;
      updatedNotes = this.reminderService.syncPrescriptionNotesTrailer(
        existing.notes,
        false,
        hours,
        true,
        now,
      );
    } else {
      if (updatedNotes.includes('[PICKUP_REMINDER]:')) {
        const parts = updatedNotes.split('[PICKUP_REMINDER]:');
        let reminderObj: any = { enabled: false, hours: 2, collected: true, collectedAt: now };
        try {
          const parsed = JSON.parse(parts[1].trim());
          reminderObj = { ...parsed, enabled: false, collected: true, collectedAt: now };
        } catch {}
        updatedNotes = `${parts[0].trim()}\n[PICKUP_REMINDER]:${JSON.stringify(reminderObj)}`;
      } else {
        updatedNotes = `${updatedNotes.trim()}\n[PICKUP_REMINDER]:${JSON.stringify({
          enabled: false,
          hours: 2,
          collected: true,
          collectedAt: now,
        })}`.trim();
      }
    }

    const updated = await this.repo.markCollected(id, updatedNotes);
    if (!updated) {
      throw new NotFoundException(`Failed to mark prescription '${id}' as collected`);
    }
    return this.mapDto(updated);
  }

  async updateReminderSettings(
    id: string,
    enabled?: boolean,
    hours?: number,
    userId?: string,
    roles: string[] = [],
  ): Promise<PrescriptionResponseDto> {
    const isAuthorized = roles.some((r) =>
      ['DOCTOR', 'STAFF', 'ADMIN', 'SUPER_ADMIN', 'FACILITY_ADMIN'].includes(r.toUpperCase()),
    );
    if (!isAuthorized) {
      throw new ForbiddenException('Only clinicians and authorized staff may update reminder settings');
    }

    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundException(`Prescription '${id}' not found`);
    }

    if (this.reminderService) {
      await this.reminderService.updateReminderSettings(id, enabled, hours);
    }

    const reloaded = await this.repo.findById(id);
    return this.mapDto(reloaded || existing);
  }

  async checkInteractions(dto: CheckDrugInteractionRequestDto): Promise<CheckDrugInteractionResponseDto> {
    let patientAllergies: string[] = [];
    if (dto.patientProfileId) {
      patientAllergies = await this.repo.getPatientAllergies(dto.patientProfileId);
    }
    return this.interactionService.checkInteractions(dto, patientAllergies);
  }
}

