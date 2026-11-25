# CAREID ADMIN WEB — GOAL 001: PHASE A AUDIT REPORT
## Full Client-Approved Scope Audit, Traceability Matrix & Pending Work Identification

**Project:** CAREID — HEALTH VAULT 360  
**Title:** Admin Web Full Client-Approved Scope Audit & Pending Work Identification  
**Goal ID:** `CAREID-MASTER-ADMIN-WEB-001`  
**Execution Phase:** Phase A (Strict Read-Only Audit & Gap Analysis)  
**Execution Timestamp:** 2026-11-22T10:35:00Z  
**Primary Auditor:** Antigravity Full-Stack Agent (Developer 1)  
**Target Repositories:** `D:\careid\Admin_web` (Admin Web) & `D:\careid\backend` (NestJS Backend)  
**Integration Stack:**
- Admin Web: `http://localhost:5174` (`careid-integration-admin-web`)
- Backend API: `http://localhost:3001` (`careid-integration-backend`)
- Doctor Web: `http://localhost:5173` (`careid-integration-doctor-web`)
- PostgreSQL: `localhost:5433`, DB: `careid_integration_db` (`careid-integration-postgres`)

---

## 1. Executive Summary

This Phase A audit was conducted under strict **READ-ONLY** rules to establish the complete, evidence-based baseline of the **CareID Admin Web** application (`D:\careid\Admin_web`) against all authoritative client scope sources:
1. `HEALTH VAULT 360.pdf` — Original Client PRD / FSD (Sections 4.4.1 through 4.4.12, Section 5, 6, 7, 8)
2. `Care ID_ CR Sheet.xlsx` — Client Approved Change Requests CR-02 through CR-08 (Admin oversight scope)
3. Existing Backend APIs (`D:\careid\backend`), Prisma schema (`schema.prisma`), and PostgreSQL database (`careid_integration_db`)
4. Previous Doctor Web Goals 001–005 final handoff report (`DOCTOR_WEB_GOAL005_FINAL_SCOPE_CLOSURE_REPORT.md`)

### Key Audit Findings:
- **Core Operations are Production-Grade:** Core Admin workflows for **Patient Management**, **Facility Management**, **Doctor & Staff Onboarding/Mapping**, **Sub-Admin Creation & RBAC**, **System Settings & Branding**, **Audit Log Explorer**, and the complete **OCR & Document Verification Pipeline** (PRD Section 5) are fully implemented, connected to live backend APIs, and persist to PostgreSQL.
- **Doctor Web Goal 005 Handoff:** Doctor Web is at 100% test pass (149/149 tests), with CR-07 (Customizable Office Chat Templates) and CR-08 (Prescription Collection Lifecycle Tracking) fully verified and closed. Doctor Web dependencies remain properly isolated (CR-06 External EHR is blocked on external provider credentials; CR-08 automated reminder delivery is awaiting client delivery channel selection).
- **Confirmed Admin Web Frontend Gaps:**
  1. **Mobile Number + OTP Login (PRD 4.4.1):** `AdminLogin.tsx` only offers Email/Password login. Backend OTP endpoints (`/auth/otp/request`, `/auth/otp/verify`) exist but lack a UI toggle/form in the Admin portal.
  2. **Privacy Policy Management UI (PRD 4.4.6):** Backend CRUD endpoints exist (`/api/v1/cms/policies`), but Admin Web lacks a dedicated screen to view, create, edit, and publish Privacy Policies.
  3. **Terms & Conditions Management UI (PRD 4.4.7):** Backend CRUD endpoints exist (`/api/v1/cms/policies`, `/api/v1/cms/treatment-terms`), but Admin Web lacks a dedicated screen to view, create, edit, and publish Terms & Conditions.
  4. **Social Media Management (PRD 4.4.9):** Neither Admin Web UI nor dedicated backend schema exists for external social handles (LinkedIn, Twitter/X, Facebook, YouTube, Instagram). Can be cleanly managed via `platform_settings` under category `BRANDING` or `CMS`.
  5. **Website CMS Expansion (PRD 4.4.10):** Announcements (`/admin/announcements`) is operational. CMS Pages, FAQs, Banners, and Content Blocks are implemented in Backend (`/api/v1/cms/*`) but lack dedicated Admin Web UI views.
  6. **CR-02 Financing & Treatment Discount Oversight:** Backend `/api/v1/financing/offers` and `/api/v1/financing/applications` exist, but Admin Web lacks a dedicated cross-facility financing oversight dashboard.
  7. **CR-03 & CR-04 Slot & Cross-Facility Appointment Oversight:** Backend `/api/v1/schedules` and `/api/v1/appointments` exist, but Admin Web lacks a centralized slot utilization and appointment volume monitoring view.
  8. **CR-08 Prescription Pickup Reminder Oversight:** Backend tracks collection and reminder hours, but Admin Web lacks a cross-facility pickup status overview.
- **Zero Destructive Actions:** No application code was modified, no database records were destroyed, and no unapproved features were introduced during this audit.

---

## 2. Doctor Web Goal 005 Handoff Status & Dependencies

### DOCTOR WEB — REMAINING DEPENDENCIES

Based on the final handoff report (`D:\careid\doctor_web\docs\DOCTOR_WEB_GOAL005_FINAL_SCOPE_CLOSURE_REPORT.md`):

#### CR-06 — External EHR Synchronization
- **Status:** `BLOCKED_EXTERNAL_DEPENDENCY`
- **Reported Remaining Work:**
  - External EHR provider live connection.
  - Secure inbound and outbound clinical record synchronization.
  - End-to-end integration verification against real hospital infrastructure.
  - Provider API endpoints, OAuth2 client credentials, and sandbox environments.
- **Scope Clarification:** External EHR synchronization is approved scope. SMART on FHIR is **NOT** specifically mandated by the approved Change Request unless required by the client-selected hospital system. The existing Doctor Web diagnostic latency probe and integration toggle interface remain ready to bind once external endpoints are provisioned.

#### CR-08 — Prescription Pickup Reminders
- **Status:** `CLIENT_CLARIFICATION_REQUIRED` (Delivery Daemon) / `VERIFIED_COMPLETE` (Doctor Web UI & Lifecycle)
- **Completed in Goal 005:**
  - Reminder enable/disable toggle and interval selector (1h, 2h, 4h, 12h, 24h).
  - Explicit `Mark as Collected` clinical action in `PrescriptionsPage.tsx`.
  - Backend `PATCH /prescriptions/:id/collect` updating PostgreSQL metadata (`enabled: false, collected: true, collectedAt: timestamp`).
  - Automated termination of reminders upon collection.
- **Reported Remaining Work:**
  - Background cron/BullMQ automated dispatch daemon.
  - Repeated reminder dispatch until patient collection.
  - Awaiting client clarification on delivery channel priority (Twilio SMS vs Firebase Push vs SendGrid Email).

#### Other Doctor Web Requirements Status
- **CR-02 (Insurance & Treatment Financing):** Complete in Doctor Web (10-stage financing pipeline, encrypted PII, PostgreSQL `financing_applications`).
- **CR-03 (Slot Vacancy & Cancellation Tracking):** Complete in Doctor Web (`DoctorScheduleManagerPage.tsx`, `/schedules`).
- **CR-04 (Slot Creation, Booking & Leave Management):** Complete in Doctor Web (`DoctorScheduleManagerPage.tsx`).
- **CR-05 (Specialist Referral Management):** Complete in Doctor Web (`PatientReferralsPage.tsx`, `/referral`).
- **CR-07 (Office Chat & Customizable Response Templates):** Complete in Doctor Web (`OfficeChatConsolePage.tsx`, PostgreSQL JSON persistence in `platform_settings`, REST CRUD).

*Doctor Web tasks remain strictly within Developer 1 Doctor Web boundaries and are NOT counted as Admin Web pending work.*

---

## 3. Original PRD/FSD Admin Web Requirement Inventory (HEALTH VAULT 360.pdf)

