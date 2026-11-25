import jwt from 'jsonwebtoken';

const JWT_SECRET = 'f31da8a1a3beea31de4da78415f2f15276a85f76be99c16aa3ff51c903466237';
const BASE_URL = 'http://localhost:3001/api/v1';

function createToken(userId: string, roles: string[]): string {
  return jwt.sign(
    { sub: userId, userId, id: userId, roles, role: roles[0], permissions: [] },
    JWT_SECRET,
    { expiresIn: '2h' },
  );
}

const adminToken = createToken('eff36819-1c8a-4209-b97c-8746d461215b', ['ADMIN', 'SUPER_ADMIN']);
const doctorToken = createToken('dbe69fae-cdc9-4069-8a7a-ede8d4040f5e', ['DOCTOR']);
const patientToken = createToken('04be3d93-a0c5-49e9-93a3-d14cbd80c115', ['PATIENT']);

async function runVerification() {
  console.log('--- CAREID CR-08 LIVE INTEGRATION VERIFICATION ---');

  // 1. Admin Web Prescription List (GET /prescriptions)
  console.log('\n[Step 1] Fetching prescriptions via GET /prescriptions (Admin Web oversight)...');
  const listRes = await fetch(`${BASE_URL}/prescriptions`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log(`Status: ${listRes.status}`);
  if (!listRes.ok) throw new Error(`GET /prescriptions failed: ${listRes.statusText}`);
  const listData: any = await listRes.json();
  const items = Array.isArray(listData) ? listData : listData.data;
  console.log(`Successfully retrieved ${items.length} prescriptions`);

  const targetRx = items.find((p: any) => p.id === '8419d000-22fd-43a3-8185-ce520de36396');
  console.log(`Target Rx 8419d000-22fd-43a3-8185-ce520de36396 before collection:`, {
    status: targetRx?.status,
    pickupReminderEnabled: targetRx?.pickupReminderEnabled,
    pickupReminderHours: targetRx?.pickupReminderHours,
    collected: targetRx?.collected,
  });

  // 2. Mark Prescription as Collected (PATCH /prescriptions/:id/collect)
  console.log('\n[Step 2] Marking prescription as collected via PATCH /prescriptions/:id/collect...');
  const collectRes = await fetch(`${BASE_URL}/prescriptions/8419d000-22fd-43a3-8185-ce520de36396/collect`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
  });
  console.log(`Status: ${collectRes.status}`);
  if (!collectRes.ok) throw new Error(`PATCH /collect failed: ${collectRes.statusText}`);
  const collectData: any = await collectRes.json();
  const collectedItem = collectData.data || collectData;
  console.log(`Prescription marked collected response:`, {
    id: collectedItem.id,
    collected: collectedItem.collected,
    collectedAt: collectedItem.collectedAt,
    pickupReminderEnabled: collectedItem.pickupReminderEnabled,
  });

  if (collectedItem.collected !== true || collectedItem.pickupReminderEnabled !== false) {
    throw new Error('Prescription collection did not disable reminder!');
  }

  // 3. Repeated Collection Call (Idempotency test)
  console.log('\n[Step 3] Testing idempotency with repeated PATCH /collect...');
  const repeatCollectRes = await fetch(`${BASE_URL}/prescriptions/8419d000-22fd-43a3-8185-ce520de36396/collect`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${doctorToken}`,
      'Content-Type': 'application/json',
    },
  });
  console.log(`Repeat status: ${repeatCollectRes.status}`);
  if (!repeatCollectRes.ok) throw new Error(`Repeat PATCH /collect failed: ${repeatCollectRes.statusText}`);
  const repeatData: any = await repeatCollectRes.json();
  const repeatItem = repeatData.data || repeatData;
  console.log(`Idempotent response collected status: ${repeatItem.collected}`);

  // 4. Update reminder settings on another active prescription
  console.log('\n[Step 4] Updating reminder settings via PATCH /prescriptions/:id/reminder...');
  const updateReminderRes = await fetch(`${BASE_URL}/prescriptions/520b7983-6393-48b7-bb1a-9bbf1233b8c0/reminder`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${doctorToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      enabled: true,
      hours: 6,
    }),
  });
  console.log(`Update reminder status: ${updateReminderRes.status}`);
  if (!updateReminderRes.ok) throw new Error(`PATCH /reminder failed: ${updateReminderRes.statusText}`);
  const updateData: any = await updateReminderRes.json();
  const updatedRx = updateData.data || updateData;
  console.log(`Updated Rx reminder settings:`, {
    id: updatedRx.id,
    pickupReminderEnabled: updatedRx.pickupReminderEnabled,
    pickupReminderHours: updatedRx.pickupReminderHours,
  });

  // 5. Patient Security: Unauthorized Patient cannot modify reminders
  console.log('\n[Step 5] Verifying patient cannot call PATCH /prescriptions/:id/collect (RBAC check)...');
  const unauthorizedRes = await fetch(`${BASE_URL}/prescriptions/520b7983-6393-48b7-bb1a-9bbf1233b8c0/collect`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${patientToken}`,
      'Content-Type': 'application/json',
    },
  });
  console.log(`Unauthorized patient status: ${unauthorizedRes.status} (Expected 403 Forbidden)`);
  if (unauthorizedRes.status !== 403) {
    throw new Error(`Expected 403 Forbidden but received ${unauthorizedRes.status}`);
  }

  console.log('\n--- ALL LIVE INTEGRATION CHECKS PASSED SUCCESSFULLY ---');
}

runVerification().catch((err) => {
  console.error('Integration verification failed:', err);
  process.exit(1);
});
