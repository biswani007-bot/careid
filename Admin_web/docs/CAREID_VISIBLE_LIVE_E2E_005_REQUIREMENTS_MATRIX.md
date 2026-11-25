# CAREID VISIBLE LIVE E2E 005 — REQUIREMENTS TRACEABILITY MATRIX

**Project:** CAREID / HEALTH VAULT 360  
**Phase:** CAREID-MASTER-VISIBLE-LIVE-E2E-005  
**Audit Scope:** Original PRD/FSD (`HEALTH VAULT 360.pdf`) & Change Requests CR-02 through CR-08 (`Care ID_ CR Sheet.xlsx`)  
**Status Date:** November 23, 2026  

---

## 1. Traceability Matrix Structure

Each approved requirement is tracked from specification to implementation, runtime verification, and final acceptance status:
- **FULLY VERIFIED:** Complete approved end-to-end workflow executed and verified live in graphical browser UI, Backend API, and PostgreSQL.
- **PARTIALLY VERIFIED:** Workflow verified in code and integration environment, but full recurring or continuous cycle requires external test harness.
- **DEFERRED:** Explicitly deferred by client mandate (Option A decision).
- **BLOCKED:** Blocked by external third-party infrastructure (e.g. partner hospital network).

---

## 2. Comprehensive Requirements Matrix

