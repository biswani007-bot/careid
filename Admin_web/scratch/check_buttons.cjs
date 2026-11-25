const puppeteer = require('D:/careid/Admin_web/node_modules/puppeteer-core');
const { execSync } = require('child_process');

(async () => {
  const otpReq = execSync('curl.exe -s -X POST http://localhost:3001/api/v1/auth/otp/request -H "Content-Type: application/json" -d "{\\"phone\\":\\"+16505550003\\"}"').toString();
  const challengeId = JSON.parse(otpReq).data.challengeId;
  const verifyReq = execSync(`curl.exe -s -X POST http://localhost:3001/api/v1/auth/otp/verify -H "Content-Type: application/json" -d "{\\"challengeId\\":\\"${challengeId}\\",\\"otpCode\\":\\"123456\\"}"`).toString();
  const docToken = JSON.parse(verifyReq).data.accessToken;
  const docUser = JSON.parse(verifyReq).data.user;

  const browser = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  page.on('response', async res => {
    if (res.url().includes('prescriptions')) {
      let body = '';
      try { body = await res.text(); } catch {}
      console.log('HTTP RESP:', res.status(), res.url(), body.slice(0, 150));
    }
  });

  await page.goto('http://localhost:5173/');
  await page.evaluate((tok, usr) => {
    localStorage.setItem('careid_access_token', tok);
    sessionStorage.setItem('careid_access_token', tok);
    localStorage.setItem('careid_user_session', JSON.stringify(usr));
    sessionStorage.setItem('careid_user_session', JSON.stringify(usr));
    localStorage.setItem('token', tok);
    sessionStorage.setItem('token', tok);
    localStorage.setItem('user', JSON.stringify(usr));
    sessionStorage.setItem('user', JSON.stringify(usr));
  }, docToken, docUser);

  await page.goto('http://localhost:5173/records/prescriptions?patientId=3896bc97-bd3b-40ae-80c1-0cc0455ca3a4', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));

  // Click New Entry
  const btns = await page.$$('button');
  for (const b of btns) {
    const text = await page.evaluate(el => el.textContent, b);
    if (text && text.includes('New Entry')) {
      await b.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 1000));

  // Fill Medication Name
  const medInput = await page.$('input[placeholder*="Amoxicillin"], input[placeholder*="Medication"]');
  if (medInput) await medInput.type('Amoxicillin QA');

  // Fill Dosage
  const dosageInput = await page.$('input[placeholder*="20mg"]');
  if (dosageInput) await dosageInput.type('500mg');

  // Fill Indication
  const indInput = await page.$('input[placeholder*="Hyperlipidemia"]');
  if (indInput) await indInput.type('Infection QA');

  // Submit
  const submitBtn = await page.$('button[type="submit"]');
  console.log('Submit button found:', Boolean(submitBtn));
  if (submitBtn) await submitBtn.click();

  await new Promise(r => setTimeout(r, 3000));
  const errText = await page.evaluate(() => {
    const err = document.querySelector('.bg-rose-50, .text-rose-600, .text-rose-500');
    return err ? err.innerText : 'NO ERROR ELEMENT';
  });
  console.log('Error text:', errText);

  await browser.close();
})();
