const fs = require('fs');
const content = fs.readFileSync('analysis_reports/stages_6_15_forensic_audit.md', 'utf8');

const stages = [
  'Stage 6: Clinical Review',
  'Stage 7: Dispatched Status',
  'Stage 8: Offer Accepted',
  'Stage 9: Pre-Op Clearance',
  'Stage 10: Suite Scheduling',
  'Stage 11: Hold Review',
  'Stage 12: Slot Confirmed',
  'Stage 13: Appointment Ledger',
  'Stage 14: Pre-Op Readiness',
  'Stage 15: Day-of-Checkin'
];

const dimensions = [
  '1. React Component and Route Binding',
  '2. Figma Design Correspondence',
  '3. Backend API Availability',
  '4. Actual Frontend Service Implementation',
  '5. Request and Response DTO Alignment',
  '6. Patient and Treatment-Offer ID Propagation',
  '7. Authentication and Authorization',
  '8. Loading, Error, and Empty States',
  '9. Actual Data Persistence',
  '10. Hardcoded Values and Mock Data Locations',
  '11. Lifecycle Transition Validation',
  '12. Refresh and Direct URL Hydration'
];

for (let i = 0; i < stages.length; i++) {
  const stageName = stages[i];
  const nextStage = i < stages.length - 1 ? stages[i + 1] : '## Section A:';
  const stageStart = content.indexOf(`### ${stageName}`);
  const stageEnd = content.indexOf(`### ${nextStage}`, stageStart);
  const stageText = content.slice(stageStart, stageEnd);

  console.log(`Checking ${stageName}...`);
  for (const dim of dimensions) {
    if (!stageText.includes(`#### ${dim}`)) {
      console.error(`  MISSING dimension: ${dim}`);
    }
  }
  if (!stageText.includes(`Stage-Specific Critical Invariant Assessment`)) {
    console.error(`  MISSING Critical Invariant Assessment`);
  }
}
console.log('Finished stage checks.');
