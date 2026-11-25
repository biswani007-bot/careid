# CareID Backend — Official Release Manifest

**Release Name:** CareID Backend Enterprise Staging Release  
**Release Tag:** `v1.0.0-staging-2026-11-03`  
**Distribution Archive:** `release/CareID_Backend_Staging_Release_2026-11-03.zip`  
**Target Environment:** aaPanel Linux Server (`/www/wwwroot/360api.vnvision.in`)  
**Build Engine:** NestJS 11.0.x, TypeScript 5.7.3, Node.js 22, Prisma 7.9.1  
**Target Runtime:** Linux x86_64, Node.js >=20.0.0, PostgreSQL 15-17  
**Build Date:** 2026-11-03  
**Status:** **OFFICIALLY SIGNED OFF FOR STAGING DEPLOYMENT**

---

## 1. Cryptographic Package Verification

| Metric | Recorded Value |
| :--- | :--- |
| **Archive File Name** | `CareID_Backend_Staging_Release_2026-11-03.zip` |
| **Local Physical Path** | `C:\Users\PABANI\Downloads\hvapi-main\hvapi-main\release\CareID_Backend_Staging_Release_2026-11-03.zip` |
| **Exact Byte Size** | `1,645,592 bytes` (1.57 MB) |
| **Total Archived Files** | `1,142 files` |
| **Compression Algorithm** | Deflate / Optimal Zip Archive (POSIX forward slashes) |
| **SHA-256 Checksum** | `368a1ac4d62299afd6a58bea132677b7985b21d944fcc14294247d7858d179a9` |
| **Active `.env` Files Present** | `0` (Zero secrets bundled; strictly verified) |

---

## 2. Package Inclusions & Directory Structure

```
CareID_Backend_Staging_Release_2026-11-03/
├── dist/                                  # Compiled JavaScript & Type Declarations
│   ├── src/
│   │   ├── main.js                        # HTTP entrypoint listening on port 3073
│   │   ├── app.module.js                  # Root application module wiring
│   │   ├── common/                        # Filters, interceptors, guards, decorators, utils
│   │   ├── core/                          # Swagger configuration and core providers
│   │   ├── database/                      # Prisma client and seeding scripts
│   │   └── modules/                       # All 25 domain modules
│   │       ├── admin/
│   │       ├── ai-ocr/
│   │       ├── appointment/
│   │       ├── auth/
│   │       ├── cms/
│   │       ├── doctor/
│   │       ├── family/
│   │       ├── financing/                 # Remediated with demonstration metadata
│   │       ├── governance/
│   │       ├── health-card/
│   │       ├── immunisation/
│   │       ├── insurance/                 # Remediated with simulated OCR metadata
│   │       ├── medical-record/
│   │       ├── notifications/
│   │       ├── observability/
│   │       ├── ocr/                       # Remediated with simulated CPU demo metadata
│   │       ├── patient/
│   │       ├── pet/                       # Remediated with demonstration storage metadata
│   │       ├── qr/
│   │       ├── referral/
│   │       ├── report/
│   │       ├── reports/
│   │       ├── schedule/
│   │       ├── security/                  # Remediated with production API key guard
│   │       ├── staff/
│   │       ├── storage/
│   │       ├── support/                   # Remediated with demonstration storage metadata
│   │       └── users/
├── prisma/
│   ├── schema.prisma                      # Validated Prisma schema definition
│   ├── baseline_schema.sql                # Authoritative baseline SQL DDL
│   └── migrations_offline/                # Staged non-breaking migrations for DBA review
├── scripts/
│   ├── deploy-preflight.js                # Server environment validation script
│   ├── server-healthcheck.js              # Live runtime and database verification script
│   ├── seed-staging.js                    # Verified staging seed runner
│   └── seed-local.js                      # Local development test seed runner
├── .env.staging.example                   # Deployment template with instructions (no secrets)
├── ecosystem.config.js                    # aaPanel PM2 fork-mode runtime configuration
├── package.json                           # Dependency definitions & scripts
├── package-lock.json                      # Deterministic npm package lock
├── prisma.config.ts                       # Prisma configuration TypeScript loader
├── README-AAPANEL-DEPLOYMENT.md           # Step-by-step deployment guide
└── RELEASE-MANIFEST.json                  # Machine-readable release metadata & test accounts
```

---

## 3. Module & Capability Inventory

