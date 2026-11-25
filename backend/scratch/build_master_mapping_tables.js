const fs = require('fs');
const path = require('path');

// Load parsed AST endpoints
const endpoints = JSON.parse(fs.readFileSync('scratch/ast_verified_endpoints.json', 'utf8'));

// Helper to find endpoints by path regex or handler
function findEps(pathRegex, method = null) {
  return endpoints.filter(e => {
    const pMatch = pathRegex.test(e.fullPath) || pathRegex.test(e.subPath);
    const mMatch = method ? e.httpMethod === method.toUpperCase() : true;
    return pMatch && mMatch;
  });
}

console.log('Total available endpoints in index:', endpoints.length);
