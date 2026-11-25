# CAREID MASTER BACKEND ENGINEERING ROOT-CAUSE REPORT
**Project:** CareID Healthcare Ecosystem (Backend API)  
**Date:** November 18, 2026  
**Environment:** Staging (`https://360api.vnvision.in/api/v1`) & Production Candidate  
**Target Release:** `CareID_Master_Backend_Production_Ready_Deployment_2026-11-18.zip`  
**Package SHA-256:** `c5ec528941e6b693e26ec96026f9d181fcac9896bae4d562f82f56d48596fad2`  
**Author:** Principal Software Architect, Senior Backend Engineer, Healthcare Systems Specialist  

---

## 1. EXECUTIVE SUMMARY

An exhaustive investigation and forensic root-cause analysis was conducted across all outstanding CareID backend defects, spanning seven engineering workstreams (Workstreams A through G). Reproduction against the live staging environment (`https://360api.vnvision.in/api/v1`), static AST inspection, and PostgreSQL constraint tracing uncovered concrete, reproducible defects rather than intermittent network failures.

All root causes have been isolated to deterministic code paths in the NestJS modules, verified locally with automated test suites, and packaged into a verified staging deployment candidate.

---

## 2. WORKSTREAM ROOT CAUSE INVESTIGATION & FORENSIC ANALYSIS

### 2.1. Workstream E: Admin Patient Profile HTTP 500 Permanent Fix
- **Live Staging Reproduction:**
  Executing `GET /api/v1/admin/patients?page=12&limit=1` consistently yielded `HTTP 500: InternalServerError` with payload `{"statusCode":500,"error":"InternalServerError","message":"An internal server error occurred."}`, while pages 1–11 and 13–24 succeeded with `HTTP 200 OK`.
  Direct lookup at `GET /api/v1/admin/patients/9a4ad630-de90-40e9-b4cd-1d76f8f63069`, `GET /admin/patients/:id/medical-records`, and `GET /admin/patients/:id/medical-records/timeline` also crashed with `HTTP 500`.
- **Target Profile Identification:**
  - Patient Profile ID: `9a4ad630-de90-40e9-b4cd-1d76f8f63069`
  - Linked User ID: `7904ad9d-b141-471d-9451-4aa48ad3eba7` (User: Lucas Vance, Phone: `+16505551407`, Email: `lucas.vance.1794566886827@careid.test`, Status: `BLOCKED`, Profile Status: `DRAFT`).
- **Exact Code Defect:**
  In [admin.repository.ts](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/admin/infrastructure/database/admin.repository.ts), lines 1392, 1401, 1402, 1458, 1488, 1489, 1850, 1863, 1895, 1909, 1944–1946:
  The repository executed `.toISOString()` directly on date objects:
  ```typescript
  dateOfBirth: p.dateOfBirth?.toISOString() || null,
  createdAt: p.createdAt.toISOString(),
  updatedAt: p.updatedAt.toISOString(),
  ```
  When `dateOfBirth` or timeline `item_date` is null, undefined, or an invalid Date instance (`isNaN(date.getTime())`), Node.js throws `RangeError: Invalid time value`. This unhandled JavaScript runtime exception bypassed domain error mapping and was caught by the NestJS `GlobalExceptionFilter` as an unhandled 500 internal server error.
  Furthermore, when a patient user was marked `BLOCKED`, fallback status resolution failed to default `userStatus` safely when relations were detached.

---

### 2.2. Workstream C & A3: Treatment Offer Dispatch PostgreSQL Abort Resolution
- **Reported Incident:**
  Dispatches for offer `1a1ab0ed-c2b7-4514-b86c-e46be3e9dddf` (Version 2, Multidisciplinary Clinical Review APPROVED, 6 valid physician attestations) crashed with `HTTP 500: Internal Server Error` immediately following OCC validation.
- **Forensic Investigation:**
  In [treatment-offer.repository.ts](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/treatment-offer/infrastructure/database/treatment-offer.repository.ts), line 453:
  ```typescript
  // Inside this.db.$transaction(async (tx) => { ... })
  await tx.notification.create({
    data: {
      recipientUserId: patientUser.userId,
      title: 'New Treatment Proposal Ready for Review',
      notificationType: 'GENERAL' as any, // <-- FATAL POSTGRESQL ENUM MISMATCH
      ...
    }
  });
  ```
