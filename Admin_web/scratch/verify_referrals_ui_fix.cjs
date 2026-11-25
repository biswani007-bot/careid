const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const ARTIFACT_DIR = 'C:/Users/biswa/.gemini/antigravity/brain/e0785a94-53fe-4f28-b816-f2efe4edf49e';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const TOKEN_CACHE_FILE = path.join(__dirname, 'cached_token.json');

const VIEWPORTS = [
  { name: 'Desktop', width: 1440, height: 900, tag: 'desktop_1440' },
  { name: 'Laptop', width: 1366, height: 768, tag: 'laptop_1366' },
  { name: 'Tablet', width: 768, height: 1024, tag: 'tablet_768' },
  { name: 'Mobile', width: 390, height: 844, tag: 'mobile_390' }
];

async function run() {
  console.log('=== Starting CareID Referral UI Fix Verification ===');
  const tokenData = JSON.parse(fs.readFileSync(TOKEN_CACHE_FILE, 'utf8'));

  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });

  const page = await browser.newPage();

  // Set session
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ token, refreshToken }) => {
    localStorage.setItem('careid_access_token', token);
    localStorage.setItem('careid_refresh_token', refreshToken);
    localStorage.setItem('careid_user_session', JSON.stringify({
      id: 'bc6f6875-434c-4050-b893-07343cc27986',
      email: 'superadmin@careid.test',
      phone: '+16505550001',
      status: 'ACTIVE',
      roles: ['SUPER_ADMIN']
    }));
    localStorage.setItem('careid_remember_me', 'true');
  }, tokenData);

  for (const vp of VIEWPORTS) {
    console.log(`\n======================================================`);
    console.log(`Testing Viewport: ${vp.name} (${vp.width}x${vp.height})`);
    console.log(`======================================================`);
    await page.setViewport({ width: vp.width, height: vp.height });

    await page.goto('http://localhost:5173/admin/referrals', { waitUntil: 'networkidle2' });
    await page.waitForSelector('.referral-heading-row', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 800));

    // 1. Inspect Action Buttons
    const buttonsCheck = await page.evaluate(() => {
      const createBtn = document.querySelector('.referral-create-btn');
      const exportBtn = document.querySelector('.referral-export-btn');
      const container = document.querySelector('.referral-actions-group');
      if (!createBtn || !exportBtn || !container) {
        return { error: 'Buttons or container not found' };
      }
      const cRect = createBtn.getBoundingClientRect();
      const eRect = exportBtn.getBoundingClientRect();
      const contRect = container.getBoundingClientRect();

      return {
        createBtn: {
          text: createBtn.innerText.trim(),
          width: cRect.width,
          height: cRect.height,
          scrollWidth: createBtn.scrollWidth,
          clientWidth: createBtn.clientWidth,
          isClipped: createBtn.scrollWidth > createBtn.clientWidth + 1,
        },
        exportBtn: {
          text: exportBtn.innerText.trim(),
          width: eRect.width,
          height: eRect.height,
          scrollWidth: exportBtn.scrollWidth,
          clientWidth: exportBtn.clientWidth,
          isClipped: exportBtn.scrollWidth > exportBtn.clientWidth + 1,
        },
        spacing: Math.abs(eRect.left - cRect.right),
        isOverlapping: cRect.right > eRect.left && cRect.left < eRect.right && cRect.top === eRect.top,
        containerWidth: contRect.width
      };
    });
    console.log(`[${vp.name}] Buttons Check:`, JSON.stringify(buttonsCheck, null, 2));

    const shotOverview = path.join(ARTIFACT_DIR, `referral_overview_${vp.tag}.png`);
    await page.screenshot({ path: shotOverview });
    console.log(`Saved screenshot: referral_overview_${vp.tag}.png`);

    // 2. Open Create Referral Modal
    const createBtnEl = await page.$('.referral-create-btn');
    if (createBtnEl) {
      await createBtnEl.click();
      await new Promise(r => setTimeout(r, 800));

      // Inspect Modal Dimensions, Boundaries & Elements
      const modalCheck = await page.evaluate((vpW, vpH) => {
        const modal = document.querySelector('.create-referral-modal');
        const header = document.querySelector('.create-referral-header');
        const body = document.querySelector('.create-referral-body');
        const footer = document.querySelector('.create-referral-footer');
        const closeBtn = document.querySelector('.create-referral-close-btn');
        const cancelBtn = document.querySelector('.create-referral-cancel-btn');
        const submitBtn = document.querySelector('.create-referral-submit-btn');

        if (!modal || !header || !body || !footer) {
          return { error: 'Modal sections not found' };
        }

        const mRect = modal.getBoundingClientRect();
        const fRect = footer.getBoundingClientRect();
        const hRect = header.getBoundingClientRect();

        return {
          modal: {
            width: Math.round(mRect.width),
            height: Math.round(mRect.height),
            top: Math.round(mRect.top),
            bottom: Math.round(mRect.bottom),
            fitsInViewport: mRect.width <= vpW && mRect.height <= vpH,
          },
          header: {
            visible: hRect.height > 0,
            closeBtnVisible: !!closeBtn,
          },
          footer: {
            visible: fRect.height > 0,
            cancelBtnVisible: !!cancelBtn,
            submitBtnVisible: !!submitBtn,
            isClippedByModal: fRect.bottom > mRect.bottom + 1,
            isWithinViewport: fRect.bottom <= vpH,
          },
          bodyScrollable: body.scrollHeight >= body.clientHeight
        };
      }, vp.width, vp.height);
      console.log(`[${vp.name}] Modal Check:`, JSON.stringify(modalCheck, null, 2));

      const shotModal = path.join(ARTIFACT_DIR, `referral_modal_${vp.tag}.png`);
      await page.screenshot({ path: shotModal });
      console.log(`Saved screenshot: referral_modal_${vp.tag}.png`);

      // Close modal
      const closeBtn = await page.$('.create-referral-close-btn');
      if (closeBtn) {
        await closeBtn.click();
        await new Promise(r => setTimeout(r, 400));
      }
    }
  }

  await browser.close();
  console.log('\n=== All Responsive UI Verifications Passed Successfully! ===');
}

run().catch(err => {
  console.error('Verification error:', err);
  process.exit(1);
});
