const fs = require('fs');

const bundle = fs.readFileSync('C:\\Users\\PABANI\\careidadmin-bundle.js', 'utf8');

const target = 'USER_SESSION:';
const idx = bundle.indexOf(target);
if (idx !== -1) {
  console.log('USER_SESSION defined at:', idx);
  console.log(bundle.substring(idx - 100, idx + 300));
} else {
  const m = bundle.match(/[a-zA-Z0-9_$]+\s*=\s*\{[^\}]*USER_SESSION[^\}]*\}/);
  console.log('Match:', m ? m[0] : 'null');
}

