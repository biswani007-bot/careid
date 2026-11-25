const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Instantiate Delivery Adapter and Reminder Service
const { InternalOnlyDeliveryAdapter } = require('/app/dist/src/modules/prescription/adapters/notification-delivery.adapter.js');
const { PrescriptionReminderService } = require('/app/dist/src/modules/prescription/prescription-reminder.service.js');
const { PrescriptionReminderScheduler } = require('/app/dist/src/modules/prescription/prescription-reminder.scheduler.js');

async function main() {
  const delivery = new InternalOnlyDeliveryAdapter(prisma);
  const service = new PrescriptionReminderService(prisma, delivery);
  const scheduler = new PrescriptionReminderScheduler(service);

  console.log('Scheduler instantiated successfully!');
  const dueSchedules = await service.getDueSchedules(new Date());
  console.log('Currently due schedules count:', dueSchedules.length);
}

main().finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
