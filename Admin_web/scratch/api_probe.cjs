const https = require('https');
const fs = require('fs');

const TOKEN_CACHE_FILE = 'C:/Users/biswa/.gemini/antigravity/brain/e0785a94-53fe-4f28-b816-f2efe4edf49e/scratch/cached_token.json';

function reqHttps(options, postData) {
  return new Promise((resolve, reject) => {
    const r = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    r.on('error', reject);
    if (postData) r.write(postData);
    r.end();
  });
}

async function getValidToken() {
  if (fs.existsSync(TOKEN_CACHE_FILE)) {
    try {
      const cached = JSON.parse(fs.readFileSync(TOKEN_CACHE_FILE, 'utf8'));
      const payload = JSON.parse(Buffer.from(cached.token.split('.')[1], 'base64').toString());
      if (payload.exp > Math.floor(Date.now() / 1000) + 60) {
        return cached.token;
      }
    } catch {}
  }

  // Obtain fresh token via OTP
  const phones = ['+16505550002', '+16505550001', '+16505550003'];
  for (const phone of phones) {
    try {
      const reqData = JSON.stringify({ phone });
      const otpRes = await reqHttps({
        hostname: '360api.vnvision.in',
        path: '/api/v1/auth/otp/request',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(reqData) }
      }, reqData);

      const otpJson = JSON.parse(otpRes.body);
      const challengeId = otpJson.data?.challengeId || otpJson.challengeId;
      if (challengeId) {
        const verifyData = JSON.stringify({ challengeId, otpCode: '123456' });
        const verifyRes = await reqHttps({
          hostname: '360api.vnvision.in',
          path: '/api/v1/auth/otp/verify',
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(verifyData) }
        }, verifyData);

        const verifyJson = JSON.parse(verifyRes.body);
        const token = verifyJson.data?.accessToken;
        if (token) {
          fs.writeFileSync(TOKEN_CACHE_FILE, JSON.stringify({ token, time: Date.now() }));
          console.log('Obtained fresh token for', phone);
          return token;
        }
      }
    } catch (e) {
      console.error('Error getting token for', phone, e.message);
    }
  }
  throw new Error('Could not obtain valid token');
}

async function probe() {
  const token = await getValidToken();

  async function test(p, method = 'GET') {
    const res = await reqHttps({
      hostname: '360api.vnvision.in',
      path: p,
      method,
      headers: {
        'Authorization': 'Bearer ' + token,
        'Accept': 'application/json'
      }
    });
    console.log(`[${method}] ${p} => Status ${res.status}`);
    try {
      const j = JSON.parse(res.body);
      if (Array.isArray(j)) {
        console.log(`   Array length: ${j.length}`);
        if (j.length > 0) console.log(`   Sample:`, JSON.stringify(j[0]).slice(0, 200));
      } else if (j.data) {
        if (Array.isArray(j.data)) {
          console.log(`   data array length: ${j.data.length}`);
          if (j.data.length > 0) console.log(`   Sample:`, JSON.stringify(j.data[0]).slice(0, 200));
        } else {
          console.log(`   data keys:`, Object.keys(j.data));
          console.log(`   data:`, JSON.stringify(j.data).slice(0, 200));
        }
      } else {
        console.log(`   Body:`, JSON.stringify(j).slice(0, 200));
      }
    } catch {
      console.log(`   Raw:`, res.body.slice(0, 100));
    }
  }

  console.log('\n--- PROBING PATIENT & ADMIN ENDPOINTS ---');
  await test('/api/v1/admin/dashboard/stats');
  await test('/api/v1/admin/dashboard/summary');
  await test('/api/v1/admin/users');
  await test('/api/v1/admin/patients');
  await test('/api/v1/patients');
  await test('/api/v1/patients/me');
  await test('/api/v1/patients/me/full');
  await test('/api/v1/health-cards');
  await test('/api/v1/health-cards/search?q=a');
  await test('/api/v1/referrals');
}

probe().catch(console.error);