| PRD Section | Requirement Name | Approved Client Scope | Responsible Application | Current Implementation Status |
|:---|:---|:---|:---|:---|
| **4.4.1** | **Authentication** | • Email & Password Login<br>• Mobile Number + OTP Login | Admin Web / Backend | **PARTIAL**<br>Email/Password is complete in UI & API. Mobile OTP is missing in Admin Web UI. |
| **4.4.2** | **Dashboard** | • Real-time overview of metrics: registered patients, facilities, doctors, staff, aggregate reports | Admin Web / Backend | **VERIFIED_COMPLETE**<br>`AdminDashboard.tsx`, `/api/v1/admin/dashboard/stats`, `/summary`. |
| **4.4.3** | **Patient Management** | • Add New Patients<br>• Edit Patient Profiles<br>• View Detailed Patient Information<br>• View Complete Medical History | Admin Web / Backend | **VERIFIED_COMPLETE**<br>`AdminPatientDirectory.tsx`, `AdminPatientProfile.tsx`, `AdminPatientRegistration.tsx`, `AdminAllHealthRecords.tsx`. |
| **4.4.4** | **Facility Management** | • Add Healthcare Facilities<br>• Edit Facility Profiles & Details<br>• Deactivate Facilities<br>• Staff & Doctor Mapping | Admin Web / Backend | **VERIFIED_COMPLETE**<br>`AdminFacilityDirectory.tsx`, `AdminAddFacility.tsx`, `AdminFacilityDetails.tsx`, `AdminStaffMapping.tsx`, `AdminMapDoctor.tsx`. |
| **4.4.5** | **Doctor & Staff Management** | • Add Doctors & Edit Profiles<br>• Map Doctors to Facilities<br>• Add Staff & Edit Profiles<br>• Map Staff to Facilities<br>• Create Sub-Admins & Assign RBAC | Admin Web / Backend | **VERIFIED_COMPLETE**<br>`AdminDoctorDirectory.tsx`, `AdminAddDoctor.tsx`, `AdminUserDirectory.tsx`, `AdminCreateUser.tsx`, `AdminSystemSettingsRoles.tsx`. |
| **4.4.6** | **Privacy Policy Management** | • Add Privacy Policy<br>• Edit Privacy Policy & Versions<br>• View Current Policy | Admin Web / Backend | **MISSING IN UI**<br>Backend CRUD exists at `/api/v1/cms/policies`. Dedicated Admin UI page missing. |
| **4.4.7** | **Terms & Conditions Management**| • Add Terms & Conditions<br>• Edit Content & Versions<br>• View Current Terms | Admin Web / Backend | **MISSING IN UI**<br>Backend CRUD exists at `/api/v1/cms/policies` & `/cms/treatment-terms`. Dedicated Admin UI page missing. |
| **4.4.8** | **Contact Information Management**| • Add, Edit & View Organization Contact Info (Phone, email, address, support) | Admin Web / Backend | **VERIFIED_COMPLETE**<br>`AdminSystemSettingsGeneral.tsx`, `/api/v1/admin/organizations`. |
| **4.4.9** | **Social Media Management** | • Add, Edit, View & Manage Social Media Links (LinkedIn, X/Twitter, FB, YouTube) | Admin Web / Backend | **MISSING IN UI & SCHEMA**<br>No dedicated UI screen or schema. Can be persisted under `platform_settings` JSON (`category: BRANDING`). |
| **4.4.10** | **Website CMS** | • Dynamic public website content management (Pages, FAQs, Announcements, Banners, Blocks) | Admin Web / Backend | **PARTIAL**<br>Announcements is complete (`AdminSystemSettingsAnnouncements.tsx`). Pages, FAQs, Banners, Blocks lack Admin UI views. |
| **4.4.11** | **Profile Management & Logout** | • Admin Profile Management (view & update details)<br>• Secure Token Revocation Logout | Admin Web / Backend | **VERIFIED_COMPLETE**<br>`AdminProfileInformation.tsx`, `AuthContext.tsx`, `/api/v1/auth/me`, `/auth/logout`. |
| **4.4.12** | **Reports & Analytics** | • Export & view administrative reports:<br>  - New Patient Subscriptions<br>  - Region-wise distribution<br>  - Age group distribution<br>  - Custom date/facility filtering | Admin Web / Backend | **PARTIAL**<br>`AdminReportsDashboard.tsx`, `AdminSystemHealthExport.tsx` exist. Dedicated discrete filter views for region-wise and age-group sub-breakdowns need explicit exposure. |
| **5.0** | **AI Validation & Enrichment** | • OCR Verification Queue<br>• Split-Pane Verification Workspace<br>• OCR Analytics & Rejected Queue<br>• Missing/Inconsistent Data Detection | Admin Web / Backend | **VERIFIED_COMPLETE**<br>`AdminOcrQueue.tsx`, `AdminOcrVerificationWorkspace.tsx`, `AdminOcrAnalytics.tsx`, `AdminOcrRejected.tsx`. |

---

## 4. Audit of Approved Change Requests CR-02 through CR-08 (Admin Scope)

| Change Request | Approved Client Scope (Admin Responsibility) | Existing Codebase State | Status | Confirmed Gap |
|:---|:---|:---|:---|:---|
| **CR-02: Insurance & Treatment Financing** | Administrator oversight of financing applications, offers, and discounts across all facilities. Monitor application stages, approval volumes, and merchant discount rates. | Backend has `/api/v1/financing/offers` and `/api/v1/financing/applications` persisting to `financing_applications` table. Doctor Web has full doctor-facing flow. Admin Web has **0 routes or pages** for financing. | **MISSING IN UI** | Admin Web lacks a dedicated Financing Oversight Dashboard to view cross-facility financing applications, audit status stages, and review financial metrics. |
| **CR-03: AI-Enabled Slot Management** | Centralized oversight of slot utilization, vacancy rates, doctor cancellations, and capacity bottlenecks across facilities. | Backend `/api/v1/schedules` tracks doctor slots and exceptions. Doctor Web manages doctor schedule. Admin Web has **no slot utilization view**. | **MISSING IN UI** | Admin Web lacks an aggregated view of slot utilization, booking rates, and unfilled slot metrics. |
| **CR-04: Multi-Branch & Specialist Appointments** | Centralized oversight of booking volumes, multi-facility appointment schedules, and status distributions (Scheduled, Completed, Cancelled). | Backend `/api/v1/appointments` exists. Admin Web facility details shows mapped doctors, but lacks a centralized cross-facility appointment monitor. | **PARTIAL** | No dedicated cross-facility appointment management and monitoring screen in Admin Web. |
| **CR-05: Patient Referral Network** | Oversight of inter-facility referrals, specialist handoffs, clinical attachment routing, bottleneck detection, and referral audit trails. | Fully built in Admin Web: `AdminReferralDashboard.tsx`, `AdminReferralMonitoring.tsx`, `AdminReferralDetails.tsx`, `AdminReferralAudit.tsx`, `AdminReferralActivityReport.tsx`. | **VERIFIED_COMPLETE** | None. Complete in Admin Web, Backend API, and PostgreSQL. |
| **CR-06: Bi-Directional EHR Integration** | Manage integration settings, monitor connection health, view sync telemetry, and toggle integration status. | Admin Web has `AdminSystemSettingsIntegrations.tsx` with toggle switches and connection status. Backend has latency/health probes. Live external hospital endpoints are blocked externally. | **PARTIAL / BLOCKED_EXTERNAL_DEPENDENCY** | Real data exchange is blocked awaiting external hospital SMART on FHIR credentials. Admin UI management interface is operational. |
| **CR-07: Two-Way Office Communication** | Monitor system-wide communication activity, provider availability, and audit message compliance without violating patient privacy. | Backend has `/api/v1/conversations`. Admin Web has `AdminAuditLogExplorer.tsx` capturing message audit logs. | **VERIFIED_COMPLETE** | System audit logging satisfies administrative compliance while preserving patient-clinician privacy. |
| **CR-08: Prescription Pickup Reminders** | Monitor prescription collection status, reminder delivery status, and overdue pickups across facilities. | Doctor Web sets reminders and marks collection. Backend `/api/v1/prescriptions` records `[PICKUP_REMINDER]` metadata. Admin Web lacks a prescription pickup oversight monitor. | **MISSING IN UI** | Admin Web lacks a centralized view to track prescription collection rates and reminder activity across facilities. |

