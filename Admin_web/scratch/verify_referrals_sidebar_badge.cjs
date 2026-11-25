const fs = require('fs');
const path = require('path');
const https = require('https');
const puppeteer = require('puppeteer');

const ARTIFACT_DIR = 'C:/Users/biswa/.gemini/antigravity/brain/e0785a94-53fe-4f28-b816-f2efe4edf49e';
const BASE_URL = 'http://localhost:5173';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, Accept, Origin, X-Requested-With',
};

function httpReq(options, postData) {
  return new Promise((resolve, reject) => {
    const opts = { ...options, rejectUnauthorized: false };
    const r = https.request(opts, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(body) }); }
        catch { resolve({ status: res.statusCode, body }); }
      });
    });
    r.on('error', reject);
    if (postData) r.write(postData);
    r.end();
  });
}

async function getFreshToken() {
  const reqData = JSON.stringify({ phone: '+16505550001' });
  const otpRes = await httpReq({
    hostname: '360api.vnvision.in', path: '/api/v1/auth/otp/request', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(reqData) }
  }, reqData);

  const challengeId = otpRes.body?.data?.challengeId;
  const verifyData = JSON.stringify({ challengeId, otpCode: '123456' });
  const verifyRes = await httpReq({
    hostname: '360api.vnvision.in', path: '/api/v1/auth/otp/verify', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(verifyData) }
  }, verifyData);

  const token = verifyRes.body?.data?.accessToken;
  const refreshToken = verifyRes.body?.data?.refreshToken;
  const tokenData = { token, accessToken: token, refreshToken };
  fs.writeFileSync('scratch/cached_token.json', JSON.stringify(tokenData, null, 2));
  return token;
}

async function verify() {
  const token = await getFreshToken();
  console.log('Acquired active token:', token.slice(0, 20) + '...');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const setupAuth = async (page) => {
    await page.goto(BASE_URL + '/login', { waitUntil: 'domcontentloaded' });
    await page.evaluate((tok) => {
      const user = {
        id: 'bc6f6875-434c-4050-b893-07343cc27986',
        email: 'superadmin@careid.test',
        phone: '+16505550001',
        status: 'ACTIVE',
        roles: ['SUPER_ADMIN'],
        permissions: ['read:all', 'write:all', 'delete:all', 'read:audit-logs', 'manage:roles']
      };
      localStorage.setItem('careid_access_token', tok);
      sessionStorage.setItem('careid_access_token', tok);
      localStorage.setItem('careid_user_session', JSON.stringify(user));
      sessionStorage.setItem('careid_user_session', JSON.stringify(user));
    }, token);
  };

  const getReferralBadge = async (page) => {
    return page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.sidebar-nav-item'));
      const refItem = items.find(i => i.innerText.includes('Referrals'));
      if (!refItem) return { found: false, currentUrl: window.location.href };
      const badge = refItem.querySelector('.sidebar-badge');
      return {
        found: true,
        itemText: refItem.innerText.replace(/\s+/g, ' ').trim(),
        hasBadge: !!badge,
        badgeText: badge ? badge.innerText.trim() : null,
        badgeClass: badge ? badge.className : null,
        badgeTitle: badge ? badge.getAttribute('title') : null,
      };
    });
  };

  const getReferralKpis = async (page) => {
    return page.evaluate(() => {
      return Array.from(document.querySelectorAll('.referral-metric-card, .metric-card, [class*="metric"]')).map(c => ({
        label: c.querySelector('.referral-metric-label')?.innerText.trim(),
        value: c.querySelector('.referral-metric-value')?.innerText.trim()
      })).filter(k => k.label);
    });
  };

  console.log('========================================================================');
  console.log('1. LIVE BACKEND: 1 TOTAL REFERRAL, 0 PENDING, 1 ACCEPTED');
  console.log('========================================================================');
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    await setupAuth(page);
    await page.goto(BASE_URL + '/admin/referrals', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));

    const badge = await getReferralBadge(page);
    const kpis = await getReferralKpis(page);

    console.log('Sidebar Referrals Badge (Live):', badge);
    console.log('Overview KPI Cards:', kpis);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'referrals_sidebar_live_total_1.png') });
    await page.close();
  }

  console.log('\n========================================================================');
  console.log('2. SIMULATE 0 TOTAL REFERRALS');
  console.log('========================================================================');
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    await page.setRequestInterception(true);
    page.on('request', req => {
      const url = req.url();
      if (req.method() === 'OPTIONS') {
        req.respond({ status: 204, headers: CORS_HEADERS });
        return;
      }
      if (url.includes('/api/v1/referrals/dashboard/stats')) {
        req.respond({
          status: 200, contentType: 'application/json', headers: CORS_HEADERS,
          body: JSON.stringify({
            success: true, statusCode: 200,
            data: { totalReferrals: 0, pendingTriageCount: 0, acceptedCount: 0, completedCount: 0, avgCompletionTimeHours: 0 }
          })
        });
      } else {
        req.continue();
      }
    });

    await setupAuth(page);
    await page.goto(BASE_URL + '/admin/referrals', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));

    const badge = await getReferralBadge(page);
    console.log('Sidebar Referrals Badge (0 Referrals):', badge);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'referrals_sidebar_total_0.png') });
    await page.close();
  }

  console.log('\n========================================================================');
  console.log('3. SIMULATE 5 TOTAL REFERRALS');
  console.log('========================================================================');
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    await page.setRequestInterception(true);
    page.on('request', req => {
      const url = req.url();
      if (req.method() === 'OPTIONS') {
        req.respond({ status: 204, headers: CORS_HEADERS });
        return;
      }
      if (url.includes('/api/v1/referrals/dashboard/stats')) {
        req.respond({
          status: 200, contentType: 'application/json', headers: CORS_HEADERS,
          body: JSON.stringify({
            success: true, statusCode: 200,
            data: { totalReferrals: 5, pendingTriageCount: 2, acceptedCount: 2, completedCount: 1, avgCompletionTimeHours: 12 }
          })
        });
      } else {
        req.continue();
      }
    });

    await setupAuth(page);
    await page.goto(BASE_URL + '/admin/referrals', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));

    const badge = await getReferralBadge(page);
    console.log('Sidebar Referrals Badge (5 Referrals):', badge);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'referrals_sidebar_total_5.png') });
    await page.close();
  }

  console.log('\n========================================================================');
  console.log('4. SIMULATE API FAILURE (HTTP 500) -> HIDE BADGE');
  console.log('========================================================================');
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    await page.setRequestInterception(true);
    page.on('request', req => {
      const url = req.url();
      if (req.method() === 'OPTIONS') {
        req.respond({ status: 204, headers: CORS_HEADERS });
        return;
      }
      if (url.includes('/api/v1/referrals/dashboard/stats')) {
        req.respond({
          status: 500, contentType: 'application/json', headers: CORS_HEADERS,
          body: JSON.stringify({
            success: false, statusCode: 500, error: 'InternalServerError', message: 'Stats server down'
          })
        });
      } else {
        req.continue();
      }
    });

    await setupAuth(page);
    await page.goto(BASE_URL + '/admin/referrals', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));

    const badge = await getReferralBadge(page);
    console.log('Sidebar Referrals Badge (API Error):', badge);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'referrals_sidebar_error.png') });
    await page.close();
  }

  await browser.close();
  console.log('\nAll verification scenarios completed successfully.');
}

verify().catch(err => {
  console.error('Error during verification:', err);
  process.exit(1);
});

