const puppeteer = require('puppeteer-core');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function testFetchUsersDirectly() {
  const token = (require('./cached_admin_token.json')).token;
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors']
  });

  const page = await browser.newPage();
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));

  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await page.evaluate((tok) => {
    localStorage.setItem('careid_access_token', tok);
    localStorage.setItem('careid_token', tok);
    localStorage.setItem('careid_remember_me', 'true');
    localStorage.setItem('careid_user_session', JSON.stringify({
      id: 'bc6f6875-434c-4050-b893-07343cc27986',
      email: 'superadmin@careid.test',
      phone: '+16505550001',
      status: 'ACTIVE',
      roles: ['SUPER_ADMIN', 'ADMIN'],
      permissions: ['*']
    }));
  }, token);

  await page.goto('http://localhost:5173/admin/users', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));

  const directRes = await page.evaluate(async () => {
    // Call apiClient directly
    try {
      const { fetchUsers } = await import('/src/services/userService.ts');
      const res = await fetchUsers({ search: 'John' });
      return { success: true, res };
    } catch (e) {
      return { success: false, error: e.message, stack: e.stack };
    }
  });

  console.log('Direct fetchUsers result:', JSON.stringify(directRes, null, 2));
  await browser.close();
}

testFetchUsersDirectly().catch(console.error);

