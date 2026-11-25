const fs = require('fs');
const https = require('https');

const tokenData = JSON.parse(fs.readFileSync('scratch/cached_admin_token.json', 'utf8'));
const token = tokenData.token;

function apiGet(path) {
  return new Promise((resolve) => {
    https.get('https://360api.vnvision.in' + path, {
      headers: { 'Authorization': 'Bearer ' + token }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, text: data });
        }
      });
    }).on('error', err => resolve({ error: err.message }));
  });
}

async function run() {
  console.log('--- Checking User Details for User #12 (Patient Marcus Done) ---');
  const u12 = await apiGet('/api/v1/admin/users/fd2a7ed3-7c81-496e-82b8-beefbdc9a8e6');
  console.log('User #12 details:', JSON.stringify(u12.body, null, 2));

  console.log('\n--- Checking User Details for User #1 (+14155552671) ---');
  const u1 = await apiGet('/api/v1/admin/users/96101d74-161b-4455-af97-32c86497d941');
  console.log('User #1 details:', JSON.stringify(u1.body, null, 2));

  console.log('\n--- Checking All Patients from /api/v1/admin/patients ---');
  const patientsRes = await apiGet('/api/v1/admin/patients?limit=100');
  console.log('Patients count:', patientsRes.body?.data?.length);
  patientsRes.body?.data?.forEach(p => {
    console.log(`Patient ID: ${p.id} | userId: ${p.userId} | Name: ${p.firstName} ${p.lastName} | Phone: ${p.phone} | patientNumber: ${p.patientNumber}`);
  });

  console.log('\n--- Checking All Doctors from /api/v1/doctors ---');
  const doctorsRes = await apiGet('/api/v1/doctors?limit=100');
  console.log('Doctors count:', doctorsRes.body?.data?.length);
  doctorsRes.body?.data?.forEach(d => {
    console.log(`Doctor ID: ${d.id} | userId: ${d.userId} | Name: ${d.fullName} | Phone: ${d.phone} | RegNo: ${d.registrationNumber}`);
  });

  console.log('\n--- Checking All Staff from /api/v1/staff ---');
  const staffRes = await apiGet('/api/v1/staff?limit=100');
  console.log('Staff count:', staffRes.body?.data?.length);
  staffRes.body?.data?.forEach(s => {
    console.log(`Staff ID: ${s.id} | userId: ${s.userId} | Name: ${s.fullName} | Phone: ${s.phone} | designation: ${s.designation}`);
  });
}

run();

