const fs = require('fs');

const code = fs.readFileSync('scratch/figma_patient_profile_code.tsx', 'utf8');

const regex = /<img[^>]+src=\{([^}]+)\}[^>]*>/g;
let match;
while ((match = regex.exec(code)) !== null) {
  const varName = match[1];
  const start = Math.max(0, match.index - 150);
  const end = Math.min(code.length, match.index + 200);
  const snippet = code.slice(start, end).replace(/\s+/g, ' ');
  console.log(`=== ${varName} ===\n${snippet}\n`);
}
