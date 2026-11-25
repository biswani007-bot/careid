const fs = require('fs');
const path = require('path');

const endpoints = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'all_endpoints_detail.json'), 'utf8'));
const apiUsages = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'frontend_api_usages.json'), 'utf8'));

// Extract URL literals from code lines
const literalRegex = /['"`](\/api\/v1\/[^'"`]+)['"`]/g;
const extractedUrls = [];

for (const u of apiUsages) {
  let match;
  while ((match = literalRegex.exec(u.line)) !== null) {
    extractedUrls.push({
      url: match[1],
      file: u.file,
      lineNum: u.lineNum,
      rawLine: u.line
    });
  }
}

console.log('Total extracted /api/v1 URLs in frontend:', extractedUrls.length);

// Normalize URL for comparison (replace ${...} or :param with a placeholder)
function normalizeUrl(url) {
  return url
    .replace(/\$\{[^}]+\}/g, ':param')
    .replace(/\/([0-9a-fA-F-]{36})(?=\/|$)/g, '/:param')
    .split('?')[0];
}

const postmanUrls = endpoints.map(e => {
  const clean = e.url.replace('{{baseUrl}}', '').split('?')[0];
  return {
    method: e.method,
    url: clean,
    folder: e.folder,
    name: e.name,
    rawUrl: e.url
  };
});

function matchPostman(frontendUrl) {
  const normFront = normalizeUrl(frontendUrl);
  
  // Try direct match or regex match
  for (const p of postmanUrls) {
    const normPost = p.url.replace(/:[a-zA-Z0-9_]+/g, ':param');
    if (normPost === normFront) {
      return p;
    }
  }
  
  // Try pattern matching where parameters match
  for (const p of postmanUrls) {
    const pattern = '^' + p.url.replace(/:[a-zA-Z0-9_]+/g, '[^/]+') + '$';
    const regex = new RegExp(pattern);
    const cleanFront = frontendUrl.replace(/\$\{[^}]+\}/g, 'uuid').split('?')[0];
    if (regex.test(cleanFront)) {
      return p;
    }
  }
  
  return null;
}

const auditResults = [];
const uniqueUrls = new Map();

for (const item of extractedUrls) {
  const cleanUrl = item.url.split('?')[0];
  if (!uniqueUrls.has(cleanUrl)) {
    const postmanMatch = matchPostman(cleanUrl);
    uniqueUrls.set(cleanUrl, {
      url: cleanUrl,
      files: [`${item.file}:${item.lineNum}`],
      postmanMatch: postmanMatch ? `${postmanMatch.method} ${postmanMatch.url} (${postmanMatch.folder} > ${postmanMatch.name})` : 'MISSING_IN_POSTMAN'
    });
  } else {
    uniqueUrls.get(cleanUrl).files.push(`${item.file}:${item.lineNum}`);
  }
}

const finalSummary = Array.from(uniqueUrls.values());
console.log('Unique frontend endpoints count:', finalSummary.length);

const matchedCount = finalSummary.filter(s => s.postmanMatch !== 'MISSING_IN_POSTMAN').length;
const missingCount = finalSummary.filter(s => s.postmanMatch === 'MISSING_IN_POSTMAN').length;

console.log(`Matched: ${matchedCount}, Missing in Postman: ${missingCount}`);

fs.writeFileSync(path.resolve(__dirname, 'frontend_endpoint_cross_audit.json'), JSON.stringify(finalSummary, null, 2), 'utf8');

let md = `# Frontend Endpoints vs Postman Cross-Audit\n\n`;
md += `**Total Unique Frontend Endpoints**: ${finalSummary.length}\n`;
md += `**Matched in Postman**: ${matchedCount}\n`;
md += `**Missing / Not in Postman**: ${missingCount}\n\n`;

md += `## 1. Endpoints Present in Postman\n\n`;
for (const s of finalSummary.filter(s => s.postmanMatch !== 'MISSING_IN_POSTMAN')) {
  md += `- \`${s.url}\`\n  - Postman: \`${s.postmanMatch}\`\n  - Referenced in: ${s.files.map(f => `\`${f}\``).join(', ')}\n`;
}

md += `\n## 2. Endpoints Missing in Postman (Not in Backend Contract)\n\n`;
for (const s of finalSummary.filter(s => s.postmanMatch === 'MISSING_IN_POSTMAN')) {
  md += `- \`${s.url}\`\n  - Postman: **MISSING**\n  - Referenced in: ${s.files.map(f => `\`${f}\``).join(', ')}\n`;
}

fs.writeFileSync(path.resolve(__dirname, 'frontend_endpoint_cross_audit.md'), md, 'utf8');
console.log('Saved frontend_endpoint_cross_audit.md');
