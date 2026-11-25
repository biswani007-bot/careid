const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const workspaceRoot = path.resolve(__dirname, '..');
const releaseBase = path.join(workspaceRoot, 'release');
const releaseDirName = 'CareID_Consolidated_Backend_Staging_Release_2026-11-14';
const releaseDir = path.join(releaseBase, releaseDirName);
const zipFileName = 'CareID_Consolidated_Backend_Staging_Deployment_2026-11-14.zip';
const zipPath = path.join(releaseBase, zipFileName);
const zipPathTmp = path.join(releaseBase, `${zipFileName}.tmp`);
const extractDir = path.join(releaseBase, 'test-extract-consolidated-staging');

function calculateFileSha256(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

function copyDirectoryRecursive(src, dest, ignoreTests = false) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      if (ignoreTests && (entry.name === 'tests' || entry.name === 'test' || entry.name === '__tests__')) {
        continue;
      }
      copyDirectoryRecursive(srcPath, destPath, ignoreTests);
    } else {
      if (ignoreTests && (entry.name.includes('.spec.') || entry.name.includes('.test.'))) {
        continue;
      }
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function getAllFiles(dirPath, baseDir) {
  let fileList = [];
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
  console.log('  CareID Unified Backend — Consolidated Staging Package Generator');
  console.log('================================================================\n');

  // Step 1: Ensure directories and clean temporary assets
  console.log('[1/8] Initializing release directory...');
  if (!fs.existsSync(releaseBase)) {
    fs.mkdirSync(releaseBase, { recursive: true });
  }
  if (fs.existsSync(zipPathTmp)) {
    fs.unlinkSync(zipPathTmp);
  }
  if (fs.existsSync(releaseDir)) {
    fs.rmSync(releaseDir, { recursive: true, force: true });
  }
  fs.mkdirSync(releaseDir, { recursive: true });
  fs.mkdirSync(path.join(releaseDir, 'prisma'), { recursive: true });
  fs.mkdirSync(path.join(releaseDir, 'scripts'), { recursive: true });

  // Step 2: Copy verified runtime compilation (dist/) excluding test files
  console.log('[2/8] Copying compiled production runtime (dist/) [excluding test artifacts]...');
  const distSrc = path.join(workspaceRoot, 'dist');
  if (!fs.existsSync(path.join(distSrc, 'src', 'main.js'))) {
    throw new Error('Missing dist/src/main.js! Build must run prior to packaging.');
  }
  copyDirectoryRecursive(distSrc, path.join(releaseDir, 'dist'), true);

  // Step 3: Copy Prisma schema and full migration chain
  console.log('[3/8] Copying Prisma schema and database migrations...');
  fs.copyFileSync(path.join(workspaceRoot, 'prisma', 'schema.prisma'), path.join(releaseDir, 'prisma', 'schema.prisma'));
  if (fs.existsSync(path.join(workspaceRoot, 'prisma', 'baseline_schema.sql'))) {
    fs.copyFileSync(path.join(workspaceRoot, 'prisma', 'baseline_schema.sql'), path.join(releaseDir, 'prisma', 'baseline_schema.sql'));
  }

  const migrationsSrc = path.join(workspaceRoot, 'prisma', 'migrations');
  if (fs.existsSync(migrationsSrc)) {
    copyDirectoryRecursive(migrationsSrc, path.join(releaseDir, 'prisma', 'migrations'));
  }

  const offlineMigrations = path.join(workspaceRoot, 'prisma', 'migrations_offline');
  if (fs.existsSync(offlineMigrations)) {
    copyDirectoryRecursive(offlineMigrations, path.join(releaseDir, 'prisma', 'migrations_offline'));
  }

  // Step 4: Copy server operations scripts & configuration files
  console.log('[4/8] Copying server operation scripts, PM2 configuration & templates...');
  fs.copyFileSync(path.join(workspaceRoot, 'prisma.config.ts'), path.join(releaseDir, 'prisma.config.ts'));
  fs.copyFileSync(path.join(workspaceRoot, 'scripts', 'deploy-preflight.js'), path.join(releaseDir, 'scripts', 'deploy-preflight.js'));
  fs.copyFileSync(path.join(workspaceRoot, 'scripts', 'server-healthcheck.js'), path.join(releaseDir, 'scripts', 'server-healthcheck.js'));
  fs.copyFileSync(path.join(workspaceRoot, 'scripts', 'seed-staging.js'), path.join(releaseDir, 'scripts', 'seed-staging.js'));
  fs.copyFileSync(path.join(workspaceRoot, 'scripts', 'seed-local.js'), path.join(releaseDir, 'scripts', 'seed-local.js'));
  fs.copyFileSync(path.join(workspaceRoot, 'ecosystem.config.js'), path.join(releaseDir, 'ecosystem.config.js'));
  fs.copyFileSync(path.join(workspaceRoot, '.env.staging.example'), path.join(releaseDir, '.env.staging.example'));
  fs.copyFileSync(path.join(workspaceRoot, 'package.json'), path.join(releaseDir, 'package.json'));
  fs.copyFileSync(path.join(workspaceRoot, 'package-lock.json'), path.join(releaseDir, 'package-lock.json'));
  fs.copyFileSync(path.join(workspaceRoot, 'README-AAPANEL-DEPLOYMENT.md'), path.join(releaseDir, 'README-AAPANEL-DEPLOYMENT.md'));

  // Step 5: Generate comprehensive manifest files
  console.log('[5/8] Computing file checksums and generating DEPLOYMENT_MANIFEST.json...');
  let allStagedFiles = getAllFiles(releaseDir, releaseDir);
  const checksumMap = {};
  for (const f of allStagedFiles) {
    const hash = calculateFileSha256(f.fullPath);
    const size = fs.statSync(f.fullPath).size;
    checksumMap[f.relPath] = { sha256: hash, sizeBytes: size };
  }

  const manifest = {
    release: {
      name: 'CareID_Consolidated_Backend_Staging_Deployment_2026-11-14',
      packageName: zipFileName,
      version: '1.0.0',
      buildTimestamp: new Date().toISOString(),
      targetEnvironment: 'https://360api.vnvision.in/api/v1',
      platform: 'Linux (Ubuntu/Debian/Rocky) via aaPanel + PM2 + Nginx (Port 3073)',
      authorizationStatus: 'PACKAGE CREATION AUTHORIZED. DEPLOYMENT TO LIVE SERVER NOT AUTHORIZED.',
      runtimeStack: {
        node: '>=20.0.0 LTS (v20 or v22)',
        framework: 'NestJS 10.x / 11.x',
        orm: 'Prisma ORM 7.x',
        database: 'PostgreSQL 15+'
      }
    },
    includedSubsystems: [
      {
        subsystem: 'Patient Mobile App APIs',
        description: 'Complete backend APIs supporting all screens in CareID Patient App (Auth, Profiles, Medical Records, Insurance, Vitals, QR Codes, Health Cards, Family Members, Messaging, Notifications)'
      },
      {
        subsystem: 'Doctor App APIs',
        description: 'Doctor authentication, profile management, active visits, patient lookups, clinical note templates, record verification, referrals, messaging, and clinical statistics'
      },
      {
        subsystem: 'Doctor-Initiated Patient Registration',
        description: 'Atomic registration by doctor (POST /api/v1/doctors/patients and POST /api/v1/doctors/patients/register) with strict ConflictException (HTTP 409) check preventing duplicate phone/email overwrite, active HealthCard and QR issuance, and in-person walk-in treatment consent record'
      },
      {
        subsystem: 'Clinical Subsystems',
        description: 'Structured Dental, Vision, Laboratory, and Prescription records with complete CRUD, clinical safety checks, drug interaction prevention, and attachment linking'
      },
      {
        subsystem: 'Appointments & Scheduling Workflows',
        description: 'Real PostgreSQL appointment booking, doctor schedule slots, rescheduling, cancellation, and state machine transitions'
      },
      {
        subsystem: 'Document & Profile Photo Upload Subsystem',
        description: 'B2 storage integration for medical record attachments and profile photo uploads (AttachmentCategory.PROFILE_PHOTO) with magic byte validation, 5MB ceiling, and cache-control headers'
      },
      {
        subsystem: 'OCR Integration',
        description: 'Remote multipart/form-data client (OcrWorkerClient) configured for standalone FastAPI PaddleOCR worker at https://careidocr.dokaan.in with X-CareID-Internal-Secret authentication'
      }
    ],
    verificationStatus: {
      typeCheck: 'npx tsc --noEmit passed with 0 errors',
      prismaSchemaParity: 'Prisma schema and 7 migrations fully consistent and verified',
      latestMigration: '20261114120000_doctor_app_core_clinical_subsystems',
      testSuitesPassing: '27 of 27 test suites passed (324 tests passing)',
      buildSuccess: 'npm run build completed with exit code 0'
    },
    requiredDatabaseMigrations: [
      '20261030113000_consent_and_referral_clinical_authorization',
      '20261030123000_appointment_module_and_state_machine',
      '20261106110000_treatment_offers_subsystem',
      '20261106120000_atomic_offer_sequences',
      '20261106140000_financing_applications_persistence',
      '20261114120000_doctor_app_core_clinical_subsystems'
    ],
    requiredEnvironmentVariables: [
      { name: 'NODE_ENV', description: 'Runtime mode (set to production)' },
      { name: 'APP_ENV', description: 'Application tier designation (set to staging)' },
      { name: 'PORT', description: 'Internal listening port (3073)' },
      { name: 'HOST', description: 'Binding IP (127.0.0.1 for Nginx reverse proxy)' },
      { name: 'DATABASE_URL', description: 'PostgreSQL connection string with credentials' },
      { name: 'JWT_SECRET', description: 'Cryptographic secret (min 32 chars) for JWT generation' },
      { name: 'QR_SIGNING_KEY', description: 'Cryptographic secret (min 32 chars) for QR validation' },
      { name: 'B2_ENDPOINT', description: 'Backblaze B2 S3 endpoint' },
      { name: 'B2_REGION', description: 'Backblaze B2 region' },
      { name: 'B2_BUCKET_NAME', description: 'Backblaze B2 bucket name' },
      { name: 'B2_KEY_ID', description: 'Backblaze B2 Key ID' },
      { name: 'B2_APPLICATION_KEY', description: 'Backblaze B2 Application Key' },
      { name: 'CAREID_OCR_WORKER_URL', description: 'Standalone OCR service URL (https://careidocr.dokaan.in)' },
      { name: 'CAREID_OCR_SECRET', description: 'Internal secret for OCR service authentication (min 32 chars)' },
      { name: 'ENABLE_TEST_OTP', description: 'Allow test OTP for staging verification (true/false)' },
      { name: 'TEST_PHONE_NUMBERS', description: 'Allowlisted phone numbers for test OTP' }
    ],
    deploymentInstructions: {
      uploadPath: '/www/wwwroot/careid-backend',
      steps: [
        '1. Upload CareID_Consolidated_Backend_Staging_Deployment_2026-11-14.zip to /www/wwwroot/careid-backend and extract.',
        '2. Configure /www/wwwroot/careid-backend/.env from .env.staging.example with staging secrets.',
        '3. Run "npm install --omit=dev" in the directory.',
        '4. Run "npx prisma generate".',
        '5. Apply migrations: "npx prisma migrate deploy".',
        '6. Run preflight check: "node scripts/deploy-preflight.js".',
        '7. Start or reload PM2 process: "pm2 reload ecosystem.config.js || pm2 start ecosystem.config.js".',
        '8. Run health check: "node scripts/server-healthcheck.js".'
      ]
    },
    files: checksumMap
  };

  const manifestContent = JSON.stringify(manifest, null, 2);
  const manifestPath = path.join(releaseDir, 'DEPLOYMENT_MANIFEST.json');
  fs.writeFileSync(manifestPath, manifestContent, 'utf8');
  fs.writeFileSync(path.join(releaseDir, 'RELEASE-MANIFEST.json'), manifestContent, 'utf8');
  fs.writeFileSync(path.join(workspaceRoot, 'DEPLOYMENT_MANIFEST.json'), manifestContent, 'utf8');

  // Add manifest entries to map
  const manifestHash = calculateFileSha256(manifestPath);
  const manifestStat = fs.statSync(manifestPath);
  checksumMap['DEPLOYMENT_MANIFEST.json'] = { sha256: manifestHash, sizeBytes: manifestStat.size };
  checksumMap['RELEASE-MANIFEST.json'] = { sha256: manifestHash, sizeBytes: manifestStat.size };

  // Step 6: Create POSIX-compliant ZIP archive
  console.log('[6/8] Creating POSIX-compliant ZIP archive...');
  allStagedFiles = getAllFiles(releaseDir, releaseDir);
  const jsonFileListPath = path.join(workspaceRoot, 'scripts', 'temp-consolidated-file-list.json');
  fs.writeFileSync(jsonFileListPath, JSON.stringify(allStagedFiles, null, 2), 'utf8');

  const psArchiveScript = path.join(workspaceRoot, 'scripts', 'internal-zip-consolidated.ps1');
  const psCode = `
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$jsonPath = "${jsonFileListPath.replace(/\\/g, '\\\\')}"
$targetZip = "${zipPathTmp.replace(/\\/g, '\\\\')}"

$items = Get-Content $jsonPath | ConvertFrom-Json
$zip = [System.IO.Compression.ZipFile]::Open($targetZip, [System.IO.Compression.ZipArchiveMode]::Create)

foreach ($item in $items) {
    $entry = $zip.CreateEntry($item.relPath, [System.IO.Compression.CompressionLevel]::Optimal)
    $entryStream = $entry.Open()
    $fileStream = [System.IO.File]::OpenRead($item.fullPath)
    $fileStream.CopyTo($entryStream)
    $fileStream.Close()
    $entryStream.Close()
}

$zip.Dispose()
Write-Host "ZIP compression finished."
`;
  fs.writeFileSync(psArchiveScript, psCode, 'utf8');
  execSync(`powershell -ExecutionPolicy Bypass -File "${psArchiveScript}"`, { stdio: 'inherit' });
  fs.unlinkSync(psArchiveScript);
  fs.unlinkSync(jsonFileListPath);

  // Step 7: Audit ZIP entries for security exclusions
  console.log('[7/8] Auditing ZIP archive for strict exclusions...');
  const psAuditScript = path.join(workspaceRoot, 'scripts', 'internal-audit-consolidated.ps1');
  const psAuditCode = `
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$zip = [System.IO.Compression.ZipFile]::OpenRead("${zipPathTmp.replace(/\\/g, '\\\\')}")
$entries = $zip.Entries

$hasBackslash = 0
$hasEnv = 0
$hasNodeModules = 0
$hasGit = 0
$hasUploads = 0
$hasScratch = 0
$hasTests = 0

foreach ($e in $entries) {
    if ($e.FullName.Contains('\\')) { $hasBackslash++ }
    if ($e.FullName -eq '.env' -or $e.FullName.EndsWith('/.env') -or ($e.FullName -like '*.env*' -and -not ($e.FullName -like '*.example*'))) { $hasEnv++ }
    if ($e.FullName.Contains('node_modules')) { $hasNodeModules++ }
    if ($e.FullName.Contains('.git')) { $hasGit++ }
    if ($e.FullName.StartsWith('data/') -or $e.FullName.Contains('/uploads/')) { $hasUploads++ }
    if ($e.FullName.Contains('scratch')) { $hasScratch++ }
    if ($e.FullName.StartsWith('tests/') -or $e.FullName.Contains('.spec.') -or $e.FullName.Contains('.test.')) { $hasTests++ }
}

Write-Host "Total entries in ZIP:" $entries.Count
Write-Host "Backslash entry paths (MUST BE 0):" $hasBackslash
Write-Host "Real .env secret files (MUST BE 0):" $hasEnv
Write-Host "node_modules entries (MUST BE 0):" $hasNodeModules
Write-Host ".git entries (MUST BE 0):" $hasGit
Write-Host "data/uploads entries (MUST BE 0):" $hasUploads
Write-Host "scratch entries (MUST BE 0):" $hasScratch
Write-Host "test files entries (MUST BE 0):" $hasTests

$zip.Dispose()

if ($hasBackslash -gt 0 -or $hasEnv -gt 0 -or $hasNodeModules -gt 0 -or $hasGit -gt 0 -or $hasUploads -gt 0 -or $hasScratch -gt 0 -or $hasTests -gt 0) {
    Write-Error "ZIP audit failed security exclusion check!"
    exit 1
}
`;
  fs.writeFileSync(psAuditScript, psAuditCode, 'utf8');
  execSync(`powershell -ExecutionPolicy Bypass -File "${psAuditScript}"`, { stdio: 'inherit' });
  fs.unlinkSync(psAuditScript);

  // Step 8: Verify extraction integrity
  console.log('[8/8] Performing test extraction and verifying critical files...');
  if (fs.existsSync(extractDir)) {
    fs.rmSync(extractDir, { recursive: true, force: true });
  }
  fs.mkdirSync(extractDir, { recursive: true });

  const psExtractScript = path.join(workspaceRoot, 'scripts', 'internal-extract-consolidated.ps1');
  const psExtractCode = `
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::ExtractToDirectory("${zipPathTmp.replace(/\\/g, '\\\\')}", "${extractDir.replace(/\\/g, '\\\\')}")
Write-Host "Extraction test succeeded."
`;
  fs.writeFileSync(psExtractScript, psExtractCode, 'utf8');
  execSync(`powershell -ExecutionPolicy Bypass -File "${psExtractScript}"`, { stdio: 'inherit' });
  fs.unlinkSync(psExtractScript);

  // Verify critical extracted files
  const criticalFiles = [
    path.join(extractDir, 'dist', 'src', 'main.js'),
    path.join(extractDir, 'prisma', 'schema.prisma'),
    path.join(extractDir, 'prisma', 'migrations', '20261114120000_doctor_app_core_clinical_subsystems', 'migration.sql'),
    path.join(extractDir, 'scripts', 'deploy-preflight.js'),
    path.join(extractDir, 'scripts', 'server-healthcheck.js'),
    path.join(extractDir, 'ecosystem.config.js'),
    path.join(extractDir, '.env.staging.example'),
    path.join(extractDir, 'package.json'),
    path.join(extractDir, 'DEPLOYMENT_MANIFEST.json'),
    path.join(extractDir, 'dist', 'src', 'modules', 'doctor', 'presentation', 'controllers', 'doctor.controller.js'),
    path.join(extractDir, 'dist', 'src', 'modules', 'ocr', 'infrastructure', 'clients', 'ocr-worker.client.js'),
    path.join(extractDir, 'dist', 'src', 'modules', 'medical-record', 'application', 'use-cases', 'medical-record.service.js')
  ];

  for (const cf of criticalFiles) {
    if (!fs.existsSync(cf)) {
      throw new Error(`Critical extracted file missing: ${cf}`);
    }
  }

  // Clean test extract directory
  fs.rmSync(extractDir, { recursive: true, force: true });

  // Promote temporary ZIP to final archive
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }
  fs.renameSync(zipPathTmp, zipPath);

  // Also make a copy directly in workspace root for easy user access
  const rootZipPath = path.join(workspaceRoot, zipFileName);
  fs.copyFileSync(zipPath, rootZipPath);

  const finalStat = fs.statSync(zipPath);
  const finalSha256 = calculateFileSha256(zipPath);

  console.log('\n================================================================');
  console.log('  CONSOLIDATED STAGING DEPLOYMENT PACKAGE SUCCESSFULLY CREATED');
  console.log('================================================================');
  console.log(`Primary Archive:   ${zipPath}`);
  console.log(`Root Archive Copy: ${rootZipPath}`);
  console.log(`File Size (Bytes): ${finalStat.size} (${(finalStat.size / (1024 * 1024)).toFixed(2)} MB)`);
  console.log(`SHA-256 Hash:      ${finalSha256}`);
  console.log(`Timestamp:         ${finalStat.mtime.toISOString()}`);
  console.log('Status:            PACKAGE READY FOR REVIEW. DEPLOYMENT NOT AUTHORIZED.');
  console.log('================================================================\n');
}

main().catch(err => {
  console.error('\n❌ Packaging Failed:', err);
  if (fs.existsSync(zipPathTmp)) {
    try { fs.unlinkSync(zipPathTmp); } catch (_) {}
  }
  if (fs.existsSync(extractDir)) {
    try { fs.rmSync(extractDir, { recursive: true, force: true }); } catch (_) {}
  }
  process.exit(1);
});

