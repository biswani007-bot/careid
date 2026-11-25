# CareID Backend — Endpoint Verification Matrix

**Project:** CareID / Health Vault 360 Enterprise Healthcare Platform  
**Target Staging API:** `https://360api.vnvision.in`  
**Base URL:** `https://360api.vnvision.in/api/v1`  
**Release Version:** November 3, 2026 Staging Release  
**Audit Date:** November 3, 2026  
**Total Documented Endpoints:** 510 Operations across 27 Functional Domains  

---

## 1. Verification Classification Taxonomy

Each endpoint in the CareID platform is classified according to the following strict criteria:

| Classification | Definition | Application Scope in CareID |
| :--- | :--- | :--- |
| **`Implemented — source verified`** | Inspected, compiled, validated against NestJS controllers, DTOs, guards, repositories, and passing 100% of local unit and regression test suites. | Core clinical, identity, and administrative modules backed by the 144 baseline PostgreSQL tables. |
| **`Runtime verified — successfully tested against staging`** | Successfully executed live over HTTP against the remote staging server (`https://360api.vnvision.in`). | Public platform diagnostic probes (`/health`, `/ready`, `/live`). |
| **`Implemented with limitations`** | Implemented and test-covered, but governed by intentional business or environment constraints (e.g. production disablement, role restrictions). | Security API keys, admin user creation restrictions, OTP-only password reset rejection. |
| **`Demonstration only`** | Functional in code and verified with automated tests, but operating on local JSON file persistence (`data/*.json`) to avoid unauthorized PostgreSQL schema alterations. | Support Tickets (`data/support-tickets.json`), Pet Records (`data/pets.json`), Healthcare Financing (`data/financing-applications.json`). |
| **`Unsupported`** | Legacy, prohibited, or intentionally excluded operations that do not exist or are rejected by the platform. | Direct audit log deletion, legacy `/auth/login`, password resets for OTP-only accounts. |
| **`Runtime verification pending`** | Source-verified endpoints awaiting final deployment approval and server startup script confirmation on `161.97.89.183`. | All authenticated clinical and administrative endpoints in the November 3, 2026 release. |

---

## 2. Comprehensive Domain Verification Matrix

### 2.1 Domain 01: Environment & Health Checks (Public Probes)

| Method | Endpoint | Required Auth | Classification | Verification Notes & Evidence |
| :--- | :--- | :---: | :---: | :--- |
| `GET` | `/api/v1/health` | None (`noauth`) | **Runtime verified — successfully tested against staging** | Returns `{ "status": "ok", "service": "HVAPI Backend" }`. Liveness probe. |
| `GET` | `/api/v1/ready` | None (`noauth`) | **Runtime verified — successfully tested against staging** | Validates PostgreSQL database connectivity and Prisma pool health. |
| `GET` | `/api/v1/live` | None (`noauth`) | **Runtime verified — successfully tested against staging** | Returns process uptime, memory RSS, and timestamp. |
| `GET` | `/docs-json` | None (`noauth`) | **Implemented — source verified** | OpenAPI 3.0 specification exported by SwaggerModule. |

---

### 2.2 Domain 02: Authentication & OTP

