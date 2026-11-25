const fs = require('fs');
const https = require('https');

const tokenCache = JSON.parse(fs.readFileSync('.token_cache.json', 'utf8'));
const doctorToken = tokenCache.accessToken;

function get(path, token) {
  return new Promise((resolve) => {
    const headers = {};
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const req = https.request({
      hostname: '360api.vnvision.in',
      path: '/api/v1' + path,
      method: 'GET',
      headers: headers
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(b) });
        } catch {
          resolve({ status: res.statusCode, data: b });
        }
      });
    });
    req.end();
  });
}

async function main() {
  const marcusId = '787e5187-7859-4320-bb1a-465a57dd086a';
  const res = await get(`/doctors/patients/${marcusId}/medical-records?page=1&limit=100&includeArchived=true`, doctorToken);
  const records = res.data?.data || res.data || [];
  console.log(`Retrieved ${records.length} records for Marcus Doe.`);
  
  const imagingKeywords = ['mri', 'ct', 'x-ray', 'radiolog', 'fluoroscopy', 'angiography', 'ultrasound', 'scan', 'imaging'];
  
  const imagingRecords = records.filter(r => {
    const titleMatch = imagingKeywords.some(k => r.title.toLowerCase().includes(k));
    const attMatch = r.attachments && r.attachments.length > 0;
    return titleMatch || attMatch;
  });

  console.log(`Found ${imagingRecords.length} records matching imaging/attachments.`);
  imagingRecords.slice(0, 10).forEach(r => {
    console.log(`\nID: ${r.id}`);
    console.log(`  Title: ${r.title}`);
    console.log(`  Status: ${r.status}`);
    console.log(`  Chief Complaint: ${r.chiefComplaint}`);
    console.log(`  Clinical Notes: ${r.clinicalNotes}`);
    console.log(`  Treatment Plan: ${r.treatmentPlan}`);
    console.log(`  Attachments count: ${r.attachments ? r.attachments.length : 0}`);
    if (r.attachments && r.attachments.length > 0) {
      console.log(`  Attachments:`, JSON.stringify(r.attachments, null, 2));
    }
  });
}

main();
