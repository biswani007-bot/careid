const puppeteer = require('puppeteer-core');
const { execSync } = require('child_process');

function getDoctorToken(phone) {
  const otpReq = execSync(`curl -s -X POST http://localhost:3001/api/v1/auth/otp/request -H "Content-Type: application/json" -d "{\\"phone\\":\\"${phone}\\"}"`).toString();
  const challengeId = JSON.parse(otpReq).data.challengeId;
  const verifyReq = execSync(`curl -s -X POST http://localhost:3001/api/v1/auth/otp/verify -H "Content-Type: application/json" -d "{\\"challengeId\\":\\"${challengeId}\\",\\"otpCode\\":\\"123456\\"}"`).toString();
  return JSON.parse(verifyReq).data.accessToken;
}

async function testUiSubmit() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: false,
    defaultViewport: { width: 1440, height: 900 }
  });
  const page = await browser.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  page.on('response', res => {
    if (res.url().includes('prescriptions')) {
      console.log('NETWORK RESPONSE:', res.status(), res.url());
    }
  });

  const tok = getDoctorToken('+16505550003');
  const patientProfileId = execSync("docker exec careid-integration-postgres psql -U careid_test_user -d careid_integration_db -t -A -c \"SELECT id FROM patient_profiles WHERE first_name = 'John' LIMIT 1;\"").toString().trim();

  await page.goto('http://localhost:5173/auth/login', { waitUntil: 'networkidle2' });
  await page.evaluate((t) => {
    sessionStorage.setItem('careid_access_token', t);
    localStorage.setItem('careid_access_token', t);
  }, tok);

  await page.goto(`http://localhost:5173/records/prescriptions?patientId=${patientProfileId}`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  // Find New Entry button
  const buttons = await page.$$('button');
  for (const b of buttons) {
    const text = await b.evaluate(el => el.innerText.trim());
    if (text === 'New Entry' || text.includes('New Entry')) {
      await b.click();
      break;
    }
  }

  await new Promise(r => setTimeout(r, 1000));

  // Fill in form
  await page.type('[data-testid="new-entry-modal"] input[placeholder*="Atorvastatin"]', 'Lisinopril UI Test');
  await page.type('[data-testid="new-entry-modal"] input[placeholder*="20mg"]', '10mg');
  await page.type('[data-testid="new-entry-modal"] input[placeholder*="Hyperlipidemia"]', 'Hypertension');

  // Check pickup reminder
  const reminderCheckbox = await page.$('[data-testid="new-entry-modal"] input[type="checkbox"]');
  if (reminderCheckbox) {
    await reminderCheckbox.click();
    await new Promise(r => setTimeout(r, 500));
  }

  // Select 1 hour
  const select = await page.$('[data-testid="new-entry-modal"] div.bg-purple-50\\/70 select');
  if (select) {
    await select.select('1');
    await new Promise(r => setTimeout(r, 500));
  }

  console.log('Clicking submit button...');
  const submitBtn = await page.$('[data-testid="new-entry-modal"] button[type="submit"]');
  await submitBtn.click();
  await new Promise(r => setTimeout(r, 3000));

  const errorEl = await page.$('[data-testid="new-entry-modal"] .bg-rose-50');
  if (errorEl) {
    const errText = await page.evaluate(el => el.innerText, errorEl);
    console.log('FORM SUBMIT ERROR:', errText);
  } else {
    console.log('No form submit error!');
  }

  await browser.close();
}

testUiSubmit().catch(console.error);
