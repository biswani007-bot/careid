const { getFreshToken, apiGet } = require('./api_helper.cjs');

async function main() {
  console.log('--- RECONCILING HEALTH RECORDS COUNTS ---');
  // Fetch all medical records
  const firstRes = await apiGet('/api/v1/admin/medical-records?page=1&limit=100');
  const totalItems = firstRes.body?.meta?.totalItems || 0;
  const totalPages = firstRes.body?.meta?.totalPages || 1;
  console.log(`Backend reports totalItems: ${totalItems}, totalPages: ${totalPages}`);

  let allRecords = [...(firstRes.body?.data || [])];
  for (let p = 2; p <= totalPages; p++) {
    const res = await apiGet(`/api/v1/admin/medical-records?page=${p}&limit=100`);
    if (res.body?.data) {
      allRecords.push(...res.body.data);
    }
  }
  console.log(`Total records downloaded: ${allRecords.length}`);

  let medCount = 0;
  let dentCount = 0;
  let visCount = 0;

  for (const r of allRecords) {
    const text = `${r.title || ''} ${r.chiefComplaint || ''} ${r.clinicalNotes || ''} ${r.category || ''}`.toLowerCase();
    if (text.includes('dent') || text.includes('tooth') || text.includes('oral') || text.includes('caries') || text.includes('ortho-dent')) {
      dentCount++;
    } else if (text.includes('vision') || text.includes('eye') || text.includes('oct') || text.includes('optom') || text.includes('retin') || text.includes('ophthal')) {
      visCount++;
    } else {
      medCount++;
    }
  }

  console.log(`Clinical breakdown: Medical=${medCount}, Dental=${dentCount}, Vision=${visCount}, Total=${allRecords.length}`);
}

main().catch(console.error);
