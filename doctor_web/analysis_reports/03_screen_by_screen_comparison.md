# CareID Doctor Web — Screen-by-Screen Comparison Audit
**Analysis Date:** November 2026  
**Figma Canvas:** `Doctror_web` (`0:1`)  
**Total Figma Screens Audited:** 48  
**Audit Standard:** Strict Code & Design Inspection (No Assumed Implementations)

---

## 1. Status Summary Matrix

| Status Category | Count | Percentage | Definition |
|-----------------|-------|------------|------------|
| **COMPLETED** | 1 | 2.1% | High-fidelity UI, complete interactive states, matching Figma tokens & layout |
| **PARTIALLY IMPLEMENTED** | 44 | 91.7% | UI rendered with substantial visual fidelity, but relies on mock state, missing modals, or unlinked actions |
| **NOT IMPLEMENTED** | 2 | 4.2% | Figma frame exists, but route renders `PlaceholderPage` |
| **DESIGN MISMATCH** | 1 | 2.1% | Screen implemented but diverges noticeably from the Figma layout or structure |

---

## 2. Detailed Screen-by-Screen Audit (All 48 Screens)

### Screen 1: Doctor Web Portal - Refined Secure Login
- **Figma Reference:** Frame `1:2` (1280 × 873) at `(481, 0)`
- **Implementation File:** `src/components/layout/AuthLayout.tsx` + `src/pages/auth/AuthPlaceholder.tsx`
- **Route:** `/auth/login`
- **Status:** **PARTIALLY IMPLEMENTED**
- **Visual Differences:**
  - Layout is rendered across two separate files instead of a dedicated `LoginPage.tsx`.
  - Country selector uses a basic custom dropdown list rather than the native segmented flag selector styled in Figma.
  - Mobile number input lacks proper international phone formatting mask (`(XXX) XXX-XXXX`).
- **Missing Components:** Dedicated `CountryCodePicker` with search; `PhoneInputField`.
- **Missing Interactions:** No client-side phone validation (e.g., minimum 10 digits); submitting does not call an auth service, simply navigates directly to `/auth/verify-otp`.
- **Responsive Issues:** On mobile (<640px), the 480px card padding causes horizontal clipping.
- **Required Improvements:** Create a dedicated `LoginPage.tsx`, implement phone number formatting, integrate actual OTP request handler.

---

### Screen 2: Otp
- **Figma Reference:** Frame `1:79` (1280 × 1024) at `(481, 1046)`
- **Implementation File:** `src/components/layout/OtpLayout.tsx`
- **Route:** `/auth/verify-otp`
- **Status:** **PARTIALLY IMPLEMENTED**
- **Visual Differences:**
  - Footer copy says `© 2026 MedVault AI` instead of `© 2026 Health Vault 360` / `CareID`.
  - Embedded card logo uses a generic image rather than matching the exact vector proportions of `CareIDlogo 1` (`1:153`).
- **Missing Components:** Dedicated auto-focusing numeric PIN input primitive with paste support.
- **Missing Interactions:**
  - The "00:28" timer is hardcoded static text; there is no countdown interval or state.
  - "Resend OTP" button has no click handler or cooldown logic.
  - Verification allows any 6 digits (or even blank inputs) to submit and navigate to `/dashboard`.
- **Responsive Issues:** OTP input boxes collapse on narrow mobile viewports (<360px).
- **Required Improvements:** Implement real countdown timer with `useInterval`, paste event handler for full 6-digit codes, and real OTP verification validation.

---

### Screen 3: Dashboard
- **Figma Reference:** Frame `1:154` (1280 × 1024) at `(481, 2216)`
- **Implementation File:** `src/pages/DashboardPage.tsx`
- **Route:** `/dashboard`
- **Status:** **PARTIALLY IMPLEMENTED**
- **Visual Differences:**
  - Clinician identity in header displays "Dr. Julian Vance" while sidebar profile says "Dr. Clinical Admin".
  - Quick action CTA buttons "Add New Patient" and "Schedule Appointment" do not open modal dialogs.
