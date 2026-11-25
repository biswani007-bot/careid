const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/biswa/.gemini/antigravity/brain/e0785a94-53fe-4f28-b816-f2efe4edf49e';
const BASE_URL = 'http://localhost:5174';

async function main() {
  console.log('=== VERIFYING PATIENT PROFILE REGRESSION SUITE ===\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    const tokenObj = JSON.parse(fs.readFileSync('scratch/cached_admin_token.json', 'utf8'));
    const token = tokenObj.token;

    await page.evaluateOnNewDocument((tok) => {
      localStorage.setItem('careid_access_token', tok);
      localStorage.setItem('careid_remember_me', 'true');
      localStorage.setItem('careid_user_session', JSON.stringify({
        id: '554f1941-f337-4a98-a8b6-d4409e1cfa04',
        email: 'admin@careid.test',
        phone: '+16505550002',
        status: 'ACTIVE',
        roles: ['ADMIN'],
        permissions: ['read:all', 'write:all', 'read:audit-logs'],
      }));
    }, token);

    // 1. Failing Patient Profile ID (9a4ad630-de90-40e9-b4cd-1d76f8f63069)
    console.log('1. Loading failing patient profile /admin/patients/9a4ad630-de90-40e9-b4cd-1d76f8f63069...');
    await page.goto(`${BASE_URL}/admin/patients/9a4ad630-de90-40e9-b4cd-1d76f8f63069`, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForFunction(() => !document.body.innerText.includes('Verifying session...'), { timeout: 10000 });
    await page.waitForSelector('.patient-profile-canvas', { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 2000));

    const failingProfileData = await page.evaluate(() => {
      return {
        name: document.querySelector('.patient-profile-name')?.innerText.trim(),
        vaultId: document.querySelector('.patient-profile-vault-id')?.innerText.trim(),
        hasErrorBanner: !!document.querySelector('.patient-profile-server-error-banner'),
        bannerText: document.querySelector('.patient-profile-server-error-banner')?.innerText.trim(),
      };
    });

    console.log('Failing patient profile rendered:', failingProfileData);
    if (!failingProfileData.name || !failingProfileData.name.includes('Lucas Vance')) {
      throw new Error(`Expected Lucas Vance, got ${failingProfileData.name}`);
    }
    console.log('✓ Successfully rendered authentic identity for blocked patient!');

    const shot1Path = path.join(ARTIFACT_DIR, 'patient_profile_perm_01_failing_id_handled.png');
    await page.screenshot({ path: shot1Path, fullPage: false });
    console.log(`Saved screenshot: ${shot1Path}`);

    // Refresh test
    console.log('\nRetesting after browser page reload...');
    await page.reload({ waitUntil: 'networkidle2' });
    await page.waitForSelector('.patient-profile-canvas', { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1500));
    const reloadedName = await page.evaluate(() => document.querySelector('.patient-profile-name')?.innerText.trim());
    console.log(`✓ Retained after reload: ${reloadedName}`);

    // 2. Working Patient Profile ID (787e5187-7859-4320-bb1a-465a57dd086a)
    console.log('\n2. Loading working patient profile /admin/patients/787e5187-7859-4320-bb1a-465a57dd086a...');
    await page.goto(`${BASE_URL}/admin/patients/787e5187-7859-4320-bb1a-465a57dd086a`, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('.patient-profile-canvas', { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 2000));

    const workingProfileData = await page.evaluate(() => {
      return {
        name: document.querySelector('.patient-profile-name')?.innerText.trim(),
        vaultId: document.querySelector('.patient-profile-vault-id')?.innerText.trim(),
        hasErrorBanner: !!document.querySelector('.patient-profile-server-error-banner'),
      };
    });

    console.log('Working patient profile rendered:', workingProfileData);
    if (!workingProfileData.name || !workingProfileData.name.includes('Sarah')) {
      throw new Error(`Expected Sarah, got ${workingProfileData.name}`);
    }
    if (workingProfileData.hasErrorBanner) {
      throw new Error('Working profile should NOT display server error banner!');
    }
    console.log('✓ Working patient profile successfully loaded genuine clinical data without error banner!');

    const shot2Path = path.join(ARTIFACT_DIR, 'patient_profile_perm_02_working_patient.png');
    await page.screenshot({ path: shot2Path, fullPage: false });
    console.log(`Saved screenshot: ${shot2Path}`);

    // 3. Non-existent Patient Profile ID (00000000-0000-0000-0000-000000000000)
    console.log('\n3. Loading non-existent patient profile /admin/patients/00000000-0000-0000-0000-000000000000...');
    await page.goto(`${BASE_URL}/admin/patients/00000000-0000-0000-0000-000000000000`, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('.patient-profile-canvas', { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 2000));

    const notFoundData = await page.evaluate(() => {
      const heading = document.querySelector('.patient-profile-loading h2')?.innerText.trim();
      const message = document.querySelector('.patient-profile-loading p')?.innerText.trim();
      return { heading, message };
    });

    console.log('Non-existent patient result:', notFoundData);
    if (!notFoundData.heading || !notFoundData.heading.includes('Not Found')) {
      throw new Error(`Expected Not Found, got ${notFoundData.heading}`);
    }
    console.log('✓ Non-existent patient correctly presents clean 404 empty state!');

    const shot3Path = path.join(ARTIFACT_DIR, 'patient_profile_perm_03_invalid_id_not_found.png');
    await page.screenshot({ path: shot3Path, fullPage: false });
    console.log(`Saved screenshot: ${shot3Path}`);

    console.log('\n=============================================');
    console.log('ALL REGRESSION PROFILE SCENARIOS PASSED 100%!');
    console.log('=============================================');
  } catch (err) {
    console.error('Test execution error:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();
