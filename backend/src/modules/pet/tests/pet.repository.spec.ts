import { PetRepository } from '../infrastructure/database/pet.repository';
import { DatabaseService } from '@database/database.service';

describe('PetRepository (Production Persistence & Zero Silent Fallback - B2-02)', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  describe('Production Environment Guard (NODE_ENV = production)', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    it('should throw an immediate error during instantiation if DatabaseService is missing in production', () => {
      expect(() => new PetRepository(undefined)).toThrow(
        /DatabaseService is required in staging and production environments/,
      );
    });

    it('should propagate database exception on createPet without falling back to JSON or in-memory storage', async () => {
      const mockDb = {
        pet: {
          create: jest.fn().mockRejectedValue(new Error('Connection lost to PostgreSQL host')),
        },
      } as unknown as DatabaseService;

      const repo = new PetRepository(mockDb);

      await expect(
        repo.createPet({
          ownerUserId: 'user-prod-1',
          name: 'Buddy',
          species: 'CANINE',
        }),
      ).rejects.toThrow('Connection lost to PostgreSQL host');

      // Verify no pet was persisted to local store
      expect(mockDb.pet.create).toHaveBeenCalled();
    });

    it('should propagate database exception on findPets without falling back to local file', async () => {
      const mockDb = {
        pet: {
          findMany: jest.fn().mockRejectedValue(new Error('PostgreSQL read query timeout')),
          count: jest.fn().mockRejectedValue(new Error('PostgreSQL count query timeout')),
        },
      } as unknown as DatabaseService;

      const repo = new PetRepository(mockDb);

      await expect(repo.findPets({ ownerUserId: 'user-prod-1' })).rejects.toThrow(
        'PostgreSQL read query timeout',
      );
    });

    it('should propagate database exception on addClinicalRecord in production', async () => {
      const mockDb = {
        petClinicalRecord: {
          create: jest.fn().mockRejectedValue(new Error('Foreign key violation on petId')),
        },
      } as unknown as DatabaseService;

      const repo = new PetRepository(mockDb);

      await expect(
        repo.addClinicalRecord('pet-uuid-1', {
          petId: 'pet-uuid-1',
          doctorId: 'vet-uuid-1',
          diagnosis: 'Acute Gastritis',
        }),
      ).rejects.toThrow('Foreign key violation on petId');
    });

    it('should propagate database exception on addVaccination in production', async () => {
      const mockDb = {
        petVaccination: {
          create: jest.fn().mockRejectedValue(new Error('Deadlock detected on pet_vaccinations table')),
        },
      } as unknown as DatabaseService;

      const repo = new PetRepository(mockDb);

      await expect(
        repo.addVaccination('pet-uuid-1', {
          petId: 'pet-uuid-1',
          vaccineName: 'Parvovirus',
          administeredDate: '2026-11-19',
        }),
      ).rejects.toThrow('Deadlock detected on pet_vaccinations table');
    });
  });

  describe('Staging Environment Guard (NODE_ENV = staging or APP_ENV = staging)', () => {
    const originalAppEnv = process.env.APP_ENV;
    const originalDepEnv = process.env.DEPLOYMENT_ENV;
    const originalStrictFlag = process.env.STRICT_PET_PERSISTENCE;

    afterEach(() => {
      process.env.APP_ENV = originalAppEnv;
      process.env.DEPLOYMENT_ENV = originalDepEnv;
      process.env.STRICT_PET_PERSISTENCE = originalStrictFlag;
    });

    it('should throw an immediate error during instantiation if DatabaseService is missing when NODE_ENV=staging', () => {
      process.env.NODE_ENV = 'staging';
      expect(() => new PetRepository(undefined)).toThrow(
        /DatabaseService is required in staging and production environments/,
      );
    });

    it('should throw an immediate error during instantiation when APP_ENV=staging even if NODE_ENV=development', () => {
      process.env.NODE_ENV = 'development';
      process.env.APP_ENV = 'staging';
      expect(() => new PetRepository(undefined)).toThrow(
        /DatabaseService is required in staging and production environments/,
      );
    });

    it('should throw an immediate error during instantiation when STRICT_PET_PERSISTENCE=true', () => {
      process.env.NODE_ENV = 'development';
      process.env.STRICT_PET_PERSISTENCE = 'true';
      expect(() => new PetRepository(undefined)).toThrow(
        /DatabaseService is required in staging and production environments/,
      );
    });

    it('should strictly rethrow database error in staging on createPet without falling back to JSON', async () => {
      process.env.NODE_ENV = 'staging';
      const mockDb = {
        pet: {
          create: jest.fn().mockRejectedValue(new Error('Staging database connection timeout')),
        },
      } as unknown as DatabaseService;

      const repo = new PetRepository(mockDb);

      await expect(
        repo.createPet({
          ownerUserId: 'user-staging-1',
          name: 'Staging Pet',
          species: 'FELINE',
        }),
      ).rejects.toThrow('Staging database connection timeout');
    });
  });

  describe('Non-Production Environment Sandbox (NODE_ENV = development / test)', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'test';
      delete process.env.APP_ENV;
      delete process.env.DEPLOYMENT_ENV;
      delete process.env.STRICT_PET_PERSISTENCE;
    });

    it('should gracefully allow in-memory/JSON operations in test environment without DatabaseService', async () => {
      const repo = new PetRepository(undefined);
      const pet = await repo.createPet({
        ownerUserId: 'dev-user-1',
        name: 'Sandbox Dog',
        species: 'CANINE',
      });

      expect(pet).toBeDefined();
      expect(pet.name).toBe('Sandbox Dog');
      expect(pet.id).toBeDefined();

      const found = await repo.findPetById(pet.id);
      expect(found).toBeDefined();
      expect(found?.name).toBe('Sandbox Dog');
    });
  });
});
