const { getAdminToken, httpRequest } = require('./token_helper.cjs');

async function main() {
  const token = await getAdminToken();
  async function apiGet(path) {
    return await httpRequest({
      hostname: '360api.vnvision.in',
      path,
      method: 'GET',
      headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
    });
  }

  const res = await apiGet('/api/v1/doctors/search?q=Cardiology');
  console.log('Search doctors by Cardiology:', res.status, 'found:', res.body?.data?.length || res.body?.length);
  const docs = res.body?.data || res.body || [];
  for (const d of docs) {
    console.log(`- Dr. ${d.fullName} | dept: ${d.department} | spec: ${d.primarySpecialization}`);
  }

  const resSurg = await apiGet('/api/v1/doctors/search?q=Surgery');
  console.log('\nSearch doctors by Surgery:', resSurg.status, 'found:', resSurg.body?.data?.length || resSurg.body?.length);
  const docsSurg = resSurg.body?.data || resSurg.body || [];
  for (const d of docsSurg) {
    console.log(`- Dr. ${d.fullName} | dept: ${d.department} | spec: ${d.primarySpecialization}`);
  }
}

main().catch(console.error);

