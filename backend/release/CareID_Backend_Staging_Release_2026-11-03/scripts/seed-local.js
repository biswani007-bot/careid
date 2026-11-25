/**
 * ==============================================================================
 * CareID Enterprise Backend — Local Development & Testing Seed Script (JS Runner)
 * ==============================================================================
 * Purpose:
 *   Seeds deterministic, realistic test data for all supported CareID roles
 *   (SUPER_ADMIN, ADMIN, DOCTOR, PATIENT, FACILITY_ADMIN, STAFF, FAMILY_MEMBER)
 *   and their related healthcare entities.
 *
 * Safety Guarantees:
 *   - Strictly non-destructive: uses Prisma `upsert` and unique constraints.
 *   - Idempotent: safe to run multiple times without creating duplicate records.
 *   - Production Guard: Aborts immediately if NODE_ENV === 'production' or if
 *     the target DATABASE_URL indicates a managed production host.
 * ==============================================================================
 */

require('dotenv').config();

const { PrismaClient, RoleName, UserStatus, DoctorVerificationStatus, FacilityVerificationStatus, StaffVerificationStatus, HealthCardStatus, QrEntityType, QrStatus, MedicalRecordStatus, AttachmentCategory, NotificationType, NotificationStatus, InsurancePolicyStatus, ReferralStatus } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

const SEED_TEST_ACCOUNTS = [
  {
    phone: '+16505550001',
    email: 'superadmin@careid.test',
    role: RoleName.SUPER_ADMIN,
    name: 'CareID Super Administrator',
    description: 'Platform Super Admin with full root administrative capabilities',
  },
  {
    phone: '+16505550002',
    email: 'admin@careid.test',
    role: RoleName.ADMIN,
    name: 'CareID System Administrator',
    description: 'System Admin with operational and user management permissions',
  },
  {
    phone: '+16505550003',
    role: RoleName.DOCTOR,
    name: 'Dr. Sarah Jenkins, MD',
    description: 'Verified Consultant Cardiologist linked to Metro General Hospital',
  },
  {
    phone: '+16505550004',
    role: RoleName.PATIENT,
    name: 'John Doe',
    description: 'Fully onboarded Patient with Health Card, Records, and Insurance',
  },
  {
    phone: '+16505550005',
    role: RoleName.FACILITY_ADMIN,
    name: 'Metro Facility Administrator',
    description: 'Hospital Administrator managing facilities and clinical staff',
  },
  {
    phone: '+16505550006',
    role: RoleName.STAFF,
    name: 'Alice Smith, RN',
    description: 'Verified Clinical Staff Nurse at Metro General Hospital',
  },
  {
    phone: '+16505550007',
    role: RoleName.FAMILY_MEMBER,
    name: 'Jane Doe (Family)',
    description: 'Linked Family Member / Caregiver with consent-based record access',
  },
];

