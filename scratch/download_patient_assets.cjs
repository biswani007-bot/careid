const fs = require('fs');
const http = require('http');
const path = require('path');

const code = fs.readFileSync('scratch/figma_patient_directory_code.tsx', 'utf8');
const assetMatches = [...code.matchAll(/const\s+(\w+)\s*=\s*"(http:\/\/localhost:3845\/assets\/[^"']+)"/g)];
console.log('Found assets:', assetMatches.length);

const outDir = path.join(__dirname, '..', 'src', 'assets', 'patients');
fs.mkdirSync(outDir, { recursive: true });

async function downloadAsset(name, url) {
  const ext = url.endsWith('.png') ? '.png' : '.svg';
  const dest = path.join(outDir, name + ext);
  return new Promise((resolve) => {
    http.get(url, (res) => {
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`Downloaded ${name} (${ext}) to ${dest}`);
        resolve({ name, ext, file: name + ext });
      });
    }).on('error', (err) => {
      console.error(`Failed to download ${url}:`, err.message);
      resolve(null);
    });
  });
}

(async () => {
  for (const match of assetMatches) {
    await downloadAsset(match[1], match[2]);
  }
})();