| Method | Endpoint | Required Auth | Classification | Verification Notes & Evidence |
| :--- | :--- | :---: | :---: | :--- |
| `POST` | `/api/v1/auth/password/login` | None (`noauth`) | **Implemented — source verified** (`Runtime verification pending`) | Unified password login for `SUPER_ADMIN`, `ADMIN`, `DOCTOR`, `STAFF`. Returns JWT pair. |
| `POST` | `/api/v1/auth/admin/login` | None (`noauth`) | **Implemented — source verified** (`Runtime verification pending`) | Legacy alias for admin/superadmin accounts. |
| `POST` | `/api/v1/auth/otp/request` | None (`noauth`) | **Implemented — source verified** (`Runtime verification pending`) | Phone OTP challenge creation. Returns `challengeId`. Allowlisted staging phones use `123456`. |
| `POST` | `/api/v1/auth/otp/verify` | None (`noauth`) | **Implemented — source verified** (`Runtime verification pending`) | Verifies challenge with `otpCode`. Issues access and refresh JWT pair. |
| `POST` | `/api/v1/auth/otp/resend` | None (`noauth`) | **Implemented — source verified** (`Runtime verification pending`) | Rate-limited OTP resend endpoint. |
| `POST` | `/api/v1/auth/token/refresh` | None (`noauth`) | **Implemented — source verified** (`Runtime verification pending`) | Rotates expired access token using valid refresh token. |
| `POST` | `/api/v1/auth/logout` | None (`noauth`) | **Implemented — source verified** (`Runtime verification pending`) | Revokes active session refresh token in database. |
| `POST` | `/api/v1/auth/logout-all` | Bearer JWT | **Implemented — source verified** (`Runtime verification pending`) | Terminates all active sessions for authenticated user. |
| `POST` | `/api/v1/auth/password/change` | Bearer JWT | **Implemented — source verified** (`Runtime verification pending`) | Verifies current bcrypt password hash before applying new password. Rejects OTP accounts. |

---

### 2.3 Domain 03: User Profile & Account

| Method | Endpoint | Required Auth | Classification | Verification Notes & Evidence |
| :--- | :--- | :---: | :---: | :--- |
| `GET` | `/api/v1/auth/me` | Bearer JWT | **Implemented — source verified** (`Runtime verification pending`) | Returns current user claims, profile IDs, roles, and facility affiliations. |
| `PUT` | `/api/v1/auth/me` | Bearer JWT | **Implemented — source verified** (`Runtime verification pending`) | Updates user email and phone with cross-user uniqueness enforcement. |
| `PATCH`| `/api/v1/auth/me` | Bearer JWT | **Implemented — source verified** (`Runtime verification pending`) | Partial update alias for `PUT /api/v1/auth/me`. |
| `GET` | `/api/v1/auth/sessions` | Bearer JWT | **Implemented — source verified** (`Runtime verification pending`) | Lists all active multi-device sessions for current user. |
| `DELETE`| `/api/v1/auth/sessions/:id` | Bearer JWT | **Implemented — source verified** (`Runtime verification pending`) | Revokes specific session token by session UUID. |
| `GET` | `/api/v1/auth/permissions` | Bearer JWT | **Implemented — source verified** (`Runtime verification pending`) | Lists effective RBAC permissions granted to authenticated caller. |

---

### 2.4 Domain 04: Admin Portal & System Operations

