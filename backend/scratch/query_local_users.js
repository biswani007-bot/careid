const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, phone: true, passwordHash: true, status: true },
    take: 20
  });
  console.log('Local users count:', users.length);
  console.log(users.map(u => ({ email: u.email, phone: u.phone, hasPassword: !!u.passwordHash, status: u.status })));
  await prisma.$disconnect();
}
main().catch(e => {
  console.error(e.message);
  process.exit(1);
});

