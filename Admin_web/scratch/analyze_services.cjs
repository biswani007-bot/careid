const fs = require('fs');

// Scan all services in src/services
const serviceFiles = fs.readdirSync('src/services').filter(f => f.endsWith('.ts'));
const servicesSummary = [];

for (const sf of serviceFiles) {
  const content = fs.readFileSync('src/services/' + sf, 'utf8');
  // Match endpoints
  const endpointMatches = [...content.matchAll(/(apiClient\.(get|post|put|patch|delete)<[^>]*>\(['"]([^'"]+)['"])/g)];
  const endpoints = endpointMatches.map(m => ({ method: m[2].toUpperCase(), url: m[3] }));

  // Also match raw url strings
  const rawUrls = [...content.matchAll(/['"](\/api\/v1\/[^'"]+)['"]/g)].map(m => m[1]);

  servicesSummary.push({
    file: sf,
    endpoints: [...new Set(endpoints.map(e => `${e.method} ${e.url}`))],
    rawUrls: [...new Set(rawUrls)]
  });
}

fs.writeFileSync('scratch/services_endpoints.json', JSON.stringify(servicesSummary, null, 2));
console.log('Services analyzed:', servicesSummary.length);
servicesSummary.forEach(s => {
  console.log(`\n=== ${s.file} (${s.endpoints.length} API calls) ===`);
  s.endpoints.slice(0, 10).forEach(e => console.log('  ' + e));
  if (s.endpoints.length > 10) console.log(`  ... and ${s.endpoints.length - 10} more`);
});

