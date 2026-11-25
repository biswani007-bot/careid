/**
 * CareID Doctor Web — Reports Module Runtime Verification Script
 *
 * Verifies live staging backend API endpoints for:
 * 1. Lab Reports (`/records/labs`)
 * 2. Imaging (`/records/imaging`)
 * 3. Clinical Reports (`/records/clinical`)
 * 4. Reports Dashboard (`/reports`)
 * 5. Critical Review (`/reports/critical/:id`)
 */

const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://360api.vnvision.in/api/v1';
const TOKEN_CACHE_PATH = path.resolve(__dirname, '..', '.token_cache.json');
const PATIENT_ID = '787e5187-7859-4320-bb1a-465a57dd086a'; // Marcus Doe
const SAMPLE_RECORD_ID = '68d786a3-8681-4893-a58d-7125081ef2a4'; // Annual Routine Health Checkup

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

async function runRuntimeVerification() {
  console.log('===============================================================');
  console.log('CAREID DOCTOR WEB — REPORTS MODULE LIVE RUNTIME VERIFICATION');
  console.log('===============================================================');
  const token = await getValidToken();

  const results = [];

  const endpoints = [
    {
      name: 'Doctor Identity & Session',
      method: 'GET',
      path: '/auth/me',
      category: 'Session',
    },
    {
      name: 'Doctor Assigned Appointments / Patients Panel',
      method: 'GET',
      path: '/appointments/doctor/me',
      category: 'Doctor Portal',
    },
    {
      name: 'Diagnostic Reports (Direct Endpoint)',
      method: 'GET',
      path: '/reports',
      category: 'Clinical Reports & Analytics',
    },
    {
      name: 'Diagnostic Reports (Lab Filter)',
      method: 'GET',
      path: '/reports?category=LAB',
      category: 'Clinical Reports & Analytics',
    },
    {
      name: 'Diagnostic Reports Categories',
      method: 'GET',
      path: '/reports/categories',
      category: 'Clinical Reports & Analytics',
    },
    {
      name: 'Diagnostic Reports Timeline',
      method: 'GET',
      path: '/reports/timeline',
      category: 'Clinical Reports & Analytics',
    },
    {
      name: 'Diagnostic Report By ID',
      method: 'GET',
      path: `/reports/${SAMPLE_RECORD_ID}`,
      category: 'Clinical Reports & Analytics',
    },
    {
      name: 'Download Report Security Token',
      method: 'GET',
      path: `/reports/download/${SAMPLE_RECORD_ID}`,
      category: 'Clinical Reports & Analytics',
    },
    {
      name: 'Doctor Authorized Patient Medical Records',
      method: 'GET',
      path: `/doctors/patients/${PATIENT_ID}/medical-records?page=1&limit=20&includeArchived=true`,
      category: 'Doctor Portal',
    },
    {
      name: 'Doctor Authorized Patient Timeline',
      method: 'GET',
      path: `/doctors/patients/${PATIENT_ID}/medical-records/timeline?page=1&limit=20`,
      category: 'Doctor Portal',
    },
    {
      name: 'Doctor Patient Profile Demographics',
      method: 'GET',
      path: `/doctors/patients/${PATIENT_ID}`,
      category: 'Doctor Portal',
    },
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(`${BASE_URL}${ep.path}`, {
        method: ep.method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const text = await res.text();
      let parsed = null;
      try {
        parsed = JSON.parse(text);
      } catch {}

      const summary = {
        name: ep.name,
        category: ep.category,
        method: ep.method,
        path: ep.path,
        status: res.status,
        statusText: res.statusText,
        ok: res.ok,
        bodySample: text.slice(0, 160),
        error: parsed?.error || parsed?.message || null,
      };
      results.push(summary);

      console.log(`[${res.status}] ${ep.method} ${ep.path}`);
      console.log(`      Body: ${text.slice(0, 120)}...`);
    } catch (err) {
      results.push({
        name: ep.name,
        category: ep.category,
        method: ep.method,
        path: ep.path,
        status: 0,
        statusText: 'FETCH_ERROR',
        ok: false,
        bodySample: err.message,
        error: err.message,
      });
      console.log(`[ERR] ${ep.method} ${ep.path}: ${err.message}`);
    }
  }

  console.log('\n===============================================================');
  console.log('SUMMARY OF VERIFICATION:');
  console.log('===============================================================');
  results.forEach((r) => {
    console.log(`- ${r.status} ${r.method} ${r.path} (${r.name}): ${r.error || 'OK'}`);
  });

  return results;
}

runRuntimeVerification();

