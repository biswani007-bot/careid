const fs = require('fs');
const content = fs.readFileSync('analysis_reports/stages_6_15_forensic_audit.md', 'utf8');

const sections = [
  '## Section A: Fully Implemented Stages',
  '## Section B: Partially Implemented Stages',
  '## Section C: Missing Backend APIs',
  '## Section D: Missing Frontend Functionality',
  '## Section E: Hardcoded Data Locations',
  '## Section F: Broken Navigation and ID Propagation',
  '## Section G: Figma Mismatches',
  '## Section H: Required Implementation Order',
  '## Section I: Static Analysis Verification Results'
];

for (const sec of sections) {
  if (content.includes(sec)) {
    console.log(`Found: ${sec}`);
  } else {
    console.error(`MISSING: ${sec}`);
  }
}
