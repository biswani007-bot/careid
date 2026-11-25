const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@localhost:5432/postgres'
  });

  await client.connect();
  const checkRes = await client.query("SELECT 1 FROM pg_database WHERE datname = '360api_staging'");
  if (checkRes.rows.length === 0) {
    console.log('Database 360api_staging does not exist. Creating...');
    await client.query('CREATE DATABASE "360api_staging"');
    console.log('Database 360api_staging created successfully.');
  } else {
    console.log('Database 360api_staging already exists.');
  }
  await client.end();
}

main().catch(err => {
  console.error('Database setup error:', err);
  process.exit(1);
});

