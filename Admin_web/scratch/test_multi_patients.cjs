const puppeteer = require('puppeteer-core');
const path = require('path');

const ARTIFACT_DIR = path.resolve('C:\\Users\\biswa\\.gemini\\antigravity-ide\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e');

async function main() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1024 });

  // 1. Test Marcus Sterling (pat-2)
  console.log('Testing Marcus Sterling (pat-2)...');
  await page.goto('http://localhost:5173/admin/patients/pat-2', { waitUntil: 'networkidle2' });
  await page.waitForSelector('.patient-profile-name');
  const marcusName = await page.$eval('.patient-profile-name', el => el.textContent.trim());
  const marcusVault = await page.$eval('.patient-profile-vault-id', el => el.textContent.trim());
  console.log('Loaded:', marcusName, marcusVault);

  const marcusShot = path.join(ARTIFACT_DIR, 'patient_profile_marcus_pat2.png');
  await page.screenshot({ path: marcusShot, fullPage: true });

  // 2. Test Sarah Jenkins (pat-3, Inactive)
  console.log('Testing Sarah Jenkins (pat-3, Inactive)...');
  await page.goto('http://localhost:5173/admin/patients/pat-3', { waitUntil: 'networkidle2' });
  await page.waitForSelector('.patient-profile-name');
  const sarahName = await page.$eval('.patient-profile-name', el => el.textContent.trim());
  const sarahStatus = await page.$eval('.patient-profile-status-badge', el => el.textContent.trim());
  const sarahBtn = await page.$eval('.patient-profile-actions button:nth-child(2)', el => el.textContent.trim());
  console.log('Loaded:', sarahName, sarahStatus, 'Action button:', sarahBtn);

  const sarahShot = path.join(ARTIFACT_DIR, 'patient_profile_sarah_pat3.png');
  await page.screenshot({ path: sarahShot, fullPage: true });

  await browser.close();
  console.log('Multi-patient verification complete!');
}

main();
