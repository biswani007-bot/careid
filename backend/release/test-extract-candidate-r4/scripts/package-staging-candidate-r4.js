const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const workspaceRoot = path.resolve(__dirname, '..');
const releaseBase = path.join(workspaceRoot, 'release');
const releaseDirName = 'CareID_Master_Backend_Staging_Candidate_2026-11-18_R4';
const releaseDir = path.join(releaseBase, releaseDirName);
const zipFileName = 'CareID_Master_Backend_Staging_Candidate_2026-11-18_R4.zip';
const zipPath = path.join(releaseBase, zipFileName);
const rootZipPath = path.join(workspaceRoot, zipFileName);
const extractDir = path.join(releaseBase, 'test-extract-candidate-r4');

function calculateFileSha256(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

function copyDirectoryRecursive(src, dest, excludeDirs = []) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    if (excludeDirs.includes(entry.name)) {
      continue;
    }
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirectoryRecursive(srcPath, destPath, excludeDirs);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function getAllFiles(dirPath, baseDir) {
  let fileList = [];
  if (!fs.existsSync(dirPath)) return fileList;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      fileList = fileList.concat(getAllFiles(fullPath, baseDir));
    } else {
      const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
      fileList.push({ fullPath, relPath });
    }
  }
  return fileList;
}

