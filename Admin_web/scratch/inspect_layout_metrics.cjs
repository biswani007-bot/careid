const puppeteer = require('puppeteer');
const { getFreshToken } = require('./api_helper.cjs');

(async () => {
  const token = await getFreshToken();
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await page.goto('http://localhost:5174/login', { waitUntil: 'networkidle2' });
  await page.evaluate((tok) => {
    localStorage.setItem('careid_access_token', tok);
    localStorage.setItem('careid_refresh_token', tok);
    localStorage.setItem('careid_user_session', JSON.stringify({
      id: 'admin-super-01',
      role: 'SUPER_ADMIN',
      fullName: 'Super Administrator',
      email: 'superadmin@careid.com'
    }));
  }, token);

  await page.goto('http://localhost:5174/admin/records/upload', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));

  const metrics = await page.evaluate(() => {
    const bento = document.querySelector('.upload-bento-grid');
    const mainCard = document.querySelector('.upload-main-card');
    const sideCard = document.querySelector('.upload-side-card');
    const notice = document.querySelector('.sm\\:col-span-2.bg-\\[\\#f8f9fb\\]') || document.querySelector('.upload-main-card .border-[#e2e8f0]');
    const submitBtn = document.querySelector('form button[type="submit"]');
    const btnSpan = submitBtn?.querySelector('span');

    const inputs = Array.from(document.querySelectorAll('form input, form select, form textarea')).map(el => ({
      id: el.id,
      height: el.offsetHeight,
      width: el.offsetWidth,
      fontSize: window.getComputedStyle(el).fontSize
    }));

    return {
      bentoWidth: bento?.offsetWidth,
      mainCardWidth: mainCard?.offsetWidth,
      sideCardWidth: sideCard?.offsetWidth,
      ratio: mainCard && bento ? (mainCard.offsetWidth / bento.offsetWidth).toFixed(2) : null,
      notice: notice ? {
        width: notice.offsetWidth,
        scrollWidth: notice.scrollWidth,
        overflows: notice.scrollWidth > notice.offsetWidth
      } : null,
      submitBtn: submitBtn ? {
        btnWidth: submitBtn.offsetWidth,
        btnScrollWidth: submitBtn.scrollWidth,
        spanWidth: btnSpan?.offsetWidth,
        spanScrollWidth: btnSpan?.scrollWidth,
        text: submitBtn.textContent.trim(),
        overflows: submitBtn.scrollWidth > submitBtn.offsetWidth
      } : null,
      inputs
    };
  });

  console.log('Layout Metrics (1440px):', JSON.stringify(metrics, null, 2));

  await browser.close();
})();