---

## 5. Comprehensive Compliance Matrix (13-Column Schema)

| Requirement ID | Approved Requirement | Responsible Application | Existing Frontend | Existing Backend | Database | UI Verification | API Verification | Persistence | Status | Exact Gap | Proposed Fix | Priority |
|:---|:---|:---|:---|:---|:---|:---|:---|:---|:---|:---|:---|:---|
| **PRD-4.4.1a** | Admin Login via Email & Password | Admin Web / Backend | `src/components/auth/AdminLogin.tsx` | `AuthController.passwordLogin` (`POST /auth/password/login`) | `users.password_hash`, `sessions` | Verified in Chromium browser on `:5174` | 200 OK verified on `/api/v1/auth/password/login` | Session created in `sessions` table | **VERIFIED_COMPLETE** | None | N/A | P0 |
| **PRD-4.4.1b** | Admin Login via Mobile Number + OTP | Admin Web / Backend | Missing in `AdminLogin.tsx` | `AuthController.requestOtp` & `verifyOtp` | `auth_otps`, `users.phone` | Form fields absent in UI | Verified via curl/node against Backend | OTP stored in `auth_otps` | **MISSING IN UI** | Admin login UI does not offer Phone + OTP input tab or toggle | Add Phone + OTP login tab to `AdminLogin.tsx` | P1 |
| **PRD-4.4.2** | System Metrics Dashboard | Admin Web / Backend | `src/components/dashboard/AdminDashboard.tsx` | `AdminController.getStats` (`GET /admin/dashboard/stats`) | `users`, `facilities`, `doctor_profiles` | Verified on `:5174/admin/dashboard` | 200 OK verified on `/admin/dashboard/stats` | Live PostgreSQL aggregate counts | **VERIFIED_COMPLETE** | None | N/A | P0 |
| **PRD-4.4.3a** | Patient Directory & Search | Admin Web / Backend | `src/components/patients/AdminPatientDirectory.tsx` | `AdminController.getPatients` (`GET /admin/patients`) | `patient_profiles`, `users` | Verified on `:5174/admin/patients` | 200 OK (8KB payload) | Records returned from `patient_profiles` | **VERIFIED_COMPLETE** | None | N/A | P0 |
| **PRD-4.4.3b** | Patient Registration & Profile Edit | Admin Web / Backend | `AdminPatientRegistration.tsx`, `AdminPatientProfile.tsx` | `POST /admin/patients`, `PUT /admin/patients/:id` | `patient_profiles` | Verified forms and action dialogs | 200/201 OK verified | Committed to PostgreSQL | **VERIFIED_COMPLETE** | None | N/A | P0 |
| **PRD-4.4.3c** | Patient Medical History Viewer | Admin Web / Backend | `src/components/records/AdminAllHealthRecords.tsx` | `GET /records/patient/:id` | `medical_records`, `attachments` | Verified record timelines | 200 OK verified | Committed to PostgreSQL | **VERIFIED_COMPLETE** | None | N/A | P0 |
| **PRD-4.4.4a** | Healthcare Facility Directory & Creation | Admin Web / Backend | `AdminFacilityDirectory.tsx`, `AdminAddFacility.tsx` | `GET /facilities`, `POST /facilities` | `facilities`, `facility_branches` | Verified on `:5174/admin/facilities` | 200 OK (5.8KB payload) | Records returned from `facilities` | **VERIFIED_COMPLETE** | None | N/A | P0 |
| **PRD-4.4.4b** | Facility Staff & Doctor Mapping | Admin Web / Backend | `AdminStaffMapping.tsx`, `AdminMapDoctor.tsx` | `POST /facilities/:id/staff`, `POST /facilities/:id/doctors` | `doctor_facilities`, `staff_facilities` | Verified mapping modals & lists | 200 OK verified | Committed to PostgreSQL | **VERIFIED_COMPLETE** | None | N/A | P0 |
| **PRD-4.4.5a** | Doctor Directory & Profile Management | Admin Web / Backend | `AdminDoctorDirectory.tsx`, `AdminDoctorProfile.tsx` | `GET /admin/doctors`, `PUT /admin/doctors/:id` | `doctor_profiles` | Verified on `:5174/admin/doctors` | 200 OK (12.4KB payload) | Records returned from `doctor_profiles` | **VERIFIED_COMPLETE** | None | N/A | P0 |
| **PRD-4.4.5b** | Staff Directory & Sub-Admin RBAC Creation | Admin Web / Backend | `AdminUserDirectory.tsx`, `AdminCreateUser.tsx`, `AdminSystemSettingsRoles.tsx` | `GET/POST /admin/users`, `GET /admin/roles`, `PUT /admin/roles/:id/permissions` | `users`, `user_roles`, `roles`, `role_permissions` | Verified on `:5174/admin/users` and `/admin/settings/roles` | 200 OK (12.1KB payload) | Committed to PostgreSQL | **VERIFIED_COMPLETE** | None | N/A | P0 |
| **PRD-4.4.6** | Privacy Policy Management | Admin Web / Backend | Missing in UI | `CMSController` (`GET/POST/PUT /cms/policies`) | `cms_policies` / `platform_settings` | Missing UI route | 200 OK on `/api/v1/cms/policies` | Committed to PostgreSQL | **MISSING IN UI** | Admin Web has no UI screen to manage Privacy Policies | Build `AdminPrivacyPolicyPage.tsx` under Legal/CMS settings | P1 |
| **PRD-4.4.7** | Terms & Conditions Management | Admin Web / Backend | Missing in UI | `CMSController` (`GET/POST/PUT /cms/policies`) | `cms_policies` / `platform_settings` | Missing UI route | 200 OK on `/api/v1/cms/policies` | Committed to PostgreSQL | **MISSING IN UI** | Admin Web has no UI screen to manage Terms & Conditions | Build `AdminTermsConditionsPage.tsx` under Legal/CMS settings | P1 |
| **PRD-4.4.8** | Organization Contact Information Management | Admin Web / Backend | `src/components/settings/AdminSystemSettingsGeneral.tsx` | `GET/PUT /admin/organizations`, `/admin/settings` | `organizations`, `platform_settings` | Verified on `:5174/admin/settings/general` | 200 OK verified | Committed to PostgreSQL `organizations` | **VERIFIED_COMPLETE** | None | N/A | P1 |
| **PRD-4.4.9** | Social Media Management | Admin Web / Backend | Missing in UI | Missing dedicated endpoint (supports `platform_settings`) | `platform_settings` | Missing UI route | Can be persisted via `upsertSystemSetting` | Persists in `platform_settings` | **MISSING** | No dedicated UI or schema for social links | Add Social Media section in `AdminSystemSettingsGeneral.tsx` storing to `platform_settings` | P2 |
| **PRD-4.4.10** | Website CMS (Pages, FAQs, Announcements, Banners) | Admin Web / Backend | `AdminSystemSettingsAnnouncements.tsx` (Announcements only) | `CMSController` (`/cms/pages`, `/cms/faqs`, `/cms/banners`, `/cms/blocks`) | `cms_pages`, `cms_faqs`, `cms_banners`, `cms_blocks` | Only Announcements route exists | 200 OK on CMS endpoints in backend | Committed to PostgreSQL | **PARTIAL** | Pages, FAQs, and Banners lack Admin UI screens | Build consolidated `AdminCmsManagement.tsx` with tabs for Pages, FAQs, and Banners | P2 |
| **PRD-4.4.11** | Admin Profile & Token Revocation Logout | Admin Web / Backend | `AdminProfileInformation.tsx`, `AdminSidebar.tsx` | `GET/PUT /auth/me`, `POST /auth/logout` | `users`, `sessions` | Verified on `:5174/admin/profile` | 200 OK verified | Session revoked in PostgreSQL | **VERIFIED_COMPLETE** | None | N/A | P0 |
| **PRD-4.4.12** | Administrative Reports & Analytics Export | Admin Web / Backend | `AdminReportsDashboard.tsx`, `AdminSystemHealthExport.tsx` | `GET /reports/dashboard/executive`, `/admin/dashboard/stats` | `patient_profiles`, `facilities` | Verified on `:5174/admin/reports` | 200 OK (executive dashboard) | Aggregates from PostgreSQL | **PARTIAL** | Discrete filter views for region-wise and age-group sub-breakdowns need explicit exposure | Add demographic breakdown card (region, age-group) to Reports Dashboard | P1 |
| **PRD-5.0** | AI Real-Time Validation & OCR Workspace | Admin Web / Backend | `AdminOcrQueue.tsx`, `AdminOcrVerificationWorkspace.tsx`, `AdminOcrAnalytics.tsx` | `OCRController` (`/ocr/dashboard`, `/ocr/jobs`, `/ocr/verify`) | `ocr_jobs`, `extracted_fields`, `ocr_templates` | Verified on `:5174/admin/ocr/queue` & `/workspace` | 200 OK on `/ocr/dashboard` | Committed to PostgreSQL | **VERIFIED_COMPLETE** | None | N/A | P0 |
| **CR-02** | Insurance & Financing Oversight | Admin Web / Backend | Missing in UI | `GET /financing/offers`, `GET /financing/applications` | `financing_applications`, `treatment_offers` | Missing UI route | 200 OK verified on `/financing/offers` | Persisted in PostgreSQL | **MISSING IN UI** | Admin Web lacks a dedicated Financing Oversight Dashboard | Build `AdminFinancingDashboard.tsx` with application review and financial metrics | P1 |
| **CR-03** | Slot Vacancy & Utilization Oversight | Admin Web / Backend | Missing in UI | `/schedules` (Doctor schedules & exceptions) | `doctor_schedules`, `schedule_exceptions` | Missing UI route | Available in Backend | Persisted in PostgreSQL | **MISSING IN UI** | Admin Web lacks a centralized slot utilization and vacancy view | Build `AdminSlotUtilizationDashboard.tsx` under Facilities/Reports | P2 |
| **CR-04** | Multi-Branch Appointment Oversight | Admin Web / Backend | Partial in Facility Details | `/appointments` | `appointments` | Doctor list exists; appointment list absent | Available in Backend | Persisted in PostgreSQL | **PARTIAL** | No cross-facility appointment management monitor | Add Appointment Oversight view under Facilities | P2 |
| **CR-05** | Patient Referral Network Oversight | Admin Web / Backend | `AdminReferralDashboard.tsx`, `AdminReferralMonitoring.tsx`, `AdminReferralDetails.tsx` | `GET /referrals`, `/referrals/analytics/dashboard` | `referrals`, `referral_audits` | Verified on `:5174/admin/referrals` | 200 OK (13.1KB payload) | Records returned from `referrals` | **VERIFIED_COMPLETE** | None | N/A | P0 |
| **CR-06** | Bi-Directional EHR Integration Oversight | Admin Web / Backend | `AdminSystemSettingsIntegrations.tsx` | EHR Latency probe & connection status | `platform_settings` | Verified on `:5174/admin/settings/integrations` | Mock latency probe verified | Integration status persisted | **BLOCKED_EXTERNAL_DEPENDENCY** | Real external hospital EHR credentials pending from client | Maintain configuration UI; bind live credentials once provided | P2 |
| **CR-07** | Two-Way Office Communication Oversight | Admin Web / Backend | `AdminAuditLogExplorer.tsx` | `GET /conversations`, `GET /admin/audit-logs` | `audit_logs`, `platform_settings` | Verified on `:5174/admin/audit-log-explorer` | 200 OK on `/admin/audit-logs` | Committed to PostgreSQL | **VERIFIED_COMPLETE** | None (admin audit satisfies compliance while preserving clinician privacy) | N/A | P1 |
| **CR-08** | Prescription Pickup Reminder Oversight | Admin Web / Backend | Missing in UI | `GET /prescriptions` | `prescriptions` | Missing UI route | Available in Backend | Persisted in PostgreSQL | **MISSING IN UI** | Admin Web lacks a prescription pickup oversight monitor | Add Prescription Collection Oversight card/view under Reports/Operations | P2 |

