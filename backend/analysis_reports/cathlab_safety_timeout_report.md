# CAREID — Cath Lab Surgical Safety Time-Out Report

**Capability:** Pre-Puncture Surgical Safety Time-Out Ratification (Stage 16)  
**Status:** **IMPLEMENTED AND VERIFIED**  
**Source File:** `src/modules/cath-lab/cath-lab.service.ts`  
**Controller:** `src/modules/cath-lab/cath-lab.controller.ts`

---

## 1. Clinical Specification

In cardiac catheterization, the Pre-Puncture Safety Time-Out is an active verbal and operational pause conducted by the sterile multidisciplinary team immediately before vascular puncture.

### The Six Mandatory Safety Gates:
1. `patientIdentityConfirmed`: Two team members verify patient name, date of birth, and CareID identifier against wristband and chart.
2. `procedureConfirmed`: Attending interventional cardiologist confirms the specific planned intervention (e.g. diagnostic left heart catheterization vs primary percutaneous coronary intervention).
3. `accessSiteConfirmed`: Access site (e.g. right radial artery, left radial artery, right femoral artery) is inspected, marked, prepped, and draped.
4. `consentAndAnticoagulationVerified`: Informed procedural consent is physically or digitally verified, baseline coagulation profile reviewed, and weight-adjusted anticoagulation strategy (heparin/bivalirudin) confirmed.
5. `equipmentAndEmergencyPrepared`: Coronary guide catheters, guidewires, balloon catheters, stents, and emergency resuscitation systems (defibrillator pads, transvenous pacing) are confirmed operational.
6. `radiationAndShieldingVerified`: Lead aprons, thyroid shields, and articulated lead acrylic shielding are positioned to ensure ALARA radiation compliance.

---

## 2. Technical Implementation

### Endpoints
- `POST /api/v1/cath-lab/safety-timeout` (HTTP 201 Created)
- `GET /api/v1/cath-lab/safety-timeout/:appointmentId` (HTTP 200 OK)

### Authorization & Security
- Guarded by `@UseGuards(AuthGuard('jwt'), RolesGuard)` and `@Roles('DOCTOR', 'PRACTITIONER', 'STAFF', 'ADMIN', 'SUPER_ADMIN', 'FACILITY_ADMIN')`.
- Identity derived from JWT context (`req.user.userId`).

### Validation Rules
- All six safety gates must be boolean `true`. If any gate is `false`, the request is rejected with `HTTP 400 Bad Request`.
- If a time-out has already been ratified for the appointment, re-submission is rejected with `HTTP 409 Conflict` unless `isAmendment: true` and a non-empty `amendmentReason` string is provided.

### Cryptographic Integrity
- A server-side SHA-256 integrity hash is computed:
  ```text
  SHA-256(appointmentId : patientProfileId : interventionalistId : ratifiedAt : JSON(gates))
  ```
- Persisted to `appointments.notes` under `--- CATH_LAB_SAFETY_TIMEOUT ---` and recorded in PostgreSQL `audit_logs`.

---

## 3. Test Evidence

The test suite [`cath-lab.service.spec.ts`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/cath-lab/tests/cath-lab.service.spec.ts) validates:
1. Missing appointment throws `NotFoundException`.
2. Partial checklist submission (e.g. 5 of 6 gates confirmed) throws `BadRequestException`.
3. Valid submission generates 64-character hex SHA-256 hash, binds clinical team IDs, and writes audit record.
4. Duplicate ratification throws `ConflictException`.
5. Amendment submission with reason updates the record successfully.

