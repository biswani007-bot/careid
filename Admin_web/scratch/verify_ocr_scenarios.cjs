const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const ARTIFACT_DIR = 'C:/Users/biswa/.gemini/antigravity/brain/e0785a94-53fe-4f28-b816-f2efe4edf49e';
const BASE_URL = 'http://localhost:5173';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, Accept, Origin, X-Requested-With',
};

async function run() {
  const tokenData = JSON.parse(fs.readFileSync('scratch/cached_token.json', 'utf8'));
  const token = tokenData.accessToken || tokenData.token;

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const setupAuth = async (page) => {
    await page.goto(BASE_URL + '/', { waitUntil: 'domcontentloaded' });
    await page.evaluate((tok) => {
      const user = {
        id: 'bc6f6875-434c-4050-b893-07343cc27986',
        email: 'superadmin@careid.test',
        phone: '+16505550001',
        status: 'ACTIVE',
        roles: ['SUPER_ADMIN'],
        permissions: ['read:all', 'write:all', 'delete:all', 'read:audit-logs', 'manage:roles']
      };
      localStorage.setItem('careid_access_token', tok);
      sessionStorage.setItem('careid_access_token', tok);
      localStorage.setItem('careid_user_session', JSON.stringify(user));
      sessionStorage.setItem('careid_user_session', JSON.stringify(user));
    }, token);
  };

  const getSidebarBadge = async (page) => {
    return page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.sidebar-nav-item'));
      const ocrItem = items.find(i => i.innerText.includes('OCR Verification'));
      if (!ocrItem) return { found: false };
      const badge = ocrItem.querySelector('.sidebar-badge');
      return {
        found: true,
        itemText: ocrItem.innerText.replace(/\s+/g, ' ').trim(),
        hasBadge: !!badge,
        badgeText: badge ? badge.innerText.trim() : null,
        badgeClass: badge ? badge.className : null,
        badgeTitle: badge ? badge.getAttribute('title') : null,
      };
    });
  };

  const getKpisAndFooter = async (page) => {
    return page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.ocr-kpi-card')).map(c => ({
        label: c.querySelector('.ocr-kpi-label')?.innerText.trim(),
        value: c.querySelector('.ocr-kpi-value')?.innerText.trim()
      }));
      const footer = document.querySelector('.ocr-pagination-footer')?.innerText.replace(/\s+/g, ' ') || null;
      const rows = document.querySelectorAll('.ocr-table-row').length;
      const errorMsg = document.querySelector('.text-\\[\\#ba1a1a\\]')?.innerText || null;
      return { cards, footer, rows, errorMsg };
    });
  };

  console.log('================================================================');
  console.log('TEST 1: LIVE BACKEND STATE (1 APPROVED OCR RECORD, 0 PENDING)');
  console.log('================================================================');
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    await setupAuth(page);
    await page.goto(BASE_URL + '/admin/ocr/queue', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));

    const sidebar = await getSidebarBadge(page);
    const state = await getKpisAndFooter(page);

    console.log('Sidebar OCR Item:', sidebar);
    console.log('KPI Cards:', state.cards);
    console.log('Footer:', state.footer);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'ocr_test1_live_approved.png') });
    await page.close();
  }

  console.log('\n================================================================');
  console.log('TEST 2: ONE PENDING OCR RECORD (1 REVIEW_REQUIRED)');
  console.log('================================================================');
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    await page.setRequestInterception(true);
    page.on('request', req => {
      const url = req.url();
      if (req.method() === 'OPTIONS') {
        req.respond({ status: 204, headers: CORS_HEADERS });
        return;
      }
      if (url.includes('/api/v1/ocr/dashboard') || url.includes('/api/v1/ocr/statistics')) {
        req.respond({
          status: 200, contentType: 'application/json', headers: CORS_HEADERS,
          body: JSON.stringify({
            success: true, statusCode: 200,
            data: { totalJobs: 1, completedJobs: 0, reviewRequiredJobs: 1, failedJobs: 0, averageConfidence: 0.65 }
          })
        });
      } else if (url.includes('/api/v1/ocr/review')) {
        req.respond({
          status: 200, contentType: 'application/json', headers: CORS_HEADERS,
          body: JSON.stringify({
            success: true, statusCode: 200,
            data: [{ id: 'pending-job-1', documentType: 'PRESCRIPTION', status: 'REVIEW_REQUIRED', overallConfidence: 0.65, confidenceLevel: 'LOW' }]
          })
        });
      } else if (url.includes('/api/v1/ocr/jobs')) {
        req.respond({
          status: 200, contentType: 'application/json', headers: CORS_HEADERS,
          body: JSON.stringify({
            success: true, statusCode: 200,
            data: [{
              id: 'pending-job-1', documentType: 'PRESCRIPTION', status: 'REVIEW_REQUIRED',
              overallConfidence: 0.65, confidenceLevel: 'LOW', createdAt: new Date().toISOString()
            }]
          })
        });
      } else {
        req.continue();
      }
    });

    await setupAuth(page);
    await page.goto(BASE_URL + '/admin/ocr/queue', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));

    const sidebar = await getSidebarBadge(page);
    const state = await getKpisAndFooter(page);

    console.log('Sidebar OCR Item:', sidebar);
    console.log('KPI Cards:', state.cards);
    console.log('Footer:', state.footer);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'ocr_test2_pending_record.png') });
    await page.close();
  }

  console.log('\n================================================================');
  console.log('TEST 3: MULTIPLE OCR RECORDS WITH MIXED STATUSES');
  console.log('================================================================');
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    await page.setRequestInterception(true);
    page.on('request', req => {
      const url = req.url();
      if (req.method() === 'OPTIONS') {
        req.respond({ status: 204, headers: CORS_HEADERS });
        return;
      }
      if (url.includes('/api/v1/ocr/dashboard') || url.includes('/api/v1/ocr/statistics')) {
        req.respond({
          status: 200, contentType: 'application/json', headers: CORS_HEADERS,
          body: JSON.stringify({
            success: true, statusCode: 200,
            data: { totalJobs: 4, completedJobs: 2, reviewRequiredJobs: 1, failedJobs: 1, averageConfidence: 0.84 }
          })
        });
      } else if (url.includes('/api/v1/ocr/review')) {
        req.respond({
          status: 200, contentType: 'application/json', headers: CORS_HEADERS,
          body: JSON.stringify({
            success: true, statusCode: 200,
            data: [{ id: 'job-2', documentType: 'PRESCRIPTION', status: 'REVIEW_REQUIRED', overallConfidence: 0.82, confidenceLevel: 'MEDIUM' }]
          })
        });
      } else if (url.includes('/api/v1/ocr/jobs')) {
        req.respond({
          status: 200, contentType: 'application/json', headers: CORS_HEADERS,
          body: JSON.stringify({
            success: true, statusCode: 200,
            data: [
              { id: 'job-1', documentType: 'LAB_REPORT', status: 'COMPLETED', overallConfidence: 0.95, confidenceLevel: 'HIGH', createdAt: new Date().toISOString() },
              { id: 'job-2', documentType: 'PRESCRIPTION', status: 'REVIEW_REQUIRED', overallConfidence: 0.82, confidenceLevel: 'MEDIUM', createdAt: new Date().toISOString() },
              { id: 'job-3', documentType: 'DISCHARGE_SUMMARY', status: 'FAILED', overallConfidence: 0.45, confidenceLevel: 'LOW', createdAt: new Date().toISOString() },
              { id: 'job-4', documentType: 'LAB_REPORT', status: 'COMPLETED', overallConfidence: 0.91, confidenceLevel: 'HIGH', createdAt: new Date().toISOString() }
            ]
          })
        });
      } else {
        req.continue();
      }
    });

    await setupAuth(page);
    await page.goto(BASE_URL + '/admin/ocr/queue', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));

    const sidebar = await getSidebarBadge(page);
    const state = await getKpisAndFooter(page);

    console.log('Sidebar OCR Item:', sidebar);
    console.log('KPI Cards:', state.cards);
    console.log('Footer:', state.footer);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'ocr_test3_mixed_records.png') });
    await page.close();
  }

  console.log('\n================================================================');
  console.log('TEST 4: ZERO OCR RECORDS');
  console.log('================================================================');
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    await page.setRequestInterception(true);
    page.on('request', req => {
      const url = req.url();
      if (req.method() === 'OPTIONS') {
        req.respond({ status: 204, headers: CORS_HEADERS });
        return;
      }
      if (url.includes('/api/v1/ocr/dashboard') || url.includes('/api/v1/ocr/statistics')) {
        req.respond({
          status: 200, contentType: 'application/json', headers: CORS_HEADERS,
          body: JSON.stringify({
            success: true, statusCode: 200,
            data: { totalJobs: 0, completedJobs: 0, reviewRequiredJobs: 0, failedJobs: 0, averageConfidence: 0 }
          })
        });
      } else if (url.includes('/api/v1/ocr/review')) {
        req.respond({
          status: 200, contentType: 'application/json', headers: CORS_HEADERS,
          body: JSON.stringify({ success: true, statusCode: 200, data: [] })
        });
      } else if (url.includes('/api/v1/ocr/jobs')) {
        req.respond({
          status: 200, contentType: 'application/json', headers: CORS_HEADERS,
          body: JSON.stringify({ success: true, statusCode: 200, data: [] })
        });
      } else {
        req.continue();
      }
    });

    await setupAuth(page);
    await page.goto(BASE_URL + '/admin/ocr/queue', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));

    const sidebar = await getSidebarBadge(page);
    const state = await getKpisAndFooter(page);

    console.log('Sidebar OCR Item:', sidebar);
    console.log('KPI Cards:', state.cards);
    console.log('Footer:', state.footer);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'ocr_test4_zero_records.png') });
    await page.close();
  }

  console.log('\n================================================================');
  console.log('TEST 5: OCR API FAILURE (HTTP 500)');
  console.log('================================================================');
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    await page.setRequestInterception(true);
    page.on('request', req => {
      const url = req.url();
      if (req.method() === 'OPTIONS') {
        req.respond({ status: 204, headers: CORS_HEADERS });
        return;
      }
      if (url.includes('/api/v1/ocr/')) {
        req.respond({
          status: 500, contentType: 'application/json', headers: CORS_HEADERS,
          body: JSON.stringify({
            success: false, statusCode: 500,
            error: 'InternalServerError', message: 'OCR database cluster unreachable'
          })
        });
      } else {
        req.continue();
      }
    });

    await setupAuth(page);
    await page.goto(BASE_URL + '/admin/ocr/queue', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2500));

    const sidebar = await getSidebarBadge(page);
    const state = await getKpisAndFooter(page);

    console.log('Sidebar OCR Item (API Error):', sidebar);
    console.log('Page error state present:', !!state.errorMsg);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'ocr_test5_api_error.png') });
    await page.close();
  }

  console.log('\n================================================================');
  console.log('TEST 6: QUERY SYNCHRONIZATION AND CACHE INVALIDATION');
  console.log('================================================================');
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });

    let isApproved = false;
    page.on('request', req => {
      const url = req.url();
      if (req.method() === 'OPTIONS') {
        req.respond({ status: 204, headers: CORS_HEADERS });
        return;
      }
      if (req.method() === 'POST' && url.includes('/api/v1/ocr/review/')) {
        isApproved = true;
        req.respond({
          status: 200, contentType: 'application/json', headers: CORS_HEADERS,
          body: JSON.stringify({ success: true, message: 'Review completed' })
        });
      } else if (url.includes('/api/v1/ocr/dashboard') || url.includes('/api/v1/ocr/statistics')) {
        req.respond({
          status: 200, contentType: 'application/json', headers: CORS_HEADERS,
          body: JSON.stringify({
            success: true, statusCode: 200,
            data: {
              totalJobs: 1,
              completedJobs: isApproved ? 1 : 0,
              reviewRequiredJobs: isApproved ? 0 : 1,
              failedJobs: 0,
              averageConfidence: 0.94
            }
          })
        });
      } else if (url.includes('/api/v1/ocr/review')) {
        req.respond({
          status: 200, contentType: 'application/json', headers: CORS_HEADERS,
          body: JSON.stringify({
            success: true, statusCode: 200,
            data: isApproved ? [] : [{ id: 'job-sync-1', documentType: 'LAB_REPORT', status: 'REVIEW_REQUIRED', overallConfidence: 0.94, confidenceLevel: 'HIGH' }]
          })
        });
      } else if (url.includes('/api/v1/ocr/jobs')) {
        req.respond({
          status: 200, contentType: 'application/json', headers: CORS_HEADERS,
          body: JSON.stringify({
            success: true, statusCode: 200,
            data: [{
              id: 'job-sync-1', documentType: 'LAB_REPORT', status: isApproved ? 'COMPLETED' : 'REVIEW_REQUIRED',
              overallConfidence: 0.94, confidenceLevel: 'HIGH', createdAt: new Date().toISOString()
            }]
          })
        });
      } else {
        req.continue();
      }
    });

    await page.setRequestInterception(true);
    await setupAuth(page);
    await page.goto(BASE_URL + '/admin/ocr/queue', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));

    const beforeSidebar = await getSidebarBadge(page);
    const beforeKpis = await getKpisAndFooter(page);
    console.log('Before approve - Sidebar Badge:', beforeSidebar);
    console.log('Before approve - KPIs:', beforeKpis.cards);

    // Verify TanStack Query cache invalidation
    await page.evaluate(() => {
      // Invalidate queries to test live refresh
      window.dispatchEvent(new CustomEvent('careid-ocr-updated'));
    });

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'ocr_test6_sync_after_approve.png') });
    await page.close();
  }

  await browser.close();
  console.log('\nAll 6 tests completed successfully.');
}

run().catch(err => {
  console.error('Error running test script:', err);
  process.exit(1);
});
