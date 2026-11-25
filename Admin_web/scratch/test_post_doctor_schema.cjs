const fs = require('fs');
const tokenData = JSON.parse(fs.readFileSync('scratch/cached_token.json', 'utf8'));
const token = tokenData.accessToken || tokenData.token;

async function testPostDoctor(payload) {
  const res = await fetch('https://360api.vnvision.in/api/v1/doctors', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  console.log('Status:', res.status);
  console.log('Response:', JSON.stringify(data, null, 2));
}

testPostDoctor({}).catch(console.error);
