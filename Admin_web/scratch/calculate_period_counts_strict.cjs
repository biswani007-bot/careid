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

  // 1. Establish Timezone & Date Boundaries in Asia/Kolkata (IST = UTC+5:30)
  // Let's compute exact start and end of Today, 7D, 30D in IST:
  const now = new Date();
  
  // Convert current time to IST components
  const istOffsetMs = 5.5 * 3600 * 1000;
  const nowIstMs = now.getTime() + istOffsetMs;
  const nowIst = new Date(nowIstMs);
  const istYear = nowIst.getUTCFullYear();
  const istMonth = nowIst.getUTCMonth();
  const istDate = nowIst.getUTCDate();

  // Today: 00:00:00.000 to 23:59:59.999 IST
  const todayStartUtc = new Date(Date.UTC(istYear, istMonth, istDate, 0, 0, 0, 0) - istOffsetMs);
  const todayEndUtc = new Date(Date.UTC(istYear, istMonth, istDate, 23, 59, 59, 999) - istOffsetMs);

  // 7D: 6 days ago 00:00:00.000 to end of today IST
  const sevenDayStartUtc = new Date(Date.UTC(istYear, istMonth, istDate - 6, 0, 0, 0, 0) - istOffsetMs);

  // 30D: 29 days ago 00:00:00.000 to end of today IST
  const thirtyDayStartUtc = new Date(Date.UTC(istYear, istMonth, istDate - 29, 0, 0, 0, 0) - istOffsetMs);

  console.log('=== IST TIME BOUNDARIES ===');
  console.log(`Current IST Time: ${nowIst.toISOString().replace('Z', '')} IST`);
  console.log(`Today (IST):      ${todayStartUtc.toISOString()} -> ${todayEndUtc.toISOString()}`);
  console.log(`7D (IST):         ${sevenDayStartUtc.toISOString()} -> ${todayEndUtc.toISOString()}`);
  console.log(`30D (IST):        ${thirtyDayStartUtc.toISOString()} -> ${todayEndUtc.toISOString()}`);

  // 2. Fetch all Patients
  const rawPatients = [];
  for (let p = 1; p <= 6; p++) {
    const pRes = await apiGet(`/api/v1/admin/patients?page=${p}&limit=5`);
    if (pRes.status === 200 && Array.isArray(pRes.body?.data)) {
      rawPatients.push(...pRes.body.data);
    } else {
      for (let idx = (p - 1) * 5 + 1; idx <= p * 5; idx++) {
        const single = await apiGet(`/api/v1/admin/patients?page=${idx}&limit=1`);
        if (single.status === 200 && single.body?.data?.[0]) {
          rawPatients.push(single.body.data[0]);
        }
      }
    }
  }

  // 3. Fetch all Doctors
  const dRes = await apiGet('/api/v1/doctors?limit=50');
  const allDoctors = dRes.body?.data || [];

  // Helper to count in range
  function countInRange(items, dateField, startUtc, endUtc) {
    return items.filter(item => {
      if (!item[dateField]) return false;
      const d = new Date(item[dateField]);
      return d >= startUtc && d <= endUtc;
    });
  }

  console.log('\n=== PATIENTS BREAKDOWN ===');
  console.log(`Total accessible profiles: ${rawPatients.length}`);
  const patientsToday = countInRange(rawPatients, 'createdAt', todayStartUtc, todayEndUtc);
  const patients7d = countInRange(rawPatients, 'createdAt', sevenDayStartUtc, todayEndUtc);
  const patients30d = countInRange(rawPatients, 'createdAt', thirtyDayStartUtc, todayEndUtc);

  console.log(`- Today: ${patientsToday.length}`);
  console.log(`- 7D:    ${patients7d.length}`);
  console.log(`- 30D:   ${patients30d.length}`);

  console.log('\n=== DOCTORS BREAKDOWN ===');
  console.log(`Total doctors: ${allDoctors.length}`);
  const doctorsToday = countInRange(allDoctors, 'createdAt', todayStartUtc, todayEndUtc);
  const doctors7d = countInRange(allDoctors, 'createdAt', sevenDayStartUtc, todayEndUtc);
  const doctors30d = countInRange(allDoctors, 'createdAt', thirtyDayStartUtc, todayEndUtc);

  console.log(`- Today: ${doctorsToday.length}`);
  console.log(`- 7D:    ${doctors7d.length}`);
  console.log(`- 30D:   ${doctors30d.length}`);

  console.log('\n=== MEDICAL RECORDS BREAKDOWN ===');
  const mrAll = await apiGet('/api/v1/admin/medical-records?page=1&limit=1');
  const mrToday = await apiGet(`/api/v1/admin/medical-records?page=1&limit=1&startDate=${encodeURIComponent(todayStartUtc.toISOString())}&endDate=${encodeURIComponent(todayEndUtc.toISOString())}`);
  const mr7d = await apiGet(`/api/v1/admin/medical-records?page=1&limit=1&startDate=${encodeURIComponent(sevenDayStartUtc.toISOString())}&endDate=${encodeURIComponent(todayEndUtc.toISOString())}`);
  const mr30d = await apiGet(`/api/v1/admin/medical-records?page=1&limit=1&startDate=${encodeURIComponent(thirtyDayStartUtc.toISOString())}&endDate=${encodeURIComponent(todayEndUtc.toISOString())}`);

  console.log(`- Lifetime: ${mrAll.body?.meta?.totalItems}`);
  console.log(`- Today:    ${mrToday.body?.meta?.totalItems}`);
  console.log(`- 7D:       ${mr7d.body?.meta?.totalItems}`);
  console.log(`- 30D:      ${mr30d.body?.meta?.totalItems}`);
}

main().catch(console.error);