---

## 6. Verified Complete Admin Web Features

1. **Authentication & Session Security (PRD 4.4.1 & 4.4.11):**
   - Secure Email/Password administrator login with bcrypt validation.
   - Genuine JWT authentication against `/api/v1/auth/password/login`.
   - Token refresh lifecycle, session expiration handling, and full token revocation logout.
   - Comprehensive Profile management view (`AdminProfileInformation.tsx`).
2. **Executive Overview Dashboard (PRD 4.4.2):**
   - Live metrics summary: registered patients, verified doctors, facilities, staff profiles, and system health.
   - Connected directly to `/api/v1/admin/dashboard/stats` and `/api/v1/reports/dashboard/executive`.
3. **Comprehensive Patient Management (PRD 4.4.3):**
   - Searchable, filterable Patient Directory (`AdminPatientDirectory.tsx`).
   - Detailed patient profile view, demographic editing, and new patient onboarding.
   - Complete Medical Record timeline viewer (`AdminAllHealthRecords.tsx`, `AdminMedicalRecords.tsx`, `AdminDentalRecords.tsx`, `AdminVisionRecords.tsx`).
   - Digital Health Card and QR code viewer.
4. **Healthcare Facility Management (PRD 4.4.4):**
   - Full facility directory, branch and department management (`AdminFacilityDirectory.tsx`, `AdminFacilityDetails.tsx`).
   - New facility registration (`AdminAddFacility.tsx`) and profile editing (`AdminEditFacility.tsx`).
   - Staff mapping and Doctor facility mapping workflows (`AdminStaffMapping.tsx`, `AdminMapDoctor.tsx`).
5. **Doctor & Staff Onboarding & RBAC Governance (PRD 4.4.5):**
   - Doctor directory with credential verification status (`VERIFIED`, `PENDING`, `SUSPENDED`).
   - Doctor profile viewer and credential inspection (`AdminDoctorProfile.tsx`).
   - User directory with sub-admin provisioning (`AdminUserDirectory.tsx`, `AdminCreateUser.tsx`).
   - Granular RBAC Role and Permission Matrix management (`AdminSystemSettingsRoles.tsx`).
6. **Enterprise Organization Settings & Branding (PRD 4.4.8):**
   - Organization name, contact email, phone number, and physical address (`AdminSystemSettingsGeneral.tsx`).
   - White-label branding controls: logo upload, color scheme, favicon customization (`AdminSystemSettingsBranding.tsx`).
7. **Referral Management & Care Coordination (CR-05):**
   - Full referral overview dashboard, active referral monitoring, and bottleneck escalation (`AdminReferralDashboard.tsx`, `AdminReferralMonitoring.tsx`).
   - Deep referral audit log viewer (`AdminReferralAudit.tsx`) and activity export (`AdminReferralActivityReport.tsx`).
8. **AI Real-Time Validation & OCR Processing Pipeline (PRD Section 5):**
   - Live OCR ingestion queue (`AdminOcrQueue.tsx`).
   - Interactive Split-Pane Document Verification Workspace (`AdminOcrVerificationWorkspace.tsx`).
   - OCR performance metrics and analytics (`AdminOcrAnalytics.tsx`).
   - OCR rejection handling and quarantine queue (`AdminOcrRejected.tsx`).