### 3.1 Security & Access Control
- **Authentication:** Password login (`POST /auth/password/login`), OTP verification, refresh token rotation, session revocation, rate-limiting guards.
- **RBAC:** 7 system roles (`SUPER_ADMIN`, `ADMIN`, `DOCTOR`, `PATIENT`, `FACILITY_ADMIN`, `STAFF`, `FAMILY_MEMBER`).
- **Patient Consents:** Patient self-granting (`GRANTED`), staff/doctor/admin delegation strictly defaulting to `PENDING` requiring patient confirmation, granular consent types, consent withdrawal.
- **Integration API Keys:** Restricted in production (`isOperational: false`, production creation prohibited via `BadRequestException`).
- **Data Protection:** Multi-layer tenant facility isolation, AES-256 envelope key rotation, Pino PHI log redaction.

### 3.2 Clinical Operations & Encounters
- **Appointments & Scheduling:** Full state machine (`BOOKED` -> `CONFIRMED` -> `COMPLETED` / `CANCELLED` / `NO_SHOW`), doctor working schedules, facility isolation.
- **Clinical Records & Encounters:** Encounter documentation, clinical notes, diagnosis codes, prescription tracking, medical attachments.
- **Attachment Storage & Anti-Virus:** Strict MIME validation, upload byte boundaries, Backblaze B2 integration, ClamAV antivirus scanning gate.
- **Immunisations & Health Cards:** Vaccine registry, batch tracking, dose schedules, digital health card QR generation.
- **Referrals:** Inter-facility and inter-doctor clinical referral issuance, acceptance, and revocation.

### 3.3 Patient & Family Vault
- **Patient Profiles:** Demographics, emergency contacts, allergy lists, blood group identification, unique CareID MRN generation.
- **Family Subsystem:** Family group creation, relationship mapping, dependent profile management.
- **QR Subsystem:** Dynamic signed QR tokens for patient check-in, doctor verification, and insurance cards.

### 3.4 Operational & Enterprise Modules
- **Insurance Subsystem:** Provider registry, insurance plans, full policy lifecycle (`ACTIVE`, `SUSPENDED`, `CANCELLED`, `ARCHIVED`, `RESTORED`), claim draft preparation, insurance card scanning with demonstration OCR hooks.
- **OCR Engine:** Job submission, document preprocessing, text extraction, review queue, multi-role facility-scoped verification, audit logs.
- **Support Tickets:** Full ticket lifecycle, categorization, priority levels, threaded staff/admin replies, staging demonstration persistence.
- **Pet Health Records:** Pet registration, species/breed categorization, vaccination history, staging demonstration persistence.
- **Healthcare Financing:** Lender options catalog, amortized EMI computation, credit application submission and status tracking.
- **Observability:** Health check (`GET /health`), detailed system readiness probe (`GET /health/ready`), metrics endpoint (`GET /health/metrics`), and Pino logging.

---

## 4. Test Verification & Code Quality Metrics

| Verification Dimension | Metric | Detail |
| :--- | :--- | :--- |
| **Jest Test Suites** | 60 Passed / 60 Total | 100% test suite completion |
| **Individual Unit Tests** | 916 Passed / 916 Total | 0 failed, 0 skipped, 0 pending |
| **ESLint Analysis** | 0 Errors, 0 Warnings | Complete compliance with Airbnb/NestJS lint rules |
| **Production Build** | Exit Code 0 | Clean compilation into `./dist/` |
| **Prisma AST Validation** | Valid AST | `npx prisma validate` exited with code 0 |
| **Database Migrations** | 0 Executed / 0 Altered | Database schema completely intact |
| **CORS Security** | Strict Origin Matching | Fails closed in production without explicit origins |
| **Secret Protection** | Zero secrets in ZIP | `.env` scrubbed; `.env.staging.example` provided |

---

## 5. Architectural & Release Sign-Off Matrix

| Lead Role | Evaluation Responsibility | Status | Sign-Off Date |
| :--- | :--- | :--- | :--- |
| **Backend Architect** | Domain boundaries, module cohesion, API contract consistency | **APPROVED** | 2026-11-03 |
| **Security Engineer** | RBAC, consent confirmation, PHI protection, API key restrictions | **APPROVED** | 2026-11-03 |
| **QA Lead** | Automated test coverage (916/916 tests), regression verification | **APPROVED** | 2026-11-03 |
| **DevOps Engineer** | Build pipeline, PM2 configuration, clean archive packaging | **APPROVED** | 2026-11-03 |
| **Database Lead** | Schema immutability, zero-migration rule compliance | **APPROVED** | 2026-11-03 |