- **Missing Components:** `AddPatientModal`, `QuickScheduleModal`, `TelemetryAlertPopover`.
- **Missing Interactions:**
  - Action buttons in the schedule table ("End Consult", "Start Consult", "Wait") navigate to hardcoded routes without updating appointment status.
  - Real-time telemetry refresh button has no polling or fetching logic.
- **Responsive Issues:** Schedule table causes horizontal scroll on tablet viewports without a responsive card alternate view.
- **Required Improvements:** Unify clinician identity with `AuthContext`, add quick-action modals, and implement appointment status state transitions.

---

### Screen 4: Patient (Patient Directory)
- **Figma Reference:** Frame `1:6657` (1280 × 1024) at `(481, 3364)`
- **Implementation File:** `src/pages/patients/PatientDirectoryPage.tsx`
- **Route:** `/patients`
- **Status:** **PARTIALLY IMPLEMENTED**
- **Visual Differences:**
  - Table headers match, but status badge pill styles slightly differ in padding and font weight.
- **Missing Components:** `PaginationControls` (Previous, Next, Page Numbers), `PatientFilterDrawer`.
- **Missing Interactions:**
  - Filter dropdowns (Age, Gender, Blood Group) update local state but table pagination controls are static mockups.
  - "Export Directory" button is a no-op with no CSV/PDF export handler.
- **Responsive Issues:** Filter bar wraps awkwardly on screens between 768px and 1024px.
- **Required Improvements:** Connect filters to active patient filtering logic, implement working pagination, and provide working export trigger.

---

### Screen 5: Doctor Web Portal - Refined Search: No Results
- **Figma Reference:** Frame `1:745` (1280 × 1039) at `(1891, 3364)`
- **Implementation File:** `src/pages/patients/PatientDirectoryPage.tsx`
- **Route:** Triggered via query inside `/patients`
- **Status:** **DESIGN MISMATCH**
- **Visual Differences:**
  - Figma Frame `1:745` has a dedicated full-page layout with specific search query chips (`Status: Active`, `Age: 40-60`), a specialized clinical illustration, bulleted search suggestions, and a distinct grouped sidebar.
  - In code, it is rendered as an abbreviated inline ternary block inside the directory table without the Figma layout, query chips, or tip cards.
- **Missing Components:** Dedicated `SearchNoResultsView` component with query chip tags and recommended search parameter list.
- **Missing Interactions:** "Clear Filters" and "Back to Patient Directory" buttons are missing from the current inline table view.
- **Responsive Issues:** Inline container does not scale vertically to fill viewport height.
- **Required Improvements:** Extract and build dedicated `SearchNoResultsView` matching Figma frame `1:745`.

---

### Screen 6: Doctor Web Portal - Grouped Navigation (Patient Profile)
- **Figma Reference:** Frame `1:473` (1280 × 1024) at `(472, 4892)`
- **Implementation File:** `src/pages/patients/PatientProfilePage.tsx`
- **Route:** `/patients/:id`
- **Status:** **PARTIALLY IMPLEMENTED**
- **Visual Differences:**
  - Biometrics banner matches Figma (O+, Dr. Julian Vance, 120/80 mmHg, 72 bpm).
  - Navigation tabs (Overview, Medical History, Vitals, Records) are linked to separate routes rather than rendering tab panels within the page context.
- **Missing Components:** In-page `TabsContent` for Medical History and Continuous Vitals.
- **Missing Interactions:** Clicking "Medical History" or "Vitals" navigates to routes `/patients/:id/history` and `/patients/:id/vitals`, which render `PlaceholderPage`!
- **Responsive Issues:** Profile header metrics wrap into 4 uneven rows on viewports <1100px.
- **Required Improvements:** Inline the tab views into `PatientProfilePage` to eliminate placeholder routes.

---

