const fs = require('fs');
const token = JSON.parse(fs.readFileSync('scratch/cached_admin_token.json', 'utf8')).token;

const BASE_URL = 'https://360api.vnvision.in/api/v1';

async function probe() {
  console.log('=== DEEP AUDIT: PATIENT PROFILE 500 ERROR ===\n');

  // 1. Probe the failing patient endpoint directly
  console.log('1. Probing GET /api/v1/admin/patients/9a4ad630-de90-40e9-b4cd-1d76f8f63069');
  const resFailing = await fetch(`${BASE_URL}/admin/patients/9a4ad630-de90-40e9-b4cd-1d76f8f63069`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });
  console.log('HTTP Status:', resFailing.status, resFailing.statusText);
  const textFailing = await resFailing.text();
  console.log('Response Body:', textFailing);
  console.log('Response Headers:', Object.fromEntries(resFailing.headers.entries()));

  // 2. Probe using the linked user ID on the patient endpoint
  console.log('\n2. Probing GET /api/v1/admin/patients/7904ad9d-b141-471d-9451-4aa48ad3eba7 (User ID)');
  const resUserOnPatient = await fetch(`${BASE_URL}/admin/patients/7904ad9d-b141-471d-9451-4aa48ad3eba7`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('HTTP Status:', resUserOnPatient.status);
  console.log('Response Body:', await resUserOnPatient.text());

  // 3. Probe the linked user directly via admin/users
  console.log('\n3. Probing GET /api/v1/admin/users/7904ad9d-b141-471d-9451-4aa48ad3eba7');
  const resUser = await fetch(`${BASE_URL}/admin/users/7904ad9d-b141-471d-9451-4aa48ad3eba7`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('HTTP Status:', resUser.status);
  const userJson = await resUser.json();
  console.log('User Data:', JSON.stringify(userJson, null, 2));

  // 4. Fetch all patients from /api/v1/admin/patients
  console.log('\n4. Fetching all patients from /api/v1/admin/patients?limit=100');
  const resAllPatients = await fetch(`${BASE_URL}/admin/patients?limit=100`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const allPatientsJson = await resAllPatients.json();
  const patientList = Array.isArray(allPatientsJson.data) ? allPatientsJson.data : allPatientsJson.data?.data || [];
  console.log(`Total patients in directory: ${patientList.length}`);

  const targetInList = patientList.find(p => p.id === '9a4ad630-de90-40e9-b4cd-1d76f8f63069' || p.userId === '7904ad9d-b141-471d-9451-4aa48ad3eba7');
  console.log('Target patient in admin/patients listing:', targetInList);

  // Group patients by status
  const byStatus = {};
  patientList.forEach(p => {
    const s = p.user?.status || p.status || 'UNKNOWN';
    byStatus[s] = (byStatus[s] || 0) + 1;
  });
  console.log('\nPatient counts by user.status:', byStatus);

  // 5. Probe one patient from each status
  console.log('\n5. Probing sample patients by status:');
  for (const [st, count] of Object.entries(byStatus)) {
    const sample = patientList.find(p => (p.user?.status || p.status) === st);
    if (sample) {
      const probeRes = await fetch(`${BASE_URL}/admin/patients/${sample.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log(`- Sample [${st}] (ID: ${sample.id}): HTTP ${probeRes.status}`);
      if (probeRes.status !== 200) {
        console.log('  Response:', await probeRes.text());
      }
    }
  }

  // 6. Check non-existent UUID
  console.log('\n6. Probing non-existent UUID: 00000000-0000-0000-0000-000000000000');
  const resNonExistent = await fetch(`${BASE_URL}/admin/patients/00000000-0000-0000-0000-000000000000`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('HTTP Status for non-existent:', resNonExistent.status);
  console.log('Response Body:', await resNonExistent.text());

  // 7. Check unauthorized request
  console.log('\n7. Probing without token (Unauthorized)');
  const resNoAuth = await fetch(`${BASE_URL}/admin/patients/9a4ad630-de90-40e9-b4cd-1d76f8f63069`);
  console.log('HTTP Status for unauthenticated:', resNoAuth.status);
  console.log('Response Body:', await resNoAuth.text());
}

probe().catch(console.error);

