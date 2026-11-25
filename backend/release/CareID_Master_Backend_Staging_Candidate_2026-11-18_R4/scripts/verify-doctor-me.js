const { NestFactory } = require('@nestjs/core');
const { VersioningType } = require('@nestjs/common');
const { AppModule } = require('../dist/src/app.module');
const { DatabaseService } = require('../dist/src/database/database.service');
const { JwtService } = require('@nestjs/jwt');

const TEST_PORT = 3073;
const BASE_URL = `http://localhost:${TEST_PORT}/api/v1`;
const DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/hvapi_db?schema=public';
process.env.DATABASE_URL = DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET || 'hvapi_default_secret_key';

const prisma = new DatabaseService();
const jwtService = new JwtService({ secret: JWT_SECRET });

const PREFIX = 'synth-p51-';

async function run() {
  console.log('=== Phase 5.1 Runtime Integration Verification Gate ===');
  process.env.DATABASE_URL = DATABASE_URL;
  process.env.PORT = String(TEST_PORT);
  process.env.NODE_ENV = 'test';

  // 1. Create NestJS App
  console.log('[1/6] Bootstrapping NestJS test server on port', TEST_PORT);
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });
  await app.listen(TEST_PORT);
  console.log('[1/6] NestJS server listening on port', TEST_PORT);

  const cleanupIds = {
    userIds: [],
    doctorProfileIds: [],
    patientProfileIds: [],
    roleAssignmentIds: [],
  };

  try {
    // 2. Resolve System Roles from DB
    console.log('[2/6] Resolving system roles from DB');
    const doctorRole = await prisma.role.findFirst({ where: { name: 'DOCTOR' } });
    const patientRole = await prisma.role.findFirst({ where: { name: 'PATIENT' } });

    if (!doctorRole || !patientRole) {
      throw new Error('Database missing DOCTOR or PATIENT role definitions');
    }

    // 3. Seed Synthetic Test Users
    console.log('[3/6] Seeding synthetic test users in test PostgreSQL');
    
    // User 1: Doctor WITH DoctorProfile
    const userDoctorWithProfile = await prisma.user.create({
      data: {
        phone: '+16505559001',
        email: `${PREFIX}doc1@careid.test`,
        status: 'ACTIVE',
      },
    });
    cleanupIds.userIds.push(userDoctorWithProfile.id);

    const ra1 = await prisma.userRole.create({
      data: {
        userId: userDoctorWithProfile.id,
        roleId: doctorRole.id,
      },
    });
    cleanupIds.roleAssignmentIds.push(ra1.id);

    const doctorProfile = await prisma.doctorProfile.create({
      data: {
        userId: userDoctorWithProfile.id,
        fullName: 'Dr. Katherine Pulaski',
        primarySpecialization: 'Trauma Surgery',
        medicalCouncil: 'State Medical Council',
        registrationNumber: `${PREFIX}reg-9001`,
        licenseNumber: `${PREFIX}lic-9001`,
        providerIdentifier: `DOC-360-P51-9001`,
        verificationStatus: 'VERIFIED',
        yearsOfExperience: 14,
        isDeleted: false,
      },
    });
    cleanupIds.doctorProfileIds.push(doctorProfile.id);

    // User 2: Doctor WITHOUT DoctorProfile
    const userDoctorNoProfile = await prisma.user.create({
      data: {
        phone: '+16505559002',
        email: `${PREFIX}doc2@careid.test`,
        status: 'ACTIVE',
      },
    });
    cleanupIds.userIds.push(userDoctorNoProfile.id);

    const ra2 = await prisma.userRole.create({
      data: {
        userId: userDoctorNoProfile.id,
        roleId: doctorRole.id,
      },
    });
    cleanupIds.roleAssignmentIds.push(ra2.id);

    // User 3: Patient
    const userPatient = await prisma.user.create({
      data: {
        phone: '+16505559003',
        email: `${PREFIX}patient@careid.test`,
        status: 'ACTIVE',
      },
    });
    cleanupIds.userIds.push(userPatient.id);

    const ra3 = await prisma.userRole.create({
      data: {
        userId: userPatient.id,
        roleId: patientRole.id,
      },
    });
    cleanupIds.roleAssignmentIds.push(ra3.id);

    const patientProfile = await prisma.patientProfile.create({
      data: {
        userId: userPatient.id,
        firstName: 'Jean-Luc',
        lastName: 'Picard',
        gender: 'MALE',
        bloodGroup: 'O_POSITIVE',
      },
    });
    cleanupIds.patientProfileIds.push(patientProfile.id);

    // 4. Generate JWT tokens
    console.log('[4/6] Generating test JWT tokens');
    const doctorToken = jwtService.sign({
      sub: userDoctorWithProfile.id,
      phone: userDoctorWithProfile.phone,
      roles: ['DOCTOR'],
    });

    const doctorNoProfileToken = jwtService.sign({
      sub: userDoctorNoProfile.id,
      phone: userDoctorNoProfile.phone,
      roles: ['DOCTOR'],
    });

    const patientToken = jwtService.sign({
      sub: userPatient.id,
      phone: userPatient.phone,
      roles: ['PATIENT'],
    });

    // 5. Execute HTTP Test Cases
    console.log('[5/6] Executing HTTP API test scenarios against running server');

    const testResults = [];

    // Helper fetcher
    async function apiGet(path, token) {
      const headers = { 'Accept': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${BASE_URL}${path}`, { headers });
      const text = await res.text();
      let body;
      try { body = JSON.parse(text); } catch { body = text; }
      return { status: res.status, body };
    }

    // Test 1: Unauthenticated request
    const t1 = await apiGet('/doctors/me');
    const t1Pass = t1.status === 401;
    testResults.push({
      name: '1. Unauthenticated request -> 401 Unauthorized',
      status: t1Pass ? 'PASS' : 'FAIL',
      details: { expected: 401, actual: t1.status },
    });
    console.log('  Test 1 (Unauthenticated):', t1Pass ? 'PASS (401)' : `FAIL (${t1.status})`);

    // Test 2: PATIENT attempting access
    const t2 = await apiGet('/doctors/me', patientToken);
    const t2Pass = t2.status === 403;
    testResults.push({
      name: '2. PATIENT attempting access -> 403 Forbidden',
      status: t2Pass ? 'PASS' : 'FAIL',
      details: { expected: 403, actual: t2.status },
    });
    console.log('  Test 2 (Patient Role):', t2Pass ? 'PASS (403)' : `FAIL (${t2.status})`);

    // Test 3: Authenticated DOCTOR without profile
    const t3 = await apiGet('/doctors/me', doctorNoProfileToken);
    const t3Pass = t3.status === 404;
    testResults.push({
      name: '3. Authenticated DOCTOR without profile -> 404 Not Found',
      status: t3Pass ? 'PASS' : 'FAIL',
      details: { expected: 404, actual: t3.status, message: t3.body?.message },
    });
    console.log('  Test 3 (Doctor No Profile):', t3Pass ? 'PASS (404)' : `FAIL (${t3.status})`);

    // Test 4: Authenticated DOCTOR with profile
    const t4 = await apiGet('/doctors/me', doctorToken);
    const t4Pass = t4.status === 200 &&
                   t4.body?.id === doctorProfile.id &&
                   t4.body?.userId === userDoctorWithProfile.id &&
                   t4.body?.fullName === 'Dr. Katherine Pulaski' &&
                   t4.body?.primarySpecialization === 'Trauma Surgery';
    testResults.push({
      name: '4. Authenticated DOCTOR with profile -> 200 OK & full profile',
      status: t4Pass ? 'PASS' : 'FAIL',
      details: {
        expectedStatus: 200,
        actualStatus: t4.status,
        matchedProfileId: t4.body?.id === doctorProfile.id,
        matchedUserId: t4.body?.userId === userDoctorWithProfile.id,
      },
    });
    console.log('  Test 4 (Doctor With Profile):', t4Pass ? 'PASS (200 OK)' : `FAIL (${t4.status})`);

    // Test 5: Identity Isolation — Client-supplied spoofed parameters are ignored
    const t5 = await apiGet(`/doctors/me?doctorId=spoofed-id&userId=spoofed-user`, doctorToken);
    const t5Pass = t5.status === 200 &&
                   t5.body?.id === doctorProfile.id &&
                   t5.body?.userId === userDoctorWithProfile.id;
    testResults.push({
      name: '5. Client spoofed parameters ignored -> Strict JWT userId identity used',
      status: t5Pass ? 'PASS' : 'FAIL',
      details: { actualId: t5.body?.id, expectedId: doctorProfile.id },
    });
    console.log('  Test 5 (Spoofed Query Ignored):', t5Pass ? 'PASS (Strict Identity)' : 'FAIL');

    // Test 6: Route Shadowing Check — GET /doctors/:id still works as expected
    const t6 = await apiGet(`/doctors/${doctorProfile.id}`, doctorToken);
    const t6Pass = t6.status === 200 &&
                   t6.body?.id === doctorProfile.id &&
                   t6.body?.fullName === 'Dr. Katherine Pulaski';
    testResults.push({
      name: '6. GET /doctors/:id preserves route integrity without shadowing',
      status: t6Pass ? 'PASS' : 'FAIL',
      details: { status: t6.status, id: t6.body?.id },
    });
    console.log('  Test 6 (GET /doctors/:id route integrity):', t6Pass ? 'PASS (200 OK)' : `FAIL (${t6.status})`);

    // Summary of results
    const allPass = testResults.every(t => t.status === 'PASS');
    console.log('\n--- Test Summary ---');
    console.log(`Passed: ${testResults.filter(t => t.status === 'PASS').length}/${testResults.length}`);
    console.log('Overall Status:', allPass ? 'ALL TESTS PASSED (100%)' : 'SOME TESTS FAILED');

    if (!allPass) {
      throw new Error('Integration test assertions failed');
    }

  } finally {
    // 6. Cleanup Synthetic Data
    console.log('\n[6/6] Cleaning up synthetic test data from PostgreSQL');
    if (cleanupIds.doctorProfileIds.length > 0) {
      await prisma.doctorProfile.deleteMany({ where: { id: { in: cleanupIds.doctorProfileIds } } });
    }
    if (cleanupIds.patientProfileIds.length > 0) {
      await prisma.patientProfile.deleteMany({ where: { id: { in: cleanupIds.patientProfileIds } } });
    }
    if (cleanupIds.roleAssignmentIds.length > 0) {
      await prisma.userRole.deleteMany({ where: { id: { in: cleanupIds.roleAssignmentIds } } });
    }
    if (cleanupIds.userIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: cleanupIds.userIds } } });
    }
    console.log('[6/6] Cleanup complete. Disconnecting Prisma & stopping NestJS server');
    await prisma.$disconnect();
    await app.close();
  }
}

run().catch((err) => {
  console.error('Fatal Integration Test Error:', err);
  process.exit(1);
});
