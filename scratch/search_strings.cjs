const fs = require('fs');

const xml = fs.readFileSync('scratch/admin_page_metadata.xml', 'utf8');

const queries = [
  'Overview',
  'Export Referrals',
  'Referral ID',
  'Referring Doctor',
  'Receiving Doctor',
  'Priority',
  'Hospital',
  'Specialty',
  'Escalate',
  'REF-'
];

queries.forEach(q => {
  let idx = 0;
  let count = 0;
  while ((idx = xml.indexOf(q, idx)) !== -1) {
    count++;
    console.log(`Found "${q}" at ${idx}: ${xml.substring(idx - 60, idx + 80).replace(/\n/g, ' ')}`);
    idx += q.length;
    if (count > 3) break;
  }
});
