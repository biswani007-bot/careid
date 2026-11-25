const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function verifyAccounts() {
  console.log('================================================================');
  console.log('Phase 3: Seeded Local Test Accounts & Profile Inspection');
  console.log('================================================================');

  const phones = [
    '+16505550001',
    '+16505550002',
    '+16505550003',
    '+16505550004',
    '+16505550005',
    '+16505550006',
    '+16505550007',
  ];

  for (const phone of phones) {
    const user = await prisma.user.findUnique({
      where: { phone },
      include: {
        userRoles: { include: { role: true } },
        doctorProfile: true,
        patientProfile: {
          include: {
            healthCard: true,
            medicalReports: true,
            insurancePolicy: true,
            familyMembers: true,
          },
        },
        staffMember: true,
        userSessions: { take: 3 },
      },
    });

    if (!user) {
      console.log(`[NOT_FOUND] User with phone ${phone} does NOT exist!`);
      continue;
    }

    const roles = user.userRoles.map((ur) => ur.role.name);
    console.log(`\nUser: ${user.email || phone}`);
    console.log(`  ID:             ${user.id}`);
    console.log(`  Phone:          ${user.phone}`);
    console.log(`  Email:          ${user.email || 'N/A'}`);
    console.log(`  Status:         ${user.status}`);
    console.log(`  Roles:          ${roles.join(', ')}`);
    console.log(`  hasPasswordHash:${!!user.passwordHash}`);

    if (user.doctorProfile) {
      console.log(`  Doctor Profile: Found (ID: ${user.doctorProfile.id}, Name: ${user.doctorProfile.name || 'N/A'}, License: ${user.doctorProfile.licenseNumber || 'N/A'})`);
    }
    if (user.patientProfile) {
      console.log(`  Patient Profile:Found (ID: ${user.patientProfile.id}, Name: ${user.patientProfile.firstName || ''} ${user.patientProfile.lastName || ''})`);
      console.log(`    Health Card:  ${user.patientProfile.healthCard ? 'Present (CardNumber: ' + user.patientProfile.healthCard.cardNumber + ')' : 'None'}`);
      console.log(`    Reports:      ${user.patientProfile.medicalReports?.length || 0}`);
      console.log(`    Insurance:    ${user.patientProfile.insurancePolicy ? 'Present' : 'None'}`);
      console.log(`    Family Members: ${user.patientProfile.familyMembers?.length || 0}`);
    }
    if (user.staffMember) {
      console.log(`  Staff Member:   Found (ID: ${user.staffMember.id}, Code: ${user.staffMember.employeeCode || 'N/A'})`);
    }
  }
}

verifyAccounts()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
