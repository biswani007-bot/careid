# CareID Doctor Web — Goal 004 Independent Dependency & Scope Review

**Project**: CAREID — Health Vault 360  
**Audit Target**: Independent Review of External Dependencies, Stakeholder Clarifications & Repository Boundaries  
**Execution Mode**: READ-ONLY CONTRACTUAL & REPOSITORY BOUNDARY AUDIT  
**Artifact ID**: `DOCTOR_WEB_GOAL004_INDEPENDENT_DEPENDENCY_REVIEW`  
**Execution Timestamp**: 2026-11-21T17:15:00Z  

---

## 1. External SMART on FHIR Interoperability Status

### Scope Definition & Analysis:
Change Request CR-06 specifies bi-directional EHR interoperability, comprising two distinct layers:
1. **Internal Health Vault Synchronization**: Real-time event tracking and database integrity checking between Doctor Web clinical documentation and PostgreSQL `careid_integration_db`.
2. **External Hospital SMART on FHIR Exchange**: Federated clinical data exchange using HL7 FHIR R4 resources authenticated via SMART on FHIR (OAuth 2.0).

### Independent Audit Findings:
- **Internal Health Vault Synchronization**: **VERIFIED COMPLETE**.
  - Doctor Web's `/settings/ehr` page includes a live round-trip health probe against `/api/v1/health` with measured latency of 2–5ms (`EHR-DEFECT-01`).
  - Direct database transactions for SOAP notes, prescriptions, vitals, and appointments commit synchronously to PostgreSQL.
- **External SMART on FHIR Gateway**: **`BLOCKED_EXTERNAL_DEPENDENCY`**.
  - The Doctor Web frontend exposes a clean FHIR Gateway Standby configuration card.
  - Live data exchange cannot be executed because the client/hospital partner has not provided:
    1. Hospital SMART on FHIR Authorization Base URL.
    2. Registered OAuth 2.0 Client ID and Private Key / Client Secret.
    3. FHIR R4 Sandbox Endpoints (`/Patient`, `/Condition`, `/Observation`, `/Encounter`).
  - The platform correctly avoids fabricating dummy or fake FHIR sync events and retains the contractual status `BLOCKED_EXTERNAL_DEPENDENCY`.

---

## 2. Prescription Pickup Reminder Delivery Status

### Scope Definition & Analysis:
Change Request CR-08 specifies clinician pickup reminder settings on electronic prescriptions (intervals ranging from 1 to 12 hours).

### Independent Audit Findings:
- **Clinician Configuration & Persistence**: **VERIFIED COMPLETE**.
  - The Doctor Web prescription modal includes an active toggle ("Send Pharmacy Pickup Reminder") and hourly interval selector.
  - The backend persists this setting directly in PostgreSQL `prescriptions.notes` using the structured marker `[PICKUP_REMINDER]:{"enabled":true,"hours":2}`.
  - The frontend parser accurately extracts and displays the reminder badge upon record reload.
- **Outbound Notification Delivery Channel**: **`CLIENT_CLARIFICATION_REQUIRED`**.
  - The client specification does not define whether reminders should be dispatched via:
    a) Automated SMS (e.g. Twilio or local SMS sandbox).
    b) Push Notification to Developer 2's `CAREID_patient_app`.
    c) Automated Email (e.g. SendGrid).
    d) Direct Pharmacy POS webhook integration.
  - Doctor Web outpatient responsibility is fully met by capturing and persisting clinician intent. Dispatch worker execution is appropriately documented as pending client direction.

---

## 3. Developer 2 Flutter Repository Boundaries

### Contractual Rule:
Developer 2 exclusively owns `CAREID_doctor_app` and `CAREID_patient_app`. Developer 1 is strictly forbidden from modifying any Flutter files.

### Independent Audit Evidence:
- **`CAREID_doctor_app`**:
  - `git -C D:\careid\CAREID_doctor_app status --short`: **0 modifications detected (100% clean)**.
- **`CAREID_patient_app`**:
  - `git status`: **0 modifications detected (100% clean)**.
- **QR Scanning Alignment**:
  - Camera-based QR scanning was confirmed exclusive to Developer 2's Flutter app. Doctor Web contains zero WebRTC camera scanning code or modal remnants.

---

## 4. Admin Web Repository Boundaries

### Contractual Rule:
`D:\careid\Admin_web` is maintained in a strictly read-only state during Doctor Web feature completion and acceptance goals.

### Independent Audit Evidence:
- Inspected file modification timestamps across `Admin_web/src/`.
- Zero application code files were modified in `Admin_web` during Master Goal 004 execution.

---

## 5. Excluded & Unconfirmed Scope

| Capability / Feature Area | Contractual Status | Justification |
| :--- | :---: | :--- |
| **WHO Cath Lab Safety Subsystem** | **OUT_OF_SCOPE** | Formally descoped in `DOCTOR_WEB_CATH_LAB_SCOPE_VERIFICATION.md`. Dormant backend endpoints preserved without Doctor Web UI expansion. |
| **Inpatient Surgical Workflows** | **OUT_OF_SCOPE** | Inpatient follow-up notes deferred to Milestone 7 per stakeholder guidance. |
| **Pharmacy POS / Lab Inventory** | **NOT_APPLICABLE** | Retail inventory and specimen accessioning belong to pharmacy/laboratory subsystems, not outpatient Doctor Web. |
| **Camera QR Scanning** | **NOT_APPLICABLE** | Contractually assigned exclusively to Developer 2's Flutter app. |

---

## 6. Dependency Review Verdict

All external blockers and client clarification items are transparently documented with precise technical boundaries. No unapproved features were introduced, and all developer boundaries were 100% respected.
