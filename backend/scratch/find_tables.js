const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:5432/hvapi_db' });
client.connect().then(async () => {
  const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND (table_name ILIKE '%clear%' OR table_name ILIKE '%hold%' OR table_name ILIKE '%check%' OR table_name ILIKE '%cath%' OR table_name ILIKE '%cpt%' OR table_name ILIKE '%charge%')");
  console.log('Matching tables:', res.rows.map(r => r.table_name));
  await client.end();
}).catch(console.error);

