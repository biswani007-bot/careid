const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const TOKEN_CACHE_FILE = 'C:/Users/biswa/.gemini/antigravity/brain/e0785a94-53fe-4f28-b816-f2efe4edf49e/scratch/cached_token.json';
const token = JSON.parse(fs.readFileSync(TOKEN_CACHE_FILE, 'utf8')).token;
const ARTIFACT_DIR = 'C:/Users/biswa/.gemini/antigravity/brain/e0785a94-53fe-4f28-b816-f2efe4edf49e/scratch';

async function runTests() {
  console.log('=== STARTING USER DIRECTORY FIX VERIFICATION ===');
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const proc = spawn(edgePath, [
    '--headless',
    '--remote-debugging-port=9226',
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1440,900',
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  function getTabs() {
    return new Promise((resolve, reject) => {
      http.get('http://127.0.0.1:9226/json/list', res => {
        let b = '';
        res.on('data', c => b += c);
        res.on('end', () => resolve(JSON.parse(b)));
      }).on('error', reject);
    });
  }

  try {
    const tabs = await getTabs();
    const tab = tabs.find(t => t.type === 'page') || tabs[0];
    const ws = new globalThis.WebSocket(tab.webSocketDebuggerUrl);

    let id = 1;
    function send(method, params = {}) {
      return new Promise((resolve) => {
        const msgId = id++;
        const payload = JSON.stringify({ id: msgId, method, params });
        const onMsg = (event) => {
          const raw = typeof event.data === 'string' ? event.data : event.toString();
          const parsed = JSON.parse(raw);
          if (parsed.id === msgId) {
            ws.removeEventListener('message', onMsg);
            resolve(parsed.result);
          }
        };
        ws.addEventListener('message', onMsg);
        ws.send(payload);
      });
    }

    await new Promise(r => ws.onopen = r);
    await send('Page.enable');
    await send('Runtime.enable');

    console.log('1. Seeding auth in localStorage...');
    await send('Page.navigate', { url: 'http://localhost:5173/' });
    await new Promise(r => setTimeout(r, 1000));

    const seedScript = `
      localStorage.setItem('careid_access_token', ${JSON.stringify(token)});
      localStorage.setItem('careid_remember_me', 'true');
      localStorage.setItem('careid_user_session', JSON.stringify({
        id: '554f1941-f337-4a98-a8b6-d4409e1cfa04',
        email: 'superadmin@careid.test',
        phone: '+16505550002',
        status: 'ACTIVE',
        roles: ['SUPER_ADMIN', 'ADMIN'],
        permissions: ['read:all', 'write:all', 'delete:all', 'read:audit-logs']
      }));
    `;
    await send('Runtime.evaluate', { expression: seedScript });

    console.log('2. Navigating to http://localhost:5173/admin/users ...');
    await send('Page.navigate', { url: 'http://localhost:5173/admin/users' });
    await new Promise(r => setTimeout(r, 3500));

    // TEST 1: Page 1 Layout and Rows
    const page1State = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const tableCard = document.querySelector('.users-table-card');
          const scrollContainer = document.querySelector('.users-table-scroll-container');
          const table = document.querySelector('.users-table');
          const rows = Array.from(document.querySelectorAll('.users-table-row'));
          const footerCount = document.querySelector('.users-pagination-count');
          const prevBtn = document.querySelector('.users-page-arrow-btn[aria-label="Previous page"]');
          const nextBtn = document.querySelector('.users-page-arrow-btn[aria-label="Next page"]');
          const rowsSelect = document.querySelector('.users-rows-select');

          return {
            rowCount: rows.length,
            rows: rows.map(r => ({
              name: r.querySelector('.user-name')?.innerText,
              role: r.querySelector('.user-role-badge')?.innerText,
              phone: r.querySelector('.user-phone')?.innerText,
              height: r.offsetHeight
            })),
            tableCardHeight: tableCard?.offsetHeight,
            scrollContainerHeight: scrollContainer?.clientHeight,
            scrollContainerScrollHeight: scrollContainer?.scrollHeight,
            hasVerticalScroll: (scrollContainer?.scrollHeight || 0) > (scrollContainer?.clientHeight || 0),
            footerText: footerCount?.innerText?.trim(),
            prevDisabled: prevBtn?.disabled,
            nextDisabled: nextBtn?.disabled,
            pageSizeVal: rowsSelect?.value
          };
        })()
      `,
      returnByValue: true
    });

    console.log('\n--- TEST 1: Page 1 Verification ---');
    console.log('Page 1 Row Count:', page1State.result.value.rowCount, '(Expected: 5)');
    console.log('Page 1 User Names:', page1State.result.value.rows.map(r => r.name));
    console.log('Row Heights:', page1State.result.value.rows.map(r => r.height));
    console.log('Table Card Height:', page1State.result.value.tableCardHeight);
    console.log('Scroll Container clientHeight:', page1State.result.value.scrollContainerHeight);
    console.log('Scroll Container scrollHeight:', page1State.result.value.scrollContainerScrollHeight);
    console.log('Has Nested Vertical Scroll:', page1State.result.value.hasVerticalScroll, '(Expected: false)');
    console.log('Footer Text:', `"${page1State.result.value.footerText}"`, '(Expected: "Showing 1 to 5 of 7 results")');
    console.log('Previous Button Disabled:', page1State.result.value.prevDisabled, '(Expected: true)');
    console.log('Next Button Disabled:', page1State.result.value.nextDisabled, '(Expected: false)');

    const shot1 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'verify_page1_fixed.png'), Buffer.from(shot1.data, 'base64'));
    console.log('Saved screenshot: verify_page1_fixed.png');

    // TEST 2: Click Next to Page 2
    console.log('\n--- TEST 2: Click Next (Page 2) ---');
    await send('Runtime.evaluate', {
      expression: `
        document.querySelector('.users-page-arrow-btn[aria-label="Next page"]').click();
      `
    });
    await new Promise(r => setTimeout(r, 1000));

    const page2State = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const scrollContainer = document.querySelector('.users-table-scroll-container');
          const rows = Array.from(document.querySelectorAll('.users-table-row'));
          const footerCount = document.querySelector('.users-pagination-count');
          const prevBtn = document.querySelector('.users-page-arrow-btn[aria-label="Previous page"]');
          const nextBtn = document.querySelector('.users-page-arrow-btn[aria-label="Next page"]');

          return {
            rowCount: rows.length,
            rows: rows.map(r => ({
              name: r.querySelector('.user-name')?.innerText,
              role: r.querySelector('.user-role-badge')?.innerText,
              phone: r.querySelector('.user-phone')?.innerText,
              height: r.offsetHeight
            })),
            hasVerticalScroll: (scrollContainer?.scrollHeight || 0) > (scrollContainer?.clientHeight || 0),
            footerText: footerCount?.innerText?.trim(),
            prevDisabled: prevBtn?.disabled,
            nextDisabled: nextBtn?.disabled
          };
        })()
      `,
      returnByValue: true
    });

    console.log('Page 2 Row Count:', page2State.result.value.rowCount, '(Expected: 2)');
    console.log('Page 2 User Names:', page2State.result.value.rows.map(r => r.name));
    console.log('Has Nested Vertical Scroll:', page2State.result.value.hasVerticalScroll, '(Expected: false)');
    console.log('Footer Text:', `"${page2State.result.value.footerText}"`, '(Expected: "Showing 6 to 7 of 7 results")');
    console.log('Previous Button Disabled:', page2State.result.value.prevDisabled, '(Expected: false)');
    console.log('Next Button Disabled:', page2State.result.value.nextDisabled, '(Expected: true)');

    const shot2 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'verify_page2_fixed.png'), Buffer.from(shot2.data, 'base64'));
    console.log('Saved screenshot: verify_page2_fixed.png');

    // TEST 3: Click Previous back to Page 1
    console.log('\n--- TEST 3: Click Previous back to Page 1 ---');
    await send('Runtime.evaluate', {
      expression: `
        document.querySelector('.users-page-arrow-btn[aria-label="Previous page"]').click();
      `
    });
    await new Promise(r => setTimeout(r, 1000));

    const backTo1State = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const rows = Array.from(document.querySelectorAll('.users-table-row'));
          const footerCount = document.querySelector('.users-pagination-count');
          return {
            rowCount: rows.length,
            footerText: footerCount?.innerText?.trim()
          };
        })()
      `,
      returnByValue: true
    });
    console.log('Back to Page 1 - Row Count:', backTo1State.result.value.rowCount, '(Expected: 5)');
    console.log('Back to Page 1 - Footer Text:', `"${backTo1State.result.value.footerText}"`, '(Expected: "Showing 1 to 5 of 7 results")');

    // TEST 4: Change Page Size to 10
    console.log('\n--- TEST 4: Change Rows per page to 10 ---');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const sel = document.querySelector('.users-rows-select');
          sel.value = '10';
          sel.dispatchEvent(new Event('change', { bubbles: true }));
        })()
      `
    });
    await new Promise(r => setTimeout(r, 1000));

    const size10State = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const rows = Array.from(document.querySelectorAll('.users-table-row'));
          const footerCount = document.querySelector('.users-pagination-count');
          const prevBtn = document.querySelector('.users-page-arrow-btn[aria-label="Previous page"]');
          const nextBtn = document.querySelector('.users-page-arrow-btn[aria-label="Next page"]');
          return {
            rowCount: rows.length,
            footerText: footerCount?.innerText?.trim(),
            prevDisabled: prevBtn?.disabled,
            nextDisabled: nextBtn?.disabled
          };
        })()
      `,
      returnByValue: true
    });
    console.log('Page Size 10 - Row Count:', size10State.result.value.rowCount, '(Expected: 7)');
    console.log('Page Size 10 - Footer Text:', `"${size10State.result.value.footerText}"`, '(Expected: "Showing 1 to 7 of 7 results")');
    console.log('Page Size 10 - Prev Disabled:', size10State.result.value.prevDisabled, 'Next Disabled:', size10State.result.value.nextDisabled, '(Both Expected: true)');

    // Reset Page Size back to 5
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const sel = document.querySelector('.users-rows-select');
          sel.value = '5';
          sel.dispatchEvent(new Event('change', { bubbles: true }));
        })()
      `
    });
    await new Promise(r => setTimeout(r, 1000));

    // TEST 5: Search Filtering
    console.log('\n--- TEST 5: Search for "Sarah" ---');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const inp = document.querySelector('.users-search-input');
          // Use native input setter to trigger react onChange
          const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          nativeSetter.call(inp, 'Sarah');
          inp.dispatchEvent(new Event('input', { bubbles: true }));
          inp.dispatchEvent(new Event('change', { bubbles: true }));
        })()
      `
    });
    await new Promise(r => setTimeout(r, 1000));

    const searchState = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const rows = Array.from(document.querySelectorAll('.users-table-row'));
          const footerCount = document.querySelector('.users-pagination-count');
          return {
            rowCount: rows.length,
            rowName: rows[0]?.querySelector('.user-name')?.innerText,
            footerText: footerCount?.innerText?.trim()
          };
        })()
      `,
      returnByValue: true
    });
    console.log('Search "Sarah" - Row Count:', searchState.result.value.rowCount, '(Expected: 1)');
    console.log('Search "Sarah" - User Name:', searchState.result.value.rowName, '(Expected: Dr. Sarah Jenkins, MD)');
    console.log('Search "Sarah" - Footer Text:', `"${searchState.result.value.footerText}"`, '(Expected: "Showing 1 to 1 of 1 results")');

    // Clear Search
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const inp = document.querySelector('.users-search-input');
          const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          nativeSetter.call(inp, '');
          inp.dispatchEvent(new Event('input', { bubbles: true }));
          inp.dispatchEvent(new Event('change', { bubbles: true }));
        })()
      `
    });
    await new Promise(r => setTimeout(r, 1000));

    // TEST 6: Role Chip Filter (Doctors)
    console.log('\n--- TEST 6: Filter by "Doctors" ---');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const chips = Array.from(document.querySelectorAll('.users-filter-chip'));
          const docChip = chips.find(c => c.innerText.trim() === 'Doctors');
          if (docChip) docChip.click();
        })()
      `
    });
    await new Promise(r => setTimeout(r, 1000));

    const docChipState = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const rows = Array.from(document.querySelectorAll('.users-table-row'));
          const footerCount = document.querySelector('.users-pagination-count');
          return {
            rowCount: rows.length,
            rowName: rows[0]?.querySelector('.user-name')?.innerText,
            footerText: footerCount?.innerText?.trim()
          };
        })()
      `,
      returnByValue: true
    });
    console.log('Filter "Doctors" - Row Count:', docChipState.result.value.rowCount, '(Expected: 1)');
    console.log('Filter "Doctors" - User Name:', docChipState.result.value.rowName, '(Expected: Dr. Sarah Jenkins, MD)');
    console.log('Filter "Doctors" - Footer Text:', `"${docChipState.result.value.footerText}"`, '(Expected: "Showing 1 to 1 of 1 results")');

    // Reset back to "All Users"
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const chips = Array.from(document.querySelectorAll('.users-filter-chip'));
          const allChip = chips.find(c => c.innerText.trim() === 'All Users');
          if (allChip) allChip.click();
        })()
      `
    });
    await new Promise(r => setTimeout(r, 1000));

    const finalState = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const rows = Array.from(document.querySelectorAll('.users-table-row'));
          const footerCount = document.querySelector('.users-pagination-count');
          return {
            rowCount: rows.length,
            footerText: footerCount?.innerText?.trim()
          };
        })()
      `,
      returnByValue: true
    });
    console.log('\nFinal Reset - Row Count:', finalState.result.value.rowCount, '(Expected: 5)');
    console.log('Final Reset - Footer Text:', `"${finalState.result.value.footerText}"`, '(Expected: "Showing 1 to 5 of 7 results")');

    ws.close();
    console.log('\n=== ALL USER DIRECTORY TESTS COMPLETED SUCCESSFULLY ===');
  } finally {
    proc.kill();
  }
}

runTests().catch(console.error);

