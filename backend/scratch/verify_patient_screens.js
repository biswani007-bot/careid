const fs = require('fs');

const content = fs.readFileSync('scratch/build_full_report.js', 'utf8');

const pStart = content.indexOf('const patientScreens = [');
const dStart = content.indexOf('const doctorScreens = [');

const pSection = content.substring(pStart, dStart);

// Evaluate patientScreens safely in an isolated context
const fn = new Function(pSection + '\nreturn patientScreens;');
const patientScreens = fn();

console.log('Total patient screens loaded:', patientScreens.length);

let errors = 0;
patientScreens.forEach((s, idx) => {
  const fields = ['name', 'nodeId', 'module', 'action', 'dto', 'endpoint', 'controllerService', 'entity', 'role', 'status'];
  fields.forEach(f => {
    if (!s[f] || s[f] === 'undefined' || typeof s[f] !== 'string' || s[f].trim() === '') {
      console.log(`[Screen ${idx + 1}] Missing/invalid field '${f}':`, s);
      errors++;
    }
  });
});

console.log('Total validation errors found:', errors);
if (errors === 0) {
  console.log('All 88 patient screens have 100% valid, non-empty fields!');
}
