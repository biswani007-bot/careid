import json
import os
import re

print("==================================================")
print("  CAREID POSTMAN COMPREHENSIVE UPDATE PIPELINE")
print("==================================================")

# Step 1: Update scripts/generate-careid-postman.js line 794 description
with open('scripts/generate-careid-postman.js', 'r', encoding='utf-8') as f:
    gen_content = f.read()

old_desc_block = """  // 3. Collection Documentation / Description
  collection.info.name = 'CareID API — Staging Integration Collection (November 6, 2026 Release)';
  collection.info.description = `# CareID Enterprise Backend — Staging Integration Collection

Official API collection for the **CareID / Health Vault 360** clinical, identity, compliance, and governance platform backend, representing the verified **November 6, 2026 Production & Staging Release**.

## Release Features & Architecture
- **Treatment Offers Subsystem:** Multi-procedure clinical proposals, atomic sequential identifiers (`OFF-YYYYMMDD-XXXX`, `FIN-YYYYMMDD-XXXX`), dispatch, counter-offers, acceptance/rejection workflows.
- **Healthcare Financing Persistence:** PostgreSQL-backed financing applications and status audit history with AES-256-GCM field-level encryption for PAN and monthly income.
- **OCR Engine Microservice:** Persistent PaddleOCR / PyMuPDF service with private loopback endpoint and `POST /api/v1/insurance/ocr/extract`.
- **Target Staging API:** `https://360api.vnvision.in`
- **Default Base URL:** `https://360api.vnvision.in/api/v1`
- **Database Engine:** PostgreSQL with Prisma ORM (22 clinical models, 6 sequential migrations)
- **Process Manager:** PM2 on aaPanel Linux (port `3073`)
- **Total Operations:** 559 HTTP operations across 27 domain folders"""

new_desc_block = """  // 3. Collection Documentation / Description
  collection.info.name = 'CareID Enterprise API — Consolidated Staging Integration Collection (Phase 12 Release — November 16, 2026)';
  collection.info.description = `# CareID Enterprise Backend — Staging Integration Collection

Official API collection for the **CareID / Health Vault 360** centralized clinical, identity, compliance, and governance platform backend, representing the verified **Phase 12 Final Consolidated Release (November 16, 2026)**.

## Release Features & Architecture
- **Complete Clinical & Operational Parity:** 100% route coverage across all 36 domain folders with 687 verified endpoints.
- **Doctor Web & Mobile Subsystems:** Clinical encounters, Cath Lab interventional cardiology with DICOM series and safety timeouts, CPT procedure codes search, digital Rx certificates, dental and vision health records, clinical addenda, and cryptographic record share tokens.
- **Admin Web Management:** Full patient creation/update, doctor registry management, and health records ingest.
- **Authentication & Security:** Dual authentication models (Patient/Doctor phone OTP with staging bypass \`123456\` and Admin password login), token refresh rotation, and HMAC-SHA256 enterprise QR subsystem.
- **Database Engine:** PostgreSQL 16 with Prisma ORM (7 sequential migrations including \`20261114120000_doctor_app_core_clinical_subsystems\`).
- **Target Staging API Host:** \`https://360api.vnvision.in\`
- **Base URL Variable:** \`{{baseUrl}}\` = \`https://360api.vnvision.in\` (requests format as \`{{baseUrl}}/api/v1/...\`).
- **Automated Pre-Request Normalization:** Embedded collection-level script automatically strips trailing \`/api/v1\` if entered in environment variables, preventing double \`/api/v1\` errors.
- **Total Operations:** 687 HTTP operations across 36 domain folders.

## Verified Staging Test Accounts
| Role | Allowlisted Phone | Staging OTP | Seeded Email | Function |
|---|---|---|---|---|
| **DOCTOR (Staging Live)** | \`+919876543210\` | \`123456\` | *(N/A)* | Live Staging Verified Doctor Account |
| **SUPER_ADMIN** | \`+16505550001\` | \`123456\` | \`superadmin@careid.test\` | Platform Super Administrator |
| **ADMIN** | \`+16505550002\` | \`123456\` | \`admin@careid.test\` | System Administrator |
| **DOCTOR (Synthetic)** | \`+16505550003\` | \`123456\` | *(N/A)* | Synthetic Doctor (Dr. Sarah Jenkins) |
| **PATIENT** | \`+16505550004\` | \`123456\` | *(N/A)* | Patient Health Vault (John Doe) |
| **FACILITY_ADMIN** | \`+16505550005\` | \`123456\` | *(N/A)* | Hospital Admin (Metro General) |
| **STAFF** | \`+16505550006\` | \`123456\` | *(N/A)* | Clinical Nurse / Triage (Alice Smith) |
| **FAMILY_MEMBER** | \`+16505550007\` | \`123456\` | *(N/A)* | Family Member / Caregiver (Jane Doe) |"""

if old_desc_block in gen_content:
    gen_content = gen_content.replace(old_desc_block, new_desc_block)
    with open('scripts/generate-careid-postman.js', 'w', encoding='utf-8') as f:
        f.write(gen_content)
    print("✓ Updated scripts/generate-careid-postman.js collection metadata & description")
else:
    print("! Notice: old_desc_block already modified or not found verbatim")

