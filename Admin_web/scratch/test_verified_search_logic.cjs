const { apiGet } = require('./api_helper.cjs');

async function searchPatients(query) {
  const cleanQ = (query || '').trim().toLowerCase();
  const candidateMap = new Map();
  const unverifiedCandidates = [];

  // 1. Fetch completed/verified patients from live backend
  try {
    const completedRes = await apiGet('/api/v1/admin/patients?status=COMPLETED&limit=50');
    if (completedRes.status === 200 && Array.isArray(completedRes.body?.data)) {
      completedRes.body.data.forEach(p => candidateMap.set(p.id, p));
    }
  } catch (err) {
    console.error('Failed to fetch completed patients:', err.message);
  }

  // 2. If query has length, also search by q parameter
  if (cleanQ.length >= 2) {
    try {
      const searchRes = await apiGet(`/api/v1/admin/patients?q=${encodeURIComponent(query.trim())}&limit=20`);
      if (searchRes.status === 200 && Array.isArray(searchRes.body?.data)) {
        searchRes.body.data.forEach(p => candidateMap.set(p.id, p));
      }
    } catch (err) {
      // If q query failed (e.g. 500 on backend), ignore
    }

    // 3. If query could be an ID or patientNumber, also test direct endpoint
    try {
      const directRes = await apiGet(`/api/v1/admin/patients/${encodeURIComponent(query.trim())}`);
      if (directRes.status === 200 && directRes.body?.data) {
        candidateMap.set(directRes.body.data.id, directRes.body.data);
      }
    } catch {}
  }

  // 4. Strict filter: Verified & Active Only
  const verified = [];
  for (const raw of candidateMap.values()) {
    const isCompleted = (raw.profileStatus || '').toUpperCase() === 'COMPLETED';
    const isActive = (raw.userStatus || '').toUpperCase() === 'ACTIVE';
    const fullName = [raw.firstName, raw.lastName].filter(Boolean).join(' ').trim() || raw.patientNumber || 'Unnamed Patient';
    const patientNumber = raw.patientNumber || raw.healthCard?.cardNumber || raw.id;

    // Check if query matches either patient Care ID or full name
    const matchesQuery = !cleanQ ||
      patientNumber.toLowerCase().includes(cleanQ) ||
      fullName.toLowerCase().includes(cleanQ) ||
      (raw.id && raw.id.toLowerCase().includes(cleanQ));

    if (matchesQuery) {
      if (isCompleted && isActive) {
        verified.push({
          id: raw.id,
          patientNumber,
          fullName,
          verificationStatus: 'Verified',
          accountStatus: 'ACTIVE',
          gender: raw.gender,
          bloodGroup: raw.bloodGroup,
          phone: raw.phone,
          cardNumber: raw.healthCard?.cardNumber
        });
      } else {
        unverifiedCandidates.push({
          patientNumber,
          fullName,
          status: raw.profileStatus || 'DRAFT'
        });
      }
    }
  }

  return {
    verified,
    unverified: unverifiedCandidates
  };
}

(async () => {
  const testQueries = [
    'PT-CAREID-2026-0004', // Full ID
    '0004',                // Partial ID
    'Marcus Vance',        // Full Name
    'Marc',                // Partial Name
    'vance',               // Case-insensitive name
    'PAT-929510',          // Unverified ID
    'Lucas Vance',         // Unverified Name
    'INVALID-999999',      // Non-existent
    ''                     // Empty (default list)
  ];

  for (const q of testQueries) {
    const res = await searchPatients(q);
    console.log(`\nQuery "${q}":`);
    console.log(`  Verified count: ${res.verified.length}`);
    res.verified.forEach(v => console.log(`   -> Verified: [${v.patientNumber}] ${v.fullName} (Status: ${v.verificationStatus})`));
    console.log(`  Unverified count: ${res.unverified.length}`);
    res.unverified.forEach(u => console.log(`   -> Unverified (Excluded): [${u.patientNumber}] ${u.fullName} (Status: ${u.status})`));
  }
})();

