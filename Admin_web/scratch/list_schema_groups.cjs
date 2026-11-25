const fs = require('fs');

const doc = JSON.parse(fs.readFileSync('scratch/backend_openapi.json', 'utf8'));

const allSchemas = Object.keys(doc.components?.schemas || {}).sort();
console.log('Total schemas:', allSchemas.length);

const grouped = {};
for (const s of allSchemas) {
  let prefix = 'Other';
  if (s.toLowerCase().includes('ocr')) prefix = 'OCR';
  else if (s.toLowerCase().includes('doctor')) prefix = 'Doctor';
  else if (s.toLowerCase().includes('facilit')) prefix = 'Facility';
  else if (s.toLowerCase().includes('patient')) prefix = 'Patient';
  else if (s.toLowerCase().includes('user') || s.toLowerCase().includes('role') || s.toLowerCase().includes('permission')) prefix = 'User & RBAC';
  else if (s.toLowerCase().includes('record') || s.toLowerCase().includes('attachment')) prefix = 'Medical Record';
  else if (s.toLowerCase().includes('staff') || s.toLowerCase().includes('shift')) prefix = 'Staff';
  else if (s.toLowerCase().includes('auth') || s.toLowerCase().includes('otp') || s.toLowerCase().includes('session')) prefix = 'Auth';
  
  if (!grouped[prefix]) grouped[prefix] = [];
  grouped[prefix].push(s);
}

for (const [g, list] of Object.entries(grouped)) {
  console.log(`\n=== GROUP: ${g} (${list.length} schemas) ===`);
  console.log(list.join(', '));
}
