const fs = require('fs');

const summary = JSON.parse(fs.readFileSync('scratch/module_endpoints_summary.json', 'utf8'));

const keyTags = [
  'Authentication & Identity',
  'Admin',
  'Patients',
  'Doctors',
  'Facilities',
  'Staff',
  'Medical Records',
  'OCR & Document Processing',
  'Attachments Platform'
];

for (const tag of keyTags) {
  console.log(`\n======================================================`);
  console.log(`TAG: ${tag} (${summary[tag]?.length || 0} endpoints)`);
  console.log(`======================================================`);
  for (const ep of summary[tag] || []) {
    const params = ep.parameters.map(p => `${p.name} (${p.in}${p.required ? ', req' : ''})`).join(', ');
    const body = ep.hasRequestBody ? `[Body: ${ep.requestBodyContent.join('/')}]` : '';
    console.log(`${ep.method.padEnd(6)} ${ep.path.padEnd(52)} ${body} ${ep.summary ? `- ${ep.summary}` : ''}`);
    if (params) {
      console.log(`       Params: ${params}`);
    }
  }
}
