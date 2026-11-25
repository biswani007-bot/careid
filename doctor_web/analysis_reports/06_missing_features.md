# CareID Doctor Web — Missing Features & Functional Gaps Audit
**Analysis Date:** November 2026  
**Figma Canvas:** `Doctror_web` (`0:1`)  
**Scope:** Functional Interactivity, UI Completeness, and API Dependencies

---

## 1. Missing Figma Screens (Complete Omissions)

The following 2 screens exist as complete design frames in Figma Canvas `0:1`, but are **NOT implemented** in the codebase and instead render generic `PlaceholderPage` components:

| # | Figma Node ID | Figma Screen Name | Intended Route | Current Implementation in Code |
|---|---------------|-------------------|----------------|--------------------------------|
| 1 | `1:13265` | **Doctor Web Portal - Medical Records (Prescription Builder & SOAP Note Form)** | `/records/new` | Renders `<PlaceholderPage title="Create Clinical Note" ... />` |
| 2 | `1:8548` | **Treatment offer lifecycle (18-Step Interactive Timeline)** | `/treatment-offers` | Renders `<PlaceholderPage title="Treatment Offer Lifecycle Chain" ... />` |

### Detailed Specification of Missing Screen 1: Prescription Builder (`1:13265`)
- **Chief Complaint Field:** Pre-populated with "Hypertension follow-up".
- **Diagnosis Selector:** Multi-select ICD-10 diagnostic coding panel.
- **Current Medications Reconciliation:** Active patient drug list with verification checkboxes.
- **Prescription Builder Form Table:**
  - Medication Name search & select (e.g. Amlodipine)
  - Strength input (e.g. 5mg)
  - Route dropdown (Oral, IV, Topical, Inhalation)
  - Dosage input (e.g. 1 Tablet)
  - Frequency dropdown (Daily [OD], BID, TID, QID, PRN)
  - Duration input (e.g. 30 Days)
  - Dispense Quantity input (e.g. 30)
- **Physician Attestation & Digital Signature:** Final submission action sealing the prescription record.

