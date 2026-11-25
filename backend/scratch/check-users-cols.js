const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/hvapi_db?schema=public' });
pool.query(`
  SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
  WHERE table_name = 'users'
  ORDER BY ordinal_position;
`, (err, res) => {
  if (err) console.error(err);
  else console.table(res.rows);
  pool.end();
});

