const fs = require('fs');

const text = fs.readFileSync('C:\\Users\\biswa\\.gemini\\antigravity-ide\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e\\.system_generated\\steps\\5286\\output.txt', 'utf8');

// Find all elements with data-name or name in the JSX output
const nameMatches = text.match(/data-name="([^"]+)"/g) || [];
const uniqueNames = [...new Set(nameMatches.map(m => m.replace('data-name="', '').replace('"', '')))];

console.log('Unique Section/Component names:');
uniqueNames.forEach(n => console.log(' - ' + n));

// Find all text blocks
const textMatches = text.match(/<p [^>]*>([^<]+)<\/p>/g) || [];
console.log('\nAll text paragraphs:');
textMatches.forEach(t => console.log(' > ' + t.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ')));