9. **System Audit Log Explorer & Security Governance:**
   - Full append-only audit trail explorer (`AdminAuditLogExplorer.tsx`, `AdminAuditDashboard.tsx`).
   - Security compliance scorecards and threat detection metrics (`AdminSecurityCompliance.tsx`).
   - Multi-device active session governance and remote termination (`AdminSecuritySessionManagement.tsx`).

---

## 7. Exact Pending Development Tasks (Actionable Gap Inventory)

The confirmed gaps are structured into strict boundary categories with all 10 required architectural fields per task:

### A. ADMIN WEB FRONTEND GAPS

#### Task ADM-01: Admin Mobile Number + OTP Login UI
1. **Task ID:** `TASK-ADM-01`
2. **PRD/CR Reference:** PRD Section 4.4.1 (Authentication)
3. **Exact Missing Functionality:** Admin portal login screen only supports Email/Password. Mobile number + OTP login interface is absent in Admin Web UI.
4. **Required Admin Web Changes:** Add authentication mode selector tab ("Email & Password" vs "Mobile Number + OTP") in `src/components/auth/AdminLogin.tsx`. Wire phone input and 6-digit OTP challenge inputs to `authService.requestOtp` and `authService.verifyOtp`.
5. **Required Backend Changes:** None. Backend endpoints `/api/v1/auth/otp/request` and `/api/v1/auth/otp/verify` are already operational.
6. **Required PostgreSQL Changes:** None. `auth_otps` table already exists and persists challenges.
7. **Authorization Requirements:** Public unauthenticated endpoint for request/verify; issues JWT with verified `ADMIN` or `SUPER_ADMIN` role claim.
8. **Acceptance Criteria:** Administrator can enter whitelisted mobile number (`+16505550001` or `+16505550002`), receive challenge ID, enter OTP `123456`, and successfully redirect to `/admin/dashboard`.
9. **Verification Method:** Chromium browser automated login test on `:5174` verifying state transition from login form to `/admin/dashboard`.
10. **Priority & Dependencies:** Priority P0; no prerequisite dependencies.

#### Task ADM-02: Legal Privacy Policy Management UI
1. **Task ID:** `TASK-ADM-02`
2. **PRD/CR Reference:** PRD Section 4.4.6 (Privacy Policy Management)
3. **Exact Missing Functionality:** Dedicated UI screen to view, create, edit, version, and publish Privacy Policies is missing in Admin Web.
4. **Required Admin Web Changes:** Create `src/components/legal/AdminPrivacyPolicyPage.tsx` with markdown/rich-text editor, version list, status badge (Draft/Published), and publish action. Add route `/admin/legal/privacy-policy` in `App.tsx` and sidebar link under Legal/Settings.
5. **Required Backend Changes:** None. Backend `CMSController` (`/api/v1/cms/policies`) already supports `GET`, `POST`, `PUT`, `DELETE`.
6. **Required PostgreSQL Changes:** None. Uses `cms_policies` or `platform_settings` table.
7. **Authorization Requirements:** Requires authenticated session with `ADMIN` or `SUPER_ADMIN` role.
8. **Acceptance Criteria:** Administrator can view active policy, edit content, click Publish, and observe updated version and publication timestamp.
9. **Verification Method:** End-to-end browser test creating and updating a policy; verify HTTP 200/201 response and PostgreSQL persistence.
10. **Priority & Dependencies:** Priority P1; depends on `cms.controller.ts`.

#### Task ADM-03: Legal Terms & Conditions Management UI
1. **Task ID:** `TASK-ADM-03`
2. **PRD/CR Reference:** PRD Section 4.4.7 (Terms & Conditions Management)
3. **Exact Missing Functionality:** Dedicated UI screen to view, create, edit, version, and publish Terms & Conditions is missing in Admin Web.
4. **Required Admin Web Changes:** Create `src/components/legal/AdminTermsConditionsPage.tsx` with version control, content editor, and publish action. Add route `/admin/legal/terms-conditions` in `App.tsx` and sidebar link under Legal/Settings.
5. **Required Backend Changes:** None. Backend `CMSController` (`/api/v1/cms/policies` and `/api/v1/cms/treatment-terms`) already operational.
6. **Required PostgreSQL Changes:** None. Uses `cms_policies` table.
7. **Authorization Requirements:** Requires `ADMIN` or `SUPER_ADMIN` role.
8. **Acceptance Criteria:** Administrator can draft new terms revision, preview formatting, and publish updates.
9. **Verification Method:** Browser test verifying form submission, API payload dispatch, and database commit.
10. **Priority & Dependencies:** Priority P1; depends on `cms.controller.ts`.

#### Task ADM-04: Organization Social Media Management UI
1. **Task ID:** `TASK-ADM-04`
2. **PRD/CR Reference:** PRD Section 4.4.9 (Social Media Management)
3. **Exact Missing Functionality:** Dedicated UI controls to manage public organizational social media links (LinkedIn, X/Twitter, Facebook, Instagram, YouTube) are missing.
4. **Required Admin Web Changes:** Add a "Social Media Channels" card to `AdminSystemSettingsGeneral.tsx` or `AdminSystemSettingsBranding.tsx` with validated URL input fields for LinkedIn, X/Twitter, Facebook, Instagram, and YouTube.
5. **Required Backend Changes:** Wire payload into existing `upsertSystemSetting` service under category `BRANDING` with key `SOCIAL_LINKS`.
6. **Required PostgreSQL Changes:** None. Stored as JSON in `platform_settings`.
7. **Authorization Requirements:** Requires `ADMIN` or `SUPER_ADMIN` role.
8. **Acceptance Criteria:** Administrator can input valid social URLs, click Save, and see links persist upon page reload.
9. **Verification Method:** Automated test updating social links and verifying `SELECT value FROM platform_settings WHERE key='SOCIAL_LINKS'`.
10. **Priority & Dependencies:** Priority P2; depends on `systemSettingsService.ts`.

#### Task ADM-05: Website CMS Management Hub (Pages, FAQs, Banners)
1. **Task ID:** `TASK-ADM-05`
2. **PRD/CR Reference:** PRD Section 4.4.10 (Website CMS)
3. **Exact Missing Functionality:** Admin Web only implements Announcements. Pages, FAQs, and Banners lack management screens.
4. **Required Admin Web Changes:** Create `src/components/cms/AdminCmsManagement.tsx` containing tabbed sub-views: (1) Pages Directory & Editor, (2) FAQs Manager, (3) Banners Manager. Add route `/admin/cms` in `App.tsx`.
5. **Required Backend Changes:** None. `CMSController` endpoints (`/api/v1/cms/pages`, `/faqs`, `/banners`) already exist.
6. **Required PostgreSQL Changes:** None. Tables `cms_pages`, `cms_faqs`, `cms_banners` are provisioned.
7. **Authorization Requirements:** Requires `ADMIN` or `SUPER_ADMIN` role.
8. **Acceptance Criteria:** Administrator can create an FAQ item, upload/configure a promotional banner, and list CMS pages.
9. **Verification Method:** Component and browser tests verifying CRUD against `/api/v1/cms/*`.
10. **Priority & Dependencies:** Priority P2; depends on `CMSController`.

#### Task ADM-06: Treatment Financing & Discount Oversight Dashboard
1. **Task ID:** `TASK-ADM-06`
2. **PRD/CR Reference:** Change Request CR-02 (Insurance & Treatment Financing)
3. **Exact Missing Functionality:** Admin Web has zero views or metrics for treatment financing applications, discount approvals, or merchant discount monitoring across facilities.
4. **Required Admin Web Changes:** Create `src/components/financial/AdminFinancingDashboard.tsx` with: (1) Total volume & approval rate KPI cards, (2) Application stage pipeline table (Draft, Submitted, Under Review, Approved, Disbursed, Rejected), (3) Facility filter and date picker. Add route `/admin/financing` in `App.tsx`.
5. **Required Backend Changes:** Minor query optimization on `GET /api/v1/financing/applications` ensuring facility and status filters return aggregated counts for administrators.
6. **Required PostgreSQL Changes:** None. `financing_applications` table is fully populated.
7. **Authorization Requirements:** Requires `ADMIN` or `SUPER_ADMIN` role.
8. **Acceptance Criteria:** Administrator can view all submitted applications across facilities, filter by status, and review applicant financial summaries without exposing plaintext SSN/PII.
9. **Verification Method:** Browser test verifying table rendering from live `/api/v1/financing/applications` data.
10. **Priority & Dependencies:** Priority P1; depends on `backend/src/modules/financing`.

