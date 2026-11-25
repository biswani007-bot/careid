const fs = require('fs');

const bundle = fs.readFileSync('C:\\Users\\PABANI\\careidadmin-bundle.js', 'utf8');

// Look for JSX route definitions or string literals starting with '/'
const matches = bundle.match(/["']\/[a-z0-9_-]+["']/g) || [];
const unique = Array.from(new Set(matches)).map(s => s.replace(/["']/g, '')).sort();
console.log('Short root paths:', unique.filter(p => !p.startsWith('/api') && !p.startsWith('/assets')));

// Search for login page implementation
const loginSnippet = bundle.indexOf('CareID Admin Portal');
if (loginSnippet !== -1) {
  console.log('Login snippet found at index:', loginSnippet);
  console.log(bundle.substring(loginSnippet - 200, loginSnippet + 600));
} else {
  console.log('Did not find CareID Admin Portal text directly');
}

// Search for 'POST' and 'auth/password/login'
const loginApiIdx = bundle.indexOf('/auth/password/login');
if (loginApiIdx !== -1) {
  console.log('Login API call snippet:');
  console.log(bundle.substring(loginApiIdx - 300, loginApiIdx + 300));
}

