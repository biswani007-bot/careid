const https = require('https');
const fs = require('fs');

const TOKEN_CACHE_FILE = 'C:/Users/biswa/.gemini/antigravity/brain/e0785a94-53fe-4f28-b816-f2efe4edf49e/scratch/cached_token.json';
const token = JSON.parse(fs.readFileSync(TOKEN_CACHE_FILE, 'utf8')).token;

function req(path, method = 'GET', data = null) {
  return new Promise((resolve) => {
    const postData = data ? JSON.stringify(data) : null;
    const options = {
      hostname: '360api.vnvision.in',
      path,
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    };
    if (postData) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }
    const r = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    r.on('error', (err) => resolve({ status: 500, error: err.message }));
    if (postData) r.write(postData);
    r.end();
  });
}

async function testMutations() {
  console.log('=== TESTING FACILITY MUTATIONS ON LIVE BACKEND ===');

  // 1. Create a safe test facility
  const testRegNum = `REG-TEST-${Date.now().toString().slice(-6)}`;
  const createPayload = {
    name: 'CareID Test Diagnostic Facility',
    legalName: 'CareID Test Health Diagnostic LLC',
    registrationNumber: testRegNum,
    facilityType: 'DIAGNOSTIC_CENTER',
    ownershipType: 'PRIVATE',
    streetAddress: '123 Test Innovation Way',
    city: 'Boston',
    state: 'MA',
    country: 'United States',
    phone: '+16505550199',
    email: 'admin@testdiagnostic.careid.test',
  };

  console.log('\n--- 1. POST /api/v1/facilities ---');
  const createRes = await req('/api/v1/facilities', 'POST', createPayload);
  console.log('Create Response:', createRes.status, JSON.stringify(createRes.data, null, 2));

  const createdId = createRes.data?.data?.id || createRes.data?.id;

  if (!createdId) {
    console.error('Failed to create test facility. Halting mutation test.');
    return;
  }

  // 2. Fetch GET /api/v1/facilities/:id to confirm creation persisted
  console.log(`\n--- 2. GET /api/v1/facilities/${createdId} ---`);
  const getCreatedRes = await req(`/api/v1/facilities/${createdId}`);
  console.log('Get Created Response:', getCreatedRes.status, getCreatedRes.data?.data?.name);

  // 3. Test PUT /api/v1/facilities/:id (Update facility details)
  console.log(`\n--- 3. PUT /api/v1/facilities/${createdId} ---`);
  const updatePayload = {
    legalName: 'CareID Test Health Diagnostic & Imaging LLC',
    phone: '+16505550200',
  };
  const updateRes = await req(`/api/v1/facilities/${createdId}`, 'PUT', updatePayload);
  console.log('Update Response:', updateRes.status, JSON.stringify(updateRes.data, null, 2));

  // 4. Test POST /api/v1/facilities/:id/verify
  console.log(`\n--- 4. POST /api/v1/facilities/${createdId}/verify ---`);
  const verifyRes = await req(`/api/v1/facilities/${createdId}/verify`, 'POST', {
    reason: 'Verified by CareID Super Admin Quality Audit'
  });
  console.log('Verify Response:', verifyRes.status, JSON.stringify(verifyRes.data, null, 2));

  // 5. Test POST /api/v1/facilities/:id/suspend
  console.log(`\n--- 5. POST /api/v1/facilities/${createdId}/suspend ---`);
  const suspendRes = await req(`/api/v1/facilities/${createdId}/suspend`, 'POST', {
    reason: 'Temporary administrative audit hold'
  });
  console.log('Suspend Response:', suspendRes.status, JSON.stringify(suspendRes.data, null, 2));

  // 6. Test POST /api/v1/facilities/:id/restore
  console.log(`\n--- 6. POST /api/v1/facilities/${createdId}/restore ---`);
  const restoreRes = await req(`/api/v1/facilities/${createdId}/restore`, 'POST', {
    reason: 'Administrative audit resolved'
  });
  console.log('Restore Response:', restoreRes.status, JSON.stringify(restoreRes.data, null, 2));

  // 7. Test POST /api/v1/facilities/:id/assign-doctor
  console.log(`\n--- 7. POST /api/v1/facilities/${createdId}/assign-doctor ---`);
  // Get an existing doctor
  const docList = await req('/api/v1/doctors');
  const testDoctorId = docList.data?.[0]?.id;
  console.log('Using doctor ID for assignment:', testDoctorId);
  if (testDoctorId) {
    const assignRes = await req(`/api/v1/facilities/${createdId}/assign-doctor`, 'POST', {
      doctorId: testDoctorId,
      assignmentType: 'PRIMARY',
      privileges: ['OPD_CONSULTATION']
    });
    console.log('Assign Doctor Response:', assignRes.status, JSON.stringify(assignRes.data, null, 2));

    // Check doctors list for facility
    const facDocs = await req(`/api/v1/facilities/${createdId}/doctors`);
    console.log('Facility Doctors after assignment:', facDocs.status, JSON.stringify(facDocs.data, null, 2));
  }

  // 8. Clean up test record: DELETE /api/v1/facilities/:id
  console.log(`\n--- 8. DELETE /api/v1/facilities/${createdId} (Cleanup) ---`);
  const delRes = await req(`/api/v1/facilities/${createdId}`, 'DELETE');
  console.log('Delete Response:', delRes.status, JSON.stringify(delRes.data, null, 2));

  // Confirm delete persistence
  const getAfterDel = await req(`/api/v1/facilities/${createdId}`);
  console.log('Get after delete status:', getAfterDel.status, getAfterDel.data?.message || getAfterDel.data);
}

testMutations().catch(console.error);