| Method | Endpoint | Required Auth | Classification | Verification Notes & Evidence |
| :--- | :--- | :---: | :---: | :--- |
| `GET` | `/api/v1/admin/users` | `ADMIN`, `SUPER_ADMIN` | **Implemented — source verified** (`Runtime verification pending`) | Supports `role`, `status`, `search`. Returns dual `.items` and `.data` arrays. |
| `POST` | `/api/v1/admin/users` | `ADMIN`, `SUPER_ADMIN` | **Implemented with limitations** | Creates admin/staff accounts. Clinical roles (Doctor/Patient) directed to clinical onboarding. |
| `GET` | `/api/v1/admin/users/:id` | `ADMIN`, `SUPER_ADMIN` | **Implemented — source verified** (`Runtime verification pending`) | Returns managed user demographics, roles, and linked profiles. |
| `PUT` | `/api/v1/admin/users/:id` | `ADMIN`, `SUPER_ADMIN` | **Implemented — source verified** (`Runtime verification pending`) | Demographic update (name, status, email, phone). |
| `DELETE`| `/api/v1/admin/users/:id` | `ADMIN`, `SUPER_ADMIN` | **Implemented — source verified** (`Runtime verification pending`) | Soft-deletes or deactivates user account. |
| `POST` | `/api/v1/admin/users/:id/reset-password` | `ADMIN`, `SUPER_ADMIN` | **Implemented with limitations** | Sets new password. Rejects OTP-only users (`PATIENT`, `FAMILY_MEMBER`). |
| `GET` | `/api/v1/admin/roles` | `ADMIN`, `SUPER_ADMIN` | **Implemented — source verified** (`Runtime verification pending`) | Lists all 7 platform roles with permission codes. |
| `POST` | `/api/v1/admin/roles` | `SUPER_ADMIN` | **Implemented — source verified** (`Runtime verification pending`) | Custom RBAC role creation. |
| `GET` | `/api/v1/admin/roles/:id` | `ADMIN`, `SUPER_ADMIN` | **Implemented — source verified** (`Runtime verification pending`) | Role details with assigned permission objects. |
| `PUT` | `/api/v1/admin/roles/:id` | `SUPER_ADMIN` | **Implemented — source verified** (`Runtime verification pending`) | Update role description or permission list. |
| `DELETE`| `/api/v1/admin/roles/:id` | `SUPER_ADMIN` | **Implemented with limitations** | Deletes custom role. System baseline roles (`ADMIN`, `PATIENT`, etc.) are protected. |
| `GET` | `/api/v1/admin/audit-logs` | `ADMIN`, `SUPER_ADMIN` | **Implemented — source verified** (`Runtime verification pending`) | Append-only audit trail query. Zero DELETE/PUT routes exist. |
| `GET` | `/api/v1/admin/audit-logs/export` | `ADMIN`, `SUPER_ADMIN` | **Implemented — source verified** (`Runtime verification pending`) | Exports audit logs as RFC-4180 CSV or JSON. |
| `GET` | `/api/v1/admin/audit-logs/:id` | `ADMIN`, `SUPER_ADMIN` | **Implemented — source verified** (`Runtime verification pending`) | Single audit log detail inspection. |

---

### 2.5 Domain 10: Appointments, Schedules & Shifts

| Method | Endpoint | Required Auth | Classification | Verification Notes & Evidence |
| :--- | :--- | :---: | :---: | :--- |
| `POST` | `/api/v1/appointments` | Authenticated | **Implemented — source verified** (`Runtime verification pending`) | Books new appointment. Returns `201 Created` with `AppointmentResponseDto`. |
| `GET` | `/api/v1/appointments` | Authenticated | **Implemented — source verified** (`Runtime verification pending`) | Filter by `patientProfileId`, `doctorProfileId`, `facilityId`, `status`. |
| `GET` | `/api/v1/appointments/:id` | Authenticated | **Implemented — source verified** (`Runtime verification pending`) | Appointment details with doctor, patient, and facility summaries. |
| `PUT` | `/api/v1/appointments/:id/reschedule` | Authenticated | **Implemented — source verified** (`Runtime verification pending`) | Reschedules date/time with schedule exception handling. |
| `PUT` | `/api/v1/appointments/:id/cancel` | Authenticated | **Implemented — source verified** (`Runtime verification pending`) | Cancels appointment with cancellation reason audit. |
| `PUT` | `/api/v1/appointments/:id/status` | Staff / Doctor | **Implemented — source verified** (`Runtime verification pending`) | Updates status to `CONFIRMED`, `IN_PROGRESS`, `COMPLETED`, `NO_SHOW`. |
| `GET` | `/api/v1/appointments/doctor/me` | `DOCTOR` | **Implemented — source verified** (`Runtime verification pending`) | Doctor-scoped appointment roster. |
| `GET` | `/api/v1/appointments/patient/me` | `PATIENT` | **Implemented — source verified** (`Runtime verification pending`) | Patient-scoped appointment history. |
| `POST` | `/api/v1/schedules` | Staff / Admin | **Implemented — source verified** (`Runtime verification pending`) | Creates working schedule profile. |
| `GET` | `/api/v1/schedules/:id/slots` | Authenticated | **Implemented — source verified** (`Runtime verification pending`) | Computes available booking slots for date range. |
| `POST` | `/api/v1/shifts` | Staff / Admin | **Implemented — source verified** (`Runtime verification pending`) | Creates clinical shift definition. |
| `POST` | `/api/v1/holidays` | Staff / Admin | **Implemented — source verified** (`Runtime verification pending`) | Adds facility holiday exception. |

