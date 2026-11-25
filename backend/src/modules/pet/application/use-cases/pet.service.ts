import { Injectable, NotFoundException, ForbiddenException, Inject, Optional, Logger } from '@nestjs/common';
import { IPetRepository } from '../../domain/repositories/pet.repository.interface';
import { DatabaseService } from '../../../../database/database.service';
import {
  CreatePetDto, UpdatePetDto, AddPetVaccinationDto, PetResponseDto, PetVaccinationResponseDto,
  CreatePetClinicalRecordDto, PetClinicalRecordResponseDto, PetTimelineItemDto,
} from '../../presentation/dto/pet.dto';
import { PetRecord, PetVaccination, PetClinicalRecord } from '../../domain/entities/pet.entity';

@Injectable()
export class PetService {
  private readonly logger = new Logger(PetService.name);

  constructor(
    @Inject('IPetRepository')
    private readonly petRepo: IPetRepository,
    @Optional()
    private readonly db?: DatabaseService,
  ) {}

  private isAdmin(roles: string[]): boolean {
    return (roles || []).some((r) => ['ADMIN', 'SUPER_ADMIN'].includes(r.toUpperCase()));
  }

  private isExplicitVeterinaryRole(roles: string[]): boolean {
    return (roles || []).some((r) => ['VET', 'VETERINARIAN', 'DOCTOR_VET'].includes(r.toUpperCase()));
  }

  private isVeterinarySpecialization(profile: any): boolean {
    if (!profile) return false;
    const terms: string[] = [
      profile.primarySpecialization,
      profile.department,
      ...(profile.secondarySpecializations || []),
      ...(profile.subSpecializations || []),
    ].filter(Boolean).map((s: string) => String(s).toUpperCase());

    return terms.some((t: string) =>
      t.includes('VET') || t.includes('VETERINAR') || t.includes('ANIMAL') || t.includes('ZOOLOGICAL')
    );
  }

  async isVeterinarian(userId: string, roles: string[]): Promise<boolean> {
    if (this.isExplicitVeterinaryRole(roles)) {
      return true;
    }
    if (!this.db) {
      return false;
    }
    try {
      const doctorProfile = await (this.db as any).doctorProfile.findFirst({
        where: { userId },
        select: {
          id: true,
          primarySpecialization: true,
          department: true,
          secondarySpecializations: true,
          subSpecializations: true,
        },
      });
      return this.isVeterinarySpecialization(doctorProfile);
    } catch {
      return false;
    }
  }

  async assertVeterinaryAccreditation(userId: string, roles: string[]): Promise<void> {
    if (this.isAdmin(roles)) {
      return;
    }
    const isVet = await this.isVeterinarian(userId, roles);
    if (!isVet) {
      throw new ForbiddenException(
        'Veterinary clinical access denied: Ordinary human healthcare providers are not authorized for veterinary records without veterinary clinical accreditation and care relationship',
      );
    }
  }

