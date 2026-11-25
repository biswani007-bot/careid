const fs = require('fs');
const files = [
  'CareID-Staging.postman_collection.json',
  'CareID-Staging.postman_environment.json',
  'CareID-Production.postman_environment.json',
  'docs/postman/CareID-Staging.postman_collection.json',
  'docs/postman/CareID-Staging.postman_environment.json',
  'docs/postman/CareID-Production.postman_environment.json'
];
files.forEach(f => {
  if (fs.existsSync(f)) {
    const text = fs.readFileSync(f, 'utf8');
    const hasSecret = text.includes('eyJhbGci') || text.includes('BEGIN PRIVATE');
    console.log(`${f}: size=${fs.statSync(f).size} bytes, hasSecret=${hasSecret}`);
  }
});

