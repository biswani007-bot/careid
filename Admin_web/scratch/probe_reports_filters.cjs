const { getAdminToken, httpRequest } = require('./token_helper.cjs');

async function main() {
  const token = await getAdminToken();
  console.log('✓ Obtained token');

  async function apiGet(path) {
    const res = await httpRequest({
      hostname: '360api.vnvision.in',
      path: path,
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    return res;
  }

  // 1. Get facilities
  console.log('\n--- 1. FACILITIES ---');
  const facRes = await apiGet('/api/v1/facilities');
  const facilities = facRes.body?.data || [];
  console.log(`Found ${facilities.length} facilities:`);
  for (const f of facilities) {
    console.log(`  - ID: ${f.id} | Name: "${f.name}" | Code: ${f.facilityCode} | Type: ${f.facilityType}`);
    // Check departments
    const deptRes = await apiGet(`/api/v1/facilities/${f.id}/departments`);
    console.log(`    Departments (${deptRes.status}):`, JSON.stringify(deptRes.body?.data || deptRes.body));
    // Check doctors
    const docRes = await apiGet(`/api/v1/facilities/${f.id}/doctors`);
    console.log(`    Doctors (${docRes.status}):`, JSON.stringify(docRes.body?.data || docRes.body));
  }

  // 2. Get doctors list
  console.log('\n--- 2. DOCTORS AND THEIR FACILITY/DEPARTMENT ---');
  const doctorsRes = await apiGet('/api/v1/doctors?limit=50');
  const doctors = doctorsRes.body?.data || [];
  console.log(`Found ${doctors.length} doctors:`);
  for (const d of doctors) {
    console.log(`  - Dr. ${d.fullName} | ID: ${d.id} | Status: ${d.verificationStatus} | Spec: ${d.primarySpecialization} | Dept: ${d.department} | FacId: ${d.facilityId || d.facility?.id} | FacName: ${d.facility?.name || d.facilityName}`);
  }

  // 3. Probe /api/v1/reports/dashboard/executive with various parameters
  console.log('\n--- 3. PROBING /api/v1/reports/dashboard/executive ---');
  
  // 3a. Unfiltered
  const execUnfiltered = await apiGet('/api/v1/reports/dashboard/executive');
  console.log('3a. Unfiltered:');
  console.log('  Overview:', JSON.stringify(execUnfiltered.body?.data?.platformOverview));

  // 3b. Today
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString();
  const endToday = now.toISOString();
  const execToday = await apiGet(`/api/v1/reports/dashboard/executive?startDate=${encodeURIComponent(startToday)}&endDate=${encodeURIComponent(endToday)}`);
  console.log('\n3b. Today:', startToday, 'to', endToday);
  console.log('  Overview:', JSON.stringify(execToday.body?.data?.platformOverview));

  // 3c. 7D
  const start7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const exec7d = await apiGet(`/api/v1/reports/dashboard/executive?startDate=${encodeURIComponent(start7d)}&endDate=${encodeURIComponent(endToday)}`);
  console.log('\n3c. 7D:', start7d, 'to', endToday);
  console.log('  Overview:', JSON.stringify(exec7d.body?.data?.platformOverview));

  // 3d. Specific facility
  if (facilities.length > 0) {
    const fId = facilities[0].id;
    const fName = facilities[0].name;
    const execFac = await apiGet(`/api/v1/reports/dashboard/executive?facilityId=${fId}`);
    console.log(`\n3d. Facility (${fName} - ${fId}):`);
    console.log('  Overview:', JSON.stringify(execFac.body?.data?.platformOverview));

    // 3e. Facility + Today
    const execFacToday = await apiGet(`/api/v1/reports/dashboard/executive?facilityId=${fId}&startDate=${encodeURIComponent(startToday)}&endDate=${encodeURIComponent(endToday)}`);
    console.log(`\n3e. Facility + Today:`);
    console.log('  Overview:', JSON.stringify(execFacToday.body?.data?.platformOverview));

    // 3f. Does executive accept department parameter?
    const execDept = await apiGet(`/api/v1/reports/dashboard/executive?department=Cardiology`);
    console.log(`\n3f. Department (Cardiology):`);
    console.log('  Overview:', JSON.stringify(execDept.body?.data?.platformOverview));

    const execAllParams = await apiGet(`/api/v1/reports/dashboard/executive?facilityId=${fId}&department=Cardiology&startDate=${encodeURIComponent(start7d)}&endDate=${encodeURIComponent(endToday)}`);
    console.log(`\n3g. Facility + Dept + 7D:`);
    console.log('  Overview:', JSON.stringify(execAllParams.body?.data?.platformOverview));
  }

  // 4. Probe medical-records filtering
  console.log('\n--- 4. PROBING /api/v1/admin/medical-records ---');
  const mrAll = await apiGet('/api/v1/admin/medical-records?page=1&limit=1');
  console.log('4a. Records unfiltered meta:', mrAll.body?.meta);

  const mrToday = await apiGet(`/api/v1/admin/medical-records?page=1&limit=1&startDate=${encodeURIComponent(startToday)}&endDate=${encodeURIComponent(endToday)}`);
  console.log('4b. Records Today meta:', mrToday.body?.meta);

  const mr7d = await apiGet(`/api/v1/admin/medical-records?page=1&limit=1&startDate=${encodeURIComponent(start7d)}&endDate=${encodeURIComponent(endToday)}`);
  console.log('4c. Records 7D meta:', mr7d.body?.meta);

  if (facilities.length > 0) {
    const fId = facilities[0].id;
    const mrFac = await apiGet(`/api/v1/admin/medical-records?page=1&limit=1&facilityId=${fId}`);
    console.log(`4d. Records with facilityId=${fId}:`, mrFac.body?.meta);

    const mrDept = await apiGet(`/api/v1/admin/medical-records?page=1&limit=1&department=Cardiology`);
    console.log(`4e. Records with department=Cardiology:`, mrDept.body?.meta);
  }
}

main().catch(console.error);