#### Task ADM-07: Slot Utilization & Cross-Facility Appointment Monitor
1. **Task ID:** `TASK-ADM-07`
2. **PRD/CR Reference:** Change Requests CR-03 & CR-04 (Slot Management & Appointment Booking)
3. **Exact Missing Functionality:** Admin Web lacks centralized visibility into doctor slot utilization, unfilled slot vacancies, and cross-facility appointment volumes.
4. **Required Admin Web Changes:** Add "Capacity & Slot Utilization" overview to Facility Management or Reports dashboard, displaying: (1) Total slots created vs booked, (2) Vacancy rate percentage, (3) Doctor cancellation metrics.
5. **Required Backend Changes:** Provide lightweight summary query or endpoint `GET /api/v1/schedules/utilization/summary`.
6. **Required PostgreSQL Changes:** None. Aggregates from `doctor_schedules` and `appointments`.
7. **Authorization Requirements:** Requires `ADMIN` or `SUPER_ADMIN` role.
8. **Acceptance Criteria:** Administrator can inspect utilization rates across all healthcare facilities.
9. **Verification Method:** Automated API response check and UI widget rendering test.
10. **Priority & Dependencies:** Priority P2; depends on `/schedules` and `/appointments`.

#### Task ADM-08: Prescription Pickup Reminder Oversight Monitor
1. **Task ID:** `TASK-ADM-08`
2. **PRD/CR Reference:** Change Request CR-08 (Prescription Pickup Reminders)
3. **Exact Missing Functionality:** Admin Web has no facility-wide monitoring of prescription collection rates, active reminder schedules, or overdue pickups.
4. **Required Admin Web Changes:** Add "Prescription Pickup Oversight" widget to Operations/Reports, displaying total prescriptions with reminders, collected count, pending pickups, and average collection turnaround.
5. **Required Backend Changes:** Add aggregation helper query on `/prescriptions` filtering by `[PICKUP_REMINDER]` metadata.
6. **Required PostgreSQL Changes:** None. Metadata is stored in `prescriptions.notes`.
7. **Authorization Requirements:** Requires `ADMIN` or `SUPER_ADMIN` role.
8. **Acceptance Criteria:** Administrator can monitor prescription collection efficiency across facilities without violating patient-specific prescription confidentiality.
9. **Verification Method:** UI rendering test verifying aggregate counts against database records.
10. **Priority & Dependencies:** Priority P2; depends on Goal 005 prescription collection feature.

#### Task ADM-09: Reports Demographic Sub-Breakdown Exposure
1. **Task ID:** `TASK-ADM-09`
2. **PRD/CR Reference:** PRD Section 4.4.12 (Reports & Analytics)
3. **Exact Missing Functionality:** Reports Dashboard displays high-level aggregates but lacks explicit discrete filter controls for Region-wise and Age-group demographic distribution.
4. **Required Admin Web Changes:** Add "Demographic Distribution" tab or filter panel to `AdminReportsDashboard.tsx` with breakdown cards for Age Group (0-18, 19-35, 36-50, 51-65, 65+) and Region/City.
5. **Required Backend Changes:** Wire query parameters to existing `GET /api/v1/reports/dashboard/executive`.
6. **Required PostgreSQL Changes:** None. Derived from `patient_profiles.dob` and `patient_profiles.city/state`.
7. **Authorization Requirements:** Requires `ADMIN` or `SUPER_ADMIN` role.
8. **Acceptance Criteria:** Administrator can filter report views by age cohort and regional geography.
9. **Verification Method:** Browser test applying filters and asserting updated chart/table figures.
10. **Priority & Dependencies:** Priority P1; depends on `reportService.ts`.

---

### B. SHARED BACKEND GAPS REQUIRED BY ADMIN WEB

#### Task BE-01: Admin Financing Applications Query & Aggregation
1. **Task ID:** `TASK-BE-01`
2. **PRD/CR Reference:** CR-02 (Insurance & Treatment Financing)
3. **Exact Missing Functionality:** Backend endpoint `GET /api/v1/financing/applications` needs explicit administrator query parameter handling for cross-facility aggregation.
4. **Required Backend Changes:** Update `FinancingController` to accept `facilityId`, `status`, and `dateRange` query parameters for `ADMIN` and `SUPER_ADMIN` callers.
5. **Required PostgreSQL Changes:** None. Uses existing indices on `financing_applications`.
6. **Authorization Requirements:** Enforce `@Roles('ADMIN', 'SUPER_ADMIN')`.
7. **Acceptance Criteria:** Admin query returns multi-facility financing applications with pagination and stage metadata.
8. **Verification Method:** Jest integration test in `backend/src/modules/financing/tests/`.
9. **Priority & Dependencies:** Priority P1.

#### Task BE-02: Social Media Platform Settings Category Helper
1. **Task ID:** `TASK-BE-02`
2. **PRD/CR Reference:** PRD Section 4.4.9 (Social Media Management)
3. **Exact Missing Functionality:** Standardized helper to read and validate organizational social media URLs.
4. **Required Backend Changes:** Ensure `systemSettingsService` supports JSON validation for `SOCIAL_LINKS` key under category `BRANDING`.
5. **Required PostgreSQL Changes:** None. Stored in `platform_settings`.
6. **Authorization Requirements:** Enforce `ADMIN` / `SUPER_ADMIN` on writes; public read.
7. **Acceptance Criteria:** Valid social links persist cleanly as JSON.
8. **Verification Method:** API test calling `PUT /api/v1/admin/settings` with `SOCIAL_LINKS` payload.
9. **Priority & Dependencies:** Priority P2.

#### Task BE-03: Consolidated Slot Utilization Aggregation Helper
1. **Task ID:** `TASK-BE-03`
2. **PRD/CR Reference:** CR-03 & CR-04 (Slot & Appointment Management)
3. **Exact Missing Functionality:** Lightweight aggregation endpoint for cross-facility slot fill rates.
4. **Required Backend Changes:** Add `GET /api/v1/schedules/utilization/summary` in `ScheduleController`.
5. **Required PostgreSQL Changes:** None. Queries `doctor_schedules` and `appointments`.
6. **Authorization Requirements:** Enforce `ADMIN` / `SUPER_ADMIN`.
7. **Acceptance Criteria:** Returns total available slots, booked slots, and vacancy rate.
8. **Verification Method:** Integration test verifying correct percentage calculation.
9. **Priority & Dependencies:** Priority P2.

#### Task BE-04: Prescription Pickup Summary Aggregator
1. **Task ID:** `TASK-BE-04`
2. **PRD/CR Reference:** CR-08 (Prescription Pickup Reminders)
3. **Exact Missing Functionality:** Aggregation helper for prescription collection statistics.
4. **Required Backend Changes:** Add `GET /api/v1/prescriptions/admin/collection-summary` in `PrescriptionController`.
5. **Required PostgreSQL Changes:** None. Parses `[PICKUP_REMINDER]` in `prescriptions.notes`.
6. **Authorization Requirements:** Enforce `ADMIN` / `SUPER_ADMIN`.
7. **Acceptance Criteria:** Returns total prescriptions, collected count, and pending collection count.
8. **Verification Method:** Integration test asserting correct counts.
9. **Priority & Dependencies:** Priority P2.

---

### C. EXTERNAL INTEGRATION DEPENDENCIES (BLOCKED ON CLIENT / THIRD-PARTY)

