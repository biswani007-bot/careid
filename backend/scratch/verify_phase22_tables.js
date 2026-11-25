const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@127.0.0.1:5432/hvapi_db?schema=public',
});

async function run() {
  const res = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name IN (
        'dental_records', 'vision_records', 'laboratory_reports', 
        'laboratory_test_items', 'prescriptions', 'prescription_items', 
        'prescription_refills', 'conversations', 'direct_messages', 
        'record_share_grants', 'medical_record_addenda'
      ) 
    ORDER BY table_name;
  `);
  console.log('Total verified clinical tables:', res.rows.length);
  console.log(res.rows.map(r => r.table_name));
  await pool.end();
}

run();

