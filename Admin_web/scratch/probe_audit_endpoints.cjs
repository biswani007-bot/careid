const https = require('https');
const fs = require('fs');

const token = JSON.parse(fs.readFileSync('scratch/cached_token.json', 'utf8')).accessToken;

function request(path, options = {}) {
  return new Promise((resolve) => {
    const url = new URL(path, 'https://360api.vnvision.in');
    const reqOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    };

    const startTime = Date.now();
    const req = https.request(url, reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        const duration = Date.now() - startTime;
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch (e) {
          parsed = data.substring(0, 300);
        }
        resolve({
          path,
          status: res.statusCode,
          headers: res.headers,
          duration,
          data: parsed,
        });
      });
    });

    req.on('error', (err) => {
      resolve({
        path,
        status: 0,
        error: err.message,
      });
    });

    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function run() {
  console.log('--- Probing Live Audit Endpoints ---');

  // 1. GET /api/v1/admin/audit-logs
  const r1 = await request('/api/v1/admin/audit-logs');
  console.log('1. GET /api/v1/admin/audit-logs ->', r1.status, `(${r1.duration}ms)`);
  if (r1.data) {
    if (Array.isArray(r1.data)) {
      console.log('   Returns array with length:', r1.data.length);
      console.log('   First item sample:', r1.data[0]);
    } else if (r1.data.data) {
      console.log('   Returns wrapped data:', Array.isArray(r1.data.data) ? `Array[${r1.data.data.length}]` : typeof r1.data.data);
      console.log('   Meta/Pagination:', r1.data.meta || r1.data.pagination);
      if (Array.isArray(r1.data.data) && r1.data.data.length > 0) {
        console.log('   Sample item:', r1.data.data[0]);
      }
    } else {
      console.log('   Returns:', JSON.stringify(r1.data).substring(0, 200));
    }
  }

  // 2. GET with pagination params: page=1&limit=5
  const r2 = await request('/api/v1/admin/audit-logs?page=1&limit=5');
  console.log('2. GET /api/v1/admin/audit-logs?page=1&limit=5 ->', r2.status, `(${r2.duration}ms)`);
  if (r2.data) {
    console.log('   Data structure:', Array.isArray(r2.data) ? `Array[${r2.data.length}]` : (Array.isArray(r2.data.data) ? `Wrapped Array[${r2.data.data.length}]` : typeof r2.data));
  }

  // Sample ID from previous call
  let sampleId = null;
  if (Array.isArray(r1.data) && r1.data[0]?.id) sampleId = r1.data[0].id;
  else if (Array.isArray(r1.data?.data) && r1.data.data[0]?.id) sampleId = r1.data.data[0].id;

  // 3. GET /api/v1/admin/audit-logs/:id
  if (sampleId) {
    const r3 = await request(`/api/v1/admin/audit-logs/${sampleId}`);
    console.log(`3. GET /api/v1/admin/audit-logs/${sampleId} ->`, r3.status, `(${r3.duration}ms)`);
    console.log('   Data:', JSON.stringify(r3.data).substring(0, 300));
  } else {
    console.log('3. Skipped GET /api/v1/admin/audit-logs/:id (no sampleId)');
  }

  // 4. GET /api/v1/admin/audit-logs/export?format=csv
  const r4 = await request('/api/v1/admin/audit-logs/export?format=csv');
  console.log('4. GET /api/v1/admin/audit-logs/export?format=csv ->', r4.status, `(${r4.duration}ms)`);
  console.log('   Content-Type:', r4.headers['content-type']);
  console.log('   Body preview:', typeof r4.data === 'string' ? r4.data.substring(0, 200) : JSON.stringify(r4.data).substring(0, 200));

  // 5. GET /api/v1/admin/audit-logs/export?format=json
  const r5 = await request('/api/v1/admin/audit-logs/export?format=json');
  console.log('5. GET /api/v1/admin/audit-logs/export?format=json ->', r5.status, `(${r5.duration}ms)`);
  console.log('   Content-Type:', r5.headers['content-type']);

  // 6. GET /api/v1/security/audit
  const r6 = await request('/api/v1/security/audit');
  console.log('6. GET /api/v1/security/audit ->', r6.status, `(${r6.duration}ms)`);

  // 7. GET /api/v1/governance/audit
  const r7 = await request('/api/v1/governance/audit');
  console.log('7. GET /api/v1/governance/audit ->', r7.status, `(${r7.duration}ms)`);

  // 8. GET /api/v1/observability/logs
  const r8 = await request('/api/v1/observability/logs');
  console.log('8. GET /api/v1/observability/logs ->', r8.status, `(${r8.duration}ms)`);

  fs.writeFileSync('scratch/audit_probe_results.json', JSON.stringify({ r1, r2, sampleId, r4, r5, r6, r7, r8 }, null, 2));
}

run();

