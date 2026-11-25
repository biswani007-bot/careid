const fs = require('fs');
const token = JSON.parse(fs.readFileSync('scratch/cached_admin_token.json', 'utf8')).token;
const baseUrl = 'https://360api.vnvision.in/api/v1';

async function check(urlPath) {
  console.log(`\n>>> Checking: ${urlPath}`);
  try {
    const res = await fetch(`${baseUrl}${urlPath}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json'
      }
    });
    console.log(`Status: ${res.status} ${res.statusText}`);
    const j = await res.json().catch(() => null);
    console.log(JSON.stringify(j, null, 2));
    return j;
  } catch (err) {
    console.error('Error:', err.message);
  }
}

async function run() {
  await check('/health');
  await check('/ready');
  await check('/live');
  await check('/observability/health');
  await check('/observability/health/live');
  await check('/observability/health/ready');
  await check('/ocr/dashboard');
  await check('/ocr/statistics');
}

run();

