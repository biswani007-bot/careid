const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'src', 'assets', 'patients');

const mappings = {
  'imgPatientPhoto.png': 'patient-eleanor-hero.png',
  'imgContainer3.svg': 'icon-reset-account.svg',
  'imgContainer4.svg': 'icon-suspend-account.svg',
  'imgContainer5.svg': 'icon-edit-profile-white.svg',
  'imgContainer6.svg': 'icon-badge-active-check.svg',
  'imgContainer7.svg': 'icon-blood-drop.svg',
  'imgContainer8.svg': 'icon-account-details-shield.svg',
  'imgContainer9.svg': 'icon-personal-info-card.svg',
  'imgContainer10.svg': 'icon-verified-check-green.svg',
  'imgContainer11.svg': 'icon-vault-folder.svg',
  'imgContainer12.svg': 'icon-total-records-file.svg',
  'imgContainer13.svg': 'icon-family-sharing-group.svg',
};

for (const [srcName, destName] of Object.entries(mappings)) {
  const src = path.join(dir, srcName);
  const dest = path.join(dir, destName);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`Copied ${srcName} -> ${destName}`);
  } else {
    console.warn(`Source not found: ${srcName}`);
  }
}
