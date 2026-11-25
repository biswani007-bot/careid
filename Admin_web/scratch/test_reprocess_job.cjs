const fs = require('fs');
const token = JSON.parse(fs.readFileSync('scratch/cached_admin_token.json', 'utf8')).token;
const baseUrl = 'https://360api.vnvision.in/api/v1';

async function getJob(jobId) {
  const res = await fetch(`${baseUrl}/ocr/jobs/${jobId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return await res.json();
}

async function run() {
  const targetJobId = '76a3fbf7-aa0f-4631-b4d7-a2de5babb190';

  console.log('=== BEFORE REPROCESSING ===');
  const before = await getJob(targetJobId);
  console.log(JSON.stringify(before.data, null, 2));

  console.log('\n=== TESTING REPROCESS ENDPOINT 1: POST /ocr/jobs/:jobId/reprocess ===');
  const r1 = await fetch(`${baseUrl}/ocr/jobs/${targetJobId}/reprocess`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    }
  });
  console.log(`Endpoint 1 status: ${r1.status} ${r1.statusText}`);
  const j1 = await r1.json().catch(() => null);
  console.log('Endpoint 1 response:', JSON.stringify(j1, null, 2));

  console.log('\n=== TESTING REPROCESS ENDPOINT 2: POST /ocr/reprocess/:jobId ===');
  const r2 = await fetch(`${baseUrl}/ocr/reprocess/${targetJobId}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    }
  });
  console.log(`Endpoint 2 status: ${r2.status} ${r2.statusText}`);
  const j2 = await r2.json().catch(() => null);
  console.log('Endpoint 2 response:', JSON.stringify(j2, null, 2));

  // Wait 3 seconds to observe asynchronous state transition if any
  console.log('\nWaiting 3 seconds...');
  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log('\n=== AFTER REPROCESSING: FETCH JOB DETAILS ===');
  const after = await getJob(targetJobId);
  console.log(JSON.stringify(after.data, null, 2));

  // Check extracted text and fields
  console.log('\n=== AFTER REPROCESSING: FETCH EXTRACTED TEXT ===');
  const rText = await fetch(`${baseUrl}/ocr/jobs/${targetJobId}/text`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const jText = await rText.json();
  console.log('Extracted text:', JSON.stringify(jText.data));

  console.log('\n=== AFTER REPROCESSING: FETCH EXTRACTED FIELDS ===');
  const rFields = await fetch(`${baseUrl}/ocr/jobs/${targetJobId}/fields`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const jFields = await rFields.json();
  console.log('Extracted fields count:', jFields.data?.length || 0);

  fs.writeFileSync('scratch/reprocess_result.json', JSON.stringify({ before: before.data, endpoint1: j1, endpoint2: j2, after: after.data, text: jText.data, fields: jFields.data }, null, 2));
}

run();

