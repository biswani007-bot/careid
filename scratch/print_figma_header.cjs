const fs = require('fs');

const text = fs.readFileSync('C:\\Users\\biswa\\.gemini\\antigravity-ide\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e\\.system_generated\\steps\\5824\\output.txt', 'utf8');

const lines = text.split('\n');
console.log(lines.slice(1000, 1100).join('\n'));
