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
  createdAt: Date;
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
  createdAt: Date;
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
  createdAt: Date;
  updatedAt: Date;
}

