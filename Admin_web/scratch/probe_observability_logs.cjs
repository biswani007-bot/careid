const fs = require('fs');
const https = require('https');
const tokenData = JSON.parse(fs.readFileSync('scratch/cached_admin_token.json', 'utf8'));

function testUrl(url) {
  return new Promise((resolve) => {
    https.get(url, {
      headers: { 'Authorization': 'Bearer ' + tokenData.token, 'Accept': 'application/json' }
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(b) });
        } catch {
          resolve({ status: res.statusCode, body: b });
        }
      });
    });
  });
}

async function run() {
  console.log('1. Triggering 500 error on /api/v1/admin/patients/9a4ad630-de90-40e9-b4cd-1d76f8f63069 ...');
  const trig = await testUrl('https://360api.vnvision.in/api/v1/admin/patients/9a4ad630-de90-40e9-b4cd-1d76f8f63069');
  console.log('Trigger status:', trig.status, trig.body);

  console.log('\n2. Querying /api/v1/observability/logs ...');
  const logsRes = await testUrl('https://360api.vnvision.in/api/v1/observability/logs?severity=error');
  console.log('Logs status:', logsRes.status);
  console.log('Logs body:', JSON.stringify(logsRes.body, null, 2).slice(0, 1500));

  console.log('\n3. Querying /api/v1/observability/traces ...');
  const tracesRes = await testUrl('https://360api.vnvision.in/api/v1/observability/traces?status=error');
  console.log('Traces status:', tracesRes.status);
  console.log('Traces body:', JSON.stringify(tracesRes.body, null, 2).slice(0, 1500));
}

run();

