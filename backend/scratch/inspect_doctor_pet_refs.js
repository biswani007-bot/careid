const fs = require('fs');

const files = [
  'C:\\Users\\PABANI\\CareID_Doctor_application\\lib\\core\\routes\\app_routes.dart',
  'C:\\Users\\PABANI\\CareID_Doctor_application\\lib\\features\\medical_records\\medical_records_timeline_screen.dart',
  'C:\\Users\\PABANI\\CareID_Doctor_application\\lib\\features\\medical_records\\pet_records_screen.dart',
  'C:\\Users\\PABANI\\CareID_Doctor_application\\lib\\features\\patients\\patient_search_screen.dart',
  'C:\\Users\\PABANI\\CareID_Doctor_application\\lib\\main.dart'
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
