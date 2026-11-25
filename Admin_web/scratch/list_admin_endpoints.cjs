const fs = require('fs');

const openapi = JSON.parse(fs.readFileSync('scratch/live_openapi.json', 'utf8'));
const paths = Object.keys(openapi.paths);
const adminPaths = paths.filter(p => p.startsWith('/api/v1/admin'));
console.log('Total /api/v1/admin paths deployed on staging server:', adminPaths.length);
adminPaths.forEach(p => console.log(' ', p, Object.keys(openapi.paths[p])));