### Screen 7: Care ID Doctor - Financing Options & Comparison
- **Figma Reference:** Frame `1:5316` (1280 × 1583.5) at `(3112, 4892)`
- **Implementation File:** `src/pages/financing/InsuranceFinancingHubPage.tsx`
- **Route:** `/patients/:id/financing`
- **Status:** **COMPLETED**
- **Visual Differences:** Negligible. High-fidelity match for 3 loan tiers, down-payment sliders, and underwriting comparison cards.
- **Missing Components:** None.
- **Missing Interactions:** Ratifying financing triggers a simulated client toast without dispatching to backend underwriting API.
- **Responsive Issues:** None identified.
- **Required Improvements:** Connect loan selection to treatment offer creation context.

---

### Screen 8: Doctor Web Portal - Medical Records (Master Registry)
- **Figma Reference:** Frame `1:12893` (1576 × 1060) at `(0, 13364)`
- **Implementation File:** `src/pages/records/MedicalRecordsPage.tsx`
- **Route:** `/records`
- **Status:** **PARTIALLY IMPLEMENTED**
- **Visual Differences:**
  - Layout is constrained to 1440px in code, whereas Figma specifies a 1576px wide canvas.
  - Specialty tabs (Medical, Dental, Vision) are rendered, but dental and vision records show generic placeholder cards.
- **Missing Components:** `FacilityMultiSelect`, `DateRangePickerPopover`.
- **Missing Interactions:**
  - "New Clinical Record" CTA links to `/records/new`, which renders `PlaceholderPage`!
- **Responsive Issues:** 1576px table cuts off on standard 1280px laptops without horizontal scroll indicators.
- **Required Improvements:** Link "New Clinical Record" to the implemented form from frame `1:13265`.

---

### Screen 9: Doctor Web Portal - Medical Records (Prescription Builder & SOAP Note Form)
- **Figma Reference:** Frame `1:13265` (1576 × 1060) at `(1772, 13364)`
- **Implementation File:** **NONE** (Route `/records/new` renders `src/pages/PlaceholderPage.tsx`)
- **Route:** `/records/new`
- **Status:** **NOT IMPLEMENTED**
- **Visual Differences:** Total absence. In code, this screen is an unstyled `PlaceholderPage` with title "Create Clinical Note".
- **Missing Components:**
  - Chief Complaint text input ("Hypertension follow-up")
  - Structured SOAP diagnosis selector
  - Current medications reconciliation list
  - Prescription Builder table (Medication Name, Strength, Route, Dosage, Frequency, Duration, Quantity)
  - Electronic prescriber digital signature block
- **Missing Interactions:** All form input, medication search, drug interaction check, and save record actions.
- **Responsive Issues:** N/A (not implemented).
- **Required Improvements:** Build `ClinicalNoteCreatePage.tsx` implementing Figma frame `1:13265`.

---

### Screen 10: Doctor Web Portal - Refined Navigation (Medical Records)
- **Figma Reference:** Frame `1:6023` (1280 × 1024) at `(439, 9812)`
- **Implementation File:** `src/pages/records/RecordDetailPage.tsx`
- **Route:** `/records/:id`
- **Status:** **PARTIALLY IMPLEMENTED**
- **Visual Differences:** Matches record timeline and clinical notes structure.
- **Missing Components:** Full-screen modal trigger for embedded documents.
- **Missing Interactions:** "Amend Record" button is non-functional.
- **Responsive Issues:** Two-column split collapses to vertical stack on tablets.
- **Required Improvements:** Add record amendment interaction and document zoom modal.

---

### Screen 11: Doctor Web Portal - Document Viewer (Refined)
- **Figma Reference:** Frame `1:5719` (1280 × 1024) at `(2007, 9812)`
- **Implementation File:** `src/pages/records/RecordDetailPage.tsx` (inline viewer)
- **Route:** Integrated into `/records/:id`
- **Status:** **PARTIALLY IMPLEMENTED**
- **Visual Differences:** Figma specifies a dedicated full-screen workstation with toolbar (Zoom, Pan, Rotate, Invert, Download, Print). Code implements a scaled static image inside the detail page.
- **Missing Components:** `DocumentViewerModal`, `DocumentControlToolbar`.
- **Missing Interactions:** Pan/zoom controls, page navigation for multi-page PDFs.
- **Responsive Issues:** Full document cannot be inspected on smaller screens.
- **Required Improvements:** Create dedicated `DocumentViewerModal.tsx` matching frame `1:5719`.

