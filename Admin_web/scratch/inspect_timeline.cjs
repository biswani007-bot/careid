const https = require('https');

function httpRequest(options, data) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function inspectTimeline() {
  const phone = '+16505550004';
  const otpRes = await httpRequest({
    hostname: '360api.vnvision.in',
    path: '/api/v1/auth/otp/request',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({ phone }));
  const challengeId = otpRes.body?.challengeId || otpRes.body?.data?.challengeId;
  const verifyRes = await httpRequest({
    hostname: '360api.vnvision.in',
    path: '/api/v1/auth/otp/verify',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({ challengeId, otpCode: '123456' }));
  const token = verifyRes.body?.accessToken || verifyRes.body?.data?.accessToken;

  const tlRes = await httpRequest({
    hostname: '360api.vnvision.in',
    path: '/api/v1/medical-records/timeline?limit=1000',
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` }
  });
  const items = Array.isArray(tlRes.body) ? tlRes.body : (tlRes.body?.data || []);
  console.log('Total timeline items:', items.length);

  const dentalItems = [];
  const visionItems = [];
  const attachments = [];

  items.forEach(it => {
    const text = `${it.title || ''} ${it.category || ''} ${JSON.stringify(it.details || {})}`.toLowerCase();
    const isDental = text.includes('dental') || text.includes('tooth') || text.includes('teeth') || text.includes('oral');
    const isVision = text.includes('vision') || text.includes('eye') || text.includes('ophthalm') || text.includes('retina') || text.includes('fundus');

    if (it.type === 'ATTACHMENT' || it.eventType === 'ATTACHMENT_UPLOAD' || it.eventType === 'ATTACHMENT') {
      attachments.push(it);
    }
    if (isDental) dentalItems.push(it);
    if (isVision) visionItems.push(it);
  });

  console.log(`Total attachments in timeline: ${attachments.length}`);
  console.log(`Timeline Dental items: ${dentalItems.length}`);
  dentalItems.forEach(d => console.log('  Dental:', d.id, d.title, d.type || d.eventType, d.category));
  console.log(`Timeline Vision items: ${visionItems.length}`);
  visionItems.forEach(v => console.log('  Vision:', v.id, v.title, v.type || v.eventType, v.category));

  // Also check the 3 specific attachments
  const specificIds = [
    '04d8276b-1e4f-4a8e-b53b-f322effd8430',
    '2f3bfaf3-a8ba-4e23-8e20-a6b1a32db5ed',
    '666a3474-09bd-4db2-b440-5886021f04a3'
  ];
  console.log('\n--- Checking specific attachment metadata ---');
  for (const id of specificIds) {
    const found = items.find(it => it.id === id);
    if (found) {
      console.log(`Found ${id} in timeline:`, JSON.stringify(found, null, 2));
    } else {
      console.log(`Not in timeline: ${id}, fetching directly...`);
      const direct = await httpRequest({
        hostname: '360api.vnvision.in',
        path: `/api/v1/attachments/${id}`,
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Direct status:', direct.status, direct.body);
    }
  }
}

inspectTimeline().catch(console.error);

