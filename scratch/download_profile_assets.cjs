const fs = require('fs');
const http = require('http');
const path = require('path');

const code = fs.readFileSync('scratch/figma_patient_profile_code.tsx', 'utf8');
const assetMatches = [...code.matchAll(/const\s+(\w+)\s*=\s*"(http:\/\/localhost:3845\/assets\/[^"]+)";/g)];

console.log(`Found ${assetMatches.length} assets`);

const destDir = path.join(__dirname, '..', 'src', 'assets', 'patients');
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

async function download(url, dest) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to download ${url}: ${res.statusCode}`));
      }
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', reject);
  });
}

async function main() {
  const assetMap = {};
  for (const match of assetMatches) {
    const varName = match[1];
    const url = match[2];
    const ext = path.extname(url);
    const filename = `${varName}${ext}`;
    const dest = path.join(destDir, filename);
    try {
      await download(url, dest);
      console.log(`Downloaded ${varName} -> ${filename}`);
      assetMap[varName] = `@/assets/patients/${filename}`;
    } catch (e) {
      console.error(`Error downloading ${url}:`, e.message);
    }
  }

  fs.writeFileSync(path.join(__dirname, 'patient_asset_map.json'), JSON.stringify(assetMap, null, 2));
  console.log('Asset map written to scratch/patient_asset_map.json');
}

main();
