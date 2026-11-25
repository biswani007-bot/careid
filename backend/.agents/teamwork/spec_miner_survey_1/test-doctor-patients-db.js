const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config({ path: 'c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/.env' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function testQuery() {
  const allAuthorizedIds = ['04be3d93-a0c5-49e9-93a3-d14cbd80c115'];
  const where = {
    OR: [
      { id: { in: allAuthorizedIds } },
      { userId: { in: allAuthorizedIds } },
    ],
  };

  console.log('Querying patientProfile.findMany...');
  try {
    const items = await prisma.patientProfile.findMany({
      where,
      skip: 0,
      take: 20,
      include: {
        user: {
          select: { id: true, phone: true, email: true, status: true },
        },
        emergencyContact: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
    console.log('Found items:', items.length);
  } catch (e) {
    console.error('patientProfile.findMany failed:', e);
  }

  try {
    const count = await prisma.patientProfile.count({ where });
    console.log('Count:', count);
  } catch (e) {
    console.error('patientProfile.count failed:', e);
  }
}

testQuery()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
