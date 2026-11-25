const fs = require('fs');
['AdminAllHealthRecords.tsx', 'AdminMedicalRecords.tsx', 'AdminDentalRecords.tsx', 'AdminVisionRecords.tsx'].forEach(file => {
  const p = 'src/components/records/' + file;
  if (fs.existsSync(p)) {
    const content = fs.readFileSync(p, 'utf8');
    const idx = content.indexOf('<AdminSidebar');
    if (idx !== -1) {
      console.log('=== ' + file + ' ===');
      console.log(content.slice(idx, idx + 250));
    }
  }
});