- **PostgreSQL Transaction Mechanics:**
  In PostgreSQL, enum type `NotificationType` permits values `SYSTEM`, `SECURITY`, `PATIENT` (and clinical role targets). Passing `'GENERAL'` caused PostgreSQL to return:
  `ERROR: invalid input value for enum "NotificationType": "GENERAL"`.
  In PostgreSQL, **any SQL error inside a transaction block immediately aborts the transaction** (`ERROR: current transaction is aborted, commands ignored until end of transaction block`). Even though the notification call was wrapped in a JavaScript `try { ... } catch {}`, PostgreSQL had already marked the transaction aborted. When Prisma subsequently attempted to execute `COMMIT`, the commit failed with a transaction error, aborting the offer status transition and bubbling up as `HTTP 500`.

---

### 2.3. Workstream A1 & A2: Treatment Offer Financing Binding & Discount Authorization
- **A1: Financing Package Binding HTTP 500:**
  In [treatment-offer.service.ts](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/treatment-offer/application/use-cases/treatment-offer.service.ts):
  Line 1548:
  ```typescript
  const invalidTenures = dto.tenureMonths.filter((t) => !partnerConfig.supportedTenures.includes(t));
  ```
  When client requests (e.g. mobile Flutter or web frontend) transmitted `tenureMonths: 6` (a single integer) rather than an array `[6]`, invoking `.filter()` on a primitive number threw `TypeError: dto.tenureMonths.filter is not a function`.
  Additionally, in `mapFinancingOffer` (line 251), `new Date(fo.createdAt).toISOString()` threw `RangeError` when mock or uncommitted financing records had uninitialized timestamps.
- **A2: Discount Approval Authorization HTTP 403:**
  In [doctor-treatment-offer.controller.ts](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/treatment-offer/presentation/controllers/doctor-treatment-offer.controller.ts):
  Line 300 applied `@Roles('ADMIN', 'SUPER_ADMIN', 'FACILITY_ADMIN')` on `POST :offerId/approve-discount`, while the underlying domain service permitted authorized `STAFF` members. Consequently, staff supervisors were blocked with HTTP 403 at the guard layer.
  Conversely, attending doctors were able to access the endpoint route, requiring strict domain validation to prohibit attending physicians from self-approving discounts exceeding 15% without supervisor sign-off.
- **Admin/Staff Treatment Offer Listing HTTP 500:**
  In `treatment-offer.service.ts` lines 381–382 and 414–415, `getDoctorOffers` queries for Admin and Staff included:
  ```typescript
  doctor: { select: { id: true, firstName: true, lastName: true, primarySpecialty: true } },
  patient: { select: { id: true, firstName: true, lastName: true, uhid: true } },
  ```
  Neither `firstName`, `lastName`, nor `primarySpecialty` exist on `DoctorProfile` (which defines `fullName` and `primarySpecialization`), and `uhid` does not exist on `PatientProfile` (which defines `patientNumber`). Prisma client rejected these invalid fields at runtime, throwing HTTP 500 on all admin offer queries.

---

### 2.4. Workstream B: Treatment Offer Lifecycle 11–15 (Appointment Subsystems)
- **B1: Pre-Operative Readiness Server-Side Validation:**
  In [appointment.service.ts](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/appointment/application/use-cases/appointment.service.ts) line 726, `updateReadiness` blindly persisted `decision: 'GO'` even when clinical checklist items (`fastingConfirmed`, `medicationHoldConfirmed`, `transportationArranged`, `consentVerified`, `vitalsWithinThreshold`) were false or incomplete, violating WHO surgical safety prerequisites.
- **B2: Atomic Appointment Hold Conversion:**
  When a surgical procedure suite slot was placed on temporary hold via `POST /appointments/holds`, `holdSlot` updated the slot status in PostgreSQL to `'BLOCKED'`. Subsequently, when `bookAppointment` was called to finalize the booking:
  ```typescript
  if (slot.status !== 'AVAILABLE') {
    throw new ConflictException(`Selected slot is not available (current status: ${slot.status})`);
  }
  ```
  The booking was rejected because the slot was `BLOCKED`, preventing any client from successfully booking their held slot. Furthermore, `CreateAppointmentDto` lacked a `holdId` parameter to correlate holds with bookings.