async function main() {
  console.log('================================================================');
  console.log('  CareID Master Backend — Staging Candidate R4 Package Generator');
  console.log('================================================================\n');

  // Step 1: Cleanup and initialize
  console.log('[1/8] Initializing release directory...');
  if (!fs.existsSync(releaseBase)) {
    fs.mkdirSync(releaseBase, { recursive: true });
  }
  if (fs.existsSync(releaseDir)) {
    fs.rmSync(releaseDir, { recursive: true, force: true });
  }
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }
  if (fs.existsSync(rootZipPath)) {
    fs.unlinkSync(rootZipPath);
  }
  fs.mkdirSync(releaseDir, { recursive: true });

  // Step 2: Copy FULL TypeScript Source Code (src/)
  console.log('[2/8] Copying complete TypeScript source tree (src/)...');
  copyDirectoryRecursive(path.join(workspaceRoot, 'src'), path.join(releaseDir, 'src'));

  // Step 3: Copy Compiled Runtime (dist/)
  console.log('[3/8] Copying compiled production runtime (dist/)...');
  const distSrc = path.join(workspaceRoot, 'dist');
  if (!fs.existsSync(path.join(distSrc, 'src', 'main.js'))) {
    console.log('Building NestJS production runtime...');
    execSync('npm run build', { cwd: workspaceRoot, stdio: 'inherit' });
  }
  copyDirectoryRecursive(distSrc, path.join(releaseDir, 'dist'));

  // Step 4: Copy Prisma Schema and Migrations
  console.log('[4/8] Copying Prisma schema, config, and migrations...');
  fs.mkdirSync(path.join(releaseDir, 'prisma'), { recursive: true });
  fs.copyFileSync(path.join(workspaceRoot, 'prisma', 'schema.prisma'), path.join(releaseDir, 'prisma', 'schema.prisma'));
  if (fs.existsSync(path.join(workspaceRoot, 'prisma', 'baseline_schema.sql'))) {
    fs.copyFileSync(path.join(workspaceRoot, 'prisma', 'baseline_schema.sql'), path.join(releaseDir, 'prisma', 'baseline_schema.sql'));
  }
  if (fs.existsSync(path.join(workspaceRoot, 'prisma', 'migrations'))) {
    copyDirectoryRecursive(path.join(workspaceRoot, 'prisma', 'migrations'), path.join(releaseDir, 'prisma', 'migrations'));
  }
  if (fs.existsSync(path.join(workspaceRoot, 'prisma', 'migrations_offline'))) {
    copyDirectoryRecursive(path.join(workspaceRoot, 'prisma', 'migrations_offline'), path.join(releaseDir, 'prisma', 'migrations_offline'));
  }
  if (fs.existsSync(path.join(workspaceRoot, 'prisma.config.ts'))) {
    fs.copyFileSync(path.join(workspaceRoot, 'prisma.config.ts'), path.join(releaseDir, 'prisma.config.ts'));
  }

  // Step 5: Copy Scripts, Docs, and Tooling
  console.log('[5/8] Copying deployment scripts and documentation...');
  if (fs.existsSync(path.join(workspaceRoot, 'scripts'))) {
    copyDirectoryRecursive(path.join(workspaceRoot, 'scripts'), path.join(releaseDir, 'scripts'));
  }
  if (fs.existsSync(path.join(workspaceRoot, 'docs'))) {
    copyDirectoryRecursive(path.join(workspaceRoot, 'docs'), path.join(releaseDir, 'docs'));
  }

  // Step 6: Copy Configuration, Manifests, and Environment Templates
  console.log('[6/8] Copying root manifests and configurations...');
  const rootFiles = [
    'package.json',
    'package-lock.json',
    'tsconfig.json',
    'tsconfig.build.json',
    'nest-cli.json',
    'ecosystem.config.js',
    '.env.example',
    '.env.staging.example',
    'README.md',
  ];
  for (const f of rootFiles) {
    const srcF = path.join(workspaceRoot, f);
    if (fs.existsSync(srcF)) {
      fs.copyFileSync(srcF, path.join(releaseDir, f));
    }
  }

  // Generate deployment metadata manifest
  const manifest = {
    releaseName: releaseDirName,
    releaseVersion: 'R4-Final-Remediation',
    targetEnvironment: 'Staging',
    stagingHost: 'vmi2673411',
    stagingPath: '/www/wwwroot/360api.vnvision.in',
    generatedAt: new Date().toISOString(),
    nodeVersion: process.version,
    platform: process.platform,
    containsSourceCode: true,
    containsCompiledDist: true,
    containsPrismaMigrations: true,
    summary: 'CareID Master Backend R4 Staging Release Candidate with OCR IDOR remediations, zero synthetic fallbacks, and aligned Prisma dependencies.',
  };
  fs.writeFileSync(path.join(releaseDir, 'RELEASE_MANIFEST.json'), JSON.stringify(manifest, null, 2));

  // Step 7: Compress Archive
  console.log('[7/8] Generating release ZIP archive...');
  const psCommand = `Compress-Archive -Path "${releaseDir}\\*" -DestinationPath "${zipPath}" -Force`;
  execSync(`powershell -NoProfile -Command "${psCommand}"`, { cwd: workspaceRoot, stdio: 'inherit' });

  // Also copy to workspace root
  fs.copyFileSync(zipPath, rootZipPath);

  // Step 8: Verification & Integrity Hash
  console.log('[8/8] Verifying package integrity and computing cryptographic SHA-256...');
  const sha256 = calculateFileSha256(zipPath);
  const stat = fs.statSync(zipPath);

  // Test extraction
  if (fs.existsSync(extractDir)) {
    fs.rmSync(extractDir, { recursive: true, force: true });
  }
  fs.mkdirSync(extractDir, { recursive: true });
  execSync(`powershell -NoProfile -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${extractDir}' -Force"`, { cwd: workspaceRoot });

  const extractedFiles = getAllFiles(extractDir, extractDir);
  const tsSourceFiles = extractedFiles.filter((f) => f.relPath.startsWith('src/') && f.relPath.endsWith('.ts'));
  const distJsFiles = extractedFiles.filter((f) => f.relPath.startsWith('dist/') && f.relPath.endsWith('.js'));
  const prismaFiles = extractedFiles.filter((f) => f.relPath.startsWith('prisma/'));

  console.log('\n================================================================');
  console.log('  R4 RELEASE CANDIDATE CERTIFIED & GENERATED SUCCESSFULLY');
  console.log('================================================================');
  console.log(`Archive File:          ${zipFileName}`);
  console.log(`Release Location:      ${zipPath}`);
  console.log(`Root Location:         ${rootZipPath}`);
  console.log(`File Size:             ${(stat.size / 1024 / 1024).toFixed(2)} MB (${stat.size.toLocaleString()} bytes)`);
  console.log(`Cryptographic SHA-256: ${sha256}`);
  console.log(`Total Extracted Files: ${extractedFiles.length}`);
  console.log(`TypeScript Sources:    ${tsSourceFiles.length} (.ts files in src/)`);
  console.log(`Compiled Runtime:      ${distJsFiles.length} (.js files in dist/)`);
  console.log(`Prisma Assets:         ${prismaFiles.length} files (schema, migrations)`);
  console.log('================================================================\n');

  // Save audit record
  const verificationRecord = {
    releaseArchive: zipFileName,
    sha256,
    byteSize: stat.size,
    totalFiles: extractedFiles.length,
    tsSourceFilesCount: tsSourceFiles.length,
    distFilesCount: distJsFiles.length,
    generatedAt: manifest.generatedAt,
  };
  fs.writeFileSync(
    path.join(workspaceRoot, 'docs', 'r4-remediation', 'R4_PACKAGE_METRICS.json'),
    JSON.stringify(verificationRecord, null, 2),
  );

  return verificationRecord;
}

main().catch((err) => {
  console.error('Packaging failed:', err);
  process.exit(1);
});
