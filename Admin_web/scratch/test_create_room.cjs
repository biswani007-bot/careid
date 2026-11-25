const { getAdminToken } = require('./token_helper.cjs');

const FACILITY_ID = '3b6a3f47-ed9c-4010-bb1a-e0fdea5f4abb';
const DEPT_ID = '7c718d5b-a26d-462a-92ef-886bf8331a13';

async function testCreate() {
  const token = await getAdminToken();
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const payload = {
    roomNumber: 'RM-101',
    departmentId: DEPT_ID,
    roomName: 'Cardiology Exam Room 1',
    building: 'Main Building',
    block: 'Block A',
    floor: '1st Floor',
    wing: 'Cardiology Wing',
    roomCategory: 'CONSULTATION',
    capacity: 2,
  };

  console.log('Sending POST /api/v1/facilities/' + FACILITY_ID + '/rooms...');
  const res = await fetch(`https://360api.vnvision.in/api/v1/facilities/${FACILITY_ID}/rooms`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => null);
  console.log('Create response status:', res.status);
  console.log('Create response data:', JSON.stringify(data, null, 2));

  // List rooms again to see if it appears
  const listRes = await fetch(`https://360api.vnvision.in/api/v1/facilities/${FACILITY_ID}/rooms`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const listData = await listRes.json().catch(() => null);
  console.log('\nRooms in facility after create:', JSON.stringify(listData, null, 2));
}

testCreate();

