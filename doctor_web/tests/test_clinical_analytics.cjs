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

async function testClinicalAnalytics() {
  const doctorToken = await getValidToken();
  const eps = [
    '/reports/dashboard/executive',
    '/reports/analytics/modules/records',
    '/reports/analytics/modules/patients',
    '/reports/definitions',
    '/reports/generated',
    '/reports/widgets',
  ];

  for (const ep of eps) {
    try {
      const res = await fetch(BASE_URL + ep, {
        headers: { Authorization: `Bearer ${doctorToken}` }
      });
      const text = await res.text();
      console.log(`[${res.status}] ${ep} => ${text.slice(0, 160)}`);
    } catch (e) {
      console.log(`ERR ${ep}:`, e.message);
    }
  }
}

testClinicalAnalytics();
