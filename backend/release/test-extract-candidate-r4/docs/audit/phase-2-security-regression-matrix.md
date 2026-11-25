# CareID Backend — Phase 2: Security Regression Matrix

## 1. Executive Overview

This document provides a comprehensive verification matrix for all high-priority security defects and operational blockers remediated during **Phase 2: Critical Security Remediation and Operational Blockers** of the CareID (Health Vault 360) backend platform.

All tests referenced in this matrix have been executed against the active codebase at `c:\Users\PABANI\Downloads\hvapi-main\hvapi-main` and verified through automated test suites in Jest, ESLint, and TypeScript compiler checks.

---

## 2. Security Remediation Matrix

| Finding ID | Vulnerability / Issue Description | Route / Subsystem | Intended Role Policy | Ownership / Domain Scope | Remediation Status | Automated Regression Suite | Test Result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **CRIT-SEC-01** | Arbitrary CORS Origin Reflection with Credentials (`origin: true`) | Global HTTP Boundary (`src/main.ts`) | N/A (HTTP Protocol Boundary) | Configured Allowlist only; rejects wildcards; dev fallback | `FIXED AND TESTED` | `cors.util.spec.ts`, `phase-2-security-regression.spec.ts` | **19/19 PASSED** |
| **HIGH-SEC-05** | Broken Object-Level Authorization (IDOR) & Missing Role Guards | `PUT /api/v1/doctors/:id` | `ADMIN`, `SUPER_ADMIN`, `DOCTOR` | DOCTOR restricted to `doctor.userId === caller.userId`; Admin unconstrained | `FIXED AND TESTED` | `phase-2-security-regression.spec.ts`, `doctor.service.spec.ts` | **32/32 PASSED** |
| **HIGH-SEC-06** | Sensitive Identity Data Harvesting via Unscoped Health Card Search | `GET /api/v1/health-cards/search` | `ADMIN`, `SUPER_ADMIN`, `DOCTOR`, `STAFF`, `FACILITY_ADMIN` | Patients restricted to personal card endpoints (`/health-cards`, `/:id`); global search denied | `FIXED AND TESTED` | `phase-2-security-regression.spec.ts`, `health-card.service.spec.ts` | **32/32 PASSED** |
| **HIGH-SEC-07** | Sensitive Policy Harvesting via Global Insurance Policy Search | `GET /api/v1/insurance/search` | `ADMIN`, `SUPER_ADMIN`, `FACILITY_ADMIN`, `STAFF` | Patients and external doctors denied; billing and hospital administrators permitted | `FIXED AND TESTED` | `phase-2-security-regression.spec.ts`, `insurance.service.spec.ts` | **32/32 PASSED** |
| **HIGH-SEC-04** | Cross-Facility Tampering / IDOR by Facility Administrators | `PUT /api/v1/facilities/:id` | `ADMIN`, `SUPER_ADMIN`, `FACILITY_ADMIN` | `FACILITY_ADMIN` verified via staff/doctor affiliation (`isUserAffiliatedWithFacility`); foreign updates rejected | `FIXED AND TESTED` | `phase-2-security-regression.spec.ts`, `facility.service.spec.ts` | **32/32 PASSED** |
| **MED-SEC-01** | Unauthorized Directory Modification: Vaccine & Schedule Creation | `POST /api/v1/immunisation/vaccines`, `POST /api/v1/immunisation/schedules` | `ADMIN`, `SUPER_ADMIN` | Patients and clinical doctors denied creation of global vaccine directory records | `FIXED AND TESTED` | `phase-2-security-regression.spec.ts`, `immunisation.service.spec.ts` | **32/32 PASSED** |
| **MED-SEC-02** | Missing Authorization Guards on Roster & Schedule Mutations | `POST /api/v1/schedules`, `PUT /schedules/:id`, `DELETE /schedules/:id`, `POST /shifts`, `POST /holidays` | `ADMIN`, `SUPER_ADMIN`, `FACILITY_ADMIN` | Roster and holiday modifications restricted to administrative and facility authority | `FIXED AND TESTED` | `phase-2-security-regression.spec.ts`, `schedule.service.spec.ts` | **32/32 PASSED** |
| **HIGH-SEC-08** | Clinical Data Exposure & Cross-Patient SNOOP via Referral Endpoints | `GET /api/v1/referrals`, `GET /api/v1/referrals/:id` | Authenticated with participant scoping | Patient restricted to own profile; Doctor restricted to referring/receiving; Staff restricted to affiliated facility | `FIXED AND TESTED` | `phase-2-security-regression.spec.ts`, `referral.service.spec.ts` | **32/32 PASSED** |
| **MED-INT-02** | Missing OCR Reprocessing Endpoint (HTTP 404 Route Absence) | `POST /api/v1/ocr/reprocess/:jobId` | Authenticated submitter or admin | Job submitter or `ADMIN`/`SUPER_ADMIN`; active jobs (`OCR_RUNNING`, `EXTRACTING`) rejected with 409 | `FIXED AND TESTED` | `phase-2-security-regression.spec.ts`, `ocr.service.spec.ts` | **32/32 PASSED** |
| **HIGH-SEC-03** / **CRIT-INT-01** | Uploaded Attachment Download Deadlock (`PENDING` vs `CLEAN`) | File Upload & Download Subsystem (`MedicalRecordService` / `ReportService`) | Fail-Closed Policy strictly preserved | Downloads remain blocked while scan is `PENDING`/`INFECTED`. ClamAV/GuardDuty operational integration required | `BLOCKED` (Preserved Fail-Closed) | `phase-2-security-regression.spec.ts`, `report-download.controller.spec.ts` | **32/32 PASSED** |

