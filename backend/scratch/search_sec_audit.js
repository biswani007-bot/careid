const fs = require('fs');

function searchInFile(f) {
  try {
    const content = fs.readFileSync(f, 'utf8');
    if (content.includes('Security Audit')) {
      console.log('Match in file:', f);
    }
  } catch(e) {}
}

const files = [
  'scratch/check-postman-collection.js',
  'scratch/verify-new-postman.js',
  'scratch/verify-postman-files.js',
  'scripts/generate-careid-postman.js',
  'test/security-audit-rbac.spec.ts',
  'test/security-audit-scope.spec.ts',
  'test/security-audit-real-http.spec.ts',
  'analysis_reports/careid_final_test_and_postman_verification.md'
];

files.forEach(searchInFile);

