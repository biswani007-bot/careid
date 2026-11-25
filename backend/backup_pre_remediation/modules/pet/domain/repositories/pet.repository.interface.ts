import { PetRecord, PetVaccination, PetClinicalRecord } from '../entities/pet.entity';

export interface PetFilterOptions {
  ownerUserId?: string;
  species?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface IPetRepository {
  createPet(pet: Omit<PetRecord, 'id' | 'createdAt' | 'updatedAt' | 'vaccinations' | 'clinicalRecords'>): Promise<PetRecord>;
  findPets(filters: PetFilterOptions): Promise<{ data: PetRecord[]; total: number; page: number; limit: number }>;
  findPetById(id: string): Promise<PetRecord | null>;
  updatePet(id: string, updates: Partial<PetRecord>): Promise<PetRecord | null>;
  deletePet(id: string): Promise<boolean>;
  addVaccination(petId: string, vaccination: Omit<PetVaccination, 'id' | 'createdAt'>): Promise<PetVaccination | null>;
  getVaccinations(petId: string): Promise<PetVaccination[]>;
  addClinicalRecord(petId: string, record: Omit<PetClinicalRecord, 'id' | 'createdAt'>): Promise<PetClinicalRecord | null>;
  getClinicalRecords(petId: string): Promise<PetClinicalRecord[]>;
}

