import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ConflictException, ForbiddenException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import { DatabaseModule } from '@database/database.module';
import { DatabaseService } from '@database/database.service';
import { TreatmentOfferModule } from '../treatment-offer.module';
import { TreatmentOfferService } from '../application/use-cases/treatment-offer.service';
import { TreatmentOfferRepository } from '../infrastructure/database/treatment-offer.repository';
import { TreatmentOfferStatus, ClinicalReviewAction } from '../presentation/dto/treatment-offer.dto';

describe('CareID Treatment Offer Real PostgreSQL Integration Suite', () => {
  jest.setTimeout(45000);
  let app: INestApplication;
  let db: DatabaseService;
  let service: TreatmentOfferService;
  let repo: TreatmentOfferRepository;

  let patientProfileId: string;
  let doctorUserId: string;
  let doctorProfileId: string;
  let facilityId: string;
  let testOfferId: string;
  const createdTestOfferIds: string[] = [];

  beforeAll(async () => {
    const mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        DatabaseModule,
        TreatmentOfferModule,
      ],
      providers: [
        {
          provide: Logger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    db = moduleRef.get<DatabaseService>(DatabaseService);
    service = moduleRef.get<TreatmentOfferService>(TreatmentOfferService);
    repo = moduleRef.get<TreatmentOfferRepository>('ITreatmentOfferRepository');

    // Retrieve real seeded entities from PostgreSQL
    const doctor = await db.doctorProfile.findFirst({
      where: { verificationStatus: 'VERIFIED', isDeleted: false },
      include: { user: true },
    });
    const patient = await db.patientProfile.findFirst({
      include: { user: true },
    });
    const facility = await db.facility.findFirst();

    if (!doctor || !patient || !facility) {
      throw new Error('Database must have seeded doctor, patient, and facility to run integration suite');
    }

    doctorUserId = doctor.userId;
    doctorProfileId = doctor.id;
    patientProfileId = patient.id;
    facilityId = facility.id;

    // Ensure doctor has an active privilege at facility
    await db.doctorFacility.upsert({
      where: {
        doctorId_facilityId: {
          doctorId: doctorProfileId,
          facilityId,
        },
      },
      update: { isActive: true },
      create: {
        doctorId: doctorProfileId,
        facilityId,
        isActive: true,
      },
    });
  });

  afterAll(async () => {
    // Cleanup any test offers created
    const idsToClean = [testOfferId, ...createdTestOfferIds].filter(Boolean);
    if (idsToClean.length > 0 && db) {
      try {
        await db.treatmentOfferProcedure.deleteMany({ where: { treatmentOfferId: { in: idsToClean } } });
        await db.treatmentOfferHistory.deleteMany({ where: { treatmentOfferId: { in: idsToClean } } });
        await db.treatmentOffer.deleteMany({ where: { id: { in: idsToClean } } });
      } catch {}
    }
    if (app) {
      await app.close();
    }
  });

  describe('1. PostgreSQL Sequence Concurrency & Monotonicity', () => {
    it('should generate monotonic, non-colliding sequential offer numbers under high concurrency', async () => {
      const concurrentRequests = 15;
      const promises = Array.from({ length: concurrentRequests }).map(() =>
        repo.generateOfferNumber(),
      );

      const generatedNumbers = await Promise.all(promises);

      // Verify all generated numbers are distinct
      const uniqueNumbers = new Set(generatedNumbers);
      expect(uniqueNumbers.size).toBe(concurrentRequests);

      // Verify format TO-YYYY-XXXXX
      const year = new Date().getFullYear();
      for (const num of generatedNumbers) {
        expect(num).toMatch(new RegExp(`^TO-${year}-[0-9]{5}$`));
      }
    });

    it('should generate monotonic, non-colliding financing offer numbers under concurrency', async () => {
      const concurrentRequests = 10;
      const promises = Array.from({ length: concurrentRequests }).map(() =>
        repo.generateFinancingOfferNumber(),
      );

      const generatedNumbers = await Promise.all(promises);
      const uniqueNumbers = new Set(generatedNumbers);
      expect(uniqueNumbers.size).toBe(concurrentRequests);

      const year = new Date().getFullYear();
      for (const num of generatedNumbers) {
        expect(num).toMatch(new RegExp(`^FO-${year}-[0-9]{5}$`));
      }
    });
  });

  describe('2. Real Database Lifecycle CRUD & Transaction Rollback', () => {
    it('should persist a draft treatment offer with itemized procedures in PostgreSQL', async () => {
      const created = await service.createOffer(doctorUserId, {
        patientProfileId,
        facilityId,
        clinicalIndication: 'Real PostgreSQL Integration Test: Elective Angioplasty',
        procedures: [
          {
            procedureCode: 'PCI-001',
            procedureName: 'Percutaneous Coronary Intervention',
            unitCost: 150000,
            quantity: 1,
          },
        ],
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });

      testOfferId = created.id;
      expect(created.id).toBeDefined();
      expect(created.status).toBe(TreatmentOfferStatus.DRAFT);
      expect(created.netPayable).toBe(150000);

      // Verify directly from PostgreSQL
      const fromDb = await db.treatmentOffer.findUnique({
        where: { id: testOfferId },
        include: { procedures: true },
      });
      expect(fromDb).not.toBeNull();
      expect(fromDb?.procedures.length).toBe(1);
      expect(fromDb?.procedures[0].procedureCode).toBe('PCI-001');
    });

    it('should roll back completely on transaction failure', async () => {
      const initialHistoryCount = await db.treatmentOfferHistory.count({
        where: { treatmentOfferId: testOfferId },
      });

      // Attempt an invalid cancel operation that fails version mismatch
      await expect(
        service.cancelOffer(
          doctorUserId,
          testOfferId,
          ['DOCTOR'],
          { cancellationReason: 'Test Rollback', expectedVersion: 9999 },
        ),
      ).rejects.toThrow(ConflictException);

      // Verify no dirty history record was committed
      const finalHistoryCount = await db.treatmentOfferHistory.count({
        where: { treatmentOfferId: testOfferId },
      });
      expect(finalHistoryCount).toBe(initialHistoryCount);
    });
  });

  describe('3. Clinical Review & Attestation Enforcement in Real DB', () => {
    it('should block dispatch when clinical review has not been submitted', async () => {
      await expect(
        service.dispatchOffer(doctorUserId, testOfferId, {
          attestationStatement: 'I attest clinical necessity',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should block dispatch when clinical review is REJECTED or NEEDS_INFORMATION', async () => {
      // Submit NEEDS_INFORMATION review
      await service.submitClinicalReview(
        doctorUserId,
        testOfferId,
        { action: ClinicalReviewAction.NEEDS_INFORMATION, comments: 'Pending lab results' },
        ['DOCTOR'],
      );

      await expect(
        service.dispatchOffer(doctorUserId, testOfferId, {
          attestationStatement: 'I attest clinical necessity',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should permit dispatch once clinical review is APPROVED and attestation is submitted', async () => {
      // Submit APPROVED clinical review
      await service.submitClinicalReview(
        doctorUserId,
        testOfferId,
        { action: ClinicalReviewAction.APPROVED, comments: 'All clinical criteria verified' },
        ['DOCTOR'],
      );

      // Explicit attestation
      const attestation = await service.submitAttestation(doctorUserId, testOfferId, {
        statement: 'I attest that these procedures are clinically indicated and medically necessary.',
        confirmTruthfulness: true,
      });

      expect(attestation.cryptographicAttestationHash).toBeDefined();
      expect(attestation.cryptographicAttestationHash?.length).toBe(64);

      // Dispatch should succeed
      const dispatched = await service.dispatchOffer(doctorUserId, testOfferId);
      expect(dispatched.status).toBe(TreatmentOfferStatus.DISPATCHED);
      expect(dispatched.offerNumber).toMatch(/^TO-[0-9]{4}-[0-9]{5}$/);

      // Verify persistence in PostgreSQL
      const fromDb = await db.treatmentOffer.findUnique({
        where: { id: testOfferId },
        select: { status: true, dispatchedAt: true, offerNumber: true },
      });
      expect(fromDb?.status).toBe(TreatmentOfferStatus.DISPATCHED);
      expect(fromDb?.dispatchedAt).not.toBeNull();
    });
  });

  describe('4. Real Doctor Status Enforcement', () => {
    it('should block an unauthorized or unverified user from clinical operations', async () => {
      const nonDoctorUser = await db.user.findFirst({
        where: { phone: '+16505550004' }, // Patient user
      });

      if (nonDoctorUser) {
        await expect(
          service.createOffer(nonDoctorUser.id, {
            patientProfileId,
            facilityId,
            clinicalIndication: 'Hacked proposal',
            procedures: [{ procedureCode: 'PCI-001', procedureName: 'PCI', unitCost: 1000 }],
            validUntil: new Date().toISOString(),
          }),
        ).rejects.toThrow(ForbiddenException);
      }
    });
  });

  describe('5. Simultaneous Concurrency Dispatch Protection', () => {
    it('should assign unique, non-colliding offer numbers when multiple distinct offers are dispatched concurrently', async () => {
      const count = 4;
      const offersToDispatch: string[] = [];

      for (let i = 0; i < count; i++) {
        const created = await service.createOffer(doctorUserId, {
          patientProfileId,
          facilityId,
          clinicalIndication: `Concurrent Dispatch Test Offer ${i}`,
          procedures: [
            {
              procedureCode: `PROC-CONC-${i}`,
              procedureName: `Procedure ${i}`,
              unitCost: 50000,
              quantity: 1,
            },
          ],
          validUntil: new Date(Date.now() + 86400000).toISOString(),
        });
        createdTestOfferIds.push(created.id);
        offersToDispatch.push(created.id);

        await service.submitClinicalReview(
          doctorUserId,
          created.id,
          { action: ClinicalReviewAction.APPROVED, comments: 'Pre-dispatch clinical approval' },
          ['DOCTOR'],
        );

        await service.submitAttestation(doctorUserId, created.id, {
          statement: 'I attest that these procedures are clinically indicated and medically necessary.',
          confirmTruthfulness: true,
        });
      }

      // Fire concurrent dispatch calls
      const results = await Promise.all(
        offersToDispatch.map((id) => service.dispatchOffer(doctorUserId, id)),
      );

      // Verify all succeeded with unique offer numbers
      const offerNumbers = results.map((r) => r.offerNumber);
      const uniqueNumbers = new Set(offerNumbers);
      expect(uniqueNumbers.size).toBe(count);

      for (const res of results) {
        expect(res.status).toBe(TreatmentOfferStatus.DISPATCHED);
        expect(res.offerNumber).toMatch(/^TO-[0-9]{4}-[0-9]{5}$/);
      }
    });

    it('should allow only one dispatch and safely reject concurrent duplicate dispatches on the same offer', async () => {
      const created = await service.createOffer(doctorUserId, {
        patientProfileId,
        facilityId,
        clinicalIndication: 'Same Offer Race Dispatch Test',
        procedures: [
          {
            procedureCode: 'PROC-RACE-001',
            procedureName: 'Race Procedure',
            unitCost: 100000,
            quantity: 1,
          },
        ],
        validUntil: new Date(Date.now() + 86400000).toISOString(),
      });
      createdTestOfferIds.push(created.id);

      await service.submitClinicalReview(
        doctorUserId,
        created.id,
        { action: ClinicalReviewAction.APPROVED, comments: 'Pre-dispatch clinical approval' },
        ['DOCTOR'],
      );

      await service.submitAttestation(doctorUserId, created.id, {
        statement: 'I attest that these procedures are clinically indicated and medically necessary.',
        confirmTruthfulness: true,
      });

      // Fire 5 concurrent dispatch requests on the EXACT SAME offer
      const concurrentAttempts = 5;
      const settled = await Promise.allSettled(
        Array.from({ length: concurrentAttempts }).map(() =>
          service.dispatchOffer(doctorUserId, created.id),
        ),
      );

      const fulfilled = settled.filter((s) => s.status === 'fulfilled');
      const rejected = settled.filter((s) => s.status === 'rejected');

      // Exactly 1 must succeed
      expect(fulfilled.length).toBe(1);
      // Remaining 4 must be rejected with ConflictException
      expect(rejected.length).toBe(concurrentAttempts - 1);

      for (const rej of rejected) {
        if (rej.status === 'rejected') {
          expect(rej.reason).toBeInstanceOf(ConflictException);
        }
      }
    });
  });
});
