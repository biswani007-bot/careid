const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function checkHash() {
  const superadmin = await prisma.user.findUnique({
    where: { email: 'superadmin@careid.test' },
  });
  const admin = await prisma.user.findUnique({
    where: { email: 'admin@careid.test' },
  });

  const candidates = [
    'SecureSuperAdminPassword123!',
    'SecureAdminPassword123!',
    'Admin@123',
    'Admin123!',
  ];

  for (const c of candidates) {
    if (superadmin?.passwordHash && (await bcrypt.compare(c, superadmin.passwordHash))) {
      console.log('SUPERADMIN MATCH:', c);
    }
    if (admin?.passwordHash && (await bcrypt.compare(c, admin.passwordHash))) {
      console.log('ADMIN MATCH:', c);
    }
  }
}

checkHash()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