- **B3: Check-In Record Persistence and Retrieval:**
  In `appointment.service.ts` line 784, `checkIn` updated appointment status to `IN_PROGRESS` but failed to serialize `checkInRecord` (bed assignment, intake vitals, timestamp) to `appointment.notes`. Furthermore, `GET /appointments/:id/check-in` was missing entirely from `appointment.controller.ts`, preventing nursing staff from retrieving procedure day check-in records.

---

### 2.5. Workstream D: Platform Security Settings Reset API
- **Defect:**
  Administrators were unable to restore enterprise baseline security configurations following unauthorized modifications.
  The system lacked `POST /api/v1/admin/settings/reset?category=SECURITY`, and baseline definitions for the 19 authoritative settings were not formalized into transactional restore logic.

---

### 2.6. Workstream F: OCR Backend Stability and Reprocessing
- **F1: Stale Failure Reasons:**
  In [ocr.repository.ts](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/ocr/infrastructure/database/ocr.repository.ts) line 102:
  ```typescript
  failureReason: failureReason || undefined,
  ```
  Prisma ignores `undefined` in update data structures. When an OCR job was reprocessed (`status = 'PREPROCESSING'`) or completed (`status = 'COMPLETED'`), `failureReason` was omitted, leaving previous error strings (e.g. timeout or formatting errors) permanently attached to successful jobs.
- **F3: Unsupported File Formats:**
  `processJobLocalPipeline` in [ocr.service.ts](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/ocr/application/use-cases/ocr.service.ts) passed unvalidated file extensions directly to OCR workers, triggering unhandled subprocess errors instead of returning clean `HTTP 400 Bad Request`.

---

## 3. SUMMARY OF ROOT CAUSES & REMEDIATION STRATEGY

| Defect / Workstream | Module & File | Exact Root Cause | Remediation Applied |
|---|---|---|---|
| **Workstream E (Admin Patient 500)** | `admin.repository.ts` | Unsanitized `.toISOString()` on null/invalid dates; unhandled `BLOCKED` user status. | Implemented `toSafeIsoString()`, null-coalesced dates and defaulted `userStatus`. |
| **Workstream C (Dispatch 500)** | `treatment-offer.repository.ts` | Invalid enum `NotificationType: 'GENERAL'` aborted PostgreSQL transaction. | Changed enum to `'PATIENT'` and moved notification outbox post-commit. |
| **Workstream A1 (Financing 500)** | `treatment-offer.service.ts` | `.filter()` called on scalar `tenureMonths`; invalid date parsing in mapper. | Normalized `tenureMonths` to array; sanitized date parsing in `mapFinancingOffer`. |
| **Workstream A2 (Discount 403)** | `doctor-treatment-offer.controller.ts` | `STAFF` omitted in `@Roles` decorator; missing attending doctor check. | Added `STAFF` to decorator; enforced attending doctor vs supervisor RBAC in service. |
| **Workstream A Listing (500)** | `treatment-offer.service.ts` | Invalid select fields (`primarySpecialty`, `uhid`, `firstName`, `lastName`) on Doctor/Patient profiles. | Corrected selects to `fullName`, `primarySpecialization`, and `patientNumber`. |
| **Workstream B1 (Readiness Validation)** | `appointment.service.ts` | Server allowed `decision: 'GO'` with unconfirmed checklist items. | Enforced strict server-side validation requiring all 5 items `true` for `GO`. |
| **Workstream B2 (Hold Conversion)** | `appointment.service.ts` & `appointment.dto.ts` | Held slots marked `BLOCKED` rejected booking; no `holdId` binding. | Added `holdId` to DTO; atomically transitioned `BLOCKED` held slot to `BOOKED`. |
| **Workstream B3 (Check-In Records)** | `appointment.service.ts` & `appointment.controller.ts` | Check-in records not saved to notes; `GET :id/check-in` missing. | Serialized check-in payload to `appointment.notes`; added `GET :id/check-in`. |
| **Workstream D (Security Reset)** | `admin.controller.ts`, `admin.service.ts`, `admin.repository.ts` | Missing `POST /admin/settings/reset?category=SECURITY`. | Implemented atomic reset restoring authoritative 19 baseline security settings. |
| **Workstream F (OCR Reprocessing)** | `ocr.repository.ts` & `ocr.service.ts` | `failureReason: undefined` preserved old errors; unsupported formats crashed. | Set `failureReason: null` on non-failed states; added clean 400 validation on formats. |
