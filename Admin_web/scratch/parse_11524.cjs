const fs = require('fs');

const text = fs.readFileSync('C:\\Users\\biswa\\.gemini\\antigravity-ide\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e\\.system_generated\\steps\\5824\\output.txt', 'utf8');

console.log('Total characters in design context:', text.length);

// Print first 1500 chars to see format
console.log(text.slice(0, 1500));
