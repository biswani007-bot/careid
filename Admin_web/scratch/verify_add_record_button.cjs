const fs = require('fs');
const path = require('path');
const https = require('https');
const puppeteer = require('puppeteer');

const ARTIFACT_DIR = 'C:/Users/biswa/.gemini/antigravity/brain/e0785a94-53fe-4f28-b816-f2efe4edf49e';
const BASE_URL = 'http://localhost:5173';

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

  const viewports = [
    { name: 'desktop_1366x768', width: 1366, height: 768 },
    { name: 'tablet_768x1024', width: 768, height: 1024 },
    { name: 'mobile_390x844', width: 390, height: 844 },
  ];

  for (const vp of viewports) {
    console.log(`\n--- Testing ${vp.name} ---`);
    const page = await browser.newPage();
    await page.setViewport({ width: vp.width, height: vp.height });
    await setupAuth(page);
    await page.goto(BASE_URL + '/admin/records/medical', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));

    const btnInfo = await page.evaluate(() => {
      const btn = document.querySelector('.btn-category-add');
      if (!btn) return { found: false };
      const svgCount = btn.querySelectorAll('svg').length;
      const spanText = btn.querySelector('span')?.innerText?.trim();
      const fullText = btn.innerText?.trim();
      const styles = window.getComputedStyle(btn);
      return {
        found: true,
        fullText,
        spanText,
        svgCount,
        backgroundColor: styles.backgroundColor,
        color: styles.color,
        borderRadius: styles.borderRadius,
        fontSize: styles.fontSize,
        padding: styles.padding,
      };
    });

    console.log('Button details:', btnInfo);

    // Verify click functionality opens modal
    if (vp.name === 'desktop_1366x768') {
      const btn = await page.$('.btn-category-add');
      if (btn) {
        await btn.click();
        await new Promise(r => setTimeout(r, 1000));
        const modalOpen = await page.evaluate(() => {
          const modal = document.querySelector('.category-modal-card');
          return {
            isOpen: !!modal,
            title: modal?.querySelector('.category-modal-title')?.innerText?.trim()
          };
        });
        console.log('Modal opened on click:', modalOpen);
        await page.screenshot({ path: path.join(ARTIFACT_DIR, 'add_record_modal_verified.png') });
      }
    }

    await page.screenshot({ path: path.join(ARTIFACT_DIR, `add_record_btn_${vp.name}.png`) });
    await page.close();
  }

  await browser.close();
  console.log('\nVerification complete.');
}

verify().catch(err => {
  console.error('Error during verification:', err);
  process.exit(1);
});

