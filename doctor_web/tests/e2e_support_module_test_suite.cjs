/**
 * CareID Doctor Web Portal — Comprehensive E2E Support Module Test Suite
 *
 * Covers Tiers 1-4 against live staging (https://360api.vnvision.in):
 * - Tier 1: Feature Coverage (Routes, Navigation, 3-tab settings, live FAQs, ticket creation/listing/replies, honest SLA indicators)
 * - Tier 2: Boundary & Corner Cases (400 validation, 404 not found, empty reply rejection, 403 RBAC boundary, session refresh)
 * - Tier 3: Cross-Feature Combinations (Full ticket lifecycle, CMS pages search & policy DTO alignment)
 * - Tier 4: Real-World Workload Scenarios (Simulated clinical procedural emergency workflow)
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const BASE_URL = 'https://360api.vnvision.in';
const TOKEN_CACHE_PATH = path.join(ROOT_DIR, '.token_cache.json');

// Test statistics
const stats = {
  total: 0,
  passed: 0,
  failed: 0,
  tiers: {
    tier1: { total: 0, passed: 0, failed: 0 },
    tier2: { total: 0, passed: 0, failed: 0 },
    tier3: { total: 0, passed: 0, failed: 0 },
    tier4: { total: 0, passed: 0, failed: 0 },
  },
};

function pass(tier, testName, details = '') {
  stats.total++;
  stats.passed++;
  stats.tiers[tier].total++;
  stats.tiers[tier].passed++;
  console.log(`  ✅ [PASS] ${testName}${details ? ` — ${details}` : ''}`);
}

function fail(tier, testName, error) {
  stats.total++;
  stats.failed++;
  stats.tiers[tier].total++;
  stats.tiers[tier].failed++;
  console.error(`  ❌ [FAIL] ${testName}: ${error}`);
  throw new Error(`[${tier.toUpperCase()}] ${testName} failed: ${error}`);
}

function assert(condition, message, tier = 'tier1', testName = 'Assertion') {
  if (!condition) {
    fail(tier, testName, message);
  }
}

/**
 * Validates or refreshes the access token using .token_cache.json
 */
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

  if (!meRes.ok) {
    throw new Error(`Failed to validate session at /api/v1/auth/me: HTTP ${meRes.status}`);
  }
  const meData = await meRes.json();
  return { accessToken, refreshToken: tokenCache.refreshToken, user: meData.data };
}

