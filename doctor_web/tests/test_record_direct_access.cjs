const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://360api.vnvision.in/api/v1';
const TOKEN_CACHE_PATH = path.resolve(__dirname, '..', '.token_cache.json');

async function getValidToken() {
  const cached = JSON.parse(fs.readFileSync(TOKEN_CACHE_PATH, 'utf8'));
  try {
    const testRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${cached.accessToken}` },
    });
    if (testRes.status === 200) return cached.accessToken;
  } catch {}

  if (cached.refreshToken) {
    try {
      const refRes = await fetch(`${BASE_URL}/auth/token/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: cached.refreshToken }),
      });
      const data = await refRes.json();
      const newToken = data.data?.accessToken || data.accessToken;
      if (newToken) {
        cached.accessToken = newToken;
        if (data.data?.refreshToken) cached.refreshToken = data.data.refreshToken;
        fs.writeFileSync(TOKEN_CACHE_PATH, JSON.stringify(cached, null, 2));
        return newToken;
      }
    } catch {}
  }
  return cached.accessToken;
}

async function testRecordDirectAccess() {
  const token = await getValidToken();
  const testIds = [
    '68d786a3-8681-4893-a58d-7125081ef2a4', // Annual Routine Health Checkup
    '2c992774-feb0-4d0a-8a0c-c64860d8868e', // Automated Staging Verification Record
    'dec25303-5f95-4418-ba01-83ef40b487b0', // Routine Health Checkup
  ];

  for (const id of testIds) {
    console.log(`\nTesting Record ID: ${id}`);
    const eps = [
      `/medical-records/${id}`,
      `/records/${id}`,
      `/medical-records/${id}/attachments`,
      `/reports/${id}`,
      `/reports/download/${id}`,
    ];
    for (const ep of eps) {
      try {
        const res = await fetch(`${BASE_URL}${ep}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const text = await res.text();
        console.log(`  [${res.status}] ${ep} => ${text.slice(0, 140)}`);
      } catch (e) {
        console.log(`  ERR ${ep}: ${e.message}`);
      }
    }
  }
}

testRecordDirectAccess();

