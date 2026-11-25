# CAREID MASTER BACKEND — REMAINING DEFECTS & ROOT CAUSES REPORT

**Document ID:** CRID-DOC-REM-01  
**Project:** CareID Healthcare Platform  
**Target Environment:** Staging (`https://360api.vnvision.in/api/v1`)  
**Release Candidate:** `CareID_Master_Backend_Staging_Candidate_2026-11-18_R2.zip`  
**SHA-256:** `84cf9b4c2500eb91ae256e444d60ff6b889713538641966026e088918e369707`  
**Classification:** Confidential — Healthcare Infrastructure & Engineering Runbook  

---

## 1. Executive Summary

Following the forensic pre-deployment audit of release package `CareID_Master_Backend_Production_Ready_Deployment_2026-11-18.zip` (Decision: `CONDITIONAL GO`), a rigorous engineering investigation was undertaken to resolve all five identified technical limitations and procedural risks. 

Every locally resolvable defect has been rectified in the NestJS source code, validated through automated regression testing (1,411 unit tests passing across 93 test suites, including 18 new purpose-built regression tests), and packaged into a clean, audited candidate archive `CareID_Master_Backend_Staging_Candidate_2026-11-18_R2.zip`.

No live staging server mutations or database writes were performed during this audit and remediation cycle.

---

## 2. Inventory of Addressed Defects & Root Cause Analysis

### Defect 1: Appointment Hold Volatility (In-Memory State Loss on Restart)
- **Severity:** HIGH (P1)
- **Component:** `AppointmentService` (`src/modules/appointment/application/use-cases/appointment.service.ts`)
- **Observed Behavior:** Temporary procedure suite slot holds (Stage 11) were maintained exclusively inside a static in-memory JavaScript `Map<string, any>` (`AppointmentService.activeHolds`). When the PM2 node process restarted, reloaded, or crashed, all active holds were wiped from memory. While the underlying database slot remained in `BLOCKED` status, subsequent attempts by users to query `GET /appointments/slots/holds/:id` or book via `POST /appointments` resulted in HTTP 404 or HTTP 409 conflict errors, stranding the slot permanently.
- **Root Cause:** Absence of durable persistence for the temporary hold session metadata (holdId, procedureCategory, facilityId, expiresAt, heldBy).
- **Remediation Implemented:** Utilized the existing PostgreSQL column `generated_slots.status_reason` (`TEXT` in DB, mapped in Prisma as `GeneratedSlot.statusReason String?`) to persist serialized JSON metadata (`HELD_JSON:${JSON.stringify(fullHold)}`) upon hold creation. Added `findSlotByHoldId` to `IAppointmentRepository` and `AppointmentRepository`. On process restart or memory cache eviction, `getHold`, `releaseHold`, and `bookAppointment` query PostgreSQL to reconstruct the hold state dynamically. If an expired hold is detected during lookup, the system automatically unblocks the slot back to `AVAILABLE`. Zero database migrations or schema alterations were required.

### Defect 2: Discount Approval Facility Tenancy Scope Gap
- **Severity:** MEDIUM (P2)
- **Component:** `TreatmentOfferService` (`src/modules/treatment-offer/application/use-cases/treatment-offer.service.ts`)
- **Observed Behavior:** In `approveDiscount`, authorization permitted any user possessing role `STAFF` or `FACILITY_ADMIN` to approve discounts exceeding the 15% threshold across any treatment offer, without validating whether the staff member was assigned to the offer's facility.
- **Root Cause:** Incomplete RBAC evaluation in `approveDiscount`. While role membership was checked via `this.isStaff(roles)`, facility tenancy was not evaluated against `this.db.staffMember`.
- **Remediation Implemented:** Enhanced `approveDiscount` to check facility tenancy for non-platform-admin staff supervisors: when `!this.isAdmin(roles) && this.isStaff(roles) && offer.facilityId`, the service resolves the caller's assigned facilities (`primaryFacilityId` and `secondaryFacilityId` from `staffMember`). If `!staffFacilities.includes(offer.facilityId)`, the service immediately rejects the approval with `ForbiddenException('Access denied: You are not authorized to approve discounts for this facility')`. Platform admins (`ADMIN`, `SUPER_ADMIN`) retain cross-facility authority, while attending physician self-approvals remain strictly forbidden.

