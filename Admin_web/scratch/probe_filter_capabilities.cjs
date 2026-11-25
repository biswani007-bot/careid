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

  console.log('=== 1. PATIENTS STRUCTURE ===');
  const patientsRes = await apiGet('/api/v1/admin/patients?page=1&limit=2');
  console.log('Patients sample item:', JSON.stringify(patientsRes.body?.data?.[0], null, 2));

  console.log('\n=== 2. MEDICAL RECORDS QUERY PARAMS ===');
  const resFac = await apiGet('/api/v1/admin/medical-records?page=1&limit=1&facilityId=f12c37e8-cfc9-4896-992c-82d954905c46');
  console.log('Records with facilityId response status:', resFac.status, 'body:', JSON.stringify(resFac.body));

  const resDept = await apiGet('/api/v1/admin/medical-records?page=1&limit=1&department=Cardiology');
  console.log('Records with department response status:', resDept.status, 'body:', JSON.stringify(resDept.body));

  const resSearch = await apiGet('/api/v1/admin/medical-records?page=1&limit=1&q=Cardiology');
  console.log('Records with q=Cardiology response status:', resSearch.status, 'meta:', resSearch.body?.meta);

  console.log('\n=== 3. EXECUTIVE DASHBOARD WITH FACILITY + DATES ===');
  const now = new Date();
  const start7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const endToday = now.toISOString();

  const facId = 'f12c37e8-cfc9-4896-992c-82d954905c46'; // CAPITAL HOSPITAL
  const execFac7d = await apiGet(`/api/v1/reports/dashboard/executive?facilityId=${facId}&startDate=${encodeURIComponent(start7d)}&endDate=${encodeURIComponent(endToday)}`);
  console.log('CAPITAL HOSPITAL + 7D Executive Overview:', JSON.stringify(execFac7d.body?.data?.platformOverview));

  const metroId = '3b6a3f47-ed9c-4010-bb1a-e0fdea5f4abb'; // Metro General Hospital
  const execMetro7d = await apiGet(`/api/v1/reports/dashboard/executive?facilityId=${metroId}&startDate=${encodeURIComponent(start7d)}&endDate=${encodeURIComponent(endToday)}`);
  console.log('Metro General + 7D Executive Overview:', JSON.stringify(execMetro7d.body?.data?.platformOverview));

  console.log('\n=== 4. WHAT DEPARTMENTS EXIST IN FACILITIES & DOCTORS? ===');
  const facListRes = await apiGet('/api/v1/facilities');
  const facList = facListRes.body?.data || [];
  const deptsSet = new Set();
  for (const f of facList) {
    const dRes = await apiGet(`/api/v1/facilities/${f.id}/departments`);
    const dList = dRes.body?.data || [];
    for (const d of dList) {
      deptsSet.add(d.name);
    }
  }
  const doctorsRes = await apiGet('/api/v1/doctors?limit=50');
  const doctors = doctorsRes.body?.data || [];
  for (const d of doctors) {
    if (d.department) deptsSet.add(d.department);
    if (d.primarySpecialization) deptsSet.add(d.primarySpecialization);
  }
  console.log('Actual departments in system:', Array.from(deptsSet));
}

main().catch(console.error);

