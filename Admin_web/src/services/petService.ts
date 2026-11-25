import { useQuery } from '@tanstack/react-query';
import { apiClient } from './apiClient';

export interface PetVaccination {
  id: string;
  petId: string;
  vaccineName: string;
  administeredDate: string;
  dueDate?: string | null;
  batchNumber?: string | null;
  veterinarian?: string | null;
  clinicName?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface PetClinicalRecord {
  id: string;
  petId: string;
  doctorId: string;
  doctorName?: string;
  diagnosis: string;
  treatmentPlan?: string | null;
  notes?: string | null;
  weightKg?: number | null;
  temperatureC?: number | null;
  createdAt: string;
}

export interface PetRecord {
  id: string;
  ownerUserId: string;
  name: string;
  species: string;
  breed?: string | null;
  age?: number | null;
  dob?: string | null;
  gender?: string | null;
  weight?: number | null;
  microchipId?: string | null;
  notes?: string | null;
  vaccinations: PetVaccination[];
  clinicalRecords?: PetClinicalRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface PetListResponse {
  data: PetRecord[];
  total: number;
  page: number;
  limit: number;
}

export interface PetFilterParams {
  search?: string;
  species?: string;
  page?: number;
  limit?: number;
  ownerUserId?: string;
}

export interface CreatePetDto {
  name: string;
  species: string;
  breed?: string;
  age?: number;
  dob?: string;
  gender?: string;
  weight?: number;
  microchipId?: string;
  ownerUserId: string;
  notes?: string;
}

export interface AddVaccinationDto {
  vaccineName: string;
  administeredDate: string;
  dueDate?: string;
  batchNumber?: string;
  veterinarian?: string;
  clinicName?: string;
  notes?: string;
}

export const petService = {
  async listPets(params: PetFilterParams = {}): Promise<PetListResponse> {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.species && params.species !== 'ALL') query.append('species', params.species);
    if (params.ownerUserId) query.append('ownerUserId', params.ownerUserId);
    query.append('page', String(params.page || 1));
    query.append('limit', String(params.limit || 20));

    const res = await apiClient.get<PetListResponse | { data: PetListResponse }>(
      `/api/v1/pets?${query.toString()}`
    );

    const payload = res.data;
    if (payload && 'data' in payload && Array.isArray((payload as any).data)) {
      return payload as PetListResponse;
    }
    if (payload && Array.isArray((payload as any).data?.data)) {
      return (payload as any).data;
    }
    return { data: [], total: 0, page: 1, limit: 20 };
  },

  async getPetById(id: string): Promise<PetRecord> {
    const res = await apiClient.get<PetRecord | { data: PetRecord }>(`/api/v1/pets/${id}`);
    const payload = res.data;
    if (payload && 'name' in payload) return payload as PetRecord;
    if (payload && 'data' in payload) return (payload as any).data as PetRecord;
    throw new Error('Pet not found');
  },

  async createPet(dto: CreatePetDto): Promise<PetRecord> {
    const res = await apiClient.post<PetRecord | { data: PetRecord }>('/api/v1/pets', dto);
    const payload = res.data;
    if (payload && 'name' in payload) return payload as PetRecord;
    if (payload && 'data' in payload) return (payload as any).data as PetRecord;
    throw new Error('Failed to create pet');
  },

  async updatePet(id: string, updates: Partial<CreatePetDto>): Promise<PetRecord> {
    const res = await apiClient.put<PetRecord | { data: PetRecord }>(`/api/v1/pets/${id}`, updates);
    const payload = res.data;
    if (payload && 'name' in payload) return payload as PetRecord;
    if (payload && 'data' in payload) return (payload as any).data as PetRecord;
    throw new Error('Failed to update pet');
  },

  async deletePet(id: string): Promise<boolean> {
    await apiClient.delete(`/api/v1/pets/${id}`);
    return true;
  },

  async addVaccination(petId: string, dto: AddVaccinationDto): Promise<PetVaccination> {
    const res = await apiClient.post<PetVaccination | { data: PetVaccination }>(
      `/api/v1/pets/${petId}/vaccinations`,
      dto
    );
    const payload = res.data;
    if (payload && 'vaccineName' in payload) return payload as PetVaccination;
    if (payload && 'data' in payload) return (payload as any).data as PetVaccination;
    throw new Error('Failed to add vaccination');
  },

  async getVaccinations(petId: string): Promise<PetVaccination[]> {
    const res = await apiClient.get<PetVaccination[] | { data: PetVaccination[] }>(
      `/api/v1/pets/${petId}/vaccinations`
    );
    const payload = res.data;
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray((payload as any).data)) return (payload as any).data;
    return [];
  },
};

export const usePetsQuery = (params: PetFilterParams = {}) => {
  return useQuery({
    queryKey: ['pets', params],
    queryFn: () => petService.listPets(params),
  });
};

export const usePetDetailsQuery = (petId: string) => {
  return useQuery({
    queryKey: ['pet', petId],
    queryFn: () => petService.getPetById(petId),
    enabled: Boolean(petId),
  });
};
