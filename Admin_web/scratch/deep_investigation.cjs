const { getFreshToken, apiGet } = require('./api_helper.cjs');

async function main() {
  console.log('=== DEEP RECONCILIATION INVESTIGATION ===\n');

  // 1. INVESTIGATE DOCTORS
  console.log('--- 1. DOCTORS INVESTIGATION ---');
  const docsRes = await apiGet('/api/v1/doctors?limit=50');
  const docs = docsRes.body?.data || [];
  console.log(`Total doctors returned from /api/v1/doctors: ${docs.length}`);
  
  const docStatusMap = {};
  docs.forEach((d, idx) => {
    const st = d.status || d.verificationStatus || 'NO_STATUS';
    docStatusMap[st] = (docStatusMap[st] || 0) + 1;
    console.log(`Doctor #${idx + 1}: ID=${d.id}, Name=${d.fullName}, status=${d.status}, verificationStatus=${d.verificationStatus}, isSuspended=${d.isSuspended}`);
  });
  console.log('Doctor status distribution:', docStatusMap);

  const docStatsRes = await apiGet('/api/v1/doctors/statistics');
  console.log('Doctor statistics API response:', docStatsRes.body);

  // 2. INVESTIGATE PATIENTS
  console.log('\n--- 2. PATIENTS INVESTIGATION ---');
  // Probe /api/v1/admin/patients with pagination to see all patients and find why limit=50 gave 500
  let allPatients = [];
  for (let p = 1; p <= 10; p++) {
    const res = await apiGet(`/api/v1/admin/patients?page=${p}&limit=5`);
    if (res.status === 200 && res.body?.data) {
      const pageData = Array.isArray(res.body.data) ? res.body.data : res.body.data.data || [];
      if (pageData.length === 0) break;
      allPatients.push(...pageData);
      console.log(`Page ${p} returned ${pageData.length} patients (meta: ${JSON.stringify(res.body.meta || {})})`);
    } else {
      console.log(`Page ${p} returned status ${res.status}:`, res.body?.message);
    }
  }
  console.log(`Total patients recovered across pages: ${allPatients.length}`);
  
  const patientStatusMap = {};
  const verificationMap = {};
  allPatients.forEach((pt, i) => {
    patientStatusMap[pt.userStatus || pt.status || 'NO_STATUS'] = (patientStatusMap[pt.userStatus || pt.status || 'NO_STATUS'] || 0) + 1;
    verificationMap[pt.profileStatus || pt.verificationStatus || 'NO_VERIF'] = (verificationMap[pt.profileStatus || pt.verificationStatus || 'NO_VERIF'] || 0) + 1;
    if (i < 5 || i >= allPatients.length - 3) {
      console.log(`Patient #${i + 1}: ID=${pt.id}, Name=${pt.firstName} ${pt.lastName}, userStatus=${pt.userStatus}, profileStatus=${pt.profileStatus}, verificationStatus=${pt.verificationStatus}`);
    }
  });
  console.log('Patient userStatus distribution:', patientStatusMap);
  console.log('Patient profileStatus distribution:', verificationMap);

  // Probe users with role=PATIENT
  const usersRes = await apiGet('/api/v1/admin/users?limit=100');
  const users = usersRes.body?.data?.data || (Array.isArray(usersRes.body?.data) ? usersRes.body.data : []);
  console.log(`\nTotal platform users: ${users.length} (meta: ${JSON.stringify(usersRes.body?.data?.meta || usersRes.body?.meta || {})})`);
  const patientUsers = users.filter(u => u.roles?.includes('PATIENT'));
  const doctorUsers = users.filter(u => u.roles?.includes('DOCTOR'));
  console.log(`Users with role PATIENT: ${patientUsers.length}`);
  console.log(`Users with role DOCTOR: ${doctorUsers.length}`);

  // 3. INVESTIGATE HEALTH RECORDS
  console.log('\n--- 3. HEALTH RECORDS INVESTIGATION ---');
  const recordsRes = await apiGet('/api/v1/admin/medical-records?limit=1');
  console.log('GET /api/v1/admin/medical-records meta:', recordsRes.body?.meta);

  // Check categories in medical records
  const sampleRecordsRes = await apiGet('/api/v1/admin/medical-records?limit=50');
  const sampleRecords = sampleRecordsRes.body?.data || [];
  const recCategories = {};
  sampleRecords.forEach(r => {
    const cat = r.category || r.recordType || 'NONE';
    recCategories[cat] = (recCategories[cat] || 0) + 1;
  });
  console.log('Sample 50 records categories:', recCategories);

  // 4. INVESTIGATE REPORTS ENDPOINTS
  console.log('\n--- 4. REPORTS ENDPOINTS INVESTIGATION ---');
  const execUnfiltered = await apiGet('/api/v1/reports/dashboard/executive');
  console.log('GET /api/v1/reports/dashboard/executive (NO params):', JSON.stringify(execUnfiltered.body?.data?.platformOverview, null, 2));

  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0).toISOString();
  const endToday = today.toISOString();
  const execToday = await apiGet(`/api/v1/reports/dashboard/executive?startDate=${encodeURIComponent(startToday)}&endDate=${encodeURIComponent(endToday)}`);
  console.log('GET /api/v1/reports/dashboard/executive (TODAY params):', JSON.stringify(execToday.body?.data?.platformOverview, null, 2));
}

main().catch(console.error);
