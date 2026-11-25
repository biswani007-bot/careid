const { apiGet } = require('./api_helper.cjs');

(async () => {
  // Test timeline for Lucas Vance (who has an attachment uploaded)
  const lucasId = '06584c77-0109-4774-906e-f14a16db8470';
  const lucasTimeline = await apiGet(`/api/v1/admin/patients/${lucasId}/medical-records/timeline`);
  console.log('Lucas Vance timeline status:', lucasTimeline.status, 'Items:', Array.isArray(lucasTimeline.body?.data) ? lucasTimeline.body.data.length : 0);
  if (Array.isArray(lucasTimeline.body?.data) && lucasTimeline.body.data.length > 0) {
    console.log('Lucas timeline sample:', JSON.stringify(lucasTimeline.body.data[0], null, 2));
  }

  // Test timeline for Karcus Doe
  const karcusId = '787e5187-7859-4320-bb1a-465a57dd086a';
  const karcusTimeline = await apiGet(`/api/v1/admin/patients/${karcusId}/medical-records/timeline?page=1&limit=5`);
  console.log('Karcus Doe timeline status:', karcusTimeline.status, 'Items:', Array.isArray(karcusTimeline.body?.data) ? karcusTimeline.body.data.length : 0);
  if (Array.isArray(karcusTimeline.body?.data) && karcusTimeline.body.data.length > 0) {
    console.log('Karcus timeline sample:', JSON.stringify(karcusTimeline.body.data[0], null, 2));
  }
})();
