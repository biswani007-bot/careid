const { apiGet } = require('./api_helper.cjs');

(async () => {
  const res = await apiGet('/api/v1/admin/patients?limit=50');
  console.log('Status:', res.status, 'Total items:', res.body?.data?.length);
  if (res.body?.data) {
    res.body.data.forEach((p, i) => {
      console.log(`[${i}] ID: ${p.id} | No: ${p.patientNumber} | Name: ${p.firstName || ''} ${p.lastName || ''} | profileStatus: ${p.profileStatus} | userStatus: ${p.userStatus} | onboardingStep: ${p.onboardingStep}`);
    });
    console.log('\nAll keys of a patient profile:', Object.keys(res.body.data[0]));
    console.log('\nSample full patient:', JSON.stringify(res.body.data.find(x => x.profileStatus === 'COMPLETED') || res.body.data[0], null, 2));
  }
})();
