const fs = require('fs');

const p = 'C:/Users/PABANI/.gemini/antigravity/brain/1fe01e76-f086-43fc-988c-36127d08d24f/CAREID_MASTER_FIGMA_PRD_BACKEND_COMPLETION_REPORT.md';
const content = fs.readFileSync(p, 'utf8');

const undefCount = (content.match(/undefined/g) || []).length;
console.log('Total occurrences of undefined in master report:', undefCount);
console.log('Total lines in master report:', content.split('\n').length);

const lines = content.split('\n');
const samplePatientRows = lines.filter(l => l.includes('`20:24965`') || l.includes('`20:25032`') || l.includes('`20:30644`'));
console.log('Sample Patient Rows:');
samplePatientRows.forEach(r => console.log('  ', r));
