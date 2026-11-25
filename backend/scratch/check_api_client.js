const fs = require('fs');

const bundle = fs.readFileSync('C:\\Users\\PABANI\\careidadmin-bundle.js', 'utf8');

const target = 'careid_access_token';
const idx = bundle.indexOf(target);
console.log('Context around careid_access_token:');
console.log(bundle.substring(idx - 100, idx + 800));

