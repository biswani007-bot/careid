const fs = require('fs');
const path = require('path');

// Extract patientScreens from generate_final_master_report.js
const reportContent = fs.readFileSync('scratch/generate_final_master_report.js', 'utf8');
const pMatch = reportContent.match(/const patientScreens = (\[[\s\S]*?\n\];)/);
let patientScreens = [];
if (pMatch) {
  eval('patientScreens = ' + pMatch[1]);
}
console.log('Successfully loaded patientScreens:', patientScreens.length);

// Now load build_full_report.js Doctor screens and complete execution
let buildContent = fs.readFileSync('scratch/build_full_report.js', 'utf8');

// Replace the top of build_full_report.js with patientScreens definition
buildContent = buildContent.replace(
  "const baseContent = fs.readFileSync('scratch/build_full_report.js', 'utf8');",
  "const patientScreens = " + JSON.stringify(patientScreens, null, 2) + ";"
);

fs.writeFileSync('scratch/build_full_report.js', buildContent, 'utf8');
console.log('Updated scratch/build_full_report.js with full patientScreens array');