### Detailed Specification of Missing Screen 2: Treatment Offer Lifecycle (`1:8548`)
- **Patient Banner:** Robert J. Sterling (#8472-9901), Self-Pay / Non-Insured, Age 45 M, Blood Group O Pos (+), Allergies: Penicillin, Clinical Indication: Diagnostic Cardiac Catheterization & Angiogram.
- **Master 18-Step Timeline Rail:** Interactive sequential pipeline showing current status of all 18 clinical stages:
  1. Proposal Formulated
  2. Underwriting & Financing Cleared
  3. Patient Authorization Signed
  4. Clinical Handoff & Pre-Op Clearance
  5. Cath Lab Suite Slot Locked
  6. Appointment Scheduled
  7. Pre-Op Readiness Ratified
  8. Day-of-Procedure Check-In
  9. Surgical Safety Time-Out
  10. Clinical Encounter Induction
  11. Intra-Op Fluoroscopy & Stent Logging
  12. Post-Op Operative Summary Sealed
  13. Post-Op Recovery Handoff Complete
- **Interactive Step Navigation:** Clicking any stage jumps directly to its dedicated workstation.

---

## 2. Incomplete & Non-Functional UI Interactions

### 1. Global Header Search Bar (Dead Input)
- **Location:** `src/components/layout/Header.tsx` (line 47) & `src/components/layout/PatientLayout.tsx` (line 387)
- **Defect:** The search input `<input type="search" placeholder="Search patients, ID, or appointments..." />` has no React `value` binding, no `onChange` listener, no form submission wrapper, and no keyboard Enter handler.
- **Impact:** Users typing in the global search bar receive zero feedback and cannot search across patients or appointments.

### 2. Table Pagination Controls (Static Mockups)
- **Locations:** `PatientDirectoryPage.tsx`, `MedicalRecordsPage.tsx`, `ReferralDashboardPage.tsx`
- **Defect:** Pagination UI elements ("Previous", "Next", "Page 1 of 5") are rendered with static Tailwind classes. Clicking "Next" does not advance table data or paginate results.
- **Impact:** Only the initial 4-5 hardcoded items are ever accessible to clinicians.

### 3. Patient Profile Tabs Delegation
- **Location:** `src/pages/patients/PatientProfilePage.tsx`
- **Defect:** Tabs for "Medical History" and "Vitals & Telemetry" route externally to `/patients/:id/history` and `/patients/:id/vitals`. Both of these routes render `PlaceholderPage`.
- **Impact:** Clinicians cannot review a patient's historical vitals or chronic conditions from the profile cockpit.

### 4. OTP Countdown & Resend Triggers
- **Location:** `src/components/layout/OtpLayout.tsx`
- **Defect:** The "00:28" timer string is static text without a `setInterval` timer. The "Resend OTP" button has no click handler and does not trigger an SMS dispatch or reset the timer.
- **Impact:** The authentication verification simulation lacks standard interactive feedback.

### 5. Quick-Action Consultation & Appointment Triggers
- **Location:** `src/pages/DashboardPage.tsx`
- **Defect:** The "Add New Patient" and "Schedule Appointment" buttons in the dashboard hero banner have empty `onClick` handlers or navigate to placeholder routes.
- **Impact:** Clinicians cannot execute fast scheduling from the dashboard.

### 6. Export & Print Triggers
- **Locations:** `PatientDirectoryPage.tsx`, `LabReportPage.tsx`, `RadiologyViewerPage.tsx`, `MedicalRecordsPage.tsx`
- **Defect:** "Export CSV", "Print Report", and "Download PDF" buttons have no click listeners or window print handlers.

---

## 3. Missing UX States (Empty, Loading, Error)

| Screen / Feature | Missing Loading State | Missing Empty State | Missing Error State |
|------------------|----------------------|---------------------|---------------------|
| **Global Search** | No spinner during search | No dropdown empty state | No search failure alert |
| **Patient Directory** | No table skeleton loader | Covered only partially in 1:745 | No network error retry card |
| **Medical Records** | No document loading skeleton | No empty records state | No file corrupt / load failure state |
| **DICOM Viewer** | No image progressive loading | No unassigned imaging state | No unsupported DICOM format alert |
| **OCR Processing** | State is simulated with timers | N/A | Document mismatch modal exists, but no OCR failure fallback |
| **Referrals Dashboard** | No skeleton rows | No empty incoming referrals state | No referral routing failure notification |
| **Treatment Offers** | No calculation loading states | No zero-offer empty state | No underwriting rejection state |

---

## 4. API-Dependent Functionality (Clear Classification)

To ensure realistic development planning, capabilities are classified into three distinct tiers:

### Tier A: Frontend-Only Fixes (Zero Backend Required)
These items can and should be resolved immediately in the React codebase:
1. Implement missing Prescription Builder screen (`1:13265`) with local state.
2. Implement missing Treatment Offer Lifecycle master timeline (`1:8548`).
3. Connect global search input in Header to filter the Patient Directory and show search suggestions.
4. Implement working client-side table pagination and multi-column sorting.
5. Implement working OTP countdown timer (28s decrement) and resend cooldown.
6. Refactor monolithic OCR page into 4 modular components.
7. Unify shared UI primitives (`Button`, `Input`, `Select`, `Modal`, `Badge`, `Card`, `Spinner`, `Tabs`).
8. Implement React Router code-splitting (`React.lazy`) to reduce bundle size from 1.16 MB.
9. Connect quick-action modal dialogs for "Add New Patient" and "Schedule Appointment".

### Tier B: API-Dependent Features (Mock Service Worker / Backend Required)
These features require simulated API endpoints or a real backend gateway:
1. **Authentication API:** Phone number SMS dispatch, Twilio/AWS SNS OTP delivery, JWT token exchange, refresh token rotation.
2. **Longitudinal EHR Gateway:** FHIR / HL7 patient demographic synchronization and allergy alert registry.
3. **Neural OCR Worker:** Multi-page PDF document ingestion, Tesseract/AWS Textract/Google Cloud Vision entity extraction, and bounding-box normalization.
4. **DICOM PACS Server:** WADO-RS imaging study streaming, multi-frame series loading, and radiologist electronic signing.
5. **Electronic Prescribing (e-Rx):** Surescripts network integration, DEA EPCS two-factor authentication, drug-drug interaction validation.
6. **Underwriting & Insurance Clearinghouse:** Real-time EDI 270/271 eligibility verification and loan financing credit underwriting.

### Tier C: Unverifiable Without Physical Hardware
These clinical capabilities cannot be fully verified without certified hospital equipment:
1. Cath Lab fluoroscopy real-time radiation dose telemetry and active foot-pedal clock sync.
2. Intra-operative physiological patient monitor telemetry (live ECG waveform streaming, invasive arterial BP lines, continuous SpO2 pulse oximetry).
3. RFID / Barcode surgical implant wristband and stent lot verification scanners.

