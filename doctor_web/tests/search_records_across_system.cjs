const https = require('https');

function post(path, data) {
  return new Promise((resolve) => {
    const req = https.request({
      hostname: '360api.vnvision.in',
      path: '/api/v1' + path,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(b) }));
    });
    req.write(JSON.stringify(data));
    req.end();
  });
}

function get(path, token) {
  return new Promise((resolve) => {
    const req = https.request({
      hostname: '360api.vnvision.in',
      path: '/api/v1' + path,
      method: 'GET',
      headers: { Authorization: 'Bearer ' + token }
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(b) }); }
        catch { resolve({ status: res.statusCode, raw: b }); }
      });
    });
    req.end();
  });
}

async function search() {
  // 1. Check as Marcus Doe with search query
  const otpRes = await post('/auth/otp/request', { phone: '+16505550004' });
  const challengeId = otpRes.data?.data?.challengeId;
  const verifyRes = await post('/auth/otp/verify', { challengeId, otpCode: '123456' });
  const token = verifyRes.data?.data?.accessToken;

  const queries = [
    'Annual Routine Health Checkup',
    'Cardiology Consultation & Diagnostic Workup',
    'Automated Staging Verification Record',
    'Updated Health Checkup Record',
    'Annual',
    'Cardiology',
    'Staging',
  ];

  for (const q of queries) {
    const res = await get('/medical-records/search?q=' + encodeURIComponent(q), token);
    console.log(`Search [${q}] as Marcus: status=${res.status}, count=${res.data?.data?.length || res.data?.length || 0}`);
    if (res.data?.data?.length) {
      console.log('Sample:', res.data.data.map(x => ({ id: x.id, title: x.title })));
    }
  }

  // 2. Also check if there's any other patient in the system, e.g. Admin login (+16505550002)
  console.log('\nLogging in as Admin (+16505550002)...');
  const adminOtp = await post('/auth/otp/request', { phone: '+16505550002' });
  const adminChallenge = adminOtp.data?.data?.challengeId;
  if (adminChallenge) {
    const adminVer = await post('/auth/otp/verify', { challengeId: adminChallenge, otpCode: '123456' });
    const adminToken = adminVer.data?.data?.accessToken;
    if (adminToken) {
      console.log('Admin token acquired!');
      // List all patients
      const allPatients = await get('/admin/patients?limit=20', adminToken);
      console.log('Total patients in Admin:', allPatients.data?.meta?.totalItems || allPatients.data?.data?.length);
      const patients = allPatients.data?.data || [];
      for (const p of patients) {
        console.log(`- Patient: ${p.id} | ${p.patientNumber} | ${p.firstName} ${p.lastName} | Phone: ${p.phone}`);
      }

      // Search medical records platform-wide
      for (const q of queries.slice(0, 4)) {
        const adminSearch = await get('/admin/medical-records?q=' + encodeURIComponent(q), adminToken);
        console.log(`Admin search [${q}]: count=${adminSearch.data?.data?.length || adminSearch.data?.length || 0}`);
        if (adminSearch.data?.data?.length) {
          adminSearch.data.data.forEach(r => {
            console.log(`   Found: ID=${r.id}, patientProfileId=${r.patientProfileId}, title=${r.title}`);
          });
        }
      }
    }
  }
}

search();

