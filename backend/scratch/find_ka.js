const fs = require('fs');

const bundle = fs.readFileSync('C:\\Users\\PABANI\\careidadmin-bundle.js', 'utf8');

const target = 'function ka(';
let idx = bundle.indexOf(target);
if (idx === -1) {
  // Try ka=
  const matches = bundle.match(/[a-zA-Z0-9_$]+\s*=\s*\(\)\s*=>\s*[`"']https?:\/\/[^`"']+[`"']/g) || [];
  console.log('Arrow base url matches:', matches);
  
  // Search for ka=
  const kaMatch = bundle.indexOf('ka=');
  console.log('ka= index:', kaMatch);
  if (kaMatch !== -1) {
    console.log(bundle.substring(kaMatch - 50, kaMatch + 200));
  }
} else {
  console.log('Found function ka at', idx);
  console.log(bundle.substring(idx, idx + 300));
}

