const fs = require('fs');
const path = require('path');

const releaseDir = path.resolve(__dirname, '..', 'release', 'CareID_Backend_Staging_Release_2026-11-03');
const zipFile = path.resolve(__dirname, '..', 'release', 'CareID_Backend_Staging_Release_2026-11-03.zip');

console.log('--- Verifying Staging Release Directory ---');
console.log('Path:', releaseDir);

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(path.relative(releaseDir, fullPath));
    }
  });

  return arrayOfFiles;
}

const allFiles = getAllFiles(releaseDir);
console.log('Total files in release package:', allFiles.length);

const envFiles = allFiles.filter(f => f === '.env' || f.endsWith('/.env') || f.endsWith('\\.env'));
console.log('Active .env secret files found (must be 0):', envFiles.length);
if (envFiles.length > 0) {
  console.error('FATAL: Found .env file in release package!', envFiles);
  process.exit(1);
}

const requiredFiles = [
  'dist/src/main.js',
  'prisma/schema.prisma',
  'prisma/baseline_schema.sql',
  'prisma.config.ts',
  'scripts/deploy-preflight.js',
  'scripts/server-healthcheck.js',
  'scripts/seed-staging.js',
  'scripts/seed-local.js',
  'ecosystem.config.js',
  '.env.staging.example',
  'package.json',
  'package-lock.json',
  'README-AAPANEL-DEPLOYMENT.md',
  'RELEASE-MANIFEST.json'
];

let missingRequired = 0;
for (const req of requiredFiles) {
  const normalizedReq = req.replace(/\//g, path.sep);
  const exists = allFiles.some(f => f === req || f === normalizedReq);
  if (!exists) {
    console.error('Missing required release file:', req);
    missingRequired++;
  } else {
    console.log('Verified present:', req);
  }
}

if (missingRequired > 0) {
  console.error(`FAILED: ${missingRequired} required files missing.`);
  process.exit(1);
}

const zipStats = fs.statSync(zipFile);
console.log('--- Verifying ZIP Archive ---');
console.log('ZIP Path:', zipFile);
console.log('ZIP File Size:', (zipStats.size / (1024 * 1024)).toFixed(2), 'MB');
console.log('Release package verification PASSED completely.');