---

## 3. Detailed Test Matrix by Finding

### 3.1 Workstream A: CORS Security Enforcement (`CRIT-SEC-01`)
*Test File: `src/common/utils/tests/cors.util.spec.ts`*

| Case # | Scenario | Input / Origin | Expected Behavior | Actual Behavior | Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **CORS-01** | Trusted Origin (GET) | `https://app.careid.com` | Emits `Access-Control-Allow-Origin: https://app.careid.com`, `credentials: true`, `Vary: Origin` | Headers emitted exactly as expected | **PASS** |
| **CORS-02** | Untrusted Origin (GET) | `https://evil.attacker.com` | Omits `Access-Control-Allow-Origin` and credentials (safe rejection without 500 error) | Headers empty `{}`; no CORS headers | **PASS** |
| **CORS-03** | Missing Origin (curl/mobile) | `undefined` | Permitted (non-browser client) | Permitted with `callback(null, true)` | **PASS** |
| **CORS-04** | Preflight OPTIONS (Trusted) | `https://app.careid.com` | Status 204, allows methods, headers, and credentials | Status 204 with full allow headers | **PASS** |
| **CORS-05** | Preflight OPTIONS (Untrusted) | `https://evil.attacker.com` | Omits allow headers; browser blocks preflight | Headers empty; blocked | **PASS** |
| **CORS-06** | Wildcard Origin in Config | `*` or `https://*.careid.com` | Discarded by normalizer; rejected in production validation | Throws `Environment Validation Error` in prod; discarded in dev | **PASS** |
| **CORS-07** | Non-HTTP Protocols | `javascript:alert(1)`, `file:///etc/passwd` | Discarded as malformed/insecure | Normalizer returns `null` | **PASS** |
| **CORS-08** | Trailing Slash Normalization | `https://app.careid.com/` | Normalized to `https://app.careid.com` matching HTTP `Origin` header | Stripped trailing slash; matches allowlist | **PASS** |
| **CORS-09** | Production Missing Config | `CORS_ALLOWED_ORIGINS=''` | Fails safe (empty array, closed) | Returns `[]` in production mode | **PASS** |
| **CORS-10** | Dev Default Config | `undefined` (in non-prod) | Falls back to `DEFAULT_DEV_ORIGINS` (localhost:3000, 3073, 5173) | Returns 5 standard local dev origins | **PASS** |

---

### 3.2 Workstream B: Authorization & Object Ownership
*Test File: `src/modules/auth/tests/phase-2-security-regression.spec.ts`*

