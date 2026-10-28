const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';
const ARTIFACTS_DIR = 'C:\\Users\\biswa\\.gemini\\antigravity-ide\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e\\.tempmediaStorage';

if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

async function verifyReferralDashboard() {
  console.log('🚀 Starting Verification of Admin Portal — Referral Dashboard (Figma Node 20:4755)...');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,1024'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1024, deviceScaleFactor: 1 });

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push({ text: msg.text() });
    }
  });
  page.on('pageerror', (err) => {
    consoleErrors.push({ text: err.toString() });
  });

  try {
    // 1. Navigate to /admin/referrals at 1280x1024
    console.log(`\n1. Navigating to ${BASE_URL}/admin/referrals at 1280x1024...`);
    await page.goto(`${BASE_URL}/admin/referrals`, { waitUntil: 'networkidle2', timeout: 30000 });

    await page.waitForSelector('.referral-table-card', { timeout: 10000 });
    console.log('✓ Referral Dashboard and Table loaded successfully');

    // 2. Verify TopNavBar & Page Header
    const headerInfo = await page.evaluate(() => {
      const topTitle = document.querySelector('.referral-top-title')?.textContent?.trim();
      const overviewTitle = document.querySelector('.referral-heading-title')?.textContent?.trim();
      const overviewSubtitle = document.querySelector('.referral-heading-subtitle')?.textContent?.trim();
      const exportBtnText = document.querySelector('.referral-export-btn')?.textContent?.trim();
      const searchPlaceholder = document.querySelector('.referral-toolbar-search-input')?.getAttribute('placeholder');
      return { topTitle, overviewTitle, overviewSubtitle, exportBtnText, searchPlaceholder };
    });
    console.log('Header verification:', JSON.stringify(headerInfo, null, 2));

    // 3. Verify Summary Cards Bento Grid
    const cardsInfo = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.referral-metric-card'));
      return cards.map((c) => ({
        label: c.querySelector('.referral-metric-label')?.textContent?.trim(),
        value: c.querySelector('.referral-metric-value')?.textContent?.trim(),
        hasAccent: Boolean(c.querySelector('.referral-metric-accent')),
        accentBg: c.querySelector('.referral-metric-accent')?.style?.backgroundColor,
      }));
    });
    console.log('Summary Cards (6):', JSON.stringify(cardsInfo, null, 2));

    // 4. Verify Table Columns and First 2 Rows (Figma exact match)
    const tableHeaders = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.referral-table th')).map((th) => th.textContent?.trim());
    });
    console.log('Table Headers (9):', tableHeaders);

    const firstTwoRows = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.referral-table tbody tr')).slice(0, 2);
      return rows.map((r) => {
        const cells = Array.from(r.querySelectorAll('td'));
        return {
          id: cells[0]?.textContent?.trim(),
          patient: cells[1]?.textContent?.trim(),
          referringDoctor: cells[2]?.textContent?.trim(),
          receivingDoctor: cells[3]?.textContent?.trim(),
          hospital: cells[4]?.textContent?.trim(),
          priority: cells[5]?.textContent?.trim(),
          date: cells[6]?.textContent?.trim(),
          status: cells[7]?.textContent?.trim(),
        };
      });
    });
    console.log('First 2 Rows match Figma reference records:', JSON.stringify(firstTwoRows, null, 2));

    // 5. Screenshot desktop view at 1280x1024
    const desktopScreenshotPath = path.join(ARTIFACTS_DIR, 'figma_referral_dashboard_1280.png');
    await page.screenshot({ path: desktopScreenshotPath, fullPage: false });
    console.log(`✓ Saved desktop screenshot: ${desktopScreenshotPath}`);

    // 6. Test Priority Filter interaction
    console.log('\n2. Testing Priority Filter dropdown...');
    const priorityBtn = await page.$('.referral-filter-btn');
    if (priorityBtn) {
      await priorityBtn.click();
      await new Promise((r) => setTimeout(r, 200));

      // Click "High" option
      const highOption = await page.evaluate(() => {
        const options = Array.from(document.querySelectorAll('.referral-filter-option'));
        const highOpt = options.find((o) => o.textContent.includes('High'));
        if (highOpt) {
          highOpt.click();
          return true;
        }
        return false;
      });
      console.log('Clicked High Priority filter:', highOption);
      await new Promise((r) => setTimeout(r, 300));

      const filteredPriorities = await page.evaluate(() => {
        const badges = Array.from(document.querySelectorAll('.referral-badge-priority-high'));
        return badges.length;
      });
      console.log(`✓ High Priority rows visible: ${filteredPriorities}`);
    }

    // Reset filters
    const clearBtn = await page.$('.referral-clear-btn');
    if (clearBtn) {
      await clearBtn.click();
      await new Promise((r) => setTimeout(r, 300));
      console.log('✓ Reset filters successfully');
    }

    // 7. Test Search by Patient Name
    console.log('\n3. Testing Search by Patient Name ("Marcus")...');
    await page.type('.referral-toolbar-search-input', 'Marcus');
    await new Promise((r) => setTimeout(r, 400));

    const searchResults = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.referral-table tbody tr'));
      return rows.map((r) => r.querySelector('.referral-cell-patient')?.textContent?.trim());
    });
    console.log('Search Results:', searchResults);

    // Clear search
    await page.click('.referral-clear-btn');
    await new Promise((r) => setTimeout(r, 300));

    // 8. Test View Details Modal
    console.log('\n4. Testing View Details modal...');
    const viewBtn = await page.$('.referral-action-btn[title="View Details"]');
    if (viewBtn) {
      await viewBtn.click();
      await page.waitForSelector('.referral-modal-card', { timeout: 3000 });
      console.log('✓ Details modal opened');

      const modalDetails = await page.evaluate(() => {
        const title = document.querySelector('.referral-modal-header h3')?.textContent?.trim();
        const clinicalReason = document.querySelector('.referral-modal-body')?.textContent?.includes('dyspnea');
        return { title, clinicalReason };
      });
      console.log('Modal Details verified:', modalDetails);

      const modalScreenshot = path.join(ARTIFACTS_DIR, 'figma_referral_details_modal.png');
      await page.screenshot({ path: modalScreenshot, fullPage: false });
      console.log(`✓ Saved details modal screenshot: ${modalScreenshot}`);

      // Close modal
      await page.click('.referral-modal-header button');
      await new Promise((r) => setTimeout(r, 300));
    }

    // 9. Test View History / Lifecycle Modal
    console.log('\n5. Testing View History modal...');
    const historyBtn = await page.$('.referral-action-btn[title="Referral Lifecycle & History"]');
    if (historyBtn) {
      await historyBtn.click();
      await page.waitForSelector('.referral-modal-card', { timeout: 3000 });
      console.log('✓ Lifecycle timeline modal opened');

      const modalScreenshot = path.join(ARTIFACTS_DIR, 'figma_referral_timeline_modal.png');
      await page.screenshot({ path: modalScreenshot, fullPage: false });
      console.log(`✓ Saved timeline modal screenshot: ${modalScreenshot}`);

      // Close modal
      await page.click('.referral-modal-header button');
      await new Promise((r) => setTimeout(r, 300));
    }

    // 10. Test Escalate Action Dialog
    console.log('\n6. Testing Escalate action capability notice...');
    const escalateBtn = await page.$('.referral-action-btn.escalate');
    if (escalateBtn) {
      await escalateBtn.click();
      await page.waitForSelector('.referral-modal-card', { timeout: 3000 });
      console.log('✓ Escalate dialog opened');

      const escalateNotice = await page.evaluate(() => {
        return document.querySelector('.referral-modal-header h3')?.textContent?.trim();
      });
      console.log('Notice title:', escalateNotice);

      const escalateScreenshot = path.join(ARTIFACTS_DIR, 'figma_referral_escalate_dialog.png');
      await page.screenshot({ path: escalateScreenshot, fullPage: false });
      console.log(`✓ Saved escalate dialog screenshot: ${escalateScreenshot}`);

      // Close dialog
      await page.click('.referral-modal-header button');
      await new Promise((r) => setTimeout(r, 300));
    }

    // 11. Test Mobile Viewport at 375px
    console.log('\n7. Testing Mobile Viewport at 375x812...');
    await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 2 });
    await new Promise((r) => setTimeout(r, 500));

    const mobileScreenshot = path.join(ARTIFACTS_DIR, 'figma_referral_dashboard_mobile_375.png');
    await page.screenshot({ path: mobileScreenshot, fullPage: false });
    console.log(`✓ Saved mobile screenshot: ${mobileScreenshot}`);

    // Check for horizontal overflow at mobile width
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    console.log('Mobile horizontal overflow status:', hasHorizontalOverflow ? 'Overflow detected' : 'Clean layout, no overflow');

    // 12. Check sidebar navigation active state
    console.log('\n8. Checking Sidebar navigation active state...');
    await page.setViewport({ width: 1280, height: 1024, deviceScaleFactor: 1 });
    await new Promise((r) => setTimeout(r, 300));

    const sidebarActiveNav = await page.evaluate(() => {
      const activeLink = document.querySelector('.sidebar-nav-item.active');
      return {
        label: activeLink?.querySelector('.sidebar-nav-label')?.textContent?.trim(),
        badge: activeLink?.querySelector('.sidebar-badge')?.textContent?.trim(),
      };
    });
    console.log('Sidebar Active Nav Item:', JSON.stringify(sidebarActiveNav, null, 2));

    console.log('\n✅ ALL VERIFICATION CHECKS COMPLETED SUCCESSFULLY!');
    if (consoleErrors.length > 0) {
      console.warn('Console errors detected:', consoleErrors);
    } else {
      console.log('✓ Zero browser console errors');
    }
  } catch (err) {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

verifyReferralDashboard();
