const fs = require('fs');

const subpages = [
  'src/components/facilities/AdminFacilityDetails.tsx',
  'src/components/facilities/AdminAddFacility.tsx',
  'src/components/facilities/AdminMapDoctor.tsx',
  'src/components/facilities/AdminStaffMapping.tsx',
  'src/components/doctors/AdminDoctorProfile.tsx',
  'src/components/doctors/AdminAddDoctor.tsx',
  'src/components/patients/AdminPatientProfile.tsx',
  'src/components/patients/AdminPatientRegistration.tsx',
  'src/components/records/AdminCategoryHealthRecords.tsx',
  'src/components/records/AdminRecordDetails.tsx',
  'src/components/reports/AdminOcrPerformanceReport.tsx',
  'src/components/reports/AdminSystemHealthExport.tsx',
  'src/components/referrals/AdminReferralDetails.tsx'
];

subpages.forEach(f => {
  if (!fs.existsSync(f)) return;
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  lines.forEach((l, idx) => {
    if (l.includes('header-avatar') || l.includes('avatar-btn') || l.includes('profile-btn') || l.includes('users-header-avatar') || (l.includes('<header') && !l.includes('</header>'))) {
      console.log(`\n=== ${f} (Line ${idx+1}) ===`);
      for (let i = Math.max(0, idx - 1); i <= Math.min(lines.length - 1, idx + 6); i++) {
        console.log(`  ${i+1}: ${lines[i]}`);
      }
    }
  });
});

