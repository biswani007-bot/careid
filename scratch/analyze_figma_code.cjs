const fs = require('fs');
const code = fs.readFileSync('scratch/figma_patient_directory_code.tsx', 'utf8');

const lines = code.split('\n');
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('data-node-id=')) {
    const idMatch = line.match(/data-node-id="([^"]+)"/);
    const prevComments = [];
    for (let j = Math.max(0, i - 4); j < i; j++) {
      if (lines[j].trim().startsWith('{/*') || lines[j].trim().startsWith('//')) {
        prevComments.push(lines[j].trim());
      }
    }
    console.log(`Line ${i}: ID=${idMatch ? idMatch[1] : ''} ${prevComments.join(' | ')} | ${line.trim().slice(0, 90)}`);
  }
}
