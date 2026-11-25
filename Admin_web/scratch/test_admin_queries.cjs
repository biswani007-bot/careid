const tokenHelper = require('./token_helper.cjs');

async function testAdminQueries() {
  const token = await tokenHelper.getAdminToken();
  const patientProfileId = '787e5187-7859-4320-bb1a-465a57dd086a';

  const testUrls = [
    `/api/v1/medical-records?patientProfileId=${patientProfileId}`,
    `/api/v1/medical-records/search?patientProfileId=${patientProfileId}`,
    `/api/v1/medical-records/search?q=a`,
    `/api/v1/medical-records/timeline?patientProfileId=${patientProfileId}`,
    `/api/v1/reports/timeline?patientProfileId=${patientProfileId}`,
    `/api/v1/patients/${patientProfileId}/medical-records`,
    `/api/v1/patients/${patientProfileId}/timeline`,
    `/api/v1/admin/patients/${patientProfileId}/medical-records`
  ];

  for (const u of testUrls) {
    const res = await fetch('https://360api.vnvision.in' + u, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(u, res.status);
    if (res.status === 200) {
      const data = await res.json();
      console.log('  Keys/length:', Array.isArray(data) ? data.length : Object.keys(data));
    } else {
      const text = await res.text();
      console.log('  Response:', text.slice(0, 100));
    }
  }
}

testAdminQueries().catch(console.error);