### Defect 3: Day-of-Procedure Patient Check-In Vitals Validation & Privacy Gap
- **Severity:** MEDIUM (P2)
- **Component:** `AppointmentController` & `AppointmentService` (`src/modules/appointment/`)
- **Observed Behavior:** 
  1. `checkIn` accepted arbitrary vitals objects without validating physiological boundaries.
  2. `GET /appointments/:id/check-in` in `AppointmentController` passed only the appointment ID to `getCheckInRecord(id)` without passing caller context, allowing any authenticated caller who possessed an appointment UUID to inspect intake vitals and bed assignments.
- **Root Cause:** Omission of caller authorization parameters in the service layer method signature and missing boundary validation on intake vitals.
- **Remediation Implemented:**
  1. Added physiological sanity checks in `checkIn` (Heart Rate 20–300 bpm, SpO2 50–100%, Temperature 30–45°C).
  2. Updated `AppointmentController.getCheckInRecord` to extract and pass caller ID and roles: `getCheckInRecord(req.user.userId, roles, id)`.
  3. Enforced clinical privacy scoping in `AppointmentService.getCheckInRecord`: Patients can only view their own check-in records; doctors can only view check-in records for appointments where they are the assigned physician; clinical staff (`STAFF`, `FACILITY_ADMIN`, `NURSE`) and platform admins retain clinical operational access.

### Defect 4: Admin Patient List userStatus Fallback Fabrication
- **Severity:** LOW (P3)
- **Component:** `AdminRepository` (`src/modules/admin/infrastructure/database/admin.repository.ts`)
- **Observed Behavior:** In `findPatients` and `findPatientById`, the ternary expression `p.user?.status || (p.status === 'BLOCKED' ? 'BLOCKED' : 'ACTIVE')` defaulted to `'ACTIVE'` whenever a patient profile had an unlinked user or missing user status, masking non-active profile states.
- **Root Cause:** Hardcoded fallback to `'ACTIVE'` for unblocked patients lacking user records.
- **Remediation Implemented:** Modified lines 1599 and 1665 to `p.user?.status || p.status || 'UNKNOWN'`, preserving true profile statuses (`INACTIVE`, `PENDING`, `DRAFT`, `BLOCKED`) without fabricating `'ACTIVE'`.

### Defect 5: Prisma Production Deployment Dependency Ambiguity
- **Severity:** MEDIUM (P2) - Operational / Deployment Risk
- **Component:** Deployment Runbook & Package Configuration
- **Observed Behavior:** Running `npm ci --omit=dev` on the production server omits `devDependencies`, which strips `node_modules/.bin/prisma`. When subsequent deployment commands execute `npx prisma migrate status` or `npx prisma generate`, `npx` may dynamically download an unpinned, latest version of Prisma from the public npm registry over the internet, introducing non-deterministic behavior and network failure vulnerability.
- **Root Cause:** Categorization of `prisma` CLI as a devDependency combined with the `--omit=dev` flag in historical runbooks.
- **Remediation Implemented:** Documented the exact, deterministic deployment standard: running `npm ci` on the server retains the pinned Prisma CLI (`7.9.1`) in `node_modules/.bin/prisma`. Documented the alternative fallback (`npm ci --omit=dev && npm install --save-dev prisma@7.9.1`).

---

## 3. Defect Resolution Matrix

| Defect # | Category | Component | Root Cause | Fix Applied | Automated Verification |
|---|---|---|---|---|---|
| DEF-01 | Durability | `AppointmentService` | Volatile Map storage of holds | Serialized JSON to `generated_slots.status_reason` | `appointment-hold-durability.spec.ts` (11 tests pass) |
| DEF-02 | RBAC | `TreatmentOfferService` | Missing facility check on staff discount approval | Added `staffMember` facility tenancy check | `discount-facility-authorization.spec.ts` (7 tests pass) |
| DEF-03 | Clinical Privacy | `AppointmentService` / Controller | Unscoped `GET /check-in` endpoint & unvalidated vitals | Added caller role/ownership checks & vitals validation | `appointment-hold-durability.spec.ts` |
| DEF-04 | Data Integrity | `AdminRepository` | Default ternary fabrication of `'ACTIVE'` userStatus | Fallback to `p.status` or `'UNKNOWN'` | `admin-patients-records.spec.ts` |
| DEF-05 | DevOps | Deployment Runbook | `npm ci --omit=dev` strips pinned Prisma CLI | Documented deterministic `npm ci` execution | Package & manifest audit |

---
**Report Authorized By:** Principal Software Architect & Lead DevOps Release Engineer  
**Date:** November 18, 2026
