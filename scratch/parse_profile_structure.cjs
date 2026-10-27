const fs = require('fs');

const code = fs.readFileSync('scratch/figma_patient_profile_code.tsx', 'utf8');

// Find all data-name elements
const dataNames = [...code.matchAll(/data-name="([^"]+)"/g)].map(m => m[1]);
console.log('Unique data-names:');
console.log([...new Set(dataNames)].join('\n'));

// Let's also print lines 60 to 300 to see page header, left column, right column
const lines = code.split('\n');
fs.writeFileSync('scratch/profile_structure_sample.txt', lines.slice(60, 450).join('\n'));
console.log('Wrote sample lines 60-450 to scratch/profile_structure_sample.txt');
