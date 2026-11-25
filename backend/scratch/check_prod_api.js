const https = require('https');

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, data }));
    }).on('error', reject);
  });
}

async function checkProd() {
  try {
    const health = await get('https://360api.vnvision.in/api/v1/health');
    console.log('GET https://360api.vnvision.in/api/v1/health ->', health.statusCode, health.data);

    const auditUnauth = await get('https://360api.vnvision.in/api/v1/security/audit');
    console.log('GET https://360api.vnvision.in/api/v1/security/audit (unauth) ->', auditUnauth.statusCode, auditUnauth.data);
  } catch (err) {
    console.log('Production connection error:', err.message);
  }
}

checkProd();

