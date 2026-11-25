const fs = require('fs');
const content = fs.readFileSync('C:/Users/PABANI/.gemini/antigravity/brain/1fe01e76-f086-43fc-988c-36127d08d24f/CAREID_PATIENT_APP_MASTER_AUDIT_REPORT.md', 'utf8');
const undefCount = (content.match(/undefined/g) || []).length;
console.log('Total occurrences of undefined:', undefCount);
console.log('Total lines:', content.split('\n').length);
console.log('First 5 rows of table:');
content.split('\n').filter(l => l.startsWith('| **')).slice(0, 5).forEach(l => console.log(l));
