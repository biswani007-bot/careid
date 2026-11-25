# CAREID DOCTOR WEB — CATH LAB SCOPE FORENSIC VERIFICATION REPORT

**Document ID:** CAREID-REPORT-DOCWEB-002-CATHLAB  
**Date:** November 21, 2026  
**Auditor:** Antigravity Senior Principal Systems & Regulatory Compliance Auditor  
**Project:** CAREID — HEALTH VAULT 360  
**Master Goal:** CAREID-MASTER-DOCTOR-WEB-002  
**Target:** Cath Lab & Interventional Cardiology Subsystem  
**Authorization Status:** **PROPOSED BATCH 4 SCOPE REJECTED / ON HOLD**  

---

## 1. Executive Summary

This forensic verification report examines the catheterization laboratory ("Cath Lab") and specialized cardiac procedural documentation subsystem implemented within the CareID codebase.

The previous engineering proposal for Batch 4 included:
- Active intra-operative procedural documentation
- Intra-operative clinical notes
- WHO Cath Lab surgical safety checklists and holds
- Radiation dosimetry & fluoroscopy telemetry ingestion

These proposed features were **not approved** by the client. This report provides an exhaustive, evidence-based forensic investigation tracing the origin of Cath Lab across the PRD, the CR Sheet, the Figma prototypes, and the codebase to determine its true contractual and architectural classification.

---

## 2. Authoritative Document Forensic Review

### 2.1 Examination of `HEALTH VAULT 360.pdf` (PRD, FSD, Data Architecture, API Specs)
- **Methodology**: Automated text extraction and keyword scanning across all 118 pages of the primary contract document.
- **Search Terms**: `cath`, `catheter`, `catheterization`, `fluoroscopy`, `dosimetry`, `intra-operative`, `angioplasty`, `stent`, `pci`.
- **Findings**:
  * **Zero occurrences** (0 hits) across all 118 pages.
  * The PRD explicitly defines CareID as a **personal digital health vault** enabling patients to carry their health cards in Apple/Google Wallet and share medical records with outpatient doctors and approved facilities via QR codes.
  * In Section 4.2 ("Doctor Application", p. 5, 18), the required clinical actions are: *Scan QR Code, View Patient Data, Edit Symptoms, Edit Allergies, Edit Prescriptions, Upload Medical Multimedia Files*.
  * No surgical suite, operative time-out, or interventional cardiology workflows are mentioned anywhere in the contract PRD.

### 2.2 Examination of `Care ID_ CR Sheet.xlsx` (Client Change Requests)
- **Methodology**: XML extraction of all rows across the workbook authored by Dr. Richard.
- **Change Requests Examined**:
  * `CR-02`: Insurance & Treatment Financing (Get Insurance, Treatment Financing, View/Make Offer, Cash Discounts).
  * `CR-03`: AI-Enabled Slot Management (Vacant/Cancelled slot identification).
  * `CR-04`: Appointment Booking / Search Doctors & Facility.
  * `CR-05`: Referral Management (Doctor-to-Doctor referrals).
  * `CR-06`: Bi-Directional EHR Integration.
  * `CR-07`: 2-Way Communication with the Office (Patient-office chat).
  * `CR-08`: Pick Up Prescription Reminder.
- **Findings**:
  * **Zero occurrences** of Cath Lab, surgical checklists, or catheterization.
  * CR-02 introduced *Treatment Financing & Offers* for non-insured patients to receive affordable treatment packages. It did not mandate the implementation of an intra-operative surgical documentation suite.

### 2.3 Examination of Figma Design Files (`CAREID AIO FIGMA.fig`)
- **Methodology**: Inspection of design canvas node references and prototype frames.
- **Findings**:
  * In the Figma design prototype, the UI/UX designers illustrated an end-to-end example walkthrough of a high-value treatment offer: **Treatment Offer #TR-8921 ("Coronary Angiography & Stent Placement")**.
  * To demonstrate how an accepted treatment offer might progress into clinical delivery, the designers created 5 illustrative prototype frames:
    - Frame `1:14096`: WHO Surgical Safety Check-in & Time-Out
    - Frame `1:15031`: Cath Lab Active Procedure Documentation
    - Frame `1:15586`: Post-Procedure Clinical Summary
    - Frame `1:15610`: Intra-Op Clinical Notes
    - Frame `1:16047`: Surgical Encounter Completed & Archival
  * **Critical Distinction**: These frames served as an **illustrative design mockup** representing an example surgical encounter for Treatment Offer #TR-8921. They were **never specified as mandatory product requirements** in the contract PRD or CR Sheet.

---

## 3. Inventory of Implemented Cath Lab Assets

Despite having no contractual requirement basis, the engineering team implemented extensive frontend and backend code:

