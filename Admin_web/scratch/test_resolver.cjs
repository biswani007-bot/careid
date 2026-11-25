const fs = require('fs');

async function testResolver(identifier) {
  const token = JSON.parse(fs.readFileSync('scratch/cached_token.json', 'utf8')).token;
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
  console.log(`\nResolving "${identifier}": isUUID = ${isUUID}`);

  if (isUUID) {
    const res = await fetch(`https://360api.vnvision.in/api/v1/referrals/${identifier}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('UUID fetch status:', res.status);
    return;
  }

  // Not a UUID: clean and search
  const clean = identifier.replace(/^#/, '').trim();
  
  // 1. Try search with q
  const searchRes = await fetch(`https://360api.vnvision.in/api/v1/referrals?q=${encodeURIComponent(clean)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const searchData = await searchRes.json();
  const foundItems = searchData.data?.items || searchData.data || [];
  console.log(`Search for "${clean}" returned ${foundItems.length} items`);

  // 2. Also try list if not found or if clean is like REF-A85D02
  let target = foundItems.find(item => 
    (item.referralNumber && item.referralNumber.toLowerCase() === clean.toLowerCase()) ||
    (item.id && item.id.toLowerCase() === clean.toLowerCase())
  );

  if (!target) {
    // If not found, check hex prefix (like REF-A85D02 -> a85d02)
    const hexMatch = clean.match(/^[rR][eE][fF]-([0-9a-fA-F]+)$/);
    const hexPrefix = hexMatch ? hexMatch[1].toLowerCase() : null;

    // Fetch broader list
    const listRes = await fetch(`https://360api.vnvision.in/api/v1/referrals?limit=100`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const listData = await listRes.json();
    const all = listData.data?.items || listData.data || [];
    target = all.find(item => {
      if (item.referralNumber && item.referralNumber.toLowerCase() === clean.toLowerCase()) return true;
      if (item.referralNumber && item.referralNumber.toLowerCase().replace(/[^a-z0-9]/g, '') === clean.toLowerCase().replace(/[^a-z0-9]/g, '')) return true;
      if (item.id && item.id.toLowerCase() === clean.toLowerCase()) return true;
      if (hexPrefix && item.id && item.id.toLowerCase().startsWith(hexPrefix)) return true;
      return false;
    });
  }

  if (target) {
    console.log(`Resolved "${identifier}" -> UUID: ${target.id} (${target.referralNumber})`);
    const detailRes = await fetch(`https://360api.vnvision.in/api/v1/referrals/${target.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Detail fetch with resolved UUID status:', detailRes.status);
  } else {
    console.log(`Could not resolve "${identifier}"`);
  }
}

async function run() {
  await testResolver('a85d027f-d3b4-44ff-b2f1-709fb490562e');
  await testResolver('REF-2026-00031');
  await testResolver('REF-A85D02');
  await testResolver('#REF-2026-00031');
  await testResolver('REF-2026-00001');
}

run().catch(console.error);