---

### Screen 12: Doctor Web Portal - Prescription & Clinical History (Refined)
- **Figma Reference:** Frame `1:6396` (1280 × 1024) at `(3367, 9812)`
- **Implementation File:** `src/pages/records/PrescriptionsPage.tsx`
- **Route:** `/records/prescriptions`
- **Status:** **PARTIALLY IMPLEMENTED**
- **Visual Differences:** Active prescription cards match visual layout.
- **Missing Components:** `RefillRequestModal`, `DiscontinueMedicationDialog`.
- **Missing Interactions:** "Refill Authorization" and "Discontinue" buttons trigger mock state only.
- **Responsive Issues:** Card grid wraps unevenly on tablet widths.
- **Required Improvements:** Implement working medication discontinue and refill authorization modals.

---

### Screen 13: Doctor Web Portal - Grouped Navigation (Radiology Review)
- **Figma Reference:** Frame `1:882` (1280 × 1024) at `(4734, 9812)`
- **Implementation File:** `src/pages/records/RadiologyViewerPage.tsx`
- **Route:** `/records/imaging`
- **Status:** **PARTIALLY IMPLEMENTED**
- **Visual Differences:** Radiology index with grouped sidebar navigation.
- **Missing Components:** DICOM series list drawer.
- **Missing Interactions:** Selecting a study from the list does not update active DICOM viewport.
- **Responsive Issues:** Viewer toolbar buttons overflow on viewports <1024px.
- **Required Improvements:** Connect study selector to active image canvas.

---

### Screen 14: Doctor Web Portal - Laboratory Report Viewer
- **Figma Reference:** Frame `1:2908` (1280 × 1024) at `(1624, 18202)`
- **Implementation File:** `src/pages/records/LabReportPage.tsx`
- **Route:** `/records/labs`, `/records/labs/:id`
- **Status:** **PARTIALLY IMPLEMENTED**
- **Visual Differences:** High fidelity table for hematology and CMP panels with out-of-range red flags.
- **Missing Components:** Historical trends modal (graphing lab values over time).
- **Missing Interactions:** Print report and PDF download buttons are mock actions.
- **Responsive Issues:** Table scrolls horizontally on mobile.
- **Required Improvements:** Add window print stylesheet and download PDF handler.

---

### Screen 15: Doctor Web Portal - Imaging Report Viewer
- **Figma Reference:** Frame `1:3203` (1280 × 1024) at `(2936, 18202)`
- **Implementation File:** `src/pages/records/RadiologyViewerPage.tsx`
- **Route:** `/records/imaging/:id`
- **Status:** **PARTIALLY IMPLEMENTED**
- **Visual Differences:** Fluoroscopy / X-ray viewer layout with findings summary.
- **Missing Components:** Window level slider, measurement calipers.
- **Missing Interactions:** Real image manipulation (brightness, contrast, zoom).
- **Responsive Issues:** Aspect ratio of DICOM frame distorts on non-16:9 viewports.
- **Required Improvements:** Implement CSS filters for brightness/contrast sliders.

---

### Screens 16-19: Neural OCR Ingestion Pipeline
- **Figma References:**
  - `1:1167` Upload Medical Record - Initial State (1280 × 1024)
  - `1:1088` OCR Processing - Data Extraction (1280 × 1024)
  - `1:1325` OCR Review & Field Verification (1280 × 1226)
  - `1:1513` Upload Success - Record Saved (1280 × 1024)
- **Implementation File:** `src/pages/ocr/MedicalRecordUploadPage.tsx` (Single monolithic 1516-line file)
- **Routes:** `/records/upload`, `/ocr/upload`, `/records/ocr/review`, `/records/ocr/success`
- **Status:** **PARTIALLY IMPLEMENTED**
- **Visual Differences:**
  - All 4 Figma frames are simulated sequentially within a single component using state timers (`upload` -> `processing` -> `review` -> `success`).
  - Field verification view (`1:1325`) reproduces bounding box overlays and confidence scores.