| Req ID | PRD / CR Ref | Responsible Application | Expected Behavior | UI Route / Component | Backend API | Database Entity | Live Evidence | Current Status | Priority | Owning Developer | Acceptance Criteria |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **REQ-ADM-01** | PRD §4.4.1 | Admin Web | Multi-facility dashboard with patient, doctor, and facility metrics | `/admin/dashboard` | `/api/v1/admin/dashboard` | `facilities`, `users`, `patient_profiles` | `b02_01_dashboard_metrics.png` | **FULLY VERIFIED** | P1 | Dev 1 (Admin Web) | KPI counts match DB |
| **REQ-ADM-02** | PRD §4.4.2 | Admin Web | Searchable directory of patient records with status toggles | `/admin/patients` | `/api/v1/patients` | `patient_profiles` | `b03_01_patient_directory.png` | **FULLY VERIFIED** | P1 | Dev 1 (Admin Web) | Real-time search & details |
| **REQ-ADM-03** | PRD §4.4.3 | Admin Web | Facility directory with branch, department, and status mapping | `/admin/facilities` | `/api/v1/facilities` | `facilities`, `departments` | `b04_01_facility_directory.png` | **FULLY VERIFIED** | P1 | Dev 1 (Admin Web) | 9 facilities listed & active |
| **REQ-ADM-04** | PRD §4.4.4 | Admin Web | Doctor credentialing, registration review, and status control | `/admin/doctors` | `/api/v1/doctors` | `doctor_profiles` | `b05_01_doctor_directory.png` | **FULLY VERIFIED** | P1 | Dev 1 (Admin Web) | 18 doctors verified |
| **REQ-ADM-05** | PRD §4.4.5 | Admin Web | User account management and role-based access assignment | `/admin/users` | `/api/v1/users` | `users` | `b06_01_user_directory.png` | **FULLY VERIFIED** | P1 | Dev 1 (Admin Web) | 39 accounts verified |
| **REQ-ADM-06** | PRD §4.4.6 | Admin Web | Markdown-based Privacy Policy CMS with version publishing | `/admin/legal/privacy-policy` | `/api/v1/cms/legal/privacy` | `cms_documents` | `b07_01_privacy_policy.png` | **FULLY VERIFIED** | P2 | Dev 1 (Admin Web) | Live editor and preview |
| **REQ-ADM-07** | PRD §4.4.7 | Admin Web | Terms & Conditions editor with governance versioning | `/admin/legal/terms-conditions` | `/api/v1/cms/legal/terms` | `cms_documents` | `b08_01_terms_conditions.png` | **FULLY VERIFIED** | P2 | Dev 1 (Admin Web) | Live editor and publish |
| **REQ-ADM-08** | PRD §4.4.9 | Admin Web | Platform configuration and social media settings | `/admin/settings/general` | `/api/v1/system-settings` | `system_settings` | `b09_01_settings_general.png` | **FULLY VERIFIED** | P2 | Dev 1 (Admin Web) | Settings persisted |
| **REQ-ADM-09** | PRD §4.4.10 | Admin Web | Dynamic CMS management for pages, FAQs, and banners | `/admin/cms` | `/api/v1/cms` | `cms_pages`, `cms_faqs`, `cms_banners` | `b10_01_cms_pages.png` | **FULLY VERIFIED** | P2 | Dev 1 (Admin Web) | Tabs & CRUD functional |
| **REQ-ADM-10** | PRD §4.4.12 | Admin Web | Demographic analytics, cohort segmentation, regional reports | `/admin/reports` | `/api/v1/reports/demographics` | `patient_profiles` | `b20_01_demographic_reports.png` | **FULLY VERIFIED** | P2 | Dev 1 (Admin Web) | Charts render accurately |
| **REQ-ADM-11** | CR-05 | Admin Web | OCR extraction processing queue and validation workspace | `/admin/operations/ocr` | `/api/v1/ocr/queue` | `ocr_documents` | `b21_01_ocr_queue.png` | **FULLY VERIFIED** | P2 | Dev 1 (Admin Web) | Document queue loaded |
| **REQ-DOC-01** | PRD §4.1 | Doctor Web | Clinician authentication, workspace routing, greeting | `/dashboard` | `/api/v1/auth/me`, `/doctors/me` | `users`, `doctor_profiles` | `c01_02_human_doctor_dashboard.png` | **FULLY VERIFIED** | P1 | Dev 1 (Doctor Web) | Doctor profile loaded |
| **REQ-DOC-02** | PRD §4.2.2 | Doctor Web | Patient search, demographic cards, clinical overview | `/patients` | `/api/v1/patients` | `patient_profiles` | `c03_01_patient_directory.png` | **FULLY VERIFIED** | P1 | Dev 1 (Doctor Web) | Directory active |
| **REQ-DOC-03** | PRD §4.2.3 | Doctor Web | Patient Health Vault, diagnoses, allergies, encounter timeline | `/patients/:id` | `/api/v1/patients/:id/vault` | `patient_profiles`, `medical_records` | `c04_01_health_vault_patient.png` | **FULLY VERIFIED** | P1 | Dev 1 (Doctor Web) | Vault data displayed |
| **REQ-DOC-04** | PRD §4.2.4 | Doctor Web | Vitals graphing (BP, HR, BMI), SOAP clinical notes | `/patients/:id/vitals` | `/api/v1/patients/:id/vitals` | `vitals_records` | `c05_01_patient_vitals.png` | **FULLY VERIFIED** | P1 | Dev 1 (Doctor Web) | Charts & vitals active |
| **REQ-DOC-05** | PRD §4.2.5 | Doctor Web | Prescription authoring, medication search, allergy conflict screening | `/patients/:id/prescriptions` | `/api/v1/prescriptions` | `prescriptions` | `c08_01_prescriptions_list.png` | **FULLY VERIFIED** | P1 | Dev 1 (Doctor Web) | Allergy screening active |
| **REQ-DOC-06** | PRD §4.2.6 | Doctor Web | Client-side formatted PDF clinical export generation | `/patients/:id/export` | `/api/v1/patients/:id/export` | Client-side Canvas/PDF | `c09_01_prescription_export.png` | **FULLY VERIFIED** | P2 | Dev 1 (Doctor Web) | Redacted PDF generated |
| **REQ-DOC-07** | PRD §4.5 | Doctor Web | Veterinary workspace isolation, pet registry, vaccinations | `/veterinary/dashboard` | `/api/v1/pets` | `pets`, `pet_vaccinations` | `c16_01_veterinary_pet_records.png` | **FULLY VERIFIED** | P1 | Dev 1 (Doctor Web) | Domain isolation enforced |
| **REQ-CR-02** | CR-02 | Admin & Doctor | Healthcare financing applications, underwriting, offer status | `/admin/financing`, `/financing` | `/api/v1/financing/applications` | `financing_applications` | `b13_01_financing_dashboard.png` | **FULLY VERIFIED** | P1 | Dev 1 (Shared) | Applications tracked |
| **REQ-CR-03** | CR-03 | Admin & Doctor | Doctor rostering, AI capacity monitoring, vacant slot utilization | `/admin/operations/capacity` | `/api/v1/doctors/schedule` | `doctor_schedule_slots` | `b14_01_capacity_monitoring.png` | **FULLY VERIFIED** | P1 | Dev 1 (Shared) | Capacity grid active |
| **REQ-CR-04** | CR-04 | Admin & Doctor | Consultation booking feeds, department volume monitoring | `/admin/operations/appointments` | `/api/v1/appointments` | `appointments` | `b15_01_appointment_monitoring.png` | **FULLY VERIFIED** | P1 | Dev 1 (Shared) | Booking state synced |
| **REQ-CR-05** | CR-05 | Admin & Doctor | Specialist referral dispatch, inter-facility tracking, escalation | `/admin/referrals`, `/referrals` | `/api/v1/referrals` | `patient_referrals` | `b16_01_referrals_dashboard.png` | **FULLY VERIFIED** | P1 | Dev 1 (Shared) | Referral hub active |
| **REQ-CR-06** | CR-06 | Admin & Doctor | External hospital EHR connectors, audit logs, synchronization | `/admin/settings/integrations`, `/settings/ehr` | `/api/v1/integrations/ehr` | `ehr_integrations` | `b17_01_ehr_integrations.png` | **BLOCKED (EXTERNAL)** | P2 | DevOps / External | Connector UI verified; external EHR partner credentials awaited |
| **REQ-CR-07** | CR-07 | Admin & Doctor | Office chat messaging console, clinician quick reply templates | `/admin/communication/chat-oversight`, `/chat`, `/templates` | `/api/v1/chat` | `conversations`, `direct_messages` | `c13_01_office_chat_console.png`<br>`c14_01_chat_templates.png` | **FULLY VERIFIED** | P1 | Dev 1 (Shared) | Two-way chat & templates active |
| **REQ-CR-08** | CR-08 | Admin & Doctor | Internal recurring prescription pickup reminder engine & collection cancellation | `/admin/operations/prescriptions` | `/api/v1/prescriptions/:id/reminder`, `/collect` | `prescription_reminder_schedules`, `prescription_reminder_events`, `notifications` | `b19_01_pickup_monitoring.png` | **FULLY VERIFIED (OPTION A)** | P1 | Dev 1 (Backend/Web) | Internal engine 100% operational |
| **REQ-CR-08-EXT** | CR-08 | Backend/Mobile | External carrier SMS (Twilio) and Push (FCM) delivery | N/A | External carrier APIs | N/A | Client Option A Decision | **DEFERRED (OPTION A)** | P3 | Backend / Mobile | Deferred by client mandate |
