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

  // Load all patients like patientService does
  const res = await apiGet('/api/v1/admin/patients?page=1&limit=50');
  console.log('GET /admin/patients limit=50 status:', res.status, 'items:', res.body?.data?.length);

  // If 500 error, fetch page by page
  let rawPatients = [];
  if (res.status === 200 && Array.isArray(res.body?.data)) {
    rawPatients = res.body.data;
  } else {
    for (let p = 1; p <= 6; p++) {
      const pRes = await apiGet(`/api/v1/admin/patients?page=${p}&limit=5`);
      if (pRes.status === 200 && Array.isArray(pRes.body?.data)) {
        rawPatients.push(...pRes.body.data);
      } else {
        // Individual fallback
        for (let idx = (p - 1) * 5 + 1; idx <= p * 5; idx++) {
          const single = await apiGet(`/api/v1/admin/patients?page=${idx}&limit=1`);
          if (single.status === 200 && single.body?.data?.[0]) {
            rawPatients.push(single.body.data[0]);
          }
        }
      }
    }
  }

  console.log(`\nInspecting ${rawPatients.length} raw patients:`);
  for (const raw of rawPatients) {
    const registeredDate = raw.createdAt ? raw.createdAt.split('T')[0] : '';
    const registeredGB = raw.createdAt
      ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(raw.createdAt))
      : 'Recent';
    const updatedGB = raw.updatedAt
      ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(raw.updatedAt))
      : 'None';
    
    // Also check in IST timezone
    const createdIST = raw.createdAt ? new Date(raw.createdAt).toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' }) : '';

    console.log(`- ${raw.id.slice(0, 8)} | ${raw.patientNumber || 'No-ID'} | createdAt: ${raw.createdAt} -> GB: ${registeredGB} | IST: ${createdIST} | updatedAt: ${raw.updatedAt} -> ${updatedGB}`);
  }
}

main().catch(console.error);

