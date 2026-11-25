const puppeteer = require('puppeteer-core');
const { execSync } = require('child_process');

function getDoctorToken(phone) {
  const otpReq = execSync(`curl -s -X POST http://localhost:3001/api/v1/auth/otp/request -H "Content-Type: application/json" -d "{\\"phone\\":\\"${phone}\\"}"`).toString();
  const challengeId = JSON.parse(otpReq).data.challengeId;
  const verifyReq = execSync(`curl -s -X POST http://localhost:3001/api/v1/auth/otp/verify -H "Content-Type: application/json" -d "{\\"challengeId\\":\\"${challengeId}\\",\\"otpCode\\":\\"123456\\"}"`).toString();
  return JSON.parse(verifyReq).data.accessToken;
}

async function debugDoc() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: false,
    defaultViewport: { width: 1440, height: 900 }
  });
  const page = await browser.newPage();
  const tok = getDoctorToken('+16505550003');
  
  await page.goto('http://localhost:5173/auth/login', { waitUntil: 'networkidle2' });
  await page.evaluate((t) => {
    sessionStorage.setItem('careid_access_token', t);
    localStorage.setItem('careid_access_token', t);
  }, tok);

  await page.goto('http://localhost:5173/records/prescriptions', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  // Find the button with text "New Entry"
  const buttons = await page.$$('button');
  let clicked = false;
  for (const b of buttons) {
    const text = await b.evaluate(el => el.innerText.trim());
    if (text === 'New Entry' || text.includes('New Entry')) {
      console.log('Found New Entry button, clicking...');
      await b.click();
      clicked = true;
      break;
    }
  }

  if (clicked) {
    await new Promise(r => setTimeout(r, 1500));
    const modalTitle = await page.$eval('[data-testid="new-entry-modal"] h3', el => el.innerText).catch(() => 'NOT FOUND');
    console.log('Modal title:', modalTitle);
    const placeholders = await page.$$eval('[data-testid="new-entry-modal"] input', inps => inps.map(i => i.placeholder));
    console.log('Modal input placeholders:', placeholders);
  }

  await browser.close();
}

debugDoc().catch(console.error);