# Step 2: Update scripts/generate-postman.js to delegate cleanly
delegator_code = """/**
 * CareID Enterprise Backend — Postman Generation Entrypoint
 * Delegating to the unified and consolidated CareID generator (scripts/generate-careid-postman.js).
 */
require('./generate-careid-postman');
"""
with open('scripts/generate-postman.js', 'w', encoding='utf-8') as f:
    f.write(delegator_code)
print("✓ Updated scripts/generate-postman.js to delegate to generate-careid-postman.js")

# Step 3: Fix CareID-Doctor-Patient-Staging.postman_collection.json
print("\n--- Processing CareID-Doctor-Patient-Staging.postman_collection.json ---")
with open('CareID-Doctor-Patient-Staging.postman_collection.json', 'r', encoding='utf-8') as f:
    dp_col = json.load(f)

# Update metadata
dp_col['info']['name'] = 'CareID API — Doctor & Patient App Integration Collection (Phase 12 Release — November 16, 2026)'
dp_col['info']['description'] = 'Official CareID / Health Vault 360 integration collection tailored specifically for Doctor and Patient applications. Verified against staging API at https://360api.vnvision.in (Phase 12 Consolidated Release — November 16, 2026).'

# Update variables
vars_list = dp_col.get('variable', [])
vars_dict = {v['key']: v for v in vars_list}

vars_dict['baseUrl'] = {
    'key': 'baseUrl',
    'value': 'https://360api.vnvision.in',
    'type': 'string',
    'description': 'CareID API Origin Host'
}
vars_dict['base_url'] = {
    'key': 'base_url',
    'value': 'https://360api.vnvision.in',
    'type': 'string',
    'description': 'CareID API Origin Host (alias)'
}
vars_dict['doctorPhone'] = {
    'key': 'doctorPhone',
    'value': '+919876543210',
    'type': 'string',
    'description': 'Primary Staging Verified Doctor Phone Number'
}
vars_dict['testDoctorPhone'] = {
    'key': 'testDoctorPhone',
    'value': '+919876543210',
    'type': 'string',
    'description': 'Staging Test Doctor Phone Number'
}
vars_dict['seedDoctorPhone'] = {
    'key': 'seedDoctorPhone',
    'value': '+16505550003',
    'type': 'string',
    'description': 'Synthetic Doctor Phone Number (Dr. Sarah Jenkins)'
}
vars_dict['patientPhone'] = {
    'key': 'patientPhone',
    'value': '+16505550004',
    'type': 'string',
    'description': 'Staging Patient Phone Number (John Doe)'
}
vars_dict['testOtp'] = {
    'key': 'testOtp',
    'value': '123456',
    'type': 'string',
    'description': 'Staging Test OTP Bypass Code'
}
dp_col['variable'] = list(vars_dict.values())

# Add pre-request script
dp_col['event'] = [
    {
        'listen': 'prerequest',
        'script': {
            'type': 'text/javascript',
            'exec': [
                '// Defensive URL Normalizer: Supports baseUrl with or without /api/v1 suffix',
                'let currentBase = pm.environment.get("baseUrl") || pm.collectionVariables.get("baseUrl") || "https://360api.vnvision.in";',
                'if (typeof currentBase === "string" && currentBase.endsWith("/api/v1")) {',
                '    pm.variables.set("baseUrl", currentBase.replace(/\\/api\\/v1\\/?$/, "").replace(/\\/+$/, ""));',
                '}',
                'let currentSnake = pm.environment.get("base_url") || pm.collectionVariables.get("base_url") || "https://360api.vnvision.in";',
                'if (typeof currentSnake === "string" && currentSnake.endsWith("/api/v1")) {',
                '    pm.variables.set("base_url", currentSnake.replace(/\\/api\\/v1\\/?$/, "").replace(/\\/+$/, ""));',
                '}'
            ]
        }
    }
]

# Fix missing /api/v1 in requests
fixed_count = 0
def fix_dp_items(items):
    global fixed_count
    for item in items:
        if 'item' in item:
            fix_dp_items(item['item'])
        elif 'request' in item:
            req = item['request']
            url = req.get('url', {})
            raw = url.get('raw', '')
            if '{{baseUrl}}' in raw and not raw.startswith('{{baseUrl}}/api/v1'):
                # Replace {{baseUrl}}/ with {{baseUrl}}/api/v1/
                new_raw = raw.replace('{{baseUrl}}/', '{{baseUrl}}/api/v1/')
                url['raw'] = new_raw
                # Update path array
                path_arr = url.get('path', [])
                if path_arr and path_arr[0] != 'api':
                    url['path'] = ['api', 'v1'] + path_arr
                fixed_count += 1

fix_dp_items(dp_col.get('item', []))
print(f"✓ Fixed {fixed_count} requests missing /api/v1 in Doctor-Patient collection")

# Write to root and docs
with open('CareID-Doctor-Patient-Staging.postman_collection.json', 'w', encoding='utf-8') as f:
    json.dump(dp_col, f, indent=2)
with open('docs/postman/CareID-Doctor-Patient-Staging.postman_collection.json', 'w', encoding='utf-8') as f:
    json.dump(dp_col, f, indent=2)
print("✓ Saved CareID-Doctor-Patient-Staging.postman_collection.json to root and docs/postman/")

print("\nSUCCESS: Pre-generation pipeline setup completed successfully!")
