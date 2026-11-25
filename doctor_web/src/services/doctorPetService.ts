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

export interface PetTimelineItem {
  id: string;
  eventType: 'VACCINATION' | 'CLINICAL_RECORD' | 'DOCUMENT';
  title: string;
  date: string;
  details?: any;
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
  ownerName?: string | null;
  ownerPhone?: string | null;
  ownerEmail?: string | null;
  vaccinations: PetVaccination[];
  clinicalRecords?: PetClinicalRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface AddPetVaccinationDto {
  vaccineName: string;
  administeredDate: string;
  dueDate?: string;
  batchNumber?: string;
  veterinarian?: string;
  clinicName?: string;
  notes?: string;
}

export interface CreatePetClinicalRecordDto {
  diagnosis: string;
  treatmentPlan?: string;
  notes?: string;
  weightKg?: number;
  temperatureC?: number;
}

export const doctorPetService = {
  async getPatientPets(patientProfileId: string): Promise<PetRecord[]> {
    const res = await apiClient.get<PetRecord[] | { data: PetRecord[] }>(
      `/api/v1/doctors/patients/${encodeURIComponent(patientProfileId)}/pets`
    );
    const payload = res.data;
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray((payload as any).data)) return (payload as any).data;
    return [];
  },

  async getAllPets(params: { search?: string; species?: string; page?: number; limit?: number } = {}): Promise<{
    data: PetRecord[];
    total: number;
    page: number;
    limit: number;
  }> {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.species && params.species !== 'ALL') query.append('species', params.species);
    query.append('page', String(params.page || 1));
    query.append('limit', String(params.limit || 50));

    const res = await apiClient.get<any>(`/api/v1/doctors/pets?${query.toString()}`);
    const payload = res.data;
    if (payload && 'data' in payload && Array.isArray((payload as any).data)) {
      return payload;
    }
    if (Array.isArray(payload)) {
      return { data: payload, total: payload.length, page: 1, limit: 50 };
    }
    if (payload && Array.isArray((payload as any).data?.data)) {
      return (payload as any).data;
    }
    return { data: [], total: 0, page: 1, limit: 50 };
  },

  async getPetById(petId: string): Promise<PetRecord> {
    const res = await apiClient.get<PetRecord | { data: PetRecord }>(
      `/api/v1/doctors/pets/${encodeURIComponent(petId)}`
    );
    const payload = res.data;
    if (payload && 'name' in payload) return payload as PetRecord;
    if (payload && 'data' in payload) return (payload as any).data as PetRecord;
    throw new Error('Pet profile not found');
  },

  async addClinicalRecord(
    petId: string,
    dto: CreatePetClinicalRecordDto
  ): Promise<PetClinicalRecord> {
    const res = await apiClient.post<PetClinicalRecord | { data: PetClinicalRecord }>(
      `/api/v1/doctors/pets/${encodeURIComponent(petId)}/records`,
      dto
    );
    const payload = res.data;
    if (payload && 'diagnosis' in payload) return payload as PetClinicalRecord;
    if (payload && 'data' in payload) return (payload as any).data as PetClinicalRecord;
    throw new Error('Failed to record veterinary clinical entry');
  },

  async getClinicalRecords(petId: string): Promise<PetClinicalRecord[]> {
    const res = await apiClient.get<PetClinicalRecord[] | { data: PetClinicalRecord[] }>(
      `/api/v1/doctors/pets/${encodeURIComponent(petId)}/records`
    );
    const payload = res.data;
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray((payload as any).data)) return (payload as any).data;
    return [];
  },

  async addVaccination(
    petId: string,
    dto: AddPetVaccinationDto
  ): Promise<PetVaccination> {
    const res = await apiClient.post<PetVaccination | { data: PetVaccination }>(
      `/api/v1/doctors/pets/${encodeURIComponent(petId)}/vaccinations`,
      dto
    );
    const payload = res.data;
    if (payload && 'vaccineName' in payload) return payload as PetVaccination;
    if (payload && 'data' in payload) return (payload as any).data as PetVaccination;
    throw new Error('Failed to record veterinary vaccination entry');
  },

  async getVaccinations(petId: string): Promise<PetVaccination[]> {
    const res = await apiClient.get<PetVaccination[] | { data: PetVaccination[] }>(
      `/api/v1/doctors/pets/${encodeURIComponent(petId)}/vaccinations`
    );
    const payload = res.data;
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray((payload as any).data)) return (payload as any).data;
    return [];
  },

  async getPetTimeline(petId: string): Promise<PetTimelineItem[]> {
    const res = await apiClient.get<PetTimelineItem[] | { data: PetTimelineItem[] }>(
      `/api/v1/doctors/pets/${encodeURIComponent(petId)}/timeline`
    );
    const payload = res.data;
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray((payload as any).data)) return (payload as any).data;
    return [];
  },
};
