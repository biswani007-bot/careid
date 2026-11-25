const fs = require('fs');
const tokenData = JSON.parse(fs.readFileSync('scratch/cached_token.json', 'utf8'));
const token = tokenData.access_token || tokenData.token;

async function run() {
  const res = await fetch('https://360api.vnvision.in/api/v1/admin/users?limit=100', {
    headers: { Authorization: 'Bearer ' + token }
  }).then(r => r.json());

  const users = (res.data && res.data.data) || res.data || [];
  console.log('Total users:', users.length);
  users.forEach((u, idx) => {
    console.log(
      '[' + (idx + 1) + '] ID: ' + u.id +
      ' | Phone: ' + u.phone +
      ' | Email: ' + (u.email || 'none') +
      ' | Roles: ' + JSON.stringify(u.roles) +
      ' | DocId: ' + (u.doctorProfileId || 'none') +
      ' | PatId: ' + (u.patientProfileId || 'none') +
      ' | StaffId: ' + (u.staffMemberId || 'none')
    );
  });
}

run().catch(console.error);

