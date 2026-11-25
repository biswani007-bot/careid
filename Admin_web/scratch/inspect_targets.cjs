const fs = require('fs');

const targets = [
  { file: 'src/components/facilities/AdminFacilityDirectory.tsx', pattern: 'header-avatar' },
  { file: 'src/components/records/AdminAllHealthRecords.tsx', pattern: 'header-avatar' },
  { file: 'src/components/ocr/AdminOcrQueue.tsx', pattern: 'header-avatar' },
  { file: 'src/components/referrals/AdminReferralDashboard.tsx', pattern: 'profile' },
  { file: 'src/components/referrals/AdminReferralMonitoring.tsx', pattern: 'avatar' },
  { file: 'src/components/referrals/AdminReferralAudit.tsx', pattern: 'avatar' },
  { file: 'src/components/reports/AdminReportsDashboard.tsx', pattern: 'avatar' },
  { file: 'src/components/reports/AdminReferralActivityReport.tsx', pattern: 'avatar' },
  { file: 'src/components/settings/AdminSystemSettingsGeneral.tsx', pattern: 'profile' },
  { file: 'src/components/settings/AdminSystemSettingsBranding.tsx', pattern: 'profile' },
  { file: 'src/components/settings/AdminSystemSettingsSecurity.tsx', pattern: 'profile' },
  { file: 'src/components/settings/AdminSystemSettingsRoles.tsx', pattern: 'profile' },
  { file: 'src/components/settings/AdminSystemSettingsOcr.tsx', pattern: 'profile' },
  { file: 'src/components/settings/AdminSystemSettingsIntegrations.tsx', pattern: 'profile' },
  { file: 'src/components/settings/AdminSystemSettingsAnnouncements.tsx', pattern: 'profile' },
  { file: 'src/components/audit/AdminAuditDashboard.tsx', pattern: 'profile' },
  { file: 'src/components/audit/AdminAuditLogExplorer.tsx', pattern: 'avatar' },
  { file: 'src/components/audit/AdminAuditEventDetails.tsx', pattern: 'avatar' },
  { file: 'src/components/security/AdminSecurityCompliance.tsx', pattern: 'sec-user-profile' },
  { file: 'src/components/notifications/AdminNotificationDashboard.tsx', pattern: 'notification-profile' }
];

targets.forEach(t => {
  if (!fs.existsSync(t.file)) return;
  const content = fs.readFileSync(t.file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((l, idx) => {
    if (l.includes(t.pattern)) {
      console.log(`\n=== ${t.file} (Line ${idx+1}) ===`);
      for (let i = Math.max(0, idx - 1); i <= Math.min(lines.length - 1, idx + 10); i++) {
        console.log(`  ${i+1}: ${lines[i]}`);
      }
    }
  });
});

