const fs = require('fs');

const summary = JSON.parse(fs.readFileSync('scratch/module_endpoints_summary.json', 'utf8'));

for (const [tag, endpoints] of Object.entries(summary)) {
  console.log(`\n======================================================`);
  console.log(`TAG: ${tag} (${endpoints.length} endpoints)`);
  console.log(`======================================================`);
  for (const ep of endpoints) {
    const params = ep.parameters.map(p => `${p.name} (${p.in}${p.required ? ', req' : ''})`).join(', ');
    const body = ep.hasRequestBody ? `[Body: ${ep.requestBodyContent.join('/')}]` : '';
    console.log(`${ep.method.padEnd(6)} ${ep.path.padEnd(52)} ${body} ${ep.summary ? `- ${ep.summary}` : ''}`);
    if (params) {
      console.log(`       Params: ${params}`);
    }
  }
}
