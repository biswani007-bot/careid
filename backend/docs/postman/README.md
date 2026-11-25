# Health Vault 360 (HVAPI) Postman Collection & Environment

This directory contains the complete, production-grade Postman collection and environment for the **Health Vault 360 Enterprise API**.

---

## 📦 Files Included

| File | Description | Location |
| :--- | :--- | :--- |
| **`CareID-Staging.postman_collection.json`** | **Official CareID Staging Integration Collection** (v2.1.0) with all 24 functional modules and 426 endpoints | Root & `docs/postman/` |
| **`CareID-Staging.postman_environment.json`** | **Official Staging Environment** pre-configured for `https://360api.vnvision.in` with synthetic staging UUIDs | Root & `docs/postman/` |
| **`Health-Vault-360-API.postman_collection.json`** | Legacy alias identical to the CareID staging collection for backwards compatibility | Root & `docs/postman/` |
| **`Health-Vault-360-Local.postman_environment.json`** | Legacy alias identical to the staging environment configured with `http://localhost:3000` | Root & `docs/postman/` |

---

## 🚀 How to Import into Postman

1. Open **Postman**.
2. Click **Import** (top left).
3. Drag & drop or select:
   - `CareID-Staging.postman_collection.json`
   - `CareID-Staging.postman_environment.json`
4. Select the **"CareID - Staging Environment"** active environment from the top-right environment dropdown.

---

## ⚡ Zero-Friction Automated Authentication Flow

All protected endpoints in the collection are configured to inherit the collection-level Bearer Token: `{{bearerToken}}`.

You do not need to manually copy and paste JWT tokens! Follow these simple steps:

```
[1. Request OTP] ──> Auto-saves {{challengeId}}
      │
      ▼
[2. Verify OTP]  ──> Auto-saves {{bearerToken}} & {{refreshToken}}
      │
      ▼
[3. Run Any Request] ──> Works immediately with valid Authorization!
```

1. **Request OTP**:
   - Navigate to `Authentication & Identity` > `POST Request Phone OTP`.
   - Send the request (default test phone: `+14155552671`).
   - The test script **automatically saves** the returned `challengeId` to the `{{challengeId}}` collection variable.

2. **Verify OTP & Login**:
   - Navigate to `Authentication & Identity` > `POST Verify Phone OTP & Login`.
   - Send the request (already pre-filled with `{{challengeId}}` and OTP `123456`).
   - The test script **automatically saves** `accessToken` into `{{bearerToken}}` and `refreshToken` into `{{refreshToken}}`.

3. **Explore Any Endpoint**:
   - Every protected clinical, administrative, or operational endpoint is now fully authorized and ready to execute.

4. **Token Rotation**:
   - When calling `POST /api/v1/auth/token/refresh`, the rotated token is automatically saved into `{{bearerToken}}`.

---

## 🗂️ Collection Hierarchy & Subsystem Coverage (24 Folders, 426 Requests)

| # | Folder | Description | Request Count |
| :-: | :--- | :--- | :-: |
| 01 | **Environment & Health Checks** | Liveness, readiness, and operational probes | 3 |
| 02 | **Authentication & Identity** | OTP challenge/verification, JWT rotation, session revocation, logout, admin auth | 12 |
| 03 | **Patients** | Patient demographic, clinical, biometric, and guardian management | 27 |
| 04 | **Doctors** | Provider directory, specialties, qualifications, and verifications | 18 |
| 05 | **Facilities** | Hospitals, clinics, bed capacity, departments, and geo-locations | 20 |
| 06 | **Staff Management** | Healthcare workers, nursing staff, administrative personnel | 16 |
| 07 | **Medical Records** | EHR encounters, vital signs, prescriptions, dental, vision, and diagnoses | 11 |
| 08 | **Family & Relationships** | Family circle members, emergency contacts, and proxy permissions | 22 |
| 09 | **Referrals & Care Coordination** | Cross-facility doctor-to-doctor patient referrals and triage | 14 |
| 10 | **Schedules & Availability** | Doctor availability slots, rosters, and booking rules | 13 |
| 11 | **Shifts & Rosters** | Operational shift rosters, assignments, and swaps | 4 |
| 12 | **Holidays** | Facility holidays and provider leave management | 2 |
| 13 | **Health Cards & QR Passes** | Digital Health Vault cards, passes, and access levels | 16 |
| 14 | **Enterprise QR Subsystem** | Dynamic QR generation, scan verification, and secure access cards | 20 |
| 15 | **Immunisation Platform** | Vaccination records, schedules, adverse reactions, certificates | 18 |
| 16 | **Reports & Diagnostics** | Clinical lab results, diagnostic summaries, and medical reports | 32 |
| 17 | **Insurance & Claims** | TPA claims, policies, pre-authorizations, and coverage checks | 22 |
| 18 | **OCR & Document Processing** | Optical Character Recognition for lab reports and prescriptions | 14 |
| 19 | **AI OCR & Smart Extraction** | Automated ML-assisted medical image scanning and field extraction | 2 |
| 20 | **File Uploads & Documents** | Secure S3/B2/GCS presigned uploads, attachment metadata, downloads | 6 |
| 21 | **Notifications & Alerts** | In-app, push, SMS, and email alerts dispatching and history | 16 |
| 22 | **Admin & System Config** | System administration, role assignments, audit logs, and configurations | 23 |
| 23 | **Governance & Consent** | Consent architecture, compliance audits, and legal consents | 28 |
| 24 | **Security & Observability** | Threat detection, IP blacklists, device fingerprints, telemetry probes | 32 |
| | **TOTAL** | **Comprehensive Platform Operations** | **426** |

---

## 🛠️ How to Regenerate After API Changes

If you add new controllers or routes in NestJS, simply run:

```bash
npm run postman:generate
```

This will automatically:
1. Re-compile NestJS OpenAPI metadata via `SwaggerModule`.
2. Update `docs/swagger-spec.json`.
3. Re-convert and apply all Postman tests, authentication rules, variables, and realistic payload generators.
4. Output the updated collection and environment files.
