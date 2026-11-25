/**
 * Runtime Verification & Forensic API Audit for Patient Records Regression
 * Target Patient: 787e5187-7859-4320-bb1a-465a57dd086a (Marcus Doe)
 * Doctor: Dr. Sarah Jenkins (+16505550003)
 */

const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://360api.vnvision.in/api/v1';
const PATIENT_ID = '787e5187-7859-4320-bb1a-465a57dd086a';
const TOKEN_CACHE_PATH = path.resolve(__dirname, '..', '.token_cache.json');

async function getValidToken() {
  if (!fs.existsSync(TOKEN_CACHE_PATH)) {
    throw new Error('.token_cache.json not found!');
  }
  const cached = JSON.parse(fs.readFileSync(TOKEN_CACHE_PATH, 'utf8'));

  // Test current token
  try {
    const testRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${cached.accessToken}` },
    });
    if (testRes.status === 200) {
      return cached.accessToken;
    }
  } catch {}

  // Attempt refresh
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
        console.log('Access token successfully refreshed via refreshToken.');
        return newToken;
      }
    } catch {}
  }

  // Attempt OTP verify
  const otpRes = await (await fetch(`${BASE_URL}/auth/otp/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '+16505550003' }),
  })).json();

  const challengeId = otpRes.data?.challengeId || otpRes.challengeId;
  const verRes = await (await fetch(`${BASE_URL}/auth/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ challengeId, otpCode: '123456' }),
  })).json();

  const tokenData = verRes.data || verRes;
  if (tokenData?.accessToken) {
    fs.writeFileSync(TOKEN_CACHE_PATH, JSON.stringify({
      accessToken: tokenData.accessToken,
      refreshToken: tokenData.refreshToken,
    }, null, 2));
    return tokenData.accessToken;
  }
  throw new Error('Unable to obtain valid doctor token');
}

async function run() {
  console.log('========================================================================');
  console.log('FORENSIC RUNTIME AUDIT: PATIENT RECORDS REGRESSION INVESTIGATION');
  console.log('========================================================================\n');

  const accessToken = await getValidToken();
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  const auditEndpoints = [
    {
      name: 'Doctor Profile (Self)',
      method: 'GET',
      url: `${BASE_URL}/doctors/me`,
      expected: 200,
    },
    {
      name: 'Doctor Statistics',
      method: 'GET',
      url: `${BASE_URL}/doctors/statistics`,
      expected: 200,
    },
    {
      name: 'Doctor Assigned Appointments',
      method: 'GET',
      url: `${BASE_URL}/appointments/doctor/me`,
      expected: 200,
    },
    {
      name: 'Doctor Patients List (Registry)',
      method: 'GET',
      url: `${BASE_URL}/doctors/patients`,
      expected: 200,
    },
    {
      name: 'Doctor Patient Profile (Marcus Doe)',
      method: 'GET',
      url: `${BASE_URL}/doctors/patients/${PATIENT_ID}`,
      expected: 200,
    },
    {
      name: 'Doctor Patient Prescriptions',
      method: 'GET',
      url: `${BASE_URL}/doctors/patients/${PATIENT_ID}/prescriptions?page=1&limit=50`,
      expected: 200,
    },
    {
      name: 'Doctor Patient Medical Records',
      method: 'GET',
      url: `${BASE_URL}/doctors/patients/${PATIENT_ID}/medical-records?page=1&limit=100`,
      expected: 200,
    },
    {
      name: 'Doctor Patient Timeline',
      method: 'GET',
      url: `${BASE_URL}/doctors/patients/${PATIENT_ID}/medical-records/timeline?page=1&limit=100`,
      expected: 200,
    },
    {
      name: 'Doctor Patient Admissions',
      method: 'GET',
      url: `${BASE_URL}/doctors/patients/${PATIENT_ID}/admissions?page=1&limit=50`,
      expected: 200,
    },
    {
      name: 'Doctor Patient Vitals',
      method: 'GET',
      url: `${BASE_URL}/doctors/patients/${PATIENT_ID}/vitals`,
      expected: 200,
    },
    {
      name: 'Non-Existent Patient Control (UUID Zero)',
      method: 'GET',
      url: `${BASE_URL}/doctors/patients/00000000-0000-0000-0000-000000000000`,
      expected: 404,
    },
  ];

  const results = [];

  for (const ep of auditEndpoints) {
    try {
      const res = await fetch(ep.url, {
        method: ep.method,
        headers,
      });

      const bodyText = await res.text();
      let bodyJson;
      try {
        bodyJson = JSON.parse(bodyText);
      } catch {
        bodyJson = bodyText;
      }

      const passed = res.status === ep.expected;
      console.log(`[${res.status}] ${ep.method} ${ep.url}`);
      console.log(`       Name: ${ep.name}`);
      console.log(`       Status: ${passed ? 'OK' : 'SERVER DEFECT / ANOMALY'}`);
      console.log(`       Response snippet: ${JSON.stringify(bodyJson).slice(0, 150)}...\n`);

      results.push({
        name: ep.name,
        method: ep.method,
        url: ep.url,
        status: res.status,
        expected: ep.expected,
        passed,
        body: bodyJson,
      });
    } catch (err) {
      console.error(`ERROR contacting ${ep.url}:`, err.message);
      results.push({
        name: ep.name,
        method: ep.method,
        url: ep.url,
        status: 0,
        expected: ep.expected,
        passed: false,
        error: err.message,
      });
    }
  }

  // Summary Table
  console.log('========================================================================');
  console.log('AUDIT SUMMARY');
  console.log('========================================================================');
  console.table(
    results.map((r) => ({
      Endpoint: r.name,
      Method: r.method,
      Status: r.status,
      Expected: r.expected,
      Outcome: r.passed ? 'PASS' : (r.status === 500 ? 'FAIL (HTTP 500)' : `FAIL (${r.status})`),
      ServerMessage: typeof r.body === 'object' && r.body?.message ? r.body.message : '-',
    }))
  );
}

run();
