const { getAdminToken, httpRequest } = require('./token_helper.cjs');

async function main() {
  const token = await getAdminToken();
  async function apiGet(path) {
    return await httpRequest({
      hostname: '360api.vnvision.in',
      path,
      method: 'GET',
      headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
    });
  }

  console.log('================ 1. PATIENTS REGISTRATION DATES ================');
  // Fetch patients across all pages (limit=10, 5, etc.)
  let allPatients = [];
  // Probe page 1, 2, 4, 5 (recall page 3 item 11 had 500 error, let's fetch resiliently or probe limit=100)
  const p1 = await apiGet('/api/v1/admin/patients?page=1&limit=10');
  console.log('Page 1 (limit=10) status:', p1.status, 'items:', p1.body?.data?.length);
  if (p1.body?.data) allPatients.push(...p1.body.data);

  // Let's test if limit=50 works or page 2
  const p2 = await apiGet('/api/v1/admin/patients?page=2&limit=10');
  console.log('Page 2 (limit=10) status:', p2.status, 'items:', p2.body?.data?.length);
  if (p2.body?.data) allPatients.push(...p2.body.data);

  const p3 = await apiGet('/api/v1/admin/patients?page=3&limit=10');
  console.log('Page 3 (limit=10) status:', p3.status, 'items:', p3.body?.data?.length);
  if (p3.body?.data) allPatients.push(...p3.body.data);

  // Let's also fetch page 1..5 with limit=5
  if (allPatients.length < 20) {
    allPatients = [];
    for (let pg = 1; pg <= 6; pg++) {
      const res = await apiGet(`/api/v1/admin/patients?page=${pg}&limit=5`);
      if (res.status === 200 && Array.isArray(res.body?.data)) {
        allPatients.push(...res.body.data);
      } else {
        console.log(`Page ${pg} (limit=5) status: ${res.status}`);
      }
    }
  }

  console.log(`\nFound ${allPatients.length} patient profiles in total:`);
  for (const p of allPatients) {
    console.log(`- Patient ${p.id.slice(0, 8)} | ${p.patientNumber || 'No-num'} | createdAt: ${p.createdAt} | updatedAt: ${p.updatedAt}`);
  }

  console.log('\n================ 2. DOCTORS REGISTRATION DATES ================');
  const dRes = await apiGet('/api/v1/doctors?limit=50');
  const allDoctors = dRes.body?.data || [];
  console.log(`Found ${allDoctors.length} doctors:`);
  for (const d of allDoctors) {
    console.log(`- Dr. ${d.fullName} (${d.id.slice(0, 8)}) | createdAt: ${d.createdAt} | updatedAt: ${d.updatedAt} | status: ${d.verificationStatus}`);
  }

  console.log('\n================ 3. MEDICAL RECORDS DATES ================');
  const mrMeta = await apiGet('/api/v1/admin/medical-records?page=1&limit=1');
  console.log('Medical records total:', mrMeta.body?.meta?.totalItems);
  
  // Sample records across different pages
  const mrSample1 = await apiGet('/api/v1/admin/medical-records?page=1&limit=5');
  console.log('Sample Page 1 records:');
  for (const r of mrSample1.body?.data || []) {
    console.log(`- Record ${r.id.slice(0, 8)} | createdAt: ${r.createdAt} | recordDate: ${r.recordDate} | date: ${r.date}`);
  }

  const mrSampleLast = await apiGet('/api/v1/admin/medical-records?page=61&limit=5');
  console.log('\nSample Page 61 records:');
  for (const r of mrSampleLast.body?.data || []) {
    console.log(`- Record ${r.id.slice(0, 8)} | createdAt: ${r.createdAt} | recordDate: ${r.recordDate} | date: ${r.date}`);
  }
}

main().catch(console.error);

