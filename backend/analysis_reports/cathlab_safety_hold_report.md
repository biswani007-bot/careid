# CAREID — Cath Lab Emergency Safety Hold Report

**Capability:** Emergency Procedural Safety Hold (Stages 16–17)  
**Status:** **IMPLEMENTED AND VERIFIED**  
**Source File:** `src/modules/cath-lab/cath-lab.service.ts`  
**Controller:** `src/modules/cath-lab/cath-lab.controller.ts`

---

## 1. Clinical Specification

An Emergency Safety Hold allows any sterile or circulating member of the catheterization laboratory team to pause an active procedural workflow when a critical clinical hazard or equipment malfunction is identified.

### Safety Hold Categories:
1. `EQUIPMENT_MALFUNCTION`: C-arm generator failure, injector failure, or physiological monitor loss.
2. `PATIENT_HEMODYNAMIC_INSTABILITY`: Severe hypotension, malignant arrhythmia, or cardiac arrest requiring CPR.
3. `CONSENT_OR_IDENTIFICATION_DISCREPANCY`: Discrepancy identified between consent form and procedure plan.
4. `ANESTHESIA_AIRWAY_COMPROMISE`: Loss of airway patency, desaturation, or laryngospasm.
5. `RADIATION_OR_CONTRAST_HAZARD`: Contrast extravasation, radiation threshold breach, or lead shielding failure.
6. `MEDICATION_ERROR`: Anticoagulant or vasopressor dosing discrepancy.
7. `OTHER_SAFETY_HAZARD`: Environmental or sterile boundary breach.

---

## 2. Technical Implementation

### Endpoints
- `POST /api/v1/cath-lab/safety-hold` (HTTP 201 Created)
- `POST /api/v1/cath-lab/safety-hold/:holdId/clear` (HTTP 200 OK)
- `GET /api/v1/cath-lab/safety-hold/active?appointmentId=:id` (HTTP 200 OK)

### State Machine & Concurrency Protection
1. **Declaration:**
   - Validates appointment exists.
   - Verifies whether an active safety hold already exists for the appointment. If yes, throws `HTTP 409 Conflict` (prevents nested orphaned holds).
   - Records `declaredBy` from JWT context, server-side `declaredAt` timestamp, category, and clinical reason.
   - Sets status to `ACTIVE`.
2. **Resolution:**
   - Resolving clinician submits remediation notes.
   - Validates hold exists and is in `ACTIVE` status.
   - Sets status to `RESOLVED`, records `resolvedBy`, server-side `resolvedAt`, and computes `durationSeconds = round((resolvedAt - declaredAt) / 1000)`.
   - Moves hold into immutable `SAFETY_HOLD_HISTORY`.
3. **Audit Logging:**
   - Declaration and clearance write immutable entries to PostgreSQL `audit_logs`.

---

## 3. Coexistence with Appointment Status (`PUT /api/v1/appointments/:id/status`)

- The Safety Hold state machine runs alongside procedural states without corrupting appointment lifecycle states (`SCHEDULED`, `CONFIRMED`, `IN_PROGRESS`, `COMPLETED`).
- An active safety hold flags the appointment notes, alerting all attending clinicians and preventing silent completion while a hold is unresolved.

---

## 4. Test Evidence

The test suite [`cath-lab.service.spec.ts`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/cath-lab/tests/cath-lab.service.spec.ts) validates:
1. Declaration creates active hold and returns status `ACTIVE`.
2. Active hold query correctly identifies unresolved holds.
3. Attempting to declare a duplicate active hold for the same appointment throws `ConflictException`.
4. Clearing the hold computes duration in seconds, sets status to `RESOLVED`, and records audit logs.

