const puppeteer = require('D:/careid/Admin_web/node_modules/puppeteer-core');
const { execSync } = require('child_process');

async function test() {
  const otpReq = execSync('curl.exe -s -X POST http://localhost:3001/api/v1/auth/otp/request -H "Content-Type: application/json" -d "{\\"phone\\":\\"+16505550003\\"}"').toString();
  const challengeId = JSON.parse(otpReq).data.challengeId;
  const verifyReq = execSync(`curl.exe -s -X POST http://localhost:3001/api/v1/auth/otp/verify -H "Content-Type: application/json" -d "{\\"challengeId\\":\\"${challengeId}\\",\\"otpCode\\":\\"123456\\"}"`).toString();
  const docToken = JSON.parse(verifyReq).data.accessToken;
  const docUser = JSON.parse(verifyReq).data.user;

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });
  await page.evaluate((tok, usr) => {
    localStorage.setItem('careid_access_token', tok);
    sessionStorage.setItem('careid_access_token', tok);
    localStorage.setItem('careid_user_session', JSON.stringify(usr));
    sessionStorage.setItem('careid_user_session', JSON.stringify(usr));
    sessionStorage.setItem('token', tok);
    sessionStorage.setItem('user', JSON.stringify(usr));
    localStorage.setItem('token', tok);
    localStorage.setItem('user', JSON.stringify(usr));
  }, docToken, docUser);

  const patientProfileId = '3896bc97-bd3b-40ae-80c1-0cc0455ca3a4';
  await page.goto(`http://localhost:5173/records/prescriptions?patientId=${patientProfileId}`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  const rows = await page.evaluate(() => {
    const trs = Array.from(document.querySelectorAll('table tbody tr'));
    return trs.map(tr => ({
      text: tr.innerText.replace(/\n/g, ' | '),
      buttons: Array.from(tr.querySelectorAll('button')).map(b => b.innerText || b.getAttribute('title'))
    }));
  });
  console.log('Found rows:', JSON.stringify(rows, null, 2));
  await browser.close();
}
test().catch(console.error);
