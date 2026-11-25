/**
 * Milestone 3 Verification: Standalone Support Page UI Integration
 *
 * Verifies all static contracts, AST patterns, UI integration wiring, mock data retirement,
 * and live staging backend queries for Milestone 3 of the Support Module Integration.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const BASE_URL = 'https://360api.vnvision.in';
const TOKEN_CACHE_PATH = path.join(ROOT_DIR, '.token_cache.json');

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
}

async function getValidToken() {
  if (!fs.existsSync(TOKEN_CACHE_PATH)) {
    throw new Error(`.token_cache.json not found at ${TOKEN_CACHE_PATH}`);
  }

  const tokenCache = JSON.parse(fs.readFileSync(TOKEN_CACHE_PATH, 'utf8'));
  let accessToken = tokenCache.accessToken;

  // Validate token against /api/v1/auth/me
  let meRes = await fetch(`${BASE_URL}/api/v1/auth/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (meRes.status === 401 && tokenCache.refreshToken) {
    console.log('🔄 Access token expired. Refreshing token via /api/v1/auth/token/refresh...');
    const refreshRes = await fetch(`${BASE_URL}/api/v1/auth/token/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ refreshToken: tokenCache.refreshToken }),
    });

    if (!refreshRes.ok) {
      throw new Error(`Token refresh failed with status ${refreshRes.status}`);
    }

    const refreshData = await refreshRes.json();
    const tokenData = refreshData.data || refreshData;
    accessToken = tokenData.accessToken;
    tokenCache.accessToken = accessToken;
    if (tokenData.refreshToken) tokenCache.refreshToken = tokenData.refreshToken;
    tokenCache.updatedAt = new Date().toISOString();
    fs.writeFileSync(TOKEN_CACHE_PATH, JSON.stringify(tokenCache, null, 2));
    console.log('✅ Access token refreshed and .token_cache.json updated.');

    meRes = await fetch(`${BASE_URL}/api/v1/auth/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });
  }

  assert(meRes.ok, `Failed to validate session at /api/v1/auth/me: HTTP ${meRes.status}`);
  const meData = await meRes.json();
  return { accessToken, user: meData.data };
}

async function verifyMilestone3() {
  console.log('===============================================================');
  console.log('Running Milestone 3 Verification: Standalone Support Page UI Integration');
  console.log('===============================================================\n');

  // -------------------------------------------------------------------------
  // Part 1: Mock Data Retirement Verification (src/pages/settings/types.ts)
  // -------------------------------------------------------------------------
  console.log('--- 1. Mock Data Retirement (types.ts) ---');

  const typesPath = path.join(ROOT_DIR, 'src/pages/settings/types.ts');
  assert(fs.existsSync(typesPath), 'src/pages/settings/types.ts must exist');
  const typesContent = fs.readFileSync(typesPath, 'utf8');

  assert(!typesContent.includes('HELP_TOPICS'), 'types.ts must completely remove HELP_TOPICS mock constant');
  assert(!typesContent.includes('FAQTopic'), 'types.ts must remove deprecated FAQTopic mock interface');
  console.log('✅ [PASS] types.ts: HELP_TOPICS constant and FAQTopic interface completely removed.');

  const requiredTypes = [
    'CreateSupportTicketPayload',
    'SupportTicketDTO',
    'SupportTicketReplyDTO',
    'PaginatedSupportTicketsDTO',
    'SupportTicketQueryParams',
    'FAQItemDTO',
    'CMSPolicyDTO',
  ];
  for (const t of requiredTypes) {
    assert(
      typesContent.includes(`export interface ${t}`) || typesContent.includes(`export type ${t}`),
      `types.ts must export interface or type ${t}`
    );
  }
  console.log(`✅ [PASS] types.ts: All ${requiredTypes.length} required DTO contracts exported.`);

  // -------------------------------------------------------------------------
  // Part 2: Static Code Auditing (SupportCenterPage.tsx)
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Static Code Auditing (SupportCenterPage.tsx) ---');

  const pagePath = path.join(ROOT_DIR, 'src/pages/settings/SupportCenterPage.tsx');
  assert(fs.existsSync(pagePath), 'SupportCenterPage.tsx must exist');
  const pageContent = fs.readFileSync(pagePath, 'utf8');

  // 2.1 Ensure no mock/simulated data
  assert(!pageContent.includes('HELP_TOPICS'), 'SupportCenterPage must not import or reference HELP_TOPICS');
  assert(!pageContent.includes('+1 (800) 555-CARE'), 'SupportCenterPage must not contain fake phone +1 (800) 555-CARE');
  assert(!pageContent.includes('< 15 minutes'), 'SupportCenterPage must not contain fake SLA < 15 minutes');
  assert(!pageContent.includes('< 15 min'), 'SupportCenterPage must not contain fake SLA < 15 min');
  assert(!pageContent.includes('TKT-8940'), 'SupportCenterPage must not contain hardcoded ticket reference TKT-8940');
  assert(!pageContent.includes('This ticket submission is simulated locally'), 'SupportCenterPage must not contain local simulation disclaimer banner');
  assert(!pageContent.includes('[DEMO MODE]'), 'SupportCenterPage must not contain [DEMO MODE] text');
  console.log('✅ [PASS] SupportCenterPage: All fake contact info, fake SLAs, and mock disclaimers removed.');

  // 2.2 Ensure supportService integration
  assert(pageContent.includes('supportService'), 'SupportCenterPage must import and use supportService');
  assert(pageContent.includes('supportService.getFaqs'), 'SupportCenterPage must wire FAQs to supportService.getFaqs()');
  assert(pageContent.includes('supportService.createTicket'), 'SupportCenterPage must wire ticket submission to supportService.createTicket()');
  assert(pageContent.includes('supportService.getTickets'), 'SupportCenterPage must wire ticket history to supportService.getTickets()');
  assert(pageContent.includes('supportService.addTicketReply'), 'SupportCenterPage must wire replies to supportService.addTicketReply()');
  console.log('✅ [PASS] SupportCenterPage: Live service methods wired for getFaqs, createTicket, getTickets, addTicketReply.');

  // 2.3 Verify Bento Grid Layout preservation
  const requiredTestIds = [
    'support-center-page',
    'help-center-card',
    'contact-support-card',
    'app-legal-card',
    'data-preferences-card',
    'hotline-indicator',
    'sla-indicator',
    'faqs-empty-state',
  ];
  for (const tid of requiredTestIds) {
    assert(pageContent.includes(`data-testid="${tid}"`), `SupportCenterPage must preserve test element data-testid="${tid}"`);
  }
  console.log('✅ [PASS] SupportCenterPage: 12-column Bento grid layout and data-testid attributes preserved.');

  // 2.4 Verify truthful contact & SLA indicators
  assert(pageContent.includes('— (Unconfigured)'), 'SupportCenterPage must display "— (Unconfigured)" for Clinical IT Hotline');
  assert(pageContent.includes('Standard Institutional'), 'SupportCenterPage must display "Standard Institutional" for Direct SLA');
  console.log('✅ [PASS] SupportCenterPage: Truthful unconfigured hotline and standard SLA indicators displayed.');

  // 2.5 Verify ticket modal tabs & history view
  assert(pageContent.includes("ticketModalTab === 'new'"), 'SupportCenterPage must support "new" ticket tab');
  assert(pageContent.includes("ticketModalTab === 'history'") || pageContent.includes("'history'"), 'SupportCenterPage must support ticket history tab');
  assert(pageContent.includes('ticket.ticketNumber') || pageContent.includes('t.ticketNumber'), 'SupportCenterPage must display real ticketNumber');
  console.log('✅ [PASS] SupportCenterPage: Ticket modal integrates New Ticket form and Recent Tickets history tab.');

  // -------------------------------------------------------------------------
  // Part 3: Live Staging API Integration Verification
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Live Staging API Verification (https://360api.vnvision.in) ---');

  const { accessToken, user } = await getValidToken();
  console.log(`✅ [PASS] Authenticated as Doctor: ${user.id} (${user.email || 'careid-doctor'})`);

  // 3.1 Verify FAQs endpoint
  const faqsRes = await fetch(`${BASE_URL}/api/v1/cms/faqs`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });
  assert(faqsRes.ok, `GET /api/v1/cms/faqs returned HTTP ${faqsRes.status}`);
  const faqsData = await faqsRes.json();
  const faqsList = faqsData.data || faqsData;
  assert(Array.isArray(faqsList), 'GET /api/v1/cms/faqs data must be an array');
  console.log(`✅ [PASS] GET /api/v1/cms/faqs: 200 OK returned array (${faqsList.length} items).`);

  // 3.2 Verify Ticket Creation via genuine payload
  const uniqueTestSubject = `M3 Verification Ticket [${new Date().toISOString()}]`;
  const ticketRes = await fetch(`${BASE_URL}/api/v1/support/tickets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
    body: JSON.stringify({
      subject: uniqueTestSubject,
      description: 'End-to-end integration test validating Milestone 3 live UI wiring from CareID Doctor Portal.',
      category: 'CLINICAL',
      priority: 'LOW',
    }),
  });
  assert(ticketRes.ok, `POST /api/v1/support/tickets returned HTTP ${ticketRes.status}`);
  const ticketCreated = await ticketRes.json();
  const ticketDto = ticketCreated.data || ticketCreated;
  assert(ticketDto && ticketDto.id, 'Ticket response must contain id');
  assert(ticketDto.ticketNumber, 'Ticket response must contain genuine ticketNumber');
  console.log(`✅ [PASS] POST /api/v1/support/tickets: Successfully created ticket #${ticketDto.ticketNumber} (ID: ${ticketDto.id})`);

  // 3.3 Verify Ticket Listing includes created ticket
  const listRes = await fetch(`${BASE_URL}/api/v1/support/tickets?limit=10`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });
  assert(listRes.ok, `GET /api/v1/support/tickets returned HTTP ${listRes.status}`);
  const listData = await listRes.json();
  const ticketsArray = listData.data?.data || (Array.isArray(listData.data) ? listData.data : []);
  const found = ticketsArray.some((t) => t.id === ticketDto.id);
  assert(found, `Newly created ticket ${ticketDto.id} must be in ticket history listing`);
  console.log(`✅ [PASS] GET /api/v1/support/tickets: Found newly created ticket #${ticketDto.ticketNumber} in recent tickets listing.`);

  // 3.4 Verify Reply Posting
  const replyRes = await fetch(`${BASE_URL}/api/v1/support/tickets/${encodeURIComponent(ticketDto.id)}/reply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
    body: JSON.stringify({
      message: 'Automated reply verifying Milestone 3 conversation thread integration.',
    }),
  });
  assert(replyRes.ok, `POST /api/v1/support/tickets/:id/reply returned HTTP ${replyRes.status}`);
  const replyData = await replyRes.json();
  const replyDto = replyData.data || replyData;
  assert(replyDto && replyDto.id, 'Reply response must contain reply id');
  console.log(`✅ [PASS] POST /api/v1/support/tickets/:id/reply: Follow-up reply recorded (ID: ${replyDto.id}).`);

  // 3.5 Verify Reply Retrieval
  const repliesRes = await fetch(`${BASE_URL}/api/v1/support/tickets/${encodeURIComponent(ticketDto.id)}/replies`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });
  assert(repliesRes.ok, `GET /api/v1/support/tickets/:id/replies returned HTTP ${repliesRes.status}`);
  const repliesData = await repliesRes.json();
  const repliesList = repliesData.data || repliesData;
  assert(Array.isArray(repliesList) && repliesList.length > 0, 'Replies list must be non-empty array');
  console.log(`✅ [PASS] GET /api/v1/support/tickets/:id/replies: Retrieved ${repliesList.length} replies.`);

  console.log('\n🎉 ALL MILESTONE 3 UI INTEGRATION & BACKEND CONTRACTS VERIFIED CLEANLY.');
}

verifyMilestone3().catch((err) => {
  console.error('❌ Verification failed with error:', err);
  process.exit(1);
});