---

### 2.6 Domain 11: Referrals & Care Coordination

| Method | Endpoint | Required Auth | Classification | Verification Notes & Evidence |
| :--- | :--- | :---: | :---: | :--- |
| `POST` | `/api/v1/referrals` | Doctor / Staff | **Implemented — source verified** (`Runtime verification pending`) | Non-colliding `REF-YYYY-XXXXX`. Audit logging decoupled from transaction. |
| `GET` | `/api/v1/referrals` | Authenticated | **Implemented — source verified** (`Runtime verification pending`) | Role-scoped listing (Patient sees own, Doctor sees referring/assigned). |
| `GET` | `/api/v1/referrals/:id` | Authenticated | **Implemented — source verified** (`Runtime verification pending`) | Referral details with clinical summaries and status history. |
| `PUT` | `/api/v1/referrals/:id` | Referring Doctor / Admin | **Implemented — source verified** (`Runtime verification pending`) | Updates clinical reason and priority. Rejects completed/cancelled referrals. |
| `PUT` | `/api/v1/referrals/:id/status` | Clinical Staff | **Implemented — source verified** (`Runtime verification pending`) | Status transitions (`IN_PROGRESS`, `COMPLETED`, `CANCELLED`). |
| `PATCH`| `/api/v1/referrals/:id/status` | Clinical Staff | **Implemented — source verified** (`Runtime verification pending`) | Partial update alias for `PUT :id/status`. |
| `POST` | `/api/v1/referrals/:id/triage` | Receiving Doctor/Staff | **Implemented — source verified** (`Runtime verification pending`) | Triage outcomes (`APPROVED`, `MORE_INFO_REQUESTED`, `DECLINED`). |
| `POST` | `/api/v1/referrals/:id/notes` | Doctor / Staff | **Implemented — source verified** (`Runtime verification pending`) | Adds clinical progress note with private flag support. |
| `GET` | `/api/v1/referrals/:id/notes` | Authenticated | **Implemented — source verified** (`Runtime verification pending`) | Filters private notes for non-clinical callers. |
| `POST` | `/api/v1/referrals/:id/attachments` | Doctor / Staff | **Implemented — source verified** (`Runtime verification pending`) | Binds clinical attachment UUID to referral. |
| `GET` | `/api/v1/referrals/:id/history` | Authenticated | **Implemented — source verified** (`Runtime verification pending`) | Full state transition audit trail. |
| `GET` | `/api/v1/referrals/my-incoming` | `DOCTOR` | **Implemented — source verified** (`Runtime verification pending`) | Scoped to receiving doctor profile ID. |
| `GET` | `/api/v1/referrals/my-outgoing` | `DOCTOR` | **Implemented — source verified** (`Runtime verification pending`) | Scoped to referring doctor profile ID. |
| `GET` | `/api/v1/referrals/dashboard/stats` | Admin / Facility Admin | **Implemented — source verified** (`Runtime verification pending`) | Aggregated referral counts by status and priority. |

---

### 2.7 Domain 14: Notifications & Alerts

