const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function run() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/hvapi_db?schema=public';
  console.log('Connecting to database:', connectionString.replace(/:[^:@]*@/, ':****@'));
  const pool = new Pool({ connectionString });
  
  const sqlPath = path.join(__dirname, '..', 'prisma', 'baseline_schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  console.log(`Executing baseline DDL (${sql.length} bytes)...`);
  
  try {
    await pool.query(sql);
    console.log('✓ Successfully applied baseline schema DDL to database!');
    const tables = await pool.query("SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';");
    console.log('Total tables in public schema:', tables.rows[0].count);
  } catch (err) {
    console.error('Error executing baseline DDL:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
