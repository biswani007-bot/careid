const fs = require('fs');

const content = fs.readFileSync('scratch/admin_page_metadata.xml', 'utf8');
const lines = content.split(/\r?\n/);
console.log('Total lines in admin_page_metadata.xml:', lines.length);

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('name="Admin Portal') || line.includes('Admin Portal')) {
    console.log(`Line ${i + 1}: ${line.trim().slice(0, 120)}`);
  }
}
