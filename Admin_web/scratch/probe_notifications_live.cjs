const fs = require('fs');

const tokenObj = JSON.parse(fs.readFileSync('scratch/cached_admin_token.json', 'utf8'));
const token = tokenObj.token;

async function probe(url, method = 'GET', body = null) {
  try {
    const opts = {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`https://360api.vnvision.in${url}`, opts);
    const data = await res.json().catch(() => null);
    return { status: res.status, ok: res.ok, data };
  } catch (e) {
    return { status: 0, ok: false, error: e.message };
  }
}

async function run() {
  console.log('--- Probing Live Notification Endpoints ---');

  console.log('\n1. GET /api/v1/notifications/dashboard/stats:');
  const stats = await probe('/api/v1/notifications/dashboard/stats');
  console.log(JSON.stringify(stats, null, 2));

  console.log('\n2. GET /api/v1/notifications/unread-count:');
  const unread = await probe('/api/v1/notifications/unread-count');
  console.log(JSON.stringify(unread, null, 2));

  console.log('\n3. GET /api/v1/notifications:');
  const notifs = await probe('/api/v1/notifications');
  console.log(JSON.stringify(notifs, null, 2));

  console.log('\n4. GET /api/v1/notifications/queue:');
  const queue = await probe('/api/v1/notifications/queue');
  console.log(JSON.stringify(queue, null, 2));

  console.log('\n5. GET /api/v1/cms/announcements:');
  const announcements = await probe('/api/v1/cms/announcements');
  console.log(JSON.stringify(announcements, null, 2));

  console.log('\n6. GET /api/v1/support/tickets:');
  const tickets = await probe('/api/v1/support/tickets');
  console.log(JSON.stringify(tickets, null, 2));
}

run();
