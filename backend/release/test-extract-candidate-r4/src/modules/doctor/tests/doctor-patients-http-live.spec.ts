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

describe('Doctor Patients 7 Endpoints + PDF Export: Real Authenticated HTTP & Security Suite', () => {
  let app: INestApplication;
  let db: DatabaseService;
  let jwtService: JwtService;
  let baseUrl: string;

  let patientUserId: string;
  let patientProfileId: string;
  let doctorUserId: string;
  let doctorProfileId: string;
  let facilityId: string;
  let unassignedPatientProfileId: string;

  let doctorToken: string;
  let patientToken: string;
  let unassignedDoctorToken: string;

  beforeAll(async () => {
    process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/hvapi_db?schema=public';

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

    // Retrieve primary test patient & doctor
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

    // Retrieve or create unassigned patient (zero relationship to doctor)
    let unassignedUser = await db.user.findFirst({
      where: { phone: '+16505558888' },
      include: { patientProfile: true },
    });
    if (!unassignedUser) {
      unassignedUser = await db.user.create({
        data: {
          phone: '+16505558888',
          email: 'unassigned.patient@careid.test',
          patientProfile: {
            create: {
              patientNumber: 'PT-UNASSIGNED-8888',
            },
          },
        },
        include: { patientProfile: true },
      });
    }
    unassignedPatientProfileId = unassignedUser.patientProfile!.id;

    // Retrieve or create an unassigned doctor with no relationship to patientUser
    let unassignedDocUser = await db.user.findFirst({
      where: { phone: '+16505557777' },
      include: { doctorProfile: true },
    });
    if (!unassignedDocUser) {
      unassignedDocUser = await db.user.create({
        data: {
          phone: '+16505557777',
          email: 'unassigned.doctor@careid.test',
          doctorProfile: {
            create: {
              fullName: 'Dr. Unassigned Doctor, MD',
              primarySpecialization: 'General Practice',
              medicalCouncil: 'State Medical Board',
              registrationNumber: 'REG-UNASSIGNED-7777',
              licenseNumber: 'DOC-UNASSIGNED-7777',
              providerIdentifier: 'NPI-UNASSIGNED-7777',
              verificationStatus: 'VERIFIED',
            },
          },
        },
        include: { doctorProfile: true },
      });
    }

    // Ensure doctor is linked to facility
    const existingDocFac = await db.doctorFacility.findFirst({
      where: { doctorId: doctorProfileId, facilityId },
    });
    if (!existingDocFac) {
      await db.doctorFacility.create({
        data: {
          doctorId: doctorProfileId,
          facilityId,
          assignmentType: 'PRIMARY',
          privileges: ['ALL'],
          isActive: true,
        },
      });
    }

    // Ensure active appointment exists between doctor and patientUser to authorize clinical access
    const existingAppt = await db.appointment.findFirst({
      where: { doctorProfileId, patientProfileId },
    });
    if (!existingAppt) {
      await db.appointment.create({
        data: {
          patientProfileId,
          doctorProfileId,
          facilityId,
          appointmentNumber: `APT-HTTP-${Date.now().toString().slice(-6)}`,
          appointmentDate: new Date(),
          startTime: '09:00',
          endTime: '09:30',
          status: 'CONFIRMED',
          type: 'IN_PERSON',
        },
      });
    }

    // Ensure medical record exists with vital signs
    const existingRecord = await db.medicalRecord.findFirst({
      where: { patientProfileId },
      include: { vitalSigns: true },
    });
    let recId = existingRecord?.id;
    if (!existingRecord) {
      const rec = await db.medicalRecord.create({
        data: {
          patientProfileId,
          title: 'Live HTTP Clinical Record',
          chiefComplaint: 'Routine Cardiology Follow-up',
          clinicalNotes: 'Stable cardiac rhythm',
          status: 'FINAL',
          vitalSigns: {
            create: [
              {
                systolicBp: 120,
                diastolicBp: 80,
                pulseBpm: 72,
                respirationRate: 16,
                temperatureC: 37.0,
              },
            ],
          },
        },
      });
      recId = rec.id;
    } else if (existingRecord.vitalSigns.length === 0) {
      await db.vitalSigns.create({
        data: {
          medicalRecordId: existingRecord.id,
          systolicBp: 120,
          diastolicBp: 80,
          pulseBpm: 72,
          respirationRate: 16,
          temperatureC: 37.0,
        },
      });
    }

    // Ensure prescription exists
    const existingRx = await db.medicalReport.findFirst({
      where: { patientProfileId, category: 'PRESCRIPTION' },
    });
    if (!existingRx) {
      await db.medicalReport.create({
        data: {
          patientProfileId,
          title: 'Metoprolol Tartrate',
          category: 'PRESCRIPTION',
          prescribedBy: 'Dr. Sarah Jenkins',
          verificationStatus: 'VERIFIED',
          notes: 'Take 50mg twice daily with meals',
        },
      });
    }

    // Ensure hospital admission encounter exists
    const existingEnc = await db.medicalEncounter.findFirst({
      where: { medicalRecord: { patientProfileId }, encounterType: 'ADMISSION' },
    });
    if (!existingEnc) {
      await db.medicalEncounter.create({
        data: {
          medicalRecordId: recId!,
          encounterType: 'ADMISSION',
          encounterDate: new Date(),
          facilityName: 'Metro General Hospital',
          providerName: 'Dr. Sarah Jenkins',
        },
      });
    }

    doctorToken = jwtService.sign({ sub: doctorUserId, userId: doctorUserId, roles: ['DOCTOR'] });
    patientToken = jwtService.sign({ sub: patientUserId, userId: patientUserId, roles: ['PATIENT'] });
    unassignedDoctorToken = jwtService.sign({ sub: unassignedDocUser.id, userId: unassignedDocUser.id, roles: ['DOCTOR'] });
  }, 60000);

  afterAll(async () => {
    if (app) await app.close();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 1: THE SEVEN AUTHORIZED DOCTOR PATIENTS HTTP ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('1. Endpoint 1: GET /api/v1/doctors/patients', () => {
    it('should return 200 OK with paginated list of authorized patients for doctor', async () => {
      const res = await fetch(`${baseUrl}/doctors/patients`, {
        headers: { Authorization: `Bearer ${doctorToken}` },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toBeDefined();
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(1);
      const found = body.data.find((p: any) => p.id === patientProfileId);
      expect(found).toBeDefined();
      expect(found.firstName).toBeDefined();
    });
  });

  describe('2. Endpoint 2: GET /api/v1/doctors/patients/:patientProfileId', () => {
    it('should return 200 OK with complete patient demographics for authorized doctor', async () => {
      const res = await fetch(`${baseUrl}/doctors/patients/${patientProfileId}`, {
        headers: { Authorization: `Bearer ${doctorToken}` },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.id).toBe(patientProfileId);
      expect(body.patientNumber).toBeDefined();
      expect(body.firstName).toBeDefined();
      expect(body.lastName).toBeDefined();
    });
  });

  describe('3. Endpoint 3: GET /api/v1/doctors/patients/:patientProfileId/medical-records', () => {
    it('should return 200 OK with medical records and stripped storageKey', async () => {
      const res = await fetch(`${baseUrl}/doctors/patients/${patientProfileId}/medical-records`, {
        headers: { Authorization: `Bearer ${doctorToken}` },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toBeDefined();
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(1);
      const record = body.data[0];
      expect(record.id).toBeDefined();
      expect(record.title).toBeDefined();
      // Storage keys must not be leaked
      if (record.attachments && record.attachments.length > 0) {
        expect(record.attachments[0].storageKey).toBeFalsy();
      }
    });
  });

  describe('4. Endpoint 4: GET /api/v1/doctors/patients/:patientProfileId/medical-records/timeline', () => {
    it('should return 200 OK with chronological clinical timeline', async () => {
      const res = await fetch(`${baseUrl}/doctors/patients/${patientProfileId}/medical-records/timeline`, {
        headers: { Authorization: `Bearer ${doctorToken}` },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toBeDefined();
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.meta || body.pagination).toBeDefined();
    });
  });

  describe('5. Endpoint 5: GET /api/v1/doctors/patients/:patientProfileId/vitals', () => {
    it('should return 200 OK with recorded vital signs for patient', async () => {
      const res = await fetch(`${baseUrl}/doctors/patients/${patientProfileId}/vitals`, {
        headers: { Authorization: `Bearer ${doctorToken}` },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toBeDefined();
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(1);
      const vital = body.data[0];
      expect(vital.systolicBp || vital.systolicBloodPressure).toBeDefined();
      expect(vital.diastolicBp || vital.diastolicBloodPressure).toBeDefined();
    });
  });

  describe('6. Endpoint 6: GET /api/v1/doctors/patients/:patientProfileId/admissions', () => {
    it('should return 200 OK with hospital admission history', async () => {
      const res = await fetch(`${baseUrl}/doctors/patients/${patientProfileId}/admissions`, {
        headers: { Authorization: `Bearer ${doctorToken}` },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toBeDefined();
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(1);
      const admission = body.data[0];
      expect(admission.id).toBeDefined();
      expect(admission.admissionType || admission.encounterType).toBeDefined();
    });
  });

  describe('7. Endpoint 7: GET /api/v1/doctors/patients/:patientProfileId/prescriptions', () => {
    it('should return 200 OK with prescription records for patient', async () => {
      const res = await fetch(`${baseUrl}/doctors/patients/${patientProfileId}/prescriptions`, {
        headers: { Authorization: `Bearer ${doctorToken}` },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toBeDefined();
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(1);
      const rx = body.data[0];
      expect(rx.id).toBeDefined();
      expect(rx.medicationName || rx.title).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2: SEPARATE UNIFIED CLINICAL PDF EXPORT ENDPOINT VERIFICATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('8. Separate Verification: GET /api/v1/doctors/patients/:patientProfileId/medical-records/export?format=PDF', () => {
    it('should return 200 OK with valid PDF 1.4 binary stream and proper headers', async () => {
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
      expect(buffer.toString('latin1')).toContain('%%EOF');
    });

    it('should return 200 OK with structured JSON when format is JSON by default', async () => {
      const res = await fetch(`${baseUrl}/doctors/patients/${patientProfileId}/medical-records/export?format=JSON`, {
        headers: { Authorization: `Bearer ${doctorToken}` },
      });

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('application/json');
      const body = await res.json();
      expect(body.patient).toBeDefined();
      expect(body.clinician).toBeDefined();
      expect(body.medicalRecords).toBeDefined();
      expect(body.prescriptions).toBeDefined();
      expect(body.timeline).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 3: UNAUTHORIZED AND SECURITY BOUNDARY VERIFICATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('9. Unauthorized Access: Cross-Patient and Unassigned Doctor Access Control', () => {
    it('should reject unassigned doctor querying unassigned patient demographics with 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/doctors/patients/${unassignedPatientProfileId}`, {
        headers: { Authorization: `Bearer ${unassignedDoctorToken}` },
      });
      expect(res.status).toBe(403);
    });

    it('should reject unassigned doctor querying unassigned patient medical records with 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/doctors/patients/${unassignedPatientProfileId}/medical-records`, {
        headers: { Authorization: `Bearer ${unassignedDoctorToken}` },
      });
      expect(res.status).toBe(403);
    });

    it('should reject unassigned doctor querying unassigned patient vitals with 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/doctors/patients/${unassignedPatientProfileId}/vitals`, {
        headers: { Authorization: `Bearer ${unassignedDoctorToken}` },
      });
      expect(res.status).toBe(403);
    });

    it('should reject unassigned doctor querying unassigned patient admissions with 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/doctors/patients/${unassignedPatientProfileId}/admissions`, {
        headers: { Authorization: `Bearer ${unassignedDoctorToken}` },
      });
      expect(res.status).toBe(403);
    });

    it('should reject unassigned doctor querying unassigned patient prescriptions with 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/doctors/patients/${unassignedPatientProfileId}/prescriptions`, {
        headers: { Authorization: `Bearer ${unassignedDoctorToken}` },
      });
      expect(res.status).toBe(403);
    });

    it('should reject unassigned doctor attempting PDF export with 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/doctors/patients/${unassignedPatientProfileId}/medical-records/export?format=PDF`, {
        headers: { Authorization: `Bearer ${unassignedDoctorToken}` },
      });
      expect(res.status).toBe(403);
    });

    it('should reject non-doctor (PATIENT) attempting to access /doctors/patients with 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/doctors/patients`, {
        headers: { Authorization: `Bearer ${patientToken}` },
      });
      expect(res.status).toBe(403);
    });

    it('should reject unauthenticated request with 401 Unauthorized', async () => {
      const res = await fetch(`${baseUrl}/doctors/patients/${patientProfileId}`);
      expect(res.status).toBe(401);
    });
  });
});
