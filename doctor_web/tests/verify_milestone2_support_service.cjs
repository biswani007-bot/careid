/**
 * Milestone 2 Verification: Support API Service & TypeScript DTOs
 *
 * Verifies static contracts in src/pages/settings/types.ts and src/services/supportService.ts,
 * and executes genuine HTTP queries against the live staging backend (https://360api.vnvision.in).
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

async function verifyMilestone2() {
  console.log('===============================================================');
  console.log('Running Milestone 2 Verification: Support Service & DTOs');
  console.log('===============================================================\n');

  // -------------------------------------------------------------------------
  // Part 1: Static Contract Verification
  // -------------------------------------------------------------------------
  console.log('--- 1. Static Contract & DTO Auditing ---');

  const typesPath = path.join(ROOT_DIR, 'src/pages/settings/types.ts');
  const typesContent = fs.readFileSync(typesPath, 'utf8');

  const requiredTypes = [
    'CreateSupportTicketPayload',
    'SupportTicketReplyDTO',
    'SupportTicketDTO',
    'PaginatedSupportTicketsDTO',
    'SupportTicketQueryParams',
    'FAQItemDTO',
    'CMSPolicyDTO',
    'CMSPageDTO',
    'CMSBlockDTO',
  ];

  for (const typeName of requiredTypes) {
    assert(
      typesContent.includes(`export interface ${typeName}`) || typesContent.includes(`export type ${typeName}`),
      `src/pages/settings/types.ts must export ${typeName}`
    );
  }
  console.log(`✅ [PASS] types.ts exports all ${requiredTypes.length} required Postman DTO interfaces.`);

  // Verify HELP_TOPICS deprecation or complete retirement
  if (typesContent.includes('HELP_TOPICS')) {
    assert(
      typesContent.includes('@deprecated'),
      'src/pages/settings/types.ts must mark HELP_TOPICS as @deprecated'
    );
    console.log('✅ [PASS] types.ts marks HELP_TOPICS as @deprecated for M3 UI migration.');
  } else {
    console.log('✅ [PASS] types.ts: HELP_TOPICS mock constant retired and removed in Milestone 3.');
  }

  const servicePath = path.join(ROOT_DIR, 'src/services/supportService.ts');
  assert(fs.existsSync(servicePath), 'src/services/supportService.ts must exist');
  const serviceContent = fs.readFileSync(servicePath, 'utf8');

  const requiredServiceFunctions = [
    'createTicket',
    'getTickets',
    'getTicketById',
    'addTicketReply',
    'getTicketReplies',
    'getFaqs',
    'searchCmsPages',
    'getCmsPages',
    'getCmsBlocks',
  ];

  for (const fnName of requiredServiceFunctions) {
    assert(
      serviceContent.includes(`export async function ${fnName}`) ||
      serviceContent.includes(`export const ${fnName}`),
      `src/services/supportService.ts must export function ${fnName}`
    );
  }
  assert(
    serviceContent.includes('export const supportService = {'),
    'src/services/supportService.ts must export supportService object'
  );
  console.log(`✅ [PASS] supportService.ts exports all ${requiredServiceFunctions.length} service methods.`);

  // -------------------------------------------------------------------------
  // Part 2: Live Staging API Contract Verification
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Live Staging API Verification (https://360api.vnvision.in) ---');

  const { accessToken, user } = await getValidToken();
  console.log(`✅ [PASS] Authenticated as Doctor: ${user.email || user.id} (Role: ${user.role || 'DOCTOR'})`);

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  // Test 2.1: Empty POST /api/v1/support/tickets validation rejection
  const emptyTicketRes = await fetch(`${BASE_URL}/api/v1/support/tickets`, {
    method: 'POST',
    headers,
    body: JSON.stringify({}),
  });
  assert(emptyTicketRes.status === 400, `POST /support/tickets with empty body must return 400, got ${emptyTicketRes.status}`);
  const emptyTicketJson = await emptyTicketRes.json();
  assert(
    Array.isArray(emptyTicketJson.message) &&
    emptyTicketJson.message.some(m => m.includes('subject')) &&
    emptyTicketJson.message.some(m => m.includes('description')),
    'POST /support/tickets must return validation errors for subject and description'
  );
  console.log('✅ [PASS] POST /api/v1/support/tickets: Correctly rejected empty payload with 400 Bad Request.');

  // Test 2.2: Genuine Ticket Creation
  const newTicketPayload = {
    subject: `Automated M2 Verification Ticket [${new Date().toISOString()}]`,
    description: 'Genuine test ticket generated by Milestone 2 automated verification suite.',
    category: 'TECHNICAL',
    priority: 'MEDIUM',
  };

  const createRes = await fetch(`${BASE_URL}/api/v1/support/tickets`, {
    method: 'POST',
    headers,
    body: JSON.stringify(newTicketPayload),
  });
  assert(createRes.status === 201, `POST /support/tickets must return 201 Created, got ${createRes.status}`);
  const createJson = await createRes.json();
  const createdTicket = createJson.data;

  assert(createdTicket && createdTicket.id, 'Created ticket must contain an id');
  assert(createdTicket.ticketNumber && createdTicket.ticketNumber.startsWith('TKT-'), 'Ticket number must start with TKT-');
  assert(createdTicket.userId === user.id, `Ticket userId (${createdTicket.userId}) must match authenticated doctor (${user.id})`);
  assert(createdTicket.status === 'OPEN', 'Newly created ticket status must be OPEN');
  console.log(`✅ [PASS] POST /api/v1/support/tickets: Ticket created with ID: ${createdTicket.id}, Number: ${createdTicket.ticketNumber}`);

  const ticketId = createdTicket.id;

  // Test 2.3: Retrieve Ticket Details by ID
  const getTicketRes = await fetch(`${BASE_URL}/api/v1/support/tickets/${ticketId}`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
  });
  assert(getTicketRes.status === 200, `GET /support/tickets/:id must return 200, got ${getTicketRes.status}`);
  const getTicketJson = await getTicketRes.json();
  assert(getTicketJson.data.id === ticketId, 'Fetched ticket id must match created ticket id');
  assert(getTicketJson.data.subject === newTicketPayload.subject, 'Fetched ticket subject must match');
  console.log(`✅ [PASS] GET /api/v1/support/tickets/:id: Successfully fetched ticket ${ticketId}`);

  // Test 2.4: Paginated Ticket Listing with Query Params
  const listRes = await fetch(`${BASE_URL}/api/v1/support/tickets?page=1&limit=5`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
  });
  assert(listRes.status === 200, `GET /support/tickets must return 200, got ${listRes.status}`);
  const listJson = await listRes.json();
  assert(listJson.data && Array.isArray(listJson.data.data), 'Paginated response must contain data array');
  assert(typeof listJson.data.total === 'number', 'Paginated response must contain total count');
  assert(listJson.data.page === 1, 'Paginated response page must be 1');
  assert(listJson.data.limit === 5, 'Paginated response limit must be 5');
  console.log(`✅ [PASS] GET /api/v1/support/tickets: Paginated listing retrieved (${listJson.data.total} total tickets).`);

  // Test 2.5: Add Message Reply to Ticket
  const replyMessage = `Doctor confirmation reply at ${new Date().toISOString()}`;
  const replyRes = await fetch(`${BASE_URL}/api/v1/support/tickets/${ticketId}/reply`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ message: replyMessage }),
  });
  assert(replyRes.status === 201, `POST /support/tickets/:id/reply must return 201, got ${replyRes.status}`);
  const replyJson = await replyRes.json();
  assert(replyJson.data && replyJson.data.id, 'Reply object must contain id');
  assert(replyJson.data.ticketId === ticketId, 'Reply ticketId must match');
  assert(replyJson.data.message === replyMessage, 'Reply message must match');
  console.log(`✅ [PASS] POST /api/v1/support/tickets/:id/reply: Added reply ${replyJson.data.id} to ticket.`);

  // Test 2.6: Retrieve Ticket Replies
  const getRepliesRes = await fetch(`${BASE_URL}/api/v1/support/tickets/${ticketId}/replies`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
  });
  assert(getRepliesRes.status === 200, `GET /support/tickets/:id/replies must return 200, got ${getRepliesRes.status}`);
  const getRepliesJson = await getRepliesRes.json();
  assert(Array.isArray(getRepliesJson.data), 'Replies response data must be an array');
  assert(getRepliesJson.data.some(r => r.message === replyMessage), 'Replies list must contain the posted reply');
  console.log(`✅ [PASS] GET /api/v1/support/tickets/:id/replies: Successfully retrieved replies array (${getRepliesJson.data.length} items).`);

  // Test 2.7: CMS FAQs
  const faqsRes = await fetch(`${BASE_URL}/api/v1/cms/faqs`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
  });
  assert(faqsRes.status === 200, `GET /cms/faqs must return 200, got ${faqsRes.status}`);
  const faqsJson = await faqsRes.json();
  assert(Array.isArray(faqsJson.data), 'GET /cms/faqs must return an array in data');
  console.log(`✅ [PASS] GET /api/v1/cms/faqs: Returned 200 OK with array (${faqsJson.data.length} FAQs published).`);

  // Test 2.8: CMS Pages
  const pagesRes = await fetch(`${BASE_URL}/api/v1/cms/pages`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
  });
  assert(pagesRes.status === 200, `GET /cms/pages must return 200, got ${pagesRes.status}`);
  const pagesJson = await pagesRes.json();
  assert(Array.isArray(pagesJson.data), 'GET /cms/pages must return an array in data');
  console.log(`✅ [PASS] GET /api/v1/cms/pages: Returned 200 OK with array (${pagesJson.data.length} pages).`);

  // Test 2.9: CMS Page Search
  const searchRes = await fetch(`${BASE_URL}/api/v1/cms/pages/search?q=terms`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
  });
  assert(searchRes.status === 200, `GET /cms/pages/search must return 200, got ${searchRes.status}`);
  const searchJson = await searchRes.json();
  assert(Array.isArray(searchJson.data), 'GET /cms/pages/search must return an array in data');
  console.log(`✅ [PASS] GET /api/v1/cms/pages/search: Returned 200 OK with array.`);

  console.log('\n🎉 ALL MILESTONE 2 SUPPORT SERVICE & DTO CONTRACTS VERIFIED SUCCESSFULLY ON LIVE STAGING.');
}

verifyMilestone2().catch((err) => {
  console.error('❌ Verification failed with error:', err);
  process.exit(1);
});
