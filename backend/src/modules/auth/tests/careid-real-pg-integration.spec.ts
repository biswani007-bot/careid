import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import { DatabaseModule } from '@database/database.module';
import { DatabaseService } from '@database/database.service';

describe('CareID Real PostgreSQL Database Integration Suite', () => {
  jest.setTimeout(30000);
  let app: INestApplication;
  let db: DatabaseService;
  let jwtService: JwtService;

  let patientUserId: string;
  let patientProfileId: string;
  let doctorUserId: string;
  let doctorProfileId: string;
  let facilityId: string;

  beforeAll(async () => {
    jwtService = new JwtService({ secret: 'hvapi_default_secret_key' });

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

    // Retrieve verified seeded entities from real PostgreSQL
    const patientUser = await db.user.findFirst({
      where: { phone: '+16505550004' },
      include: { patientProfile: true },
    });
    const doctorUser = await db.user.findFirst({
      where: { phone: '+16505550003' },
      include: { doctorProfile: true },
    });
    const facility = await db.facility.findFirst();

    patientUserId = patientUser!.id;
    patientProfileId = patientUser!.patientProfile!.id;
    doctorUserId = doctorUser!.id;
    doctorProfileId = doctorUser!.doctorProfile!.id;
    facilityId = facility!.id;
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  describe('1. Patient Profile & Demographics (Real SQL CRUD)', () => {
    it('should read existing patient profile directly from PostgreSQL', async () => {
      const profile = await db.patientProfile.findUnique({
        where: { id: patientProfileId },
        include: { user: true },
      });
      expect(profile).toBeDefined();
      expect(profile?.userId).toBe(patientUserId);
      expect(profile?.firstName).toBe('John');
      expect(profile?.lastName).toBe('Doe');
    });

    it('should update and query patient demographics with real persistence', async () => {
      const updated = await db.patientProfile.update({
        where: { id: patientProfileId },
        data: { bloodGroup: 'O_POSITIVE' },
      });
      expect(updated.bloodGroup).toBe('O_POSITIVE');

      const queried = await db.patientProfile.findUnique({ where: { id: patientProfileId } });
      expect(queried?.bloodGroup).toBe('O_POSITIVE');
    });
  });

  describe('2. Doctor Profile & Affiliation (Real SQL CRUD)', () => {
    it('should read existing doctor profile directly from PostgreSQL', async () => {
      const doc = await db.doctorProfile.findUnique({
        where: { id: doctorProfileId },
        include: { user: true },
      });
      expect(doc).toBeDefined();
      expect(doc?.userId).toBe(doctorUserId);
      expect(doc?.licenseNumber).toBeDefined();
    });
  });

  describe('3. Medical Records & Vital Signs (Relational Constraints & Foreign Keys)', () => {
    let createdRecordId: string;
    let createdVitalId: string;

    it('should create medical record with foreign key to patientProfile and persist', async () => {
      const record = await db.medicalRecord.create({
        data: {
          patientProfileId,
          title: 'PostgreSQL Real Integration Checkup',
          chiefComplaint: 'Routine database integration test',
          clinicalNotes: 'Verified relational persistence in PostgreSQL 16',
        },
      });
      expect(record.id).toBeDefined();
      createdRecordId = record.id;

      const fetched = await db.medicalRecord.findUnique({ where: { id: createdRecordId } });
      expect(fetched?.title).toBe('PostgreSQL Real Integration Checkup');
    });

    it('should reject medical record creation with non-existent patientProfileId (FK Constraint)', async () => {
      await expect(
        db.medicalRecord.create({
          data: {
            patientProfileId: '00000000-0000-0000-0000-000000000000',
            title: 'Foreign Key Failure Test',
          },
        }),
      ).rejects.toThrow();
    });

    it('should record vital signs linked to medical record and persist in PostgreSQL', async () => {
      const vital = await db.vitalSigns.create({
        data: {
          medicalRecord: {
            connect: { id: createdRecordId },
          },
          systolicBp: 120,
          diastolicBp: 80,
          pulseBpm: 72,
          weightKg: 70,
          heightCm: 175,
          bmi: 22.86,
          recordedAt: new Date(),
        },
      });
      expect(vital.id).toBeDefined();
      expect(vital.medicalRecordId).toBe(createdRecordId);
      createdVitalId = vital.id;
    });

    afterAll(async () => {
      if (createdVitalId) await db.vitalSigns.delete({ where: { id: createdVitalId } }).catch(() => {});
      if (createdRecordId) await db.medicalRecord.delete({ where: { id: createdRecordId } }).catch(() => {});
    });
  });

  describe('4. Security Consents (Status Lifecycle & DB State)', () => {
    let consentId: string;

    it('should insert security consent record with GRANTED status', async () => {
      const consent = await db.securityConsentRecord.create({
        data: {
          patientId: patientProfileId,
          consentType: 'TREATMENT',
          status: 'GRANTED',
          purpose: 'Real PostgreSQL integration testing',
          grantedAt: new Date(),
          capturedBy: patientUserId,
        },
      });
      expect(consent.id).toBeDefined();
      expect(consent.status).toBe('GRANTED');
      consentId = consent.id;
    });

    it('should transition consent record to WITHDRAWN status in PostgreSQL', async () => {
      const updated = await db.securityConsentRecord.update({
        where: { id: consentId },
        data: { status: 'WITHDRAWN' },
      });
      expect(updated.status).toBe('WITHDRAWN');
    });

    afterAll(async () => {
      if (consentId) await db.securityConsentRecord.delete({ where: { id: consentId } }).catch(() => {});
    });
  });

  describe('5. Appointments (Doctor-Patient Scheduling Relation)', () => {
    let appointmentId: string;

    it('should create scheduled appointment linking doctor, patient, and facility in PostgreSQL', async () => {
      const apptDate = new Date();
      const apptNumber = 'APT-PGTEST-' + Date.now();

      const appt = await db.appointment.create({
        data: {
          appointmentNumber: apptNumber,
          patientProfileId,
          doctorProfileId,
          facilityId,
          appointmentDate: apptDate,
          startTime: '09:00',
          endTime: '09:30',
          durationMinutes: 30,
          status: 'SCHEDULED',
          type: 'IN_PERSON',
          reason: 'PostgreSQL Real Relational Appointment Test',
        },
      });
      expect(appt.id).toBeDefined();
      expect(appt.status).toBe('SCHEDULED');
      appointmentId = appt.id;

      // Verify relational retrieval
      const queried = await db.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          patientProfile: true,
          doctorProfile: true,
          facility: true,
        },
      });
      expect(queried?.patientProfile?.id).toBe(patientProfileId);
      expect(queried?.doctorProfile?.id).toBe(doctorProfileId);
      expect(queried?.facility?.id).toBe(facilityId);
    });

    it('should update appointment status to CANCELLED with real persistence', async () => {
      const cancelled = await db.appointment.update({
        where: { id: appointmentId },
        data: { status: 'CANCELLED' },
      });
      expect(cancelled.status).toBe('CANCELLED');
    });

    afterAll(async () => {
      if (appointmentId) await db.appointment.delete({ where: { id: appointmentId } }).catch(() => {});
    });
  });

  describe('6. Transaction Rollback & Integrity Guarantee', () => {
    it('should completely roll back database write on transaction error', async () => {
      const testTitle = 'Rollback Probe ' + Date.now();

      await expect(
        db.$transaction(async (tx) => {
          await tx.medicalRecord.create({
            data: {
              patientProfileId,
              title: testTitle,
            },
          });
          // Intentionally throw inside transaction
          throw new Error('Simulated atomic transaction failure');
        }),
      ).rejects.toThrow('Simulated atomic transaction failure');

      // Verify record was rolled back and does NOT exist in PostgreSQL
      const found = await db.medicalRecord.findFirst({ where: { title: testTitle } });
      expect(found).toBeNull();
    });
  });
});
