
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const { InternalOnlyDeliveryAdapter } = require('/app/dist/src/modules/prescription/adapters/notification-delivery.adapter.js');
const { PrescriptionReminderService } = require('/app/dist/src/modules/prescription/prescription-reminder.service.js');
const { PrescriptionReminderScheduler } = require('/app/dist/src/modules/prescription/prescription-reminder.scheduler.js');

async function run() {
  const delivery = new InternalOnlyDeliveryAdapter(prisma);
  const service = new PrescriptionReminderService(prisma, delivery);
  const scheduler = new PrescriptionReminderScheduler(service);

  const asOf = new Date('2026-11-25T13:36:15.895Z');
  const res = await scheduler.triggerProcessingCycle(asOf);
  console.log('CYCLE_RESULT:' + JSON.stringify(res));
}

run().finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
