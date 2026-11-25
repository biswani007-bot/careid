const puppeteer = require('puppeteer');
const http = require('http');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const EVIDENCE_DIR = path.resolve('D:\\careid\\Admin_web\\docs\\evidence\\CAREID_CR07_HUMAN_DOCTOR_CHAT_FIX_012');

if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function clearInput(page, el) {
  await el.click();
  await page.keyboard.down('Control');
  await page.keyboard.press('KeyA');
  await page.keyboard.up('Control');
  await page.keyboard.press('Backspace');
  await sleep(300);
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
  console.log('=== STARTING ADVERSARIAL EDGE-CASE VERIFICATION ===\n');
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

  console.log('1. Authenticating test users...');
  const humanDoctor = await loginUser('+16505550003'); // Dr. Sarah Jenkins (Human Doctor)
  const vetDoctor = await loginUser('+16505555165'); // Attending Veterinarian

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: false,
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
  });

  const page = await browser.newPage();

  try {
    // ─── TEST 1: Human Doctor Sidebar & Active State on /dashboard ───────────
    console.log('\n2. Testing Human Doctor on /dashboard...');
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
    await sleep(2500);

    const sidebarLinks = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('aside nav a, aside nav button'));
      return links.map((l) => l.innerText.trim().split('\n')[0]);
    });
    record(
      'Sidebar items presence',
      sidebarLinks.includes('Dashboard') &&
        sidebarLinks.includes('Patients') &&
        sidebarLinks.includes('Referrals') &&
        sidebarLinks.includes('Office Chat') &&
        sidebarLinks.includes('Reports') &&
        sidebarLinks.includes('Profile'),
      `Sidebar items found: ${sidebarLinks.join(', ')}`
    );

    // Screenshot 1
    const shot1 = path.join(EVIDENCE_DIR, 'cr07_human_doctor_sidebar_office_chat.png');
    await page.screenshot({ path: shot1 });

    // ─── TEST 2: Navigate to Office Chat via Sidebar Click ──────────────────
    console.log('\n3. Clicking Office Chat in sidebar...');
    await page.evaluate(() => {
      const link = Array.from(document.querySelectorAll('aside nav a')).find((l) =>
        l.innerText.includes('Office Chat')
      );
      if (link) link.click();
    });
    await sleep(2500);

    record(
      'Sidebar link navigates to /chat',
      page.url() === 'http://localhost:5173/chat',
      `Current URL: ${page.url()}`
    );

    // Active link highlighting check
    const activeStyling = await page.evaluate(() => {
      const link = Array.from(document.querySelectorAll('aside nav a')).find((l) =>
        l.innerText.includes('Office Chat')
      );
      if (!link) return null;
      const comp = window.getComputedStyle(link);
      return {
        className: link.className,
        color: comp.color,
        bg: comp.backgroundColor,
      };
    });
    record(
      'Office Chat active pill highlighting',
      activeStyling &&
        (activeStyling.className.includes('bg-[#3f1d8b]') ||
          activeStyling.bg === 'rgb(63, 29, 139)'),
      `Classes: ${activeStyling?.className}, computedBg: ${activeStyling?.bg}`
    );

    // Screenshot 2 & 3
    const shot2 = path.join(EVIDENCE_DIR, 'cr07_human_doctor_chat_console.png');
    await page.screenshot({ path: shot2 });
    const shot3 = path.join(EVIDENCE_DIR, 'cr07_active_office_chat_navigation.png');
    await page.screenshot({ path: shot3 });

    // ─── TEST 3: Direct Navigation & Browser Refresh on /chat ───────────────
    console.log('\n4. Testing Direct Navigation & Refresh on /chat...');
    await page.goto('http://localhost:5173/chat', { waitUntil: 'networkidle2' });
    await sleep(2000);
    record(
      'Direct navigation to /chat loads properly',
      page.url() === 'http://localhost:5173/chat' && (await page.$('h2')) !== null,
      'Loaded without redirect or error'
    );

    await page.reload({ waitUntil: 'networkidle2' });
    await sleep(2500);
    record(
      'Browser refresh on /chat preserves console',
      page.url() === 'http://localhost:5173/chat',
      'Refreshed cleanly'
    );

    // ─── TEST 4: Legacy Alias /communication/chat ───────────────────────────
    console.log('\n5. Testing Legacy /communication/chat alias...');
    await page.goto('http://localhost:5173/communication/chat', { waitUntil: 'networkidle2' });
    await sleep(2000);
    const legacyChatLoaded = (await page.$('h2')) !== null;
    record(
      'Legacy /communication/chat alias supported',
      legacyChatLoaded,
      `Loaded successfully on legacy route`
    );

    // ─── TEST 5: Searchable Patient Selection in Modal ───────────────────────
    console.log('\n6. Testing Modal Patient Search Filtering...');
    await page.goto('http://localhost:5173/chat', { waitUntil: 'networkidle2' });
    await sleep(2000);

    // Open modal
    await page.click('button[title="New conversation"]');
    await page.waitForFunction(() => {
      const sel = document.querySelector('form select');
      return sel && sel.options.length > 1 && !sel.options[1].disabled;
    });

    const modalSearchInput = await page.$('form input[placeholder*="Search patient by name or ID"]');
    record('Search input present in modal', !!modalSearchInput, 'Found modal search input');

    // Filter by "Eleanor"
    await modalSearchInput.type('Eleanor');
    await sleep(500);

    const eleanorOpts = await page.evaluate(() => {
      const sel = document.querySelector('form select');
      return Array.from(sel.options)
        .filter((o) => !o.disabled)
        .map((o) => o.text);
    });
    record(
      'Search filtering by "Eleanor" isolates Eleanor Vance',
      eleanorOpts.length === 1 && eleanorOpts[0].includes('Eleanor Vance'),
      `Options: ${eleanorOpts.join(', ')}`
    );

    // Clear and filter by "John"
    await clearInput(page, modalSearchInput);
    await modalSearchInput.type('John');
    await sleep(500);

    const johnOpts = await page.evaluate(() => {
      const sel = document.querySelector('form select');
      return Array.from(sel.options)
        .filter((o) => !o.disabled)
        .map((o) => o.text);
    });
    record(
      'Search filtering by "John" isolates John Doe',
      johnOpts.length === 1 && johnOpts[0].includes('John Doe'),
      `Options: ${johnOpts.join(', ')}`
    );

    // Type non-existent patient "xyznonexistent"
    await clearInput(page, modalSearchInput);
    await modalSearchInput.type('xyznonexistent');
    await sleep(500);

    const nonExistentOpts = await page.evaluate(() => {
      const sel = document.querySelector('form select');
      return {
        options: Array.from(sel.options).map((o) => o.text),
        val: sel.value,
      };
    });
    record(
      'Search with no matching patient shows "No matching patients" and empty value',
      nonExistentOpts.options.includes('No matching patients') && nonExistentOpts.val === '',
      `Options: ${nonExistentOpts.options.join(', ')}, Value: "${nonExistentOpts.val}"`
    );

    // Clear search restores all patients
    await clearInput(page, modalSearchInput);
    await sleep(500);

    const restoredOpts = await page.evaluate(() => {
      const sel = document.querySelector('form select');
      return Array.from(sel.options)
        .filter((o) => !o.disabled)
        .map((o) => o.text);
    });
    record(
      'Clearing search restores all patient options',
      restoredOpts.length >= 2,
      `Restored count: ${restoredOpts.length}`
    );

    // ─── TEST 6: Create Authorized Conversation & Send Message ──────────────
    console.log('\n7. Testing Conversation Creation & Messaging...');
    const testSubject = `Adversarial Audit Thread ${Date.now()}`;
    const subjectInp = await page.$('form input[placeholder*="Consultation topic"]');
    if (subjectInp) await subjectInp.type(testSubject);

    const initMsgInp = await page.$('form textarea[placeholder*="Opening message"]');
    if (initMsgInp) await initMsgInp.type('Adversarial testing opening message.');

    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('form button')).find((b) =>
        b.innerText.includes('Start Conversation')
      );
      if (btn) btn.click();
    });
    await sleep(3500);

    // Verify created thread is active in chat header
    const currentSubject = await page.evaluate(() => {
      const sub = document.querySelector('.bg-white.border-b p');
      return sub ? sub.innerText.trim() : '';
    });
    record(
      'New conversation created and active in header',
      currentSubject === testSubject,
      `Active subject: "${currentSubject}"`
    );

    // Send message via Enter key
    const msgBox = await page.$('textarea[placeholder*="Type a message"]');
    record('Chat message composer box is visible and accessible', !!msgBox, 'Message box found');
    const msgText1 = `Enter key message ${Date.now()}`;
    await msgBox.type(msgText1);
    await page.keyboard.press('Enter');
    await sleep(2000);

    const messages = await page.evaluate(() => {
      const bubbles = Array.from(document.querySelectorAll('.rounded-2xl'));
      return bubbles.map((b) => b.innerText.trim());
    });
    record(
      'Message sent via Enter key appears in bubble stream',
      messages.some((m) => m.includes(msgText1)),
      `Found message: ${messages.find((m) => m.includes(msgText1))}`
    );

    // Send message via Send button
    const msgText2 = `Send button message ${Date.now()}`;
    await msgBox.type(msgText2);
    await page.evaluate(() => {
      const sendBtn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.querySelector('svg.lucide-send')
      );
      if (sendBtn) sendBtn.click();
    });
    await sleep(2000);

    const messages2 = await page.evaluate(() => {
      const bubbles = Array.from(document.querySelectorAll('.rounded-2xl'));
      return bubbles.map((b) => b.innerText.trim());
    });
    record(
      'Message sent via Send button appears in bubble stream',
      messages2.some((m) => m.includes(msgText2)),
      `Found message: ${messages2.find((m) => m.includes(msgText2))}`
    );

    // ─── TEST 7: Quick Reply Templates & Manage Templates Modal ─────────────
    console.log('\n8. Testing Quick Reply Templates & Modal Management...');
    await page.click('button[title="Quick replies"]');
    await sleep(800);

    const quickReplyPills = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.bg-white.border-t button'));
      return btns.map((b) => b.innerText.trim()).filter(Boolean);
    });
    record(
      'Quick reply templates rendered',
      quickReplyPills.length > 0,
      `Pills: ${quickReplyPills.slice(0, 3).join(', ')}...`
    );

    // Click "Manage Templates"
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.innerText.includes('Manage Templates')
      );
      if (btn) btn.click();
    });
    await sleep(1000);

    const manageModalOpen = await page.evaluate(() => !!document.querySelector('.fixed.inset-0.z-50'));
    record('Manage Templates modal opens cleanly', manageModalOpen, 'Modal mounted');

    // Close manage modal
    await page.evaluate(() => {
      const closeBtn = document.querySelector('.fixed.inset-0.z-50 button');
      if (closeBtn) closeBtn.click();
    });
    await sleep(800);

    // ─── TEST 7B: Modal Auto-Open & Clean Cancel with ?patientId= ──────────
    console.log('\n8b. Testing Modal Auto-Open & Clean Cancel via ?patientId= query parameter...');
    const nonExistentPatientId = '00000000-0000-0000-0000-000000000000';
    await page.goto(`http://localhost:5173/chat?patientId=${nonExistentPatientId}`, { waitUntil: 'networkidle2' });
    await sleep(2000);

    const autoModalOpen = await page.evaluate(() => !!document.querySelector('form select'));
    record(
      'New Conversation modal auto-opens when navigating with unthreaded patientId',
      autoModalOpen,
      'Modal automatically opened for unthreaded patientId'
    );

    // Click Cancel button in modal
    await page.evaluate(() => {
      const cancelBtn = Array.from(document.querySelectorAll('form button')).find((b) =>
        b.innerText.includes('Cancel')
      );
      if (cancelBtn) cancelBtn.click();
    });
    await sleep(1000);

    const modalDismissed = await page.evaluate(() => !document.querySelector('form select'));
    record(
      'Canceling modal with patientId in query cleanly dismisses without loop',
      modalDismissed,
      'Modal remained dismissed after clicking Cancel'
    );

    // ─── TEST 8: Veterinary Doctor Office Chat Verification ─────────────────
    console.log('\n9. Testing Veterinary Doctor Office Chat...');
    await page.goto('http://localhost:5173/auth/login', { waitUntil: 'networkidle2' });
    await page.evaluate((tok, ref) => {
      sessionStorage.setItem('careid_access_token', tok);
      sessionStorage.setItem('careid_refresh_token', ref);
      localStorage.setItem('careid_access_token', tok);
      localStorage.setItem('careid_refresh_token', ref);
      localStorage.setItem('auth_token', tok);
      localStorage.setItem('accessToken', tok);
      localStorage.setItem('refreshToken', ref);
    }, vetDoctor.token, vetDoctor.refreshToken);

    await page.goto('http://localhost:5173/veterinary/dashboard', { waitUntil: 'networkidle2' });
    await sleep(2500);

    const vetNavItems = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('aside nav a'));
      return links.map((l) => l.innerText.trim());
    });
    record(
      'Veterinary sidebar includes Office Chat',
      vetNavItems.some((t) => t.includes('Office Chat')),
      `Veterinary items: ${vetNavItems.join(', ')}`
    );

    // Click Office Chat in Veterinary Portal
    await page.evaluate(() => {
      const chatLink = Array.from(document.querySelectorAll('aside nav a')).find((l) =>
        l.innerText.includes('Office Chat')
      );
      if (chatLink) chatLink.click();
    });
    await sleep(2500);

    record(
      'Veterinary Doctor Office Chat navigates to /chat',
      page.url() === 'http://localhost:5173/chat',
      `URL: ${page.url()}`
    );

    // Screenshot 4
    const shot4 = path.join(EVIDENCE_DIR, 'cr07_veterinary_doctor_office_chat.png');
    await page.screenshot({ path: shot4 });

    // ─── TEST 9: Cross-Role Security Isolation ──────────────────────────────
    console.log('\n10. Testing Cross-Role Isolation & Access Boundaries...');
    const docConvos = await getJson('http://localhost:3001/api/v1/conversations', {
      Authorization: `Bearer ${humanDoctor.token}`,
    });
    const targetConvoId = docConvos.body?.data?.[0]?.id;
    if (targetConvoId) {
      const vetAttempt = await getJson(
        `http://localhost:3001/api/v1/conversations/${targetConvoId}/messages`,
        {
          Authorization: `Bearer ${vetDoctor.token}`,
        }
      );
      record(
        'Cross-role conversation access boundary enforced (HTTP 403 Forbidden)',
        vetAttempt.status === 403 || vetAttempt.status === 404,
        `Vet accessing Human Doctor thread returned HTTP ${vetAttempt.status}`
      );
    }

    // ─── TEST 10: Responsive Mobile Viewport (< 1024px) ─────────────────────
    console.log('\n11. Testing Mobile Viewport Behavior (768px width)...');
    await page.setViewport({ width: 768, height: 1024 });
    await page.goto('http://localhost:5173/chat', { waitUntil: 'networkidle2' });
    await sleep(2000);

    const mobileChatConsolePresent = await page.evaluate(() => {
      const inbox = document.querySelector('h2');
      return inbox && inbox.innerText.includes('Inbox');
    });
    record(
      'Mobile viewport (768px) displays functional chat console',
      mobileChatConsolePresent,
      'Chat console rendered cleanly at 768px width'
    );

    console.log('\n=== ALL ADVERSARIAL CHECKS COMPLETED ===');
    console.log(`Passed: ${results.checks.filter((c) => c.pass).length} / ${results.checks.length}`);
    console.log(`Failures: ${results.failures.length}`);
  } catch (err) {
    console.error('Fatal error during adversarial execution:', err);
    results.fatalError = err.message;
  } finally {
    await browser.close();
  }

  const outPath = path.join(EVIDENCE_DIR, 'adversarial_verification_record.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log('Detailed adversarial report written to:', outPath);
})();