#### 3.2.1 Doctor Profile Update (`PUT /api/v1/doctors/:id` — `HIGH-SEC-05`)
| Case # | Caller Role | Caller User ID | Target Doctor User ID | Expected HTTP Status | Actual HTTP Status | Result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **DOC-01** | `PATIENT` | `user-patient-1` | `user-doctor-1` | `403 Forbidden` (Role guard rejection) | `403 Forbidden` | **PASS** |
| **DOC-02** | `STAFF` | `user-staff-1` | `user-doctor-1` | `403 Forbidden` (Role guard rejection) | `403 Forbidden` | **PASS** |
| **DOC-03** | `DOCTOR` | `user-doctor-2` (Attacker) | `user-doctor-1` (Victim) | `403 Forbidden` (Ownership rejection) | `403 Forbidden` | **PASS** |
| **DOC-04** | `DOCTOR` | `user-doctor-1` (Owner) | `user-doctor-1` (Self) | `200 OK` (Profile updated) | `200 OK` | **PASS** |
| **DOC-05** | `ADMIN` | `user-admin-1` | `user-doctor-1` | `200 OK` (Administrative override) | `200 OK` | **PASS** |
| **DOC-06** | `SUPER_ADMIN` | `user-superadmin-1` | `user-doctor-1` | `200 OK` (SuperAdmin override) | `200 OK` | **PASS** |
| **DOC-07** | `ADMIN` | `user-admin-1` | Nonexistent UUID | `404 Not Found` | `404 Not Found` | **PASS** |

#### 3.2.2 Health Card Global Search (`GET /api/v1/health-cards/search` — `HIGH-SEC-06`)
| Case # | Caller Role | Query String | Expected HTTP Status | Actual HTTP Status | Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **HC-01** | `PATIENT` | `?q=Doe` | `403 Forbidden` (Harvester blocked) | `403 Forbidden` | **PASS** |
| **HC-02** | `FAMILY_MEMBER` | `?q=Doe` | `403 Forbidden` (Harvester blocked) | `403 Forbidden` | **PASS** |
| **HC-03** | `DOCTOR` | `?q=Doe` | `200 OK` (Clinical lookup permitted) | `200 OK` | **PASS** |
| **HC-04** | `STAFF` | `?q=Doe` | `200 OK` (Registration lookup permitted) | `200 OK` | **PASS** |
| **HC-05** | `FACILITY_ADMIN` | `?q=Doe` | `200 OK` (Administrative lookup permitted) | `200 OK` | **PASS** |
| **HC-06** | `ADMIN` | `?q=Doe` | `200 OK` (Platform admin permitted) | `200 OK` | **PASS** |

#### 3.2.3 Insurance Policy Global Search (`GET /api/v1/insurance/search` — `HIGH-SEC-07`)
| Case # | Caller Role | Query String | Expected HTTP Status | Actual HTTP Status | Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **INS-01** | `PATIENT` | `?q=POL-360` | `403 Forbidden` (Harvester blocked) | `403 Forbidden` | **PASS** |
| **INS-02** | `DOCTOR` | `?q=POL-360` | `403 Forbidden` (Harvester blocked) | `403 Forbidden` | **PASS** |
| **INS-03** | `FACILITY_ADMIN` | `?q=POL-360` | `200 OK` (Billing admin permitted) | `200 OK` | **PASS** |
| **INS-04** | `STAFF` | `?q=POL-360` | `200 OK` (Desk staff permitted) | `200 OK` | **PASS** |
| **INS-05** | `ADMIN` | `?q=POL-360` | `200 OK` (Platform admin permitted) | `200 OK` | **PASS** |

#### 3.2.4 Facility Update Affiliation (`PUT /api/v1/facilities/:id` — `HIGH-SEC-04`)
| Case # | Caller Role | Target Facility ID | Facility Affiliation | Expected HTTP Status | Actual HTTP Status | Result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **FAC-01** | `PATIENT` | `fac-metro-001` | None | `403 Forbidden` (Role guard rejection) | `403 Forbidden` | **PASS** |
| **FAC-02** | `DOCTOR` | `fac-metro-001` | None | `403 Forbidden` (Role guard rejection) | `403 Forbidden` | **PASS** |
| **FAC-03** | `FACILITY_ADMIN` | `fac-city-hospital` | Unaffiliated (`isAffiliated = false`) | `403 Forbidden` (Cross-facility IDOR denied) | `403 Forbidden` | **PASS** |
| **FAC-04** | `FACILITY_ADMIN` | `fac-metro-001` | Affiliated (`isAffiliated = true`) | `200 OK` (Affiliated update permitted) | `200 OK` | **PASS** |
| **FAC-05** | `SUPER_ADMIN` | `fac-city-hospital` | Global Authority | `200 OK` (Administrative override) | `200 OK` | **PASS** |
| **FAC-06** | `ADMIN` | Nonexistent UUID | N/A | `404 Not Found` | `404 Not Found` | **PASS** |

