const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.staging' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function checkDoctor() {
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { id: 'fa502f2e-332c-4ec0-b6aa-83713216ec88' },
        { phone: '+16505550003' }
      ]
    },
    include: {
      userRoles: { include: { role: true } },
      doctorProfile: {
        include: {
          facilities: { include: { facility: true } },
          history: true,
        }
      }
    }
  });

  console.log('Doctor User:');
  if (user) {
    console.log({
      id: user.id,
      phone: user.phone,
      email: user.email,
      status: user.status,
      roles: user.userRoles?.map(r => r.role?.name),
      doctorProfile: user.doctorProfile ? {
        id: user.doctorProfile.id,
        fullName: user.doctorProfile.fullName,
        verificationStatus: user.doctorProfile.verificationStatus,
        verificationNotes: user.doctorProfile.verificationNotes,
        verifiedBy: user.doctorProfile.verifiedBy,
        verifiedAt: user.doctorProfile.verifiedAt,
        registrationExpiryDate: user.doctorProfile.registrationExpiryDate,
        facilities: user.doctorProfile.facilities?.map(f => ({
          facilityId: f.facilityId,
          facilityName: f.facility?.name,
          isActive: f.isActive,
          clinicalPrivileges: f.clinicalPrivileges
        })),
        history: user.doctorProfile.history,
      } : null
    });
  } else {
    console.log('User not found');
  }

  const profile = await prisma.doctorProfile.findUnique({
    where: { id: '1f06067b-e229-4707-84e2-afa27da2e4cd' },
    include: {
      user: true,
      facilities: true,
      history: true,
    }
  });
  console.log('\nDoctorProfile by ID 1f06067b-e229-4707-84e2-afa27da2e4cd:');
  console.log(profile ? {
    id: profile.id,
    userId: profile.userId,
    userPhone: profile.user?.phone,
    verificationStatus: profile.verificationStatus,
    verificationNotes: profile.verificationNotes,
    registrationExpiryDate: profile.registrationExpiryDate,
    facilitiesCount: profile.facilities?.length,
    history: profile.history,
  } : 'Profile not found');

  await prisma.$disconnect();
  await pool.end();
}

checkDoctor().catch(console.error);
