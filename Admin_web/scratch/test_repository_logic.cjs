const { apiGet } = require('./api_helper.cjs');

function inferCategoryFromRecord(raw) {
  const text = `${raw.title || ''} ${raw.chiefComplaint || ''} ${raw.clinicalNotes || ''} ${raw.category || ''}`.toLowerCase();
  if (text.includes('dent') || text.includes('tooth') || text.includes('oral') || text.includes('caries') || text.includes('ortho-dent')) {
    return 'Dental';
  }
  if (text.includes('vision') || text.includes('eye') || text.includes('oct') || text.includes('optom') || text.includes('retin') || text.includes('ophthal')) {
    return 'Vision';
  }
  return 'Medical';
}

function mapStatusToUi(status) {
  if (!status) return 'Pending Verification';
  const upper = status.toUpperCase();
  if (upper === 'FINAL' || upper === 'VERIFIED') return 'Verified';
  if (upper === 'ARCHIVED' || upper === 'REJECTED') return 'Rejected';
  return 'Pending Verification';
}

(async () => {
  console.log('Fetching first page to inspect totalItems...');
  const firstRes = await apiGet('/api/v1/admin/medical-records?page=1&limit=100');
  const totalItems = firstRes.body?.meta?.totalItems || 0;
  const totalPages = firstRes.body?.meta?.totalPages || 1;
  console.log(`totalItems: ${totalItems}, totalPages: ${totalPages}`);

  const pagePromises = [];
  for (let p = 2; p <= totalPages; p++) {
    pagePromises.push(apiGet(`/api/v1/admin/medical-records?page=${p}&limit=100`));
  }
  const remaining = await Promise.all(pagePromises);
  const allRaw = (firstRes.body?.data || []).concat(...remaining.map(r => r.body?.data || []));
  console.log(`Loaded ${allRaw.length} total records from backend.`);

  const mapped = allRaw.map(r => ({
    id: r.id,
    recordNumber: `#REC-${(r.id || '').slice(0, 8).toUpperCase()}`,
    title: r.title || 'Diagnostic Clinical Report',
    patientName: r.patient ? `${r.patient.firstName || ''} ${r.patient.lastName || ''}`.trim() : 'Unknown Patient',
    patientId: r.patient?.patientNumber || r.patientProfileId || 'CID-PATIENT',
    category: inferCategoryFromRecord(r),
    recordType: r.title || 'Clinical Evaluation',
    provider: r.encounters?.[0]?.providerName || r.provider || 'Attending Clinician',
    facility: r.encounters?.[0]?.facilityName || r.facility || 'Metro General Hospital',
    status: mapStatusToUi(r.status),
    createdAt: r.createdAt
  }));

  const catCounts = {
    all: mapped.length,
    medical: mapped.filter(r => r.category === 'Medical').length,
    dental: mapped.filter(r => r.category === 'Dental').length,
    vision: mapped.filter(r => r.category === 'Vision').length
  };
  console.log('Category Counts:', catCounts);

  const medRecords = mapped.filter(r => r.category === 'Medical');
  const medStatus = {
    total: medRecords.length,
    verified: medRecords.filter(r => r.status === 'Verified').length,
    pending: medRecords.filter(r => r.status === 'Pending Verification').length,
    rejected: medRecords.filter(r => r.status === 'Rejected').length
  };
  console.log('Medical Records Status Breakdown:', medStatus);

  const providers = Array.from(new Set(medRecords.map(r => r.provider).filter(Boolean)));
  const facilities = Array.from(new Set(medRecords.map(r => r.facility).filter(Boolean)));
  console.log('Providers in Medical:', providers);
  console.log('Facilities in Medical count:', facilities.length);
})();
