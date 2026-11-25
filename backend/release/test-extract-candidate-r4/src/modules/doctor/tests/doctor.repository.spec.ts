import { DoctorRepository } from '../infrastructure/database/doctor.repository';

describe('DoctorRepository - verifyDoctorPatientAccess Security Rules', () => {
  let repository: DoctorRepository;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      patientProfile: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
      doctorFacility: {
        findMany: jest.fn(),
      },
      patientReferral: {
        findFirst: jest.fn(),
      },
      securityConsentRecord: {
        findFirst: jest.fn(),
      },
    };
    repository = new DoctorRepository(mockDb);
  });

  const doctorContext = {
    doctorId: 'doc-uuid-1',
    doctorUserId: 'doc-user-1',
    activeFacilityIds: ['fac-1'],
  };

  const patientContext = {
    id: 'patient-profile-1',
    userId: 'patient-user-1',
  };

  it('1. Historical authorship alone does not grant access (no referral, no consent)', async () => {
    mockDb.patientProfile.findUnique.mockResolvedValue(patientContext);
    mockDb.patientReferral.findFirst.mockResolvedValue(null);
    mockDb.securityConsentRecord.findFirst.mockResolvedValue(null);

    const result = await repository.verifyDoctorPatientAccess(
      doctorContext.doctorId,
      doctorContext.doctorUserId,
      patientContext.id,
      doctorContext.activeFacilityIds,
    );

    expect(result.isAuthorized).toBe(false);
    expect(result.reason).toContain('No active referral');
  });

  it('2. Referral with SUBMITTED status does NOT grant access (repository query filters out non-ACCEPTED/IN_PROGRESS)', async () => {
    mockDb.patientProfile.findUnique.mockResolvedValue(patientContext);
    // When Prisma executes findFirst with { status: { in: ['ACCEPTED', 'IN_PROGRESS'] } }, SUBMITTED is never matched
    mockDb.patientReferral.findFirst.mockResolvedValue(null);
    mockDb.securityConsentRecord.findFirst.mockResolvedValue(null);

    const result = await repository.verifyDoctorPatientAccess(
      doctorContext.doctorId,
      doctorContext.doctorUserId,
      patientContext.id,
      doctorContext.activeFacilityIds,
    );

    expect(result.isAuthorized).toBe(false);
    expect(mockDb.patientReferral.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { in: ['ACCEPTED', 'IN_PROGRESS'] },
        }),
      }),
    );
  });

  it('3. Referral with ACCEPTED status and accessScope ALL_RECORDS grants broad access', async () => {
    mockDb.patientProfile.findUnique.mockResolvedValue(patientContext);
    mockDb.patientReferral.findFirst.mockResolvedValue({
      id: 'ref-1',
      status: 'ACCEPTED',
      accessScope: 'ALL_RECORDS',
      medicalRecordId: null,
    });

    const result = await repository.verifyDoctorPatientAccess(
      doctorContext.doctorId,
      doctorContext.doctorUserId,
      patientContext.id,
      doctorContext.activeFacilityIds,
    );

    expect(result.isAuthorized).toBe(true);
    expect(result.authSource).toBe('REFERRAL');
    expect(result.scopeRecordId).toBeUndefined();
  });

  it('4. Referral with IN_PROGRESS status and accessScope ALL_RECORDS grants broad access', async () => {
    mockDb.patientProfile.findUnique.mockResolvedValue(patientContext);
    mockDb.patientReferral.findFirst.mockResolvedValue({
      id: 'ref-2',
      status: 'IN_PROGRESS',
      accessScope: 'ALL_RECORDS',
      medicalRecordId: null,
    });

    const result = await repository.verifyDoctorPatientAccess(
      doctorContext.doctorId,
      doctorContext.doctorUserId,
      patientContext.id,
      doctorContext.activeFacilityIds,
    );

    expect(result.isAuthorized).toBe(true);
    expect(result.authSource).toBe('REFERRAL');
    expect(result.scopeRecordId).toBeUndefined();
  });

  it('5. Referral with specific medicalRecordId restricts access to scoped record', async () => {
    mockDb.patientProfile.findUnique.mockResolvedValue(patientContext);
    mockDb.patientReferral.findFirst.mockResolvedValue({
      id: 'ref-3',
      status: 'ACCEPTED',
      accessScope: 'REFERRAL_ONLY',
      medicalRecordId: 'med-rec-42',
    });

    const result = await repository.verifyDoctorPatientAccess(
      doctorContext.doctorId,
      doctorContext.doctorUserId,
      patientContext.id,
      doctorContext.activeFacilityIds,
    );

    expect(result.isAuthorized).toBe(true);
    expect(result.authSource).toBe('REFERRAL');
    expect(result.scopeRecordId).toBe('med-rec-42');
  });

  it('6. Referral without medicalRecordId and without ALL_RECORDS does NOT grant access and falls back to consent', async () => {
    mockDb.patientProfile.findUnique.mockResolvedValue(patientContext);
    mockDb.patientReferral.findFirst.mockResolvedValue({
      id: 'ref-4',
      status: 'ACCEPTED',
      accessScope: 'REFERRAL_ONLY',
      medicalRecordId: null,
    });
    mockDb.securityConsentRecord.findFirst.mockResolvedValue(null);

    const result = await repository.verifyDoctorPatientAccess(
      doctorContext.doctorId,
      doctorContext.doctorUserId,
      patientContext.id,
      doctorContext.activeFacilityIds,
    );

    expect(result.isAuthorized).toBe(false);
    expect(result.reason).toContain('Referral does not have an attached medical record');
  });

  it('7. Patient consent directly designating authorizedDoctorId grants access', async () => {
    mockDb.patientProfile.findUnique.mockResolvedValue(patientContext);
    mockDb.patientReferral.findFirst.mockResolvedValue(null);
    mockDb.securityConsentRecord.findFirst.mockResolvedValue({
      id: 'consent-1',
      status: 'GRANTED',
      authorizedDoctorId: doctorContext.doctorId,
      authorizedFacilityId: null,
      capturedBy: 'intake-staff-uuid', // Staff-captured
    });

    const result = await repository.verifyDoctorPatientAccess(
      doctorContext.doctorId,
      doctorContext.doctorUserId,
      patientContext.id,
      doctorContext.activeFacilityIds,
    );

    expect(result.isAuthorized).toBe(true);
    expect(result.authSource).toBe('CONSENT');
    expect(result.scopeRecordId).toBeUndefined();
  });

  it('8. Patient consent designating doctor activeFacilityId grants access', async () => {
    mockDb.patientProfile.findUnique.mockResolvedValue(patientContext);
    mockDb.patientReferral.findFirst.mockResolvedValue(null);
    mockDb.securityConsentRecord.findFirst.mockResolvedValue({
      id: 'consent-2',
      status: 'GRANTED',
      authorizedDoctorId: null,
      authorizedFacilityId: 'fac-1',
      capturedBy: 'patient-self-uuid', // Patient-captured
    });

    const result = await repository.verifyDoctorPatientAccess(
      doctorContext.doctorId,
      doctorContext.doctorUserId,
      patientContext.id,
      doctorContext.activeFacilityIds,
    );

    expect(result.isAuthorized).toBe(true);
    expect(result.authSource).toBe('CONSENT');
  });

  it('9. Consent query requires status GRANTED, non-withdrawn, and designated doctor or facility', async () => {
    mockDb.patientProfile.findUnique.mockResolvedValue(patientContext);
    mockDb.patientReferral.findFirst.mockResolvedValue(null);
    mockDb.securityConsentRecord.findFirst.mockResolvedValue(null);

    await repository.verifyDoctorPatientAccess(
      doctorContext.doctorId,
      doctorContext.doctorUserId,
      patientContext.id,
      doctorContext.activeFacilityIds,
    );

    expect(mockDb.securityConsentRecord.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'GRANTED',
          withdrawnAt: null,
          consentType: { in: ['TREATMENT', 'DATA_SHARING'] },
        }),
      }),
    );
  });

  it('10. Legacy consent with no designated recipient (authorizedDoctorId: null, authorizedFacilityId: null) does not authorize access', async () => {
    mockDb.patientProfile.findUnique.mockResolvedValue(patientContext);
    mockDb.patientReferral.findFirst.mockResolvedValue(null);
    // When Prisma executes findFirst with the OR condition on authorizedDoctorId and authorizedFacilityId,
    // a legacy record with both null does not match the where clause and findFirst returns null.
    mockDb.securityConsentRecord.findFirst.mockResolvedValue(null);

    const result = await repository.verifyDoctorPatientAccess(
      doctorContext.doctorId,
      doctorContext.doctorUserId,
      patientContext.id,
      doctorContext.activeFacilityIds,
    );

    expect(result.isAuthorized).toBe(false);
    expect(result.reason).toContain('No active referral with valid scope or active consent designated for doctor/facility found');
  });
});
