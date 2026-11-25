const fs = require('fs');
const path = require('path');

// Verify we can read the parsed data
const endpoints = JSON.parse(fs.readFileSync('scratch/ast_verified_endpoints.json', 'utf8'));
console.log('Endpoints loaded:', endpoints.length);