  /**
   * Verifies legitimate veterinary clinical authorization to access a pet's records.
   * Strictly enforces veterinary accreditation and care-relationship boundaries:
   * 1. Direct ownership (patient owns pet)
   * 2. Administrative oversight (ADMIN / SUPER_ADMIN)
   * 3. Prior clinical care (clinician authored prior clinical record for this pet)
   * 4. Prior vaccination (clinician administered prior vaccination for this pet)
   * 5. Ordinary human-health doctors (e.g. general medicine, cardiology) are strictly barred
   *    from automatic access, even if they have an active appointment with the pet's human owner.
   * 6. Accredited veterinary clinicians (explicit VET role or veterinary DoctorProfile) require
   *    an active care assignment, appointment, or shared clinical facility.
   */
  async verifyPetAccess(pet: PetRecord, userId: string, roles: string[]): Promise<void> {
    if (this.isAdmin(roles)) {
      return;
    }

    if (pet.ownerUserId === userId) {
      return;
    }

    // 1. Prior clinical record authored by this clinician on this specific pet
    const hasAuthoredRecord = (pet.clinicalRecords || []).some((c) => c.doctorId === userId);
    if (hasAuthoredRecord) {
      return;
    }

    // 2. Prior vaccination administered by this clinician on this specific pet
    const hasAdministeredVaccine = (pet.vaccinations || []).some(
      (v) => v.veterinarian === userId || (v as any).doctorId === userId,
    );
    if (hasAdministeredVaccine) {
      return;
    }

    // 3. Verify veterinary clinical accreditation (distinct from human-health doctors)
    const hasVetRole = this.isExplicitVeterinaryRole(roles);
    let isVetAccredited = hasVetRole;
    let doctorProfile: any = null;

    if (this.db) {
      try {
        doctorProfile = await (this.db as any).doctorProfile.findFirst({
          where: { userId },
          select: {
            id: true,
            primarySpecialization: true,
            department: true,
            secondarySpecializations: true,
            subSpecializations: true,
            facilities: { select: { facilityId: true } },
          },
        });

        if (doctorProfile && this.isVeterinarySpecialization(doctorProfile)) {
          isVetAccredited = true;
        }
      } catch (e: any) {
        this.logger.warn({ msg: 'doctorProfile lookup error during pet access check', err: e?.message });
      }
    }

    // Ordinary human healthcare providers are strictly barred from automatic access to pet records
    if (!isVetAccredited) {
      throw new ForbiddenException(
        'Veterinary clinical access denied: Ordinary human healthcare providers are not authorized for veterinary records without veterinary clinical accreditation and care relationship',
      );
    }

    // 4. For accredited veterinary clinicians, verify active care assignment or facility relationship
    if (this.db && doctorProfile) {
      try {
        const directAppointment = await (this.db as any).appointment.findFirst({
          where: {
            doctorProfileId: doctorProfile.id,
            patientProfile: { userId: pet.ownerUserId },
          },
        });
        if (directAppointment) {
          return;
        }

        const facilityIds = (doctorProfile.facilities || []).map((fd: any) => fd.facilityId);
        if (facilityIds.length > 0) {
          const sharedFacilityAppointment = await (this.db as any).appointment.findFirst({
            where: {
              facilityId: { in: facilityIds },
              patientProfile: { userId: pet.ownerUserId },
            },
          });
          if (sharedFacilityAppointment) {
            return;
          }
        }
      } catch (e: any) {
        this.logger.warn({ msg: 'Appointment lookup error during pet access check', err: e?.message });
      }
    }

    throw new ForbiddenException(
      'Veterinary clinical access denied: No authorized care assignment, prior treatment record, or facility relationship with this pet',
    );
  }

  private mapVaccinationToDto(v: PetVaccination): PetVaccinationResponseDto {
    return {
      id: v.id,
      petId: v.petId,
      vaccineName: v.vaccineName,
      administeredDate: v.administeredDate,
      dueDate: v.dueDate || undefined,
      batchNumber: v.batchNumber || undefined,
      veterinarian: v.veterinarian || undefined,
      clinicName: v.clinicName || undefined,
      notes: v.notes || undefined,
      createdAt: v.createdAt.toISOString(),
    };
  }

  private mapPetToDto(p: PetRecord): PetResponseDto {
    return {
      id: p.id,
      ownerUserId: p.ownerUserId,
      name: p.name,
      species: p.species,
      breed: p.breed || undefined,
      age: p.age !== null ? p.age : undefined,
      dob: p.dob || undefined,
      gender: p.gender || undefined,
      weight: p.weight !== null ? p.weight : undefined,
      microchipId: p.microchipId || undefined,
      notes: p.notes || undefined,
      ownerName: p.ownerName || undefined,
      ownerPhone: p.ownerPhone || undefined,
      ownerEmail: p.ownerEmail || undefined,
      vaccinations: (p.vaccinations || []).map((v) => this.mapVaccinationToDto(v)),
      clinicalRecords: (p.clinicalRecords || []).map((c) => ({
        id: c.id,
        petId: c.petId,
        doctorId: c.doctorId,
        doctorName: c.doctorName,
        diagnosis: c.diagnosis,
        treatmentPlan: c.treatmentPlan || undefined,
        notes: c.notes || undefined,
        weightKg: c.weightKg !== null ? c.weightKg : undefined,
        temperatureC: c.temperatureC !== null ? c.temperatureC : undefined,
        createdAt: c.createdAt.toISOString(),
      })),
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      isDemonstrationStorage: false,
      storageNotice: 'Operating on production-grade PostgreSQL persistence.',
    };
  }

