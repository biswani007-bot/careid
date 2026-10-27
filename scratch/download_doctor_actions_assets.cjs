const fs = require('fs');
const path = require('path');

const assets = [
  { url: 'http://localhost:3845/assets/3a00226f0504d9f13037bfa6ff55a7f8ee523757.svg', name: 'icon-modal-suspend-alert.svg' },
  { url: 'http://localhost:3845/assets/60c61363e939ed149c2f9f76c17baa2079a5e50f.svg', name: 'icon-modal-reset-lock.svg' },
  { url: 'http://localhost:3845/assets/da638d09290e16f65d939a2a766a17c8fc7bf869.svg', name: 'icon-empty-caught-up.svg' }
];

const destDir = path.join(__dirname, '../src/assets/doctors');

async function download() {
  for (const item of assets) {
    try {
      const res = await fetch(item.url);
      if (!res.ok) {
        console.error('Failed to fetch', item.url, res.status);
        continue;
      }
      const buffer = await res.arrayBuffer();
      const destPath = path.join(destDir, item.name);
      fs.writeFileSync(destPath, Buffer.from(buffer));
      console.log('Saved', item.name, 'size:', buffer.byteLength);
    } catch (e) {
      console.error('Error fetching', item.name, e);
    }
  }
}

download();
