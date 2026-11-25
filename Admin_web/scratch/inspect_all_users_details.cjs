const fs = require('fs');
const https = require('https');
const tokenData = JSON.parse(fs.readFileSync('scratch/cached_admin_token.json', 'utf8'));

function apiGet(path) {
  return new Promise((resolve) => {
    https.get('https://360api.vnvision.in' + path, {
      headers: { 'Authorization': 'Bearer ' + tokenData.token }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ path, status: res.statusCode, body: JSON.parse(data) }); }
        catch (e) { resolve({ path, status: res.statusCode, text: data }); }
      });
    }).on('error', err => resolve({ path, error: err.message }));
  });
}

async function run() {
  const usersRes = await apiGet('/api/v1/admin/users');
  const users = usersRes.body?.data || [];
  console.log('Inspecting details for all', users.length, 'users:');
  for (const u of users) {
    const d = await apiGet('/api/v1/admin/users/' + u.id);
    const keys = Object.keys(d.body?.data || {});
    console.log(`User ${u.id.slice(0, 8)} (${u.phone}): keys = [${keys.join(', ')}]`);
    if (d.body?.data?.email || d.body?.data?.name || d.body?.data?.firstName) {
      console.log('   FOUND EXTRA FIELDS:', d.body.data);
    }
  }
}

run();

