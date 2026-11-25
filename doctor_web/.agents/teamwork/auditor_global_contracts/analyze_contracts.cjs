const fs = require('fs');
const path = require('path');

const endpoints = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'all_endpoints_detail.json'), 'utf8'));

// Filter keywords
const keywords = [
  'treatment-offer', 'treatment_offer', 'treatmentoffer', 'treatment',
  'consultation', 'appointment', 'facility', 'facilities',
  'clearance', 'pre-op', 'preop', 'hold', 'readiness',
  'check-in', 'checkin', 'doctor/me', 'doctors/me', 'doctor', 'cath-lab', 'cathlab'
];

const matched = [];

for (const ep of endpoints) {
  const textToSearch = `${ep.folder} ${ep.name} ${ep.url} ${ep.bodyRaw}`.toLowerCase();
  const matchedKw = keywords.filter(k => textToSearch.includes(k));
  if (matchedKw.length > 0) {
    matched.push({
      ...ep,
      matchedKw
    });
  }
}

console.log('Matched endpoints count:', matched.length);

// Group by category/folder
const byFolder = {};
for (const m of matched) {
  if (!byFolder[m.folder]) byFolder[m.folder] = [];
  byFolder[m.folder].push(m);
}

let report = `# Matched Endpoints in Postman Collection (${matched.length} total)\n\n`;
for (const [fld, list] of Object.entries(byFolder)) {
  report += `## Folder: ${fld} (${list.length})\n`;
  for (const item of list) {
    report += `- **[${item.method}]** \`${item.url}\` — *${item.name}* (Keywords: ${item.matchedKw.join(', ')})\n`;
  }
  report += '\n';
}

fs.writeFileSync(path.resolve(__dirname, 'matched_endpoints.md'), report, 'utf8');
fs.writeFileSync(path.resolve(__dirname, 'matched_endpoints.json'), JSON.stringify(matched, null, 2), 'utf8');
console.log('Saved matched_endpoints.md and matched_endpoints.json');