- **Missing Components:** Real file upload parser; integration with live OCR worker.
- **Missing Interactions:**
  - Drag and drop does not accept external PDF files (only triggers internal demo document switch).
  - Editing extracted fields updates local state only; changes are not committed to global patient record.
- **Responsive Issues:** Bounding box SVG coordinates lose alignment when image scales down on smaller viewports.
- **Required Improvements:** Refactor monolithic file into 4 distinct modular components; calculate SVG bounding box viewBox relative to native image dimensions.

---

### Screens 20-24: Specialist Referrals Network
- **Figma References:**
  - `1:1535` Referral Dashboard (1280 × 1082)
  - `1:1829` Create Referral (1280 × 1024)
  - `1:2072` Referral Details (1280 × 1178)
  - `1:2343` Incoming Referral Review (1280 × 1024)
  - `1:2559` Referral Success (1280 × 1024)
- **Implementation Files:**
  - `src/pages/referrals/ReferralDashboardPage.tsx`
  - `src/pages/referrals/CreateReferralPage.tsx`
  - `src/pages/referrals/ReferralDetailsPage.tsx`
  - `src/pages/referrals/IncomingReferralReviewPage.tsx`
  - `src/pages/referrals/ReferralSuccessPage.tsx`
- **Routes:** `/referrals`, `/referrals/new`, `/referrals/:id`, `/referrals/incoming/:id`, `/referrals/success`
- **Status:** **PARTIALLY IMPLEMENTED**
- **Visual Differences:** Visually faithful across all 5 frames.
- **Missing Components:** Specialist directory search popover; secure file attachment drawer.
- **Missing Interactions:**
  - In `CreateReferralPage`, submitting navigates to `/referrals/success` but does not append to referral list.
  - In `IncomingReferralReviewPage`, clicking "Accept Referral" triggers local toast without updating referral status in dashboard.
- **Responsive Issues:** Summary panels stack awkwardly on narrow desktop widths.
- **Required Improvements:** Connect referral dispatch and acceptance actions to a shared referrals state store.

---

### Screens 25-26: Clinical Reports & Critical Alerts
- **Figma References:**
  - `1:2590` Reports Dashboard (1280 × 1024)
  - `1:3732` Critical Report Review (1280 × 1024)
- **Implementation Files:**
  - `src/pages/reports/ReportsDashboardPage.tsx`
  - `src/pages/reports/CriticalReportReviewPage.tsx`
- **Routes:** `/reports`, `/reports/critical`, `/reports/critical/:id`
- **Status:** **PARTIALLY IMPLEMENTED**
- **Visual Differences:** Red high-urgency alert banner matches Figma styling.
- **Missing Components:** Escalation workflow dialog; clinical consultation scheduling modal.
- **Missing Interactions:** Clicking "Acknowledge & Sign" dismisses the banner locally without audit logging.
- **Responsive Issues:** Table on dashboard causes overflow on tablet screens.
- **Required Improvements:** Connect critical alert acknowledgment to doctor profile audit log.

---

### Screens 27-31: Notification Center & Clinician Settings
- **Figma References:**
  - `1:3950` Notification Center (1348 × 1082)
  - `1:4281` Professional Profile (1280 × 1080)
  - `1:4531` Account & Security Settings (1280 × 1024)
  - `1:4834` Notification Preferences (1280 × 1024)
  - `1:5113` Support & Help Center (1280 × 1024)
- **Implementation Files:**
  - `src/pages/notifications/NotificationCenterPage.tsx`
  - `src/pages/settings/ProfessionalProfilePage.tsx`
  - `src/pages/settings/AccountSecurityPage.tsx`
  - `src/pages/settings/NotificationPreferencesPage.tsx`
  - `src/pages/settings/SupportCenterPage.tsx`
