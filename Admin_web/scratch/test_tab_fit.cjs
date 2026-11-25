const fs = require('fs');
const puppeteer = require('puppeteer-core');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function test() {
  const tokenData = JSON.parse(fs.readFileSync('scratch/cached_token.json', 'utf8'));
  const token = tokenData.token;

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Populate localStorage on root
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
      roles: ['SUPER_ADMIN', 'super_admin'],
      permissions: ['read:all', 'write:all', 'delete:all', 'read:audit-logs']
    }));
  }, token);

  const viewports = [1920, 1440, 1366, 1280, 1024, 768, 375];

  for (const width of viewports) {
    await page.setViewport({ width, height: 900 });
    await page.goto('http://localhost:5173/admin/settings/integrations', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 600));

    const url = page.url();
    const data = await page.evaluate(() => {
      const navContainer = document.querySelector('.int-subnav-tabs');
      const tabList = document.querySelector('.int-subnav-tab-list');
      const tabs = Array.from(document.querySelectorAll('.int-subnav-tab'));

      if (!navContainer) return null;

      const containerScrollWidth = navContainer.scrollWidth;
      const containerClientWidth = navContainer.clientWidth;

      const tabDetails = tabs.map(t => {
        const rect = t.getBoundingClientRect();
        return {
          text: t.textContent.trim(),
          width: Math.round(rect.width)
        };
      });

      return {
        containerClientWidth,
        containerScrollWidth,
        isOverflowing: containerScrollWidth > containerClientWidth,
        overflowAmount: Math.max(0, containerScrollWidth - containerClientWidth),
        tabs: tabDetails
      };
    });

    console.log(`\n--- Viewport: ${width}px (URL: ${url}) ---`);
    if (data) {
      console.log(`Container: clientWidth=${data.containerClientWidth}px, scrollWidth=${data.containerScrollWidth}px | Overflow=${data.overflowAmount}px`);
      console.log(`Tabs:`, data.tabs.map(t => `${t.text} (${t.width}px)`).join(' | '));
    } else {
      console.log('Nav element NOT found (redirected)');
    }
  }

  await browser.close();
}

test().catch(console.error);
