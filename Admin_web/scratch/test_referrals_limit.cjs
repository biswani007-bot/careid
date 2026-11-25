const https = require('https');
const { getAdminToken } = require('./token_helper.cjs');

async function testReferrals() {
  const token = await getAdminToken();
  const opts = {
    hostname: '360api.vnvision.in',
    path: '/api/v1/referrals?limit=100',
    method: 'GET',
    headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` },
    rejectUnauthorized: false
  };

  const res = await new Promise(resolve => {
    https.get(opts, r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => resolve(JSON.parse(d)));
    });
  });

  const refData = res.data?.data || (Array.isArray(res.data) ? res.data : []);
  console.log('Total referrals returned:', refData.length);
  const statusCounts = {};
  refData.forEach(r => {
    statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
  });
  console.log('Referral status counts:', statusCounts);
}

testReferrals();

