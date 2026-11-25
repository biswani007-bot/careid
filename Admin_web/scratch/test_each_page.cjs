const { apiGet } = require('./api_helper.cjs');

(async () => {
  console.log('Testing each page with limit=1:');
  const allPatients = [];
  for (let p = 1; p <= 20; p++) {
    const res = await apiGet(`/api/v1/admin/patients?page=${p}&limit=1`);
    if (res.status === 200 && res.body?.data?.length > 0) {
      const item = res.body.data[0];
      allPatients.push(item);
      console.log(`Page ${p}: ID=${item.id}, No=${item.patientNumber}, Name=${item.firstName} ${item.lastName}, profileStatus=${item.profileStatus}, userStatus=${item.userStatus}, onboardingStep=${item.onboardingStep}`);
    } else {
      console.log(`Page ${p}: Status=${res.status}`);
    }
  }
  console.log(`\nSuccessfully fetched ${allPatients.length} patients.`);
})();