  async createPet(userId: string, dto: CreatePetDto): Promise<PetResponseDto> {
    const created = await this.petRepo.createPet({
      ownerUserId: userId,
      name: dto.name,
      species: dto.species.toUpperCase(),
      breed: dto.breed,
      age: dto.age,
      dob: dto.dob,
      gender: dto.gender ? dto.gender.toUpperCase() : undefined,
      weight: dto.weight,
      microchipId: dto.microchipId,
      notes: dto.notes,
    });

    return this.mapPetToDto(created);
  }

  async getPets(
    userId: string,
    roles: string[],
    query: { species?: string; search?: string; page?: number; limit?: number },
  ): Promise<{ data: PetResponseDto[]; total: number; page: number; limit: number }> {
    if ((roles || []).includes('DOCTOR') && !this.isAdmin(roles)) {
      const isVet = await this.isVeterinarian(userId, roles);
      if (!isVet) {
        throw new ForbiddenException(
          'Veterinary clinical access denied: Ordinary human healthcare providers are not authorized for veterinary records',
        );
      }
      return this.getPetsForVeterinarian(userId, roles, query);
    }

    if (this.isExplicitVeterinaryRole(roles) && !this.isAdmin(roles)) {
      return this.getPetsForVeterinarian(userId, roles, query);
    }

    const isAdmin = this.isAdmin(roles);
    const filterUserId = isAdmin ? undefined : userId;

    const res = await this.petRepo.findPets({
      ownerUserId: filterUserId,
      species: query.species,
      search: query.search,
      page: query.page,
      limit: query.limit,
    });

    return {
      data: res.data.map((p) => this.mapPetToDto(p)),
      total: res.total,
      page: res.page,
      limit: res.limit,
    };
  }

  async getPetsForVeterinarian(
    doctorId: string,
    roles: string[],
    query: { species?: string; search?: string; page?: number; limit?: number } = {},
  ): Promise<{ data: PetResponseDto[]; total: number; page: number; limit: number }> {
    await this.assertVeterinaryAccreditation(doctorId, roles);

    if (this.isAdmin(roles)) {
      const res = await this.petRepo.findPets({
        species: query.species,
        search: query.search,
        page: query.page,
        limit: query.limit,
      });
      return {
        data: res.data.map((p) => this.mapPetToDto(p)),
        total: res.total,
        page: res.page,
        limit: res.limit,
      };
    }

    let facilityIds: string[] = [];
    if (this.db) {
      try {
        const doctorProfile = await (this.db as any).doctorProfile.findFirst({
          where: { userId: doctorId },
          select: {
            facilities: { select: { facilityId: true } },
            facilityDoctors: { select: { facilityId: true } },
          },
        });
        const fromFacilities = (doctorProfile?.facilities || []).map((f: any) => f.facilityId);
        const fromFacilityDoctors = (doctorProfile?.facilityDoctors || []).map((f: any) => f.facilityId);
        facilityIds = Array.from(new Set([...fromFacilities, ...fromFacilityDoctors])).filter(Boolean);
      } catch (err: any) {
        this.logger.warn({ msg: 'Failed to resolve facility affiliations for veterinarian', err: err?.message });
      }
    }

    const res = await this.petRepo.findPetsForVeterinarian(doctorId, facilityIds, query);
    return {
      data: res.data.map((p) => this.mapPetToDto(p)),
      total: res.total,
      page: res.page,
      limit: res.limit,
    };
  }

  async getPetById(id: string, userId: string, roles: string[]): Promise<PetResponseDto> {
    const pet = await this.petRepo.findPetById(id);
    if (!pet) {
      throw new NotFoundException(`Pet with ID ${id} not found`);
    }

    await this.verifyPetAccess(pet, userId, roles);

    return this.mapPetToDto(pet);
  }

