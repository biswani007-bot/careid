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

async function testUserCorrelations() {
  const token = (require('./cached_admin_token.json')).token;
  const headers = { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` };

  const [usersRes, patientsRes, doctorsRes] = await Promise.all([
    httpRequest({ hostname: '360api.vnvision.in', path: '/api/v1/admin/users', method: 'GET', headers }),
    httpRequest({ hostname: '360api.vnvision.in', path: '/api/v1/admin/patients?limit=50', method: 'GET', headers }),
    httpRequest({ hostname: '360api.vnvision.in', path: '/api/v1/doctors?limit=50', method: 'GET', headers })
  ]);

  const rawUsers = usersRes.body.data || usersRes.body || [];
  const rawPatients = patientsRes.body.data || patientsRes.body || [];
  const rawDoctors = doctorsRes.body.data || doctorsRes.body || [];

  console.log(`Correlating ${rawUsers.length} users with ${rawPatients.length} patients and ${rawDoctors.length} doctors...`);

  const patientMap = new Map();
  rawPatients.forEach(p => {
    if (p.userId) patientMap.set(p.userId, p);
    if (p.id) patientMap.set(p.id, p);
  });

  const doctorMap = new Map();
  rawDoctors.forEach(d => {
    if (d.userId) doctorMap.set(d.userId, d);
    if (d.id) doctorMap.set(d.id, d);
  });

  const correlated = rawUsers.map(u => {
    const p = (u.patientProfileId && patientMap.get(u.patientProfileId)) || patientMap.get(u.id);
    const d = (u.doctorProfileId && doctorMap.get(u.doctorProfileId)) || doctorMap.get(u.id);

    const name = p ? `${p.firstName} ${p.lastName}`.trim() : d ? d.fullName : u.phone ? `User (${u.phone})` : `User ${u.id.slice(0, 8)}`;
    const email = p?.email || d?.email || u.email || '—';
    const hvid = p?.patientNumber || d?.providerIdentifier || '—';
    const role = (u.roles && u.roles[0]) || 'PATIENT';

    return {
      id: u.id,
      name,
      phone: u.phone || '—',
      email,
      hvid,
      role,
      status: u.status,
      created: u.createdAt
    };
  });

  console.log('\nCorrelated Users:');
  correlated.forEach((c, idx) => {
    console.log(`${idx + 1}. [${c.role}] ${c.name} | Phone: ${c.phone} | Email: ${c.email} | HVID: ${c.hvid} | Status: ${c.status}`);
  });
}

testUserCorrelations().catch(console.error);

