
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const { InternalOnlyDeliveryAdapter } = require('/app/dist/src/modules/prescription/adapters/notification-delivery.adapter.js');
const { PrescriptionReminderService } = require('/app/dist/src/modules/prescription/prescription-reminder.service.js');

async function run() {
  const delivery = new InternalOnlyDeliveryAdapter(prisma);
  const service = new PrescriptionReminderService(prisma, delivery);

  const asOf = new Date('2026-11-23T13:36:37.981Z');
  const [worker1, worker2] = await Promise.all([
    service.processDueSchedule('884542e3-5dc6-4820-bd43-4990974599eb', asOf),
    service.processDueSchedule('884542e3-5dc6-4820-bd43-4990974599eb', asOf)
  ]);
  console.log('CONCURRENCY_RESULT:' + JSON.stringify({ worker1, worker2 }));
}

run().finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
