const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@127.0.0.1:5432/hvapi_db?schema=public',
});

async function run() {
  const res = await pool.query(`
    SELECT enumlabel 
    FROM pg_enum 
    JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
    WHERE pg_type.typname = 'AttachmentCategory'
    ORDER BY enumsortorder;
  `);
  console.log('Total enum values in AttachmentCategory:', res.rows.length);
  console.log(res.rows.map(r => r.enumlabel));
  await pool.end();
}

run();

