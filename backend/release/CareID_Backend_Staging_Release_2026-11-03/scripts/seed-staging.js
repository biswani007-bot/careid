/**
 * ==============================================================================
 * CareID Enterprise Backend — Staging Server Synthetic Data Seeding Script
 * ==============================================================================
 * Purpose:
 *   Seeds synthetic test accounts and supporting clinical records into a dedicated
 *   TEST/STAGING server database.
 *
 * Requirements & Safety Guards:
 *   - Explicit operator approval: ALLOW_SERVER_TEST_SEED=true MUST be supplied in
 *     the command line or environment (never hardcoded or assigned internally).
 *   - Explicit staging environment: APP_ENV=staging or DEPLOYMENT_ENV=staging.
 *   - Strictly rejected if APP_ENV=production or DEPLOYMENT_ENV=production.
 *   - Validates that DATABASE_URL points to a non-production database.
 *   - Idempotent and non-destructive: uses Prisma upsert.
 * ==============================================================================
 */

require('dotenv').config();

const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');
const { validateSeedEnvironment, seedLocalDatabase, SEED_TEST_ACCOUNTS, parseSeedArgs } = require('./seed-local');

async function runStagingSeed() {
  console.log('================================================================');
  console.log('  CareID Staging Server Synthetic Data Seeding');
  console.log('================================================================');

  const nodeEnv = (process.env.NODE_ENV || 'development').trim().toLowerCase();
  const rawAppEnv = process.env.APP_ENV !== undefined && process.env.APP_ENV !== null && String(process.env.APP_ENV).trim() !== ''
    ? String(process.env.APP_ENV).trim().toLowerCase()
    : undefined;
  const rawDepEnv = process.env.DEPLOYMENT_ENV !== undefined && process.env.DEPLOYMENT_ENV !== null && String(process.env.DEPLOYMENT_ENV).trim() !== ''
    ? String(process.env.DEPLOYMENT_ENV).trim().toLowerCase()
    : undefined;
  const allowServerTestSeed = process.env.ALLOW_SERVER_TEST_SEED === 'true';

  console.log(`[INFO] NODE_ENV        : ${nodeEnv}`);
  console.log(`[INFO] APP_ENV         : ${rawAppEnv || 'NOT SPECIFIED'}`);
  console.log(`[INFO] DEPLOYMENT_ENV  : ${rawDepEnv || 'NOT SPECIFIED'}`);
  console.log(`[INFO] Operator Flag   : ALLOW_SERVER_TEST_SEED=${process.env.ALLOW_SERVER_TEST_SEED || 'unset'}`);

  const validEnvs = ['development', 'staging', 'test', 'production'];

  // 1. Independent validation of environment variables
  if (rawAppEnv && !validEnvs.includes(rawAppEnv)) {
    console.error(`\n❌ INVALID ENVIRONMENT DECLARATION:`);
    console.error(`   APP_ENV='${rawAppEnv}' is invalid. Must be one of: ${validEnvs.join(', ')}.\n`);
    process.exit(1);
  }
  if (rawDepEnv && !validEnvs.includes(rawDepEnv)) {
    console.error(`\n❌ INVALID ENVIRONMENT DECLARATION:`);
    console.error(`   DEPLOYMENT_ENV='${rawDepEnv}' is invalid. Must be one of: ${validEnvs.join(', ')}.\n`);
    process.exit(1);
  }

  // 2. Reject conflicting environment declarations
  if (rawAppEnv && rawDepEnv && rawAppEnv !== rawDepEnv) {
    console.error(`\n❌ CONFLICTING ENVIRONMENT DECLARATIONS:`);
    console.error(`   APP_ENV='${rawAppEnv}' and DEPLOYMENT_ENV='${rawDepEnv}' do not match.`);
    console.error(`   Deployment-environment declarations must be consistent.\n`);
    process.exit(1);
  }

  // 3. Reject if either variable explicitly equals production
  if (rawAppEnv === 'production' || rawDepEnv === 'production') {
    console.error('\n❌ CRITICAL SECURITY ERROR:');
    console.error('   Seeding is strictly forbidden in production (APP_ENV or DEPLOYMENT_ENV is production).');
    console.error('   Synthetic test data cannot be seeded into production under any circumstances.\n');
    process.exit(1);
  }

  // 4. Staging/Test Environment Verification Guard
  const resolvedAppEnv = rawAppEnv || rawDepEnv;
  if (resolvedAppEnv !== 'staging' && resolvedAppEnv !== 'test') {
    console.error('\n❌ ENVIRONMENT MISMATCH:');
    console.error('   Server staging seed requires explicit staging environment identification.');
    console.error("   Please set APP_ENV=staging or DEPLOYMENT_ENV=staging in your .env configuration.\n");
    process.exit(1);
  }

  // 5. Operator Approval Guard
  if (!allowServerTestSeed) {
    console.error('\n❌ OPERATOR APPROVAL REQUIRED:');
    console.error('   Seeding a server staging database requires explicit operator approval.');
    console.error('   To proceed, execute the seed command with ALLOW_SERVER_TEST_SEED=true:');
    console.error('     ALLOW_SERVER_TEST_SEED=true npm run seed:staging');
    console.error('   or in PowerShell:');
    console.error('     $env:ALLOW_SERVER_TEST_SEED="true"; npm run seed:staging\n');
    process.exit(1);
  }

  // 4. Database Connection & URL Safety
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('\n❌ ERROR: DATABASE_URL environment variable is missing.\n');
    process.exit(1);
  }

  const maskedDbUrl = connectionString.replace(/:[^:@]*@/, ':****@');
  console.log(`[INFO] Database Target : ${maskedDbUrl}`);
  console.log('================================================================\n');

  // 5. Execute deep validation (production keywords, cloud hosts, etc.)
  try {
    validateSeedEnvironment();
  } catch (valErr) {
    console.error('\n❌ Database Target Validation Failed:', valErr.message, '\n');
    process.exit(1);
  }

  const seedOptions = parseSeedArgs();
  if (seedOptions.adminPassword) {
    console.log('[INFO] Admin credentials supplied for database seeding (password will be hashed with bcrypt).');
  } else {
    console.log('[INFO] No seed password supplied; existing admin password hash will be preserved.');
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const results = await seedLocalDatabase(prisma, seedOptions);
    console.log('\n================================================================');
    console.log('  ✓ Staging Seed Completed Successfully');
    console.log('================================================================');
    console.log(`  Roles Seeded       : ${results.rolesSeeded}`);
    console.log(`  Accounts Seeded    : ${results.usersSeeded}`);
    console.log(`  Facilities Seeded  : ${results.facilitiesSeeded}`);
    console.log(`  Doctors Seeded     : ${results.doctorsSeeded}`);
    console.log(`  Patients Seeded    : ${results.patientsSeeded}`);
    console.log(`  Staff Seeded       : ${results.staffSeeded}`);
    console.log('================================================================');
    console.log('All synthetic test accounts are ready for frontend testing.');
    console.log('================================================================\n');
  } catch (error) {
    console.error('\n❌ Staging Seed Failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

if (require.main === module) {
  runStagingSeed();
}

module.exports = { runStagingSeed };
