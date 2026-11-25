const fs = require('fs');

const bundle = fs.readFileSync('C:\\Users\\PABANI\\careidadmin-bundle.js', 'utf8');
console.log('Bundle loaded. Length:', bundle.length);

// 1. Look for API Base URL
const apiMatch = bundle.match(/https?:\/\/[a-zA-Z0-9.-]+\/api\/v1[a-zA-Z0-9/_.-]*/g) || [];
console.log('--- API URLs Found ---');
console.log(Array.from(new Set(apiMatch)).slice(0, 30));

// 2. Look for /api/v1/ endpoints
const endpointMatches = bundle.match(/\/api\/v1\/[a-zA-Z0-9_/-]+/g) || [];
console.log('--- Relative API Endpoints Found (' + endpointMatches.length + ' total) ---');
const uniqueEndpoints = Array.from(new Set(endpointMatches));
console.log(uniqueEndpoints.sort());

// 3. Look for routes (e.g. path: "/...")
const pathMatches = bundle.match(/path:\s*["']\/[a-zA-Z0-9/:_-]*["']/g) || [];
console.log('--- Route Paths Found ---');
console.log(Array.from(new Set(pathMatches)).sort());

// 4. Look for localStorage keys (e.g. token, session)
const storageMatches = bundle.match(/localStorage\.(getItem|setItem|removeItem)\(["'][a-zA-Z0-9_.-]+["']\)/g) || [];
console.log('--- LocalStorage operations ---');
console.log(Array.from(new Set(storageMatches)));

// 5. Look for module/navigation names
const keywords = [
  'dashboard', 'analytics', 'patients', 'doctors', 'facilities', 'departments',
  'medical-records', 'dental', 'vision', 'ocr', 'referrals', 'treatment-offers',
  'pricing', 'cms', 'policies', 'audit-logs', 'roles', 'permissions', 'settings'
];

console.log('--- Keyword Presence ---');
keywords.forEach(kw => {
  const count = (bundle.match(new RegExp(kw, 'gi')) || []).length;
  console.log(`${kw}: ${count} occurrences`);
});

