const { NestFactory } = require('@nestjs/core');
const { VersioningType } = require('@nestjs/common');
const { AppModule } = require('../dist/src/app.module');
const { DatabaseService } = require('../dist/src/database/database.service');
const { JwtService } = require('@nestjs/jwt');

const TEST_PORT = 3076;
const BASE_URL = `http://localhost:${TEST_PORT}/api/v1`;
const DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/hvapi_db?schema=public';
process.env.DATABASE_URL = DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET || 'hvapi_default_secret_key';

const prisma = new DatabaseService();
const jwtService = new JwtService({ secret: JWT_SECRET });

const PREFIX = 'synth-fullgate-';

async function run() {
  console.log('=== CareID Master Unified 46-Scenario End-to-End Runtime Verification Suite ===\n');
  process.env.DATABASE_URL = DATABASE_URL;
  process.env.PORT = String(TEST_PORT);
  process.env.NODE_ENV = 'test';

  // 1. Create NestJS App
  console.log('[1/4] Bootstrapping NestJS test server on port', TEST_PORT);
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });
  await app.listen(TEST_PORT);
  console.log('[1/4] NestJS server listening on port', TEST_PORT);

  const cleanup = {
    userIds: [],
    doctorProfileIds: [],
    patientProfileIds: [],
    facilityIds: [],
    doctorFacilityIds: [],
    staffMemberIds: [],
    medicalRecordIds: [],
    attachmentIds: [],
    referralIds: [],
    consentIds: [],
    roleAssignmentIds: [],
    scheduleIds: [],
    slotIds: [],
    appointmentIds: [],
    notificationIds: [],
    queueIds: [],
    medicalReportIds: [],
    reportAttachmentIds: [],
  };

  try {
    // 2. Resolve Roles
    console.log('[2/4] Resolving system roles from PostgreSQL');
    const doctorRole = await prisma.role.findFirst({ where: { name: 'DOCTOR' } });
    const patientRole = await prisma.role.findFirst({ where: { name: 'PATIENT' } });
    const staffRole = await prisma.role.findFirst({ where: { name: 'STAFF' } }) || doctorRole;
    const adminRole = await prisma.role.findFirst({ where: { name: 'ADMIN' } }) || doctorRole;

    if (!doctorRole || !patientRole) {
      throw new Error('Database missing DOCTOR or PATIENT role definitions');
    }

    // 3. Seed Synthetic Data
    console.log('[3/4] Seeding synthetic facilities, doctors, patients, records, and credentials');

    // Facilities
    const facilityA = await prisma.facility.create({
      data: {
        name: `${PREFIX}St. Jude Hospital A`,
        facilityCode: `${PREFIX}FAC-A`,
        registrationNumber: `${PREFIX}REG-A`,
        facilityType: 'HOSPITAL',
        streetAddress: '100 Medical Plaza',
        city: 'Metropolis',
        state: 'Sindh',
        phone: '+16505551001',
      },
    });
    cleanup.facilityIds.push(facilityA.id);

    const facilityB = await prisma.facility.create({
      data: {
        name: `${PREFIX}Mercy Clinic B`,
        facilityCode: `${PREFIX}FAC-B`,
        registrationNumber: `${PREFIX}REG-B`,
        facilityType: 'CLINIC',
        streetAddress: '200 Health Park',
        city: 'Gotham',
        state: 'Punjab',
        phone: '+16505551002',
      },
    });
    cleanup.facilityIds.push(facilityB.id);

    // Doctor 1: Active at Facility A
    const uDoc1 = await prisma.user.create({
      data: { phone: '+16505558101', email: `${PREFIX}doc1@careid.test`, status: 'ACTIVE' },
    });
    cleanup.userIds.push(uDoc1.id);
    const raD1 = await prisma.userRole.create({ data: { userId: uDoc1.id, roleId: doctorRole.id } });
    cleanup.roleAssignmentIds.push(raD1.id);
    const docProfile1 = await prisma.doctorProfile.create({
      data: {
        userId: uDoc1.id,
        fullName: 'Dr. Leonard McCoy',
        primarySpecialization: 'General Surgery',
        medicalCouncil: 'State Medical Council',
        registrationNumber: `${PREFIX}reg-8101`,
        licenseNumber: `${PREFIX}lic-8101`,
        providerIdentifier: `DOC-360-P52-8101`,
        verificationStatus: 'VERIFIED',
        yearsOfExperience: 15,
        isDeleted: false,
      },
    });
    cleanup.doctorProfileIds.push(docProfile1.id);
    const df1 = await prisma.doctorFacility.create({
      data: { doctorId: docProfile1.id, facilityId: facilityA.id, isActive: true },
    });
    cleanup.doctorFacilityIds.push(df1.id);

    // Doctor 1 Schedule & Slots for Appointment Verification
    const scheduleDoc1 = await prisma.schedule.create({
      data: {
        ownerType: 'DOCTOR',
        doctorProfileId: docProfile1.id,
        facilityId: facilityA.id,
        title: `${PREFIX}Morning Consultations`,
        timezone: 'Asia/Karachi',
        slotDurationMinutes: 15,
        bufferMinutes: 5,
        maxPatientsPerSlot: 1,
        effectiveFrom: new Date('2026-11-01T00:00:00.000Z'),
        effectiveTo: new Date('2026-11-30T23:59:59.000Z'),
        isActive: true,
      },
    });
    cleanup.scheduleIds.push(scheduleDoc1.id);

    const slot1 = await prisma.generatedSlot.create({
      data: {
        scheduleId: scheduleDoc1.id,
        slotDate: new Date('2026-11-15T00:00:00.000Z'),
        startTime: '09:00',
        endTime: '09:15',
        durationMinutes: 15,
        status: 'AVAILABLE',
      },
    });
    cleanup.slotIds.push(slot1.id);

    const slot2 = await prisma.generatedSlot.create({
      data: {
        scheduleId: scheduleDoc1.id,
        slotDate: new Date('2026-11-15T00:00:00.000Z'),
        startTime: '09:15',
        endTime: '09:30',
        durationMinutes: 15,
        status: 'AVAILABLE',
      },
    });
    cleanup.slotIds.push(slot2.id);

    const slot3 = await prisma.generatedSlot.create({
      data: {
        scheduleId: scheduleDoc1.id,
        slotDate: new Date('2026-11-15T00:00:00.000Z'),
        startTime: '09:30',
        endTime: '09:45',
        durationMinutes: 15,
        status: 'AVAILABLE',
      },
    });
    cleanup.slotIds.push(slot3.id);


    // Doctor 2: Active at Facility B
    const uDoc2 = await prisma.user.create({
      data: { phone: '+16505558102', email: `${PREFIX}doc2@careid.test`, status: 'ACTIVE' },
    });
    cleanup.userIds.push(uDoc2.id);
    const raD2 = await prisma.userRole.create({ data: { userId: uDoc2.id, roleId: doctorRole.id } });
    cleanup.roleAssignmentIds.push(raD2.id);
    const docProfile2 = await prisma.doctorProfile.create({
      data: {
        userId: uDoc2.id,
        fullName: 'Dr. Beverly Crusher',
        primarySpecialization: 'Pediatrics',
        medicalCouncil: 'State Medical Council',
        registrationNumber: `${PREFIX}reg-8102`,
        licenseNumber: `${PREFIX}lic-8102`,
        providerIdentifier: `DOC-360-P52-8102`,
        verificationStatus: 'VERIFIED',
        yearsOfExperience: 12,
        isDeleted: false,
      },
    });
    cleanup.doctorProfileIds.push(docProfile2.id);
    const df2 = await prisma.doctorFacility.create({
      data: { doctorId: docProfile2.id, facilityId: facilityB.id, isActive: true },
    });
    cleanup.doctorFacilityIds.push(df2.id);

    // Doctor 3: Inactive Facility Affiliation
    const uDocNoFac = await prisma.user.create({
      data: { phone: '+16505558103', email: `${PREFIX}docnofac@careid.test`, status: 'ACTIVE' },
    });
    cleanup.userIds.push(uDocNoFac.id);
    const raD3 = await prisma.userRole.create({ data: { userId: uDocNoFac.id, roleId: doctorRole.id } });
    cleanup.roleAssignmentIds.push(raD3.id);
    const docProfileNoFac = await prisma.doctorProfile.create({
      data: {
        userId: uDocNoFac.id,
        fullName: 'Dr. Julian Bashir',
        primarySpecialization: 'Internal Medicine',
        medicalCouncil: 'State Medical Council',
        registrationNumber: `${PREFIX}reg-8103`,
        licenseNumber: `${PREFIX}lic-8103`,
        providerIdentifier: `DOC-360-P52-8103`,
        verificationStatus: 'VERIFIED',
        yearsOfExperience: 5,
        isDeleted: false,
      },
    });
    cleanup.doctorProfileIds.push(docProfileNoFac.id);
    const df3 = await prisma.doctorFacility.create({
      data: { doctorId: docProfileNoFac.id, facilityId: facilityA.id, isActive: false },
    });
    cleanup.doctorFacilityIds.push(df3.id);

    // Staff User at Facility A
    const uStaff = await prisma.user.create({
      data: { phone: '+16505558105', email: `${PREFIX}staff@careid.test`, status: 'ACTIVE' },
    });
    cleanup.userIds.push(uStaff.id);
    const raStaff = await prisma.userRole.create({ data: { userId: uStaff.id, roleId: staffRole.id } });
    cleanup.roleAssignmentIds.push(raStaff.id);
    const staffMember = await prisma.staffMember.create({
      data: {
        userId: uStaff.id,
        employeeCode: `${PREFIX}EMP-001`,
        fullName: 'Nurse Chapel',
        phone: uStaff.phone,
        staffType: 'NURSE',
        designation: 'Triage Nurse',
        primaryFacilityId: facilityA.id,
      },
    });
    cleanup.staffMemberIds.push(staffMember.id);

    // Admin User
    const uAdmin = await prisma.user.create({
      data: { phone: '+16505558106', email: `${PREFIX}admin@careid.test`, status: 'ACTIVE' },
    });
    cleanup.userIds.push(uAdmin.id);
    const raAdmin = await prisma.userRole.create({ data: { userId: uAdmin.id, roleId: adminRole.id } });
    cleanup.roleAssignmentIds.push(raAdmin.id);

    // Patient A
    const uPatA = await prisma.user.create({
      data: { phone: '+16505558201', email: `${PREFIX}pata@careid.test`, status: 'ACTIVE' },
    });
    cleanup.userIds.push(uPatA.id);
    const raPA = await prisma.userRole.create({ data: { userId: uPatA.id, roleId: patientRole.id } });
    cleanup.roleAssignmentIds.push(raPA.id);
    const patProfileA = await prisma.patientProfile.create({
      data: {
        userId: uPatA.id,
        firstName: 'Alice',
        lastName: 'Walker',
        patientNumber: `${PREFIX}PT-A-8201`,
        dateOfBirth: new Date('1988-06-12'),
        gender: 'FEMALE',
        bloodGroup: 'O_POSITIVE',
      },
    });
    cleanup.patientProfileIds.push(patProfileA.id);

    // Patient B
    const uPatB = await prisma.user.create({
      data: { phone: '+16505558202', email: `${PREFIX}patb@careid.test`, status: 'ACTIVE' },
    });
    cleanup.userIds.push(uPatB.id);
    const raPB = await prisma.userRole.create({ data: { userId: uPatB.id, roleId: patientRole.id } });
    cleanup.roleAssignmentIds.push(raPB.id);
    const patProfileB = await prisma.patientProfile.create({
      data: {
        userId: uPatB.id,
        firstName: 'Bob',
        lastName: 'Taylor',
        patientNumber: `${PREFIX}PT-B-8202`,
        dateOfBirth: new Date('1992-09-25'),
        gender: 'MALE',
        bloodGroup: 'A_POSITIVE',
      },
    });
    cleanup.patientProfileIds.push(patProfileB.id);

    // Patient A Record 1: Historical record authored by Doctor 1 (createdById: uDoc1.id)
    const recA1 = await prisma.medicalRecord.create({
      data: {
        patientProfileId: patProfileA.id,
        createdById: uDoc1.id, // Doctor 1 authored this record in the past!
        title: 'Historical Appendectomy Consultation',
        chiefComplaint: 'Right lower quadrant abdominal pain',
        clinicalNotes: 'Past surgical consultation notes.',
        treatmentPlan: 'Surgical recovery completed.',
        status: 'FINAL',
        isDeleted: false,
        createdAt: new Date('2025-01-10T10:00:00.000Z'),
      },
    });
    cleanup.medicalRecordIds.push(recA1.id);

    const attA1 = await prisma.medicalAttachment.create({
      data: {
        patientProfileId: patProfileA.id,
        medicalRecordId: recA1.id,
        fileName: 'appendix_pathology.pdf',
        originalName: 'appendix_pathology_report.pdf',
        fileSize: 4096,
        mimeType: 'application/pdf',
        category: 'LAB_RESULT',
        storageKey: 'internal-vault-s3-key-confidential',
        storageUrl: 'https://cdn.careid.test/attachments/appendix_pathology.pdf',
        version: 1,
        isDeleted: false,
        virusScanStatus: 'CLEAN',
        createdAt: new Date('2025-01-12T14:30:00.000Z'),
      },
    });
    cleanup.attachmentIds.push(attA1.id);

    // Patient A Record 2: General checkup record authored by staff
    const recA2 = await prisma.medicalRecord.create({
      data: {
        patientProfileId: patProfileA.id,
        createdById: uStaff.id,
        title: 'Annual Physical Examination',
        chiefComplaint: 'Routine annual checkup',
        clinicalNotes: 'Vitals normal, blood pressure 120/80.',
        treatmentPlan: 'Maintain healthy lifestyle.',
        status: 'FINAL',
        isDeleted: false,
        createdAt: new Date('2026-02-15T09:00:00.000Z'),
      },
    });
    cleanup.medicalRecordIds.push(recA2.id);

    // Patient B Record 1
    const recB1 = await prisma.medicalRecord.create({
      data: {
        patientProfileId: patProfileB.id,
        createdById: uStaff.id,
        title: 'Confidential Hematology Report',
        chiefComplaint: 'Routine lab work',
        clinicalNotes: 'Strictly confidential clinical notes for Patient B.',
        status: 'FINAL',
        isDeleted: false,
        createdAt: new Date('2026-03-01T11:00:00.000Z'),
      },
    });
    cleanup.medicalRecordIds.push(recB1.id);

    // Generate JWT Tokens
    const tokenDoc1 = jwtService.sign({ sub: uDoc1.id, phone: uDoc1.phone, roles: ['DOCTOR'] });
    const tokenDoc2 = jwtService.sign({ sub: uDoc2.id, phone: uDoc2.phone, roles: ['DOCTOR'] });
    const tokenDocNoFac = jwtService.sign({ sub: uDocNoFac.id, phone: uDocNoFac.phone, roles: ['DOCTOR'] });
    const tokenPatientA = jwtService.sign({ sub: uPatA.id, phone: uPatA.phone, roles: ['PATIENT'] });
    const tokenPatientB = jwtService.sign({ sub: uPatB.id, phone: uPatB.phone, roles: ['PATIENT'] });
    const tokenStaff = jwtService.sign({ sub: uStaff.id, phone: uStaff.phone, roles: ['STAFF'] });
    const tokenAdmin = jwtService.sign({ sub: uAdmin.id, phone: uAdmin.phone, roles: ['ADMIN'] });
    const tokenSuperAdmin = jwtService.sign({ sub: uAdmin.id, phone: uAdmin.phone, roles: ['SUPER_ADMIN'] });

    console.log('\n[4/4] Executing All 18 Clinical Authorization Regression Scenarios against Local PostgreSQL...\n');

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 1: Historical Authorship Alone Does Not Grant Access (403)
    // ─────────────────────────────────────────────────────────────────────────────
    {
      console.log('--- Test 1: Historical Authorship Alone Does Not Grant Access ---');
      // Doctor 1 authored recA1 in the past, but has NO active referral and NO active consent for Patient A
      const res = await fetch(`${BASE_URL}/doctors/patients/${patProfileA.id}/medical-records`, {
        headers: { Authorization: `Bearer ${tokenDoc1}` },
      });
      console.log(`  Response: HTTP ${res.status}`);
      if (res.status !== 403) throw new Error(`Test 1 Failed: Expected 403, got ${res.status}`);
      console.log('  PASS: Historical record authorship does NOT grant clinical access (403 Forbidden)\n');
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 2: Staff-Created Consent Defaults to PENDING and Denies Clinical Access (403)
    // ─────────────────────────────────────────────────────────────────────────────
    let test2ConsentId;
    {
      console.log('--- Test 2: Staff-Created Consent Defaults to PENDING and Denies Clinical Access ---');
      const resCreate = await fetch(`${BASE_URL}/security/consents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenStaff}`,
        },
        body: JSON.stringify({
          patientId: patProfileA.id,
          purpose: 'Staff intake consent for Doctor 1',
          authorizedDoctorId: docProfile1.id,
          authorizedFacilityId: facilityA.id,
          consentType: 'TREATMENT',
          accessScope: 'ALL',
        }),
      });
      console.log(`  Staff Consent Creation Response: HTTP ${resCreate.status}`);
      if (resCreate.status !== 201) throw new Error(`Test 2 Failed: Expected 201, got ${resCreate.status}`);
      const bodyCreate = await resCreate.json();
      console.log(`  Created Consent Status: "${bodyCreate.status}"`);
      if (bodyCreate.status !== 'PENDING') throw new Error(`Test 2 Failed: Expected PENDING status, got ${bodyCreate.status}`);
      cleanup.consentIds.push(bodyCreate.id);
      test2ConsentId = bodyCreate.id;

      // Doctor 1 queries records: PENDING consent must NOT grant clinical access!
      const res = await fetch(`${BASE_URL}/doctors/patients/${patProfileA.id}/medical-records`, {
        headers: { Authorization: `Bearer ${tokenDoc1}` },
      });
      console.log(`  Doctor Records Query with PENDING Staff Consent: HTTP ${res.status}`);
      if (res.status !== 403) throw new Error(`Test 2 Failed: Expected 403, got ${res.status}`);
      console.log('  PASS: Staff-created consent defaults to PENDING and strictly denies doctor access until patient confirmation (403 Forbidden)\n');
    }

    // Delete Test 2 consent to isolate subsequent tests
    await prisma.securityConsentRecord.delete({ where: { id: test2ConsentId } });

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 3: Patient-Captured Valid Consent for Designated Doctor Grants Access (200)
    // ─────────────────────────────────────────────────────────────────────────────
    let test3ConsentId;
    {
      console.log('--- Test 3: Patient-Captured Valid Consent for Designated Doctor ---');
      const consent = await prisma.securityConsentRecord.create({
        data: {
          patientId: patProfileA.id,
          consentType: 'DATA_SHARING',
          status: 'GRANTED',
          purpose: 'Patient mobile app self-consent to doctor',
          capturedBy: uPatA.id, // Captured by patient self
          authorizedDoctorId: docProfile1.id,
          accessScope: 'ALL',
          grantedAt: new Date(),
          isDeleted: false,
        },
      });
      cleanup.consentIds.push(consent.id);
      test3ConsentId = consent.id;

      const res = await fetch(`${BASE_URL}/doctors/patients/${patProfileA.id}/medical-records`, {
        headers: { Authorization: `Bearer ${tokenDoc1}` },
      });
      console.log(`  Response: HTTP ${res.status}`);
      if (res.status !== 200) throw new Error(`Test 3 Failed: Expected 200, got ${res.status}`);
      console.log('  PASS: Patient self-captured consent designating doctor grants access (200 OK)\n');
    }

    // Delete Test 3 consent
    await prisma.securityConsentRecord.delete({ where: { id: test3ConsentId } });

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 4: Consent for Doctor B Does NOT Grant Access to Doctor A (403)
    // ─────────────────────────────────────────────────────────────────────────────
    let test4ConsentId;
    {
      console.log('--- Test 4: Consent for Doctor B Does NOT Grant Access to Doctor A ---');
      const consent = await prisma.securityConsentRecord.create({
        data: {
          patientId: patProfileA.id,
          consentType: 'TREATMENT',
          status: 'GRANTED',
          purpose: 'Consent for Doctor 2 only',
          capturedBy: uStaff.id,
          authorizedDoctorId: docProfile2.id, // Only for Doctor 2
          authorizedFacilityId: null,
          accessScope: 'ALL',
          grantedAt: new Date(),
          isDeleted: false,
        },
      });
      cleanup.consentIds.push(consent.id);
      test4ConsentId = consent.id;

      const res = await fetch(`${BASE_URL}/doctors/patients/${patProfileA.id}/medical-records`, {
        headers: { Authorization: `Bearer ${tokenDoc1}` }, // Doctor 1 tries to access
      });
      console.log(`  Response: HTTP ${res.status}`);
      if (res.status !== 403) throw new Error(`Test 4 Failed: Expected 403, got ${res.status}`);
      console.log('  PASS: Consent designated for Doctor B correctly denies Doctor A (403 Forbidden)\n');
    }

    // Delete Test 4 consent
    await prisma.securityConsentRecord.delete({ where: { id: test4ConsentId } });

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 5: Consent for Facility B Does NOT Grant Access to Doctor at Facility A (403)
    // ─────────────────────────────────────────────────────────────────────────────
    let test5ConsentId;
    {
      console.log('--- Test 5: Consent for Facility B Does NOT Grant Access to Doctor at Facility A ---');
      const consent = await prisma.securityConsentRecord.create({
        data: {
          patientId: patProfileA.id,
          consentType: 'TREATMENT',
          status: 'GRANTED',
          purpose: 'Consent for Facility B only',
          capturedBy: uStaff.id,
          authorizedDoctorId: null,
          authorizedFacilityId: facilityB.id, // Designated for Facility B
          accessScope: 'ALL',
          grantedAt: new Date(),
          isDeleted: false,
        },
      });
      cleanup.consentIds.push(consent.id);
      test5ConsentId = consent.id;

      const res = await fetch(`${BASE_URL}/doctors/patients/${patProfileA.id}/medical-records`, {
        headers: { Authorization: `Bearer ${tokenDoc1}` }, // Doctor 1 is only at Facility A
      });
      console.log(`  Response: HTTP ${res.status}`);
      if (res.status !== 403) throw new Error(`Test 5 Failed: Expected 403, got ${res.status}`);
      console.log('  PASS: Facility B consent correctly denies Doctor at Facility A (403 Forbidden)\n');
    }

    // Delete Test 5 consent
    await prisma.securityConsentRecord.delete({ where: { id: test5ConsentId } });

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 6: Withdrawn Consent Immediately Rejects Access (403)
    // ─────────────────────────────────────────────────────────────────────────────
    let test6ConsentId;
    {
      console.log('--- Test 6: Withdrawn Consent Immediately Rejects Access ---');
      const consent = await prisma.securityConsentRecord.create({
        data: {
          patientId: patProfileA.id,
          consentType: 'TREATMENT',
          status: 'WITHDRAWN',
          purpose: 'Withdrawn consent',
          capturedBy: uStaff.id,
          authorizedDoctorId: docProfile1.id,
          withdrawnAt: new Date(),
          isDeleted: false,
        },
      });
      cleanup.consentIds.push(consent.id);
      test6ConsentId = consent.id;

      const res = await fetch(`${BASE_URL}/doctors/patients/${patProfileA.id}/medical-records`, {
        headers: { Authorization: `Bearer ${tokenDoc1}` },
      });
      console.log(`  Response: HTTP ${res.status}`);
      if (res.status !== 403) throw new Error(`Test 6 Failed: Expected 403, got ${res.status}`);
      console.log('  PASS: Withdrawn consent immediately rejects access (403 Forbidden)\n');
    }

    // Delete Test 6 consent
    await prisma.securityConsentRecord.delete({ where: { id: test6ConsentId } });

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 7: Expired Consent Immediately Rejects Access (403)
    // ─────────────────────────────────────────────────────────────────────────────
    let test7ConsentId;
    {
      console.log('--- Test 7: Expired Consent Immediately Rejects Access ---');
      const consent = await prisma.securityConsentRecord.create({
        data: {
          patientId: patProfileA.id,
          consentType: 'TREATMENT',
          status: 'GRANTED',
          purpose: 'Expired consent',
          capturedBy: uStaff.id,
          authorizedDoctorId: docProfile1.id,
          expiresAt: new Date(Date.now() - 3600000), // Expired 1 hour ago
          grantedAt: new Date(Date.now() - 86400000),
          isDeleted: false,
        },
      });
      cleanup.consentIds.push(consent.id);
      test7ConsentId = consent.id;

      const res = await fetch(`${BASE_URL}/doctors/patients/${patProfileA.id}/medical-records`, {
        headers: { Authorization: `Bearer ${tokenDoc1}` },
      });
      console.log(`  Response: HTTP ${res.status}`);
      if (res.status !== 403) throw new Error(`Test 7 Failed: Expected 403, got ${res.status}`);
      console.log('  PASS: Expired consent immediately rejects access (403 Forbidden)\n');
    }

    // Delete Test 7 consent
    await prisma.securityConsentRecord.delete({ where: { id: test7ConsentId } });

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 8: ACCEPTED Referral with Valid Scope Grants Access (200)
    // ─────────────────────────────────────────────────────────────────────────────
    let test8ReferralId;
    {
      console.log('--- Test 8: ACCEPTED Referral with Valid Scope Grants Access ---');
      const ref = await prisma.patientReferral.create({
        data: {
          referralNumber: `${PREFIX}REF-8001`,
          patientId: patProfileA.id,
          referringDoctorId: docProfile2.id,
          referringFacilityId: facilityB.id,
          receivingDoctorId: docProfile1.id,
          receivingFacilityId: facilityA.id,
          status: 'ACCEPTED',
          accessScope: 'ALL_RECORDS',
          reasonForReferral: 'Comprehensive surgical review',
          isDeleted: false,
        },
      });
      cleanup.referralIds.push(ref.id);
      test8ReferralId = ref.id;

      const res = await fetch(`${BASE_URL}/doctors/patients/${patProfileA.id}/medical-records`, {
        headers: { Authorization: `Bearer ${tokenDoc1}` },
      });
      console.log(`  Response: HTTP ${res.status}`);
      if (res.status !== 200) throw new Error(`Test 8 Failed: Expected 200, got ${res.status}`);
      console.log('  PASS: ACCEPTED referral with ALL_RECORDS scope grants access (200 OK)\n');
    }

    // Delete Test 8 referral
    await prisma.patientReferral.delete({ where: { id: test8ReferralId } });

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 9: IN_PROGRESS Referral with Valid Scope Grants Access (200)
    // ─────────────────────────────────────────────────────────────────────────────
    let test9ReferralId;
    {
      console.log('--- Test 9: IN_PROGRESS Referral with Valid Scope Grants Access ---');
      const ref = await prisma.patientReferral.create({
        data: {
          referralNumber: `${PREFIX}REF-8002`,
          patientId: patProfileA.id,
          referringDoctorId: docProfile2.id,
          referringFacilityId: facilityB.id,
          receivingDoctorId: docProfile1.id,
          receivingFacilityId: facilityA.id,
          status: 'IN_PROGRESS',
          accessScope: 'ALL_RECORDS',
          reasonForReferral: 'Ongoing surgical treatment',
          isDeleted: false,
        },
      });
      cleanup.referralIds.push(ref.id);
      test9ReferralId = ref.id;

      const res = await fetch(`${BASE_URL}/doctors/patients/${patProfileA.id}/medical-records`, {
        headers: { Authorization: `Bearer ${tokenDoc1}` },
      });
      console.log(`  Response: HTTP ${res.status}`);
      if (res.status !== 200) throw new Error(`Test 9 Failed: Expected 200, got ${res.status}`);
      console.log('  PASS: IN_PROGRESS referral with ALL_RECORDS scope grants access (200 OK)\n');
    }

    // Delete Test 9 referral
    await prisma.patientReferral.delete({ where: { id: test9ReferralId } });

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 10: SUBMITTED Referral Rejects Access (403)
    // ─────────────────────────────────────────────────────────────────────────────
    let test10ReferralId;
    {
      console.log('--- Test 10: SUBMITTED Referral Rejects Access ---');
      const ref = await prisma.patientReferral.create({
        data: {
          referralNumber: `${PREFIX}REF-8003`,
          patientId: patProfileA.id,
          referringDoctorId: docProfile2.id,
          referringFacilityId: facilityB.id,
          receivingDoctorId: docProfile1.id,
          receivingFacilityId: facilityA.id,
          status: 'SUBMITTED', // Pre-acceptance stage
          accessScope: 'ALL_RECORDS',
          reasonForReferral: 'New pending referral',
          isDeleted: false,
        },
      });
      cleanup.referralIds.push(ref.id);
      test10ReferralId = ref.id;

      const res = await fetch(`${BASE_URL}/doctors/patients/${patProfileA.id}/medical-records`, {
        headers: { Authorization: `Bearer ${tokenDoc1}` },
      });
      console.log(`  Response: HTTP ${res.status}`);
      if (res.status !== 403) throw new Error(`Test 10 Failed: Expected 403, got ${res.status}`);
      console.log('  PASS: SUBMITTED referral rejects access (403 Forbidden)\n');
    }

    // Delete Test 10 referral
    await prisma.patientReferral.delete({ where: { id: test10ReferralId } });

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 11: TRIAGED Referral Rejects Access (403)
    // ─────────────────────────────────────────────────────────────────────────────
    let test11ReferralId;
    {
      console.log('--- Test 11: TRIAGED Referral Rejects Access ---');
      const ref = await prisma.patientReferral.create({
        data: {
          referralNumber: `${PREFIX}REF-8004`,
          patientId: patProfileA.id,
          referringDoctorId: docProfile2.id,
          referringFacilityId: facilityB.id,
          receivingDoctorId: docProfile1.id,
          receivingFacilityId: facilityA.id,
          status: 'TRIAGED', // Triaged but not accepted
          accessScope: 'ALL_RECORDS',
          reasonForReferral: 'Triaged referral',
          isDeleted: false,
        },
      });
      cleanup.referralIds.push(ref.id);
      test11ReferralId = ref.id;

      const res = await fetch(`${BASE_URL}/doctors/patients/${patProfileA.id}/medical-records`, {
        headers: { Authorization: `Bearer ${tokenDoc1}` },
      });
      console.log(`  Response: HTTP ${res.status}`);
      if (res.status !== 403) throw new Error(`Test 11 Failed: Expected 403, got ${res.status}`);
      console.log('  PASS: TRIAGED referral rejects access (403 Forbidden)\n');
    }

    // Delete Test 11 referral
    await prisma.patientReferral.delete({ where: { id: test11ReferralId } });

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 12: COMPLETED Referral Rejects Access (403)
    // ─────────────────────────────────────────────────────────────────────────────
    let test12ReferralId;
    {
      console.log('--- Test 12: COMPLETED Referral Rejects Access ---');
      const ref = await prisma.patientReferral.create({
        data: {
          referralNumber: `${PREFIX}REF-8005`,
          patientId: patProfileA.id,
          referringDoctorId: docProfile2.id,
          referringFacilityId: facilityB.id,
          receivingDoctorId: docProfile1.id,
          receivingFacilityId: facilityA.id,
          status: 'COMPLETED', // Episode of care completed
          accessScope: 'ALL_RECORDS',
          reasonForReferral: 'Discharged referral',
          isDeleted: false,
        },
      });
      cleanup.referralIds.push(ref.id);
      test12ReferralId = ref.id;

      const res = await fetch(`${BASE_URL}/doctors/patients/${patProfileA.id}/medical-records`, {
        headers: { Authorization: `Bearer ${tokenDoc1}` },
      });
      console.log(`  Response: HTTP ${res.status}`);
      if (res.status !== 403) throw new Error(`Test 12 Failed: Expected 403, got ${res.status}`);
      console.log('  PASS: COMPLETED referral rejects access (403 Forbidden)\n');
    }

    // Delete Test 12 referral
    await prisma.patientReferral.delete({ where: { id: test12ReferralId } });

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 13: Referral with Specific Record ID Returns Only That Record and Related Attachments
    // ─────────────────────────────────────────────────────────────────────────────
    let test13ReferralId;
    {
      console.log('--- Test 13: Referral with Specific Record ID Scopes Records & Timeline ---');
      const ref = await prisma.patientReferral.create({
        data: {
          referralNumber: `${PREFIX}REF-8006`,
          patientId: patProfileA.id,
          referringDoctorId: docProfile2.id,
          referringFacilityId: facilityB.id,
          receivingDoctorId: docProfile1.id,
          receivingFacilityId: facilityA.id,
          status: 'ACCEPTED',
          medicalRecordId: recA1.id, // Scoped specifically to Record A1
          accessScope: 'REFERRAL_ONLY',
          reasonForReferral: 'Second opinion on appendectomy consultation',
          isDeleted: false,
        },
      });
      cleanup.referralIds.push(ref.id);
      test13ReferralId = ref.id;

      // 13A. Check records endpoint: must return only recA1 (length 1)
      const resRecords = await fetch(`${BASE_URL}/doctors/patients/${patProfileA.id}/medical-records`, {
        headers: { Authorization: `Bearer ${tokenDoc1}` },
      });
      console.log(`  Records Response: HTTP ${resRecords.status}`);
      if (resRecords.status !== 200) throw new Error(`Test 13A Failed: Expected 200, got ${resRecords.status}`);
      const bodyRecords = await resRecords.json();
      console.log(`  Records retrieved: ${bodyRecords.data.length}, total: ${bodyRecords.meta.totalItems}`);
      if (bodyRecords.data.length !== 1 || bodyRecords.data[0].id !== recA1.id) {
        throw new Error(`Test 13A Failed: Expected only scoped record ${recA1.id}`);
      }

      // 13B. Check timeline endpoint: must return only recA1 and its related attachment attA1 (length 2 total)
      const resTimeline = await fetch(`${BASE_URL}/doctors/patients/${patProfileA.id}/medical-records/timeline`, {
        headers: { Authorization: `Bearer ${tokenDoc1}` },
      });
      console.log(`  Timeline Response: HTTP ${resTimeline.status}`);
      if (resTimeline.status !== 200) throw new Error(`Test 13B Failed: Expected 200, got ${resTimeline.status}`);
      const bodyTimeline = await resTimeline.json();
      console.log(`  Timeline items: ${bodyTimeline.data.length}, total: ${bodyTimeline.meta.totalItems}`);
      const itemIds = bodyTimeline.data.map(i => i.id);
      console.log(`  Timeline item IDs:`, itemIds);
      if (bodyTimeline.data.length !== 2 || !itemIds.includes(recA1.id) || !itemIds.includes(attA1.id)) {
        throw new Error(`Test 13B Failed: Expected only recA1 and attA1 in timeline`);
      }
      console.log('  PASS: Scoped referral limits records and timeline exclusively to referred record & related files (200 OK)\n');
    }

    // Delete Test 13 referral
    await prisma.patientReferral.delete({ where: { id: test13ReferralId } });

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 14: Referral without Explicit Scope Does NOT Grant Unrestricted Access (403)
    // ─────────────────────────────────────────────────────────────────────────────
    let test14ReferralId;
    {
      console.log('--- Test 14: Referral without Explicit Scope Does NOT Grant Unrestricted Access ---');
      const ref = await prisma.patientReferral.create({
        data: {
          referralNumber: `${PREFIX}REF-8007`,
          patientId: patProfileA.id,
          referringDoctorId: docProfile2.id,
          referringFacilityId: facilityB.id,
          receivingDoctorId: docProfile1.id,
          receivingFacilityId: facilityA.id,
          status: 'ACCEPTED',
          medicalRecordId: null, // No specific record
          accessScope: 'REFERRAL_ONLY', // Default scope: NOT ALL_RECORDS
          reasonForReferral: 'Referral missing attachment or broad scope',
          isDeleted: false,
        },
      });
      cleanup.referralIds.push(ref.id);
      test14ReferralId = ref.id;

      const res = await fetch(`${BASE_URL}/doctors/patients/${patProfileA.id}/medical-records`, {
        headers: { Authorization: `Bearer ${tokenDoc1}` },
      });
      console.log(`  Response: HTTP ${res.status}`);
      if (res.status !== 403) throw new Error(`Test 14 Failed: Expected 403, got ${res.status}`);
      console.log('  PASS: Referral without specific record or ALL_RECORDS scope rejects unrestricted access (403 Forbidden)\n');
    }

    // Delete Test 14 referral
    await prisma.patientReferral.delete({ where: { id: test14ReferralId } });

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 15: Inactive Facility Affiliation Blocks Doctor Access (403)
    // ─────────────────────────────────────────────────────────────────────────────
    let test15ConsentId;
    {
      console.log('--- Test 15: Inactive Facility Affiliation Blocks Doctor Access ---');
      // Grant consent specifically to Doctor 3 (who has NO active facility)
      const consent = await prisma.securityConsentRecord.create({
        data: {
          patientId: patProfileA.id,
          consentType: 'TREATMENT',
          status: 'GRANTED',
          purpose: 'Valid consent to doctor with inactive facility',
          capturedBy: uStaff.id,
          authorizedDoctorId: docProfileNoFac.id,
          accessScope: 'ALL',
          grantedAt: new Date(),
          isDeleted: false,
        },
      });
      cleanup.consentIds.push(consent.id);
      test15ConsentId = consent.id;

      const res = await fetch(`${BASE_URL}/doctors/patients/${patProfileA.id}/medical-records`, {
        headers: { Authorization: `Bearer ${tokenDocNoFac}` },
      });
      console.log(`  Response: HTTP ${res.status}`);
      if (res.status !== 403) throw new Error(`Test 15 Failed: Expected 403, got ${res.status}`);
      const body = await res.json();
      console.log(`  Error Message: "${body.message}"`);
      if (!body.message.includes('Active healthcare facility affiliation is required')) {
        throw new Error(`Test 15 Failed: Unexpected error message: ${body.message}`);
      }
      console.log('  PASS: Inactive facility affiliation blocks doctor access even with valid consent (403 Forbidden)\n');
    }

    // Delete Test 15 consent
    await prisma.securityConsentRecord.delete({ where: { id: test15ConsentId } });

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 16: Cross-Patient Access is Strictly Blocked (403)
    // ─────────────────────────────────────────────────────────────────────────────
    let test16ConsentId;
    {
      console.log('--- Test 16: Cross-Patient Access is Strictly Blocked ---');
      // Create valid consent for Patient A to Doctor 1
      const consent = await prisma.securityConsentRecord.create({
        data: {
          patientId: patProfileA.id,
          consentType: 'TREATMENT',
          status: 'GRANTED',
          purpose: 'Consent for Patient A',
          capturedBy: uStaff.id,
          authorizedDoctorId: docProfile1.id,
          accessScope: 'ALL',
          grantedAt: new Date(),
          isDeleted: false,
        },
      });
      cleanup.consentIds.push(consent.id);
      test16ConsentId = consent.id;

      // Doctor 1 queries Patient B!
      const res = await fetch(`${BASE_URL}/doctors/patients/${patProfileB.id}/medical-records`, {
        headers: { Authorization: `Bearer ${tokenDoc1}` },
      });
      console.log(`  Response: HTTP ${res.status}`);
      if (res.status !== 403) throw new Error(`Test 16 Failed: Expected 403, got ${res.status}`);
      console.log('  PASS: Cross-patient access strictly blocked (403 Forbidden)\n');
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 17: Existing Patient and Admin Access Remains Functional (200)
    // ─────────────────────────────────────────────────────────────────────────────
    {
      console.log('--- Test 17: Existing Patient and Admin Access Remains Functional ---');
      // 17A. Patient A retrieves own medical records
      const resPatient = await fetch(`${BASE_URL}/medical-records`, {
        headers: { Authorization: `Bearer ${tokenPatientA}` },
      });
      console.log(`  Patient Own Records: HTTP ${resPatient.status}`);
      if (resPatient.status !== 200) throw new Error(`Test 17A Failed: Expected 200, got ${resPatient.status}`);
      const bodyPatient = await resPatient.json();
      console.log(`  Patient records returned: ${bodyPatient.length}`);
      if (bodyPatient.length < 2) throw new Error('Test 17A Failed: Expected patient records');

      // 17B. Doctor retrieves own profile via GET /doctors/me
      const resDoctorMe = await fetch(`${BASE_URL}/doctors/me`, {
        headers: { Authorization: `Bearer ${tokenDoc1}` },
      });
      console.log(`  Doctor Profile /doctors/me: HTTP ${resDoctorMe.status}`);
      if (resDoctorMe.status !== 200) throw new Error(`Test 17B Failed: Expected 200, got ${resDoctorMe.status}`);
      const bodyDoctorMe = await resDoctorMe.json();
      if (bodyDoctorMe.id !== docProfile1.id) throw new Error('Test 17B Failed: Incorrect doctor profile');

      console.log('  PASS: Existing patient records and doctor profile retrieval remain fully functional (200 OK)\n');
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 18: Audit Logs Correctly Record Authorization Decisions Without Clinical Leaks
    // ─────────────────────────────────────────────────────────────────────────────
    {
      console.log('--- Test 18: Audit Logs Correctly Record Decisions Without Clinical Leaks ---');
      // Query medicalRecordAuditLog for Doctor 1 access events
      const viewLog = await prisma.medicalRecordAuditLog.findFirst({
        where: {
          performedBy: uDoc1.id,
          action: 'DOCTOR_PATIENT_RECORDS_VIEWED',
        },
        orderBy: { createdAt: 'desc' },
      });
      if (!viewLog) throw new Error('Test 18 Failed: Missing medical record view audit log');
      console.log(`  MedicalRecordAuditLog recorded: Action=${viewLog.action}, RecordId=${viewLog.medicalRecordId}`);

      // Query securityPlatformAuditLog for access denial events
      const denyLog = await prisma.securityPlatformAuditLog.findFirst({
        where: {
          userId: uDoc1.id,
          action: 'CLINICAL_ACCESS_DENIED',
          result: 'DENIED',
        },
        orderBy: { createdAt: 'desc' },
      });
      if (!denyLog) throw new Error('Test 18 Failed: Missing security platform denial audit log');
      console.log(`  SecurityAuditLog recorded: Action=${denyLog.action}, Resource=${denyLog.resource}, Result=${denyLog.result}`);

      // Verify no sensitive clinical text in audit logs
      const rawDenyDesc = JSON.stringify(denyLog.details || '');
      const rawViewMeta = JSON.stringify(viewLog.details || '');
      if (rawDenyDesc.includes('hypertension') || rawDenyDesc.includes('Appendectomy') || rawViewMeta.includes('Appendectomy')) {
        throw new Error('Test 18 Failed: Sensitive clinical text found leaked in audit log metadata/description');
      }
      console.log('  PASS: Audit logs verify authorization allow/deny decisions with strictly sanitized metadata\n');
    }

    // Delete Test 16 consent to isolate subsequent tests
    if (test16ConsentId) {
      await prisma.securityConsentRecord.delete({ where: { id: test16ConsentId } }).catch(() => {});
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 19: Patient Can Withdraw Own Consent via API (200)
    // ─────────────────────────────────────────────────────────────────────────────
    let test19ConsentId;
    {
      console.log('--- Test 19: Patient Can Withdraw Own Consent via API ---');
      const consent = await prisma.securityConsentRecord.create({
        data: {
          patientId: patProfileA.id,
          consentType: 'TREATMENT',
          status: 'GRANTED',
          purpose: 'Consent to be withdrawn by patient',
          capturedBy: uPatA.id,
          authorizedDoctorId: docProfile1.id,
          isDeleted: false,
        },
      });
      cleanup.consentIds.push(consent.id);
      test19ConsentId = consent.id;

      const res = await fetch(`${BASE_URL}/security/consents/${consent.id}/withdraw`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenPatientA}` },
      });
      console.log(`  Response: HTTP ${res.status}`);
      if (res.status !== 200) throw new Error(`Test 19 Failed: Expected 200, got ${res.status}`);
      const body = await res.json();
      if (body.status !== 'WITHDRAWN') throw new Error(`Test 19 Failed: Expected WITHDRAWN status, got ${body.status}`);
      console.log('  PASS: Authenticated patient successfully withdrew own consent (200 OK)\n');
    }
    if (test19ConsentId) {
      await prisma.securityConsentRecord.delete({ where: { id: test19ConsentId } }).catch(() => {});
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 20: Patient Cannot Withdraw Another Patient's Consent (403)
    // ─────────────────────────────────────────────────────────────────────────────
    let test20ConsentId;
    {
      console.log('--- Test 20: Patient Cannot Withdraw Another Patient\'s Consent ---');
      const consentB = await prisma.securityConsentRecord.create({
        data: {
          patientId: patProfileB.id,
          consentType: 'TREATMENT',
          status: 'GRANTED',
          purpose: 'Consent for Patient B',
          capturedBy: uPatB.id,
          authorizedDoctorId: docProfile1.id,
          isDeleted: false,
        },
      });
      cleanup.consentIds.push(consentB.id);
      test20ConsentId = consentB.id;

      const res = await fetch(`${BASE_URL}/security/consents/${consentB.id}/withdraw`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenPatientA}` }, // Patient A attempting to withdraw B's consent!
      });
      console.log(`  Response: HTTP ${res.status}`);
      if (res.status !== 403) throw new Error(`Test 20 Failed: Expected 403, got ${res.status}`);
      console.log('  PASS: Cross-patient consent withdrawal rejected with 403 Forbidden\n');
    }
    if (test20ConsentId) {
      await prisma.securityConsentRecord.delete({ where: { id: test20ConsentId } }).catch(() => {});
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 21: Doctor / Staff Cannot Withdraw Patient Consent (403)
    // ─────────────────────────────────────────────────────────────────────────────
    let test21ConsentId;
    {
      console.log('--- Test 21: Doctor / Staff Cannot Withdraw Patient Consent ---');
      const consent = await prisma.securityConsentRecord.create({
        data: {
          patientId: patProfileA.id,
          consentType: 'TREATMENT',
          status: 'GRANTED',
          purpose: 'Active patient consent',
          capturedBy: uPatA.id,
          authorizedDoctorId: docProfile1.id,
          isDeleted: false,
        },
      });
      cleanup.consentIds.push(consent.id);
      test21ConsentId = consent.id;

      const res = await fetch(`${BASE_URL}/security/consents/${consent.id}/withdraw`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenDoc1}` }, // Doctor attempting to withdraw patient consent!
      });
      console.log(`  Response: HTTP ${res.status}`);
      if (res.status !== 403) throw new Error(`Test 21 Failed: Expected 403, got ${res.status}`);
      console.log('  PASS: Doctor/Staff consent withdrawal rejected with 403 Forbidden\n');
    }
    if (test21ConsentId) {
      await prisma.securityConsentRecord.delete({ where: { id: test21ConsentId } }).catch(() => {});
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 22: Administrator Withdrawal Remains Functional (200)
    // ─────────────────────────────────────────────────────────────────────────────
    let test22ConsentId;
    {
      console.log('--- Test 22: Administrator Withdrawal Remains Functional ---');
      const consent = await prisma.securityConsentRecord.create({
        data: {
          patientId: patProfileA.id,
          consentType: 'TREATMENT',
          status: 'GRANTED',
          purpose: 'Consent for admin intervention',
          capturedBy: uPatA.id,
          authorizedDoctorId: docProfile1.id,
          isDeleted: false,
        },
      });
      cleanup.consentIds.push(consent.id);
      test22ConsentId = consent.id;

      const res = await fetch(`${BASE_URL}/security/consents/${consent.id}/withdraw`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenAdmin}` },
      });
      console.log(`  Response: HTTP ${res.status}`);
      if (res.status !== 200) throw new Error(`Test 22 Failed: Expected 200, got ${res.status}`);
      const body = await res.json();
      if (body.status !== 'WITHDRAWN') throw new Error('Test 22 Failed: Expected WITHDRAWN status');
      console.log('  PASS: Administrator consent withdrawal verified (200 OK)\n');
    }
    if (test22ConsentId) {
      await prisma.securityConsentRecord.delete({ where: { id: test22ConsentId } }).catch(() => {});
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 23: Doctor-Created Consent Defaults to PENDING (Does Not Authorize Access)
    // ─────────────────────────────────────────────────────────────────────────────
    let pendingConsentId;
    {
      console.log('--- Test 23: Doctor-Created Consent Defaults to PENDING (Does Not Authorize Access) ---');
      const resCreate = await fetch(`${BASE_URL}/security/consents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenDoc1}`,
        },
        body: JSON.stringify({
          patientId: patProfileA.id,
          purpose: 'Doctor clinical intake consent request',
          authorizedDoctorId: docProfile1.id,
          authorizedFacilityId: facilityA.id,
        }),
      });
      console.log(`  Creation Response: HTTP ${resCreate.status}`);
      if (resCreate.status !== 201) throw new Error(`Test 23 Failed: Expected 201, got ${resCreate.status}`);
      const bodyCreate = await resCreate.json();
      console.log(`  Created Consent Status: "${bodyCreate.status}"`);
      if (bodyCreate.status !== 'PENDING') throw new Error(`Test 23 Failed: Expected PENDING, got ${bodyCreate.status}`);
      cleanup.consentIds.push(bodyCreate.id);
      pendingConsentId = bodyCreate.id;

      // Doctor 1 queries records: PENDING consent must NOT grant clinical access!
      const resRecords = await fetch(`${BASE_URL}/doctors/patients/${patProfileA.id}/medical-records`, {
        headers: { Authorization: `Bearer ${tokenDoc1}` },
      });
      console.log(`  Doctor Records Query with PENDING consent: HTTP ${resRecords.status}`);
      if (resRecords.status !== 403) throw new Error(`Test 23 Failed: Expected 403, got ${resRecords.status}`);
      console.log('  PASS: Doctor-created consent defaults to PENDING and fails closed against clinical access (403 Forbidden)\n');
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 24: Patient Confirmation Transitions PENDING to GRANTED and Grants Access
    // ─────────────────────────────────────────────────────────────────────────────
    {
      console.log('--- Test 24: Patient Confirmation Transitions PENDING to GRANTED and Grants Access ---');
      const resConfirm = await fetch(`${BASE_URL}/security/consents/${pendingConsentId}/confirm`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenPatientA}` },
      });
      console.log(`  Confirmation Response: HTTP ${resConfirm.status}`);
      if (resConfirm.status !== 200) throw new Error(`Test 24 Failed: Expected 200, got ${resConfirm.status}`);
      const bodyConfirm = await resConfirm.json();
      console.log(`  Updated Consent Status: "${bodyConfirm.status}"`);
      if (bodyConfirm.status !== 'GRANTED') throw new Error(`Test 24 Failed: Expected GRANTED, got ${bodyConfirm.status}`);

      // Doctor 1 queries records: GRANTED consent must now permit access!
      const resRecords = await fetch(`${BASE_URL}/doctors/patients/${patProfileA.id}/medical-records`, {
        headers: { Authorization: `Bearer ${tokenDoc1}` },
      });
      console.log(`  Doctor Records Query after Confirmation: HTTP ${resRecords.status}`);
      if (resRecords.status !== 200) throw new Error(`Test 24 Failed: Expected 200, got ${resRecords.status}`);
      console.log('  PASS: Patient confirmation successfully activated consent to GRANTED and unblocked clinical access (200 OK)\n');
    }

    // Clean up confirmed consent before referral tests
    await prisma.securityConsentRecord.delete({ where: { id: pendingConsentId } });

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 25: Unauthorized Referral Creation (by Patient) is Rejected (403)
    // ─────────────────────────────────────────────────────────────────────────────
    {
      console.log('--- Test 25: Unauthorized Referral Creation (by Patient) is Rejected ---');
      const res = await fetch(`${BASE_URL}/referrals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenPatientA}`,
        },
        body: JSON.stringify({
          patientId: patProfileA.id,
          receivingFacilityId: facilityB.id,
          reasonForReferral: 'Patient self referral',
        }),
      });
      console.log(`  Response: HTTP ${res.status}`);
      if (res.status !== 403) throw new Error(`Test 25 Failed: Expected 403, got ${res.status}`);
      console.log('  PASS: Non-clinical role referral creation rejected with 403 Forbidden\n');
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 26: Doctor Creation of ALL_RECORDS Scope is Rejected (403)
    // ─────────────────────────────────────────────────────────────────────────────
    {
      console.log('--- Test 26: Doctor Creation of ALL_RECORDS Scope is Rejected ---');
      const res = await fetch(`${BASE_URL}/referrals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenDoc1}`,
        },
        body: JSON.stringify({
          patientId: patProfileA.id,
          receivingFacilityId: facilityB.id,
          receivingDoctorId: docProfile2.id,
          reasonForReferral: 'Clinical consultation with broad scope attempt',
          accessScope: 'ALL_RECORDS', // Doctor attempting to grant ALL_RECORDS!
        }),
      });
      console.log(`  Response: HTTP ${res.status}`);
      if (res.status !== 403) throw new Error(`Test 26 Failed: Expected 403, got ${res.status}`);
      console.log('  PASS: Ordinary doctor cannot grant ALL_RECORDS access scope (403 Forbidden)\n');
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 27: Cross-Facility Referral Triage is Rejected (403)
    // ─────────────────────────────────────────────────────────────────────────────
    let test27ReferralId;
    {
      console.log('--- Test 27: Cross-Facility Referral Triage is Rejected ---');
      // Create valid referral from Doctor 1 (Facility A) to Facility B (with Doctor 2)
      const resCreate = await fetch(`${BASE_URL}/referrals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenDoc1}`,
        },
        body: JSON.stringify({
          patientId: patProfileA.id,
          receivingFacilityId: facilityB.id,
          receivingDoctorId: docProfile2.id,
          reasonForReferral: 'Legitimate specialist referral',
          accessScope: 'REFERRAL_ONLY',
        }),
      });
      if (resCreate.status !== 201) {
        const errText = await resCreate.text();
        console.error('Failed to create test referral. Response body:', errText);
        throw new Error(`Failed to create test referral: ${resCreate.status}`);
      }
      const bodyCreate = await resCreate.json();
      cleanup.referralIds.push(bodyCreate.id);
      test27ReferralId = bodyCreate.id;

      // Doctor 1 (Facility A) attempts to triage referral addressed to Facility B!
      const resTriageUnauthorized = await fetch(`${BASE_URL}/referrals/${test27ReferralId}/triage`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenDoc1}`, // Only affiliated with Facility A!
        },
        body: JSON.stringify({
          outcome: 'APPROVED',
          reason: 'Unauthorized cross-facility triage approval',
        }),
      });
      console.log(`  Unauthorized Triage Response: HTTP ${resTriageUnauthorized.status}`);
      if (resTriageUnauthorized.status !== 403) throw new Error(`Test 27 Failed: Expected 403, got ${resTriageUnauthorized.status}`);
      console.log('  PASS: Cross-facility referral triage strictly rejected with 403 Forbidden\n');
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 28: Authorized Receiving Facility Doctor Can Triage Referral (200)
    // ─────────────────────────────────────────────────────────────────────────────
    {
      console.log('--- Test 28: Authorized Receiving Facility Doctor Can Triage Referral ---');
      // Doctor 2 (affiliated with Facility B) triages the referral!
      const resTriage = await fetch(`${BASE_URL}/referrals/${test27ReferralId}/triage`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenDoc2}`, // Doctor 2 is at Facility B
        },
        body: JSON.stringify({
          outcome: 'APPROVED',
          reason: 'Accepted by cardiology specialist at Facility B',
        }),
      });
      console.log(`  Authorized Triage Response: HTTP ${resTriage.status}`);
      if (resTriage.status !== 200) throw new Error(`Test 28 Failed: Expected 200, got ${resTriage.status}`);
      const bodyTriage = await resTriage.json();
      console.log(`  Updated Referral Status: "${bodyTriage.status}", AccessScope: "${bodyTriage.accessScope}"`);
      if (bodyTriage.status !== 'ACCEPTED') throw new Error(`Test 28 Failed: Expected ACCEPTED, got ${bodyTriage.status}`);
      if (bodyTriage.accessScope !== 'REFERRAL_ONLY') throw new Error('Test 28 Failed: Scope broadened during triage');
      console.log('  PASS: Authorized receiving facility doctor successfully approved referral with preserved scope (200 OK)\n');
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 29: Administrator Consent Creation Defaults Strictly to PENDING (201)
    // ─────────────────────────────────────────────────────────────────────────────
    let test29ConsentId;
    {
      console.log('--- Test 29: Administrator Consent Creation Defaults to PENDING (Never GRANTED) ---');
      const res = await fetch(`${BASE_URL}/security/consents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenAdmin}`,
        },
        body: JSON.stringify({
          patientId: patProfileA.id,
          purpose: 'Administrative intake consent',
          authorizedDoctorId: docProfile1.id,
        }),
      });
      console.log(`  Admin Consent Creation Response: HTTP ${res.status}`);
      if (res.status !== 201) throw new Error(`Test 29 Failed: Expected 201, got ${res.status}`);
      const body = await res.json();
      cleanup.consentIds.push(body.id);
      test29ConsentId = body.id;
      console.log(`  Admin Created Consent Status: "${body.status}", GrantedAt: "${body.grantedAt || 'null'}"`);
      if (body.status !== 'PENDING') throw new Error(`Test 29 Failed: Expected PENDING, got ${body.status}`);
      if (body.grantedAt) throw new Error('Test 29 Failed: Admin created consent had grantedAt populated');
      console.log('  PASS: Administrator consent creation strictly defaults to PENDING (201 Created)\n');
    }

    // Clean up test 29 consent
    await prisma.securityConsentRecord.delete({ where: { id: test29ConsentId } });

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 30: Confirmation of Expired PENDING Consent is Strictly Rejected (400)
    // ─────────────────────────────────────────────────────────────────────────────
    let test30ConsentId;
    {
      console.log('--- Test 30: Confirmation of Expired PENDING Consent is Strictly Rejected ---');
      const pastDate = new Date(Date.now() - 3600000); // 1 hour ago
      const expiredConsent = await prisma.securityConsentRecord.create({
        data: {
          patientId: patProfileA.id,
          consentType: 'TREATMENT',
          status: 'PENDING',
          purpose: 'Time-bounded urgent intake',
          authorizedDoctorId: docProfile1.id,
          expiresAt: pastDate,
          capturedBy: uDoc1.id,
          isDeleted: false,
        },
      });
      cleanup.consentIds.push(expiredConsent.id);
      test30ConsentId = expiredConsent.id;

      const res = await fetch(`${BASE_URL}/security/consents/${test30ConsentId}/confirm`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenPatientA}` },
      });
      console.log(`  Confirmation of Expired Consent Response: HTTP ${res.status}`);
      if (res.status !== 400) throw new Error(`Test 30 Failed: Expected 400, got ${res.status}`);
      const body = await res.json();
      console.log(`  Error Message: "${body.message}"`);

      // Verify the record in DB was NOT mutated
      const dbRecord = await prisma.securityConsentRecord.findUnique({ where: { id: test30ConsentId } });
      if (dbRecord.status !== 'PENDING' || dbRecord.grantedAt !== null) {
        throw new Error('Test 30 Failed: Expired consent record was mutated in database');
      }
      console.log('  PASS: Expired PENDING consent confirmation strictly rejected with 400 Bad Request; record unmutated\n');
    }

    // Clean up test 30 consent
    await prisma.securityConsentRecord.delete({ where: { id: test30ConsentId } });

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 31: Administrator Attempt to Create ALL_RECORDS Referral is Rejected (403)
    // ─────────────────────────────────────────────────────────────────────────────
    {
      console.log('--- Test 31: Administrator Attempt to Create ALL_RECORDS Referral is Rejected ---');
      const res = await fetch(`${BASE_URL}/referrals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenAdmin}`,
        },
        body: JSON.stringify({
          patientId: patProfileA.id,
          receivingFacilityId: facilityB.id,
          receivingDoctorId: docProfile2.id,
          reasonForReferral: 'Admin broad EHR transfer attempt',
          accessScope: 'ALL_RECORDS',
        }),
      });
      console.log(`  Admin ALL_RECORDS Referral Creation Response: HTTP ${res.status}`);
      if (res.status !== 403) throw new Error(`Test 31 Failed: Expected 403, got ${res.status}`);
      console.log('  PASS: Administrator ALL_RECORDS referral creation strictly rejected with 403 Forbidden\n');
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 32: Super Administrator Attempt to Create ALL_RECORDS Referral is Rejected (403)
    // ─────────────────────────────────────────────────────────────────────────────
    {
      console.log('--- Test 32: Super Administrator Attempt to Create ALL_RECORDS Referral is Rejected ---');
      const res = await fetch(`${BASE_URL}/referrals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenSuperAdmin}`,
        },
        body: JSON.stringify({
          patientId: patProfileA.id,
          receivingFacilityId: facilityB.id,
          receivingDoctorId: docProfile2.id,
          reasonForReferral: 'Super Admin broad EHR transfer attempt',
          accessScope: 'ALL_RECORDS',
        }),
      });
      console.log(`  Super Admin ALL_RECORDS Referral Creation Response: HTTP ${res.status}`);
      if (res.status !== 403) throw new Error(`Test 32 Failed: Expected 403, got ${res.status}`);
      console.log('  PASS: Super Administrator ALL_RECORDS referral creation strictly rejected with 403 Forbidden\n');
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 33: Standard REFERRAL_ONLY Referral Creation by Administrator Succeeds (201)
    // ─────────────────────────────────────────────────────────────────────────────
    {
      console.log('--- Test 33: Standard REFERRAL_ONLY Referral Creation by Administrator Succeeds ---');
      const res = await fetch(`${BASE_URL}/referrals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenAdmin}`,
        },
        body: JSON.stringify({
          patientId: patProfileA.id,
          receivingFacilityId: facilityB.id,
          receivingDoctorId: docProfile2.id,
          reasonForReferral: 'Standard administrative care transfer',
          accessScope: 'REFERRAL_ONLY',
        }),
      });
      console.log(`  Admin Standard Referral Creation Response: HTTP ${res.status}`);
      if (res.status !== 201) throw new Error(`Test 33 Failed: Expected 201, got ${res.status}`);
      const body = await res.json();
      cleanup.referralIds.push(body.id);
      console.log(`  Created Referral AccessScope: "${body.accessScope}", Status: "${body.status}"`);
      if (body.accessScope !== 'REFERRAL_ONLY') throw new Error('Test 33 Failed: Scope was not REFERRAL_ONLY');
      console.log('  PASS: Standard REFERRAL_ONLY referral created successfully by administrator (201 Created)\n');
    }

    console.log('================================================================');
    
    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 34: Patient Books Appointment with Slot Allocation (201 Created)
    // ─────────────────────────────────────────────────────────────────────────────
    let apptId1;
    {
      console.log('--- Test 34: Patient Books Appointment with Slot Reservation ---');
      const res = await fetch(`${BASE_URL}/appointments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenPatientA}`,
        },
        body: JSON.stringify({
          doctorProfileId: docProfile1.id,
          facilityId: facilityA.id,
          scheduleId: scheduleDoc1.id,
          slotId: slot1.id,
          appointmentDate: '2026-11-15',
          startTime: '09:00',
          endTime: '09:15',
          reason: 'Initial consultation',
        }),
      });
      console.log(`  Appointment Booking Response: HTTP ${res.status}`);
      if (res.status !== 201) throw new Error(`Test 34 Failed: Expected 201, got ${res.status}`);
      const body = await res.json();
      apptId1 = body.id;
      cleanup.appointmentIds.push(apptId1);
      const updatedSlot = await prisma.generatedSlot.findUnique({ where: { id: slot1.id } });
      if (updatedSlot.status !== 'BOOKED') throw new Error(`Test 34 Failed: Slot status not transitioned to BOOKED, got ${updatedSlot.status}`);
      console.log('  PASS: Patient booked appointment, slot transitioned to BOOKED (201 Created)\n');
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 35: Doctor Conflict Detection (409 Conflict)
    // ─────────────────────────────────────────────────────────────────────────────
    {
      console.log('--- Test 35: Doctor Double-Booking Conflict Rejection ---');
      const res = await fetch(`${BASE_URL}/appointments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenPatientB}`,
        },
        body: JSON.stringify({
          doctorProfileId: docProfile1.id,
          facilityId: facilityA.id,
          appointmentDate: '2026-11-15',
          startTime: '09:00',
          endTime: '09:15',
          reason: 'Conflicting slot attempt',
        }),
      });
      console.log(`  Doctor Conflict Response: HTTP ${res.status}`);
      if (res.status !== 409) throw new Error(`Test 35 Failed: Expected 409, got ${res.status}`);
      console.log('  PASS: Doctor overlapping appointment conflict rejected with 409 Conflict\n');
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 36: Patient Conflict Detection (409 Conflict)
    // ─────────────────────────────────────────────────────────────────────────────
    {
      console.log('--- Test 36: Patient Double-Booking Conflict Rejection ---');
      const res = await fetch(`${BASE_URL}/appointments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenPatientA}`,
        },
        body: JSON.stringify({
          doctorProfileId: docProfile2.id,
          facilityId: facilityB.id,
          appointmentDate: '2026-11-15',
          startTime: '09:05',
          endTime: '09:20',
          reason: 'Patient overlapping consultation attempt',
        }),
      });
      console.log(`  Patient Conflict Response: HTTP ${res.status}`);
      if (res.status !== 409) throw new Error(`Test 36 Failed: Expected 409, got ${res.status}`);
      console.log('  PASS: Patient overlapping appointment conflict rejected with 409 Conflict\n');
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 37: Doctor Lists Appointments Scoped to Doctor Profile (200 OK)
    // ─────────────────────────────────────────────────────────────────────────────
    {
      console.log('--- Test 37: Doctor Lists Appointments Scoped to Doctor Profile ---');
      const res = await fetch(`${BASE_URL}/appointments/doctor/me`, {
        headers: { Authorization: `Bearer ${tokenDoc1}` },
      });
      console.log(`  Doctor Appointments List Response: HTTP ${res.status}`);
      if (res.status !== 200) throw new Error(`Test 37 Failed: Expected 200, got ${res.status}`);
      const body = await res.json();
      const items = body.data || body;
      if (!Array.isArray(items) || !items.some((a) => a.id === apptId1)) {
        throw new Error('Test 37 Failed: Booked appointment not found in doctor appointments');
      }
      console.log('  PASS: Doctor appointments list retrieved successfully (200 OK)\n');
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 38: Patient Lists Appointments Scoped to Patient Profile (200 OK)
    // ─────────────────────────────────────────────────────────────────────────────
    {
      console.log('--- Test 38: Patient Lists Appointments Scoped to Patient Profile ---');
      const res = await fetch(`${BASE_URL}/appointments/patient/me`, {
        headers: { Authorization: `Bearer ${tokenPatientA}` },
      });
      console.log(`  Patient Appointments List Response: HTTP ${res.status}`);
      if (res.status !== 200) throw new Error(`Test 38 Failed: Expected 200, got ${res.status}`);
      const body = await res.json();
      const items = body.data || body;
      if (!Array.isArray(items) || !items.some((a) => a.id === apptId1)) {
        throw new Error('Test 38 Failed: Booked appointment not found in patient appointments');
      }
      console.log('  PASS: Patient appointments list retrieved successfully (200 OK)\n');
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 39: Reschedule Appointment (200 OK)
    // ─────────────────────────────────────────────────────────────────────────────
    let rescheduledApptId;
    {
      console.log('--- Test 39: Patient Reschedules Appointment ---');
      const res = await fetch(`${BASE_URL}/appointments/${apptId1}/reschedule`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenPatientA}`,
        },
        body: JSON.stringify({
          slotId: slot2.id,
          appointmentDate: '2026-11-15',
          startTime: '09:15',
          endTime: '09:30',
          reason: 'Need 15 min later slot',
        }),
      });
      console.log(`  Reschedule Response: HTTP ${res.status}`);
      if (res.status !== 200) throw new Error(`Test 39 Failed: Expected 200, got ${res.status}`);
      const body = await res.json();
      rescheduledApptId = body.id;
      cleanup.appointmentIds.push(rescheduledApptId);
      const origAppt = await prisma.appointment.findUnique({ where: { id: apptId1 } });
      if (origAppt.status !== 'RESCHEDULED') throw new Error(`Test 39 Failed: Original appointment not RESCHEDULED, got ${origAppt.status}`);
      console.log('  PASS: Appointment rescheduled, original transitioned to RESCHEDULED (200 OK)\n');
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 40: Cancel Appointment (200 OK)
    // ─────────────────────────────────────────────────────────────────────────────
    {
      console.log('--- Test 40: Patient Cancels Rescheduled Appointment ---');
      const res = await fetch(`${BASE_URL}/appointments/${rescheduledApptId}/cancel`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenPatientA}`,
        },
        body: JSON.stringify({
          cancellationReason: 'Personal emergency, will reschedule later',
        }),
      });
      console.log(`  Cancel Response: HTTP ${res.status}`);
      if (res.status !== 200) throw new Error(`Test 40 Failed: Expected 200, got ${res.status}`);
      const body = await res.json();
      if (body.status !== 'CANCELLED') throw new Error(`Test 40 Failed: Expected CANCELLED, got ${body.status}`);
      const cancelledSlot = await prisma.generatedSlot.findUnique({ where: { id: slot2.id } });
      if (cancelledSlot.status !== 'AVAILABLE') throw new Error(`Test 40 Failed: Slot not released to AVAILABLE, got ${cancelledSlot.status}`);
      console.log('  PASS: Appointment cancelled, slot released to AVAILABLE (200 OK)\n');
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 41: Doctor Documents Clinical Encounter with BMI Auto-Calculation (201 Created)
    // ─────────────────────────────────────────────────────────────────────────────
    let encounterRecordId;
    {
      console.log('--- Test 41: Doctor Documents Clinical Encounter with BMI Calculation ---');
      const cEncounter = await prisma.securityConsentRecord.create({
        data: {
          patientId: patProfileA.id,
          consentType: 'TREATMENT',
          authorizedDoctorId: docProfile1.id,
          authorizedFacilityId: facilityA.id,
          status: 'GRANTED',
          accessScope: 'ALL',
          purpose: 'Clinical Encounter Documentation',
          capturedBy: uStaff.id,
          grantedAt: new Date(),
          expiresAt: new Date(Date.now() + 86400000),
          isDeleted: false,
        },
      });
      cleanup.consentIds.push(cEncounter.id);

      const res = await fetch(`${BASE_URL}/doctors/patients/${patProfileA.id}/encounters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenDoc1}`,
        },
        body: JSON.stringify({
          title: 'Acute Pharyngitis Encounter',
          chiefComplaint: 'Sore throat and fever',
          clinicalNotes: 'Throat erythema observed without exudate.',
          treatmentPlan: 'Warm saline gargles and acetaminophen.',
          vitalSigns: {
            heightCm: 180,
            weightKg: 75,
            systolicBp: 120,
            diastolicBp: 80,
            pulseRate: 72,
          },
        }),
      });
      console.log(`  Doctor Encounter Creation Response: HTTP ${res.status}`);
      if (res.status !== 201) throw new Error(`Test 41 Failed: Expected 201, got ${res.status}`);
      const body = await res.json();
      encounterRecordId = body.id;
      cleanup.medicalRecordIds.push(encounterRecordId);
      const vitals = Array.isArray(body.vitalSigns) ? body.vitalSigns[0] : body.vitalSigns;
      if (!vitals || !vitals.bmi) throw new Error('Test 41 Failed: BMI was not auto-calculated');
      console.log(`  Documented Encounter ID: ${encounterRecordId}, Auto-Calculated BMI: ${vitals.bmi}`);
      console.log('  PASS: Doctor documented clinical encounter with auto-calculated BMI (201 Created)\n');
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 42: Doctor Encounter Creation Rejected without Authorization (403 Forbidden)
    // ─────────────────────────────────────────────────────────────────────────────
    {
      console.log('--- Test 42: Doctor Clinical Encounter Rejected without Clinical Authorization ---');
      const res = await fetch(`${BASE_URL}/doctors/patients/${patProfileA.id}/encounters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenDoc2}`,
        },
        body: JSON.stringify({
          title: 'Unauthorized Encounter Attempt',
          chiefComplaint: 'Unauthorized check',
        }),
      });
      console.log(`  Unauthorized Encounter Response: HTTP ${res.status}`);
      if (res.status !== 403) throw new Error(`Test 42 Failed: Expected 403, got ${res.status}`);
      console.log('  PASS: Doctor clinical encounter creation rejected without authorization (403 Forbidden)\n');
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 43: Author Doctor Updates Clinical Medical Record (200 OK)
    // ─────────────────────────────────────────────────────────────────────────────
    {
      console.log('--- Test 43: Author Doctor Updates Clinical Medical Record ---');
      const res = await fetch(`${BASE_URL}/doctors/patients/${patProfileA.id}/medical-records/${encounterRecordId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenDoc1}`,
        },
        body: JSON.stringify({
          clinicalNotes: 'Throat erythema observed; patient reports mild improvement.',
          treatmentPlan: 'Continue warm saline gargles; follow up in 3 days.',
        }),
      });
      console.log(`  Author Update Response: HTTP ${res.status}`);
      if (res.status !== 200) throw new Error(`Test 43 Failed: Expected 200, got ${res.status}`);
      console.log('  PASS: Author doctor successfully updated clinical record (200 OK)\n');
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 44: Non-Author Doctor Rejected When Updating Medical Record (403 Forbidden)
    // ─────────────────────────────────────────────────────────────────────────────
    {
      console.log('--- Test 44: Non-Author Doctor Rejected When Updating Medical Record ---');
      const cDoc2 = await prisma.securityConsentRecord.create({
        data: {
          patientId: patProfileA.id,
          consentType: 'TREATMENT',
          authorizedDoctorId: docProfile2.id,
          authorizedFacilityId: facilityB.id,
          status: 'GRANTED',
          accessScope: 'ALL',
          purpose: 'Second Opinion',
          capturedBy: uStaff.id,
          grantedAt: new Date(),
          expiresAt: new Date(Date.now() + 86400000),
          isDeleted: false,
        },
      });
      cleanup.consentIds.push(cDoc2.id);

      const res = await fetch(`${BASE_URL}/doctors/patients/${patProfileA.id}/medical-records/${encounterRecordId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenDoc2}`,
        },
        body: JSON.stringify({
          clinicalNotes: 'Malicious overwrite attempt by non-author doctor',
        }),
      });
      console.log(`  Non-Author Doctor Update Response: HTTP ${res.status}`);
      if (res.status !== 403) throw new Error(`Test 44 Failed: Expected 403, got ${res.status}`);
      console.log('  PASS: Non-author doctor rejected when attempting to update medical record (403 Forbidden)\n');
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 45: Antivirus Fail-Closed Security & Download Restriction
    // ─────────────────────────────────────────────────────────────────────────────
    {
      console.log('--- Test 45: Antivirus Fail-Closed Security & Download Restriction ---');
      const medReport = await prisma.medicalReport.create({
        data: {
          patientProfileId: patProfileA.id,
          title: 'Unscanned Blood Work Report',
          category: 'LAB',
          status: 'UPLOADED',
        },
      });
      cleanup.medicalReportIds.push(medReport.id);

      const repAtt = await prisma.reportAttachment.create({
        data: {
          medicalReportId: medReport.id,
          fileName: 'unscanned_blood_work.pdf',
          originalName: 'unscanned_blood_work.pdf',
          fileSize: 2048,
          mimeType: 'application/pdf',
          storageKey: 'secure-vault-unscanned-key',
          storageUrl: 'https://cdn.careid.test/attachments/unscanned_blood_work.pdf',
        },
      });
      cleanup.reportAttachmentIds.push(repAtt.id);

      const resDownload = await fetch(`${BASE_URL}/reports/download/${medReport.id}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokenPatientA}`,
        },
      });
      console.log(`  Download Token for Unscanned Report Response: HTTP ${resDownload.status}`);
      if (resDownload.status !== 400) {
        throw new Error(`Test 45 Failed: Expected 400 Bad Request for unscanned file, got ${resDownload.status}`);
      }
      const body = await resDownload.json();
      console.log(`  Download Rejection Message: "${body.message}"`);

      // Verify AntivirusScanner fail-closed on medical attachment when ClamAV is offline
      const attToScan = await prisma.medicalAttachment.create({
        data: {
          patientProfileId: patProfileA.id,
          medicalRecordId: encounterRecordId,
          fileName: 'confidential_lab.pdf',
          originalName: 'confidential_lab.pdf',
          fileSize: 4096,
          mimeType: 'application/pdf',
          category: 'LAB_RESULT',
          storageKey: 'internal-vault-unscanned',
          storageUrl: 'https://cdn.careid.test/attachments/confidential_lab.pdf',
          virusScanStatus: 'PENDING',
        },
      });
      cleanup.attachmentIds.push(attToScan.id);

      const { AntivirusScannerService } = require('../dist/src/modules/storage/infrastructure/antivirus-scanner.service');
      const scanner = new AntivirusScannerService(prisma);
      const scanRes = await scanner.scanAttachment(attToScan.id);
      console.log(`  Scanner Result with Offline Daemon: status="${scanRes.status}", details="${scanRes.details}"`);
      if (scanRes.status !== 'SCAN_FAILED') {
        throw new Error(`Test 45 Failed: Expected SCAN_FAILED when ClamAV offline, got ${scanRes.status}`);
      }
      console.log('  PASS: Download strictly blocked & scanner failed closed to SCAN_FAILED (Fail-Closed Invariant)\n');
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 46: Notification Queue Processing & State Machine
    // ─────────────────────────────────────────────────────────────────────────────
    {
      console.log('--- Test 46: Notification Queue Processing & State Machine ---');
      const notif = await prisma.notification.create({
        data: {
          recipientUserId: uDoc1.id,
          recipientPhone: '+16505558101',
          title: 'Appointment Reminder',
          message: 'Your appointment is confirmed for tomorrow',
          notificationType: 'DOCTOR',
          priority: 'NORMAL',
          channel: 'IN_APP',
          status: 'QUEUED',
        },
      });
      cleanup.notificationIds.push(notif.id);

      const qItem = await prisma.notificationQueue.create({
        data: {
          notificationId: notif.id,
          attempt: 0,
          status: 'QUEUED',
        },
      });
      cleanup.queueIds.push(qItem.id);

      const res = await fetch(`${BASE_URL}/notifications/queue/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenAdmin}`,
        },
        body: JSON.stringify({ batchSize: 10 }),
      });
      console.log(`  Process Queue Response: HTTP ${res.status}`);
      if (res.status !== 200) throw new Error(`Test 46 Failed: Expected 200, got ${res.status}`);
      const body = await res.json();
      console.log(`  Queue processed result: processed=${body.processed}, sent=${body.sent}, failed=${body.failed}`);
      const updatedQueue = await prisma.notificationQueue.findUnique({ where: { id: qItem.id } });
      if (updatedQueue.status !== 'SENT') {
        throw new Error(`Test 46 Failed: Queue item expected SENT, got ${updatedQueue.status}`);
      }
      console.log('  PASS: Notification queue processed successfully and transitioned status to SENT (200 OK)\n');
    }

    console.log('================================================================');
    console.log('ALL 46 UNIFIED END-TO-END MASTER COMPLETION SCENARIOS VERIFIED (100% PASS)');
    console.log('================================================================');
    console.log('================================================================');
  } finally {
    // Teardown Synthetic Data
    console.log('\n[Teardown] Purging synthetic test data from PostgreSQL...');
    try {
      await prisma.medicalRecordAuditLog.deleteMany({
        where: { performedBy: { in: cleanup.userIds } },
      });
      await prisma.securityPlatformAuditLog.deleteMany({
        where: { userId: { in: cleanup.userIds } },
      });
      
      if (cleanup.appointmentIds && cleanup.appointmentIds.length) {
        await prisma.appointment.deleteMany({ where: { id: { in: cleanup.appointmentIds } } });
      }
      if (cleanup.slotIds && cleanup.slotIds.length) {
        await prisma.generatedSlot.deleteMany({ where: { id: { in: cleanup.slotIds } } });
      }
      if (cleanup.scheduleIds && cleanup.scheduleIds.length) {
        await prisma.schedule.deleteMany({ where: { id: { in: cleanup.scheduleIds } } });
      }
      if (cleanup.queueIds && cleanup.queueIds.length) {
        await prisma.notificationQueue.deleteMany({ where: { id: { in: cleanup.queueIds } } });
      }
      if (cleanup.notificationIds && cleanup.notificationIds.length) {
        await prisma.notification.deleteMany({ where: { id: { in: cleanup.notificationIds } } });
      }
      if (cleanup.medicalReportIds && cleanup.medicalReportIds.length) {
        await prisma.medicalReport.deleteMany({ where: { id: { in: cleanup.medicalReportIds } } });
      }
      if (cleanup.reportAttachmentIds && cleanup.reportAttachmentIds.length) {
        await prisma.reportAttachment.deleteMany({ where: { id: { in: cleanup.reportAttachmentIds } } });
      }
      if (cleanup.referralIds.length) {
        await prisma.patientReferral.deleteMany({ where: { id: { in: cleanup.referralIds } } });
      }
      if (cleanup.consentIds.length) {
        await prisma.securityConsentRecord.deleteMany({ where: { id: { in: cleanup.consentIds } } });
      }
      if (cleanup.attachmentIds.length) {
        await prisma.medicalAttachment.deleteMany({ where: { id: { in: cleanup.attachmentIds } } });
      }
      if (cleanup.medicalRecordIds.length) {
        await prisma.medicalRecord.deleteMany({ where: { id: { in: cleanup.medicalRecordIds } } });
      }
      if (cleanup.doctorFacilityIds.length) {
        await prisma.doctorFacility.deleteMany({ where: { id: { in: cleanup.doctorFacilityIds } } });
      }
      if (cleanup.staffMemberIds && cleanup.staffMemberIds.length) {
        await prisma.staffMember.deleteMany({ where: { id: { in: cleanup.staffMemberIds } } });
      }
      if (cleanup.patientProfileIds.length) {
        await prisma.patientProfile.deleteMany({ where: { id: { in: cleanup.patientProfileIds } } });
      }
      if (cleanup.doctorProfileIds.length) {
        await prisma.doctorProfile.deleteMany({ where: { id: { in: cleanup.doctorProfileIds } } });
      }
      if (cleanup.facilityIds.length) {
        await prisma.facility.deleteMany({ where: { id: { in: cleanup.facilityIds } } });
      }
      if (cleanup.roleAssignmentIds.length) {
        await prisma.userRole.deleteMany({ where: { id: { in: cleanup.roleAssignmentIds } } });
      }
      if (cleanup.userIds.length) {
        await prisma.user.deleteMany({ where: { id: { in: cleanup.userIds } } });
      }
      console.log('[Teardown] All synthetic test records successfully purged.');
    } catch (e) {
      console.error('[Teardown Warning]', e.message);
    }

    await prisma.$disconnect();
    await app.close();
    console.log('[Teardown] NestJS test server and database connection pool closed cleanly.');
  }
}

run().catch((err) => {
  console.error('\n❌ Verification Execution Failed:', err);
  process.exit(1);
});
