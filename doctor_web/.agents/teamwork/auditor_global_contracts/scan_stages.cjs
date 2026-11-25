const fs = require('fs');
const path = require('path');

const pages = [
  { stage: 6, name: 'Clinical Review', file: 'src/pages/treatment-offers/TreatmentOfferReviewPage.tsx' },
  { stage: 7, name: 'Dispatched Status', file: 'src/pages/treatment-offers/TreatmentOfferStatusPage.tsx' },
  { stage: 8, name: 'Offer Accepted', file: 'src/pages/treatment-offers/TreatmentOfferAcceptedPage.tsx' },
  { stage: 9, name: 'Pre-Op Clearance', file: 'src/pages/treatment-offers/ClinicalHandoffPage.tsx' },
  { stage: 10, name: 'Suite Scheduling', file: 'src/pages/treatment-offers/ProcedureSchedulingPage.tsx' },
  { stage: 11, name: 'Hold Review', file: 'src/pages/treatment-offers/ProcedureSchedulingPage.tsx' },
  { stage: 12, name: 'Slot Confirmed', file: 'src/pages/treatment-offers/ProcedureSchedulingPage.tsx' },
  { stage: 13, name: 'Appointment Ledger', file: 'src/pages/treatment-offers/AppointmentDetailsPage.tsx' },
  { stage: 14, name: 'Pre-Op Readiness', file: 'src/pages/treatment-offers/PreOpReadinessPage.tsx' },
  { stage: 15, name: 'Day-of-Checkin', file: 'src/pages/treatment-offers/DayOfCheckinPage.tsx' }
];

const results = [];

for (const p of pages) {
  const filePath = path.resolve(__dirname, '../../../', p.file);
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Extract imports from services
  const serviceImports = content.match(/import\s+.*from\s+['"]@\/services\/[^'"]+['"]/g) || [];
  
  // Extract api calls or service calls
  const serviceCalls = content.match(/(treatmentOfferService|consultationService|patientService|apiClient)\.[a-zA-Z0-9_]+/g) || [];
  
  // Check for mock data, hardcoded IDs, timers
  const hasMockData = /mock|demo|dummy|sample|placeholder|TR-8921|Robert|93458/i.test(content);
  const matchedMocks = [];
  ['mock', 'demo', 'dummy', 'TR-8921', 'Robert', '93458', '3b6a3f47', 'setTimeout'].forEach(w => {
    if (content.toLowerCase().includes(w.toLowerCase())) matchedMocks.push(w);
  });
  
  // Check routes navigated to
  const navigations = content.match(/navigate\([^)]+\)/g) || [];
  
  results.push({
    stage: p.stage,
    name: p.name,
    file: p.file,
    serviceImports,
    serviceCalls: Array.from(new Set(serviceCalls)),
    matchedMocks,
    navigations: Array.from(new Set(navigations)).slice(0, 10),
    linesCount: content.split('\n').length
  });
}

console.log(JSON.stringify(results, null, 2));

fs.writeFileSync(path.resolve(__dirname, 'stages_scan.json'), JSON.stringify(results, null, 2), 'utf8');
