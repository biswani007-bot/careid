const fs = require('fs');
const https = require('https');
const tokenData = JSON.parse(fs.readFileSync('scratch/cached_admin_token.json', 'utf8'));

function testUrl(url) {
  return new Promise((resolve) => {
    https.get(url, {
      headers: { 'Authorization': 'Bearer ' + tokenData.token, 'Accept': 'application/json' }
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(b) });
        } catch {
          resolve({ status: res.statusCode, body: b });
        }
      });
    });
  });
}

async function run() {
  const usersRes = await testUrl('https://360api.vnvision.in/api/v1/admin/users?limit=100');
  const users = usersRes.body?.data?.data || [];
  const patients = users.filter(u => u.roles?.includes('PATIENT'));
  console.log(`Found ${patients.length} patient users in /admin/users:`);

  const results = [];
  for (const p of patients) {
    const profId = p.patientProfileId;
    const uid = p.id;
    let resProfile = null;
    if (profId) {
      resProfile = await testUrl(`https://360api.vnvision.in/api/v1/admin/patients/${profId}`);
    }
    const resUser = await testUrl(`https://360api.vnvision.in/api/v1/admin/patients/${uid}`);
    results.push({
      name: p.fullName || p.phone,
      phone: p.phone,
      userStatus: p.status,
      userId: uid,
      profId,
      byProfileStatus: resProfile ? resProfile.status : 'NO_PROFILE_ID',
      byUserStatus: resUser.status,
      byProfileMsg: resProfile?.body?.message,
      byUserMsg: resUser?.body?.message
    });
  }

  console.table(results);

  const statusCounts = results.reduce((acc, r) => {
    const key = `prof_${r.byProfileStatus} / user_${r.byUserStatus}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  console.log('Status breakdown:', statusCounts);

  const errors500 = results.filter(r => r.byProfileStatus === 500 || r.byUserStatus === 500);
  console.log('Records returning 500:', JSON.stringify(errors500, null, 2));
}

run();

