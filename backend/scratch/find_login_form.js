const fs = require('fs');

const bundle = fs.readFileSync('C:\\Users\\PABANI\\careidadmin-bundle.js', 'utf8');

const loginTextIdx = bundle.indexOf('CareID Admin Portal — Secure Login');
console.log('Login title index:', loginTextIdx);
if (loginTextIdx !== -1) {
  console.log(bundle.substring(loginTextIdx - 500, loginTextIdx + 1000));
}

// Find login form fields and handlers
const authLoginIdx = bundle.indexOf('auth/password/login');
console.log('auth/password/login index:', authLoginIdx);
if (authLoginIdx !== -1) {
  console.log(bundle.substring(authLoginIdx - 400, authLoginIdx + 800));
}

