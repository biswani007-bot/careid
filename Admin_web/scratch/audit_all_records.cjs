const fs = require('fs');
const https = require('https');

const cached = JSON.parse(fs.readFileSync('scratch/cached_token.json', 'utf8'));

function httpRequest(path) {
  return new Promise((resolve) => {
    const req = https.request({
      hostname: '360api.vnvision.in',
      path,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${cached.accessToken}`,
        Accept: 'application/json'
      }
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(b) }); }
        catch { resolve({ status: res.statusCode, body: b }); }
      });
    });
    req.on('error', err => resolve({ status: -1, error: err.message }));
    req.end();
  });
}

(async () => {
  console.log('Fetching all records from /api/v1/admin/medical-records...');
  let page = 1;
  let allRecords = [];
  let totalItems = 0;

  while (true) {
    const res = await httpRequest(`/api/v1/admin/medical-records?page=${page}&limit=100`);
    if (res.status !== 200 || !res.body?.data) break;
    const items = res.body.data;
    totalItems = res.body.meta?.totalItems || 0;
    allRecords = allRecords.concat(items);
    console.log(`Page ${page}: got ${items.length} records. Total collected: ${allRecords.length} / ${totalItems}`);
    if (!res.body.meta?.hasNextPage || items.length === 0) break;
    page++;
  }

  console.log(`\nTotal records in backend: ${allRecords.length}`);

  // Analyze Categories
  const categoryCounts = { Medical: 0, Dental: 0, Vision: 0 };
  const statusCounts = { FINAL: 0, DRAFT: 0, ARCHIVED: 0, OTHER: 0 };

  allRecords.forEach(r => {
    const text = `${r.title || ''} ${r.chiefComplaint || ''} ${r.clinicalNotes || ''} ${r.category || ''}`.toLowerCase();
    let cat = 'Medical';
    if (text.includes('dent') || text.includes('tooth') || text.includes('oral') || text.includes('caries') || text.includes('ortho-dent')) {
      cat = 'Dental';
    } else if (text.includes('vision') || text.includes('eye') || text.includes('oct') || text.includes('optom') || text.includes('retin') || text.includes('ophthal')) {
      cat = 'Vision';
    }
    categoryCounts[cat]++;

    const st = r.status || 'OTHER';
    if (statusCounts[st] !== undefined) statusCounts[st]++;
    else statusCounts.OTHER++;
  });

  console.log('Category breakdown across entire database:', categoryCounts);
  console.log('Status breakdown across entire database:', statusCounts);

  // Check unique providers, facilities, patients
  const providers = new Set();
  const facilities = new Set();
  const patients = new Set();
  allRecords.forEach(r => {
    if (r.encounters && r.encounters.length > 0) {
      r.encounters.forEach(e => {
        if (e.providerName) providers.add(e.providerName);
        if (e.facilityName) facilities.add(e.facilityName);
      });
    }
    if (r.provider) providers.add(r.provider);
    if (r.facility) facilities.add(r.facility);
    if (r.patient) {
      patients.add(r.patient.firstName ? `${r.patient.firstName} ${r.patient.lastName || ''}`.trim() : r.patient.patientNumber);
    }
  });

  console.log('Unique Providers found:', Array.from(providers));
  console.log('Unique Facilities found:', Array.from(facilities));
  console.log(`Unique Patients count: ${patients.size}`);

  // Check date ranges of records
  const dates = allRecords.map(r => r.createdAt).filter(Boolean).sort();
  console.log('Oldest record createdAt:', dates[0]);
  console.log('Newest record createdAt:', dates[dates.length - 1]);
})();