#### Task EXT-01: Live Hospital SMART on FHIR Server Endpoints
1. **Task ID:** `TASK-EXT-01`
2. **PRD/CR Reference:** CR-06 (Bi-Directional EHR Integration)
3. **Exact Missing Functionality:** Live inbound/outbound EHR synchronization with external hospital provider.
4. **Blocking Factor:** No live external hospital FHIR endpoint URLs, client IDs, or OAuth2 sandbox credentials have been provided by the client.
5. **Resolution Path:** Retain diagnostic connection interface (`AdminSystemSettingsIntegrations.tsx`); bind to real server endpoints once client provisions them.
6. **Status:** `BLOCKED_EXTERNAL_DEPENDENCY`.
7. **Priority:** P2.

#### Task EXT-02: Production SMS & Push Notification Gateway Provisioning
1. **Task ID:** `TASK-EXT-02`
2. **PRD/CR Reference:** CR-08 (Prescription Pickup Reminders) & PRD 4.4.1 (Mobile OTP)
3. **Exact Missing Functionality:** Live delivery of SMS messages to real mobile handsets outside sandbox whitelist.
4. **Blocking Factor:** Awaiting client selection of production delivery vendor (Twilio SMS vs AWS SNS vs FCM Push) and provisioning of production API credentials.
5. **Resolution Path:** Sandbox test provider is fully operational for development and integration testing; switch to live provider keys upon client delivery.
6. **Status:** `CLIENT_CLARIFICATION_REQUIRED`.
7. **Priority:** P2.

---

### D. DOCTOR WEB REMAINING DEPENDENCIES (HANDOFF FROM GOAL 005)

#### Task DOC-01: Doctor Web External EHR Provider Verification
1. **Task ID:** `TASK-DOC-01`
2. **PRD/CR Reference:** CR-06 (External EHR Sync)
3. **Status:** `BLOCKED_EXTERNAL_DEPENDENCY`. Diagnostic latency probe and connection status UI are complete in Doctor Web. Awaiting external endpoints.
4. **Boundary Note:** Strictly owned by Doctor Web; do NOT count as Admin Web pending task.

#### Task DOC-02: Prescription Pickup Automated Background Reminder Dispatch Worker
1. **Task ID:** `TASK-DOC-02`
2. **PRD/CR Reference:** CR-08 (Prescription Pickup Reminders)
3. **Status:** `CLIENT_CLARIFICATION_REQUIRED`. Prescription collection tracking and reminder termination are complete. Background cron dispatcher daemon awaiting delivery channel selection.
4. **Boundary Note:** Strictly owned by Doctor Web / Backend background tasks; do NOT count as Admin Web pending task.

---

### E. FLUTTER / DEVELOPER 2 RESPONSIBILITIES (UNTOUCHED BOUNDARIES)

#### Task FLUTTER-01: CAREID_doctor_app Features
1. **Task ID:** `TASK-FLUTTER-01`
2. **Scope:** Flutter-based mobile doctor application (`D:\careid\CAREID_doctor_app`).
3. **Boundary Rule:** Strictly owned by Developer 2. Antigravity / Developer 1 shall make **zero modifications**.

#### Task FLUTTER-02: CAREID_patient_app Features
1. **Task ID:** `TASK-FLUTTER-02`
2. **Scope:** Flutter-based mobile patient application (`D:\careid\CAREID_patient_app`).
3. **Boundary Rule:** Strictly owned by Developer 2. Antigravity / Developer 1 shall make **zero modifications**.

---

### F. UNAPPROVED OR OUT-OF-SCOPE FEATURES (EXCLUSION LIST)

#### Task OUT-01: Pharmacy POS & Retail Inventory Management
1. **Task ID:** `TASK-OUT-01`
2. **Scope:** Pharmacy stock inventory, barcode POS checkout, drug dispensing hardware integration.
3. **Boundary Rule:** Explicitly excluded from CareID PRD/FSD and CR-02 through CR-08 scope. Must NOT be implemented.

#### Task OUT-02: Public Payment Gateway Settlement & Merchant Banking
1. **Task ID:** `TASK-OUT-02`
2. **Scope:** Direct credit card payment processing, merchant bank reconciliations.
3. **Boundary Rule:** Financing applications are managed through partnering lending institutions; CareID is not a direct merchant payment gateway. Excluded from scope.

---

## 8. Shared Backend Work Required by Admin Web

1. **Social Media Settings API Helper:**
   - Ensure `platform_settings` has a standard category `SOCIAL_MEDIA` (or `BRANDING_SOCIAL`) with default keys for LinkedIn, Facebook, Instagram, X/Twitter, and YouTube.
   - No schema changes required: uses existing `platform_settings` key-value model.
2. **Financing Applications Admin Query:**
   - Verify that `GET /api/v1/financing/applications` supports filtering by `facilityId`, `status`, and date range with administrator authorization (`ADMIN`, `SUPER_ADMIN`).
3. **Aggregated Slot Utilization Endpoint (Optional Optimization):**
   - Provide a lightweight summary endpoint `GET /api/v1/schedules/utilization/summary` returning total available slots, booked slots, and vacancy rates across facilities.
4. **Prescription Collection Summary Endpoint (Optional Optimization):**
   - Provide `GET /api/v1/prescriptions/admin/collection-summary` aggregating total prescriptions, collection rate, and overdue pickups.

---

## 9. Security, Data-Isolation & Authorization Findings

1. **Role-Based Access Control (RBAC):**
   - Admin Web enforces strict route protection via `<ProtectedRoute>` in `AuthContext.tsx`.
   - Access requires verified JWT claims containing `ADMIN` or `SUPER_ADMIN` roles.
   - Backend enforces `@UseGuards(AuthGuard('jwt'), RolesGuard)` and `@Roles('ADMIN', 'SUPER_ADMIN')` on all administrative controllers (`admin.controller.ts`, `facilities.controller.ts`, `ocr.controller.ts`, `referral.controller.ts`, `cms.controller.ts`).
2. **Human vs Veterinary Workspace Isolation:**
   - Strict separation is preserved: human clinical records (`medical_records`) and veterinary profiles (`pet_profiles`) are strictly isolated by entity types and separate administrative directory views (`AdminPatientDirectory.tsx` vs `AdminPetDirectory.tsx`).
   - Cross-tenant data leaks are prevented by facility and doctor binding constraints in Prisma queries.
3. **Clinical Audit Logging:**
   - All administrative actions (user status changes, doctor credential verifications, role updates, setting edits, and logins) write append-only records to `audit_logs` in PostgreSQL.
   - Doctor and patient privacy is preserved in communication oversight: audit records log timestamp, participant IDs, and action metadata without exposing protected health conversation transcripts to unauthorized administrators.

---

## 10. Prioritized Phase B Proposed Implementation Plan

The pending tasks are strictly organized by priority and repository boundary:

### Priority P0 — Critical Governance & PRD Core Access
- **TASK-ADM-01: Admin Mobile Number + OTP Login (PRD 4.4.1)**
  - Add Phone + OTP authentication tab to `AdminLogin.tsx`.
  - Wire to existing backend `/api/v1/auth/otp/request` and `/api/v1/auth/otp/verify`.
  - Verification: Successful login in browser via SMS sandbox OTP (`123456`).

### Priority P1 — High-Priority PRD Legal & Financial Oversight
- **TASK-ADM-02: Privacy Policy Management Page (PRD 4.4.6)**
  - Create `AdminPrivacyPolicyPage.tsx` under Legal/Settings.
  - Wire to `GET`, `POST`, `PUT`, `DELETE /api/v1/cms/policies` with category `PRIVACY_POLICY`.
  - Verification: Create, edit, and publish policy; verify persistence in PostgreSQL.
