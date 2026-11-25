const fs = require('fs');

const settingsFiles = [
  'src/components/settings/AdminSystemSettingsGeneral.tsx',
  'src/components/settings/AdminSystemSettingsBranding.tsx',
  'src/components/settings/AdminSystemSettingsSecurity.tsx',
  'src/components/settings/AdminSystemSettingsRoles.tsx',
  'src/components/settings/AdminSystemSettingsOcr.tsx',
  'src/components/settings/AdminSystemSettingsIntegrations.tsx',
  'src/components/settings/AdminSystemSettingsAnnouncements.tsx',
  'src/components/profile/AdminProfileInformation.tsx'
];

settingsFiles.forEach(f => {
  if (!fs.existsSync(f)) return;
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  console.log(`\n=== ${f} ===`);
  lines.forEach((l, idx) => {
    if (l.includes('/admin/profile') || l.includes('settings-profile') || l.includes('branding-profile') || l.includes('roles-user-profile') || l.includes('ocr-user-profile') || l.includes('int-user-profile') || l.includes('announcements-profile') || l.includes('profile-top-pill')) {
      for (let i = Math.max(0, idx - 1); i <= Math.min(lines.length - 1, idx + 8); i++) {
        console.log(`  ${i+1}: ${lines[i]}`);
      }
    }
  });
});

