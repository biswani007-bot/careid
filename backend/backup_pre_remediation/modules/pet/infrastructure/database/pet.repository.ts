import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { IPetRepository, PetFilterOptions } from '../../domain/repositories/pet.repository.interface';
import { PetRecord, PetVaccination, PetClinicalRecord } from '../../domain/entities/pet.entity';

@Injectable()
export class PetRepository implements IPetRepository {
  private readonly logger = new Logger(PetRepository.name);
  private readonly filePath = path.resolve(process.cwd(), 'data', 'pets.json');
  private pets: Map<string, PetRecord> = new Map();

  constructor() {
    this.loadPets();
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

    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? filters.limit : 20;
    const total = items.length;
    const startIndex = (page - 1) * limit;
    const data = items.slice(startIndex, startIndex + limit);

    return { data, total, page, limit };
  }

  async findPetById(id: string): Promise<PetRecord | null> {
    const pet = this.pets.get(id);
    return pet || null;
  }

  async updatePet(id: string, updates: Partial<PetRecord>): Promise<PetRecord | null> {
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
    const deleted = this.pets.delete(id);
    if (deleted) {
      this.persist();
    }
    return deleted;
  }

  async addVaccination(petId: string, data: Omit<PetVaccination, 'id' | 'createdAt'>): Promise<PetVaccination | null> {
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
    const pet = this.pets.get(petId);
    return pet ? pet.vaccinations : [];
  }

  async addClinicalRecord(petId: string, data: Omit<PetClinicalRecord, 'id' | 'createdAt'>): Promise<PetClinicalRecord | null> {
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
    const pet = this.pets.get(petId);
    return pet && pet.clinicalRecords ? pet.clinicalRecords : [];
  }
}

