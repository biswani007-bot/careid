const https = require('https');

function httpRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const opts = { ...options, rejectUnauthorized: false };
    const r = https.request(opts, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        let json;
        try { json = JSON.parse(body); } catch(e) { json = body; }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });
    r.on('error', reject);
    if (postData) r.write(postData);
    r.end();
  });
}

async function checkDirectoryLists() {
  const token = (require('./cached_admin_token.json')).token;
  const headers = { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` };

  const res1 = await httpRequest({
    hostname: '360api.vnvision.in',
    path: '/api/v1/admin/patients?limit=50',
    method: 'GET',
    headers
  });
  console.log('Patients count:', (res1.body.data || res1.body)?.length);
  const patients = res1.body.data || res1.body;
  if (Array.isArray(patients)) {
    patients.forEach(p => console.log(`Patient: userId=${p.userId} name=${p.firstName} ${p.lastName} phone=${p.phone} email=${p.email} hvid=${p.patientNumber}`));
  }

  const res2 = await httpRequest({
    hostname: '360api.vnvision.in',
    path: '/api/v1/doctors?limit=50',
    method: 'GET',
    headers
  });
  console.log('\nDoctors count:', (res2.body.data || res2.body)?.length);
  const doctors = res2.body.data || res2.body;
  if (Array.isArray(doctors)) {
    doctors.forEach(d => console.log(`Doctor: userId=${d.userId} name=${d.fullName} phone=${d.phone} hvid=${d.providerIdentifier}`));
  }
}

checkDirectoryLists().catch(console.error);