- **Routes:** `/notifications`, `/settings`, `/settings/security`, `/settings/notifications`, `/settings/support`
- **Status:** **PARTIALLY IMPLEMENTED**
- **Visual Differences:** Clean visual alignment with Figma designs.
- **Missing Components:** 2FA QR code scanner modal; password update confirmation modal.
- **Missing Interactions:** Profile editing saves to `AuthContext` in memory only; refreshing resets data.
- **Responsive Issues:** 1348px width of Notification Center causes slight horizontal scroll on 1280px viewports.
- **Required Improvements:** Constrain notification center max-width to 1280px and persist profile edits to `localStorage`.

---

### Screen 32: Create Treatment Offer
- **Figma Reference:** Frame `1:7011` (1280 × 2160.5) at `(4547, 4892)`
- **Implementation File:** `src/pages/treatment-offers/TreatmentOfferCreatePage.tsx`
- **Route:** `/treatment-offers/new`, `/treatment-offers/new/step-1` to `step-5`
- **Status:** **PARTIALLY IMPLEMENTED**
- **Visual Differences:** 5-step wizard with CPT selection, clinical indications, pricing breakdown, and prompt-payment discount calculator.
- **Missing Components:** CPT Code Search dropdown.
- **Missing Interactions:** Steps do not validate required fields before enabling next button.
- **Responsive Issues:** 2160px vertical layout requires heavy scrolling; sticky summary bar needed.
- **Required Improvements:** Add field validation before allowing step advancement.

---

### Screen 33: Care ID Doctor - Review & Send Treatment Offer
- **Figma Reference:** Frame `1:7538` (1280 × 2014) at `(5887, 4892)`
- **Implementation File:** `src/pages/treatment-offers/TreatmentOfferReviewPage.tsx`
- **Route:** `/treatment-offers/:id/review`
- **Status:** **PARTIALLY IMPLEMENTED**
- **Visual Differences:** Full patient offer preview with discount calculation.
- **Missing Components:** Digital physician signature canvas.
- **Missing Interactions:** "Send Offer to Patient" navigates to `/treatment-offers/:id/sent` without real API dispatch.
- **Responsive Issues:** Breakdown cards stretch awkwardly on ultra-wide screens.
- **Required Improvements:** Integrate digital signature component.

---

### Screen 34: offer status
- **Figma Reference:** Frame `1:7986` (1280 × 2167) at `(7225, 4892)`
- **Implementation File:** `src/pages/treatment-offers/TreatmentOfferStatusPage.tsx`
- **Route:** `/treatment-offers/:id/status`, `/treatment-offers/:id/sent`
- **Status:** **PARTIALLY IMPLEMENTED**
- **Visual Differences:** Real-time event log with timestamps (Dispatched, Delivered, Viewed by Patient).
- **Missing Components:** Resend notification modal.
- **Missing Interactions:** "Simulate Patient Acceptance" button is a manual client trigger.
- **Responsive Issues:** None.
- **Required Improvements:** Add automated polling or websocket simulation.

---

### Screen 35: Treatment offer lifecycle (Master 18-Step Pipeline)
- **Figma Reference:** Frame `1:8548` (1280 × 1734.5) at `(8528, 4892)`
- **Implementation File:** **NONE** (Route `/treatment-offers` renders `src/pages/PlaceholderPage.tsx`)
- **Route:** `/treatment-offers`
- **Status:** **NOT IMPLEMENTED**
- **Visual Differences:** Complete omission. In code, `/treatment-offers` renders a generic stub card: `"Treatment Offer Lifecycle Chain — 18-step clinical procedure & financing workflow."`
- **Missing Components:**
  - Patient header summary banner (`Robert J. Sterling #8472-9901`)
  - 18-step interactive lifecycle progress rail
  - Direct navigation triggers for every procedure milestone (Cleared, Scheduled, Pre-Op, Cath Lab, Post-Op)
  - Dynamic status pills (Completed, In Progress, Pending Clearance)
- **Missing Interactions:** Clicking any milestone step to jump to its corresponding workstation.
- **Responsive Issues:** N/A (not implemented).
- **Required Improvements:** Implement dedicated `TreatmentOfferLifecyclePage.tsx` based on Figma frame `1:8548`.

---

