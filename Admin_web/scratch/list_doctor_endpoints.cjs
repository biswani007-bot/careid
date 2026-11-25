const fs = require('fs');

const openapi = JSON.parse(fs.readFileSync('scratch/live_openapi.json', 'utf8'));
const paths = Object.keys(openapi.paths);
const docPaths = paths.filter(p => p.startsWith('/api/v1/doctors'));
console.log('Total /api/v1/doctors paths:', docPaths.length);
docPaths.forEach(p => console.log(' ', p));