| Method | Endpoint | Required Auth | Classification | Verification Notes & Evidence |
| :--- | :--- | :---: | :---: | :--- |
| `GET` | `/api/v1/notifications/preferences` | Authenticated | **Implemented — source verified** (`Runtime verification pending`) | Plural route for notification preferences. |
| `GET` | `/api/v1/notification/preferences` | Authenticated | **Implemented — source verified** (`Runtime verification pending`) | Singular route alias for notification preferences. |
| `PUT` | `/api/v1/notifications/preferences` | Authenticated | **Implemented — source verified** (`Runtime verification pending`) | Updates channel flags (`email`, `sms`, `push`, `inApp`). |
| `PATCH`| `/api/v1/notifications/preferences` | Authenticated | **Implemented — source verified** (`Runtime verification pending`) | Partial update alias. |
| `GET` | `/api/v1/notifications/queue` | `ADMIN`, `SUPER_ADMIN` | **Implemented — source verified** (`Runtime verification pending`) | Lists pending deliveries. Live OTP codes redacted (`******`). |
| `GET` | `/api/v1/notification/queue` | `ADMIN`, `SUPER_ADMIN` | **Implemented — source verified** (`Runtime verification pending`) | Singular queue alias. |
| `POST` | `/api/v1/notifications/queue/retry` | `ADMIN`, `SUPER_ADMIN` | **Implemented — source verified** (`Runtime verification pending`) | Retries failed queue items. Increments attempt counter. |
| `POST` | `/api/v1/notification/queue/retry` | `ADMIN`, `SUPER_ADMIN` | **Implemented — source verified** (`Runtime verification pending`) | Singular retry alias. |
| `POST` | `/api/v1/notification/queue/process` | `ADMIN`, `SUPER_ADMIN` | **Implemented — source verified** (`Runtime verification pending`) | Batch queue dispatch trigger. |
| `GET` | `/api/v1/notifications/dashboard/stats` | `ADMIN`, `SUPER_ADMIN` | **Implemented — source verified** (`Runtime verification pending`) | Delivery statistics breakdown. |
| `GET` | `/api/v1/notification/dashboard/stats` | `ADMIN`, `SUPER_ADMIN` | **Implemented — source verified** (`Runtime verification pending`) | Singular stats alias. |

---

### 2.8 Domain 15: OCR & Document Verification

| Method | Endpoint | Required Auth | Classification | Verification Notes & Evidence |
| :--- | :--- | :---: | :---: | :--- |
| `POST` | `/api/v1/ocr/process` | Authenticated | **Implemented — source verified** (`Runtime verification pending`) | Clinical document OCR job creation. |
| `GET` | `/api/v1/ocr/jobs/:id` | Authenticated | **Implemented — source verified** (`Runtime verification pending`) | Polls status of async document extraction. |
| `POST` | `/api/v1/ai/ocr/extract` | Authenticated | **Implemented — source verified** (`Runtime verification pending`) | AI-assisted structured clinical entity extraction. |
| `POST` | `/api/v1/insurance/ocr` | Authenticated | **Implemented — source verified** (`Runtime verification pending`) | OCR extraction for health insurance policy cards. |
| `GET` | `/api/v1/insurance/ocr/:id` | Authenticated | **Implemented — source verified** (`Runtime verification pending`) | Insurance OCR result verification. |

---

### 2.9 Domain 18: Security, Consents & API Keys

| Method | Endpoint | Required Auth | Classification | Verification Notes & Evidence |
| :--- | :--- | :---: | :---: | :--- |
| `GET` | `/api/v1/security/consents` | Authenticated | **Implemented — source verified** (`Runtime verification pending`) | Scoped: Patients see own; Doctors see authorized; Staff see facility. |
| `POST` | `/api/v1/security/consents` | Authenticated | **Implemented — source verified** (`Runtime verification pending`) | Patient creation -> `GRANTED`; Staff creation -> `PENDING`. |
| `GET` | `/api/v1/security/consents/:id` | Authenticated | **Implemented — source verified** (`Runtime verification pending`) | Single consent record with dual profile resolution. |
| `POST` | `/api/v1/security/consents/:id/confirm` | `PATIENT` | **Implemented — source verified** (`Runtime verification pending`) | Designated patient owner confirms pending consent. |
| `POST` | `/api/v1/security/consents/:id/withdraw` | Patient / Admin | **Implemented — source verified** (`Runtime verification pending`) | Revokes previously active clinical consent. |
| `POST` | `/api/v1/security/api-keys` | `ADMIN`, `SUPER_ADMIN` | **Implemented with limitations** | Returns raw secret once. Explicitly rejected in production (`NODE_ENV=production`). |
| `GET` | `/api/v1/security/api-keys` | `ADMIN`, `SUPER_ADMIN` | **Implemented with limitations** | Lists API keys with masked secret hashes. Disabled in production. |
| `GET` | `/api/v1/security/api-keys/:id` | `ADMIN`, `SUPER_ADMIN` | **Implemented with limitations** | Single API key metadata. Disabled in production. |
| `DELETE`| `/api/v1/security/api-keys/:id` | `ADMIN`, `SUPER_ADMIN` | **Implemented with limitations** | Deletes integration key with audit logging. Disabled in production. |
| `PATCH`| `/api/v1/security/api-keys/:id/revoke` | `ADMIN`, `SUPER_ADMIN` | **Implemented with limitations** | Revokes API key immediately. Disabled in production. |

