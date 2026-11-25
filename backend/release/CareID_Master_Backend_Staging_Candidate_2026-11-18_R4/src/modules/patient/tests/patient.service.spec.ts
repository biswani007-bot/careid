import { PatientService } from '../application/use-cases/patient.service';

describe('PatientService', () => {
  let service: PatientService;
  let mockPatientRepository: any;

  beforeEach(() => {
    mockPatientRepository = {
      findProfileByUserId: jest.fn(),
      findProfileById: jest.fn(),
      createProfile: jest.fn(),
      updateProfile: jest.fn(),
      createEmergencyContact: jest.fn(),
      updateEmergencyContact: jest.fn(),
      findEmergencyContactByProfileId: jest.fn(),
      createInsurancePolicy: jest.fn(),
      updateInsurancePolicy: jest.fn(),
      findInsurancePolicyByProfileId: jest.fn(),
      createHealthCard: jest.fn(),
      findHealthCardByProfileId: jest.fn(),
      createFamilyConsent: jest.fn(),
      findConsentById: jest.fn(),
      updateConsentStatus: jest.fn(),
      createFamilyMember: jest.fn(),
    };

    service = new PatientService(mockPatientRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onboardDemographics', () => {
    it('should create new patient profile if it does not exist', async () => {
      mockPatientRepository.findProfileByUserId.mockResolvedValue(null);
      mockPatientRepository.createProfile.mockResolvedValue({
        id: 'new-profile-uuid',
        firstName: 'John',
        lastName: 'Doe',
        onboardingStep: 1,
      });
      mockPatientRepository.updateProfile.mockResolvedValue({
        id: 'new-profile-uuid',
        firstName: 'John',
        lastName: 'Doe',
        onboardingStep: 2,
      });

      const result = await service.onboardDemographics('user-123', {
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        gender: 'Male',
      });

      expect(mockPatientRepository.createProfile).toHaveBeenCalled();
      expect(mockPatientRepository.updateProfile).toHaveBeenCalled();
      expect(result.profileId).toBe('new-profile-uuid');
      expect(result.nextStep).toBe(3);
    });
  });

  describe('onboardEmergencyInfo', () => {
    it('should create emergency contact details linked to profile', async () => {
      mockPatientRepository.findProfileByUserId.mockResolvedValue({ id: 'profile-123', onboardingStep: 2 });
      mockPatientRepository.findEmergencyContactByProfileId.mockResolvedValue(null);
      mockPatientRepository.createEmergencyContact.mockResolvedValue({ id: 'contact-123' });
      mockPatientRepository.updateProfile.mockResolvedValue({ id: 'profile-123', onboardingStep: 3 });

      const result = await service.onboardEmergencyInfo('user-123', {
        name: 'Jane Doe',
        relationship: 'Spouse',
        phone: '+14155552671',
      });

      expect(mockPatientRepository.createEmergencyContact).toHaveBeenCalledWith('profile-123', {
        name: 'Jane Doe',
        relationship: 'Spouse',
        phone: '+14155552671',
      });
      expect(result.contactId).toBe('contact-123');
      expect(result.nextStep).toBe(4);
    });
  });

  describe('getOnboardingProgress', () => {
    it('should return onboarding steps and calculate percentage', async () => {
      mockPatientRepository.findProfileByUserId.mockResolvedValue({
        id: 'profile-123',
        firstName: 'John',
        status: 'DRAFT',
        onboardingStep: 2,
      });
      mockPatientRepository.findEmergencyContactByProfileId.mockResolvedValue({ id: 'contact-1' });
      mockPatientRepository.findInsurancePolicyByProfileId.mockResolvedValue(null);
      mockPatientRepository.findHealthCardByProfileId.mockResolvedValue(null);

      const result = await service.getOnboardingProgress('user-123');

      expect(result.status).toBe('DRAFT');
      expect(result.steps.length).toBe(6);
      expect(result.steps[0].completed).toBe(true); // Identity
      expect(result.steps[1].completed).toBe(true); // Demographics (firstName present)
      expect(result.steps[2].completed).toBe(true); // Emergency contact present
      expect(result.steps[3].completed).toBe(false); // Insurance missing
      expect(result.completionPercentage).toBe(50); // 3 of 6 = 50%
    });
  });

  describe('getProfileCompletion', () => {
    it('should return profile sections and section-based percentage', async () => {
      mockPatientRepository.findProfileByUserId.mockResolvedValue({
        id: 'profile-123',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        gender: 'Male',
        nationality: 'Indian',
        maritalStatus: 'Single',
        currentCity: 'Mumbai',
        currentCountry: 'India',
        bloodGroup: 'O+',
        photoUrl: 'https://example.com/photo.jpg',
        status: 'VERIFIED',
      });
      mockPatientRepository.findEmergencyContactByProfileId.mockResolvedValue({ id: 'c-1' });
      mockPatientRepository.findInsurancePolicyByProfileId.mockResolvedValue({ id: 'i-1' });
      mockPatientRepository.findHealthCardByProfileId.mockResolvedValue({ id: 'h-1' });

      const result = await service.getProfileCompletion('user-123');

      expect(result.status).toBe('VERIFIED');
      expect(result.sections.length).toBe(8);
      expect(result.completionPercentage).toBe(100);
      expect(result.sections.every(s => s.completed)).toBe(true);
    });
  });

  describe('uploadPhoto and photo management', () => {
    it('should reject photo URL pointing to loopback or private IP', async () => {
      mockPatientRepository.findProfileByUserId.mockResolvedValue({ id: 'profile-123' });
      await expect(
        service.uploadPhoto('user-123', 'http://127.0.0.1/secret.jpg'),
      ).rejects.toThrow('private or reserved network address');
    });

    it('should reject photo URL pointing to cloud metadata services', async () => {
      mockPatientRepository.findProfileByUserId.mockResolvedValue({ id: 'profile-123' });
      await expect(
        service.uploadPhoto('user-123', 'http://metadata.google.internal/computeMetadata/v1/'),
      ).rejects.toThrow('restricted or internal network address');
    });

    it('should reject corrupted or non-image buffer upload', async () => {
      mockPatientRepository.findProfileByUserId.mockResolvedValue({ id: 'profile-123' });
      const badBuffer = Buffer.from('NOT_AN_IMAGE_CONTENT');
      await expect(
        service.uploadPhoto('user-123', undefined, undefined, { buffer: badBuffer, size: 20 }),
      ).rejects.toThrow('File contents do not match a valid image format');
    });

    it('should successfully upload valid JPEG image buffer and clean previous photo', async () => {
      mockPatientRepository.findProfileByUserId.mockResolvedValue({
        id: 'profile-123',
        photoUrl: '/api/v1/patients/me/photo/file/patient-profile-123-old.jpg',
        photoKey: 'uploads/photos/patient-profile-123-old.jpg',
      });
      mockPatientRepository.updateProfile.mockResolvedValue({});
      mockPatientRepository.createProfileAuditLog = jest.fn().mockResolvedValue({});

      // Minimal valid JPEG header: FF D8 FF E0 00 10 4A 46 49 46 00 01
      const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
      const result = await service.uploadPhoto('user-123', undefined, undefined, { buffer: jpegBuffer, size: 12 });

      expect(result.photoUrl).toContain('/api/v1/patients/me/photo/file/patient-profile-123-');
      expect(mockPatientRepository.updateProfile).toHaveBeenCalledWith(
        'profile-123',
        expect.objectContaining({ photoUrl: expect.stringContaining('patient-profile-123-') }),
      );
    });

    it('should forbid other patients from accessing private photo file', async () => {
      mockPatientRepository.findProfileByUserId.mockResolvedValue({ id: 'profile-other' });
      await expect(
        service.servePhotoFile('patient-profile-123-12345.jpg', 'user-other', ['PATIENT']),
      ).rejects.toThrow('You do not have access to view this profile photo');
    });

    it('should delete photo and update profile to null', async () => {
      mockPatientRepository.findProfileByUserId.mockResolvedValue({
        id: 'profile-123',
        photoUrl: '/api/v1/patients/me/photo/file/patient-profile-123-test.jpg',
        photoKey: 'uploads/photos/patient-profile-123-test.jpg',
      });
      mockPatientRepository.updateProfile.mockResolvedValue({});
      mockPatientRepository.createProfileAuditLog = jest.fn().mockResolvedValue({});

      const result = await service.deletePhoto('user-123');
      expect(result.message).toContain('deleted successfully');
      expect(mockPatientRepository.updateProfile).toHaveBeenCalledWith('profile-123', { photoUrl: null, photoKey: null });
    });

    it('should delete newly written file if database update fails during upload', async () => {
      mockPatientRepository.findProfileByUserId.mockResolvedValue({
        id: 'profile-123',
        photoUrl: null,
        photoKey: null,
      });
      mockPatientRepository.updateProfile.mockRejectedValue(new Error('Prisma database connection timeout'));

      const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
      await expect(
        service.uploadPhoto('user-123', undefined, undefined, { buffer: jpegBuffer, size: 12 }),
      ).rejects.toThrow('Prisma database connection timeout');
    });

    it('should abort and not delete file if database update fails during photo deletion', async () => {
      mockPatientRepository.findProfileByUserId.mockResolvedValue({
        id: 'profile-123',
        photoUrl: '/api/v1/patients/me/photo/file/patient-profile-123-keep.jpg',
        photoKey: 'uploads/photos/patient-profile-123-keep.jpg',
      });
      mockPatientRepository.updateProfile.mockRejectedValue(new Error('Prisma database write failure'));

      await expect(service.deletePhoto('user-123')).rejects.toThrow('Prisma database write failure');
    });

    it('should set private cache and security response headers when serving photo file', async () => {
      mockPatientRepository.findProfileByUserId.mockResolvedValue({ id: 'profile-123' });

      const fs = require('fs');
      const path = require('path');
      const { PassThrough } = require('stream');
      const testDir = path.join(process.cwd(), 'data', 'uploads', 'photos');
      if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });
      const testFile = path.join(testDir, 'patient-profile-123-header-test.jpg');
      fs.writeFileSync(testFile, Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]));

      const headers: Record<string, string> = {};
      const mockRes = new PassThrough() as any;
      mockRes.setHeader = jest.fn((k: string, v: string) => {
        headers[k] = v;
      });

      try {
        await service.servePhotoFile('patient-profile-123-header-test.jpg', 'user-123', ['PATIENT'], mockRes);

        expect(mockRes.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store, max-age=0, must-revalidate');
        expect(mockRes.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
        expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'image/jpeg');
        expect(headers['Cache-Control']).toBe('private, no-store, max-age=0, must-revalidate');

        await new Promise((resolve) => setTimeout(resolve, 100));
      } finally {
        if (fs.existsSync(testFile)) {
          try { fs.unlinkSync(testFile); } catch {}
        }
      }
    });

    it('should generate independent non-colliding filenames on concurrent uploads', async () => {
      mockPatientRepository.findProfileByUserId.mockResolvedValue({
        id: 'profile-123',
        photoUrl: null,
        photoKey: null,
      });
      mockPatientRepository.updateProfile.mockResolvedValue({});
      mockPatientRepository.createProfileAuditLog = jest.fn().mockResolvedValue({});

      const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
      const [upload1, upload2] = await Promise.all([
        service.uploadPhoto('user-123', undefined, undefined, { buffer: jpegBuffer, size: 12 }),
        service.uploadPhoto('user-123', undefined, undefined, { buffer: jpegBuffer, size: 12 }),
      ]);

      expect(upload1.photoUrl).toBeDefined();
      expect(upload2.photoUrl).toBeDefined();
      expect(upload1.photoUrl).not.toEqual(upload2.photoUrl);
    });
  });
});
