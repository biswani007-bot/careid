import os
import zipfile
import hashlib
import json
from datetime import datetime

dist_dir = 'dist'
prisma_dir = 'prisma'
scripts_dir = 'scripts'

archive_names = [
    'CareID_Master_Backend_Production_Ready_Deployment_2026-11-18.zip',
    'CareID_Final_Consolidated_Staging_Deployment_Phase12.zip'
]

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
        "name": "CareID_Master_Backend_Production_Ready_Deployment_2026-11-18",
        "version": "1.2.0-master-repair",
        "buildTimestamp": datetime.utcnow().isoformat() + "Z",
        "targetEnvironment": "https://360api.vnvision.in/api/v1",
        "platform": "Linux (Ubuntu/Debian) via aaPanel + PM2 + Nginx (Port 3073)",
        "phase": "Master Engineering Repair & Production Readiness (Workstreams A-G)",
        "runtimeStack": {
            "node": ">=20.0.0 LTS",
            "framework": "NestJS 10.x / 11.x",
            "orm": "Prisma ORM 7.x",
            "database": "PostgreSQL 16"
        }
    },
    "workstreamsCovered": {
        "Workstream_A": "Treatment Offer Lifecycle 1-5 (Financing binding normalization, discount approval supervisor RBAC, clinical review prerequisite)",
        "Workstream_B": "Treatment Offer Lifecycle 11-15 (Readiness GO checklist enforcement, atomic hold BLOCKED->BOOKED slot conversion, day-of-procedure check-in notes persistence and GET /appointments/:id/check-in endpoint)",
        "Workstream_C": "Offer Dispatch PostgreSQL Abort Resolution (Fixed NotificationType PATIENT enum and post-commit non-blocking dispatch)",
        "Workstream_D": "Security Settings Reset API (POST /api/v1/admin/settings/reset?category=SECURITY restoring all 19 authoritative baseline security settings)",
        "Workstream_E": "Admin Patient Profile HTTP 500 Permanent Fix (Lucas Vance safe date parsing, relation null-safety, and BLOCKED user status handling)",
        "Workstream_F": "OCR Reprocessing & Format Validation (Automatic failureReason nullification on reprocess/completion, unsupported format 400 rejection)",
        "Workstream_G": "Cross-Module Lifecycle and Data Integrity Audit"
    },
    "fileCount": len(files_to_include),
    "files": manifest_entries
}

manifest_json_path = 'DEPLOYMENT_MANIFEST.json'
with open(manifest_json_path, 'w', encoding='utf-8') as f:
    json.dump(manifest_obj, f, indent=2)

files_to_include.append((manifest_json_path, 'DEPLOYMENT_MANIFEST.json'))

for archive_name in archive_names:
    print(f"Creating archive {archive_name}...")
    with zipfile.ZipFile(archive_name, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for full_path, arcname in files_to_include:
            zipf.write(full_path, arcname)

    with open(archive_name, 'rb') as f:
        archive_bytes = f.read()
    archive_sha256 = hashlib.sha256(archive_bytes).hexdigest()
    print(f"Archive: {archive_name}")
    print(f"Size: {len(archive_bytes)} bytes ({len(archive_bytes) / 1024 / 1024:.2f} MB)")
    print(f"SHA-256: {archive_sha256}")
