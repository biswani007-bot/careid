/**
 * ==============================================================================
 * CareID Enterprise Backend — Server Health & Readiness Verification Script
 * ==============================================================================
 * Purpose:
 *   Performs HTTP diagnostic checks against the running CareID API instance
 *   to verify liveness, readiness, and PostgreSQL connectivity.
 *
 * Usage:
 *   node scripts/server-healthcheck.js
 *   npm run healthcheck
 * ==============================================================================
 */

require('dotenv').config();
const http = require('http');

const PORT = process.env.PORT || 3073;
const HOST = process.env.HOST || '127.0.0.1';
const PREFIX = process.env.GLOBAL_PREFIX || 'api';
const BASE_URL = `http://${HOST}:${PORT}/${PREFIX}/v1`;

function fetchEndpoint(path) {
  return new Promise((resolve, reject) => {
    const url = `${BASE_URL}${path}`;
    const start = Date.now();
    const req = http.get(url, { timeout: 5000 }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        const duration = Date.now() - start;
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed, duration });
        } catch {
          resolve({ status: res.statusCode, data, duration });
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out after 5000ms'));
    });
  });
}

async function runHealthCheck() {
  console.log('================================================================');
  console.log('  CareID Enterprise API — Server Health & Diagnostics Check');
  console.log('================================================================');
  console.log(`[TARGET] Base URL: ${BASE_URL}\n`);

  let allHealthy = true;

  // 1. Health Probe
  try {
    const res = await fetchEndpoint('/health');
    if (res.status === 200) {
      console.log(`✓ [200 OK] /health (${res.duration}ms): Service is alive and operating normally.`);
    } else {
      console.error(`❌ [${res.status}] /health: Unexpected response:`, res.data);
      allHealthy = false;
    }
  } catch (err) {
    console.error('❌ [FAILED] /health: Unable to connect to server:', err.message);
    allHealthy = false;
  }

  // 2. Readiness Probe (Database connectivity verification)
  try {
    const res = await fetchEndpoint('/ready');
    const payload = res.data && res.data.data ? res.data.data : res.data;
    if (res.status === 200 && (payload.database === 'connected' || payload.status === 'ready')) {
      console.log(`✓ [200 OK] /ready  (${res.duration}ms): PostgreSQL database connectivity verified.`);
    } else {
      console.error(`❌ [${res.status}] /ready: Database probe failed:`, res.data);
      allHealthy = false;
    }
  } catch (err) {
    console.error('❌ [FAILED] /ready: Readiness check failed:', err.message);
    allHealthy = false;
  }

  // 3. Liveness Probe
  try {
    const res = await fetchEndpoint('/live');
    if (res.status === 200) {
      console.log(`✓ [200 OK] /live   (${res.duration}ms): Uptime: ${res.data.uptimeSeconds ? Math.floor(res.data.uptimeSeconds) + 's' : 'active'}`);
    } else {
      console.error(`❌ [${res.status}] /live: Unexpected response:`, res.data);
      allHealthy = false;
    }
  } catch (err) {
    console.error('❌ [FAILED] /live: Liveness check failed:', err.message);
    allHealthy = false;
  }

  console.log('\n================================================================');
  if (allHealthy) {
    console.log('  STATUS: HEALTHY — All API and Database checks passed successfully.');
    console.log('================================================================\n');
    process.exit(0);
  } else {
    console.error('  STATUS: DEGRADED OR OFFLINE — One or more probes failed.');
    console.error('================================================================\n');
    process.exit(1);
  }
}

runHealthCheck();