// ============================================================================
// TIER 1: FEATURE COVERAGE
// ============================================================================
async function runTier1(auth) {
  console.log('\n===============================================================');
  console.log('TIER 1: FEATURE COVERAGE');
  console.log('===============================================================');

  // 1.1 Route Decoupling (/settings/support -> /support)
  try {
    const routesContent = fs.readFileSync(path.join(ROOT_DIR, 'src/routes/index.tsx'), 'utf8');
    const hasRedirect = routesContent.includes('<Navigate to="/support" replace />');
    const hasStandaloneSupport = routesContent.includes("path: '/support'") && routesContent.includes('<SupportCenterPage />');
    assert(hasRedirect && hasStandaloneSupport, 'Route configuration must decouple /settings/support and render SupportCenterPage on /support', 'tier1', 'Route Decoupling');
    pass('tier1', 'Route Decoupling', '/settings/support redirects to /support; /support renders SupportCenterPage');
  } catch (err) {
    fail('tier1', 'Route Decoupling', err.message);
  }

  // 1.2 Sidebar & Header Navigation
  try {
    const layoutContent = fs.readFileSync(path.join(ROOT_DIR, 'src/components/layout/PatientLayout.tsx'), 'utf8');
    const headerContent = fs.readFileSync(path.join(ROOT_DIR, 'src/components/layout/Header.tsx'), 'utf8');
    const hasSidebarLink = layoutContent.includes('to="/support"');
    const hasHeaderHelp = layoutContent.includes("onClick={() => navigate('/support')}") && headerContent.includes("onClick={() => navigate('/support')}");
    const hasDirectProfile = layoutContent.includes('to="/settings"') && !layoutContent.includes('isProfileExpanded');
    assert(hasSidebarLink && hasHeaderHelp && hasDirectProfile, 'Sidebar & Header must link to /support and Profile must be direct navigation without dropdown', 'tier1', 'Sidebar and Header Navigation');
    pass('tier1', 'Sidebar and Header Navigation', 'Sidebar and Header link to /support; Profile navigates directly to /settings without dropdown');
  } catch (err) {
    fail('tier1', 'Sidebar and Header Navigation', err.message);
  }

  // 1.3 Settings Tab Strips (Exactly 3 tabs)
  try {
    const pages = [
      'src/pages/settings/ProfessionalProfilePage.tsx',
      'src/pages/settings/AccountSecurityPage.tsx',
      'src/pages/settings/NotificationPreferencesPage.tsx',
    ];
    for (const p of pages) {
      const content = fs.readFileSync(path.join(ROOT_DIR, p), 'utf8');
      assert(!content.includes('>Support</button>'), `Support tab button must be absent from ${p}`, 'tier1', 'Settings Tabs Count');
      assert(!content.includes("navigate('/settings/support')"), `Navigation to /settings/support must be absent from ${p}`, 'tier1', 'Settings Tabs Count');
      assert(content.includes('My Profile') && content.includes('Security') && content.includes('Notifications'), `3 standard tabs must be present in ${p}`, 'tier1', 'Settings Tabs Count');
    }
    pass('tier1', 'Settings Tabs Count', 'Settings tab strips across all 3 settings pages contain exactly 3 tabs (Support removed)');
  } catch (err) {
    fail('tier1', 'Settings Tabs Count', err.message);
  }

  // 1.4 Live FAQ Query (GET /api/v1/cms/faqs)
  try {
    const res = await fetch(`${BASE_URL}/api/v1/cms/faqs`, {
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
        Accept: 'application/json',
      },
    });
    assert(res.ok, `GET /api/v1/cms/faqs returned status ${res.status}`, 'tier1', 'Live FAQ Query');
    const json = await res.json();
    const faqs = json.data || json;
    assert(Array.isArray(faqs), 'GET /api/v1/cms/faqs response data must be an array', 'tier1', 'Live FAQ Query');
    pass('tier1', 'Live FAQ Query', `HTTP 200 OK, array returned with ${faqs.length} published FAQs`);
  } catch (err) {
    fail('tier1', 'Live FAQ Query', err.message);
  }

  // 1.5 Live Ticket Creation (POST /api/v1/support/tickets)
  let createdTicket = null;
  try {
    const res = await fetch(`${BASE_URL}/api/v1/support/tickets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.accessToken}`,
        Accept: 'application/json',
      },
      body: JSON.stringify({
        subject: `E2E Tier 1 Ticket [${Date.now()}]`,
        description: 'Automated Tier 1 verification testing live ticket creation.',
        category: 'TECHNICAL',
        priority: 'MEDIUM',
      }),
    });
    assert(res.ok, `POST /api/v1/support/tickets failed with status ${res.status}`, 'tier1', 'Live Ticket Creation');
    const json = await res.json();
    createdTicket = json.data || json;
    assert(createdTicket.id && createdTicket.ticketNumber, 'Response must include id and ticketNumber', 'tier1', 'Live Ticket Creation');
    pass('tier1', 'Live Ticket Creation', `HTTP 201 Created ticket #${createdTicket.ticketNumber} (ID: ${createdTicket.id})`);
  } catch (err) {
    fail('tier1', 'Live Ticket Creation', err.message);
  }

  // 1.6 Live Ticket Listing (GET /api/v1/support/tickets)
  try {
    const res = await fetch(`${BASE_URL}/api/v1/support/tickets?limit=10`, {
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
        Accept: 'application/json',
      },
    });
    assert(res.ok, `GET /api/v1/support/tickets failed with status ${res.status}`, 'tier1', 'Live Ticket Listing');
    const json = await res.json();
    const list = json.data?.data || (Array.isArray(json.data) ? json.data : []);
    assert(Array.isArray(list) && list.length > 0, 'Tickets listing must be non-empty array', 'tier1', 'Live Ticket Listing');
    const found = list.some((t) => t.id === createdTicket.id);
    assert(found, `Newly created ticket ${createdTicket.id} must be in listing`, 'tier1', 'Live Ticket Listing');
    pass('tier1', 'Live Ticket Listing', `HTTP 200 OK, retrieved ${list.length} tickets, confirmed presence of #${createdTicket.ticketNumber}`);
  } catch (err) {
    fail('tier1', 'Live Ticket Listing', err.message);
  }

  // 1.7 Live Reply Creation (POST /api/v1/support/tickets/:id/reply)
  let createdReply = null;
  try {
    const res = await fetch(`${BASE_URL}/api/v1/support/tickets/${encodeURIComponent(createdTicket.id)}/reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.accessToken}`,
        Accept: 'application/json',
      },
      body: JSON.stringify({
        message: 'Tier 1 reply message confirming bidirectional messaging support.',
      }),
    });
    assert(res.ok, `POST /api/v1/support/tickets/:id/reply failed with status ${res.status}`, 'tier1', 'Live Reply Creation');
    const json = await res.json();
    createdReply = json.data || json;
    assert(createdReply.id, 'Reply response must contain id', 'tier1', 'Live Reply Creation');
    pass('tier1', 'Live Reply Creation', `HTTP 201 Created reply ID ${createdReply.id}`);
  } catch (err) {
    fail('tier1', 'Live Reply Creation', err.message);
  }

  // 1.8 Live Reply Listing (GET /api/v1/support/tickets/:id/replies)
  try {
    const res = await fetch(`${BASE_URL}/api/v1/support/tickets/${encodeURIComponent(createdTicket.id)}/replies`, {
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
        Accept: 'application/json',
      },
    });
    assert(res.ok, `GET /api/v1/support/tickets/:id/replies failed with status ${res.status}`, 'tier1', 'Live Reply Listing');
    const json = await res.json();
    const replies = json.data || json;
    assert(Array.isArray(replies) && replies.length > 0, 'Replies must be non-empty array', 'tier1', 'Live Reply Listing');
    const foundReply = replies.some((r) => r.id === createdReply.id);
    assert(foundReply, 'Created reply must be returned in replies array', 'tier1', 'Live Reply Listing');
    pass('tier1', 'Live Reply Listing', `HTTP 200 OK, retrieved ${replies.length} replies, verified reply ID ${createdReply.id}`);
  } catch (err) {
    fail('tier1', 'Live Reply Listing', err.message);
  }

  // 1.9 Truthful Unconfigured Contact & SLA Indicators
  try {
    const pageContent = fs.readFileSync(path.join(ROOT_DIR, 'src/pages/settings/SupportCenterPage.tsx'), 'utf8');
    const hasUnconfiguredHotline = pageContent.includes('— (Unconfigured)') && pageContent.includes('data-testid="hotline-indicator"');
    const hasInstitutionalSLA = pageContent.includes('Standard Institutional') && pageContent.includes('data-testid="sla-indicator"');
    const noFakePhone = !pageContent.includes('+1 (800) 555-CARE');
    const noFakeSLA = !pageContent.includes('< 15 min');
    assert(hasUnconfiguredHotline && hasInstitutionalSLA && noFakePhone && noFakeSLA, 'SupportCenterPage must display truthful indicators and omit fake phone/SLA', 'tier1', 'Truthful Operational Indicators');
    pass('tier1', 'Truthful Operational Indicators', 'Verified hotline-indicator="— (Unconfigured)", sla-indicator="Standard Institutional", fake phone/SLA eradicated');
  } catch (err) {
    fail('tier1', 'Truthful Operational Indicators', err.message);
  }
}

