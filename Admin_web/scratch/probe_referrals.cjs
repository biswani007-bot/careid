const https = require('https');
const fs = require('fs');

function httpRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const opts = { ...options, rejectUnauthorized: false };
    const r = https.request(opts, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        let json;
        try { json = JSON.parse(body); } catch(e) { json = body; }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });
    r.on('error', reject);
    if (postData) r.write(postData);
    r.end();
  });
}

(async () => {
  const cached = JSON.parse(fs.readFileSync('scratch/cached_token.json', 'utf8'));
  const token = cached.accessToken;
  const headers = {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  };

  console.log('--- PROBING REFERRAL ENDPOINTS ---');

  // 1. GET /api/v1/referrals/dashboard/stats
  const statsRes = await httpRequest({
    hostname: '360api.vnvision.in',
    path: '/api/v1/referrals/dashboard/stats',
    method: 'GET',
    headers
  });
  console.log('\n1. GET /api/v1/referrals/dashboard/stats:');
  console.log('Status:', statsRes.status);
  console.log('Body:', JSON.stringify(statsRes.body, null, 2));

  // 2. GET /api/v1/referrals
  const listRes = await httpRequest({
    hostname: '360api.vnvision.in',
    path: '/api/v1/referrals?limit=50',
    method: 'GET',
    headers
  });
  console.log('\n2. GET /api/v1/referrals?limit=50:');
  console.log('Status:', listRes.status);
  console.log('Body:', JSON.stringify(listRes.body, null, 2));

  // 3. GET /api/v1/referrals/my-incoming
  const inRes = await httpRequest({
    hostname: '360api.vnvision.in',
    path: '/api/v1/referrals/my-incoming',
    method: 'GET',
    headers
  });
  console.log('\n3. GET /api/v1/referrals/my-incoming:');
  console.log('Status:', inRes.status);
  console.log('Body:', JSON.stringify(inRes.body, null, 2));

  // 4. GET /api/v1/referrals/my-outgoing
  const outRes = await httpRequest({
    hostname: '360api.vnvision.in',
    path: '/api/v1/referrals/my-outgoing',
    method: 'GET',
    headers
  });
  console.log('\n4. GET /api/v1/referrals/my-outgoing:');
  console.log('Status:', outRes.status);
  console.log('Body:', JSON.stringify(outRes.body, null, 2));

  // If there are referrals, test details, notes, attachments, history
  let sampleId = null;
  if (listRes.body && listRes.body.data) {
    const data = Array.isArray(listRes.body.data) ? listRes.body.data : listRes.body.data.data;
    if (Array.isArray(data) && data.length > 0) {
      sampleId = data[0].id;
      console.log('\nFound sample referral ID:', sampleId);
    }
  }

  if (sampleId) {
    // 5. GET /api/v1/referrals/:id
    const detailRes = await httpRequest({
      hostname: '360api.vnvision.in',
      path: `/api/v1/referrals/${sampleId}`,
      method: 'GET',
      headers
    });
    console.log(`\n5. GET /api/v1/referrals/${sampleId}:`);
    console.log('Status:', detailRes.status);
    console.log('Body:', JSON.stringify(detailRes.body, null, 2));

    // 6. GET /api/v1/referrals/:id/notes
    const notesRes = await httpRequest({
      hostname: '360api.vnvision.in',
      path: `/api/v1/referrals/${sampleId}/notes`,
      method: 'GET',
      headers
    });
    console.log(`\n6. GET /api/v1/referrals/${sampleId}/notes:`);
    console.log('Status:', notesRes.status);
    console.log('Body:', JSON.stringify(notesRes.body, null, 2));

    // 7. GET /api/v1/referrals/:id/attachments
    const attachRes = await httpRequest({
      hostname: '360api.vnvision.in',
      path: `/api/v1/referrals/${sampleId}/attachments`,
      method: 'GET',
      headers
    });
    console.log(`\n7. GET /api/v1/referrals/${sampleId}/attachments:`);
    console.log('Status:', attachRes.status);
    console.log('Body:', JSON.stringify(attachRes.body, null, 2));

    // 8. GET /api/v1/referrals/:id/history
    const histRes = await httpRequest({
      hostname: '360api.vnvision.in',
      path: `/api/v1/referrals/${sampleId}/history`,
      method: 'GET',
      headers
    });
    console.log(`\n8. GET /api/v1/referrals/${sampleId}/history:`);
    console.log('Status:', histRes.status);
    console.log('Body:', JSON.stringify(histRes.body, null, 2));
  } else {
    console.log('\nNo referrals in backend currently to test :id endpoints.');
  }
})();

