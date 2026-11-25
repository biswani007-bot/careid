process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/hvapi_db?schema=public';
const { DatabaseService } = require('../dist/src/database/database.service');
const fs = require('fs');
const path = require('path');

const prisma = new DatabaseService();

async function run() {
  console.log('=== CareID Phase 5.2A.4: Versioned SQL Migration Verification Gate ===\n');

  const migrationFilePath = path.join(
    __dirname,
    '../prisma/migrations_offline/20261030_consent_and_referral_clinical_authorization/migration.sql',
  );

  if (!fs.existsSync(migrationFilePath)) {
    throw new Error(`Migration SQL file not found at: ${migrationFilePath}`);
  }

  const migrationSql = fs.readFileSync(migrationFilePath, 'utf8');
  console.log('[1/4] Loaded versioned migration SQL from:', migrationFilePath);

  // 1. Seed pre-existing records to verify legacy data safety
  console.log('[2/4] Seeding pre-existing synthetic consent and referral records in PostgreSQL...');
  const patient = await prisma.patientProfile.findFirst();
  if (!patient) {
    throw new Error('No patient found in database to attach synthetic records');
  }

  const preExistingConsent = await prisma.securityConsentRecord.create({
    data: {
      patientId: patient.id,
      consentType: 'TREATMENT',
      status: 'GRANTED',
      purpose: 'Pre-existing legacy consent for data integrity check',
      capturedBy: patient.userId,
      isDeleted: false,
    },
  });

  const preExistingReferral = await prisma.patientReferral.create({
    data: {
      referralNumber: `REF-MIG-PRE-${Date.now().toString().slice(-5)}`,
      patientId: patient.id,
      referringDoctorId: 'pre-existing-referring-doc',
      referringFacilityId: 'pre-existing-referring-fac',
      receivingFacilityId: 'pre-existing-receiving-fac',
      status: 'SUBMITTED',
      reasonForReferral: 'Pre-existing referral for data integrity check',
      isDeleted: false,
    },
  });

  try {
    // 2. Execute the versioned migration SQL
    console.log('[3/4] Executing versioned migration SQL against PostgreSQL...');
    // Strip comments first, then split on semicolon
    const strippedSql = migrationSql
      .split('\n')
      .filter((line) => !line.trim().startsWith('--'))
      .join('\n');

    const statements = strippedSql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const stmt of statements) {
      console.log(`  Executing: ${stmt.slice(0, 70).replace(/\n/g, ' ')}...`);
      await prisma.$executeRawUnsafe(stmt);
    }
    console.log('  PASS: All DDL migration statements executed successfully.\n');

    // 3. Inspect PostgreSQL system catalog for columns & indexes
    console.log('[4/4] Verifying database schema columns, defaults, and indexes in PostgreSQL...');

    // Inspect columns on security_consent_records
    const consentCols = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'security_consent_records'
        AND column_name IN ('authorized_doctor_id', 'authorized_facility_id', 'access_scope')
      ORDER BY column_name;
    `);
    console.log('  security_consent_records columns:', consentCols);
    if (consentCols.length !== 3) {
      throw new Error(`Expected 3 columns on security_consent_records, found: ${consentCols.length}`);
    }

    // Inspect column on patient_referrals
    const referralCols = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'patient_referrals'
        AND column_name = 'access_scope';
    `);
    console.log('  patient_referrals column:', referralCols);
    if (referralCols.length !== 1) {
      throw new Error('Expected access_scope on patient_referrals');
    }

    // Inspect indexes
    const indexes = await prisma.$queryRawUnsafe(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'security_consent_records'
        AND indexname LIKE '%authorized%'
      ORDER BY indexname;
    `);
    console.log('  security_consent_records composite indexes:', indexes.map((i) => i.indexname));
    if (indexes.length < 2) {
      throw new Error(`Expected at least 2 composite indexes, found: ${indexes.length}`);
    }

    // 4. Verify pre-existing records data integrity
    const retrievedConsent = await prisma.securityConsentRecord.findUnique({
      where: { id: preExistingConsent.id },
    });
    if (!retrievedConsent) throw new Error('Pre-existing consent was lost!');
    if (retrievedConsent.purpose !== preExistingConsent.purpose) throw new Error('Data corruption in pre-existing consent');
    console.log('  PASS: Pre-existing consent record preserved with purpose:', retrievedConsent.purpose);
    console.log('        access_scope defaulted to:', retrievedConsent.accessScope);
    console.log('        authorized_doctor_id is:', retrievedConsent.authorizedDoctorId);

    const retrievedReferral = await prisma.patientReferral.findUnique({
      where: { id: preExistingReferral.id },
    });
    if (!retrievedReferral) throw new Error('Pre-existing referral was lost!');
    console.log('  PASS: Pre-existing referral record preserved with number:', retrievedReferral.referralNumber);
    console.log('        access_scope defaulted to:', retrievedReferral.accessScope);

    console.log('\n================================================================');
    console.log('VERSIONED SQL MIGRATION VERIFICATION PASSED (100%)');
    console.log('================================================================');
  } finally {
    // Clean up test records
    await prisma.securityConsentRecord.delete({ where: { id: preExistingConsent.id } }).catch(() => {});
    await prisma.patientReferral.delete({ where: { id: preExistingReferral.id } }).catch(() => {});
    await prisma.$disconnect();
  }
}

run().catch((err) => {
  console.error('\n❌ Migration Verification Failed:', err);
  process.exit(1);
});