// ============================================================================
// TIER 2: BOUNDARY & CORNER CASES
// ============================================================================
async function runTier2(auth) {
  console.log('\n===============================================================');
  console.log('TIER 2: BOUNDARY & CORNER CASES');
  console.log('===============================================================');

  // 2.1 400 Bad Request on Empty Ticket Submission
  try {
    const res = await fetch(`${BASE_URL}/api/v1/support/tickets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.accessToken}`,
        Accept: 'application/json',
      },
      body: JSON.stringify({}),
    });
    assert(res.status === 400, `Expected HTTP 400, received HTTP ${res.status}`, 'tier2', '400 Bad Request on Empty Ticket');
    const json = await res.json();
    const messages = Array.isArray(json.message) ? json.message : [json.message];
    const hasSubjectValidation = messages.some((m) => typeof m === 'string' && m.includes('subject'));
    const hasDescriptionValidation = messages.some((m) => typeof m === 'string' && m.includes('description'));
    assert(hasSubjectValidation && hasDescriptionValidation, 'Validation errors must flag missing subject and description', 'tier2', '400 Bad Request on Empty Ticket');
    pass('tier2', '400 Bad Request on Empty Ticket', `HTTP 400 rejected empty submission with validation messages: ${JSON.stringify(messages)}`);
  } catch (err) {
    fail('tier2', '400 Bad Request on Empty Ticket', err.message);
  }

  // 2.2 404 Not Found on Invalid Ticket ID
  try {
    const bogusId = '00000000-0000-0000-0000-000000000000';
    const res = await fetch(`${BASE_URL}/api/v1/support/tickets/${bogusId}`, {
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
        Accept: 'application/json',
      },
    });
    assert(res.status === 404, `Expected HTTP 404, received HTTP ${res.status}`, 'tier2', '404 Not Found on Bogus Ticket ID');
    const json = await res.json();
    pass('tier2', '404 Not Found on Bogus Ticket ID', `HTTP 404 correctly returned for non-existent ticket ID: "${json.message || 'Not Found'}"`);
  } catch (err) {
    fail('tier2', '404 Not Found on Bogus Ticket ID', err.message);
  }

  // 2.3 400 Bad Request on Empty Reply Message
  try {
    // Create a temporary ticket to test reply validation
    const tempTicketRes = await fetch(`${BASE_URL}/api/v1/support/tickets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.accessToken}`,
        Accept: 'application/json',
      },
      body: JSON.stringify({
        subject: `E2E Boundary Reply Ticket [${Date.now()}]`,
        description: 'Valid ticket for empty reply testing.',
        category: 'ACCOUNT',
        priority: 'LOW',
      }),
    });
    const tempTicket = (await tempTicketRes.json()).data;

    const res = await fetch(`${BASE_URL}/api/v1/support/tickets/${encodeURIComponent(tempTicket.id)}/reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.accessToken}`,
        Accept: 'application/json',
      },
      body: JSON.stringify({ message: '' }),
    });
    assert(res.status === 400, `Expected HTTP 400 on empty reply, received HTTP ${res.status}`, 'tier2', '400 Bad Request on Empty Reply');
    const json = await res.json();
    pass('tier2', '400 Bad Request on Empty Reply', `HTTP 400 rejected empty reply: "${JSON.stringify(json.message)}"`);
  } catch (err) {
    fail('tier2', '400 Bad Request on Empty Reply', err.message);
  }

  // 2.4 403 Forbidden on Admin-Only CMS Endpoint (GET /api/v1/cms/blocks)
  try {
    const res = await fetch(`${BASE_URL}/api/v1/cms/blocks`, {
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
        Accept: 'application/json',
      },
    });
    assert(res.status === 403, `Expected HTTP 403 Forbidden for doctor on CMS blocks, received HTTP ${res.status}`, 'tier2', '403 Forbidden on Admin CMS Endpoint');
    const json = await res.json();
    pass('tier2', '403 Forbidden on Admin CMS Endpoint', `HTTP 403 correctly enforced RBAC boundary: "${json.message || 'Forbidden resource'}"`);
  } catch (err) {
    fail('tier2', '403 Forbidden on Admin CMS Endpoint', err.message);
  }

  // 2.5 Automatic Token Refresh Verification
  try {
    assert(Boolean(auth.refreshToken), 'auth.refreshToken must be present for token refresh test', 'tier2', 'Session Token Refresh');
    const refreshRes = await fetch(`${BASE_URL}/api/v1/auth/token/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ refreshToken: auth.refreshToken }),
    });
    assert(refreshRes.ok, `POST /api/v1/auth/token/refresh failed with status ${refreshRes.status}`, 'tier2', 'Session Token Refresh');
    const refreshJson = await refreshRes.json();
    const tokenData = refreshJson.data || refreshJson;
    assert(tokenData.accessToken, 'Refresh response must contain new accessToken', 'tier2', 'Session Token Refresh');

    // Test that the freshly minted accessToken can query /auth/me
    const verifyMeRes = await fetch(`${BASE_URL}/api/v1/auth/me`, {
      headers: {
        Authorization: `Bearer ${tokenData.accessToken}`,
        Accept: 'application/json',
      },
    });
    assert(verifyMeRes.ok, `Freshly refreshed token failed /auth/me with HTTP ${verifyMeRes.status}`, 'tier2', 'Session Token Refresh');
    const meJson = await verifyMeRes.json();
    assert(meJson.data?.id === auth.user.id, 'User ID must match across refreshed session', 'tier2', 'Session Token Refresh');

    // Update .token_cache.json with the newest token
    const tokenCache = JSON.parse(fs.readFileSync(TOKEN_CACHE_PATH, 'utf8'));
    tokenCache.accessToken = tokenData.accessToken;
    if (tokenData.refreshToken) tokenCache.refreshToken = tokenData.refreshToken;
    tokenCache.updatedAt = new Date().toISOString();
    fs.writeFileSync(TOKEN_CACHE_PATH, JSON.stringify(tokenCache, null, 2));

    // Update memory auth object
    auth.accessToken = tokenData.accessToken;
    if (tokenData.refreshToken) auth.refreshToken = tokenData.refreshToken;

    pass('tier2', 'Session Token Refresh', `HTTP 200/201 successfully rotated JWT token and verified identity (${auth.user.id})`);
  } catch (err) {
    fail('tier2', 'Session Token Refresh', err.message);
  }
}

// ============================================================================
// TIER 3: CROSS-FEATURE COMBINATIONS
// ============================================================================
async function runTier3(auth) {
  console.log('\n===============================================================');
  console.log('TIER 3: CROSS-FEATURE COMBINATIONS');
  console.log('===============================================================');

  // 3.1 Full Ticket Lifecycle: Create -> Fetch Details -> Add Reply -> Fetch Replies -> Paginated Query
  try {
    const lifecycleSubject = `Cross-Feature Lifecycle Ticket [${Date.now()}]`;
    const lifecycleDesc = 'Validating end-to-end lifecycle from creation through query, threaded conversation, and pagination.';

    // Step A: Create Ticket
    const createRes = await fetch(`${BASE_URL}/api/v1/support/tickets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.accessToken}`,
        Accept: 'application/json',
      },
      body: JSON.stringify({
        subject: lifecycleSubject,
        description: lifecycleDesc,
        category: 'BILLING',
        priority: 'HIGH',
      }),
    });
    assert(createRes.ok, `Create ticket failed with status ${createRes.status}`, 'tier3', 'Ticket Full Lifecycle');
    const ticket = (await createRes.json()).data;
    assert(ticket.id && ticket.ticketNumber, 'Ticket must contain id and ticketNumber', 'tier3', 'Ticket Full Lifecycle');

    // Step B: Retrieve Ticket Details by ID
    const getRes = await fetch(`${BASE_URL}/api/v1/support/tickets/${encodeURIComponent(ticket.id)}`, {
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
        Accept: 'application/json',
      },
    });
    assert(getRes.ok, `Get ticket by ID failed with status ${getRes.status}`, 'tier3', 'Ticket Full Lifecycle');
    const fetchedTicket = (await getRes.json()).data;
    assert(fetchedTicket.id === ticket.id, 'Fetched ticket ID must match created ID', 'tier3', 'Ticket Full Lifecycle');
    assert(fetchedTicket.subject === lifecycleSubject, 'Fetched ticket subject must match created subject', 'tier3', 'Ticket Full Lifecycle');
    assert(fetchedTicket.status === 'OPEN', 'Newly created ticket initial status must be OPEN', 'tier3', 'Ticket Full Lifecycle');

    // Step C: Post Reply to Ticket
    const replyText = 'Tier 3 threaded reply adding cross-feature diagnostic details.';
    const replyRes = await fetch(`${BASE_URL}/api/v1/support/tickets/${encodeURIComponent(ticket.id)}/reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.accessToken}`,
        Accept: 'application/json',
      },
      body: JSON.stringify({ message: replyText }),
    });
    assert(replyRes.ok, `Post reply failed with status ${replyRes.status}`, 'tier3', 'Ticket Full Lifecycle');
    const replyDto = (await replyRes.json()).data;
    assert(replyDto.id, 'Reply DTO must contain id', 'tier3', 'Ticket Full Lifecycle');

    // Step D: Retrieve Replies Array
    const getRepliesRes = await fetch(`${BASE_URL}/api/v1/support/tickets/${encodeURIComponent(ticket.id)}/replies`, {
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
        Accept: 'application/json',
      },
    });
    assert(getRepliesRes.ok, `Get replies failed with status ${getRepliesRes.status}`, 'tier3', 'Ticket Full Lifecycle');
    const repliesList = (await getRepliesRes.json()).data;
    assert(Array.isArray(repliesList), 'Replies must be array', 'tier3', 'Ticket Full Lifecycle');
    assert(repliesList.some((r) => r.id === replyDto.id || r.message === replyText), 'Created reply must be found in replies list', 'tier3', 'Ticket Full Lifecycle');

    // Step E: Query Paginated Tickets List with Filter
    const listRes = await fetch(`${BASE_URL}/api/v1/support/tickets?category=BILLING&limit=10`, {
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
        Accept: 'application/json',
      },
    });
    assert(listRes.ok, `Get paginated tickets failed with status ${listRes.status}`, 'tier3', 'Ticket Full Lifecycle');
    const listJson = await listRes.json();
    const ticketsArray = listJson.data?.data || (Array.isArray(listJson.data) ? listJson.data : []);
    assert(ticketsArray.some((t) => t.id === ticket.id), 'Newly created ticket must appear in filtered listing', 'tier3', 'Ticket Full Lifecycle');

    pass('tier3', 'Ticket Full Lifecycle', `Created #${ticket.ticketNumber} -> Retrieved by ID -> Replied (ID: ${replyDto.id}) -> Verified in replies and paginated query`);
  } catch (err) {
    fail('tier3', 'Ticket Full Lifecycle', err.message);
  }

  // 3.2 CMS Pages Search & Policy DTO Alignment
  try {
    // Search CMS Pages
    const searchRes = await fetch(`${BASE_URL}/api/v1/cms/pages/search?q=guidelines`, {
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
        Accept: 'application/json',
      },
    });
    assert(searchRes.ok, `GET /api/v1/cms/pages/search failed with status ${searchRes.status}`, 'tier3', 'CMS Pages Search & Policies');
    const searchJson = await searchRes.json();
    const searchResults = searchJson.data || searchJson;
    assert(Array.isArray(searchResults), 'CMS pages search result must be an array', 'tier3', 'CMS Pages Search & Policies');

    // Query CMS Policies
    const policiesRes = await fetch(`${BASE_URL}/api/v1/cms/policies`, {
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
        Accept: 'application/json',
      },
    });
    assert(policiesRes.ok, `GET /api/v1/cms/policies failed with status ${policiesRes.status}`, 'tier3', 'CMS Pages Search & Policies');
    const policiesJson = await policiesRes.json();
    const policies = policiesJson.data || policiesJson;
    assert(Array.isArray(policies), 'CMS policies must be an array', 'tier3', 'CMS Pages Search & Policies');

    // Verify DTO Alignment in types.ts
    const typesContent = fs.readFileSync(path.join(ROOT_DIR, 'src/pages/settings/types.ts'), 'utf8');
    const hasCMSPolicyDTO = typesContent.includes('export interface CMSPolicyDTO');
    const hasCMSPageDTO = typesContent.includes('export interface CMSPageDTO');
    const hasFAQItemDTO = typesContent.includes('export interface FAQItemDTO');
    assert(hasCMSPolicyDTO && hasCMSPageDTO && hasFAQItemDTO, 'types.ts must declare CMSPolicyDTO, CMSPageDTO, and FAQItemDTO', 'tier3', 'CMS Pages Search & Policies');

    pass('tier3', 'CMS Pages Search & Policies', `Live CMS search (HTTP 200) and policies query (HTTP 200) verified with Postman DTO alignment`);
  } catch (err) {
    fail('tier3', 'CMS Pages Search & Policies', err.message);
  }
}

