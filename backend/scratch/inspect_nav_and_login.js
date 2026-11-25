const fs = require('fs');

const bundle = fs.readFileSync('C:\\Users\\PABANI\\careidadmin-bundle.js', 'utf8');

// Look for navigation groups or sidebar structure
const idx = bundle.indexOf('sidebar:');
if (idx !== -1) {
  console.log('Sidebar section found at', idx);
  console.log(bundle.substring(idx - 100, idx + 800));
} else {
  console.log('No direct "sidebar:" string');
}

// Look for navigation menu titles
const navMatches = bundle.match(/navigation:\{[^\}]+\}/g);
if (navMatches) {
  console.log('Navigation matches:', navMatches);
}

// Let's inspect the login page structure and form validation
const loginIdx = bundle.indexOf('login:{');
if (loginIdx !== -1) {
  console.log('Login translation:');
  console.log(bundle.substring(loginIdx, loginIdx + 1200));
}

