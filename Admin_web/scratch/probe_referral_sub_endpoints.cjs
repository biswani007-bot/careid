const fs = require('fs');
const https = require('https');
const path = require('path');

const tokenData = JSON.parse(fs.readFileSync(path.join(__dirname, 'cached_token.json'), 'utf8'));
const token = tokenData.token;

function request(options, data = null) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        const duration = Date.now() - startTime;
        let parsed = body;
        try {
          parsed = JSON.parse(body);
        } catch (e) {}
        resolve({
          statusCode: res.statusCode,
          duration,
          body: parsed
        });
      });
    });

    req.on('error', (err) => {
      resolve({
        statusCode: null,
        error: err.message
      });
    });

    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function run() {
  const baseHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const testId = '00000000-0000-0000-0000-000000000000';
  const customId = 'ref-9021';

  const tests = [
    { method: 'GET', path: `/api/v1/referrals/${customId}/notes`, name: 'Notes list (custom ID)' },
    { method: 'POST', path: `/api/v1/referrals/${customId}/notes`, name: 'Add note (custom ID)', body: { noteText: 'Test clinical coordination note', isPrivate: false } },
    { method: 'GET', path: `/api/v1/referrals/${customId}/history`, name: 'History (custom ID)' },
    { method: 'GET', path: `/api/v1/referrals/${customId}/attachments`, name: 'Attachments list (custom ID)' },
    { method: 'POST', path: `/api/v1/referrals/${customId}/attachments`, name: 'Link attachment (custom ID)', body: { attachmentId: 'attachment-uuid-1' } },
    { method: 'PUT', path: `/api/v1/referrals/${customId}/status`, name: 'Update status (custom ID)', body: { status: 'COMPLETED', reason: 'Consultation finished' } },
    { method: 'PUT', path: `/api/v1/referrals/${customId}/triage`, name: 'Triage (custom ID)', body: { outcome: 'APPROVED', reason: 'Triage complete' } },
    { method: 'DELETE', path: `/api/v1/referrals/${customId}`, name: 'Soft-delete (custom ID)' },
    
    // UUID version
    { method: 'GET', path: `/api/v1/referrals/${testId}/notes`, name: 'Notes list (UUID)' },
    { method: 'GET', path: `/api/v1/referrals/${testId}/history`, name: 'History (UUID)' },
    { method: 'GET', path: `/api/v1/referrals/${testId}/attachments`, name: 'Attachments list (UUID)' },
    { method: 'PUT', path: `/api/v1/referrals/${testId}/status`, name: 'Update status (UUID)', body: { status: 'COMPLETED', reason: 'Consultation finished' } },
    { method: 'PUT', path: `/api/v1/referrals/${testId}/triage`, name: 'Triage (UUID)', body: { outcome: 'APPROVED', reason: 'Triage complete' } },
  ];

  for (const t of tests) {
    console.log(`\n--- Testing ${t.name} [${t.method} ${t.path}] ---`);
    const res = await request({
      hostname: '360api.vnvision.in',
      path: t.path,
      method: t.method,
      headers: baseHeaders
    }, t.body);
    console.log(`Status: ${res.statusCode} (${res.duration}ms)`);
    console.log('Response:', JSON.stringify(res.body, null, 2));
  }
}

run();

