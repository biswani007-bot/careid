import { Injectable, NotFoundException, ForbiddenException, Inject, Optional } from '@nestjs/common';
import { IPetRepository } from '../../domain/repositories/pet.repository.interface';
import { DatabaseService } from '../../../../database/database.service';
import {
  CreatePetDto, UpdatePetDto, AddPetVaccinationDto, PetResponseDto, PetVaccinationResponseDto,
  CreatePetClinicalRecordDto, PetClinicalRecordResponseDto, PetTimelineItemDto,
} from '../../presentation/dto/pet.dto';
import { PetRecord, PetVaccination, PetClinicalRecord } from '../../domain/entities/pet.entity';

@Injectable()
export class PetService {
  constructor(
    @Inject('IPetRepository')
    private readonly petRepo: IPetRepository,
    @Optional()
    private readonly db?: DatabaseService,
  ) {}

  private isStaffOrAdmin(roles: string[]): boolean {
    return roles.some((r) => ['ADMIN', 'SUPER_ADMIN', 'STAFF', 'DOCTOR', 'FACILITY_ADMIN'].includes(r.toUpperCase()));
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
      isDemonstrationStorage: true,
      storageNotice: 'Operating on staging demonstration persistence. Dedicated PostgreSQL schema migration pending approval.',
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
    const isStaff = this.isStaffOrAdmin(roles);
    const filterUserId = isStaff ? undefined : userId;

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

  async getPetById(id: string, userId: string, roles: string[]): Promise<PetResponseDto> {
    const pet = await this.petRepo.findPetById(id);
    if (!pet) {
      throw new NotFoundException(`Pet with ID ${id} not found`);
    }

    if (!this.isStaffOrAdmin(roles) && pet.ownerUserId !== userId) {
      throw new ForbiddenException('You do not have permission to view this pet record');
    }

    return this.mapPetToDto(pet);
  }

  async updatePet(id: string, userId: string, roles: string[], dto: UpdatePetDto): Promise<PetResponseDto> {
    const pet = await this.petRepo.findPetById(id);
    if (!pet) {
      throw new NotFoundException(`Pet with ID ${id} not found`);
    }

    if (!this.isStaffOrAdmin(roles) && pet.ownerUserId !== userId) {
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

    if (!this.isStaffOrAdmin(roles) && pet.ownerUserId !== userId) {
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

    if (!this.isStaffOrAdmin(roles) && pet.ownerUserId !== userId) {
      throw new ForbiddenException('You do not have permission to add vaccination records to this pet');
    }

    const added = await this.petRepo.addVaccination(petId, {
      petId,
      vaccineName: dto.vaccineName,
      administeredDate: dto.administeredDate,
      dueDate: dto.dueDate || null,
      batchNumber: dto.batchNumber || null,
      veterinarian: dto.veterinarian || null,
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

    if (!this.isStaffOrAdmin(roles) && pet.ownerUserId !== userId) {
      throw new ForbiddenException('You do not have permission to view vaccinations for this pet');
    }

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

    const isDoctor = roles.includes('DOCTOR') || roles.includes('ADMIN') || roles.includes('SUPER_ADMIN');
    if (!isDoctor) {
      throw new ForbiddenException('Only doctors may add veterinary clinical records');
    }

    const created = await this.petRepo.addClinicalRecord(petId, {
      petId,
      doctorId: userId,
      doctorName: 'Dr. Clinician',
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

    if (!this.isStaffOrAdmin(roles) && pet.ownerUserId !== userId) {
      throw new ForbiddenException('You do not have permission to view clinical records for this pet');
    }

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

    if (!this.isStaffOrAdmin(roles) && pet.ownerUserId !== userId) {
      throw new ForbiddenException('You do not have permission to view the timeline for this pet');
    }

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

    const res = await this.petRepo.findPets({ ownerUserId, limit: 100 });
    return res.data.map((p) => this.mapPetToDto(p));
  }
}

