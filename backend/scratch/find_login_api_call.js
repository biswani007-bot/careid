const fs = require('fs');

const bundle = fs.readFileSync('C:\\Users\\PABANI\\careidadmin-bundle.js', 'utf8');

const target = '/auth/password/login';
let pos = 0;
while (true) {
  const found = bundle.indexOf(target, pos);
  if (found === -1) break;
  console.log('Found occurrence at index:', found);
  console.log('--- Context ---');
  console.log(bundle.substring(Math.max(0, found - 300), Math.min(bundle.length, found + 500)));
  pos = found + target.length;
}

