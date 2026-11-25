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

async function verifyLogic() {
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

  // Calculate live platform KPIs
  const kpis = {
    totalUsers: rawUsers.length,
    activeUsers: rawUsers.filter(u => u.status === 'ACTIVE').length,
    inactiveUsers: rawUsers.filter(u => u.status === 'INACTIVE' || u.status === 'BLOCKED').length,
    pendingUsers: rawUsers.filter(u => u.status === 'PENDING').length
  };

  console.log('Live Platform KPIs:', kpis);

  // Test search: 'John'
  const q = 'john';
  const matches = rawUsers.filter(u => {
    const p = (u.patientProfileId && patientMap.get(u.patientProfileId)) || patientMap.get(u.id);
    const d = (u.doctorProfileId && doctorMap.get(u.doctorProfileId)) || doctorMap.get(u.id);
    const name = p ? `${p.firstName} ${p.lastName}` : d ? d.fullName : `User (${u.phone})`;
    const hvid = p?.patientNumber || d?.providerIdentifier || '';
    const email = p?.email || d?.email || '';
    const phone = u.phone || '';
    return name.toLowerCase().includes(q) || hvid.toLowerCase().includes(q) || email.toLowerCase().includes(q) || phone.toLowerCase().includes(q);
  });
  console.log(`Search for "${q}": found ${matches.length} matches:`, matches.map(m => m.id));

  // Test filter: 'Admins'
  const admins = rawUsers.filter(u => (u.roles || []).some(r => r === 'ADMIN' || r === 'SUPER_ADMIN' || r === 'FACILITY_ADMIN'));
  console.log(`Filter "Admins": found ${admins.length} users:`, admins.map(a => `${a.phone} (${(a.roles||[]).join(',')})`));

  // Test filter: 'Doctors'
  const doctors = rawUsers.filter(u => (u.roles || []).includes('DOCTOR'));
  console.log(`Filter "Doctors": found ${doctors.length} users:`, doctors.map(d => `${d.phone} (${(d.roles||[]).join(',')})`));

  // Test filter: 'Patients'
  const patients = rawUsers.filter(u => (u.roles || []).includes('PATIENT'));
  console.log(`Filter "Patients": found ${patients.length} users:`, patients.map(p => p.phone));
}

verifyLogic().catch(console.error);

