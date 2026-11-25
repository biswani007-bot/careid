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

async function inspect305() {
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

  const recRes = await httpRequest({
    hostname: '360api.vnvision.in',
    path: '/api/v1/medical-records?limit=1000',
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` }
  });
  const records = Array.isArray(recRes.body) ? recRes.body : (recRes.body?.data || []);
  console.log('Total records:', records.length);

  // Check how many are Dental, Vision, Medical based on inferCategoryFromRecord
  let medCount = 0;
  let denCount = 0;
  let visCount = 0;

  const dentalRecords = [];
  const visionRecords = [];

  records.forEach((r, idx) => {
    const text = `${r.title || ''} ${r.chiefComplaint || ''} ${r.clinicalNotes || ''} ${r.treatmentPlan || ''} ${r.category || ''}`.toLowerCase();
    const isDental = text.includes('dental') || text.includes('tooth') || text.includes('teeth') || text.includes('oral') || text.includes('molar') || text.includes('cavity') || text.includes('gingiv');
    const isVision = text.includes('vision') || text.includes('eye') || text.includes('ophthalm') || text.includes('retina') || text.includes('optom') || text.includes('fundus');

    if (isDental) {
      denCount++;
      dentalRecords.push(r);
    } else if (isVision) {
      visCount++;
      visionRecords.push(r);
    } else {
      medCount++;
    }
  });

  console.log(`Classified from content: Medical=${medCount}, Dental=${denCount}, Vision=${visCount}`);
  if (dentalRecords.length > 0) {
    console.log('Dental record sample:', dentalRecords[0].id, dentalRecords[0].title);
  }
}

inspect305().catch(console.error);

