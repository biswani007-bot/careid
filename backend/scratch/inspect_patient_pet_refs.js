const fs = require('fs');

const files = [
  'C:\\Users\\PABANI\\CareID_patient_app\\lib\\app.dart',
  'C:\\Users\\PABANI\\CareID_patient_app\\lib\\features\\patient\\presentation\\screens\\home_screen.dart',
  'C:\\Users\\PABANI\\CareID_patient_app\\lib\\features\\patient\\presentation\\screens\\medical_records_screen.dart',
  'C:\\Users\\PABANI\\CareID_patient_app\\lib\\features\\patient\\presentation\\screens\\record_details_hub_screen.dart'
];

files.forEach(f => {
  if (!fs.existsSync(f)) return;
  console.log(`\n--- Inspecting ${f} ---`);
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  lines.forEach((line, idx) => {
    if (/pet/i.test(line)) {
      console.log(`  Line ${idx + 1}: ${line.trim()}`);
    }
  });
});
