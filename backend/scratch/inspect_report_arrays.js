const fs = require('fs');

const content = fs.readFileSync('scratch/build_full_report.js', 'utf8');

const pStart = content.indexOf('const patientScreens =');
const dStart = content.indexOf('const doctorScreens =');
const aStart = content.indexOf('const adminModules =');

const pSection = content.substring(pStart, dStart);
const dSection = content.substring(dStart, aStart);

const pMatches = (pSection.match(/"name":/g) || []).length;
const dMatches = (dSection.match(/name:/g) || []).length;

console.log('patientScreens count:', pMatches);
console.log('doctorScreens count:', dMatches);
