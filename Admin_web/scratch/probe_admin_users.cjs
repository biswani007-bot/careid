const fs = require('fs');
const https = require('https');

const tokenData = JSON.parse(fs.readFileSync('scratch/cached_admin_token.json', 'utf8'));
const token = tokenData.token;

https.get('https://360api.vnvision.in/api/v1/admin/users?limit=100', {
  headers: { 'Authorization': 'Bearer ' + token }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('HTTP Status:', res.statusCode);
      console.log('User count:', json.data?.length);
      console.log('Meta:', json.meta);
      console.log('First user:', JSON.stringify(json.data?.[0], null, 2));
      console.log('All users:');
      json.data?.forEach((u, i) => {
        console.log(`#${i+1} ID: ${u.id} | Phone: ${u.phone} | Roles: ${JSON.stringify(u.roles)} | Status: ${u.status} | patProfId: ${u.patientProfileId} | docProfId: ${u.doctorProfileId} | staffId: ${u.staffMemberId}`);
      });
      fs.writeFileSync('scratch/live_admin_users_dump.json', JSON.stringify(json, null, 2));
    } catch(e) {
      console.error(e.message, data);
    }
  });
});

