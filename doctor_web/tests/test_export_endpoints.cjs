const https = require('https');
const fs = require('fs');
const path = require('path');

const BASE_HOST = '360api.vnvision.in';
const BASE_PATH = '/api/v1';

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        resolve({
          status: res.statusCode,
          headers: res.headers,
          buf,
          data: (res.headers['content-type']?.includes('application/json') ? JSON.parse(buf.toString('utf8')) : null)
        });
      });
    });
    req.on('error', reject);
    if (data) req.write(typeof data === 'string' ? data : JSON.stringify(data));
    req.end();
  });
}

async function getDoctorToken() {
  const cachePath = path.resolve(process.cwd(), '.token_cache.json');
  if (fs.existsSync(cachePath)) {
    const cached = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    if (cached.accessToken) {
      const test = await request({
        hostname: BASE_HOST,
        path: `${BASE_PATH}/auth/me`,
        method: 'GET',
        headers: { Authorization: `Bearer ${cached.accessToken}` }
      });
      if (test.status === 200) {
        return cached.accessToken;
      }
      if (cached.refreshToken) {
        const ref = await request({
          hostname: BASE_HOST,
          path: `${BASE_PATH}/auth/token/refresh`,
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }, { refreshToken: cached.refreshToken });
        const newToken = ref.data?.data?.accessToken || ref.data?.accessToken;
        if (newToken) {
          cached.accessToken = newToken;
          fs.writeFileSync(cachePath, JSON.stringify(cached, null, 2));
          return newToken;
        }
      }
    }
  }

  const reqRes = await request({
    hostname: BASE_HOST,
    path: `${BASE_PATH}/auth/otp/request`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { phone: '+16505550003' });

  const challengeId = reqRes.data?.data?.challengeId || reqRes.data?.challengeId;
  const verRes = await request({
    hostname: BASE_HOST,
    path: `${BASE_PATH}/auth/otp/verify`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { challengeId, otpCode: '123456' });

  const tokenData = verRes.data?.data || verRes.data;
  if (tokenData?.accessToken) {
    fs.writeFileSync(cachePath, JSON.stringify({
      accessToken: tokenData.accessToken,
      refreshToken: tokenData.refreshToken,
      updatedAt: Date.now()
    }, null, 2));
    return tokenData.accessToken;
  }
  throw new Error('Could not acquire doctor token.');
}

async function run() {
  const token = await getDoctorToken();
  const patientId = '787e5187-7859-4320-bb1a-465a57dd086a';
  console.log('Got doctor token, length:', token.length);

  console.log('\n--- Test 1: GET /doctors/patients/:id/medical-records/export?format=PDF ---');
  const r1 = await request({
    hostname: BASE_HOST,
    path: `${BASE_PATH}/doctors/patients/${patientId}/medical-records/export?format=PDF`,
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/pdf'
    }
  });
  console.log('Status:', r1.status);
  console.log('Content-Type:', r1.headers['content-type']);
  console.log('Content-Disposition:', r1.headers['content-disposition']);
  console.log('Length:', r1.buf.length);
  console.log('Is PDF magic number (%PDF):', r1.buf.slice(0, 4).toString('utf8') === '%PDF');
  console.log('Preview (150 chars):', r1.buf.slice(0, 150).toString('utf8'));

  console.log('\n--- Test 2: GET /doctors/patients/:id/medical-records/export?format=JSON ---');
  const r2 = await request({
    hostname: BASE_HOST,
    path: `${BASE_PATH}/doctors/patients/${patientId}/medical-records/export?format=JSON`,
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    }
  });
  console.log('Status:', r2.status);
  console.log('Content-Type:', r2.headers['content-type']);
  console.log('Content-Disposition:', r2.headers['content-disposition']);
  console.log('Length:', r2.buf.length);
  console.log('Preview (150 chars):', r2.buf.slice(0, 150).toString('utf8'));

  console.log('\n--- Test 1 Raw Buffer Parsing ---');
  try {
    const parsedR1 = JSON.parse(r1.buf.toString('utf8'));
    console.log('parsedR1 keys:', Object.keys(parsedR1));
    console.log('parsedR1.data keys:', Object.keys(parsedR1.data || {}));
    if (parsedR1.data?.stream) {
      console.log('parsedR1.data.stream keys:', Object.keys(parsedR1.data.stream));
      console.log('Stream data type:', typeof parsedR1.data.stream);
    }
    console.log('Sample data:', JSON.stringify(parsedR1.data).slice(0, 1000));
  } catch (e) {
    console.log('Failed to parse r1 as JSON:', e.message);
  }

  console.log('\n--- Testing End-to-End Extraction Pipeline ---');
  function parseContentDispositionFilename(header) {
    if (!header) return null;
    const utf8Match = header.match(/filename\*=UTF-8''([^;\n]+)/i);
    if (utf8Match) return decodeURIComponent(utf8Match[1].trim());
    const quotedMatch = header.match(/filename="([^"]+)"/i);
    if (quotedMatch) return quotedMatch[1].trim();
    const bareMatch = header.match(/filename=([^;\s]+)/i);
    if (bareMatch) return bareMatch[1].trim();
    return null;
  }

  const rawFilename = parseContentDispositionFilename(r1.headers['content-disposition']);
  console.log('Extracted filename from header:', rawFilename);

  // Parse buffer
  let finalBlobBytes = null;
  let finalMime = 'application/pdf';
  let finalFilename = rawFilename || `careid-clinical-record-${patientId.substring(0, 8)}.pdf`;

  if (r1.buf.length >= 4 && r1.buf[0] === 0x25 && r1.buf[1] === 0x50 && r1.buf[2] === 0x44 && r1.buf[3] === 0x46) {
    console.log('Detected raw binary PDF');
    finalBlobBytes = r1.buf;
  } else {
    try {
      const json = JSON.parse(r1.buf.toString('utf8'));
      const streamBuffer = json.data?.stream?._readableState?.buffer;
      if (Array.isArray(streamBuffer) && streamBuffer.length > 0) {
        console.log('Detected StreamableFile buffer serialization');
        const chunks = streamBuffer.map(b => Buffer.from(b.data || b));
        finalBlobBytes = Buffer.concat(chunks);
      } else if (json.data) {
        console.log('Detected JSON clinical record export');
        finalBlobBytes = Buffer.from(JSON.stringify(json.data, null, 2), 'utf8');
        finalMime = 'application/json';
        finalFilename = finalFilename.replace(/\.pdf$/i, '.json');
      }
    } catch {
      console.log('Falling back to raw buffer');
      finalBlobBytes = r1.buf;
    }
  }

  console.log('Pipeline Result:');
  console.log('Final Filename:', finalFilename);
  console.log('Final MIME:', finalMime);
  console.log('Final Bytes Length:', finalBlobBytes.length);
  console.log('Is valid PDF (%PDF-1.4):', finalBlobBytes.slice(0, 8).toString('utf8'));

  if (r2.data?.data) {
    console.log('r2.data.data keys:', Object.keys(r2.data.data));
    console.log('r2.data.data sample:', JSON.stringify(r2.data.data).slice(0, 500));
  }
  const rxListRes = await request({
    hostname: BASE_HOST,
    path: `${BASE_PATH}/doctors/patients/${patientId}/prescriptions?page=1&limit=5`,
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    }
  });
  const rxList = rxListRes.data?.data || [];
  console.log('Found prescriptions count:', rxList.length);
  if (rxList.length > 0) {
    const rxId = rxList[0].id;
    console.log('Testing GET /prescriptions/:id/export with rxId:', rxId);
    const r3 = await request({
      hostname: BASE_HOST,
      path: `${BASE_PATH}/prescriptions/${rxId}/export`,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json'
      }
    });
    console.log('Status:', r3.status);
    console.log('Content-Type:', r3.headers['content-type']);
    console.log('Content-Disposition:', r3.headers['content-disposition']);
    console.log('Preview (150 chars):', r3.buf.slice(0, 150).toString('utf8'));
  }
}

run().catch(console.error);
