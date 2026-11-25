const fs = require('fs');
const token = JSON.parse(fs.readFileSync('scratch/cached_admin_token.json', 'utf8')).token;
const baseUrl = 'https://360api.vnvision.in/api/v1';

async function testJob(jobId) {
  console.log(`\n============================================================`);
  console.log(`INSPECTING JOB: ${jobId}`);
  
  // 1. GET /ocr/jobs/:id
  const r1 = await fetch(`${baseUrl}/ocr/jobs/${jobId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log(`GET /ocr/jobs/${jobId} -> ${r1.status}`);
  const j1 = await r1.json().catch(() => null);
  console.log('Job Detail response:\n', JSON.stringify(j1, null, 2));

  // 2. GET /ocr/jobs/:id/text
  const r2 = await fetch(`${baseUrl}/ocr/jobs/${jobId}/text`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log(`GET /ocr/jobs/${jobId}/text -> ${r2.status}`);
  const j2 = await r2.json().catch(() => null);
  console.log('Job Text response:\n', JSON.stringify(j2, null, 2));

  // 3. GET /ocr/jobs/:id/fields
  const r3 = await fetch(`${baseUrl}/ocr/jobs/${jobId}/fields`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log(`GET /ocr/jobs/${jobId}/fields -> ${r3.status}`);
  const j3 = await r3.json().catch(() => null);
  console.log('Job Fields response:\n', JSON.stringify(j3, null, 2));

  // 4. GET /ocr/jobs/:id/json
  const r4 = await fetch(`${baseUrl}/ocr/jobs/${jobId}/json`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log(`GET /ocr/jobs/${jobId}/json -> ${r4.status}`);
  const j4 = await r4.json().catch(() => null);
  console.log('Job JSON response:\n', JSON.stringify(j4, null, 2));
}

async function run() {
  await testJob('d87f69f4-2445-4beb-aebf-fcbc15357b1e');
  await testJob('76a3fbf7-aa0f-4631-b4d7-a2de5babb190');
}

run();

