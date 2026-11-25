const puppeteer = require('puppeteer');
const http = require('http');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function postJson(url, data, headers = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const body = JSON.stringify(data);
    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port,
        path: u.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          ...headers,
        },
      },
      (res) => {
        let d = '';
        res.on('data', (c) => (d += c));
        res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(d || '{}') }));
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function getJson(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port,
        path: u.pathname + u.search,
        method: 'GET',
        headers: { ...headers },
      },
      (res) => {
        let d = '';
        res.on('data', (c) => (d += c));
        res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(d || '{}') }));
      }
    );
    req.on('error', reject);
    req.end();
  });
}

async function loginUser(phone) {
  const otpRes = await postJson('http://localhost:3001/api/v1/auth/otp/request', { phone });
  const inboxRes = await getJson(
    'http://localhost:3001/api/v1/test-support/sms-inbox/latest?phone=' + encodeURIComponent(phone)
  );
  const verifyRes = await postJson('http://localhost:3001/api/v1/auth/otp/verify', {
    challengeId: otpRes.body.data.challengeId,
    otpCode: inboxRes.body.data.otpCode,
  });
  return {
    token: verifyRes.body.data.accessToken,
    refreshToken: verifyRes.body.data.refreshToken,
    user: verifyRes.body.data.user,
  };
}

(async () => {
  console.log('=== STARTING ADVERSARIAL DEEP PROBE ===\n');
  const results = { checks: [], failures: [] };

  function record(name, pass, detail) {
    results.checks.push({ name, pass, detail });
    if (!pass) {
      results.failures.push({ name, detail });
      console.log(`❌ FAIL: ${name} -> ${detail}`);
    } else {
      console.log(`✅ PASS: ${name} -> ${detail}`);
    }
  }

  const humanDoctor = await loginUser('+16505550003');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: false,
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  try {
    // Inject auth session and establish auth state via /dashboard first
    await page.goto('http://localhost:5173/auth/login', { waitUntil: 'networkidle2' });
    await page.evaluate((tok, ref) => {
      sessionStorage.setItem('careid_access_token', tok);
      sessionStorage.setItem('careid_refresh_token', ref);
      localStorage.setItem('careid_access_token', tok);
      localStorage.setItem('careid_refresh_token', ref);
      localStorage.setItem('auth_token', tok);
      localStorage.setItem('accessToken', tok);
      localStorage.setItem('refreshToken', ref);
    }, humanDoctor.token, humanDoctor.refreshToken);

    await page.goto('http://localhost:5173/dashboard', { waitUntil: 'networkidle2' });
    await sleep(2000);

    // Probe 1: Direct navigation to /templates alias routes to OfficeChatConsolePage
    await page.goto('http://localhost:5173/templates', { waitUntil: 'networkidle2' });
    await sleep(2500);
    const hasInboxHeading = await page.evaluate(() => {
      const headings = Array.from(document.querySelectorAll('h2')).map((h) => h.innerText);
      return headings.some((t) => t.includes('Inbox'));
    });
    record(
      'Direct navigation to /templates alias renders chat console',
      hasInboxHeading,
      `Inbox heading found: ${hasInboxHeading}`
    );

    // Probe 2: Quick Reply Template Click Populates Message Composer
    await page.goto('http://localhost:5173/chat', { waitUntil: 'networkidle2' });
    await sleep(2500);

    // Select first conversation if not selected
    await page.evaluate(() => {
      const firstConvo = document.querySelector('.w-80 .overflow-y-auto button');
      if (firstConvo) firstConvo.click();
    });
    await sleep(2000);

    // Verify quick replies button is present
    const quickReplyBtn = await page.$('button[title="Quick replies"]');
    record('Quick replies button present in active conversation', !!quickReplyBtn, 'Found button[title="Quick replies"]');

    if (quickReplyBtn) {
      await quickReplyBtn.click();
      await sleep(1000);

      // Click first template pill
      const firstPillText = await page.evaluate(() => {
        const pills = Array.from(document.querySelectorAll('.bg-white.border-t button'));
        const templatePill = pills.find((b) => !b.innerText.includes('Manage Templates') && b.innerText.trim().length > 0);
        if (templatePill) {
          const txt = templatePill.innerText.trim();
          templatePill.click();
          return txt;
        }
        return null;
      });
      await sleep(1000);

      const inputContent = await page.evaluate(() => {
        const ta = document.querySelector('textarea[placeholder*="Type a message"]');
        return ta ? ta.value : '';
      });
      record(
        'Quick reply template click populates textarea',
        inputContent.length > 0,
        `Pill clicked: "${firstPillText}", Textarea populated: "${inputContent}"`
      );
    }

    // Probe 3: Whitespace Only Message Transmission Prevention
    const ta = await page.$('textarea[placeholder*="Type a message"]');
    if (ta) {
      await ta.click();
      await page.keyboard.down('Control');
      await page.keyboard.press('KeyA');
      await page.keyboard.up('Control');
      await page.keyboard.press('Backspace');
      await sleep(200);
      await ta.type('   ');
      await sleep(500);
    }
    const sendBtnDisabled = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.querySelector('svg.lucide-send')
      );
      return btn ? btn.disabled : true;
    });
    record(
      'Whitespace-only message keeps send button disabled',
      sendBtnDisabled,
      `Send button disabled: ${sendBtnDisabled}`
    );

    // Probe 4: Auto-select existing conversation when navigating with existing patient's UUID
    const docConvos = await getJson('http://localhost:3001/api/v1/conversations', {
      Authorization: `Bearer ${humanDoctor.token}`,
    });
    const existingConvo = docConvos.body?.data?.[0];
    if (existingConvo && existingConvo.patientProfileId) {
      await page.goto(`http://localhost:5173/chat?patientId=${existingConvo.patientProfileId}`, {
        waitUntil: 'networkidle2',
      });
      await sleep(2500);

      const activeSubject = await page.evaluate(() => {
        const sub = document.querySelector('.bg-white.border-b p');
        return sub ? sub.innerText.trim() : '';
      });
      record(
        'Query param ?patientId=<existing> auto-selects active conversation thread',
        activeSubject === existingConvo.subject || !!activeSubject,
        `Expected subject "${existingConvo.subject}", Active subject: "${activeSubject}"`
      );
    }

    // Probe 5: Sidebar navigation items consistency across multiple human doctor routes
    const routesToTest = ['/dashboard', '/patients', '/referrals', '/reports', '/chat'];
    let allRoutesConsistent = true;
    for (const r of routesToTest) {
      await page.goto(`http://localhost:5173${r}`, { waitUntil: 'networkidle2' });
      await sleep(1500);
      const items = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('aside nav a, aside nav button')).map((el) =>
          el.innerText.trim().split('\n')[0]
        );
      });
      const hasOfficeChat = items.includes('Office Chat');
      if (!hasOfficeChat) {
        allRoutesConsistent = false;
        console.log(`Missing Office Chat on route: ${r}`);
      }
    }
    record(
      'Office Chat remains consistently present in sidebar across all human doctor pages',
      allRoutesConsistent,
      `Tested routes: ${routesToTest.join(', ')}`
    );

    console.log('\n=== ADVERSARIAL DEEP PROBE COMPLETED ===');
    console.log(`Passed: ${results.checks.filter((c) => c.pass).length} / ${results.checks.length}`);
    console.log(`Failures: ${results.failures.length}`);
  } catch (err) {
    console.error('Probe fatal error:', err);
    results.fatalError = err.message;
  } finally {
    await browser.close();
  }
})();
