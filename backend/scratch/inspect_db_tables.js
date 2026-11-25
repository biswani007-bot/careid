const { Pool } = require('pg');
require('dotenv').config({ path: '.env.staging' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function inspectDbTables() {
  const res = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);
  console.log(`Found ${res.rows.length} tables in PostgreSQL public schema:`);
  const tableNames = res.rows.map(r => r.table_name);
  console.log(tableNames.join(', '));

  // Check specifically for treatment, pricing, discount, terms, attestation, review
  const keywords = ['treatment', 'pricing', 'discount', 'terms', 'attest', 'review', 'cpt', 'clearance', 'financing', 'facility'];
  console.log('\nMatching keyword tables:');
  tableNames.forEach(t => {
    if (keywords.some(k => t.includes(k))) {
      console.log(' - ' + t);
    }
  });

  await pool.end();
}

inspectDbTables().catch(console.error);