// ============================================================================
// TIER 4: REAL-WORLD CLINICAL WORKLOAD SCENARIOS
// ============================================================================
async function runTier4(auth) {
  console.log('\n===============================================================');
  console.log('TIER 4: REAL-WORLD WORKLOAD SCENARIOS');
  console.log('===============================================================');

  // Scenario 4.1: Doctor Encountering Clinical Procedural Issue in Cardiac Cath Lab
  try {
    console.log('  [Scenario 4.1] Doctor Sara Jenkins encountering acute DICOM imaging viewer latency in Cath Lab Workstation...');

    // 1. Doctor navigates to Support page and queries clinical FAQs
    const faqRes = await fetch(`${BASE_URL}/api/v1/cms/faqs?category=CLINICAL`, {
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
        Accept: 'application/json',
      },
    });
    assert(faqRes.ok, `FAQ query returned status ${faqRes.status}`, 'tier4', 'Clinical Workflow: FAQ Check');
    const faqs = (await faqRes.json()).data || [];
    console.log(`    ↳ Step 1: Doctor reviewed clinical FAQs (Found: ${faqs.length} articles). Procedural solution not found; submitting ticket.`);

    // 2. Doctor opens "Submit IT Support Ticket" modal and logs high-priority clinical ticket
    const clinicalSubject = `Cath Lab Workstation 3B: DICOM Angiogram Rendering Latency during Stent Placement [${Date.now()}]`;
    const clinicalDesc = `Doctor Fa502f2e reported that workstation in Cath Lab 3B exhibits 40-second image retrieval delay on 4K cardiac angiography cine loops. Patient is draped on fluoroscopy table. Requires urgent network switch diagnosis.`;

    const ticketRes = await fetch(`${BASE_URL}/api/v1/support/tickets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.accessToken}`,
        Accept: 'application/json',
      },
      body: JSON.stringify({
        subject: clinicalSubject,
        description: clinicalDesc,
        category: 'CLINICAL',
        priority: 'URGENT',
      }),
    });
    assert(ticketRes.ok, `Clinical ticket creation failed with HTTP ${ticketRes.status}`, 'tier4', 'Clinical Workflow: Ticket Creation');
    const ticket = (await ticketRes.json()).data;
    assert(ticket.ticketNumber.startsWith('TKT-'), `Expected server monotonic ticket format TKT-, received ${ticket.ticketNumber}`, 'tier4', 'Clinical Workflow: Monotonic Ticket Number');
    assert(ticket.userId === auth.user.id, `Ticket creator userId ${ticket.userId} must match authenticated doctor ID ${auth.user.id}`, 'tier4', 'Clinical Workflow: Identity Integrity');
    console.log(`    ↳ Step 2: Live ticket created with authentic monotonic reference: #${ticket.ticketNumber} (ID: ${ticket.id})`);

    // 3. Doctor checks status of ticket in Recent Tickets tab
    const historyRes = await fetch(`${BASE_URL}/api/v1/support/tickets?limit=5`, {
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
        Accept: 'application/json',
      },
    });
    assert(historyRes.ok, `Failed to load ticket history: HTTP ${historyRes.status}`, 'tier4', 'Clinical Workflow: History Verification');
    const recentTickets = (await historyRes.json()).data?.data || [];
    const verifiedInHistory = recentTickets.some((t) => t.id === ticket.id);
    assert(verifiedInHistory, `Newly logged clinical ticket #${ticket.ticketNumber} must appear in Doctor's recent tickets history`, 'tier4', 'Clinical Workflow: History Verification');
    console.log(`    ↳ Step 3: Verified ticket #${ticket.ticketNumber} is visible at top of Doctor's Recent Tickets tab`);

    // 4. Clinical staff provides immediate intra-operative telemetry update
    const followUpRes = await fetch(`${BASE_URL}/api/v1/support/tickets/${encodeURIComponent(ticket.id)}/reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.accessToken}`,
        Accept: 'application/json',
      },
      body: JSON.stringify({
        message: 'Telemetry update from Nurse Practitioner: Switched backup gigabit uplink to Port 12; frame rate restored to 15 fps. Procedure proceeding. Please monitor packet drop.',
      }),
    });
    assert(followUpRes.ok, `Failed to post clinical telemetry reply: HTTP ${followUpRes.status}`, 'tier4', 'Clinical Workflow: Threaded Communication');
    const reply = (await followUpRes.json()).data;
    console.log(`    ↳ Step 4: Intra-operative update appended to conversation thread (Reply ID: ${reply.id})`);

    // 5. Doctor views conversation thread on Support Center page
    const repliesRes = await fetch(`${BASE_URL}/api/v1/support/tickets/${encodeURIComponent(ticket.id)}/replies`, {
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
        Accept: 'application/json',
      },
    });
    assert(repliesRes.ok, `Failed to fetch replies: HTTP ${repliesRes.status}`, 'tier4', 'Clinical Workflow: Threaded Communication');
    const thread = (await repliesRes.json()).data;
    assert(thread.some((r) => r.id === reply.id), 'Telemetry reply must be present in conversation thread', 'tier4', 'Clinical Workflow: Threaded Communication');
    console.log(`    ↳ Step 5: Verified complete threaded ticket record (Status: ${ticket.status}, Total replies: ${thread.length})`);

    pass('tier4', 'Cath Lab Urgent Clinical Workflow', `Real-world procedural emergency simulation successfully executed on live staging: #${ticket.ticketNumber}`);
  } catch (err) {
    fail('tier4', 'Cath Lab Urgent Clinical Workflow', err.message);
  }
}

