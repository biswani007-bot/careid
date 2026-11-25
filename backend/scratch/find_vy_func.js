const fs = require('fs');

const bundle = fs.readFileSync('C:\\Users\\PABANI\\careidadmin-bundle.js', 'utf8');

const target = 'function Vy(';
let idx = bundle.indexOf(target);
if (idx === -1) {
  const m = bundle.match(/Vy\s*=\s*async\s*\(/);
  console.log('Match:', m ? m[0] : 'null');
  if (m) {
    const idx2 = bundle.indexOf(m[0]);
    console.log(bundle.substring(idx2, idx2 + 1000));
  }
} else {
  console.log('Found Vy at', idx);
  console.log(bundle.substring(idx, idx + 1000));
}

