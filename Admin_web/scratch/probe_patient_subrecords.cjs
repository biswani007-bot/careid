const fs = require('fs');
const https = require('https');
const tokenData = JSON.parse(fs.readFileSync('scratch/cached_admin_token.json', 'utf8'));

function testUrl(url) {
  return new Promise((resolve) => {
    https.get(url, {
      headers: { 'Authorization': 'Bearer ' + tokenData.token, 'Accept': 'application/json' }
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => resolve({ url, status: res.statusCode, body: b }));
    });
  });
}

async function run() {
  const id = '9a4ad630-de90-40e9-b4cd-1d76f8f63069';
  const uid = '7904ad9d-b141-471d-9451-4aa48ad3eba7';

  console.log('1. Testing medical records by profile ID:');
  const mrProf = await testUrl('https://360api.vnvision.in/api/v1/admin/patients/' + id + '/medical-records');
  console.log('Status:', mrProf.status, mrProf.body.slice(0, 300));

  console.log('2. Testing medical records by user ID:');
  const mrUser = await testUrl('https://360api.vnvision.in/api/v1/admin/patients/' + uid + '/medical-records');
  console.log('Status:', mrUser.status, mrUser.body.slice(0, 300));

  console.log('3. Testing timeline by profile ID:');
  const tlProf = await testUrl('https://360api.vnvision.in/api/v1/admin/patients/' + id + '/medical-records/timeline');
  console.log('Status:', tlProf.status, tlProf.body.slice(0, 300));

  console.log('4. Testing platform medical-records with patientProfileId filter:');
  const platMr = await testUrl('https://360api.vnvision.in/api/v1/admin/medical-records?patientProfileId=' + id);
  console.log('Status:', platMr.status, platMr.body.slice(0, 300));

  console.log('5. Testing appointments with patientProfileId filter:');
  const appts = await testUrl('https://360api.vnvision.in/api/v1/appointments?patientProfileId=' + id);
  console.log('Status:', appts.status, appts.body.slice(0, 300));

  console.log('6. Testing insurance cards by patientId:');
  const ins = await testUrl('https://360api.vnvision.in/api/v1/patients/' + id + '/insurance-cards');
  console.log('Status:', ins.status, ins.body.slice(0, 300));
}

run();

