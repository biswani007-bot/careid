# CAREID PENDING CLOSURE 007 — REQUIREMENTS TRACEABILITY MATRIX

**Project:** CAREID / HEALTH VAULT 360  
**Phase:** CAREID-MASTER-PENDING-CLOSURE-LIVE-E2E-007  
**References:** `HEALTH VAULT 360.pdf`, `Care ID_ CR Sheet.xlsx` (CR-02 through CR-08)  
**Auditor:** Antigravity Autonomous Integration Agent  

---

## Traceability & Status Matrix

| Req ID | Requirement Description | Owning App | UI Route | Backend Endpoint | PostgreSQL Model | Visible Browser Test | Status | Priority | Remaining Task |
|---|---|---|---|---|---|---|---|---|---|
| **REQ-ADM-01** | Admin Authentication & MFA | Admin Web | `/auth/login` | `POST /api/v1/auth/otp/verify` | `User`, `UserSession` | `B01` | **FULLY VERIFIED** | P0 | None |
| **REQ-ADM-02** | Executive Dashboard | Admin Web | `/admin/dashboard` | `GET /api/v1/admin/dashboard` | `PatientProfile`, `DoctorProfile` | `B02` | **FULLY VERIFIED** | P1 | None |
| **REQ-ADM-03** | Patient Management | Admin Web | `/admin/patients` | `GET /api/v1/admin/patients` | `PatientProfile` | `B03` | **FULLY VERIFIED** | P1 | None |
| **REQ-ADM-04** | Facility Directory & Mgmt | Admin Web | `/admin/facilities` | `GET /api/v1/facilities` | `Facility`, `Department` | `B04` | **FULLY VERIFIED** | P1 | None |
| **REQ-ADM-05** | Doctor Directory & Status | Admin Web | `/admin/doctors` | `GET /api/v1/doctors` | `DoctorProfile` | `B05` | **FULLY VERIFIED** | P1 | None |
| **REQ-ADM-06** | Staff & Role Assignment | Admin Web | `/admin/users` | `GET /api/v1/admin/users` | `User`, `UserRole` | `B06` | **FULLY VERIFIED** | P1 | None |
| **REQ-ADM-07** | Privacy Policy CMS | Admin Web | `/admin/legal/privacy-policy` | `GET /api/v1/cms/privacy-policy` | `CmsDocument` | `B07` | **FULLY VERIFIED** | P2 | None |
| **REQ-ADM-08** | Terms & Conditions CMS | Admin Web | `/admin/legal/terms-conditions` | `GET /api/v1/cms/terms` | `CmsDocument` | `B08` | **FULLY VERIFIED** | P2 | None |
| **REQ-ADM-09** | General & Social Settings | Admin Web | `/admin/settings/general` | `GET /api/v1/settings/general` | `SystemSetting` | `B09` | **FULLY VERIFIED** | P2 | None |
| **REQ-ADM-10** | Informational CMS Pages | Admin Web | `/admin/cms` | `GET /api/v1/cms/pages` | `CmsPage` | `B10` | **FULLY VERIFIED** | P2 | None |
| **REQ-ADM-11** | FAQs Management | Admin Web | `/admin/cms` | `GET /api/v1/cms/faqs` | `CmsFaq` | `B11` | **FULLY VERIFIED** | P2 | None |
| **REQ-ADM-12** | Promotional Banners | Admin Web | `/admin/cms` | `GET /api/v1/cms/banners` | `CmsBanner` | `B12` | **FULLY VERIFIED** | P2 | None |
| **CR-02** | Healthcare Financing Oversight | Admin Web | `/admin/financing` | `GET /api/v1/financing/applications` | `FinancingApplication` | `B13` | **FULLY VERIFIED** | P1 | None |
| **CR-03** | Capacity Monitoring (Internal) | Admin Web | `/admin/operations/capacity` | `GET /api/v1/capacity/overview` | `DoctorScheduleSlot` | `B14` | **FULLY VERIFIED** | P1 | None |
| **CR-03-AI** | AI Slot Recommendations Engine | Admin Web | `/admin/operations/capacity` | N/A (External ML service) | N/A | Evaluated | **DEFERRED** | P3 | External ML/LLM model integration requires separate approval |
| **CR-04** | Appointments Oversight | Admin Web | `/admin/operations/appointments` | `GET /api/v1/appointments` | `Appointment` | `B15` | **FULLY VERIFIED** | P1 | None |
| **CR-05** | Specialist Referral Tracking | Admin Web | `/admin/referrals` | `GET /api/v1/referrals` | `PatientReferral` | `B16` | **FULLY VERIFIED** | P1 | None |
| **CR-06** | EHR Connector Oversight (Internal) | Admin Web | `/admin/settings/integrations` | `GET /api/v1/integrations/ehr` | `EhrConnector` | `B17` | **FULLY VERIFIED** | P2 | None |
| **CR-06-EXT** | External Bidirectional EHR Exchange | Admin Web | `/admin/settings/integrations` | External FHIR/HL7 partner API | N/A | N/A | **BLOCKED** | P3 | External hospital EHR/FHIR endpoints unavailable in sandbox |
| **CR-07** | Office Chat Oversight | Admin Web | `/admin/communication/chat-oversight` | `GET /api/v1/admin/conversations` | `Conversation`, `Message` | `B18` | **FULLY VERIFIED** | P2 | None |
| **CR-08-ADM**| Prescription Pickup Monitoring | Admin Web | `/admin/operations/prescriptions` | `GET /api/v1/prescriptions` | `PrescriptionReminderSchedule` | `B19` | **FULLY VERIFIED** | P1 | None |
| **REQ-ADM-13** | Demographic Reports | Admin Web | `/admin/reports` | `GET /api/v1/reports/demographics` | `PatientProfile` | `B20` | **FULLY VERIFIED** | P2 | None |
| **REQ-ADM-14** | OCR Processing Queue | Admin Web | `/admin/operations/ocr` | `GET /api/v1/ocr/queue` | `OcrDocument` | `B21` | **FULLY VERIFIED** | P2 | None |
| **REQ-DOC-01** | Human Doctor Authentication | Doctor Web | `/auth/login` | `POST /api/v1/auth/otp/verify` | `User`, `DoctorProfile` | `C01` | **FULLY VERIFIED** | P0 | None |
| **REQ-DOC-02** | Veterinary Doctor Workspace | Doctor Web | `/veterinary/dashboard` | `POST /api/v1/auth/otp/verify` | `DoctorProfile` | `C02` | **FULLY VERIFIED** | P1 | None |
| **REQ-DOC-03** | Patient Directory & Search | Doctor Web | `/patients` | `GET /api/v1/doctors/patients` | `PatientProfile` | `C03` | **FULLY VERIFIED** | P1 | None |
| **REQ-DOC-04** | Health Vault Access | Doctor Web | `/patients/:id` | `GET /api/v1/patients/:id` | `MedicalRecord` | `C04` | **FULLY VERIFIED** | P1 | None |
| **REQ-DOC-05** | Clinical Vitals Tracking | Doctor Web | `/patients/:id/vitals` | `GET /api/v1/patients/:id/vitals` | `VitalSign` | `C05` | **FULLY VERIFIED** | P1 | None |
| **REQ-DOC-06** | Medical History & Allergies | Doctor Web | `/patients/:id` | `GET /api/v1/patients/:id` | `PatientProfile` | `C06` | **FULLY VERIFIED** | P1 | None |
| **REQ-DOC-07** | SOAP Clinical Notes | Doctor Web | `/patients/:id` | `GET /api/v1/patients/:id` | `EncounterNote` | `C07` | **FULLY VERIFIED** | P1 | None |
| **REQ-DOC-08** | Electronic Prescriptions | Doctor Web | `/records/prescriptions` | `POST /api/v1/doctors/patients/:id/prescriptions` | `Prescription`, `PrescriptionItem` | `C08` | **FULLY VERIFIED** | P1 | None |
| **REQ-DOC-09** | Allergy & Interaction Screening | Doctor Web | `/records/prescriptions` | `POST /api/v1/prescriptions/check-interactions` | `DrugInteraction` | `C09` | **FULLY VERIFIED** | P1 | None |
| **REQ-DOC-10** | Clinical Prescription PDF Export| Doctor Web | `/patients/:id/export` | `GET /api/v1/prescriptions/:id/preview` | `Prescription` | `C10` | **FULLY VERIFIED** | P2 | None |
| **REQ-DOC-11** | Doctor Consultation Slots | Doctor Web | `/treatment-offers` | `GET /api/v1/treatment-offers` | `DoctorScheduleSlot` | `C11` | **FULLY VERIFIED** | P1 | None |
| **REQ-DOC-12** | Appointment Management | Doctor Web | `/treatment-offers` | `GET /api/v1/treatment-offers` | `Appointment` | `C12` | **FULLY VERIFIED** | P1 | None |
| **REQ-DOC-13** | Referral Dispatch | Doctor Web | `/referrals` | `GET /api/v1/referrals` | `PatientReferral` | `C13` | **FULLY VERIFIED** | P1 | None |
| **REQ-DOC-14** | Office Clinical Chat | Doctor Web | `/chat` | `GET /api/v1/conversations` | `Conversation`, `Message` | `C14` | **FULLY VERIFIED** | P2 | None |
| **REQ-DOC-15** | Quick-Reply Chat Templates | Doctor Web | `/templates` | `GET /api/v1/chat/templates` | `ChatTemplate` | `C15` | **FULLY VERIFIED** | P2 | None |
| **REQ-DOC-16** | Diagnostic Document Viewer | Doctor Web | `/patients/:id/records` | `GET /api/v1/patients/:id/records` | `MedicalAttachment` | `C16` | **FULLY VERIFIED** | P2 | None |
| **REQ-DOC-17** | Veterinary Pet Registry | Doctor Web | `/veterinary/pets` | `GET /api/v1/pets` | `Pet` | `C17` | **FULLY VERIFIED** | P1 | None |
| **CR-08-OCC1**| CR-08 First Reminder Occurrence| Doctor Web | `/records/prescriptions` | Scheduler Loop | `PrescriptionReminderEvent` | `D03` | **FULLY VERIFIED** | P0 | None |
| **CR-08-OCC2**| CR-08 Second Reminder Recurrence| Doctor Web | `/records/prescriptions` | Scheduler Loop | `PrescriptionReminderEvent` | `D04` | **FULLY VERIFIED** | P0 | None |
| **CR-08-COL** | CR-08 Recurrence Stop on Collect| Doctor Web | `/records/prescriptions` | `PATCH /prescriptions/:id/collect`| `PrescriptionReminderSchedule` | `D05` | **FULLY VERIFIED** | P0 | None |
| **CR-08-EXT** | External SMS / FCM Push | Backend | Deferred Option A | External SMS/FCM APIs | N/A | Deferred | **DEFERRED** | P3 | Option A approved; external delivery deferred by client |

---

## Summary Counts

- **Total Requirements Evaluated:** 44
- **FULLY VERIFIED:** 41
- **DEFERRED:** 2 (CR-03 AI recommendations, CR-08 External SMS/Push)
- **BLOCKED (External Dependency):** 1 (CR-06 External Bidirectional EHR Exchange)
- **FAILED:** 0
- **NOT TESTED:** 0
- **All Required Internal In-Scope Workflows:** **100% PASSED**