function validateSeedEnvironment() {
  const nodeEnv = (process.env.NODE_ENV || 'development').trim().toLowerCase();
  const rawAppEnv = process.env.APP_ENV !== undefined && process.env.APP_ENV !== null && String(process.env.APP_ENV).trim() !== ''
    ? String(process.env.APP_ENV).trim().toLowerCase()
    : undefined;
  const rawDepEnv = process.env.DEPLOYMENT_ENV !== undefined && process.env.DEPLOYMENT_ENV !== null && String(process.env.DEPLOYMENT_ENV).trim() !== ''
    ? String(process.env.DEPLOYMENT_ENV).trim().toLowerCase()
    : undefined;
  const allowServerTestSeed = process.env.ALLOW_SERVER_TEST_SEED === 'true';

  const validEnvs = ['development', 'staging', 'test', 'production'];

  // 1. Independent validation of environment variables
  if (rawAppEnv && !validEnvs.includes(rawAppEnv)) {
    throw new Error(
      `CRITICAL SAFETY GUARD: Invalid environment declaration: APP_ENV='${rawAppEnv}' is invalid. Must be one of: ${validEnvs.join(', ')}.`
    );
  }
  if (rawDepEnv && !validEnvs.includes(rawDepEnv)) {
    throw new Error(
      `CRITICAL SAFETY GUARD: Invalid environment declaration: DEPLOYMENT_ENV='${rawDepEnv}' is invalid. Must be one of: ${validEnvs.join(', ')}.`
    );
  }

  // 2. Reject conflicting deployment-environment declarations
  if (rawAppEnv && rawDepEnv && rawAppEnv !== rawDepEnv) {
    throw new Error(
      `CRITICAL SAFETY GUARD: Conflicting environment declarations detected: APP_ENV='${rawAppEnv}' and DEPLOYMENT_ENV='${rawDepEnv}'. Both variables must be consistent when present.`
    );
  }

  // 3. Reject if either variable explicitly equals production
  if (rawAppEnv === 'production' || rawDepEnv === 'production') {
    throw new Error(
      'CRITICAL SAFETY GUARD: Seeding synthetic test data is strictly forbidden when APP_ENV or DEPLOYMENT_ENV is set to production. ' +
      'Aborting immediately to protect real production data.'
    );
  }

  const resolvedAppEnv = rawAppEnv || rawDepEnv;
  const isExplicitStagingOrTest = resolvedAppEnv === 'staging' || resolvedAppEnv === 'test';

  // 4. Reject production NODE_ENV unless legitimately configured as staging/test
  if (nodeEnv === 'production' && !isExplicitStagingOrTest) {
    throw new Error(
      'CRITICAL SAFETY GUARD: Local seeding is strictly forbidden when NODE_ENV=production. ' +
      'Aborting immediately to prevent accidental modification of production data.'
    );
  }

  // 5. Require explicit operator approval for server staging/test seeding
  if ((nodeEnv === 'production' || isExplicitStagingOrTest) && !allowServerTestSeed) {
    throw new Error(
      'CONTROLLED SERVER TESTING GUARD: To seed synthetic test data into a server staging environment, ' +
      'you must explicitly execute with ALLOW_SERVER_TEST_SEED=true (e.g. ALLOW_SERVER_TEST_SEED=true npm run seed:staging).'
    );
  }

  const dbUrl = (process.env.DATABASE_URL || '').toLowerCase();
  if (!dbUrl) {
    throw new Error('CRITICAL SAFETY GUARD: DATABASE_URL environment variable is missing.');
  }

  const prohibitedHosts = ['rds.amazonaws.com', 'cloudsql', 'postgres.render.com', 'neon.tech', 'supabase.co'];
  for (const host of prohibitedHosts) {
    if (dbUrl.includes(host)) {
      throw new Error(
        `CRITICAL SAFETY GUARD: DATABASE_URL appears to target a remote cloud host (${host}). ` +
        'Local seed script must only be run against a dedicated local development database.'
      );
    }
  }

  // Reject production keywords in database URL
  const prohibitedKeywords = ['prod', 'production', 'live', 'primary'];
  try {
    const parsed = new URL(dbUrl.replace(/^postgresql:\/\//, 'http://'));
    const dbName = parsed.pathname.replace('/', '').toLowerCase();
    const host = parsed.hostname.toLowerCase();
    for (const kw of prohibitedKeywords) {
      if (dbName.includes(kw) || host.includes(kw)) {
        throw new Error(
          `CRITICAL SAFETY GUARD: DATABASE_URL (${host}/${dbName}) contains production keywords ('${kw}'). ` +
          'Seeding is strictly forbidden against databases labeled for production.'
        );
      }
    }
  } catch (err) {
    if (err.message && err.message.includes('CRITICAL SAFETY GUARD')) throw err;
  }
}

async function seedLocalDatabase(prisma, options = {}) {
  validateSeedEnvironment();

  console.log('--- Step 1: Seeding Platform Roles ---');
  const allRoles = [
    { name: RoleName.SUPER_ADMIN, description: 'Super Administrator with complete platform control' },
    { name: RoleName.ADMIN, description: 'Administrator with platform management capabilities' },
    { name: RoleName.DOCTOR, description: 'Medical Practitioner with clinical management capabilities' },
    { name: RoleName.PATIENT, description: 'Patient user accessing personal health vault and card' },
    { name: RoleName.FACILITY_ADMIN, description: 'Facility Administrator managing hospital branches and departments' },
    { name: RoleName.STAFF, description: 'Clinical and Administrative hospital workforce staff' },
    { name: RoleName.FAMILY_MEMBER, description: 'Family member or caregiver with delegated consent' },
  ];

  const roleMap = new Map();
  for (const r of allRoles) {
    const roleRecord = await prisma.role.upsert({
      where: { name: r.name },
      update: { description: r.description },
      create: { name: r.name, description: r.description },
    });
    roleMap.set(r.name, roleRecord.id);
  }
  console.log(`✓ Seeded ${roleMap.size} roles successfully.`);

  console.log('--- Step 2: Seeding User Accounts & Role Assignments ---');
  const userMap = new Map();
  for (const acc of SEED_TEST_ACCOUNTS) {
    const isAdminAccount = acc.role === RoleName.ADMIN || acc.role === RoleName.SUPER_ADMIN;
    const targetEmail = (acc.role === RoleName.ADMIN && options.adminEmail) ? options.adminEmail : acc.email;

    // Check if user exists by phone or targetEmail
    const existingUser = typeof prisma.user.findFirst === 'function'
      ? await prisma.user.findFirst({
          where: {
            OR: [
              { phone: acc.phone },
              ...(targetEmail ? [{ email: targetEmail }] : []),
            ],
          },
        })
      : null;

    let passwordHashToSet = undefined;

    if (isAdminAccount) {
      const suppliedPassword = options.adminPassword;

      if (existingUser) {
        if (options.resetAdminPassword && suppliedPassword) {
          passwordHashToSet = await bcrypt.hash(suppliedPassword, 10);
          console.log(`  [SECURITY] Resetting password for ${acc.role} (${targetEmail}).`);
        } else if (existingUser.passwordHash) {
          // Preserve existing password hash untouched
          passwordHashToSet = existingUser.passwordHash;
          console.log(`  [SECURITY] Preserving existing password hash for ${acc.role} (${targetEmail}).`);
        } else if (suppliedPassword) {
          passwordHashToSet = await bcrypt.hash(suppliedPassword, 10);
          console.log(`  [SECURITY] Provisioning initial password hash for ${acc.role} (${targetEmail}).`);
        } else {
          console.log(`  [INFO] Admin account ${targetEmail} exists without a password hash.`);
        }
      } else {
        if (suppliedPassword) {
          passwordHashToSet = await bcrypt.hash(suppliedPassword, 10);
          console.log(`  [SECURITY] Setting initial password hash for new ${acc.role} (${targetEmail}).`);
        } else {
          console.log(`  [INFO] Provisioning new ${acc.role} (${targetEmail}) without password hash.`);
        }
      }
    }

    const user = await prisma.user.upsert({
      where: { phone: acc.phone },
      update: {
        status: UserStatus.ACTIVE,
        ...(targetEmail ? { email: targetEmail } : {}),
        ...(passwordHashToSet !== undefined ? { passwordHash: passwordHashToSet } : {}),
      },
      create: {
        phone: acc.phone,
        email: targetEmail || null,
        passwordHash: passwordHashToSet || null,
        status: UserStatus.ACTIVE,
      },
    });
    userMap.set(acc.role, user);

    const roleId = roleMap.get(acc.role);
    if (roleId) {
      await prisma.userRole.upsert({
        where: {
          userId_roleId: {
            userId: user.id,
            roleId,
          },
        },
        update: {},
        create: {
          userId: user.id,
          roleId,
        },
      });
    }
  }
  console.log(`✓ Seeded ${userMap.size} user accounts with verified roles.`);

  console.log('--- Step 3: Seeding Healthcare Facility & Clinical Departments ---');
  const facility = await prisma.facility.upsert({
    where: { facilityCode: 'FAC-METRO-001' },
    update: {
      name: 'Metro General Hospital',
      verificationStatus: FacilityVerificationStatus.VERIFIED,
      phone: '+16505559000',
      streetAddress: '100 Medical Center Boulevard',
      city: 'Metro City',
      state: 'Central',
      country: 'United States',
    },
    create: {
      name: 'Metro General Hospital',
      legalName: 'Metro Healthcare Systems Inc.',
      facilityCode: 'FAC-METRO-001',
      registrationNumber: 'REG-FAC-2026-001',
      facilityType: 'HOSPITAL',
      ownershipType: 'PRIVATE',
      streetAddress: '100 Medical Center Boulevard',
      city: 'Metro City',
      state: 'Central',
      country: 'United States',
      timezone: 'America/New_York',
      phone: '+16505559000',
      email: 'contact@metrogeneral.org',
      verificationStatus: FacilityVerificationStatus.VERIFIED,
    },
  });

  let branch = await prisma.facilityBranch.findFirst({
    where: { facilityId: facility.id, branchName: 'Downtown Main Campus' },
  });
  if (!branch) {
    branch = await prisma.facilityBranch.create({
      data: {
        facilityId: facility.id,
        branchName: 'Downtown Main Campus',
        branchCode: 'METRO-DT-01',
        address: '100 Medical Center Blvd, Suite 100',
        city: 'Metro City',
        state: 'Central',
        phone: '+16505559001',
      },
    });
  }

  let department = await prisma.facilityDepartment.findFirst({
    where: { facilityId: facility.id, name: 'Cardiology Department' },
  });
  if (!department) {
    department = await prisma.facilityDepartment.create({
      data: {
        facilityId: facility.id,
        name: 'Cardiology Department',
        code: 'CARD-01',
        description: 'Comprehensive Cardiovascular Diagnostics and Care',
        departmentHead: 'Dr. Sarah Jenkins, MD',
      },
    });
  }
  console.log(`✓ Seeded Facility: ${facility.name} (Code: ${facility.facilityCode}) with Department: ${department.name}.`);

  console.log('--- Step 4: Seeding Doctor Profile & Facility Affiliation ---');
  const doctorUser = userMap.get(RoleName.DOCTOR);
  const doctorProfile = await prisma.doctorProfile.upsert({
    where: { userId: doctorUser.id },
    update: {
      fullName: 'Dr. Sarah Jenkins, MD',
      primarySpecialization: 'Cardiology',
      verificationStatus: DoctorVerificationStatus.VERIFIED,
    },
    create: {
      userId: doctorUser.id,
      fullName: 'Dr. Sarah Jenkins, MD',
      gender: 'Female',
      dateOfBirth: new Date('1980-08-20'),
      primarySpecialization: 'Cardiology',
      secondarySpecializations: ['Interventional Cardiology', 'Echocardiography'],
      medicalCouncil: 'State Medical Board',
      registrationNumber: 'MED-REG-2026-9081',
      licenseNumber: 'LIC-MD-2026-9081',
      providerIdentifier: 'NPI-DOC-2026-9081',
      verificationStatus: DoctorVerificationStatus.VERIFIED,
      yearsOfExperience: 14,
      department: 'Cardiology',
      languagesSpoken: ['English', 'Spanish'],
      professionalSummary: 'Board-certified cardiologist specializing in preventive and diagnostic cardiovascular medicine.',
    },
  });

  await prisma.doctorFacility.upsert({
    where: {
      doctorId_facilityId: {
        doctorId: doctorProfile.id,
        facilityId: facility.id,
      },
    },
    update: {
      assignmentType: 'PRIMARY',
      isActive: true,
      departmentId: department.id,
    },
    create: {
      doctorId: doctorProfile.id,
      facilityId: facility.id,
      departmentId: department.id,
      assignmentType: 'PRIMARY',
      privileges: ['INPATIENT_ADMISSION', 'DIAGNOSTIC_ORDERS', 'PRESCRIPTIONS'],
      isActive: true,
    },
  });
  console.log(`✓ Seeded Doctor Profile: ${doctorProfile.fullName} (NPI: ${doctorProfile.providerIdentifier}).`);

  console.log('--- Step 5: Seeding Staff Member Profile ---');
  const staffUser = userMap.get(RoleName.STAFF);
  const staffMember = await prisma.staffMember.upsert({
    where: { employeeCode: 'EMP-METRO-001' },
    update: {
      userId: staffUser.id,
      fullName: 'Alice Smith, RN',
      verificationStatus: StaffVerificationStatus.VERIFIED,
    },
    create: {
      userId: staffUser.id,
      employeeCode: 'EMP-METRO-001',
      fullName: 'Alice Smith, RN',
      gender: 'Female',
      dateOfBirth: new Date('1990-03-15'),
      phone: staffUser.phone,
      email: 'asmith@metrogeneral.org',
      staffType: 'NURSING',
      designation: 'Charge Nurse',
      primaryFacilityId: facility.id,
      primaryDepartmentId: department.id,
      verificationStatus: StaffVerificationStatus.VERIFIED,
    },
  });
  console.log(`✓ Seeded Staff Member: ${staffMember.fullName} (Code: ${staffMember.employeeCode}).`);

  console.log('--- Step 6: Seeding Patient Profile & Core Clinical Vault Data ---');
  const patientUser = userMap.get(RoleName.PATIENT);
  const patientProfile = await prisma.patientProfile.upsert({
    where: { userId: patientUser.id },
    update: {
      firstName: 'John',
      lastName: 'Doe',
      bloodGroup: 'O+',
      status: 'COMPLETED',
      onboardingStep: 7,
    },
    create: {
      userId: patientUser.id,
      patientNumber: 'PT-CAREID-2026-0004',
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: new Date('1988-04-12'),
      gender: 'Male',
      bloodGroup: 'O+',
      nationality: 'American',
      maritalStatus: 'Married',
      languages: ['English'],
      address: '742 Evergreen Terrace, Springfield',
      currentAddressLine1: '742 Evergreen Terrace',
      currentCity: 'Springfield',
      currentState: 'Central',
      currentPostalCode: '62704',
      currentCountry: 'United States',
      knownAllergies: ['Penicillin', 'Peanuts'],
      chronicConditions: ['Hypertension (Mild)'],
      status: 'COMPLETED',
      onboardingStep: 7,
      profileVisibility: 'PRIVATE',
      emailNotifications: true,
      smsNotifications: true,
      pushNotifications: true,
    },
  });

  await prisma.emergencyContact.upsert({
    where: { patientProfileId: patientProfile.id },
    update: {
      name: 'Jane Doe',
      relationship: 'Spouse',
      phone: '+16505550099',
    },
    create: {
      patientProfileId: patientProfile.id,
      name: 'Jane Doe',
      relationship: 'Spouse',
      phone: '+16505550099',
    },
  });

  await prisma.insurancePolicy.upsert({
    where: { patientProfileId: patientProfile.id },
    update: {
      providerName: 'BlueCross Premier Health',
      policyNumber: 'POL-CAREID-2026-001',
      status: InsurancePolicyStatus.ACTIVE,
      expiryDate: new Date('2028-12-31'),
    },
    create: {
      patientProfileId: patientProfile.id,
      providerName: 'BlueCross Premier Health',
      policyNumber: 'POL-CAREID-2026-001',
      groupNumber: 'GRP-998877',
      status: InsurancePolicyStatus.ACTIVE,
      coverageDetails: 'Comprehensive Inpatient, Outpatient, and Emergency Coverage',
      startDate: new Date('2024-01-01'),
      expiryDate: new Date('2028-12-31'),
      verificationStatus: 'VERIFIED',
      copayAmount: 25.0,
      deductibleAmount: 500.0,
      maxLimit: 1000000.0,
    },
  });

  const healthCard = await prisma.healthCard.upsert({
    where: { patientProfileId: patientProfile.id },
    update: {
      cardNumber: 'HC-CAREID-2026-0004',
      status: HealthCardStatus.ACTIVE,
      expiresAt: new Date('2030-12-31'),
    },
    create: {
      patientProfileId: patientProfile.id,
      cardNumber: 'HC-CAREID-2026-0004',
      status: HealthCardStatus.ACTIVE,
      issuedAt: new Date(),
      expiresAt: new Date('2030-12-31'),
      version: 1,
      emergencyFlag: false,
    },
  });

  const qrToken = `QR-HC-${healthCard.cardNumber}-V1`;
  const qrHmacSecret = process.env.QR_HMAC_SECRET || 'local_qr_hmac_secret_key_for_development_purposes_only';
  const qrSignature = crypto.createHmac('sha256', qrHmacSecret).update(qrToken).digest('hex');

  await prisma.qrCode.upsert({
    where: { token: qrToken },
    update: {
      status: QrStatus.ACTIVE,
      signature: qrSignature,
    },
    create: {
      entityId: healthCard.id,
      entityType: QrEntityType.HEALTH_CARD,
      ownerId: patientUser.id,
      token: qrToken,
      signature: qrSignature,
      nonce: crypto.randomBytes(16).toString('hex'),
      status: QrStatus.ACTIVE,
      version: 1,
      expiresAt: new Date('2030-12-31'),
    },
  });

  let medicalRecord = await prisma.medicalRecord.findFirst({
    where: {
      patientProfileId: patientProfile.id,
      title: 'Comprehensive Cardiology Consultation',
    },
  });
  if (!medicalRecord) {
    medicalRecord = await prisma.medicalRecord.create({
      data: {
        patientProfileId: patientProfile.id,
        title: 'Comprehensive Cardiology Consultation',
        chiefComplaint: 'Routine annual cardiovascular checkup',
        clinicalNotes: 'Resting BP 118/78 mmHg. Normal sinus rhythm. Clear breath sounds. No cardiac murmurs.',
        treatmentPlan: 'Maintain current diet and aerobic exercise 150 mins weekly. Follow-up in 12 months.',
        followUpInstructions: 'Return sooner if experiencing exertional chest discomfort or shortness of breath.',
        status: MedicalRecordStatus.FINAL,
        createdById: doctorUser.id,
      },
    });
  }

  let attachment = await prisma.medicalAttachment.findFirst({
    where: {
      patientProfileId: patientProfile.id,
      fileName: 'cardiology_ecg_report_2026.pdf',
    },
  });
  if (!attachment) {
    attachment = await prisma.medicalAttachment.create({
      data: {
        patientProfileId: patientProfile.id,
        medicalRecordId: medicalRecord.id,
        fileName: 'cardiology_ecg_report_2026.pdf',
        originalName: 'cardiology_ecg_report_2026.pdf',
        fileSize: 245800,
        mimeType: 'application/pdf',
        category: AttachmentCategory.LAB_RESULT,
        storageKey: 'patient-docs/seed/cardiology_ecg_report_2026.pdf',
        storageUrl: 'https://careid-private-dev.s3.us-east-005.backblazeb2.com/patient-docs/seed/cardiology_ecg_report_2026.pdf',
        virusScanStatus: 'CLEAN',
        version: 1,
      },
    });
  }

  const referralNumber = 'REF-CAREID-2026-001';
  let referral = await prisma.patientReferral.findUnique({
    where: { referralNumber },
  });
  if (!referral) {
    referral = await prisma.patientReferral.create({
      data: {
        referralNumber,
        patientId: patientUser.id,
        referringDoctorId: doctorProfile.id,
        referringFacilityId: facility.id,
        receivingFacilityId: facility.id,
        medicalRecordId: medicalRecord.id,
        reasonForReferral: 'Exercise stress echocardiography evaluation',
        clinicalSummary: 'Asymptomatic patient undergoing executive health profiling.',
        specialtyRequired: 'Cardiology',
        status: ReferralStatus.ACCEPTED,
        expiresAt: new Date(Date.now() + 90 * 24 * 3600 * 1000),
      },
    });
  }

  let notification = await prisma.notification.findFirst({
    where: {
      recipientUserId: patientUser.id,
      title: 'Annual Health Review Ready',
    },
  });
  if (!notification) {
    notification = await prisma.notification.create({
      data: {
        recipientUserId: patientUser.id,
        recipientPhone: patientUser.phone,
        title: 'Annual Health Review Ready',
        message: 'Your cardiology consultation summary and digital health card are available in your health vault.',
        notificationType: NotificationType.PATIENT,
        status: NotificationStatus.SENT,
        sentAt: new Date(),
      },
    });
  }
  console.log(`✓ Seeded Patient Profile: ${patientProfile.firstName} ${patientProfile.lastName} (${patientProfile.patientNumber}).`);

  return {
    rolesSeeded: roleMap.size,
    usersSeeded: userMap.size,
    facilitiesSeeded: 1,
    doctorsSeeded: 1,
    patientsSeeded: 1,
    staffSeeded: 1,
  };
}

function parseSeedArgs(argv = process.argv) {
  let adminPassword = process.env.SEED_ADMIN_PASSWORD || undefined;
  let adminEmail = undefined;
  let resetAdminPassword = process.env.RESET_ADMIN_PASSWORD === 'true';

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--admin-password=')) {
      adminPassword = arg.slice('--admin-password='.length);
    } else if (arg === '--admin-password' && i + 1 < argv.length) {
      adminPassword = argv[i + 1];
    } else if (arg.startsWith('--admin-email=')) {
      adminEmail = arg.slice('--admin-email='.length);
    } else if (arg === '--admin-email' && i + 1 < argv.length) {
      adminEmail = argv[i + 1];
    } else if (arg === '--reset-admin-password') {
      resetAdminPassword = true;
    }
  }

  return { adminPassword, adminEmail, resetAdminPassword };
}

