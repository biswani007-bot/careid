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

  function getDateRangeParams(timeRange) {
    const now = new Date();
    const istOffsetMs = 5.5 * 3600 * 1000;
    const nowIstMs = now.getTime() + istOffsetMs;
    const nowIst = new Date(nowIstMs);
    const istYear = nowIst.getUTCFullYear();
    const istMonth = nowIst.getUTCMonth();
    const istDate = nowIst.getUTCDate();

    let startUtc, endUtc;
    if (timeRange === 'Today') {
      startUtc = new Date(Date.UTC(istYear, istMonth, istDate, 0, 0, 0, 0) - istOffsetMs);
      endUtc = new Date(Date.UTC(istYear, istMonth, istDate, 23, 59, 59, 999) - istOffsetMs);
    } else if (timeRange === '7D') {
      startUtc = new Date(Date.UTC(istYear, istMonth, istDate - 6, 0, 0, 0, 0) - istOffsetMs);
      endUtc = new Date(Date.UTC(istYear, istMonth, istDate, 23, 59, 59, 999) - istOffsetMs);
    } else {
      startUtc = new Date(Date.UTC(istYear, istMonth, istDate - 29, 0, 0, 0, 0) - istOffsetMs);
      endUtc = new Date(Date.UTC(istYear, istMonth, istDate, 23, 59, 59, 999) - istOffsetMs);
    }
    return { startDate: startUtc.toISOString(), endDate: endUtc.toISOString(), startUtc, endUtc };
  }

  // Load patient list
  const patientList = [];
  const p1 = await apiGet('/api/v1/admin/patients?page=1&limit=10');
  const p3 = await apiGet('/api/v1/admin/patients?page=3&limit=10');
  if (p1.body?.data) patientList.push(...p1.body.data);
  if (p3.body?.data) patientList.push(...p3.body.data);

  for (let pg of [2, 4, 5]) {
    const res = await apiGet(`/api/v1/admin/patients?page=${pg}&limit=5`);
    if (res.status === 200 && Array.isArray(res.body?.data)) {
      for (const item of res.body.data) {
        if (!patientList.some(existing => existing.id === item.id)) {
          patientList.push(item);
        }
      }
    }
  }

  // Load doctors
  const dRes = await apiGet('/api/v1/doctors?limit=50');
  const doctorsList = dRes.body?.data || [];

  function countInRange(items, startUtc, endUtc) {
    return items.reduce((acc, item) => {
      if (!item.createdAt) return acc;
      const d = new Date(item.createdAt);
      return d >= startUtc && d <= endUtc ? acc + 1 : acc;
    }, 0);
  }

  for (const period of ['Today', '7D', '30D']) {
    const bounds = getDateRangeParams(period);
    const pCount = countInRange(patientList, bounds.startUtc, bounds.endUtc);
    const dCount = countInRange(doctorsList, bounds.startUtc, bounds.endUtc);
    const mrRes = await apiGet(`/api/v1/admin/medical-records?page=1&limit=1&startDate=${encodeURIComponent(bounds.startDate)}&endDate=${encodeURIComponent(bounds.endDate)}`);
    const rCount = mrRes.body?.meta?.totalItems ?? 0;

    console.log(`\n=== PERIOD: ${period} ===`);
    console.log(`Patients: Lifetime 23 | In Period: ${pCount}`);
    console.log(`Doctors:  Lifetime 10 | In Period: ${dCount}`);
    console.log(`Records:  Lifetime 305 | In Period: ${rCount}`);
  }
}

main().catch(console.error);