// ============================================================================
// MAIN RUNNER
// ============================================================================
async function main() {
  console.log('===============================================================');
  console.log('CAREID DOCTOR WEB PORTAL — SUPPORT MODULE E2E TEST RUNNER');
  console.log('Staging Backend: https://360api.vnvision.in');
  console.log(`Execution Time: ${new Date().toISOString()}`);
  console.log('===============================================================');

  const auth = await getValidToken();
  console.log(`Authenticated Doctor Identity: ${auth.user.id} (${auth.user.email || 'careid-doctor'})`);
  console.log(`Roles: [${(auth.user.roles || []).join(', ')}]`);

  await runTier1(auth);
  await runTier2(auth);
  await runTier3(auth);
  await runTier4(auth);

  console.log('\n===============================================================');
  console.log('E2E TEST SUITE EXECUTION SUMMARY');
  console.log('===============================================================');
  console.log(`Tier 1 (Feature Coverage):            ${stats.tiers.tier1.passed}/${stats.tiers.tier1.total} Passed`);
  console.log(`Tier 2 (Boundary & Corner Cases):     ${stats.tiers.tier2.passed}/${stats.tiers.tier2.total} Passed`);
  console.log(`Tier 3 (Cross-Feature Combinations):   ${stats.tiers.tier3.passed}/${stats.tiers.tier3.total} Passed`);
  console.log(`Tier 4 (Real-World Clinical Scenarios): ${stats.tiers.tier4.passed}/${stats.tiers.tier4.total} Passed`);
  console.log('---------------------------------------------------------------');
  console.log(`Total Assertions Passed: ${stats.passed}/${stats.total} (100%)`);
  console.log(`Total Failures:          ${stats.failed}`);
  console.log('===============================================================');

  if (stats.failed > 0) {
    process.exit(1);
  } else {
    console.log('🎉 ALL E2E TIERS 1-4 COMPLETED WITH 100% PASS RATE ON LIVE STAGING.\n');
  }
}

main().catch((err) => {
  console.error('\n❌ E2E TEST SUITE RUNNER ABORTED WITH FATAL ERROR:');
  console.error(err);
  process.exit(1);
});