- **TASK-ADM-03: Terms & Conditions Management Page (PRD 4.4.7)**
  - Create `AdminTermsConditionsPage.tsx` under Legal/Settings.
  - Wire to `GET`, `POST`, `PUT`, `DELETE /api/v1/cms/policies` with category `TERMS_AND_CONDITIONS`.
  - Verification: Create, edit, and publish terms; verify persistence in PostgreSQL.
- **TASK-ADM-04: CR-02 Financing & Treatment Discount Oversight Dashboard**
  - Create `AdminFinancingDashboard.tsx` with metrics overview, application stage review, and facility filter.
  - Wire to `GET /api/v1/financing/offers` and `GET /api/v1/financing/applications`.
  - Verification: Inspect live financing applications and approval rates in browser.
- **TASK-ADM-05: Reports Demographic Sub-Breakdown Exposure (PRD 4.4.12)**
  - Add explicit Region-Wise and Age-Group distribution widgets to `AdminReportsDashboard.tsx`.
  - Wire to executive dashboard breakdown parameters.
  - Verification: Filter reports by facility, date range, and demographic cohort.

### Priority P2 — CMS Expansion & Operational Oversight
- **TASK-ADM-06: Social Media Links Management (PRD 4.4.9)**
  - Add Social Media configuration card to `AdminSystemSettingsGeneral.tsx`.
  - Wire to `platform_settings` under category `BRANDING` via `systemSettingsService.ts`.
  - Verification: Update LinkedIn, X, Facebook handles; verify persistence.
- **TASK-ADM-07: Website CMS Management Hub (PRD 4.4.10)**
  - Create `AdminCmsManagement.tsx` consolidating Pages, FAQs, and Banners management.
  - Wire to existing `cms.controller.ts` endpoints (`/cms/pages`, `/cms/faqs`, `/cms/banners`).
  - Verification: Create FAQ item and promotional banner; verify persistence.
- **TASK-ADM-08: CR-03 & CR-04 Slot Utilization & Cross-Facility Appointment Monitor**
  - Add Appointment Volume & Slot Utilization overview to Facility Management / Operations.
  - Wire to `/schedules` and `/appointments`.
  - Verification: View booking volumes and cancellation metrics across facilities.
- **TASK-ADM-09: CR-08 Prescription Pickup Reminder Oversight Monitor**
  - Add Prescription Collection & Overdue Pickup tracking widget to Operations/Reports.
  - Wire to `/prescriptions` collection status metadata.
  - Verification: View collected vs pending pickup counts across facilities.

### Priority P3 — External Dependencies & Future Handoffs (Blocked / Client Input)
- **TASK-ADM-10: CR-06 Live External EHR Integration Verification**
  - Blocked on external hospital FHIR endpoint URLs, client IDs, and credentials.
  - Retain existing configuration interface in `AdminSystemSettingsIntegrations.tsx`.
- **TASK-ADM-11: CR-08 Recurring Background Reminder Daemon**
  - Blocked on client delivery vendor selection (Twilio vs Firebase vs SendGrid).

---

## 11. Boundary Classification (Separation of Concerns)

| Category | Tasks Included | Boundary Rules |
|:---|:---|:---|
| **A. Admin Web Frontend Gaps** | Mobile OTP login UI, Privacy Policy UI, Terms & Conditions UI, Social Media settings UI, CMS Hub UI, Financing Dashboard, Slot/Appointment monitor, Prescription pickup monitor | Implemented exclusively in `D:\careid\Admin_web` |
| **B. Shared Backend Gaps** | Minor helper methods or aggregations for financing, slot utilization, and social media settings | Implemented exclusively in `D:\careid\backend` without destructive migrations |
| **C. External Dependencies** | Hospital SMART on FHIR endpoints, SMS/Push production gateways | Retained as `BLOCKED_EXTERNAL_DEPENDENCY` awaiting client credentials |
| **D. Doctor Web Handoff** | Doctor Web Goals 001–005 scope (CR-02, CR-03, CR-04, CR-05, CR-07, CR-08) | **DO NOT TOUCH** `D:\careid\doctor_web` |
| **E. Developer 2 (Flutter) Scope**| Mobile doctor app, Mobile patient app | **DO NOT TOUCH** `CAREID_doctor_app`, `CAREID_patient_app` |
| **F. Out-of-Scope Items** | Pharmacy POS, inventory management, dispensing software, external CRM | Strictly excluded from project scope |

---

## 12. Verification Evidence & Test Results

### Live Integration Stack Status:
- `careid-integration-backend`: Healthy on port 3001 (`/api/v1/health` -> 200 OK)
- `careid-integration-postgres`: Healthy on port 5433 (PostgreSQL 16, DB: `careid_integration_db`)
- `careid-integration-admin-web`: Healthy on port 5174 (Vite/Nginx SPA)
- `careid-integration-doctor-web`: Healthy on port 5173 (Vite/Nginx SPA)

### Empirical API Probe Verification:
| Tested Endpoint | Method | Role | Response Status | Observed Data |
|:---|:---:|:---:|:---:|:---|
| `/api/v1/health` | GET | Public | **200 OK** | `{"status":"ok","service":"HVAPI Backend"}` |
| `/api/v1/auth/me` | GET | `SUPER_ADMIN` | **200 OK** | User `bbd2fede-...`, roles: `["SUPER_ADMIN"]` |
| `/api/v1/admin/dashboard/stats` | GET | `SUPER_ADMIN` | **200 OK** | Aggregated patient, doctor, facility counts |
| `/api/v1/admin/users` | GET | `SUPER_ADMIN` | **200 OK** | 12KB user directory payload |
| `/api/v1/admin/patients` | GET | `SUPER_ADMIN` | **200 OK** | 8KB patient directory payload |
| `/api/v1/facilities` | GET | `SUPER_ADMIN` | **200 OK** | 5.8KB healthcare facility roster |
| `/api/v1/admin/doctors` | GET | `SUPER_ADMIN` | **200 OK** | 12.4KB verified doctor profiles |
| `/api/v1/referrals` | GET | `SUPER_ADMIN` | **200 OK** | 13.2KB inter-facility referral records |
| `/api/v1/ocr/dashboard` | GET | `SUPER_ADMIN` | **200 OK** | OCR analytics metrics |
| `/api/v1/admin/audit-logs` | GET | `SUPER_ADMIN` | **200 OK** | 12.3KB audit log trail |
| `/api/v1/cms/policies` | GET | `SUPER_ADMIN` | **200 OK** | Legal CMS policies payload |
| `/api/v1/financing/offers` | GET | `SUPER_ADMIN` | **200 OK** | Financing offers payload |

---

## 13. Recommended Execution Order for Phase B

Upon explicit user approval:
1. **Batch 1 (P0): Authentication Completion**
   - Implement Mobile Number + OTP Login tab in `AdminLogin.tsx`.
2. **Batch 2 (P1): PRD Legal Documents Management**
   - Implement `AdminPrivacyPolicyPage.tsx` and `AdminTermsConditionsPage.tsx`.
3. **Batch 3 (P1): Financial & Clinical Oversight**
   - Implement `AdminFinancingDashboard.tsx` (CR-02).
   - Add Demographic Sub-Breakdown filter widgets to `AdminReportsDashboard.tsx`.
4. **Batch 4 (P2): CMS Expansion & Operations Monitoring**
   - Implement Social Media settings card in `AdminSystemSettingsGeneral.tsx`.
   - Implement `AdminCmsManagement.tsx` (Pages, FAQs, Banners).
   - Implement Slot Utilization & Appointment Volume monitor (CR-03, CR-04).
   - Implement Prescription Pickup Reminder monitor (CR-08).
5. **Batch 5: Regression & End-to-End Verification (Phase C)**
   - Execute full automated test suite, browser route audit, and PostgreSQL persistence checks.

---

> [!IMPORTANT]
> **PHASE A AUDIT COMPLETED — ZERO CODE MODIFICATIONS EXECUTED.**  
> In strict compliance with Goal 001 rules, execution is now paused. Awaiting explicit user review and approval of this gap analysis before proceeding to Phase B implementation.
