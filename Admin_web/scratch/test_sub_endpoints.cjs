const fs = require('fs');

async function testSubEndpoints() {
  const token = JSON.parse(fs.readFileSync('scratch/cached_token.json', 'utf8')).token;
  const uuid = 'a85d027f-d3b4-44ff-b2f1-709fb490562e';

  const notesRes = await fetch(`https://360api.vnvision.in/api/v1/referrals/${uuid}/notes`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('Notes status:', notesRes.status, await notesRes.json());

  const histRes = await fetch(`https://360api.vnvision.in/api/v1/referrals/${uuid}/history`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('History status:', histRes.status, await histRes.json());

  const attRes = await fetch(`https://360api.vnvision.in/api/v1/referrals/${uuid}/attachments`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('Attachments status:', attRes.status, await attRes.json());
}

testSubEndpoints().catch(console.error);

