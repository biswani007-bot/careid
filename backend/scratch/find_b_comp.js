const fs = require('fs');

const bundle = fs.readFileSync('C:\\Users\\PABANI\\careidadmin-bundle.js', 'utf8');

const target = 'function _b(';
let idx = bundle.indexOf(target);
if (idx === -1) {
  const m = bundle.match(/_b\s*=\s*\([^)]*\)\s*=>/);
  console.log('Match:', m ? m[0] : 'null');
  if (m) {
    const idx2 = bundle.indexOf(m[0]);
    console.log(bundle.substring(idx2, idx2 + 1500));
  }
} else {
  console.log('Found _b at', idx);
  console.log(bundle.substring(idx, idx + 1500));
}

