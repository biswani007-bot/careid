const { getFreshToken, apiGet } = require('./api_helper.cjs');

async function main() {
  console.log('--- PROBING PATIENT PAGE 3 INDIVIDUALLY ---');
  // Page 3 with limit 5 corresponds to items 11 to 15.
  for (let i = 11; i <= 15; i++) {
    const res = await apiGet(`/api/v1/admin/patients?page=${i}&limit=1`);
    if (res.status === 200 && res.body?.data) {
      const p = Array.isArray(res.body.data) ? res.body.data[0] : res.body.data?.data?.[0];
      console.log(`Offset ${i}: SUCCESS - ID=${p?.id}, Name=${p?.firstName} ${p?.lastName}`);
    } else {
      console.log(`Offset ${i}: FAILED (Status ${res.status}): ${res.body?.message || res.body?.error}`);
    }
  }
}

main().catch(console.error);
