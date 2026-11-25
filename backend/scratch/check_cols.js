const { Pool } = require('pg');
require('dotenv').config({ path: '.env.staging' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkCols() {
  const res = await pool.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'treatment_offer_history'
    ORDER BY ordinal_position;
  `);
  console.log('Columns in treatment_offer_history:');
  res.rows.forEach(r => console.log(` - ${r.column_name}: ${r.data_type} (nullable: ${r.is_nullable})`));
  await pool.end();
}

checkCols().catch(console.error);

