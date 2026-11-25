const { Pool } = require('pg');
const fs = require('fs');
const crypto = require('crypto');

const sql = fs.readFileSync('prisma/migrations/20261114120000_doctor_app_core_clinical_subsystems/migration.sql', 'utf8');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/hvapi_db?schema=public',
});

async function run() {
  try {
    console.log('Applying migration to database...');
    await pool.query(sql);
    console.log('✅ Migration SQL executed successfully!');

    // Record in _prisma_migrations
    const migrationId = crypto.randomUUID();
    const migrationName = '20261114120000_doctor_app_core_clinical_subsystems';
    const checksum = crypto.createHash('sha256').update(sql).digest('hex');

    const recordQuery = `
      INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
      VALUES ($1, $2, NOW(), $3, NULL, NULL, NOW(), 1)
      ON CONFLICT DO NOTHING;
    `;
    await pool.query(recordQuery, [migrationId, checksum, migrationName]);
    console.log(`✅ Recorded migration ${migrationName} in _prisma_migrations`);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();

