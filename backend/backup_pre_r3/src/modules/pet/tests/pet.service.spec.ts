import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { PetService } from '../application/use-cases/pet.service';
import { IPetRepository } from '../domain/repositories/pet.repository.interface';
import { PetRecord, PetVaccination } from '../domain/entities/pet.entity';

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
});

