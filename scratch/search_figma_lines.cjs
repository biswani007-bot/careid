const fs = require('fs');

const text = fs.readFileSync('C:\\Users\\biswa\\.gemini\\antigravity-ide\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e\\.system_generated\\steps\\5824\\output.txt', 'utf8');

// Find occurrences of Header or TopBar or Breadcrumb
const lines = text.split('\n');
console.log('Total lines:', lines.length);

// Look for lines containing "Admin Portal" or "Search facilities" or "Return to Facility Details"
lines.forEach((line, idx) => {
  if (line.includes('Admin Portal') || line.includes('Return to Facility Details') || line.includes('Staff & Governance Mapping')) {
    console.log(`Line ${idx}: ${line.trim()}`);
  }
});
