const fs = require('fs');

const files = [
  'src/components/facilities/AdminFacilityDirectory.tsx',
  'src/components/facilities/AdminFacilityDetails.tsx',
  'src/components/facilities/AdminStaffMapping.tsx',
  'src/components/records/AdminAllHealthRecords.tsx',
  'src/components/ocr/AdminOcrQueue.tsx',
  'src/components/referrals/AdminReferralDashboard.tsx',
  'src/components/referrals/AdminReferralMonitoring.tsx',
  'src/components/referrals/AdminReferralAudit.tsx',
  'src/components/reports/AdminReportsDashboard.tsx',
  'src/components/reports/AdminReferralActivityReport.tsx',
  'src/components/settings/AdminSystemSettingsRoles.tsx',
  'src/components/settings/AdminSystemSettingsOcr.tsx',
  'src/components/settings/AdminSystemSettingsIntegrations.tsx',
  'src/components/settings/AdminSystemSettingsSecurity.tsx',
  'src/components/audit/AdminAuditDashboard.tsx',
  'src/components/audit/AdminAuditLogExplorer.tsx',
  'src/components/audit/AdminAuditEventDetails.tsx',
  'src/components/security/AdminSecurityCompliance.tsx',
  'src/components/notifications/AdminNotificationDashboard.tsx',
  'src/components/profile/AdminProfileInformation.tsx'
];

for (const f of files) {
  if (!fs.existsSync(f)) {
    console.log('File NOT found:', f);
    continue;
  }
  const content = fs.readFileSync(f, 'utf8');
  console.log('=== ' + f + ' ===');
  const lines = content.split('\n');
  lines.forEach((l, idx) => {
    if (l.includes('avatar') || l.includes('/admin/profile') || l.includes('initials') || l.includes('User size') || l.includes('rostovaAvatar')) {
      console.log(`  L${idx+1}: ${l.trim()}`);
    }
  });
}