async function main() {
  console.log('================================================================');
  console.log('  CareID Backend — Local Database Seeding');
  console.log('================================================================');

  try {
    validateSeedEnvironment();
  } catch (err) {
    console.error(`\n[FATAL ERROR] ${err.message}\n`);
    process.exit(1);
  }

  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/hvapi_db?schema=public';
  console.log(`Database Target: ${connectionString.replace(/:[^:@]*@/, ':****@')}`);

  const pool = new Pool({
    connectionString,
    connectionTimeoutMillis: 3000,
  });

  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    await pool.query('SELECT 1');
    console.log('✓ Database connection established.');

    const seedOptions = parseSeedArgs();
    const summary = await seedLocalDatabase(prisma, seedOptions);

    console.log('\n================================================================');
    console.log('  Seeding Completed Successfully (Idempotent)');
    console.log('================================================================');
    console.log(`- Roles:      ${summary.rolesSeeded}`);
    console.log(`- Users:      ${summary.usersSeeded}`);
    console.log(`- Facilities: ${summary.facilitiesSeeded}`);
    console.log(`- Doctors:    ${summary.doctorsSeeded}`);
    console.log(`- Patients:   ${summary.patientsSeeded}`);
    console.log(`- Staff:      ${summary.staffSeeded}`);
    console.log('================================================================\n');
  } catch (error) {
    if (error.code === 'ECONNREFUSED' || error.message?.includes('ECONNREFUSED')) {
      console.warn('\n[NOTICE] Local PostgreSQL database is currently offline or unreachable.');
      console.warn('  Connection details: ' + connectionString.replace(/:[^:@]*@/, ':****@'));
      console.warn('  To apply seed data to your local PostgreSQL instance:');
      console.warn('  1. Start PostgreSQL (e.g. `docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:16`)');
      console.warn('  2. Run `npm run seed`\n');
    } else {
      console.error('\n[ERROR] Seeding failed:', error);
      process.exit(1);
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  SEED_TEST_ACCOUNTS,
  validateSeedEnvironment,
  seedLocalDatabase,
  parseSeedArgs,
};
