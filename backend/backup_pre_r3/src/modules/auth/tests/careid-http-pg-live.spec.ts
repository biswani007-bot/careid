import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule as PinoLoggerModule, Logger } from 'nestjs-pino';
import * as path from 'path';
import * as fs from 'fs';

import { DatabaseModule } from '@database/database.module';
import { DatabaseService } from '@database/database.service';

import { PatientModule } from '@modules/patient/patient.module';
import { DoctorModule } from '@modules/doctor/doctor.module';
import { SecurityModule } from '@modules/security/security.module';
import { AppointmentModule } from '@modules/appointment/appointment.module';
import { MedicalRecordModule } from '@modules/medical-record/medical-record.module';
import { InsuranceModule } from '@modules/insurance/insurance.module';
import { AuthModule } from '@modules/auth/auth.module';
import { StorageModule } from '@modules/storage/storage.module';

describe('CareID Phase 2: Live HTTP-to-PostgreSQL Real Integration Suite', () => {
  let app: INestApplication;
  let db: DatabaseService;
  let jwtService: JwtService;
  let baseUrl: string;

  let patientUserId: string;
  let patientProfileId: string;
  let doctorUserId: string;
  let doctorProfileId: string;
  let facilityId: string;

  let patientToken: string;
  let doctorToken: string;
  let adminToken: string;

  // Track created records for guaranteed cleanup
  const createdRecordIds: string[] = [];
  const createdConsentIds: string[] = [];
  const createdAppointmentIds: string[] = [];
  const createdVitalIds: string[] = [];
  const createdAttachmentIds: string[] = [];

  beforeAll(async () => {
    process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/360api_staging?schema=public';
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PinoLoggerModule.forRoot({
          pinoHttp: { level: 'silent' },
        }),
        DatabaseModule,
        AuthModule,
        PatientModule,
        DoctorModule,
        SecurityModule,
        AppointmentModule,
        MedicalRecordModule,
        InsuranceModule,
        StorageModule,
      ],
    })
      .compile();

    const configService = moduleRef.get<ConfigService>(ConfigService);
    const jwtSecret = configService.get<string>('JWT_SECRET') || 'super_secret_hvapi_jwt_key_2026_change_in_production';
    jwtService = new JwtService({ secret: jwtSecret });

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

    await app.listen(0);
    const server = app.getHttpServer();
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}/api/v1`;

    db = moduleRef.get<DatabaseService>(DatabaseService);

    // Retrieve seed users from real PostgreSQL
    const patientUser = await db.user.findFirst({
      where: { phone: '+16505550004' },
      include: { patientProfile: true },
    });
    const doctorUser = await db.user.findFirst({
      where: { phone: '+16505550003' },
      include: { doctorProfile: true },
    });
    const adminUser = await db.user.findFirst({
      where: { phone: '+16505550002' },
    });
    const facility = await db.facility.findFirst();

    patientUserId = patientUser!.id;
    patientProfileId = patientUser!.patientProfile!.id;
    doctorUserId = doctorUser!.id;
    doctorProfileId = doctorUser!.doctorProfile!.id;
    facilityId = facility!.id;

    patientToken = jwtService.sign({ sub: patientUserId, userId: patientUserId, roles: ['PATIENT'] });
    doctorToken = jwtService.sign({ sub: doctorUserId, userId: doctorUserId, roles: ['DOCTOR'] });
    adminToken = jwtService.sign({ sub: adminUser!.id, userId: adminUser!.id, roles: ['ADMIN'] });
  });

  afterAll(async () => {
    // Guaranteed cleanup of test records in PostgreSQL
    for (const id of createdVitalIds) {
      await db.vitalSigns.delete({ where: { id } }).catch(() => {});
    }
    for (const id of createdAttachmentIds) {
      await db.medicalAttachment.delete({ where: { id } }).catch(() => {});
    }
    for (const id of createdRecordIds) {
      await db.medicalRecord.delete({ where: { id } }).catch(() => {});
    }
    for (const id of createdConsentIds) {
      await db.securityConsentRecord.delete({ where: { id } }).catch(() => {});
    }
    for (const id of createdAppointmentIds) {
      await db.appointment.delete({ where: { id } }).catch(() => {});
    }

    if (app) await app.close();
  });

  describe('1. Security Consents: Real HTTP Request -> Real PostgreSQL Persistence', () => {
    let httpConsentId: string;

    it('should POST /security/consents with JWT and persist to PostgreSQL', async () => {
      const payload = {
        patientId: patientProfileId,
        consentType: 'TREATMENT',
        purpose: 'Real HTTP-to-PostgreSQL integration test',
        accessScope: 'ALL',
      };

      const res = await fetch(`${baseUrl}/security/consents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${patientToken}`,
        },
        body: JSON.stringify(payload),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.id).toBeDefined();
      expect(body.status).toBe('GRANTED');
      httpConsentId = body.id;
      createdConsentIds.push(httpConsentId);

      // Verify independently in real PostgreSQL via DatabaseService
      const pgRecord = await db.securityConsentRecord.findUnique({ where: { id: httpConsentId } });
      expect(pgRecord).toBeDefined();
      expect(pgRecord?.status).toBe('GRANTED');
      expect(pgRecord?.patientId).toBe(patientProfileId);
      expect(pgRecord?.purpose).toBe('Real HTTP-to-PostgreSQL integration test');
    });

    it('should reject unauthenticated POST /security/consents with 401', async () => {
      const res = await fetch(`${baseUrl}/security/consents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: patientProfileId }),
      });
      expect(res.status).toBe(401);
    });

    it('should reject cross-patient POST /security/consents with 403', async () => {
      const foreignId = '99999999-9999-9999-9999-999999999999';
      const res = await fetch(`${baseUrl}/security/consents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${patientToken}`,
        },
        body: JSON.stringify({
          patientId: foreignId,
          consentType: 'TREATMENT',
          purpose: 'Cross-patient attack',
        }),
      });
      expect(res.status).toBe(403);
    });

    it('should POST /security/consents/:id/withdraw and update PostgreSQL status to WITHDRAWN', async () => {
      const res = await fetch(`${baseUrl}/security/consents/${httpConsentId}/withdraw`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${patientToken}`,
        },
      });
      expect(res.status).toBe(200);

      // Query real PostgreSQL independently
      const updated = await db.securityConsentRecord.findUnique({ where: { id: httpConsentId } });
      expect(updated?.status).toBe('WITHDRAWN');
      expect(updated?.withdrawnAt).toBeDefined();
    });
  });

  describe('2. Patient Profile: Real HTTP Request -> Real PostgreSQL Persistence', () => {
    it('should GET /patients/me with JWT and retrieve live profile from PostgreSQL', async () => {
      const res = await fetch(`${baseUrl}/patients/me`, {
        headers: { Authorization: `Bearer ${patientToken}` },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.id).toBe(patientProfileId);
      expect(body.firstName).toBe('John');
      expect(body.lastName).toBe('Doe');
    });

    it('should PUT /patients/me and persist updated demographics in PostgreSQL', async () => {
      const updatePayload = {
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        gender: 'Male',
        bloodGroup: 'O+',
        address: '123 Verified Health Ave',
      };

      const res = await fetch(`${baseUrl}/patients/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${patientToken}`,
        },
        body: JSON.stringify(updatePayload),
      });

      expect(res.status).toBe(200);

      // Verify independently in real PostgreSQL
      const pgProfile = await db.patientProfile.findUnique({ where: { id: patientProfileId } });
      expect(pgProfile?.bloodGroup).toBe('O+');
      expect(pgProfile?.address).toBe('123 Verified Health Ave');
    });
  });

  describe('3. Doctor Directory & Profile: Real HTTP Request -> Real PostgreSQL Query', () => {
    it('should GET /doctors/me and return live doctor profile from PostgreSQL', async () => {
      const res = await fetch(`${baseUrl}/doctors/me`, {
        headers: { Authorization: `Bearer ${doctorToken}` },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.id).toBe(doctorProfileId);
      expect(body.licenseNumber).toBeDefined();
    });

    it('should reject non-doctor accessing /doctors/me with 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/doctors/me`, {
        headers: { Authorization: `Bearer ${patientToken}` },
      });
      expect(res.status).toBe(403);
    });
  });

  describe('4. Medical Records: Real HTTP Request -> Real PostgreSQL Persistence', () => {
    let httpRecordId: string;

    it('should POST /medical-records with JWT and persist into PostgreSQL', async () => {
      const payload = {
        title: 'HTTP-to-PostgreSQL Comprehensive Consultation',
        chiefComplaint: 'Verified HTTP-to-Database persistence pipeline',
        clinicalNotes: 'Documented relational persistence in PostgreSQL 16',
      };

      const res = await fetch(`${baseUrl}/medical-records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${patientToken}`,
        },
        body: JSON.stringify(payload),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.id).toBeDefined();
      expect(body.title).toBe('HTTP-to-PostgreSQL Comprehensive Consultation');
      httpRecordId = body.id;
      createdRecordIds.push(httpRecordId);

      // Verify independently in real PostgreSQL
      const pgRecord = await db.medicalRecord.findUnique({ where: { id: httpRecordId } });
      expect(pgRecord).toBeDefined();
      expect(pgRecord?.title).toBe('HTTP-to-PostgreSQL Comprehensive Consultation');
      expect(pgRecord?.patientProfileId).toBe(patientProfileId);
    });

    it('should GET /medical-records and retrieve persisted record across requests', async () => {
      const res = await fetch(`${baseUrl}/medical-records`, {
        headers: { Authorization: `Bearer ${patientToken}` },
      });
      expect(res.status).toBe(200);
      const records = await res.json();
      expect(Array.isArray(records)).toBe(true);
      const found = records.find((r: any) => r.id === httpRecordId);
      expect(found).toBeDefined();
    });
  });

  describe('5. Appointments: Real HTTP Request -> Real PostgreSQL Scheduling', () => {
    let httpAppointmentId: string;

    it('should POST /appointments and persist scheduled appointment in PostgreSQL', async () => {
      const payload = {
        patientProfileId,
        doctorProfileId,
        facilityId,
        appointmentDate: new Date(Date.now() + 86400000).toISOString(),
        startTime: '10:00',
        endTime: '10:30',
        type: 'IN_PERSON',
        reason: 'HTTP-to-PostgreSQL Appointment Test',
      };

      const res = await fetch(`${baseUrl}/appointments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${patientToken}`,
        },
        body: JSON.stringify(payload),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.id).toBeDefined();
      expect(body.status).toBe('SCHEDULED');
      httpAppointmentId = body.id;
      createdAppointmentIds.push(httpAppointmentId);

      // Verify independently in real PostgreSQL
      const pgAppt = await db.appointment.findUnique({ where: { id: httpAppointmentId } });
      expect(pgAppt).toBeDefined();
      expect(pgAppt?.status).toBe('SCHEDULED');
      expect(pgAppt?.patientProfileId).toBe(patientProfileId);
      expect(pgAppt?.doctorProfileId).toBe(doctorProfileId);
    });

    it('should PUT /appointments/:id/cancel and update PostgreSQL status', async () => {
      const cancelPayload = {
        cancellationReason: 'Patient requested cancellation',
      };

      const res = await fetch(`${baseUrl}/appointments/${httpAppointmentId}/cancel`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${patientToken}`,
        },
        body: JSON.stringify(cancelPayload),
      });

      expect(res.status).toBe(200);

      // Verify independently in real PostgreSQL
      const pgAppt = await db.appointment.findUnique({ where: { id: httpAppointmentId } });
      expect(pgAppt?.status).toBe('CANCELLED');
    });
  });
});