---

### 2.10 Domain 19: Insurance Platform & Claims

| Method | Endpoint | Required Auth | Classification | Verification Notes & Evidence |
| :--- | :--- | :---: | :---: | :--- |
| `GET` | `/api/v1/insurance/providers` | Authenticated | **Implemented — source verified** (`Runtime verification pending`) | Lists registered health insurance providers. |
| `POST` | `/api/v1/insurance/providers` | Admin / Staff | **Implemented — source verified** (`Runtime verification pending`) | Creates insurance provider record. |
| `GET` | `/api/v1/insurance/policies` | Authenticated | **Implemented — source verified** (`Runtime verification pending`) | Lists active insurance policies. |
| `POST` | `/api/v1/insurance/claims` | Authenticated | **Implemented — source verified** (`Runtime verification pending`) | Submits insurance reimbursement claim. |
| `GET` | `/api/v1/patients/:patientId/insurance-cards` | Authenticated | **Implemented — source verified** (`Runtime verification pending`) | Lists insurance cards bound to patient profile. |
| `POST` | `/api/v1/patients/:patientId/insurance-cards` | Authenticated | **Implemented — source verified** (`Runtime verification pending`) | Adds insurance card to patient profile. |
| `GET` | `/api/v1/insurance-cards/:id` | Authenticated | **Implemented — source verified** (`Runtime verification pending`) | Single insurance card parameters. |
| `PUT` | `/api/v1/insurance-cards/:id` | Authenticated | **Implemented — source verified** (`Runtime verification pending`) | Updates policy parameters on card. |
| `DELETE`| `/api/v1/insurance-cards/:id` | Authenticated | **Implemented — source verified** (`Runtime verification pending`) | Soft-deletes insurance card record. |

---

### 2.11 Domain 20: Clinical Reports & Analytics

| Method | Endpoint | Required Auth | Classification | Verification Notes & Evidence |
| :--- | :--- | :---: | :---: | :--- |
| `GET` | `/api/v1/reports/dashboard/executive` | Admin / Facility Admin | **Implemented — source verified** (`Runtime verification pending`) | Lazy evaluated counts. Scoped for `FACILITY_ADMIN`. (Corrected from legacy `/reports/executive`). |
| `GET` | `/api/v1/reports/analytics/modules/:module` | Admin / Facility Admin | **Implemented — source verified** (`Runtime verification pending`) | Domain metrics for patients, doctors, facilities, and staff. |
| `GET` | `/api/v1/reports/definitions` | `ADMIN`, `SUPER_ADMIN` | **Implemented — source verified** (`Runtime verification pending`) | Lists report template definitions. |
| `POST` | `/api/v1/reports/definitions` | `ADMIN`, `SUPER_ADMIN` | **Implemented — source verified** (`Runtime verification pending`) | Creates report definition with unique code validation. |
| `POST` | `/api/v1/reports/generated` | `ADMIN`, `SUPER_ADMIN` | **Implemented — source verified** (`Runtime verification pending`) | Generates scheduled or ad-hoc analytics report. |

---

### 2.12 Domain 25: Support Tickets & Helpdesk (Demonstration Persistence)