### Screens 36-42: Procedure Clearance, Scheduling & Pre-Op Ops
- **Figma References:**
  - `1:9001` Accepted Treatment Offer (1280 × 2111.9)
  - `1:9573` Treatment Cleared to Proceed - Clinical Handoff (1280 × 3025)
  - `1:10206` Schedule Clinical Slot (1280 × 2050)
  - `1:10786` Slot Confirmation & Final Review (1280 × 2614)
  - `1:11274` Procedure Scheduled Successfully (1280 × 2393)
  - `1:11774` Scheduled Procedure & Appointment Details (1280 × 2360.75)
  - `1:12355` Pre-Procedure Readiness Checklist (1280 × 3369)
- **Implementation Files:**
  - `src/pages/treatment-offers/TreatmentOfferAcceptedPage.tsx`
  - `src/pages/treatment-offers/ClinicalHandoffPage.tsx`
  - `src/pages/treatment-offers/ProcedureSchedulingPage.tsx` (handles 1:10206, 1:10786, 1:11274)
  - `src/pages/treatment-offers/AppointmentDetailsPage.tsx`
  - `src/pages/treatment-offers/PreOpReadinessPage.tsx`
- **Routes:** `/treatment-offers/:id/accepted`, `/clearance`, `/schedule/*`, `/appointment`, `/pre-op`
- **Status:** **PARTIALLY IMPLEMENTED**
- **Visual Differences:** Exceptional visual fidelity. Procedure slots, CPT codes, calendar pickers, and checklist items match Figma.
- **Missing Components:** Room conflict alert popover; anesthesia provider selector.
- **Missing Interactions:**
  - In `ProcedureSchedulingPage`, selected date and time are stored in local state; reloading resets to defaults.
  - In `PreOpReadinessPage`, checking required lab clearances updates checkboxes locally but does not persist to patient record.
- **Responsive Issues:** Multi-section vertical pages (up to 3369px) require a floating "Back to Top" or quick jump anchor menu.
- **Required Improvements:** Persist scheduling selections in shared context; add jump navigation for 3369px checklist.

---

### Screens 43-48: Day-of-Procedure & Cath Lab Surgical Cockpit
- **Figma References:**
  - `1:13596` Day-of-Procedure Check-In (1280 × 1746.5)
  - `1:14096` Patient & Clinical Safety Verification (1280 × 1840.5)
  - `1:14597` Start Clinical Encounter (1280 × 1584.5)
  - `1:15031` Active Procedure Documentation (1280 × 1759)
  - `1:15586` Post-Procedure Summary (1280 × 1922.5)
  - `1:16047` Encounter Completed (1280 × 1696.75)
- **Implementation Files:**
  - `src/pages/treatment-offers/DayOfCheckinPage.tsx`
  - `src/pages/cath-lab/CathLabSafetyCheckinPage.tsx`
  - `src/pages/cath-lab/StartClinicalEncounterPage.tsx`
  - `src/pages/cath-lab/ActiveProcedureDocumentationPage.tsx`
  - `src/pages/cath-lab/PostProcedureSummaryPage.tsx`
  - `src/pages/cath-lab/EncounterCompletedPage.tsx`
- **Routes:** `/treatment-offers/:id/check-in`, `/cath-lab-safety`, `/encounter/start`, `/in-progress`, `/post-op`, `/completed`
- **Status:** **PARTIALLY IMPLEMENTED**
- **Visual Differences:** Implemented as high-focus workstation views. Fluoroscopy time clocks, hemodynamic monitors, implant lot logs, and surgical time-out verification checkboxes closely replicate Figma.
- **Missing Components:**
  - Live physiological telemetry streamer (ECG/SpO2/BP graph)
  - Stent / Balloon barcode scanner interface
- **Missing Interactions:**
  - Fluoroscopy timer is static or locally incremented without real device interface.
  - Completing encounter navigates to `/treatment-offers/:id/completed` but does not update the patient's longitudinal EHR.
- **Responsive Issues:** Full-screen Cath Lab views assume desktop resolution (1280px+); unreadable on mobile devices.
- **Required Improvements:** Add responsive breakpoint warnings if accessed on sub-desktop screens; persist completed surgical note into Medical Records.

