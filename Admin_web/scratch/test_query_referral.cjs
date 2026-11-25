const fs = require('fs');

async function testQuery() {
  const token = JSON.parse(fs.readFileSync('scratch/cached_token.json', 'utf8')).token;

  console.log('Testing GET /api/v1/referrals?q=REF-2026-00031...');
  const res1 = await fetch('https://360api.vnvision.in/api/v1/referrals?q=REF-2026-00031', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data1 = await res1.json();
  console.log('Result 1 count:', data1.data?.items?.length || data1.data?.length);

  console.log('Testing GET /api/v1/referrals?limit=100...');
  const res2 = await fetch('https://360api.vnvision.in/api/v1/referrals?limit=100', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data2 = await res2.json();
  const items = data2.data?.items || data2.data || [];
  console.log('Total items fetched:', items.length);
  for (const item of items) {
    console.log(`id: ${item.id}, referralNumber: ${item.referralNumber}, referralCode: ${item.referralCode}`);
  }
}

testQuery().catch(console.error);