### 3.1 Frontend Components (`doctor_web`)
1. `doctor_web/src/pages/cath-lab/CathLabSafetyCheckinPage.tsx` (68,022 bytes): Implements 6-gate WHO surgical time-outs, nephrology clearance checks, and emergency safety holds.
2. `doctor_web/src/pages/cath-lab/StartClinicalEncounterPage.tsx` (42,665 bytes): Sterile field preparation, lead surgeon verification.
3. `doctor_web/src/pages/cath-lab/ActiveProcedureDocumentationPage.tsx` (52,713 bytes): Real-time fluoroscopy tracking, contrast load logging, activated clotting time (ACT) logs, coronary vessel lesion percentages.
4. `doctor_web/src/pages/cath-lab/PostProcedureSummaryPage.tsx` (44,755 bytes): Post-op vitals, closure device tracking (Angio-Seal, Perclose), puncture site hematoma checks.
5. `doctor_web/src/pages/cath-lab/EncounterCompletedPage.tsx` (33,234 bytes): Terminal procedure completion, encounter archival, discharge instructions.
6. `doctor_web/src/services/cathLabService.ts` (10,996 bytes): Complete REST transport client.

### 3.2 Backend Module (`backend/src/modules/cath-lab`)
- `cath-lab.controller.ts`: **21 discrete REST endpoints** including:
  * `POST /api/v1/cath-lab/safety-timeout`
  * `POST /api/v1/cath-lab/safety-hold`
  * `POST /api/v1/cath-lab/telemetry/log`
  * `POST /api/v1/cath-lab/encounters/:encounterId/vessel-findings`
  * `POST /api/v1/cath-lab/encounters/:encounterId/dicom-series`
- `cath-lab.service.ts`: Business logic for radiation dose area product (DAP) calculations, contrast volume caps, and QCA stenosis calculations.

### 3.3 Database Models & Prisma Tables
- `MedicalProcedure` (`medical_procedures`): Contains specialized fields for intra-op documentation.
- `MedicalEncounter` (`medical_encounters`): Extended with `hasActiveHold`, `radiationDap`, `contrastVolume`.

---

## 4. Evaluative Classification Against Audit Taxonomy

| Classification Option | Audit Assessment | Evidence & Justification |
| :--- | :---: | :--- |
| **A. Explicit Client Requirement** | **FALSE** | Absolutely zero mention in `HEALTH VAULT 360.pdf` (PRD) or `Care ID_ CR Sheet.xlsx`. |
| **B. Partially Required Workflow** | **FALSE** | Outpatient clinical documentation requires SOAP notes and history (which are fully implemented in Batch 1). Cath Lab does not overlap with general outpatient needs. |
| **C. Design Reference / Example Specialization** | **TRUE** | Figma frames `1:14096`–`1:16047` were created as a mock demonstration of an example treatment offer (#TR-8921), not a product requirement. |
| **D. Unconfirmed Scope Expansion** | **TRUE** | The engineering team converted an illustrative UI mockup into an enterprise-grade hospital surgical system with 21 backend endpoints. |
| **E. Completely Outside Approved Scope** | **TRUE** | CareID is an outpatient personal health vault and doctor portal, not an acute-care hospital surgical suite EMR. |

**Definitive Classification:**  
Cath Lab is **C (Design Reference)** that evolved into **D/E (Unconfirmed Scope Expansion Completely Outside Approved Outpatient Scope)**.

---

## 5. Architectural & Strategic Recommendations

### 5.1 Immediate Action: Formal Descoping from Doctor Web
1. **Batch 4 Scope Rejection**: Confirm that Cath Lab active procedure documentation, intra-op clinical notes, and safety checklists are **formally excluded** from Batch 4 and all future Doctor Web batches.
2. **Preserve Code as Dormant / Hospital Specialized Module**:
   - Do **NOT** delete the code from the repository. The backend service and frontend pages represent high-quality, verified interventional cardiology software.
   - Retain the backend endpoints and Prisma models in a dormant state (`dormant/specialized`).
   - If CareID ever licenses an acute-care or specialty hospital module in the future, these assets will have immediate commercial value.
3. **Route Isolation in Doctor Web**:
   - The Cath Lab routes currently exist under `/treatment-offers/:id/cath-lab-safety`, `/treatment-offers/:id/encounter/active`, etc.
   - Normal outpatient clinical navigation (the Doctor Dashboard, Patient Profile, Medical Records, Prescriptions, Referrals) must never force or expect a clinician to enter the Cath Lab surgical pipeline.
   - Treatment Offers for outpatient procedures should terminate at the accepted/scheduled stage or transition to standard clinical SOAP documentation.

---

## 6. Formal Audit Conclusion

Cath Lab is **NOT an approved Doctor Web requirement**. It was an unconfirmed engineering expansion based on an illustrative Figma demo. Its exclusion from Batch 4 is 100% contractually and technically justified, allowing engineering capacity to focus entirely on the confirmed outpatient deliverables.
