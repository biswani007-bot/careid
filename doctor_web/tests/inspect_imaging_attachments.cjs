const https = require('https');

function post(path, data) {
  return new Promise((resolve) => {
    const req = https.request({
      hostname: '360api.vnvision.in',
      path: '/api/v1' + path,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(b) }));
    });
    req.write(JSON.stringify(data));
    req.end();
  });
}

function get(path, token) {
  return new Promise((resolve) => {
    const req = https.request({
      hostname: '360api.vnvision.in',
      path: '/api/v1' + path,
      method: 'GET',
      headers: { Authorization: 'Bearer ' + token }
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(b) });
        } catch {
          resolve({ status: res.statusCode, data: b });
        }
      });
    });
    req.end();
  });
}

async function main() {
  const otpRes = await post('/auth/otp/request', { phone: '+16505550004' });
  const challengeId = otpRes.data?.data?.challengeId;
  const verifyRes = await post('/auth/otp/verify', { challengeId, otpCode: '123456' });
  const patientToken = verifyRes.data?.data?.accessToken;

  // Let's get medical records
  const recordsRes = await get('/medical-records', patientToken);
  const items = recordsRes.data?.data || recordsRes.data || [];
  
  console.log(`Found ${items.length} records. Inspecting records with attachments or imaging-related titles...`);
  for (const r of items) {
    const isImaging = /radiolog|chest|x-ray|mri|ct|fluoroscopy|angiography|ultrasound/i.test(r.title);
    const hasAttachments = r.attachments && r.attachments.length > 0;
    if (isImaging || hasAttachments) {
      console.log(`\nRecord: ${r.id} | ${r.title}`);
      console.log(`  Attachments property count: ${r.attachments ? r.attachments.length : 0}`);
      if (r.attachments && r.attachments.length > 0) {
        console.log(`  Attachments:`, JSON.stringify(r.attachments, null, 2));
      }
      // Also test GET /medical-records/:id/attachments
      const attRes = await get(`/medical-records/${r.id}/attachments`, patientToken);
      console.log(`  GET /medical-records/${r.id}/attachments status: ${attRes.status}, count: ${Array.isArray(attRes.data?.data) ? attRes.data.data.length : (Array.isArray(attRes.data) ? attRes.data.length : JSON.stringify(attRes.data))}`);
    }
  }
}

main();

