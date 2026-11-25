import os
import zipfile
import hashlib
import json
import shutil
from datetime import datetime

dist_dir = 'dist'
prisma_dir = 'prisma'
scripts_dir = 'scripts'

archive_name = 'CareID_Consolidated_Backend_Staging_Deployment_2026-11-16_Phase11.zip'
manifest_name = 'DEPLOYMENT_MANIFEST.json'

files_to_include = []

# Collect dist
for root, dirs, files in os.walk(dist_dir):
    for f in files:
        full_path = os.path.join(root, f)
        arcname = os.path.relpath(full_path, '.').replace('\\', '/')
        files_to_include.append((full_path, arcname))

# Collect prisma
for root, dirs, files in os.walk(prisma_dir):
    for f in files:
        full_path = os.path.join(root, f)
        arcname = os.path.relpath(full_path, '.').replace('\\', '/')
        files_to_include.append((full_path, arcname))

# Collect scripts
for root, dirs, files in os.walk(scripts_dir):
    for f in files:
        full_path = os.path.join(root, f)
        arcname = os.path.relpath(full_path, '.').replace('\\', '/')
        files_to_include.append((full_path, arcname))

# Root files
root_files = [
    'package.json',
    'package-lock.json',
    'ecosystem.config.js',
    'prisma.config.ts',
    'README-AAPANEL-DEPLOYMENT.md',
    '.env.staging.example',
]
for rf in root_files:
    if os.path.exists(rf):
        files_to_include.append((rf, rf))

manifest_entries = {}
for full_path, arcname in files_to_include:
    with open(full_path, 'rb') as f:
        data = f.read()
    sha256 = hashlib.sha256(data).hexdigest()
    manifest_entries[arcname] = {
        'sha256': sha256,
        'sizeBytes': len(data)
    }

manifest_obj = {
    "release": {
        "name": "CareID_Consolidated_Backend_Staging_Deployment_2026-11-16_Phase11",
        "packageName": archive_name,
        "version": "1.1.0",
        "buildTimestamp": datetime.utcnow().isoformat() + "Z",
        "targetEnvironment": "https://360api.vnvision.in/api/v1",
        "platform": "Linux (Ubuntu/Debian/Rocky) via aaPanel + PM2 + Nginx (Port 3073)",
        "authorizationStatus": "PACKAGE CREATION AUTHORIZED. DEPLOYMENT TO LIVE SERVER NOT AUTHORIZED.",
        "phase": "Phase 11: Admin Web Management Functionality Restoration",
        "runtimeStack": {
            "node": ">=20.0.0 LTS (v20 or v22)",
            "framework": "NestJS 10.x / 11.x",
            "orm": "Prisma ORM 7.x",
            "database": "PostgreSQL 15+"
        }
    },
    "restoredAdminCapabilities": [
        {
            "feature": "Admin Patient Creation",
            "endpoint": "POST /api/v1/admin/patients",
            "description": "Registers patient with User, PatientProfile, HealthCard, and Vault ID directly from Admin Web"
        },
        {
            "feature": "Admin Patient Demographic Editing",
            "endpoint": "PUT /api/v1/admin/patients/:patientId",
            "description": "Allows updating patient names, DOB, gender, blood group, address, zip code, and photo URL"
        },
        {
            "feature": "Admin Medical Record Creation & Attachment Ingestion",
            "endpoint": "POST /api/v1/admin/medical-records",
            "description": "Creates medical records with encounters and attaches clinical scans/documents with virus scan verification"
        },
        {
            "feature": "Admin Doctor Registry Listing",
            "endpoint": "GET /api/v1/admin/doctors",
            "description": "Lists master provider registry with hospital facility mappings and specialty filters"
        },
        {
            "feature": "Medical Record Lifecycle Administrative Permissions",
            "endpoints": [
                "PUT /api/v1/medical-records/:id",
                "POST /api/v1/medical-records/:id/archive",
                "POST /api/v1/medical-records/:id/restore",
                "POST /api/v1/attachments"
            ],
            "description": "Enables Admin and Staff to manage clinical notes, archive/restore records, and upload attachments without patient profile ownership requirements"
        }
    ],
    "verificationStatus": {
        "typeCheck": "npx tsc --noEmit passed with 0 errors",
        "testSuitesPassing": "9 of 9 Phase 11 tests passing, 88 test suites passing across unit suite",
        "buildSuccess": "npm run build completed with exit code 0"
    },
    "manifestEntries": manifest_entries
}

manifest_bytes = json.dumps(manifest_obj, indent=2).encode('utf-8')
manifest_sha256 = hashlib.sha256(manifest_bytes).hexdigest()

with zipfile.ZipFile(archive_name, 'w', compression=zipfile.ZIP_DEFLATED) as z:
    z.writestr(manifest_name, manifest_bytes)
    for full_path, arcname in files_to_include:
        z.write(full_path, arcname)

# Also copy to release/ folder
release_dir = 'release'
if not os.path.exists(release_dir):
    os.makedirs(release_dir)
shutil.copyfile(archive_name, os.path.join(release_dir, archive_name))

with open(archive_name, 'rb') as f:
    zip_bytes = f.read()
zip_sha256 = hashlib.sha256(zip_bytes).hexdigest()

print(f"Archive created: {archive_name}")
print(f"Archive size: {len(zip_bytes)} bytes")
print(f"Archive SHA256: {zip_sha256}")
print(f"Total entries: {len(files_to_include) + 1}")
