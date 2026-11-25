const fs = require('fs');

const envFiles = [
  'CareID-Staging.postman_environment.json',
  'CareID-Staging.postman_environment.backup-2026-10-30.json',
  'Health-Vault-360-Local.postman_environment.json',
  '.env',
  '.env.example',
  '.env.staging',
  '.env.test',
  '.env.production'
];

envFiles.forEach(f => {
  if (fs.existsSync(f)) {
    console.log(`=== ${f} ===`);
    const txt = fs.readFileSync(f, 'utf8');
    const lines = txt.split('\n').filter(l => l.includes('URL') || l.includes('baseUrl') || l.includes('HOST') || l.includes('PORT') || l.includes('360api'));
    console.log(lines.slice(0, 10).join('\n'));
  }
});

