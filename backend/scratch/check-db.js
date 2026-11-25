require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/hvapi_db?schema=public';
const pool = new Pool({ connectionString, connectionTimeoutMillis: 3000 });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function check() {
  try {
    await prisma.$connect();
    console.log('Database connected successfully!');
    const usersCount = await prisma.user.count();
    console.log('User count in DB:', usersCount);
    await prisma.$disconnect();
    await pool.end();
  } catch (err) {
    console.error('DB error:', err.message);
    await pool.end();
  }
}
check();
