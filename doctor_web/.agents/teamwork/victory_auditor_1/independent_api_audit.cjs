const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://360api.vnvision.in';
const tokenCachePath = path.resolve(__dirname, '../../../.token_cache.json');

async function runAuditorCheck() {
  console.log('--- Independent Victory Auditor Live API Verification ---');
  if (!fs.existsSync(tokenCachePath)) {
    throw new Error('Token cache not found');
  }
  const tokenCache = JSON.parse(fs.readFileSync(tokenCachePath, 'utf8'));
  const token = tokenCache.accessToken;

  // 1. Check /api/v1/auth/me
  const authRes = await fetch(`${BASE_URL}/api/v1/auth/me`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('1. /api/v1/auth/me status:', authRes.status);
  const authData = await authRes.json();
  console.log('   User ID:', authData.data?.userId, 'Roles:', authData.data?.roles);

  // 2. Check /api/v1/cms/faqs
  const faqRes = await fetch(`${BASE_URL}/api/v1/cms/faqs`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('2. /api/v1/cms/faqs status:', faqRes.status);
  const faqData = await faqRes.json();
  console.log('   FAQs count:', Array.isArray(faqData.data) ? faqData.data.length : 'not array');

  // 3. Create independent test ticket
  const ticketRes = await fetch(`${BASE_URL}/api/v1/support/tickets`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      subject: 'Auditor Independent Verification Ticket',
      description: 'Zero shared context verification ticket from Victory Auditor.',
      category: 'TECHNICAL',
      priority: 'LOW'
    })
  });
  console.log('3. POST /api/v1/support/tickets status:', ticketRes.status);
  const ticketData = await ticketRes.json();
  console.log('   Ticket created:', ticketData.data?.ticketNumber, 'ID:', ticketData.data?.id);
  const ticketId = ticketData.data?.id;

  // 4. Retrieve ticket
  const getTicketRes = await fetch(`${BASE_URL}/api/v1/support/tickets/${ticketId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('4. GET /api/v1/support/tickets/:id status:', getTicketRes.status);
  const getTicketData = await getTicketRes.json();
  console.log('   Retrieved ticket subject:', getTicketData.data?.subject);

  if (authRes.ok && faqRes.ok && ticketRes.ok && getTicketRes.ok) {
    console.log('=== AUDITOR INDEPENDENT LIVE API VERIFICATION SUCCESSFUL ===');
  } else {
    throw new Error('Independent live API verification failed');
  }
}

runAuditorCheck().catch(err => {
  console.error('Auditor verification error:', err);
  process.exit(1);
});
