const fs = require('fs');

const data = JSON.parse(fs.readFileSync('scratch/live_users_response.json', 'utf8'));
const users = data.data || data;

console.log('Total users:', users.length);
const statuses = {};
const roles = {};

users.forEach(u => {
  statuses[u.status] = (statuses[u.status] || 0) + 1;
  (u.roles || []).forEach(r => {
    roles[r] = (roles[r] || 0) + 1;
  });
});

console.log('Statuses count:', statuses);
console.log('Roles count:', roles);
console.log('\nAll users summary:');
users.forEach((u, i) => {
  console.log(`${i+1}. ID: ${u.id} | Phone: ${u.phone} | Status: ${u.status} | Roles: ${(u.roles||[]).join(', ')} | Created: ${u.createdAt} | PatientProfileId: ${u.patientProfileId || 'none'} | DoctorProfileId: ${u.doctorProfileId || 'none'}`);
});

