const { apiGet } = require('./api_helper.cjs');

(async () => {
  const verifiedPatients = [];
  const unverifiedPatients = [];

  for (let p = 1; p <= 30; p++) {
    const res = await apiGet(`/api/v1/admin/patients?page=${p}&limit=1`);
    if (res.status === 200 && res.body?.data?.length > 0) {
      const item = res.body.data[0];
      const isVerified = (item.profileStatus || '').toUpperCase() === 'COMPLETED';
      const isActive = (item.userStatus || '').toUpperCase() === 'ACTIVE';

      if (isVerified && isActive) {
        verifiedPatients.push(item);
      } else {
        unverifiedPatients.push(item);
      }
    }
  }

  console.log(`Scanned ${verifiedPatients.length + unverifiedPatients.length} total valid records.`);
  console.log(`Verified & Active patients count: ${verifiedPatients.length}`);
  verifiedPatients.forEach(p => console.log(' -> Verified:', p.id, p.patientNumber, p.firstName, p.lastName, p.profileStatus, p.userStatus));
  console.log(`Unverified / Draft patients count: ${unverifiedPatients.length}`);
  unverifiedPatients.slice(0, 5).forEach(p => console.log(' -> Unverified/Draft sample:', p.id, p.patientNumber, p.firstName, p.lastName, p.profileStatus, p.userStatus));
})();

