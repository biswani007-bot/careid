const fs = require('fs');

async function testDetail() {
  const token = JSON.parse(fs.readFileSync('scratch/cached_token.json', 'utf8')).token;
  const uuid = 'a85d027f-d3b4-44ff-b2f1-709fb490562e';
  
  console.log(`Testing GET /api/v1/referrals/${uuid}...`);
  const res = await fetch(`https://360api.vnvision.in/api/v1/referrals/${uuid}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('HTTP Status:', res.status);
  const data = await res.json();
  console.log('Response status/success:', data.status, data.success);
  console.log('Response body:', JSON.stringify(data, null, 2));

  // Also test what happens if we pass referralNumber or short code:
  console.log('\nTesting GET with referral number REF-2026-00031...');
  const res2 = await fetch(`https://360api.vnvision.in/api/v1/referrals/REF-2026-00031`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('HTTP Status with referral number:', res2.status);
  const data2 = await res2.json();
  console.log('Response 2:', JSON.stringify(data2, null, 2));
}

testDetail().catch(console.error);