| Method | Endpoint | Required Auth | Classification | Verification Notes & Evidence |
| :--- | :--- | :---: | :---: | :--- |
| `POST` | `/api/v1/support/tickets` | Authenticated | **Demonstration only** | Creates support ticket. Persisted in `data/support-tickets.json`. |
| `GET` | `/api/v1/support/tickets` | Authenticated | **Demonstration only** | List tickets. Users see own; Staff/Admin see all tickets. |
| `GET` | `/api/v1/support/tickets/:id` | Authenticated | **Demonstration only** | Single ticket inspection with ownership check. |
| `PUT` | `/api/v1/support/tickets/:id` | Staff / Admin | **Demonstration only** | Updates status (`OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`), priority, and assigned staff. |
| `POST` | `/api/v1/support/tickets/:id/reply` | Authenticated | **Demonstration only** | Appends threaded message reply to ticket. |
| `GET` | `/api/v1/support/tickets/:id/replies` | Authenticated | **Demonstration only** | Retrieves message history for support ticket. |

---

### 2.13 Domain 26: Pet Health Records (Demonstration Persistence)

| Method | Endpoint | Required Auth | Classification | Verification Notes & Evidence |
| :--- | :--- | :---: | :---: | :--- |
| `POST` | `/api/v1/pets` | Authenticated | **Demonstration only** | Registers companion animal profile. Persisted in `data/pets.json`. |
| `GET` | `/api/v1/pets` | Authenticated | **Demonstration only** | Lists pets owned by caller (or all for Admin/Staff). |
| `GET` | `/api/v1/pets/:id` | Authenticated | **Demonstration only** | Pet demographics, species, breed, and microchip ID. |
| `PUT` | `/api/v1/pets/:id` | Authenticated | **Demonstration only** | Updates pet demographics. |
| `DELETE`| `/api/v1/pets/:id` | Authenticated | **Demonstration only** | Soft-deletes pet profile record. |
| `POST` | `/api/v1/pets/:id/vaccinations` | Authenticated | **Demonstration only** | Records vaccination entry (vaccine name, batch, vet, due date). |
| `GET` | `/api/v1/pets/:id/vaccinations` | Authenticated | **Demonstration only** | Lists complete vaccination history for pet. |

---

### 2.14 Domain 27: Healthcare Financing & Financial Assistance (Demonstration Persistence)

| Method | Endpoint | Required Auth | Classification | Verification Notes & Evidence |
| :--- | :--- | :---: | :---: | :--- |
| `GET` | `/api/v1/financing/options` | Authenticated | **Demonstration only** | Lists partner EMI schemes and financing programs. |
| `GET` | `/api/v1/financing/offers` | Authenticated | **Demonstration only** | Lists pre-approved loan offers for current patient. |
| `POST` | `/api/v1/financing/apply` | Authenticated | **Demonstration only** | Submits credit application. Persisted in `data/financing-applications.json`. |
| `GET` | `/api/v1/financing/applications` | Authenticated | **Demonstration only** | Lists financing applications (caller-scoped or platform-wide for Admin). |
| `GET` | `/api/v1/financing/applications/:id` | Authenticated | **Demonstration only** | Single application details with estimated monthly EMI. |
| `PATCH`| `/api/v1/financing/applications/:id/status` | Staff / Admin | **Demonstration only** | Updates underwriting status (`PENDING`, `APPROVED`, `DISBURSED`, `REJECTED`). |

---

### 2.15 Prohibited & Unsupported Operations

| Method | Endpoint | Status | Reason & Platform Defense |
| :--- | :--- | :---: | :--- |
| `DELETE`| `/api/v1/admin/audit-logs` | **Unsupported** | Platform design strictly enforces append-only immutable audit trails. |
| `DELETE`| `/api/v1/admin/audit-logs/:id` | **Unsupported** | Modifying or deleting audit records is architecturally prohibited. |
| `POST` | `/auth/login` (legacy) | **Unsupported** | Deprecated. Replaced by `/api/v1/auth/password/login`. |
| `POST` | `/auth/signin` (legacy) | **Unsupported** | Deprecated. Replaced by `/api/v1/auth/password/login`. |
| `POST` | `/api/v1/admin/users/:id/reset-password` (for Patient/Family) | **Unsupported** | Patients and Family Members authenticate exclusively via phone OTP; direct password creation is rejected. |
| `POST` | `/api/v1/security/api-keys` (in Production) | **Unsupported** | Hardcoded environment check rejects key generation when `NODE_ENV === 'production'`. |
