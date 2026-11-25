const fs = require('fs');
const token = JSON.parse(fs.readFileSync('scratch/cached_admin_token.json', 'utf8')).token;
const BASE_URL = 'https://360api.vnvision.in/api/v1';

async function testAll() {
  const usersRes = await fetch(`${BASE_URL}/admin/users?limit=100`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const usersData = await usersRes.json();
  const users = Array.isArray(usersData.data) ? usersData.data : (usersData.data?.data || []);

  const patientUsers = users.filter(u => (u.roles && u.roles.includes('PATIENT')) || u.patientProfileId);

  console.log(`Found ${patientUsers.length} patient users in /admin/users.\n`);

  const results = [];

  for (const u of patientUsers) {
    const profileId = u.patientProfileId;
    let statusDirect = null;
    let errorDirect = null;
    let dataDirect = null;

    if (profileId) {
      try {
        const pRes = await fetch(`${BASE_URL}/admin/patients/${profileId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        statusDirect = pRes.status;
        const body = await pRes.json().catch(() => null);
        if (pRes.status !== 200) {
          errorDirect = body?.message || body?.error || 'Failed';
        } else {
          dataDirect = body?.data;
        }
      } catch (err) {
        statusDirect = 'ERR';
        errorDirect = err.message;
      }
    }

    results.push({
      userId: u.id,
      fullName: u.fullName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'No Name',
      phone: u.phone,
      userStatus: u.status,
      patientProfileId: profileId,
      profileHttpStatus: statusDirect,
      profileError: errorDirect,
      hasClinicalData: !!dataDirect,
      patientNumber: dataDirect?.patientNumber || null,
      profileStatus: dataDirect?.profileStatus || null,
    });
  }

  console.table(results);

  // Group by profileHttpStatus
  const summary = {};
  results.forEach(r => {
    const key = `HTTP_${r.profileHttpStatus || 'NO_PROFILE_ID'}_UserStatus_${r.userStatus}`;
    summary[key] = (summary[key] || 0) + 1;
  });
  console.log('\nSummary Distribution:', summary);

  fs.writeFileSync('scratch/all_patient_profiles_audit.json', JSON.stringify(results, null, 2));
}

testAll().catch(console.error);
