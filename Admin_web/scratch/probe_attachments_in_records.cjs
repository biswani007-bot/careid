const fs = require('fs');
const https = require('https');

const cached = JSON.parse(fs.readFileSync('scratch/cached_token.json', 'utf8'));

function httpRequest(path, method = 'GET', data = null) {
  return new Promise((resolve) => {
    const req = https.request({
      hostname: '360api.vnvision.in',
      path,
      method,
      headers: {
        Authorization: `Bearer ${cached.accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(b) }); }
        catch { resolve({ status: res.statusCode, body: b }); }
      });
    });
    req.on('error', err => resolve({ status: -1, error: err.message }));
    if (data) req.write(data);
    req.end();
  });
}

(async () => {
  console.log('1. Checking first 10 records from /api/v1/admin/medical-records for attachments...');
  const res = await httpRequest('/api/v1/admin/medical-records?page=1&limit=10');
  const items = res.body?.data || [];
  console.log(`Retrieved ${items.length} records.`);
  items.forEach((item, i) => {
    console.log(`${i + 1}. ID: ${item.id}, Title: "${item.title}", Patient: ${item.patient?.firstName} ${item.patient?.lastName}, Attachments count: ${item.attachments?.length || 0}`);
    if (item.attachments && item.attachments.length > 0) {
      console.log('   Attachments:', item.attachments);
    }
  });

  console.log('\n2. Testing POST /api/v1/records...');
  const resRecords = await httpRequest('/api/v1/records', 'POST', JSON.stringify({
    title: 'Test Record',
    chiefComplaint: 'Testing',
    clinicalNotes: 'Testing'
  }));
  console.log('POST /api/v1/records status:', resRecords.status, resRecords.body);

  console.log('\n3. Testing GET /api/v1/attachments/:id on recently uploaded attachment...');
  // Let's test with attachment id from earlier: 00d54e67-af72-4ebc-ae9a-a63710dec128
  const attRes = await httpRequest('/api/v1/attachments/00d54e67-af72-4ebc-ae9a-a63710dec128');
  console.log('GET /api/v1/attachments/:id status:', attRes.status, attRes.body);
})();

