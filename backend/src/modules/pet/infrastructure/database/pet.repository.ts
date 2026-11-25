import { Injectable, Logger, Optional } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { IPetRepository, PetFilterOptions } from '../../domain/repositories/pet.repository.interface';
import { PetRecord, PetVaccination, PetClinicalRecord } from '../../domain/entities/pet.entity';
import { DatabaseService } from '@database/database.service';

@Injectable()
export class PetRepository implements IPetRepository {
  private readonly logger = new Logger(PetRepository.name);
  private readonly filePath = path.resolve(process.cwd(), 'data', 'pets.json');
  private pets: Map<string, PetRecord> = new Map();

  constructor(@Optional() private readonly db?: DatabaseService) {
    if (this.isStrictDatabasePersistence()) {
      if (!this.db) {
        throw new Error('DatabaseService is required in staging and production environments. In-memory and file fallback are strictly disabled.');
      }
    } else {
      this.loadPets();
    }
  }

  private isStrictDatabasePersistence(): boolean {
    const nodeEnv = (process.env.NODE_ENV || '').trim().toLowerCase();
    const appEnv = (process.env.APP_ENV || '').trim().toLowerCase();
    const depEnv = (process.env.DEPLOYMENT_ENV || '').trim().toLowerCase();
    const strictFlag = (process.env.STRICT_PET_PERSISTENCE || '').trim().toLowerCase() === 'true';

    const isProduction = nodeEnv === 'production' || appEnv === 'production' || depEnv === 'production';
    const isStaging = nodeEnv === 'staging' || appEnv === 'staging' || depEnv === 'staging';

    return isProduction || isStaging || strictFlag;
  }

  private mapPrismaPet(p: any): PetRecord {
    let ownerName: string | null = p.ownerName ?? null;
    let ownerPhone: string | null = p.ownerPhone ?? null;
    let ownerEmail: string | null = p.ownerEmail ?? null;

    if (p.owner) {
      if (p.owner.patientProfile) {
        const parts = [p.owner.patientProfile.firstName, p.owner.patientProfile.lastName].filter(Boolean);
        if (parts.length > 0) {
          ownerName = parts.join(' ');
        }
      }
      if (p.owner.phone) {
        ownerPhone = p.owner.phone;
      }
      if (p.owner.email) {
        ownerEmail = p.owner.email;
      }
    }

    return {
      id: p.id,
      ownerUserId: p.ownerUserId,
      name: p.name,
      species: p.species,
      breed: p.breed ?? null,
      age: p.age ?? null,
      dob: p.dob ?? null,
      gender: p.gender ?? null,
      weight: p.weight ?? null,
      microchipId: p.microchipId ?? null,
      notes: p.notes ?? null,
      ownerName,
      ownerPhone,
      ownerEmail,
      createdAt: p.createdAt instanceof Date ? p.createdAt : new Date(p.createdAt),
      updatedAt: p.updatedAt instanceof Date ? p.updatedAt : new Date(p.updatedAt),
      vaccinations: (p.vaccinations || []).map((v: any) => ({
        id: v.id,
        petId: v.petId,
        vaccineName: v.vaccineName,
        administeredDate: v.administeredDate,
        dueDate: v.dueDate ?? null,
        batchNumber: v.batchNumber ?? null,
        veterinarian: v.veterinarian ?? null,
        clinicName: v.clinicName ?? null,
        notes: v.notes ?? null,
        createdAt: v.createdAt instanceof Date ? v.createdAt : new Date(v.createdAt),
      })),
      clinicalRecords: (p.clinicalRecords || []).map((c: any) => ({
        id: c.id,
        petId: c.petId,
        doctorId: c.doctorId,
        doctorName: c.doctorName ?? undefined,
        diagnosis: c.diagnosis,
        treatmentPlan: c.treatmentPlan ?? null,
        notes: c.notes ?? null,
        weightKg: c.weightKg ?? null,
        temperatureC: c.temperatureC ?? null,
        createdAt: c.createdAt instanceof Date ? c.createdAt : new Date(c.createdAt),
      })),
    };
  }

