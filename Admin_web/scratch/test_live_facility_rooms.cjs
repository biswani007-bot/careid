const { getAdminToken } = require('./token_helper.cjs');

const FACILITY_ID = '3b6a3f47-ed9c-4010-bb1a-e0fdea5f4abb';

async function probe() {
  const token = await getAdminToken();
  const headers = { Authorization: `Bearer ${token}` };

  console.log(`--- Probing Facility Detail & Rooms for ${FACILITY_ID} ---`);

  // 1. Facility detail
  console.log('1. GET /api/v1/facilities/' + FACILITY_ID);
  const fRes = await fetch(`https://360api.vnvision.in/api/v1/facilities/${FACILITY_ID}`, { headers });
  const fData = await fRes.json().catch(() => null);
  console.log('Facility status:', fRes.status, fData?.success ? fData.data?.name : fData);

  // 2. Facility departments
  console.log('\n2. GET /api/v1/facilities/' + FACILITY_ID + '/departments');
  const dRes = await fetch(`https://360api.vnvision.in/api/v1/facilities/${FACILITY_ID}/departments`, { headers });
  const dData = await dRes.json().catch(() => null);
  console.log('Departments status:', dRes.status, 'Count:', Array.isArray(dData?.data) ? dData.data.length : dData);
  if (Array.isArray(dData?.data) && dData.data.length > 0) {
    console.log('Sample Department:', dData.data[0]);
  }

  // 3. Facility rooms
  console.log('\n3. GET /api/v1/facilities/' + FACILITY_ID + '/rooms');
  const rRes = await fetch(`https://360api.vnvision.in/api/v1/facilities/${FACILITY_ID}/rooms`, { headers });
  const rData = await rRes.json().catch(() => null);
  console.log('Rooms status:', rRes.status, 'Response:', JSON.stringify(rData, null, 2));

  // 4. Test other room operations to verify if any undocumented ones exist
  console.log('\n4. Probing for PUT /api/v1/facilities/' + FACILITY_ID + '/rooms/test-id');
  const putRes = await fetch(`https://360api.vnvision.in/api/v1/facilities/${FACILITY_ID}/rooms/test-id`, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomName: 'Test' })
  });
  console.log('PUT status:', putRes.status);

  console.log('\n5. Probing for DELETE /api/v1/facilities/' + FACILITY_ID + '/rooms/test-id');
  const delRes = await fetch(`https://360api.vnvision.in/api/v1/facilities/${FACILITY_ID}/rooms/test-id`, {
    method: 'DELETE',
    headers
  });
  console.log('DELETE status:', delRes.status);
}

probe();

