const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const tokenData = JSON.parse(fs.readFileSync('scratch/cached_token.json', 'utf8'));
const token = tokenData.accessToken;
const artifactDir = 'C:/Users/biswa/.gemini/antigravity/brain/e0785a94-53fe-4f28-b816-f2efe4edf49e';

async function run() {
  console.log('Launching Puppeteer browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // 1. Setup authenticated session
  console.log('Navigating to http://localhost:5173/admin...');
  await page.goto('http://localhost:5173/admin', { waitUntil: 'networkidle2' });
  await page.evaluate((tok) => {
    localStorage.setItem('careid_access_token', tok);
    localStorage.setItem('careid_remember_me', 'true');
    localStorage.setItem('careid_user_session', JSON.stringify({
      id: 'bc6f6875-434c-4050-b893-07343cc27986',
      name: 'Super Admin',
      role: 'SUPER_ADMIN',
      phone: '+16505550001'
    }));
  }, token);

  // 2. Navigate to /admin/notifications
  console.log('Navigating to /admin/notifications...');
  await page.goto('http://localhost:5173/admin/notifications', { waitUntil: 'networkidle2' });
  await page.waitForSelector('.notification-table', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 1500));

  // Check stats and rows
  const notifSummary = await page.evaluate(() => {
    const unreadEl = document.querySelector('.bento-card.unread .bento-card-value');
    const totalEl = document.querySelectorAll('.bento-card .bento-card-value')[1];
    const rows = Array.from(document.querySelectorAll('.notification-table tbody tr.notification-row'));
    return {
      unreadCount: unreadEl ? unreadEl.textContent.trim() : null,
      totalCount: totalEl ? totalEl.textContent.trim() : null,
      rowCount: rows.length,
      firstRowTitle: rows[0] ? rows[0].querySelector('.alert-title')?.textContent.trim() : null
    };
  });
  console.log('Notifications view summary:', notifSummary);

  const notifShotPath = path.join(artifactDir, 'admin_notifications_live_desktop.png');
  await page.screenshot({ path: notifShotPath, fullPage: false });
  console.log('Saved screenshot:', notifShotPath);

  // 3. Test Detail Modal
  console.log('Clicking first notification row to open details...');
  const firstRow = await page.$('.notification-table tbody tr.notification-row');
  if (firstRow) {
    await firstRow.click();
    await page.waitForSelector('.modal-content-card', { timeout: 5000 });
    await new Promise(r => setTimeout(r, 800));

    const modalShotPath = path.join(artifactDir, 'admin_notification_detail_live.png');
    await page.screenshot({ path: modalShotPath, fullPage: false });
    console.log('Saved screenshot:', modalShotPath);

    // Close modal
    const closeBtn = await page.$('.modal-footer .filter-pill:last-child');
    if (closeBtn) await closeBtn.click();
    await new Promise(r => setTimeout(r, 500));
  }

  // 4. Test Create Announcement Modal
  console.log('Opening Create Announcement modal...');
  const createAnnounceBtn = await page.$('.btn-create-announcement');
  if (createAnnounceBtn) {
    await createAnnounceBtn.click();
    await page.waitForSelector('#announcement-modal-title', { timeout: 5000 });
    await new Promise(r => setTimeout(r, 500));

    // Fill form
    const titleInput = await page.$('input[placeholder*="Scheduled"]');
    if (titleInput) await titleInput.type('Automated System Maintenance Notice');
    const descInput = await page.$('textarea[placeholder*="Enter details"]');
    if (descInput) await descInput.type('Core services update scheduled for midnight UTC. All medical records remain fully accessible in offline sync mode.');

    const announceShotPath = path.join(artifactDir, 'admin_create_announcement_live.png');
    await page.screenshot({ path: announceShotPath, fullPage: false });
    console.log('Saved screenshot:', announceShotPath);

    // Submit announcement
    const submitBtn = await page.$('.modal-footer .btn-create-announcement');
    if (submitBtn) {
      console.log('Submitting announcement...');
      await submitBtn.click();
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  // 5. Test Support Tickets Tab
  console.log('Switching to Support Tickets view...');
  const supportTabBtn = await page.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll('.module-tab-btn'));
    return btns.find(b => b.textContent.includes('Support Tickets'));
  });
  if (supportTabBtn) {
    await supportTabBtn.click();
    await new Promise(r => setTimeout(r, 1500));

    const ticketSummary = await page.evaluate(() => {
      const bentoValues = Array.from(document.querySelectorAll('.bento-card-value')).map(e => e.textContent.trim());
      const rows = Array.from(document.querySelectorAll('.notification-table tbody tr.notification-row'));
      return {
        bentoStats: bentoValues,
        ticketRows: rows.length,
        firstTicketText: rows[0] ? rows[0].textContent.trim().replace(/\s+/g, ' ') : null
      };
    });
    console.log('Support tickets summary:', ticketSummary);

    const supportShotPath = path.join(artifactDir, 'admin_support_tickets_live.png');
    await page.screenshot({ path: supportShotPath, fullPage: false });
    console.log('Saved screenshot:', supportShotPath);

    // 6. Test Create Support Ticket Modal
    console.log('Opening Create Support Ticket modal...');
    const createTicketBtn = await page.$('.btn-create-announcement');
    if (createTicketBtn) {
      await createTicketBtn.click();
      await page.waitForSelector('input[placeholder*="Latency observed"]', { timeout: 5000 });
      await new Promise(r => setTimeout(r, 500));

      const subjInput = await page.$('input[placeholder*="Latency observed"]');
      if (subjInput) await subjInput.type('Radiology DICOM Image Sync Verification');
      const descInput = await page.$('textarea[placeholder*="Describe the issue"]');
      if (descInput) await descInput.type('Verifying DICOM imaging gateway throughput for regional cardiology clinics.');

      const createTicketShotPath = path.join(artifactDir, 'admin_create_support_ticket_live.png');
      await page.screenshot({ path: createTicketShotPath, fullPage: false });
      console.log('Saved screenshot:', createTicketShotPath);

      // Submit
      const submitTicketBtn = await page.$('.modal-footer .btn-create-announcement');
      if (submitTicketBtn) {
        console.log('Submitting new support ticket...');
        await submitTicketBtn.click();
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  }

  await browser.close();
  console.log('Puppeteer verification completed successfully!');
}

run().catch(err => {
  console.error('Puppeteer verification failed:', err);
  process.exit(1);
});

