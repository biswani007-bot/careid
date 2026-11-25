const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.staging' });

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/360api_staging?schema=public';
console.log('Connecting to:', connectionString);
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function checkDb() {
  try {
    console.log('Testing query on treatment_offer_seq...');
    const result = await prisma.$queryRaw`SELECT nextval('treatment_offer_seq')::text AS seq`;
    console.log('treatment_offer_seq result:', result);
  } catch (err) {
    console.error('Error querying treatment_offer_seq:', err.message);
  }

  try {
    console.log('Testing query on financing_offer_seq...');
    const result2 = await prisma.$queryRaw`SELECT nextval('financing_offer_seq')::text AS seq`;
    console.log('financing_offer_seq result:', result2);
  } catch (err) {
    console.error('Error querying financing_offer_seq:', err.message);
  }

  try {
    console.log('Checking treatment_offers count...');
    const count = await prisma.treatmentOffer.count();
    console.log('treatment_offers count:', count);
    const sample = await prisma.treatmentOffer.findFirst({
      include: {
        procedures: true,
        history: true,
      }
    });
    console.log('Sample treatment offer:', sample ? { id: sample.id, offerNumber: sample.offerNumber, status: sample.status } : 'none');
  } catch (err) {
    console.error('Error querying treatmentOffer table:', err.message);
  }

  await prisma.$disconnect();
  await pool.end();
}

checkDb();