  private loadPets(): void {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed: PetRecord[] = JSON.parse(raw);
        for (const item of parsed) {
          this.pets.set(item.id, {
            ...item,
            createdAt: new Date(item.createdAt),
            updatedAt: new Date(item.updatedAt),
            vaccinations: (item.vaccinations || []).map((v) => ({
              ...v,
              createdAt: new Date(v.createdAt),
            })),
            clinicalRecords: (item.clinicalRecords || []).map((c) => ({
              ...c,
              createdAt: new Date(c.createdAt),
            })),
          });
        }
      }
    } catch (err: any) {
      this.logger.warn(`Failed to read pets file, initialized in-memory: ${err.message}`);
    }
  }

  private persist(): void {
    if (this.isStrictDatabasePersistence()) return;
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const array = Array.from(this.pets.values());
      fs.writeFileSync(this.filePath, JSON.stringify(array, null, 2), 'utf-8');
    } catch (err: any) {
      this.logger.error(`Failed to persist pets: ${err.message}`);
    }
  }

  async createPet(
    data: Omit<PetRecord, 'id' | 'createdAt' | 'updatedAt' | 'vaccinations'>,
  ): Promise<PetRecord> {
    if (this.db) {
      try {
        const created = await (this.db as any).pet.create({
          data: {
            ownerUserId: data.ownerUserId,
            name: data.name,
            species: data.species,
            breed: data.breed,
            age: data.age,
            dob: data.dob,
            gender: data.gender,
            weight: data.weight,
            microchipId: data.microchipId,
            notes: data.notes,
          },
          include: {
            vaccinations: true,
            clinicalRecords: true,
            owner: { include: { patientProfile: true } },
          },
        });
        const mapped = this.mapPrismaPet(created);
        this.pets.set(mapped.id, mapped);
        return mapped;
      } catch (err: any) {
        if (this.isStrictDatabasePersistence()) {
          this.logger.error(`Postgres createPet failed in production: ${err.message}`, err.stack);
          throw err;
        }
        this.logger.warn(`Postgres createPet failed, falling back to local store: ${err.message}`);
      }
    }

    if (this.isStrictDatabasePersistence()) {
      throw new Error('DatabaseService unavailable: Pet creation failed in production environment');
    }

    const id = randomUUID();
    const now = new Date();

    const pet: PetRecord = {
      ...data,
      id,
      vaccinations: [],
      createdAt: now,
      updatedAt: now,
    };

    this.pets.set(id, pet);
    this.persist();
    return pet;
  }

  async findPets(filters: PetFilterOptions): Promise<{ data: PetRecord[]; total: number; page: number; limit: number }> {
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? filters.limit : 20;

    if (this.db) {
      try {
        const where: any = {};
        if (filters.ownerUserId) where.ownerUserId = filters.ownerUserId;
        if (filters.species) where.species = { equals: filters.species, mode: 'insensitive' };
        if (filters.search) {
          where.OR = [
            { name: { contains: filters.search, mode: 'insensitive' } },
            { breed: { contains: filters.search, mode: 'insensitive' } },
            { microchipId: { contains: filters.search, mode: 'insensitive' } },
          ];
        }

        const [items, total] = await Promise.all([
          (this.db as any).pet.findMany({
            where,
            skip: (page - 1) * limit,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
              vaccinations: true,
              clinicalRecords: true,
              owner: { include: { patientProfile: true } },
            },
          }),
          (this.db as any).pet.count({ where }),
        ]);

        return {
          data: items.map((p: any) => this.mapPrismaPet(p)),
          total,
          page,
          limit,
        };
      } catch (err: any) {
        if (this.isStrictDatabasePersistence()) {
          this.logger.error(`Postgres findPets failed in production: ${err.message}`, err.stack);
          throw err;
        }
        this.logger.warn(`Postgres findPets failed, falling back to local store: ${err.message}`);
      }
    }

    if (this.isStrictDatabasePersistence()) {
      throw new Error('DatabaseService unavailable: Querying pets failed in production environment');
    }

    let items = Array.from(this.pets.values());

    if (filters.ownerUserId) {
      items = items.filter((p) => p.ownerUserId === filters.ownerUserId);
    }

    if (filters.species) {
      const s = filters.species.toUpperCase();
      items = items.filter((p) => p.species.toUpperCase() === s);
    }

    if (filters.search) {
      const q = filters.search.toLowerCase();
      items = items.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.breed && p.breed.toLowerCase().includes(q)) ||
          (p.microchipId && p.microchipId.toLowerCase().includes(q)),
      );
    }

    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = items.length;
    const startIndex = (page - 1) * limit;
    const data = items.slice(startIndex, startIndex + limit);

    return { data, total, page, limit };
  }

  async findPetsForVeterinarian(
    doctorId: string,
    facilityIds: string[] = [],
    filters: Omit<PetFilterOptions, 'ownerUserId' | 'veterinarianId' | 'facilityIds'> = {},
  ): Promise<{ data: PetRecord[]; total: number; page: number; limit: number }> {
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? filters.limit : 20;

    if (this.db) {
      try {
        const relationshipConditions: any[] = [
          { clinicalRecords: { some: { doctorId } } },
          { vaccinations: { some: { veterinarian: doctorId } } },
          {
            owner: {
              patientProfile: {
                appointments: {
                  some: {
                    doctorProfile: { userId: doctorId },
                  },
                },
              },
            },
          },
        ];

        if (facilityIds && facilityIds.length > 0) {
          relationshipConditions.push({
            owner: {
              patientProfile: {
                appointments: {
                  some: {
                    facilityId: { in: facilityIds },
                  },
                },
              },
            },
          });
        }

        const where: any = {
          OR: relationshipConditions,
        };

        if (filters.species) where.species = { equals: filters.species, mode: 'insensitive' };
        if (filters.search) {
          where.AND = [
            {
              OR: [
                { name: { contains: filters.search, mode: 'insensitive' } },
                { breed: { contains: filters.search, mode: 'insensitive' } },
                { microchipId: { contains: filters.search, mode: 'insensitive' } },
              ],
            },
          ];
        }

        const [items, total] = await Promise.all([
          (this.db as any).pet.findMany({
            where,
            skip: (page - 1) * limit,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
              vaccinations: true,
              clinicalRecords: true,
              owner: { include: { patientProfile: true } },
            },
          }),
          (this.db as any).pet.count({ where }),
        ]);

        return {
          data: items.map((p: any) => this.mapPrismaPet(p)),
          total,
          page,
          limit,
        };
      } catch (err: any) {
        if (this.isStrictDatabasePersistence()) {
          this.logger.error(`Postgres findPetsForVeterinarian failed in production: ${err.message}`, err.stack);
          throw err;
        }
        this.logger.warn(`Postgres findPetsForVeterinarian failed, falling back to local store: ${err.message}`);
      }
    }

    if (this.isStrictDatabasePersistence()) {
      throw new Error('DatabaseService unavailable: Querying pets failed in production environment');
    }

    let items = Array.from(this.pets.values());
    items = items.filter((p) => {
      const hasClinical = (p.clinicalRecords || []).some((c) => c.doctorId === doctorId);
      const hasVaccine = (p.vaccinations || []).some((v) => v.veterinarian === doctorId);
      return hasClinical || hasVaccine;
    });

    if (filters.species) {
      const s = filters.species.toUpperCase();
      items = items.filter((p) => p.species.toUpperCase() === s);
    }

    if (filters.search) {
      const q = filters.search.toLowerCase();
      items = items.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.breed && p.breed.toLowerCase().includes(q)) ||
          (p.microchipId && p.microchipId.toLowerCase().includes(q)),
      );
    }

    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = items.length;
    const startIndex = (page - 1) * limit;
    const data = items.slice(startIndex, startIndex + limit);

    return { data, total, page, limit };
  }

  async findPetById(id: string): Promise<PetRecord | null> {
    if (this.db) {
      try {
        const pet = await (this.db as any).pet.findUnique({
          where: { id },
          include: {
            vaccinations: true,
            clinicalRecords: true,
            owner: { include: { patientProfile: true } },
          },
        });
        if (pet) return this.mapPrismaPet(pet);
        return null;
      } catch (err: any) {
        if (this.isStrictDatabasePersistence()) {
          this.logger.error(`Postgres findPetById failed in production: ${err.message}`, err.stack);
          throw err;
        }
        this.logger.warn(`Postgres findPetById failed, falling back to local store: ${err.message}`);
      }
    }

    if (this.isStrictDatabasePersistence()) {
      throw new Error('DatabaseService unavailable: Pet lookup failed in production environment');
    }

    const pet = this.pets.get(id);
    return pet || null;
  }

  async updatePet(id: string, updates: Partial<PetRecord>): Promise<PetRecord | null> {
    if (this.db) {
      try {
        const updated = await (this.db as any).pet.update({
          where: { id },
          data: {
            ...(updates.name !== undefined ? { name: updates.name } : {}),
            ...(updates.species !== undefined ? { species: updates.species } : {}),
            ...(updates.breed !== undefined ? { breed: updates.breed } : {}),
            ...(updates.age !== undefined ? { age: updates.age } : {}),
            ...(updates.dob !== undefined ? { dob: updates.dob } : {}),
            ...(updates.gender !== undefined ? { gender: updates.gender } : {}),
            ...(updates.weight !== undefined ? { weight: updates.weight } : {}),
            ...(updates.microchipId !== undefined ? { microchipId: updates.microchipId } : {}),
            ...(updates.notes !== undefined ? { notes: updates.notes } : {}),
          },
          include: {
            vaccinations: true,
            clinicalRecords: true,
            owner: { include: { patientProfile: true } },
          },
        });
        const mapped = this.mapPrismaPet(updated);
        this.pets.set(id, mapped);
        return mapped;
      } catch (err: any) {
        if (this.isStrictDatabasePersistence()) {
          this.logger.error(`Postgres updatePet failed in production: ${err.message}`, err.stack);
          throw err;
        }
        this.logger.warn(`Postgres updatePet failed, falling back to local store: ${err.message}`);
      }
    }

    if (this.isStrictDatabasePersistence()) {
      throw new Error('DatabaseService unavailable: Pet update failed in production environment');
    }

    const pet = this.pets.get(id);
    if (!pet) return null;

    const updated: PetRecord = {
      ...pet,
      ...updates,
      updatedAt: new Date(),
    };

    this.pets.set(id, updated);
    this.persist();
    return updated;
  }

  async deletePet(id: string): Promise<boolean> {
    if (this.db) {
      try {
        await (this.db as any).pet.delete({ where: { id } });
        this.pets.delete(id);
        return true;
      } catch (err: any) {
        if (this.isStrictDatabasePersistence()) {
          this.logger.error(`Postgres deletePet failed in production: ${err.message}`, err.stack);
          throw err;
        }
        this.logger.warn(`Postgres deletePet failed, falling back to local store: ${err.message}`);
      }
    }

    if (this.isStrictDatabasePersistence()) {
      throw new Error('DatabaseService unavailable: Pet deletion failed in production environment');
    }

    const deleted = this.pets.delete(id);
    if (deleted) {
      this.persist();
    }
    return deleted;
  }

  async addVaccination(petId: string, data: Omit<PetVaccination, 'id' | 'createdAt'>): Promise<PetVaccination | null> {
    if (this.db) {
      try {
        const v = await (this.db as any).petVaccination.create({
          data: {
            petId,
            vaccineName: data.vaccineName,
            administeredDate: data.administeredDate,
            dueDate: data.dueDate,
            batchNumber: data.batchNumber,
            veterinarian: data.veterinarian,
            clinicName: data.clinicName,
            notes: data.notes,
          },
        });
        const vaccination: PetVaccination = {
          id: v.id,
          petId: v.petId,
          vaccineName: v.vaccineName,
          administeredDate: v.administeredDate,
          dueDate: v.dueDate ?? null,
          batchNumber: v.batchNumber ?? null,
          veterinarian: v.veterinarian ?? null,
          clinicName: v.clinicName ?? null,
          notes: v.notes ?? null,
          createdAt: v.createdAt instanceof Date ? v.createdAt : new Date(v.createdAt),
        };
        const cached = this.pets.get(petId);
        if (cached) cached.vaccinations.push(vaccination);
        return vaccination;
      } catch (err: any) {
        if (this.isStrictDatabasePersistence()) {
          this.logger.error(`Postgres addVaccination failed in production: ${err.message}`, err.stack);
          throw err;
        }
        this.logger.warn(`Postgres addVaccination failed, falling back to local store: ${err.message}`);
      }
    }

    if (this.isStrictDatabasePersistence()) {
      throw new Error('DatabaseService unavailable: Vaccination recording failed in production environment');
    }

    const pet = this.pets.get(petId);
    if (!pet) return null;

    const vaccination: PetVaccination = {
      ...data,
      id: randomUUID(),
      petId,
      createdAt: new Date(),
    };

    pet.vaccinations.push(vaccination);
    pet.updatedAt = new Date();
    this.pets.set(petId, pet);
    this.persist();
    return vaccination;
  }

  async getVaccinations(petId: string): Promise<PetVaccination[]> {
    if (this.db) {
      try {
        const list = await (this.db as any).petVaccination.findMany({
          where: { petId },
          orderBy: { createdAt: 'desc' },
        });
        return list.map((v: any) => ({
          id: v.id,
          petId: v.petId,
          vaccineName: v.vaccineName,
          administeredDate: v.administeredDate,
          dueDate: v.dueDate ?? null,
          batchNumber: v.batchNumber ?? null,
          veterinarian: v.veterinarian ?? null,
          clinicName: v.clinicName ?? null,
          notes: v.notes ?? null,
          createdAt: v.createdAt instanceof Date ? v.createdAt : new Date(v.createdAt),
        }));
      } catch (err: any) {
        if (this.isStrictDatabasePersistence()) {
          this.logger.error(`Postgres getVaccinations failed in production: ${err.message}`, err.stack);
          throw err;
        }
        this.logger.warn(`Postgres getVaccinations failed, falling back to local store: ${err.message}`);
      }
    }

    if (this.isStrictDatabasePersistence()) {
      throw new Error('DatabaseService unavailable: Querying vaccinations failed in production environment');
    }

    const pet = this.pets.get(petId);
    return pet ? pet.vaccinations : [];
  }

  async addClinicalRecord(petId: string, data: Omit<PetClinicalRecord, 'id' | 'createdAt'>): Promise<PetClinicalRecord | null> {
    if (this.db) {
      try {
        const c = await (this.db as any).petClinicalRecord.create({
          data: {
            petId,
            doctorId: data.doctorId,
            doctorName: data.doctorName,
            diagnosis: data.diagnosis,
            treatmentPlan: data.treatmentPlan,
            notes: data.notes,
            weightKg: data.weightKg,
            temperatureC: data.temperatureC,
          },
        });
        const record: PetClinicalRecord = {
          id: c.id,
          petId: c.petId,
          doctorId: c.doctorId,
          doctorName: c.doctorName ?? undefined,
          diagnosis: c.diagnosis,
          treatmentPlan: c.treatmentPlan ?? null,
          notes: c.notes ?? null,
          weightKg: c.weightKg ?? null,
          temperatureC: c.temperatureC ?? null,
          createdAt: c.createdAt instanceof Date ? c.createdAt : new Date(c.createdAt),
        };
        const cached = this.pets.get(petId);
        if (cached) {
          if (!cached.clinicalRecords) cached.clinicalRecords = [];
          cached.clinicalRecords.push(record);
        }
        return record;
      } catch (err: any) {
        if (this.isStrictDatabasePersistence()) {
          this.logger.error(`Postgres addClinicalRecord failed in production: ${err.message}`, err.stack);
          throw err;
        }
        this.logger.warn(`Postgres addClinicalRecord failed, falling back to local store: ${err.message}`);
      }
    }

    if (this.isStrictDatabasePersistence()) {
      throw new Error('DatabaseService unavailable: Clinical record addition failed in production environment');
    }

    const pet = this.pets.get(petId);
    if (!pet) return null;

    if (!pet.clinicalRecords) pet.clinicalRecords = [];

    const record: PetClinicalRecord = {
      ...data,
      id: randomUUID(),
      petId,
      createdAt: new Date(),
    };

    pet.clinicalRecords.push(record);
    pet.updatedAt = new Date();
    this.pets.set(petId, pet);
    this.persist();
    return record;
  }

  async getClinicalRecords(petId: string): Promise<PetClinicalRecord[]> {
    if (this.db) {
      try {
        const list = await (this.db as any).petClinicalRecord.findMany({
          where: { petId },
          orderBy: { createdAt: 'desc' },
        });
        return list.map((c: any) => ({
          id: c.id,
          petId: c.petId,
          doctorId: c.doctorId,
          doctorName: c.doctorName ?? undefined,
          diagnosis: c.diagnosis,
          treatmentPlan: c.treatmentPlan ?? null,
          notes: c.notes ?? null,
          weightKg: c.weightKg ?? null,
          temperatureC: c.temperatureC ?? null,
          createdAt: c.createdAt instanceof Date ? c.createdAt : new Date(c.createdAt),
        }));
      } catch (err: any) {
        if (this.isStrictDatabasePersistence()) {
          this.logger.error(`Postgres getClinicalRecords failed in production: ${err.message}`, err.stack);
          throw err;
        }
        this.logger.warn(`Postgres getClinicalRecords failed, falling back to local store: ${err.message}`);
      }
    }

    if (this.isStrictDatabasePersistence()) {
      throw new Error('DatabaseService unavailable: Querying clinical records failed in production environment');
    }

    const pet = this.pets.get(petId);
    return pet && pet.clinicalRecords ? pet.clinicalRecords : [];
  }
}