  async updatePet(id: string, userId: string, roles: string[], dto: UpdatePetDto): Promise<PetResponseDto> {
    const pet = await this.petRepo.findPetById(id);
    if (!pet) {
      throw new NotFoundException(`Pet with ID ${id} not found`);
    }

    if (!this.isAdmin(roles) && pet.ownerUserId !== userId) {
      throw new ForbiddenException('You do not have permission to update this pet record');
    }

    const updates: Partial<PetRecord> = {};
    if (dto.name !== undefined) updates.name = dto.name;
    if (dto.species !== undefined) updates.species = dto.species.toUpperCase();
    if (dto.breed !== undefined) updates.breed = dto.breed;
    if (dto.age !== undefined) updates.age = dto.age;
    if (dto.dob !== undefined) updates.dob = dto.dob;
    if (dto.gender !== undefined) updates.gender = dto.gender.toUpperCase();
    if (dto.weight !== undefined) updates.weight = dto.weight;
    if (dto.microchipId !== undefined) updates.microchipId = dto.microchipId;
    if (dto.notes !== undefined) updates.notes = dto.notes;

    const updated = await this.petRepo.updatePet(id, updates);
    if (!updated) {
      throw new NotFoundException(`Pet with ID ${id} not found`);
    }

    return this.mapPetToDto(updated);
  }

  async deletePet(id: string, userId: string, roles: string[]): Promise<{ success: boolean }> {
    const pet = await this.petRepo.findPetById(id);
    if (!pet) {
      throw new NotFoundException(`Pet with ID ${id} not found`);
    }

    if (!this.isAdmin(roles) && pet.ownerUserId !== userId) {
      throw new ForbiddenException('You do not have permission to delete this pet record');
    }

    await this.petRepo.deletePet(id);
    return { success: true };
  }

  async addVaccination(
    petId: string,
    userId: string,
    roles: string[],
    dto: AddPetVaccinationDto,
  ): Promise<PetVaccinationResponseDto> {
    const pet = await this.petRepo.findPetById(petId);
    if (!pet) {
      throw new NotFoundException(`Pet with ID ${petId} not found`);
    }

    await this.verifyPetAccess(pet, userId, roles);

    const added = await this.petRepo.addVaccination(petId, {
      petId,
      vaccineName: dto.vaccineName,
      administeredDate: dto.administeredDate,
      dueDate: dto.dueDate || null,
      batchNumber: dto.batchNumber || null,
      veterinarian: dto.veterinarian || userId,
      clinicName: dto.clinicName || null,
      notes: dto.notes || null,
    });

    if (!added) {
      throw new NotFoundException(`Failed to add vaccination to pet ${petId}`);
    }

    return this.mapVaccinationToDto(added);
  }

  async getVaccinations(petId: string, userId: string, roles: string[]): Promise<PetVaccinationResponseDto[]> {
    const pet = await this.petRepo.findPetById(petId);
    if (!pet) {
      throw new NotFoundException(`Pet with ID ${petId} not found`);
    }

    await this.verifyPetAccess(pet, userId, roles);

    const list = await this.petRepo.getVaccinations(petId);
    return list.map((v) => this.mapVaccinationToDto(v));
  }

  async addClinicalRecord(
    petId: string,
    userId: string,
    roles: string[],
    dto: CreatePetClinicalRecordDto,
  ): Promise<PetClinicalRecordResponseDto> {
    const pet = await this.petRepo.findPetById(petId);
    if (!pet) {
      throw new NotFoundException(`Pet with ID ${petId} not found`);
    }

    const isClinicalOrAdmin = this.isExplicitVeterinaryRole(roles) || this.isAdmin(roles) || (roles || []).includes('DOCTOR');
    if (!isClinicalOrAdmin) {
      throw new ForbiddenException('Only licensed veterinarians may add veterinary clinical records');
    }

    await this.verifyPetAccess(pet, userId, roles);

    const created = await this.petRepo.addClinicalRecord(petId, {
      petId,
      doctorId: userId,
      doctorName: (dto as any).doctorName || 'Dr. Attending Clinician',
      diagnosis: dto.diagnosis,
      treatmentPlan: dto.treatmentPlan || null,
      notes: dto.notes || null,
      weightKg: dto.weightKg || null,
      temperatureC: dto.temperatureC || null,
    });

    if (!created) {
      throw new NotFoundException(`Failed to add clinical record to pet ${petId}`);
    }

    return {
      id: created.id,
      petId: created.petId,
      doctorId: created.doctorId,
      doctorName: created.doctorName,
      diagnosis: created.diagnosis,
      treatmentPlan: created.treatmentPlan || undefined,
      notes: created.notes || undefined,
      weightKg: created.weightKg !== null ? created.weightKg : undefined,
      temperatureC: created.temperatureC !== null ? created.temperatureC : undefined,
      createdAt: created.createdAt.toISOString(),
    };
  }

