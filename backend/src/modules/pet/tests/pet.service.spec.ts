import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { PetService } from '../application/use-cases/pet.service';
import { IPetRepository } from '../domain/repositories/pet.repository.interface';
import { PetRecord, PetVaccination } from '../domain/entities/pet.entity';
import { DatabaseService } from '@database/database.service';

describe('PetService', () => {
  let service: PetService;
  let mockRepo: jest.Mocked<IPetRepository>;

  const mockPet: PetRecord = {
    id: 'pet-1',
    ownerUserId: 'user-1',
    name: 'Max',
    species: 'DOG',
    breed: 'Golden Retriever',
    age: 3,
    dob: '2023-01-01',
    gender: 'MALE',
    weight: 25.5,
    microchipId: '985141002341592',
    notes: 'Friendly',
    vaccinations: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockVaccination: PetVaccination = {
    id: 'vac-1',
    petId: 'pet-1',
    vaccineName: 'Rabies Booster',
    administeredDate: '2026-02-15',
    dueDate: '2027-02-15',
    batchNumber: 'RB-102',
    veterinarian: 'Dr. Smith',
    clinicName: 'Pet Clinic',
    notes: 'No reaction',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    mockRepo = {
      createPet: jest.fn().mockResolvedValue(mockPet),
      findPets: jest.fn().mockResolvedValue({
        data: [mockPet],
        total: 1,
        page: 1,
        limit: 20,
      }),
      findPetsForVeterinarian: jest.fn().mockResolvedValue({
        data: [mockPet],
        total: 1,
        page: 1,
        limit: 20,
      }),
      findPetById: jest.fn().mockResolvedValue(mockPet),
      updatePet: jest.fn().mockImplementation(async (id, updates) => ({
        ...mockPet,
        ...updates,
      })),
      deletePet: jest.fn().mockResolvedValue(true),
      addVaccination: jest.fn().mockResolvedValue(mockVaccination),
      getVaccinations: jest.fn().mockResolvedValue([mockVaccination]),
      addClinicalRecord: jest.fn().mockResolvedValue({
        id: 'clin-1',
        petId: 'pet-1',
        doctorId: 'doc-1',
        doctorName: 'Dr. Clinician',
        diagnosis: 'Healthy Checkup',
        treatmentPlan: 'None',
        notes: 'Routine',
        weightKg: 12.5,
        temperatureC: 38.5,
        createdAt: new Date(),
      }),
      getClinicalRecords: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PetService,
        {
          provide: 'IPetRepository',
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<PetService>(PetService);
  });

  it('should create a pet record', async () => {
    const res = await service.createPet('user-1', {
      name: 'Max',
      species: 'DOG',
      breed: 'Golden Retriever',
      age: 3,
    });

    expect(res).toBeDefined();
    expect(res.id).toBe('pet-1');
    expect(res.name).toBe('Max');
    expect(mockRepo.createPet).toHaveBeenCalled();
  });

  it('should list pets for owner', async () => {
    const res = await service.getPets('user-1', ['PATIENT'], {});
    expect(res.data.length).toBe(1);
    expect(mockRepo.findPets).toHaveBeenCalledWith(expect.objectContaining({ ownerUserId: 'user-1' }));
  });

  it('should list all pets for admin without user scope restriction', async () => {
    const res = await service.getPets('admin-1', ['ADMIN'], {});
    expect(res.data.length).toBe(1);
    expect(mockRepo.findPets).toHaveBeenCalledWith(expect.objectContaining({ ownerUserId: undefined }));
  });

  it('should get pet by ID for owner', async () => {
    const res = await service.getPetById('pet-1', 'user-1', ['PATIENT']);
    expect(res.id).toBe('pet-1');
  });

  it('should throw ForbiddenException if other user attempts to get pet', async () => {
    await expect(service.getPetById('pet-1', 'user-other', ['PATIENT'])).rejects.toThrow(ForbiddenException);
  });

  it('should update pet for owner', async () => {
    const res = await service.updatePet('pet-1', 'user-1', ['PATIENT'], { weight: 26.0 });
    expect(res.weight).toBe(26.0);
  });

  it('should delete pet for owner', async () => {
    const res = await service.deletePet('pet-1', 'user-1', ['PATIENT']);
    expect(res.success).toBe(true);
    expect(mockRepo.deletePet).toHaveBeenCalledWith('pet-1');
  });

  it('should add vaccination to pet', async () => {
    const res = await service.addVaccination('pet-1', 'user-1', ['PATIENT'], {
      vaccineName: 'Rabies Booster',
      administeredDate: '2026-02-15',
    });
    expect(res.id).toBe('vac-1');
    expect(mockRepo.addVaccination).toHaveBeenCalled();
  });

  it('should get vaccinations for pet', async () => {
    const list = await service.getVaccinations('pet-1', 'user-1', ['PATIENT']);
    expect(list.length).toBe(1);
    expect(list[0].vaccineName).toBe('Rabies Booster');
  });

  describe('Veterinary Clinical Authorization & Access Control (B2-01 & User Condition 4)', () => {
    it('should strictly deny ordinary human-health doctor (DOCTOR role) without veterinary accreditation from accessing pet records', async () => {
      mockRepo.findPetById.mockResolvedValueOnce(mockPet);

      await expect(
        service.getPetById('pet-1', 'human-cardiologist-1', ['DOCTOR']),
      ).rejects.toThrow(
        /Ordinary human healthcare providers are not authorized for veterinary records without veterinary clinical accreditation/,
      );
    });

    it('should strictly deny ordinary human-health doctor from adding clinical records to a pet', async () => {
      mockRepo.findPetById.mockResolvedValueOnce(mockPet);

      await expect(
        service.addClinicalRecord('pet-1', 'human-cardiologist-1', ['DOCTOR'], {
          diagnosis: 'Suspected Arrhythmia',
        }),
      ).rejects.toThrow(
        /Ordinary human healthcare providers are not authorized for veterinary records without veterinary clinical accreditation/,
      );
    });

    it('should strictly deny ordinary human-health doctor even if an active appointment exists with the pet owner for human care', async () => {
      const mockDb = {
        doctorProfile: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'doc-prof-cardio',
            primarySpecialization: 'Cardiology',
            department: 'Adult Cardiovascular Services',
            facilityDoctors: [{ facilityId: 'fac-hospital-1' }],
          }),
        },
        appointment: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'appt-human-1',
            doctorId: 'doc-prof-cardio',
            facilityId: 'fac-hospital-1',
          }),
        },
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PetService,
          {
            provide: 'IPetRepository',
            useValue: mockRepo,
          },
          {
            provide: DatabaseService,
            useValue: mockDb,
          },
        ],
      }).compile();

      const serviceWithDb = module.get<PetService>(PetService);
      mockRepo.findPetById.mockResolvedValueOnce(mockPet);

      await expect(
        serviceWithDb.getPetById('pet-1', 'human-cardiologist-1', ['DOCTOR']),
      ).rejects.toThrow(
        /Ordinary human healthcare providers are not authorized for veterinary records without veterinary clinical accreditation/,
      );
      // Verify appointment check was NOT even consulted for non-veterinary clinician
      expect(mockDb.appointment.findFirst).not.toHaveBeenCalled();
    });

    it('should allow accredited veterinary doctor (DOCTOR role with Veterinary Medicine specialization) when active appointment exists', async () => {
      const mockDb = {
        doctorProfile: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'doc-prof-vet',
            primarySpecialization: 'Veterinary Medicine & Surgery',
            department: 'Companion Animal Veterinary Clinic',
            facilityDoctors: [{ facilityId: 'fac-vet-clinic-1' }],
          }),
        },
        appointment: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'appt-vet-1',
            doctorId: 'doc-prof-vet',
            facilityId: 'fac-vet-clinic-1',
          }),
        },
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PetService,
          {
            provide: 'IPetRepository',
            useValue: mockRepo,
          },
          {
            provide: DatabaseService,
            useValue: mockDb,
          },
        ],
      }).compile();

      const serviceWithDb = module.get<PetService>(PetService);
      mockRepo.findPetById.mockResolvedValueOnce(mockPet);

      const res = await serviceWithDb.getPetById('pet-1', 'accredited-vet-doc-1', ['DOCTOR']);
      expect(res.id).toBe('pet-1');
      expect(mockDb.appointment.findFirst).toHaveBeenCalled();
    });

    it('should allow authorized veterinarian who authored a prior clinical record on the pet', async () => {
      const petWithPriorRecord: PetRecord = {
        ...mockPet,
        clinicalRecords: [
          {
            id: 'clin-99',
            petId: 'pet-1',
            doctorId: 'vet-treating-1',
            doctorName: 'Dr. Jane Vet',
            diagnosis: 'Otitis Externa',
            treatmentPlan: 'Ear drops 7 days',
            notes: 'Followup in 2 weeks',
            weightKg: 25.0,
            temperatureC: 38.2,
            createdAt: new Date(),
          },
        ],
      };
      mockRepo.findPetById.mockResolvedValueOnce(petWithPriorRecord);

      const res = await service.getPetById('pet-1', 'vet-treating-1', ['VETERINARIAN']);
      expect(res.id).toBe('pet-1');
      expect(res.name).toBe('Max');
    });

    it('should allow authorized veterinarian who administered a prior vaccination on the pet', async () => {
      const petWithVaccine: PetRecord = {
        ...mockPet,
        vaccinations: [
          {
            id: 'vac-99',
            petId: 'pet-1',
            vaccineName: 'DHPP Core Vaccine',
            administeredDate: '2026-03-01',
            dueDate: '2027-03-01',
            batchNumber: 'VET-88',
            veterinarian: 'vet-vaccinator-2',
            clinicName: 'CareID Vet Clinic',
            notes: 'Administered sub-Q',
            createdAt: new Date(),
          },
        ],
      };
      mockRepo.findPetById.mockResolvedValueOnce(petWithVaccine);

      const res = await service.getPetById('pet-1', 'vet-vaccinator-2', ['DOCTOR_VET']);
      expect(res.id).toBe('pet-1');
    });

    it('should strictly deny unauthorized veterinarian with no prior record, vaccination, or appointment relationship', async () => {
      // Pet has no clinical records or vaccinations authored by this stranger vet
      const unassignedPet: PetRecord = {
        ...mockPet,
        clinicalRecords: [],
        vaccinations: [],
      };
      mockRepo.findPetById.mockResolvedValueOnce(unassignedPet);

      await expect(
        service.getPetById('pet-1', 'stranger-vet-999', ['VETERINARIAN']),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should strictly deny unauthorized clinical record addition from unassigned veterinarian', async () => {
      const unassignedPet: PetRecord = {
        ...mockPet,
        clinicalRecords: [],
        vaccinations: [],
      };
      mockRepo.findPetById.mockResolvedValueOnce(unassignedPet);

      await expect(
        service.addClinicalRecord('pet-1', 'stranger-vet-999', ['VETERINARIAN'], {
          diagnosis: 'Suspected Fracture',
          treatmentPlan: 'X-ray',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow authorized veterinarian to add clinical record when legitimately assigned', async () => {
      const petWithPriorRecord: PetRecord = {
        ...mockPet,
        clinicalRecords: [
          {
            id: 'rec-1',
            petId: 'pet-1',
            doctorId: 'vet-authorized-1',
            doctorName: 'Dr. Jane Vet',
            diagnosis: 'Prior Checkup',
            treatmentPlan: 'None',
            notes: 'Healthy',
            weightKg: 25.0,
            temperatureC: 38.0,
            createdAt: new Date(),
          },
        ],
      };
      mockRepo.findPetById.mockResolvedValueOnce(petWithPriorRecord);

      const record = await service.addClinicalRecord('pet-1', 'vet-authorized-1', ['VETERINARIAN'], {
        diagnosis: 'Dermatitis',
        treatmentPlan: 'Medicated shampoo',
        weightKg: 25.2,
      });

      expect(record).toBeDefined();
      expect(record.diagnosis).toBe('Healthy Checkup'); // mockRepo mock value
      expect(mockRepo.addClinicalRecord).toHaveBeenCalled();
    });

    it('should reject non-veterinary human doctor from calling getPets with 403 Forbidden', async () => {
      await expect(
        service.getPets('human-cardiologist-1', ['DOCTOR'], {}),
      ).rejects.toThrow(
        /Veterinary clinical access denied: Ordinary human healthcare providers are not authorized for veterinary records/,
      );
    });

    it('should allow accredited veterinarian to list practice companion animals via getPetsForVeterinarian', async () => {
      const res = await service.getPetsForVeterinarian('vet-1', ['VETERINARIAN'], { species: 'DOG' });
      expect(res.data).toHaveLength(1);
      expect(res.data[0].id).toBe('pet-1');
      expect(mockRepo.findPetsForVeterinarian).toHaveBeenCalled();
    });

    it('should reject non-veterinary doctor from getPetsByPatientProfile', async () => {
      await expect(
        service.getPetsByPatientProfile('patient-prof-1', 'human-doc-1', ['DOCTOR']),
      ).rejects.toThrow(
        /Veterinary clinical access denied: Ordinary human healthcare providers are not authorized for veterinary records/,
      );
    });
  });
});

