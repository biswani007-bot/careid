const fs = require('fs');
const path = require('path');

const routes = JSON.parse(fs.readFileSync('scratch/all_backend_routes.json', 'utf8'));

// Helper to search routes by regex or substring
function findRoutes(pattern) {
  const re = typeof pattern === 'string' ? new RegExp(pattern, 'i') : pattern;
  return routes.filter(r => re.test(r.fullPath) || re.test(r.handler) || re.test(r.controller));
}

console.log('Sample routes found:');
console.log('Auth:', findRoutes('/auth/').map(r => `${r.httpMethod} ${r.fullPath} -> ${r.controller}.${r.handler}`));
console.log('Patient:', findRoutes('/patient').slice(0, 10).map(r => `${r.httpMethod} ${r.fullPath} -> ${r.controller}.${r.handler}`));
console.log('Doctor:', findRoutes('/doctor').slice(0, 10).map(r => `${r.httpMethod} ${r.fullPath} -> ${r.controller}.${r.handler}`));
console.log('Appointment:', findRoutes('/appointment').map(r => `${r.httpMethod} ${r.fullPath} -> ${r.controller}.${r.handler}`));
console.log('Referral:', findRoutes('/referral').map(r => `${r.httpMethod} ${r.fullPath} -> ${r.controller}.${r.handler}`));
console.log('Insurance:', findRoutes('/insurance').map(r => `${r.httpMethod} ${r.fullPath} -> ${r.controller}.${r.handler}`));
console.log('Financing / Treatment Offers:', findRoutes('/treatment-offer|/financing').map(r => `${r.httpMethod} ${r.fullPath} -> ${r.controller}.${r.handler}`));
console.log('Medical Records:', findRoutes('/medical-record').map(r => `${r.httpMethod} ${r.fullPath} -> ${r.controller}.${r.handler}`));
console.log('Dental / Vision / Lab / CathLab:', findRoutes('/dental|/vision|/laboratory|/cath-lab').map(r => `${r.httpMethod} ${r.fullPath} -> ${r.controller}.${r.handler}`));
console.log('Messaging / Notifications:', findRoutes('/messaging|/notification').slice(0, 10).map(r => `${r.httpMethod} ${r.fullPath} -> ${r.controller}.${r.handler}`));
console.log('Family / QR:', findRoutes('/family|/qr').slice(0, 10).map(r => `${r.httpMethod} ${r.fullPath} -> ${r.controller}.${r.handler}`));
console.log('Admin:', findRoutes('/admin').slice(0, 10).map(r => `${r.httpMethod} ${r.fullPath} -> ${r.controller}.${r.handler}`));