#### 3.2.5 Immunisation Directory Mutations (`MED-SEC-01`)
| Case # | Endpoint | Caller Role | Expected HTTP Status | Actual HTTP Status | Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **IMM-01** | `POST /immunisation/vaccines` | `PATIENT` | `403 Forbidden` | `403 Forbidden` | **PASS** |
| **IMM-02** | `POST /immunisation/vaccines` | `DOCTOR` | `403 Forbidden` | `403 Forbidden` | **PASS** |
| **IMM-03** | `POST /immunisation/vaccines` | `ADMIN` | `201 Created` | `201 Created` | **PASS** |
| **IMM-04** | `POST /immunisation/schedules` | `PATIENT` | `403 Forbidden` | `403 Forbidden` | **PASS** |
| **IMM-05** | `POST /immunisation/schedules` | `DOCTOR` | `403 Forbidden` | `403 Forbidden` | **PASS** |
| **IMM-06** | `POST /immunisation/schedules` | `SUPER_ADMIN` | `201 Created` | `201 Created` | **PASS** |

#### 3.2.6 Scheduling & Shift Mutations (`MED-SEC-02`)
| Case # | Endpoint | Caller Role | Expected HTTP Status | Actual HTTP Status | Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **SCH-01** | `POST /schedules` | `PATIENT` | `403 Forbidden` | `403 Forbidden` | **PASS** |
| **SCH-02** | `PUT /schedules/:id` | `DOCTOR` | `403 Forbidden` | `403 Forbidden` | **PASS** |
| **SCH-03** | `DELETE /schedules/:id` | `PATIENT` | `403 Forbidden` | `403 Forbidden` | **PASS** |
| **SCH-04** | `POST /shifts` | `PATIENT` | `403 Forbidden` | `403 Forbidden` | **PASS** |
| **SCH-05** | `POST /holidays` | `PATIENT` | `403 Forbidden` | `403 Forbidden` | **PASS** |
| **SCH-06** | `POST /schedules` | `FACILITY_ADMIN` | `201 Created` | `201 Created` | **PASS** |
| **SCH-07** | `POST /shifts` | `FACILITY_ADMIN` | `201 Created` | `201 Created` | **PASS** |
| **SCH-08** | `POST /holidays` | `FACILITY_ADMIN` | `201 Created` | `201 Created` | **PASS** |

#### 3.2.7 Referral Privacy & Participant Scoping (`HIGH-SEC-08`)
| Case # | Endpoint | Caller Role | Caller Identity | Target Referral Record | Expected Status | Actual Status | Result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **REF-01** | `GET /referrals/:id` | `DOCTOR` | `referringDoctorId` | Referral #1 | `200 OK` (Participant) | `200 OK` | **PASS** |
| **REF-02** | `GET /referrals/:id` | `DOCTOR` | `receivingDoctorId` | Referral #1 | `200 OK` (Participant) | `200 OK` | **PASS** |
| **REF-03** | `GET /referrals/:id` | `PATIENT` | Patient Owner | Referral #1 | `200 OK` (Participant) | `200 OK` | **PASS** |
| **REF-04** | `GET /referrals/:id` | `STAFF` | Receiving Facility Staff | Referral #1 | `200 OK` (Participant) | `200 OK` | **PASS** |
| **REF-05** | `GET /referrals/:id` | `PATIENT` | Unrelated Patient | Referral #1 | `403 Forbidden` (IDOR blocked) | `403 Forbidden` | **PASS** |
| **REF-06** | `GET /referrals/:id` | `DOCTOR` | Unrelated 3rd-Party Doctor | Referral #1 | `403 Forbidden` (IDOR blocked) | `403 Forbidden` | **PASS** |
| **REF-07** | `GET /referrals/:id` | `ADMIN` | Platform Admin | Nonexistent UUID | `404 Not Found` | `404 Not Found` | **PASS** |
| **REF-08** | `GET /referrals` | `PATIENT` | Queries `?patientId=victim` | Different Patient ID | `403 Forbidden` (Spoof blocked) | `403 Forbidden` | **PASS** |
| **REF-09** | `GET /referrals` | `PATIENT` | Queries `GET /referrals` | Default filter | Scoped to own `patientId` | Filter applied | **PASS** |
| **REF-10** | `GET /referrals` | `DOCTOR` | Queries `?referringDoctorId=other` | Other Doctor ID | `403 Forbidden` (Spying blocked) | `403 Forbidden` | **PASS** |
| **REF-11** | `GET /referrals` | `DOCTOR` | Queries `GET /referrals` | Default filter | Scoped to caller's `referringDoctorId` | Filter applied | **PASS** |
| **REF-12** | `GET /referrals` | `ADMIN` | Queries `?status=PENDING` | Any global referral | `200 OK` (Unrestricted) | `200 OK` | **PASS** |

