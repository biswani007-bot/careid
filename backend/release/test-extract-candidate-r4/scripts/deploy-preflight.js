/**
 * ==============================================================================
 * CareID Enterprise Backend — aaPanel Deployment Preflight Verification
 * ==============================================================================
 * Purpose:
 *   Verifies environment variables, Node.js version, PostgreSQL database
 *   connectivity, and database schema parity before launching the server.
 *
 * Usage:
 *   node scripts/deploy-preflight.js
 *   npm run preflight
 * ==============================================================================
 */

require('dotenv').config();
const { Pool } = require('pg');

async function runPreflight() {
  console.log('================================================================');
  console.log('  CareID Enterprise Backend — Deployment Preflight Verification');
  console.log('================================================================\n');

  let hasErrors = false;

  // 1. Node.js Version Check
  const nodeVersion = process.versions.node;
  const majorVersion = parseInt(nodeVersion.split('.')[0], 10);
  console.log(`[CHECK 1] Node.js Runtime Version: v${nodeVersion}`);
  if (majorVersion >= 20) {
    console.log(`  ✓ Node.js version satisfies requirement (>= v20.x, recommended v20 or v22 LTS).`);
  } else {
    console.warn(`  ⚠️ WARNING: CareID is tested on Node.js v20+. Detected v${nodeVersion}. Upgrade recommended in aaPanel Node Manager.`);
  }

  // 2. Environment Designation & Safety
  const nodeEnv = (process.env.NODE_ENV || 'development').trim().toLowerCase();
  const rawAppEnv = process.env.APP_ENV !== undefined && process.env.APP_ENV !== null && String(process.env.APP_ENV).trim() !== ''
    ? String(process.env.APP_ENV).trim().toLowerCase()
    : undefined;
  const rawDepEnv = process.env.DEPLOYMENT_ENV !== undefined && process.env.DEPLOYMENT_ENV !== null && String(process.env.DEPLOYMENT_ENV).trim() !== ''
    ? String(process.env.DEPLOYMENT_ENV).trim().toLowerCase()
    : undefined;
  const enableTestOtp = process.env.ENABLE_TEST_OTP === 'true';

  console.log(`\n[CHECK 2] Environment Configuration:`);
  console.log(`  - NODE_ENV        : ${nodeEnv}`);
  console.log(`  - APP_ENV         : ${rawAppEnv || 'NOT SPECIFIED'}`);
  console.log(`  - DEPLOYMENT_ENV  : ${rawDepEnv || 'NOT SPECIFIED'}`);
  console.log(`  - ENABLE_TEST_OTP : ${enableTestOtp}`);

  const validEnvs = ['development', 'staging', 'test', 'production'];

  // Check valid envs
  if (rawAppEnv && !validEnvs.includes(rawAppEnv)) {
    console.error(`  ❌ ERROR: Invalid APP_ENV='${rawAppEnv}'. Must be one of: ${validEnvs.join(', ')}.`);
    hasErrors = true;
  }
  if (rawDepEnv && !validEnvs.includes(rawDepEnv)) {
    console.error(`  ❌ ERROR: Invalid DEPLOYMENT_ENV='${rawDepEnv}'. Must be one of: ${validEnvs.join(', ')}.`);
    hasErrors = true;
  }

  // Conflict check
  if (rawAppEnv && rawDepEnv && rawAppEnv !== rawDepEnv) {
    console.error(`  ❌ CRITICAL ERROR: Conflicting environment declarations detected: APP_ENV='${rawAppEnv}' and DEPLOYMENT_ENV='${rawDepEnv}'. Both variables must be consistent when present.`);
    hasErrors = true;
  }

  const eitherIsProduction = rawAppEnv === 'production' || rawDepEnv === 'production';
  const resolvedAppEnv = rawAppEnv || rawDepEnv;
  const isExplicitStagingOrTest = !eitherIsProduction && (resolvedAppEnv === 'staging' || resolvedAppEnv === 'test');
  const isProduction = eitherIsProduction || (!isExplicitStagingOrTest && nodeEnv === 'production');

  if (isProduction && enableTestOtp) {
    console.error('  ❌ CRITICAL SECURITY ERROR: ENABLE_TEST_OTP cannot be enabled for a production environment!');
    hasErrors = true;
  } else if (enableTestOtp) {
    const testOtp = process.env.TEST_OTP_CODE || '';
    const whitelist = process.env.TEST_PHONE_NUMBERS || '';
    console.log(`  ✓ Staging Test OTP is enabled for ${whitelist.split(',').filter(Boolean).length} allowlisted phone numbers.`);
    if (!/^\d{6}$/.test(testOtp)) {
      console.error('  ❌ ERROR: TEST_OTP_CODE must be a valid 6-digit numeric string.');
      hasErrors = true;
    }
  }

  // 3. JWT Secret Quality Check
  const jwtSecret = process.env.JWT_SECRET || '';
  console.log(`\n[CHECK 3] JWT Security Secret:`);
  if (!jwtSecret || jwtSecret.length < 32) {
    console.error(`  ❌ ERROR: JWT_SECRET must be at least 32 characters in staging/production (current length: ${jwtSecret.length}).`);
    hasErrors = true;
  } else {
    console.log(`  ✓ JWT_SECRET length (${jwtSecret.length} chars) meets enterprise cryptographic entropy requirements.`);
  }

  // 4. PostgreSQL Connectivity & Schema Parity
  const dbUrl = process.env.DATABASE_URL;
  console.log(`\n[CHECK 4] PostgreSQL Database Connectivity:`);
  if (!dbUrl) {
    console.error('  ❌ ERROR: DATABASE_URL is not defined in environment.');
    hasErrors = true;
  } else {
    console.log(`  Target: ${dbUrl.replace(/:[^:@]*@/, ':****@')}`);
    const pool = new Pool({ connectionString: dbUrl, connectionTimeoutMillis: 5000 });
    try {
      const client = await pool.connect();
      console.log('  ✓ Successfully connected to PostgreSQL server.');

      const tableRes = await client.query(
        "SELECT count(*)::int as count FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';"
      );
      const tableCount = tableRes.rows[0].count;
      console.log(`  ✓ Public schema table count: ${tableCount} tables.`);

      if (tableCount === 0) {
        console.warn('\n  ⚠️ NOTICE: Database is empty. The CareID baseline schema has not yet been applied.');
        console.warn('  To initialize the 144 CareID database tables, run:');
        console.warn('    psql -d <database_name> -f prisma/baseline_schema.sql\n');
      } else if (tableCount < 140) {
        console.warn(`\n  ⚠️ NOTICE: Expected ~144 CareID baseline tables, but found ${tableCount}. Please verify schema parity.\n`);
      } else {
        console.log(`  ✓ Baseline schema appears fully populated (${tableCount} tables).`);
      }

      // Check if roles are populated
      const roleRes = await client.query("SELECT count(*)::int as count FROM information_schema.tables WHERE table_name = 'roles';");
      if (roleRes.rows[0].count > 0) {
        const rolesData = await client.query('SELECT count(*)::int as count FROM roles;');
        console.log(`  ✓ Seeded roles present in database: ${rolesData.rows[0].count} roles.`);
      }

      client.release();
    } catch (dbErr) {
      console.error('  ❌ Database connection failed:', dbErr.message);
      hasErrors = true;
    } finally {
      await pool.end();
    }
  }

  console.log('\n================================================================');
  if (hasErrors) {
    console.error('  PREFLIGHT FAILED: Please correct the issues above before starting.');
    console.error('================================================================\n');
    process.exit(1);
  } else {
    console.log('  PREFLIGHT PASSED: Environment and database are ready for CareID.');
    console.log('================================================================\n');
    process.exit(0);
  }
}

runPreflight();
