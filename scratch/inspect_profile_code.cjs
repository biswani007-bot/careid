const fs = require('fs');

const code = fs.readFileSync('scratch/figma_patient_profile_code.tsx', 'utf8');
const urls = code.match(/https:\/\/[^"'\s)]+/g) || [];
console.log('URLs found:', [...new Set(urls)]);

// Also let's inspect the main sections/JSX structure
console.log('Code length:', code.length);
// Let's print the top 100 lines
const lines = code.split('\n');
console.log('Total lines:', lines.length);
console.log('First 60 lines:\n', lines.slice(0, 60).join('\n'));