---

### 3.3 Workstream C: Fail-Closed Report Download Security Policy (`HIGH-SEC-03`)
*Test File: `src/modules/auth/tests/phase-2-security-regression.spec.ts`*

| Case # | Scan Status | Caller User | Storage Provider | Expected HTTP Status | Error Message / Contract | Result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **DL-01** | `PENDING` | Valid Owner | Local/B2 | `400 Bad Request` | `Attachment virus scan is pending; download unavailable` | **PASS** |
| **DL-02** | `INFECTED` | Valid Owner | Local/B2 | `400 Bad Request` | `Attachment virus scan is infected; download unavailable` | **PASS** |
| **DL-03** | `undefined` / missing | Valid Owner | Local/B2 | `400 Bad Request` | `Attachment virus scan is incomplete; download unavailable` | **PASS** |
| **DL-04** | `CLEAN` | Valid Owner | Local/B2 | `200 OK` | Delivers signed download token and expiration URL | **PASS** |
| **DL-05** | `CLEAN` | Unauthorized User | Local/B2 | `403 Forbidden` | Access denied (Profile ownership check) | **PASS** |

---

### 3.4 Workstream D: OCR Reprocessing Endpoint & State Machine (`MED-INT-02`)
*Test File: `src/modules/auth/tests/phase-2-security-regression.spec.ts`*

| Case # | Route | Caller Identity | Job Initial State | Expected Result | Actual Result | Result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **OCR-01** | `POST /ocr/reprocess/:jobId` | Job Submitter (Owner) | `COMPLETED` | `200 OK` (Reprocessed; triggers pipeline) | `200 OK` with mapped job | **PASS** |
| **OCR-02** | `POST /ocr/reprocess/:jobId` | Job Submitter (Owner) | `FAILED` | `200 OK` (Reprocessed; triggers pipeline) | `200 OK` with mapped job | **PASS** |
| **OCR-03** | `POST /ocr/reprocess/:jobId` | Platform Admin | `REVIEW_REQUIRED` | `200 OK` (Administrative reprocess) | `200 OK` with mapped job | **PASS** |
| **OCR-04** | `POST /ocr/reprocess/:jobId` | Attacker (Non-owner) | `COMPLETED` | `403 Forbidden` (Ownership denial) | `403 Forbidden` | **PASS** |
| **OCR-05** | `POST /ocr/reprocess/:jobId` | Job Submitter (Owner) | `OCR_RUNNING` | `409 Conflict` (Active execution conflict) | `409 Conflict` | **PASS** |
| **OCR-06** | `POST /ocr/reprocess/:jobId` | Job Submitter (Owner) | `PREPROCESSING` | `409 Conflict` (Active execution conflict) | `409 Conflict` | **PASS** |
| **OCR-07** | `POST /ocr/reprocess/:jobId` | Any Authenticated | Nonexistent UUID | `404 Not Found` | `404 Not Found` | **PASS** |

---

## 4. Overall Verification Summary

- **Total Test Suites**: 47
- **Total Passing Tests**: 692
- **Failing Tests**: 0
- **TypeScript Compilation Errors (`tsc --noEmit`)**: 0
- **ESLint Errors / Warnings (`eslint "src/**/*.ts"`)**: 0
- **Schema & Migration Modifications**: Strictly 0 (Zero edits to `prisma/schema.prisma` or migration files)

