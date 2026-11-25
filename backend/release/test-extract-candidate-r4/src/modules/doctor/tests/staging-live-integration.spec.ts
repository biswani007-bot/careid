import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';

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
import { CathLabModule } from '@modules/cath-lab/cath-lab.module';
import { HealthModule } from '@core/health/health.module';

describe('CareID Staging Real HTTP & PostgreSQL Integration Suite', () => {
  let app: INestApplication;
  let db: DatabaseService;
  let jwtService: JwtService;
  let baseUrl: string;

  let patientUserId: string;
  let patientProfileId: string;
  let doctorUserId: string;
  let doctorProfileId: string;
  let facilityId: string;
  let otherPatientProfileId: string;

  let patientToken: string;
  let doctorToken: string;
  let adminToken: string;
  let otherPatientToken: string;

  let testPrescriptionId: string;
  let testAppointmentId: string;
  let testEncounterId: string;
  let testHoldId: string;

  beforeAll(async () => {
    // Force DATABASE_URL to 360api_staging
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
        CathLabModule,
        HealthModule,
      ],
    }).compile();

    const configService = moduleRef.get<ConfigService>(ConfigService);
    const jwtSecret = configService.get<string>('JWT_SECRET') || 'careid-staging-jwt-secret-key-32-chars-min!!';
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

    // Retrieve seeded patient and doctor from 360api_staging
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

    // Find or create secondary patient to test cross-patient access control
    let otherUser = await db.user.findFirst({
      where: { phone: '+16505559999' },
      include: { patientProfile: true },
    });
    if (!otherUser) {
      otherUser = await db.user.create({
        data: {
          phone: '+16505559999',
          email: 'other.patient@careid.test',
          patientProfile: {
            create: {
              patientNumber: 'PT-OTHER-9999',
            },
          },
        },
        include: { patientProfile: true },
      });
    }
    otherPatientProfileId = otherUser.patientProfile!.id;

    patientToken = jwtService.sign({ sub: patientUserId, userId: patientUserId, roles: ['PATIENT'] });
    doctorToken = jwtService.sign({ sub: doctorUserId, userId: doctorUserId, roles: ['DOCTOR'] });
    adminToken = jwtService.sign({ sub: adminUser!.id, userId: adminUser!.id, roles: ['ADMIN'] });
    otherPatientToken = jwtService.sign({ sub: otherUser.id, userId: otherUser.id, roles: ['PATIENT'] });

    // Seed test prescription under patient in 360api_staging
    const rx = await db.medicalReport.create({
      data: {
        patientProfileId,
        title: 'Cardiac Hypertension Regimen',
        category: 'PRESCRIPTION',
        prescribedBy: 'Dr. Sarah Jenkins, MD',
        doctorName: 'Dr. Sarah Jenkins, MD',
        facilityName: 'Metro General Hospital',
        verifiedBy: doctorUserId,
        verificationStatus: 'VERIFIED',
        notes: 'Take 1 tablet daily with food.\n[JSON_MEDICATIONS]:[{"name":"Amlodipine","dosage":"5mg","frequency":"Daily","duration":"30 days"}]',
      },
    });
    testPrescriptionId = rx.id;

    // Seed test appointment
    const appt = await db.appointment.create({
      data: {
        patientProfileId,
        doctorProfileId,
        facilityId,
        appointmentNumber: `APT-STAGING-${Date.now().toString().slice(-6)}`,
        appointmentDate: new Date(),
        startTime: '10:00',
        endTime: '11:00',
        status: 'CONFIRMED',
        type: 'IN_PERSON',
      },
    });
    testAppointmentId = appt.id;

    // Seed test medical record & encounter
    const medRecord = await db.medicalRecord.create({
      data: {
        patientProfileId,
        title: 'Cardiac Evaluation Record',
        chiefComplaint: 'Chest tightness',
        clinicalNotes: 'Initial evaluation',
        status: 'FINAL',
      },
    });

    const enc = await db.medicalEncounter.create({
      data: {
        medicalRecordId: medRecord.id,
        encounterDate: new Date(),
        encounterType: 'PROCEDURE',
        facilityName: 'Metro General Hospital',
      },
    });
    testEncounterId = enc.id;
  }, 60000);

  afterAll(async () => {
    if (app) await app.close();
  });

  // ─── 1. Health Endpoint ─────────────────────────────────────────────────────

  describe('1. Health Endpoint (GET /api/v1/health)', () => {
    it('should return 200 OK with service status', async () => {
      const res = await fetch(`${baseUrl}/health`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe('ok');
    });
  });

  // ─── 2. Prescription Refill (D01) ───────────────────────────────────────────

  describe('2. Prescription Refill: Real HTTP -> PostgreSQL Transaction (D01)', () => {
    it('should POST /prescriptions/:id/refill and persist refill in PostgreSQL', async () => {
      const res = await fetch(`${baseUrl}/prescriptions/${testPrescriptionId}/refill`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${patientToken}`,
        },
        body: JSON.stringify({ quantity: 1, notes: 'Patient requested refill' }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.refills).toHaveLength(1);
      expect(data.refills[0].refillNumber).toBe(1);

      // Verify independently in real PostgreSQL
      const pgRx = await db.medicalReport.findUnique({ where: { id: testPrescriptionId } });
      expect(pgRx!.notes).toContain('[JSON_REFILLS]:');
    });

    it('should reject rapid duplicate refill within 30 seconds with 409 Conflict', async () => {
      const res = await fetch(`${baseUrl}/prescriptions/${testPrescriptionId}/refill`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${patientToken}`,
        },
        body: JSON.stringify({ quantity: 1, notes: 'Duplicate refill click' }),
      });

      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.message).toContain('Duplicate refill request detected');
    });

    it('should reject cross-patient refill attempt with 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/prescriptions/${testPrescriptionId}/refill`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${otherPatientToken}`,
        },
        body: JSON.stringify({ quantity: 1 }),
      });

      expect(res.status).toBe(403);
    });
  });

  // ─── 3. Prescription Export (D02) ───────────────────────────────────────────

  describe('3. Prescription Export: Real JSON Contract & PDF Stream (D02)', () => {
    it('should GET /prescriptions/:id/export returning structured JSON contract by default', async () => {
      const res = await fetch(`${baseUrl}/prescriptions/${testPrescriptionId}/export`, {
        headers: { Authorization: `Bearer ${patientToken}` },
      });

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('application/json');
      const body = await res.json();
      expect(body.prescriptionId).toBe(testPrescriptionId);
      expect(body.rxNumber).toMatch(/^RX-/);
      expect(body.medications).toHaveLength(1);
    });

    it('should GET /prescriptions/:id/export?format=PDF returning valid standard PDF binary', async () => {
      const res = await fetch(`${baseUrl}/prescriptions/${testPrescriptionId}/export?format=PDF`, {
        headers: { Authorization: `Bearer ${patientToken}` },
      });

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('application/pdf');
      expect(res.headers.get('content-disposition')).toContain('attachment; filename="prescription-');

      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      expect(buffer.subarray(0, 8).toString('latin1')).toBe('%PDF-1.4');
      expect(buffer.toString('latin1')).toContain('CAREID CLINICAL PRESCRIPTION');
      expect(buffer.toString('latin1')).toContain('%%EOF');
    });
  });

  // ─── 4. Unified Clinical PDF Export (Phase 5) ───────────────────────────────

  describe('4. Unified Clinical Export: Real HTTP -> PDF Stream & Authorization (Phase 5)', () => {
    it('should GET /doctors/patients/:id/medical-records/export?format=PDF returning multi-section PDF', async () => {
      const res = await fetch(`${baseUrl}/doctors/patients/${patientProfileId}/medical-records/export?format=PDF`, {
        headers: { Authorization: `Bearer ${doctorToken}` },
      });

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('application/pdf');
      expect(res.headers.get('content-disposition')).toContain('attachment; filename="careid-clinical-record-');

      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      expect(buffer.subarray(0, 8).toString('latin1')).toBe('%PDF-1.4');
      expect(buffer.toString('latin1')).toContain('CAREID UNIFIED PATIENT CLINICAL RECORD');
      expect(buffer.toString('latin1')).toContain('PATIENT DEMOGRAPHICS');
    });

    it('should reject unauthorized doctor without clinical relationship with 403 Forbidden', async () => {
      // Doctor attempting to export otherPatientProfileId with no clinical affiliation
      const res = await fetch(`${baseUrl}/doctors/patients/${otherPatientProfileId}/medical-records/export?format=PDF`, {
        headers: { Authorization: `Bearer ${doctorToken}` },
      });

      expect(res.status).toBe(403);
    });
  });

  // ─── 5. Cath Lab Workflows (M01–M05) ────────────────────────────────────────

  describe('5. Cath Lab Workflows (M01–M05)', () => {
    it('M01: should ratify surgical safety time-out with SHA-256 hash', async () => {
      const payload = {
        appointmentId: testAppointmentId,
        gates: {
          patientIdentityConfirmed: true,
          procedureConfirmed: true,
          accessSiteConfirmed: true,
          consentAndAnticoagulationVerified: true,
          equipmentAndEmergencyPrepared: true,
          radiationAndShieldingVerified: true,
        },
        notes: 'Pre-procedure verification complete',
      };

      const res = await fetch(`${baseUrl}/cath-lab/safety-timeout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${doctorToken}`,
        },
        body: JSON.stringify(payload),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.status).toBe('RATIFIED');
      expect(body.integrityHash).toBeDefined();
      expect(body.integrityHash).toHaveLength(64);
    });

    it('M02: should declare and clear emergency procedural safety hold', async () => {
      // 1. Declare Hold
      const declareRes = await fetch(`${baseUrl}/cath-lab/safety-hold`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${doctorToken}`,
        },
        body: JSON.stringify({
          appointmentId: testAppointmentId,
          holdCategory: 'PATIENT_HEMODYNAMIC_INSTABILITY',
          reason: 'Transient profound hypotension post contrast',
        }),
      });

      expect(declareRes.status).toBe(201);
      const declareBody = await declareRes.json();
      expect(declareBody.status).toBe('ACTIVE');
      testHoldId = declareBody.holdId;

      // 2. Clear Hold
      const clearRes = await fetch(`${baseUrl}/cath-lab/safety-hold/${testHoldId}/clear`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${doctorToken}`,
        },
        body: JSON.stringify({
          resolutionNotes: 'Pressure restored with fluid bolus and vasopressor',
        }),
      });

      expect(clearRes.status).toBe(200);
      const clearBody = await clearRes.json();
      expect(clearBody.status).toBe('RESOLVED');
      expect(clearBody.resolvedAt).toBeDefined();
    });

    it('M03: should log procedural fluoroscopy and retrieve cumulative live telemetry', async () => {
      // Log telemetry
      const logRes = await fetch(`${baseUrl}/cath-lab/telemetry/log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${doctorToken}`,
        },
        body: JSON.stringify({
          appointmentId: testAppointmentId,
          fluoroscopyDurationSeconds: 120,
          doseAreaProductDap: 45000,
          contrastVolumeMl: 65,
          systolicBp: 125,
          diastolicBp: 80,
          heartRate: 72,
          oxygenSaturation: 98,
          actSeconds: 275,
        }),
      });

      expect(logRes.status).toBe(201);

      // Query live telemetry
      const liveRes = await fetch(`${baseUrl}/cath-lab/telemetry/live?appointmentId=${testAppointmentId}`, {
        headers: { Authorization: `Bearer ${doctorToken}` },
      });

      expect(liveRes.status).toBe(200);
      const liveBody = await liveRes.json();
      expect(liveBody.totals.totalFluoroscopyDurationSeconds).toBeGreaterThanOrEqual(120);
      expect(liveBody.totals.totalContrastVolumeMl).toBeGreaterThanOrEqual(65);
    });

    it('M04: should document coronary vessel findings and QCA metrics', async () => {
      const findingsPayload = {
        coronaryDominance: 'RIGHT',
        lvefPercentage: 55,
        hemostasisMethod: 'ANGIO_SEAL',
        findings: [
          {
            vessel: 'LAD',
            segment: 'PROXIMAL',
            stenosisPercentage: 85,
            timiFlowPre: 'TIMI_1',
            timiFlowPost: 'TIMI_3',
            interventionPerformed: true,
            procedureType: 'STENT_PLACEMENT',
            cptCode: '92928',
            stentDetails: '3.5 x 24 mm DES',
          },
        ],
      };

      const res = await fetch(`${baseUrl}/cath-lab/encounters/${testEncounterId}/vessel-findings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${doctorToken}`,
        },
        body: JSON.stringify(findingsPayload),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.findings).toHaveLength(1);
      expect(body.findings[0].vessel).toBe('LAD');
      expect(body.findings[0].cptCode).toBe('92928');
    });

    it('M05: should return BLOCKED_BY_EXTERNAL_DEPENDENCY for unconfigured PACS streaming', async () => {
      const res = await fetch(`${baseUrl}/cath-lab/dicom-series/test-series-uid/frames/1`, {
        headers: { Authorization: `Bearer ${doctorToken}` },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe('BLOCKED_BY_EXTERNAL_DEPENDENCY');
      expect(body.message).toContain('Direct PACS/DICOMweb frame streaming requires an active PACS archive');
    });
  });
});
