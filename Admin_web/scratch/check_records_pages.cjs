const fs = require('fs');
const app = fs.readFileSync('src/App.tsx', 'utf8');
const lines = app.split('\n');
lines.forEach((l, i) => {
  if (l.includes('HealthRecordsPage') || l.includes('MedicalRecordsPage') || l.includes('DentalRecordsPage') || l.includes('VisionRecordsPage') || l.includes('records')) {
    if (l.includes('const ') || l.includes('activeNav') || l.includes('<Route')) {
      console.log((i + 1) + ': ' + l.trim());
    }
  }
});

