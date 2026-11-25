const fs = require('fs');

const files = [
  'src/components/dashboard/AdminDashboard.tsx',
  'src/components/users/AdminUserDirectory.tsx',
  'src/components/users/AdminUserDetails.tsx',
  'src/components/users/AdminCreateUser.tsx',
  'src/components/patients/AdminPatientDirectory.tsx',
  'src/components/doctors/AdminDoctorDirectory.tsx',
  'src/components/facilities/AdminFacilityDirectory.tsx',
  'src/components/records/AdminAllHealthRecords.tsx',
  'src/components/ocr/AdminOcrQueue.tsx',
  'src/components/referrals/AdminReferralDashboard.tsx',
  'src/components/referrals/AdminReferralMonitoring.tsx',
  'src/components/referrals/AdminReferralAudit.tsx',
  'src/components/reports/AdminReportsDashboard.tsx',
  'src/components/reports/AdminReferralActivityReport.tsx',
  'src/components/settings/AdminSystemSettingsGeneral.tsx',
  'src/components/settings/AdminSystemSettingsBranding.tsx',
  'src/components/settings/AdminSystemSettingsSecurity.tsx',
  'src/components/settings/AdminSystemSettingsRoles.tsx',
  'src/components/settings/AdminSystemSettingsOcr.tsx',
  'src/components/settings/AdminSystemSettingsIntegrations.tsx',
  'src/components/settings/AdminSystemSettingsAnnouncements.tsx',
  'src/components/audit/AdminAuditDashboard.tsx',
  'src/components/audit/AdminAuditLogExplorer.tsx',
  'src/components/audit/AdminAuditEventDetails.tsx',
  'src/components/security/AdminSecurityCompliance.tsx',
  'src/components/security/AdminSecuritySessionManagement.tsx',
  'src/components/notifications/AdminNotificationDashboard.tsx',
  'src/components/profile/AdminProfileInformation.tsx'
];

files.forEach(f => {
  const c = fs.readFileSync(f, 'utf8');
  const lines = c.split('\n');
  console.log(`\n=== ${f} ===`);
  // find lines with /admin/profile or avatar or profile in header
  lines.forEach((l, idx) => {
    if (l.includes('/admin/profile') || (l.includes('header-avatar') || l.includes('profile-btn') || l.includes('avatar-btn') || l.includes('sec-user-profile'))) {
      const start = Math.max(0, idx - 2);
      const end = Math.min(lines.length - 1, idx + 8);
      console.log(`-- Around line ${idx+1}:`);
      for (let i = start; i <= end; i++) {
        console.log(`   ${i+1}: ${lines[i]}`);
      }
    }
  });
});
