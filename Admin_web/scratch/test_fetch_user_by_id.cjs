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

async function testFetchUserById() {
  const token = (require('./cached_admin_token.json')).token;
  const headers = { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` };

  async function getUserDetails(id) {
    let uRes = await httpRequest({ hostname: '360api.vnvision.in', path: `/api/v1/admin/users/${id}`, method: 'GET', headers });
    let u = uRes.body.data;
    if (!u) {
      const list = await httpRequest({ hostname: '360api.vnvision.in', path: '/api/v1/admin/users', method: 'GET', headers });
      u = list.body.data?.[0];
    }
    if (!u) return null;

    let p = null, d = null;
    if (u.patientProfileId) {
      const pr = await httpRequest({ hostname: '360api.vnvision.in', path: `/api/v1/admin/patients/${u.patientProfileId}`, method: 'GET', headers });
      p = pr.body.data;
    }
    if (u.doctorProfileId) {
      const dr = await httpRequest({ hostname: '360api.vnvision.in', path: `/api/v1/doctors/${u.doctorProfileId}`, method: 'GET', headers });
      d = dr.body.data;
    }
    return { user: u, patient: p, doctor: d };
  }

  const doctorUser = await getUserDetails('fa502f2e-332c-4ec0-b6aa-83713216ec88');
  console.log('Doctor User details:', {
    name: doctorUser.doctor?.fullName,
    role: doctorUser.user.roles,
    hvid: doctorUser.doctor?.providerIdentifier,
    phone: doctorUser.user.phone,
    spec: doctorUser.doctor?.primarySpecialization
  });

  const patientUser = await getUserDetails('fd2a7ed3-7c81-496e-82b8-beefbdc9a8e6');
  console.log('Patient User details:', {
    name: `${patientUser.patient?.firstName} ${patientUser.patient?.lastName}`,
    role: patientUser.user.roles,
    hvid: patientUser.patient?.patientNumber,
    phone: patientUser.user.phone,
    dob: patientUser.patient?.dateOfBirth
  });
}

testFetchUserById().catch(console.error);

