const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/biswa/.gemini/antigravity/brain/e0785a94-53fe-4f28-b816-f2efe4edf49e';
const TARGET_JOB_ID = 'bf760a70-ab5b-4390-b0f4-d2da9b6006c8';
const TARGET_OCR_ID = '#OCR-BF760A70';
const BASE_URL = 'http://localhost:5174';

async function main() {
  console.log('--- CAREID OCR REJECTION RUNTIME VERIFICATION ---');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    // Read fresh auth token
    const tokenObj = JSON.parse(fs.readFileSync('scratch/cached_admin_token.json', 'utf8'));
    const token = tokenObj.token;

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

    // 1. Verify in OCR Queue with search on target record
    console.log('1. Navigating to OCR Processing Queue...');
    await page.goto(`${BASE_URL}/admin/ocr/queue`, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForFunction(() => !document.body.innerText.includes('Verifying session...'), { timeout: 10000 });
    await page.waitForSelector('.ocr-queue-table tbody tr', { timeout: 15000 });

    const searchInput = await page.$('header input');
    if (searchInput) {
      await searchInput.type('bf760a70');
      await new Promise((r) => setTimeout(r, 2000));
      await page.waitForFunction(
        () => !document.querySelector('.ocr-queue-table tbody')?.innerText.includes('Loading'),
        { timeout: 10000 }
      );
    }

    const targetRow = await page.evaluate((targetOcr) => {
      const rows = Array.from(document.querySelectorAll('.ocr-queue-table tbody tr'));
      for (const row of rows) {
        const text = row.innerText;
        if (text.includes(targetOcr)) {
          const badge = row.querySelector('.ocr-status-badge');
          return {
            found: true,
            text: text.replace(/\n+/g, ' '),
            badgeText: badge ? badge.innerText.trim() : null,
            badgeClass: badge ? badge.className : null,
          };
        }
      }
      return { found: false };
    }, TARGET_OCR_ID);

    console.log('Target OCR record search result:', targetRow);

    if (!targetRow.found) {
      throw new Error(`TEST FAILED: Target job ${TARGET_OCR_ID} not found in search!`);
    }

    console.log(`Target status badge text: "${targetRow.badgeText}"`);
    console.log(`Target status badge class: "${targetRow.badgeClass}"`);
    if (targetRow.badgeText === 'Approved') {
      throw new Error('TEST FAILED: Target job is still showing as Approved!');
    }
    if (targetRow.badgeText !== 'Rejected') {
      throw new Error(`TEST FAILED: Expected Rejected, got ${targetRow.badgeText}`);
    }
    console.log('✓ Target job status badge correctly displays "Rejected" (ocr-status-rejected)!');

    const queueShotPath = path.join(ARTIFACT_DIR, 'ocr_rejection_01_queue_rejected_badge.png');
    await page.screenshot({ path: queueShotPath, fullPage: false });
    console.log(`Saved screenshot: ${queueShotPath}`);

    // Clear search input
    await page.evaluate(() => {
      const inp = document.querySelector('header input');
      if (inp) {
        inp.value = '';
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        inp.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await new Promise((r) => setTimeout(r, 1500));
    await page.waitForFunction(
      () => !document.querySelector('.ocr-queue-table tbody')?.innerText.includes('Loading'),
      { timeout: 10000 }
    );

    // 2. Click "Rejected" filter tab
    console.log('\n2. Testing "Rejected" filter tab...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('.ocr-filter-btn'));
      const rejectedBtn = buttons.find((b) => b.innerText.trim().includes('Rejected'));
      if (rejectedBtn) rejectedBtn.click();
    });

    await new Promise((r) => setTimeout(r, 2000));
    await page.waitForFunction(
      () => !document.querySelector('.ocr-queue-table tbody')?.innerText.includes('Loading'),
      { timeout: 10000 }
    );

    const rejectedRows = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.ocr-queue-table tbody tr'));
      return rows.map((r) => {
        const badge = r.querySelector('.ocr-status-badge');
        return {
          idText: r.querySelector('td:nth-child(1)')?.innerText.trim(),
          badgeText: badge ? badge.innerText.trim() : null,
          badgeClass: badge ? badge.className : null,
        };
      });
    });

    console.log(`Found ${rejectedRows.length} items on page 1 of Rejected tab.`);
    console.log('Sample items under Rejected:', rejectedRows.slice(0, 3));

    const hasNonRejected = rejectedRows.some((r) => r.badgeText && r.badgeText !== 'Rejected');
    if (hasNonRejected) {
      throw new Error('TEST FAILED: Non-rejected records appeared under Rejected tab!');
    }
    console.log('✓ All items in Rejected tab strictly have status "Rejected"!');

    // 3. Test "Approved" filter tab
    console.log('\n3. Testing "Approved" filter tab...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('.ocr-filter-btn'));
      const approvedBtn = buttons.find((b) => b.innerText.trim().includes('Approved'));
      if (approvedBtn) approvedBtn.click();
    });

    await new Promise((r) => setTimeout(r, 2000));
    await page.waitForFunction(
      () => !document.querySelector('.ocr-queue-table tbody')?.innerText.includes('Loading'),
      { timeout: 10000 }
    );

    const approvedRows = await page.evaluate((targetOcr) => {
      const rows = Array.from(document.querySelectorAll('.ocr-queue-table tbody tr'));
      let targetInApproved = false;
      const allApproved = rows.every((r) => {
        const text = r.innerText;
        if (text.includes(targetOcr)) targetInApproved = true;
        const badge = r.querySelector('.ocr-status-badge');
        return !badge || badge.innerText.trim() === 'Approved';
      });
      return { total: rows.length, targetInApproved, allApproved };
    }, TARGET_OCR_ID);

    console.log('Approved tab check:', approvedRows);
    if (approvedRows.targetInApproved) {
      throw new Error('TEST FAILED: Target rejected job was found in Approved tab!');
    }
    console.log('✓ Target rejected job is strictly excluded from Approved tab!');

    // 4. Test /admin/ocr/rejected page
    console.log('\n4. Testing Rejected Documents page (/admin/ocr/rejected)...');
    await page.goto(`${BASE_URL}/admin/ocr/rejected`, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('.ocr-rejected-canvas', { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 2500));

    const rejectedDocs = await page.evaluate((targetOcr) => {
      const rows = Array.from(document.querySelectorAll('.ocr-rejected-tr'));
      let targetFound = false;
      let targetReason = null;
      let targetExplanation = null;
      let targetReviewer = null;

      rows.forEach((r) => {
        const text = r.innerText;
        if (text.includes(targetOcr)) {
          targetFound = true;
          targetReason = r.querySelector('.ocr-reason-badge')?.innerText.trim();
          targetExplanation = r.querySelector('.ocr-reason-explanation')?.innerText.trim();
          targetReviewer = r.querySelector('.ocr-reviewer-name')?.innerText.trim();
        }
      });

      return {
        totalRejected: rows.length,
        targetFound,
        targetReason,
        targetExplanation,
        targetReviewer,
      };
    }, TARGET_OCR_ID);

    console.log('Rejected Documents directory result:', rejectedDocs);
    if (rejectedDocs.targetFound) {
      console.log(`✓ Target job found in Rejected Documents! Reason: "${rejectedDocs.targetReason}", Reviewer: "${rejectedDocs.targetReviewer}"`);
    } else {
      throw new Error(`TEST FAILED: Target job ${TARGET_OCR_ID} not found in Rejected Documents!`);
    }

    const rejectedShotPath = path.join(ARTIFACT_DIR, 'ocr_rejection_02_rejected_directory.png');
    await page.screenshot({ path: rejectedShotPath, fullPage: false });
    console.log(`Saved screenshot: ${rejectedShotPath}`);

    // 5. Test /admin/ocr/history page
    console.log('\n5. Testing Review History page (/admin/ocr/history)...');
    await page.goto(`${BASE_URL}/admin/ocr/history`, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('.ocr-rejected-canvas', { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 2500));

    const historyResult = await page.evaluate((targetOcr) => {
      const rows = Array.from(document.querySelectorAll('.ocr-rejected-tr'));
      let targetFound = false;
      let decision = null;
      let notes = null;
      let reviewer = null;

      rows.forEach((r) => {
        const text = r.innerText;
        if (text.includes(targetOcr)) {
          targetFound = true;
          decision = r.querySelector('.inline-flex')?.innerText.trim();
          notes = r.querySelector('.ocr-reason-cell p')?.innerText.trim();
          reviewer = r.querySelector('.ocr-reviewer-name')?.innerText.trim();
        }
      });

      return {
        totalHistory: rows.length,
        targetFound,
        decision,
        notes,
        reviewer,
      };
    }, TARGET_OCR_ID);

    console.log('Review History result:', historyResult);
    if (historyResult.targetFound) {
      console.log(`✓ Target job found in Review History! Decision: "${historyResult.decision}", Notes: "${historyResult.notes}", Reviewer: "${historyResult.reviewer}"`);
      if (historyResult.decision !== 'Rejected') {
        throw new Error(`TEST FAILED: Expected decision to be Rejected, got ${historyResult.decision}`);
      }
    } else {
      throw new Error(`TEST FAILED: Target job ${TARGET_OCR_ID} not found in Review History!`);
    }

    const historyShotPath = path.join(ARTIFACT_DIR, 'ocr_rejection_03_review_history_verified.png');
    await page.screenshot({ path: historyShotPath, fullPage: false });
    console.log(`Saved screenshot: ${historyShotPath}`);

    console.log('\n=============================================');
    console.log('ALL OCR REJECTION RUNTIME CHECKS PASSED 100%!');
    console.log('=============================================');
  } catch (err) {
    console.error('Test execution error:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();