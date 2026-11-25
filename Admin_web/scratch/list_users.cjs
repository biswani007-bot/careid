const fs = require('fs');
const usersRes = JSON.parse(fs.readFileSync('scratch/live_users_response.json'));
const list = usersRes.json.data.data;
list.forEach((u, i) => {
  console.log(`[${i}] ID: ${u.id} | Phone: ${u.phone} | Email: ${u.email || 'none'} | Roles: ${u.roles?.join(',')} | DocProfileId: ${u.doctorProfileId || 'none'} | PatientProfileId: ${u.patientProfileId || 'none'}`);
});

