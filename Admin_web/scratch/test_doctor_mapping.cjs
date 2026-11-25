const fs = require('fs');

// Simulate fetchUsers mapping logic
const usersRes = JSON.parse(fs.readFileSync('scratch/live_users_response.json'));
const doctorsRes = JSON.parse(fs.readFileSync('scratch/live_doctors_response.json'));

const rawUsers = usersRes.json.data.data;
const rawDoctors = doctorsRes.json.data;

const doctorMap = new Map();
rawDoctors.forEach((d) => {
  if (d.userId) doctorMap.set(d.userId, d);
  if (d.id) doctorMap.set(d.id, d);
});

console.log('doctorMap size:', doctorMap.size);
for (const [k, v] of doctorMap.entries()) {
  console.log('doctorMap key:', k, '->', v.fullName);
}

rawUsers.forEach((u) => {
  if (u.roles && u.roles.includes('DOCTOR')) {
    const doctor = (u.doctorProfileId && doctorMap.get(u.doctorProfileId)) || doctorMap.get(u.id);
    console.log(`User ${u.id} (${u.phone}, ${u.email || 'no-email'}): doctor =`, doctor ? doctor.fullName : 'NOT FOUND');
  }
});

