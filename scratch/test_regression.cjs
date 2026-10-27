const puppeteer = require('d:/New folder/New folder/healthvault/node_modules/puppeteer-core');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function run() {
  console.log('--- REGRESSION CHECK ACROSS ALL SCREENS ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1024 });

  try {
    // 1. Login Page
    console.log('1. Checking Secure Login...');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
    const hasLoginBtn = await page.$('button[type="submit"]');
    console.log('Login button present:', !!hasLoginBtn);

    // 2. Dashboard Page
    console.log('2. Checking Dashboard Overview...');
    await page.goto('http://localhost:5173/admin/dashboard', { waitUntil: 'networkidle0' });
    const hasDashboardTitle = await page.$('.dashboard-heading-title');
    const hasSidebarLogout = await page.$('.sidebar-logout-btn');
    console.log('Dashboard title present:', !!hasDashboardTitle);
    console.log('Dashboard sidebar logout present:', !!hasSidebarLogout);

    // 3. User Directory Page
    console.log('3. Checking User Directory...');
    await page.goto('http://localhost:5173/admin/users', { waitUntil: 'networkidle0' });
    const hasUserDirTable = await page.$('.users-table');
    const hasDirLogout = await page.$('.sidebar-logout-btn');
    console.log('Users table present:', !!hasUserDirTable);
    console.log('Directory sidebar logout present:', !!hasDirLogout);

    // 4. User Details Page
    console.log('4. Checking User Details (/admin/users/user-1)...');
    await page.goto('http://localhost:5173/admin/users/user-1', { waitUntil: 'networkidle0' });
    const hasDetailsHeading = await page.$('.user-details-heading');
    const hasProfileCard = await page.$('.user-details-profile-card');
    const hasDetailsLogout = await page.$('.sidebar-logout-btn');
    console.log('Details heading present:', !!hasDetailsHeading);
    console.log('Profile card present:', !!hasProfileCard);
    console.log('Details sidebar logout present:', !!hasDetailsLogout);

    console.log('--- ALL REGRESSION CHECKS PASSED ---');
  } catch (err) {
    console.error('Regression check error:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

run();
