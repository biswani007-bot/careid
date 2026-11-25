const fs = require('fs');

const bundle = fs.readFileSync('C:\\Users\\PABANI\\careidadmin-bundle.js', 'utf8');

// Search for route patterns in minified react router
const routePatterns = bundle.match(/\{path:\s*["'][^"']+["']/g) || [];
console.log('--- Routes ({path: "..."}) ---');
console.log(Array.from(new Set(routePatterns)).sort());

// Search for element / lazy imports or component names
const navItems = bundle.match(/label:\s*["'][^"']+["'],\s*(icon|path|href):/gi) || [];
console.log('--- Navigation Items ---');
console.log(navItems);

// Search for title or headings
const titles = bundle.match(/["']([A-Z][a-zA-Z\s]{3,30})["']/g) || [];
const interestingTitles = titles.filter(t => /Dashboard|Patient|Doctor|Facility|Department|OCR|Audit|Referral|Security|Settings|Login|Analytics/i.test(t));
console.log('--- Sample Interesting UI Labels ---');
console.log(Array.from(new Set(interestingTitles)).slice(0, 50));

// Search for login form fields
const loginHints = bundle.match(/identifier|username|email|password|rememberMe|submit|Forgot password/gi) || [];
console.log('--- Login fields presence ---');
const counts = {};
loginHints.forEach(h => {
  const k = h.toLowerCase();
  counts[k] = (counts[k] || 0) + 1;
});
console.log(counts);

