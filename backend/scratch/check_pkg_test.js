const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
console.log('scripts.test:', pkg.scripts?.test);
console.log('jest config:', pkg.jest ? 'in package.json' : 'external');

