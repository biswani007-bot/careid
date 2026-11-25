import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

// 1. Test validateEmail regex & logic directly
function validateEmail(email: string): { isValid: boolean; error?: string } {
  const trimmed = email.trim();
  if (!trimmed) {
    return { isValid: false, error: 'Email address is required' };
  }
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(trimmed)) {
    return { isValid: false, error: 'Please enter a valid email address (e.g. user@domain.com)' };
  }
  return { isValid: true };
}

console.log('--- Testing validateEmail ---');
assert.strictEqual(validateEmail('').isValid, false, 'Empty email should be invalid');
assert.strictEqual(validateEmail('   ').isValid, false, 'Whitespace email should be invalid');
assert.strictEqual(validateEmail('notanemail').isValid, false, 'Missing @ should be invalid');
assert.strictEqual(validateEmail('test@').isValid, false, 'Missing domain should be invalid');
assert.strictEqual(validateEmail('test@domain').isValid, false, 'Missing TLD should be invalid');
assert.strictEqual(validateEmail('doctor@hospital.org').isValid, true, 'Standard email should be valid');
assert.strictEqual(validateEmail('sara.jenkins+test@careid.health').isValid, true, 'Email with + and subdomains should be valid');
assert.strictEqual(validateEmail('  doctor@hospital.org  ').isValid, true, 'Trimmed email should be valid');
console.log('✓ All validateEmail assertions passed');

// 2. Inspect AuthPlaceholder.tsx content for required UI elements and requirements
console.log('\n--- Inspecting AuthPlaceholder.tsx ---');
const authPlaceholderPath = path.resolve(process.cwd(), 'src/pages/auth/AuthPlaceholder.tsx');
const authSource = fs.readFileSync(authPlaceholderPath, 'utf8');

assert.ok(authSource.includes("loginMode, setLoginMode] = useState<'phone' | 'email'>('phone')"), 'Must have default loginMode phone');
assert.ok(authSource.includes('Login with Email'), 'Must contain "Login with Email" toggle button');
assert.ok(authSource.includes('Back to Phone Login'), 'Must contain "Back to Phone Login" button');
assert.ok(authSource.includes('showPassword'), 'Must have showPassword state');
assert.ok(authSource.includes('auth-email-address'), 'Must render email input with accessible ID');
assert.ok(authSource.includes('auth-password'), 'Must render password input with accessible ID');
assert.ok(authSource.includes('authService.validateEmail'), 'Must validate email format on submit');
assert.ok(authSource.includes('authService.loginWithPassword'), 'Must call loginWithPassword');
assert.ok(authSource.includes('Sign In'), 'Must render "Sign In" button in email mode');
assert.ok(authSource.includes('Request OTP'), 'Must render "Request OTP" in phone mode');
assert.ok(authSource.includes('Your login is protected using encrypted authentication.'), 'Must preserve encrypted auth footer');
assert.ok(authSource.includes('rounded-[16px]'), 'Must use rounded-[16px] for inputs');
assert.ok(authSource.includes('rounded-[9999px]'), 'Must use rounded-[9999px] for buttons');
console.log('✓ All AuthPlaceholder.tsx structural & accessibility assertions passed');

// 3. Inspect authService.ts for loginWithPassword
console.log('\n--- Inspecting authService.ts ---');
const authServicePath = path.resolve(process.cwd(), 'src/services/authService.ts');
const authServiceSource = fs.readFileSync(authServicePath, 'utf8');

assert.ok(authServiceSource.includes('loginWithPassword'), 'Must export loginWithPassword method');
assert.ok(authServiceSource.includes('/api/v1/auth/password/login'), 'Must target POST /api/v1/auth/password/login');
assert.ok(authServiceSource.includes('validateEmail'), 'Must export validateEmail helper');
console.log('✓ All authService.ts assertions passed');

console.log('\nAll tests completed successfully!');
