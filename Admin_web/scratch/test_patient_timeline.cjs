const tokenHelper = require('./token_helper.cjs');

async function testTimeline() {
  const token = await tokenHelper.getAdminToken();
  const patientProfileId = '787e5187-7859-4320-bb1a-465a57dd086a';
  const url = `https://360api.vnvision.in/api/v1/admin/patients/${patientProfileId}/medical-records/timeline?limit=100`;
  console.log('Calling:', url);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('Status:', res.status);
  if (res.status === 200) {
    const data = await res.json();
    console.log('Data isArray:', Array.isArray(data), 'length:', Array.isArray(data) ? data.length : Object.keys(data));
    const items = Array.isArray(data) ? data : (data.items || data.data || []);
    console.log('Items count:', items.length);
    items.forEach((it, idx) => {
      console.log(`${idx + 1}. [${it.type || it.eventType}] ID: ${it.id} | Title: ${it.title} | Category: ${it.category}`);
    });
  } else {
    console.log('Error:', await res.text());
  }
}

testTimeline().catch(console.error);

