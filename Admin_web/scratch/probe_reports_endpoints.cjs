const https = require('https');
const fs = require('fs');
const path = require('path');

const TOKEN_FILE = path.join(__dirname, 'cached_token.json');
const tokenData = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
const token = tokenData.token;

function apiRequest(options, postData = null) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const req = https.request({
      hostname: '360api.vnvision.in',
      port: 443,
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(options.headers || {})
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const responseTimeMs = Date.now() - startTime;
        let json;
        try { json = JSON.parse(data); } catch (e) { json = data; }
        resolve({
          path: options.path,
          method: options.method || 'GET',
          status: res.statusCode,
          headers: res.headers,
          body: json,
          responseTimeMs
        });
      });
    });
    req.on('error', (err) => {
      resolve({
        path: options.path,
        method: options.method || 'GET',
        status: 'ERROR',
        error: err.message
      });
    });
    if (postData) req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    req.end();
  });
}

async function run() {
  console.log('========================================================');
  console.log('CAREID REPORTS & ANALYTICS LIVE BACKEND PROBE');
  console.log('========================================================\n');

  const endpointsToTest = [
    // Clinical Reports & Analytics (Folder 20)
    { method: 'GET', path: '/api/v1/reports/dashboard/executive' },
    { method: 'GET', path: '/api/v1/reports/dashboard/executive?startDate=2026-01-01&endDate=2026-11-03' },
    { method: 'GET', path: '/api/v1/reports/analytics/modules/PATIENT' },
    { method: 'GET', path: '/api/v1/reports/analytics/modules/REFERRALS' },
    { method: 'GET', path: '/api/v1/reports/analytics/modules/FACILITY' },
    { method: 'GET', path: '/api/v1/reports/analytics/modules/OCR' },
    { method: 'GET', path: '/api/v1/reports/definitions' },
    { method: 'GET', path: '/api/v1/reports/generated' },
    { method: 'GET', path: '/api/v1/reports/widgets' },
    { method: 'GET', path: '/api/v1/reports/widgets?isEnabledOnly=true' },
    { method: 'GET', path: '/api/v1/reports/snapshots' },
    { method: 'GET', path: '/api/v1/reports' },
    { method: 'GET', path: '/api/v1/reports/categories' },
    { method: 'GET', path: '/api/v1/reports/search?q=cardiology' },
    { method: 'GET', path: '/api/v1/reports/timeline' },

    // Admin & Ops Dashboard / Stats
    { method: 'GET', path: '/api/v1/admin/dashboard/stats' },
    { method: 'GET', path: '/api/v1/admin/dashboard/summary' },
    { method: 'GET', path: '/api/v1/admin/medical-records' },
    { method: 'GET', path: '/api/v1/facilities' },
    { method: 'GET', path: '/api/v1/doctors' },
    { method: 'GET', path: '/api/v1/admin/patients' },

    // Referral Activity & SLA
    { method: 'GET', path: '/api/v1/referrals/dashboard/stats' },
    { method: 'GET', path: '/api/v1/referrals/dashboard/stats?facilityId=3b6a3f47-ed9c-4010-bb1a-e0fdea5f4abb' },

    // OCR Performance
    { method: 'GET', path: '/api/v1/ocr/dashboard' },
    { method: 'GET', path: '/api/v1/ocr/statistics' },

    // Observability & System Health (Folder 23 & 01)
    { method: 'GET', path: '/api/v1/observability/dashboard' },
    { method: 'GET', path: '/api/v1/observability/health' },
    { method: 'GET', path: '/api/v1/observability/performance' },
    { method: 'GET', path: '/api/v1/observability/statistics' },
    { method: 'GET', path: '/api/v1/observability/metrics' },
    { method: 'GET', path: '/api/v1/health' },
    { method: 'GET', path: '/api/v1/ready' },
    { method: 'GET', path: '/api/v1/live' },

    // Security & Compliance Reports
    { method: 'GET', path: '/api/v1/security/compliance/reports' },

    // QR Usage stats
    { method: 'GET', path: '/api/v1/qr/statistics' }
  ];

  const results = [];
  for (const ep of endpointsToTest) {
    const res = await apiRequest({ path: ep.path, method: ep.method });
    console.log(`[${res.status}] ${res.method} ${res.path} (${res.responseTimeMs}ms)`);
    results.push(res);
  }

  fs.writeFileSync('scratch/reports_probe_results.json', JSON.stringify(results, null, 2));
  console.log('\nWrote full results to scratch/reports_probe_results.json');
}

run().catch(console.error);