  async getClinicalRecords(petId: string, userId: string, roles: string[]): Promise<PetClinicalRecordResponseDto[]> {
    const pet = await this.petRepo.findPetById(petId);
    if (!pet) {
      throw new NotFoundException(`Pet with ID ${petId} not found`);
    }

    await this.verifyPetAccess(pet, userId, roles);

    const list = await this.petRepo.getClinicalRecords(petId);
    return list.map((c) => ({
      id: c.id,
      petId: c.petId,
      doctorId: c.doctorId,
      doctorName: c.doctorName,
      diagnosis: c.diagnosis,
      treatmentPlan: c.treatmentPlan || undefined,
      notes: c.notes || undefined,
      weightKg: c.weightKg !== null ? c.weightKg : undefined,
      temperatureC: c.temperatureC !== null ? c.temperatureC : undefined,
      createdAt: c.createdAt.toISOString(),
    }));
  }

  async getPetTimeline(petId: string, userId: string, roles: string[]): Promise<PetTimelineItemDto[]> {
    const pet = await this.petRepo.findPetById(petId);
    if (!pet) {
      throw new NotFoundException(`Pet with ID ${petId} not found`);
    }

    await this.verifyPetAccess(pet, userId, roles);

    const vaccinations = await this.petRepo.getVaccinations(petId);
    const clinicals = await this.petRepo.getClinicalRecords(petId);

    const items: PetTimelineItemDto[] = [];

    for (const v of vaccinations) {
      items.push({
        id: v.id,
        eventType: 'VACCINATION',
        title: `Vaccination: ${v.vaccineName}`,
        date: v.administeredDate,
        details: {
          dueDate: v.dueDate,
          clinicName: v.clinicName,
          veterinarian: v.veterinarian,
        },
      });
    }

    for (const c of clinicals) {
      items.push({
        id: c.id,
        eventType: 'CLINICAL_RECORD',
        title: `Diagnosis: ${c.diagnosis}`,
        date: c.createdAt.toISOString(),
        details: {
          treatmentPlan: c.treatmentPlan,
          doctorName: c.doctorName,
          notes: c.notes,
        },
      });
    }

    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async getPetsByPatientProfile(
    patientProfileId: string,
    doctorId: string,
    roles: string[],
  ): Promise<PetResponseDto[]> {
    let ownerUserId = patientProfileId;
    if (this.db) {
      try {
        const profile = await (this.db as any).patientProfile.findUnique({
          where: { id: patientProfileId },
          select: { userId: true },
        });
        if (profile?.userId) {
          ownerUserId = profile.userId;
        }
      } catch {
        // Fallback to patientProfileId
      }
    }

    if (!this.isAdmin(roles)) {
      await this.assertVeterinaryAccreditation(doctorId, roles);

      if (this.db) {
        try {
          const doctorProfile = await (this.db as any).doctorProfile.findFirst({
            where: { userId: doctorId },
            select: { id: true, facilityDoctors: { select: { facilityId: true } } },
          });
          if (doctorProfile) {
            const hasAppt = await (this.db as any).appointment.findFirst({
              where: {
                doctorId: doctorProfile.id,
                patientProfile: { id: patientProfileId },
              },
            });
            const facilityIds = (doctorProfile.facilityDoctors || []).map((fd: any) => fd.facilityId);
            const hasSharedFacility = facilityIds.length > 0 && await (this.db as any).appointment.findFirst({
              where: {
                facilityId: { in: facilityIds },
                patientProfile: { id: patientProfileId },
              },
            });

            if (!hasAppt && !hasSharedFacility) {
              throw new ForbiddenException('Veterinary access denied: Doctor is not affiliated with this patient');
            }
          }
        } catch (err: any) {
          if (err instanceof ForbiddenException) throw err;
        }
      }
    }

    const res = await this.petRepo.findPets({ ownerUserId, limit: 100 });
    return res.data.map((p) => this.mapPetToDto(p));
  }
}

