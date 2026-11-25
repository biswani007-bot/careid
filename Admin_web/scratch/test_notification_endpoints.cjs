const fs = require('fs');

const tokenObj = JSON.parse(fs.readFileSync('scratch/cached_admin_token.json', 'utf8'));
const token = tokenObj.token;

async function probe(url, method = 'GET', body = null) {
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
  return { status: res.status, data };
}

async function run() {
  console.log('Testing notification query parameters...');
  console.log('status=READ:', await probe('/api/v1/notifications?status=READ'));
  console.log('status=UNREAD:', await probe('/api/v1/notifications?status=UNREAD'));
  console.log('status=ARCHIVED:', await probe('/api/v1/notifications?status=ARCHIVED'));
  console.log('read-all:', await probe('/api/v1/notifications/unread-count'));
}

run();

