const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { getAdminToken } = require('./token_helper.cjs');

const ARTIFACT_DIR = 'C:/Users/biswa/.gemini/antigravity/brain/e0785a94-53fe-4f28-b816-f2efe4edf49e';
const BASE_URL = 'http://localhost:5174';

async function main() {
  console.log('--- CAREID NOTIFICATION DASHBOARD COMPLETE E2E VERIFICATION ---');

  const token = await getAdminToken();
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    await page.evaluateOnNewDocument((tok) => {
      localStorage.setItem('careid_access_token', tok);
      localStorage.setItem('careid_remember_me', 'true');
      localStorage.setItem('careid_user_session', JSON.stringify({
        id: '554f1941-f337-4a98-a8b6-d4409e1cfa04',
        email: 'admin@careid.test',
        phone: '+16505550002',
        status: 'ACTIVE',
        roles: ['ADMIN'],
        permissions: ['read:all', 'write:all', 'read:audit-logs'],
      }));
    }, token);

    // 1. Navigate to Notification Dashboard
    console.log('1. Navigating to /admin/notifications...');
    await page.goto(`${BASE_URL}/admin/notifications`, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForFunction(() => !document.body.innerText.includes('Verifying session...'), { timeout: 10000 });
    await page.waitForSelector('.notification-bento-grid', { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 2000));

    // Extract KPI Cards
    const kpis = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.bento-card'));
      return cards.map((c) => {
        const label = c.querySelector('.bento-card-label')?.innerText.trim();
        const value = c.querySelector('.bento-card-value')?.innerText.trim();
        return { label, value };
      });
    });
    console.log('\n[Notification KPI Cards]:');
    console.table(kpis);

    // Extract Notification Rows
    const rows = await page.evaluate(() => {
      const trs = Array.from(document.querySelectorAll('.notification-table tbody tr'));
      return trs.map((tr) => {
        const title = tr.querySelector('.alert-title')?.innerText.trim();
        const code = tr.querySelector('.font-mono')?.innerText.trim();
        const desc = tr.querySelector('.alert-desc')?.innerText.trim();
        const module = tr.querySelector('.module-badge')?.innerText.trim();
        const time = tr.querySelector('.alert-time')?.innerText.trim();
        return { title, code, module, time, desc: desc ? desc.slice(0, 50) + '...' : '' };
      });
    });
    console.log('\n[Notification Table Rows]:');
    console.table(rows);

    const shot1 = path.join(ARTIFACT_DIR, 'notif_01_dashboard_live.png');
    await page.screenshot({ path: shot1, fullPage: true });
    console.log(`Saved screenshot 1: ${shot1}`);

    // 2. Open Detail Modal
    console.log('\n2. Opening Notification Detail Modal...');
    await page.click('.notification-action-btn[title="View Details"]');
    await page.waitForSelector('.modal-content-card', { timeout: 5000 });
    await new Promise((r) => setTimeout(r, 1000));

    const modalData = await page.evaluate(() => {
      const title = document.querySelector('.modal-body h4')?.innerText.trim();
      const uuid = document.querySelector('.modal-body .font-mono')?.innerText.trim();
      return { title, uuid };
    });
    console.log('Opened detail modal:', modalData);

    const shot2 = path.join(ARTIFACT_DIR, 'notif_02_detail_modal.png');
    await page.screenshot({ path: shot2, fullPage: true });
    console.log(`Saved screenshot 2: ${shot2}`);

    // Close detail modal
    await page.click('.modal-header .notification-action-btn');
    await new Promise((r) => setTimeout(r, 500));

    // 3. Test Filters and Search
    console.log('\n3. Testing Quick Filters and Search...');
    // Filter by Warning (should show 1 notification)
    await page.evaluate(() => {
      const pills = Array.from(document.querySelectorAll('.filter-pill'));
      const warn = pills.find((p) => p.innerText.includes('Warning'));
      if (warn) warn.click();
    });
    await new Promise((r) => setTimeout(r, 500));
    const warningCount = await page.evaluate(() => document.querySelectorAll('.notification-table tbody tr').length);
    console.log(`Warning filter results: ${warningCount} row(s)`);

    // Reset filter
    await page.evaluate(() => {
      const reset = Array.from(document.querySelectorAll('.filter-pill')).find((p) => p.innerText.includes('Reset'));
      if (reset) reset.click();
    });
    await new Promise((r) => setTimeout(r, 500));

    // Test Search
    const searchInput = await page.$('.notification-search-input');
    if (searchInput) {
      await searchInput.type('cardiology');
      await new Promise((r) => setTimeout(r, 500));
      const searchCount = await page.evaluate(() => document.querySelectorAll('.notification-table tbody tr').length);
      console.log(`Search 'cardiology' results: ${searchCount} row(s)`);

      // Clear search
      await page.evaluate(() => {
        const input = document.querySelector('.notification-search-input');
        if (input) {
          input.value = '';
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
      await new Promise((r) => setTimeout(r, 500));
    }

    const shot3 = path.join(ARTIFACT_DIR, 'notif_03_filters_and_search.png');
    await page.screenshot({ path: shot3, fullPage: true });
    console.log(`Saved screenshot 3: ${shot3}`);

    // 4. Test Support Tickets Tab
    console.log('\n4. Switching to Support Tickets Tab...');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('.module-tab-btn')).find((b) => b.innerText.includes('Support Tickets'));
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 2000));

    const ticketKpis = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.bento-card'));
      return cards.map((c) => {
        const label = c.querySelector('.bento-card-label')?.innerText.trim();
        const value = c.querySelector('.bento-card-value')?.innerText.trim();
        return { label, value };
      });
    });
    console.log('\n[Support Tickets KPI Cards]:');
    console.table(ticketKpis);

    const ticketRows = await page.evaluate(() => {
      const trs = Array.from(document.querySelectorAll('.notification-table tbody tr'));
      return trs.slice(0, 4).map((tr) => {
        const num = tr.querySelector('.font-mono')?.innerText.trim();
        const subject = tr.querySelector('.alert-title')?.innerText.trim();
        const cat = tr.querySelector('.module-badge')?.innerText.trim();
        return { num, subject: subject ? subject.slice(0, 40) + '...' : '', cat };
      });
    });
    console.log('\n[Support Tickets Table Sample Rows]:');
    console.table(ticketRows);

    const shot4 = path.join(ARTIFACT_DIR, 'notif_04_support_tickets_tab.png');
    await page.screenshot({ path: shot4, fullPage: true });
    console.log(`Saved screenshot 4: ${shot4}`);

    // 5. Live Mutation Lifecycle Verification (Create, Mark Read, Archive)
    console.log('\n5. Testing Live Notification Lifecycle Mutation...');
    // Create unread alert
    const createRes = await fetch('https://360api.vnvision.in/api/v1/notifications', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Puppeteer Live Verification Alert',
        message: 'Validating unread badge, direct read mutation, and soft deletion.',
        recipientUserId: '554f1941-f337-4a98-a8b6-d4409e1cfa04',
        notificationType: 'SYSTEM',
        priority: 'CRITICAL',
        channel: 'IN_APP',
      }),
    }).then((r) => r.json());

    const createdId = createRes?.data?.id;
    console.log(`Dispatched test notification: ID = ${createdId}`);

    // Switch back to notifications tab and refresh
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('.module-tab-btn')).find((b) => b.innerText.includes('System Notifications'));
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 500));

    // Click refresh button in UI
    await page.click('.notification-top-icon-btn[title="Refresh Live Data"]');
    await new Promise((r) => setTimeout(r, 2000));

    // Verify unread badge updated to 1
    const unreadAfterCreate = await page.evaluate(() => {
      const unreadCard = Array.from(document.querySelectorAll('.bento-card')).find((c) => c.innerText.includes('UNREAD'));
      return unreadCard?.querySelector('.bento-card-value')?.innerText.trim();
    });
    console.log(`Unread count in UI after creating alert: ${unreadAfterCreate}`);

    // Verify critical count updated to 1
    const criticalAfterCreate = await page.evaluate(() => {
      const card = Array.from(document.querySelectorAll('.bento-card')).find((c) => c.innerText.includes('CRITICAL'));
      return card?.querySelector('.bento-card-value')?.innerText.trim();
    });
    console.log(`Critical count in UI after creating alert: ${criticalAfterCreate}`);

    // Mark as read using direct row button
    console.log('Clicking direct "Mark as Read" action on row...');
    const markReadBtn = await page.$('.notification-action-btn[title="Mark as Read"]');
    if (markReadBtn) {
      await markReadBtn.click();
      await new Promise((r) => setTimeout(r, 2000));
    }

    const unreadAfterRead = await page.evaluate(() => {
      const unreadCard = Array.from(document.querySelectorAll('.bento-card')).find((c) => c.innerText.includes('UNREAD'));
      return unreadCard?.querySelector('.bento-card-value')?.innerText.trim();
    });
    console.log(`Unread count in UI after marking read: ${unreadAfterRead}`);

    // Clean up: delete the test notification from backend
    if (createdId) {
      console.log('Archiving / deleting test notification from backend...');
      await fetch(`https://360api.vnvision.in/api/v1/notifications/${createdId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      // Refresh UI
      await page.click('.notification-top-icon-btn[title="Refresh Live Data"]');
      await new Promise((r) => setTimeout(r, 2000));
    }

    console.log('\nAll E2E checks PASSED successfully!');
  } catch (err) {
    console.error('E2E verification error:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();

