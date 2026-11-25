# 03 — SEVEN WORKSTREAMS FORENSIC AUDIT
**Project:** CareID Healthcare Ecosystem (Backend API)  
**Date:** November 18, 2026  
**Auditor:** Principal Backend Architect, Senior NestJS Engineer, Healthcare Specialist  
**Audit Mode:** STRICT READ-ONLY SOURCE AUDIT & STATIC ANALYSIS  

---

## 1. WORKSTREAM A: TREATMENT OFFER LIFECYCLE (1–5)

### A1. Financing Package Binding & Normalization
- **Endpoints:**
  - `PUT /api/v1/doctors/treatment-offers/:offerId/financing`
  - `GET /api/v1/doctors/treatment-offers/:offerId/financing`
  - `POST /api/v1/doctors/treatment-offers/:offerId/financing-preview`
- **Original Defect:**
  In `treatment-offer.service.ts`, line 1548 previously called `.filter()` directly on `dto.tenureMonths`. When mobile or web clients submitted a scalar number (e.g., `tenureMonths: 12`), JavaScript threw `TypeError: dto.tenureMonths.filter is not a function`, yielding HTTP 500. Additionally, invalid date parsing in `mapFinancingOffer` threw `RangeError: Invalid time value`.
- **Actual Source File & Method:**
  `src/modules/treatment-offer/application/use-cases/treatment-offer.service.ts`
  - `bindFinancing()` (lines 1542–1628)
  - `getFinancingPreview()` (lines 1470–1540)
  - `mapFinancingOffer()` (lines 235–254)
- **Actual Implementation:**
  ```typescript
  // In bindFinancing (lines 1566-1568):
  const tenureMonths = Array.isArray(dto.tenureMonths)
    ? dto.tenureMonths.map(Number)
    : (dto.tenureMonths !== undefined ? [Number(dto.tenureMonths)] : partnerConfig.supportedTenures);

  // In mapFinancingOffer (lines 249-252):
  expiresAt: fo.expiresAt && !isNaN(new Date(fo.expiresAt).getTime()) ? new Date(fo.expiresAt).toISOString() : new Date().toISOString(),
  createdAt: fo.createdAt && !isNaN(new Date(fo.createdAt).getTime()) ? new Date(fo.createdAt).toISOString() : new Date().toISOString(),
  updatedAt: fo.updatedAt && !isNaN(new Date(fo.updatedAt).getTime()) ? new Date(fo.updatedAt).toISOString() : new Date().toISOString(),
  ```
- **Report Matching:** **MATCHES REPORT EXACTLY**
- **Correctness:** **CORRECT.** Normalization handles single numbers, arrays, and undefined defaults seamlessly without type errors.
- **Security & Authorization:** Doctor ownership check enforced (`offer.doctorProfileId !== doctorProfileId` throws `ForbiddenException`). Simulation endpoint (`financing-preview`) calculates estimated options without modifying database records.
- **Test Evidence:** Verified in `phase-12-master-engineering-repair.spec.ts` (test A1) and `treatment-offer.service.spec.ts` (3 financing tests). All mock-based.
- **Final Status:** **VERIFIED**

---

### A2. Discount Approval Authorization & Governance
- **Endpoints:**
  - `GET /api/v1/doctors/treatment-offers/:offerId/discount-status`
  - `POST /api/v1/doctors/treatment-offers/:offerId/approve-discount`
- **Original Defect:**
  Attending physicians were able to self-approve discounts exceeding the departmental 15% threshold. Conversely, legitimate facility supervisors bearing the `STAFF` role were rejected with HTTP 403 at the controller guard because `STAFF` was omitted from `@Roles()`.
- **Actual Source Files & Methods:**
  - `src/modules/treatment-offer/presentation/controllers/doctor-treatment-offer.controller.ts`: lines 300, 316
  - `src/modules/treatment-offer/application/use-cases/treatment-offer.service.ts`: `approveDiscount()` (lines 1311–1376) and `getDiscountStatus()` (lines 1378–1440)
- **Actual Implementation:**
  ```typescript
  // Controller:
  @Roles('ADMIN', 'SUPER_ADMIN', 'FACILITY_ADMIN', 'STAFF')
  @Post(':offerId/approve-discount')

  // Service (lines 1326-1329):
  const doctorProfileId = await this.resolveDoctorProfile(userId).catch(() => null);
  if (doctorProfileId && offer.doctorProfileId === doctorProfileId && !this.isAdmin(roles)) {
    throw new ForbiddenException('Attending physician cannot self-approve a discount exceeding 15%. Supervisor approval is required.');
  }
  ```
- **Report Matching:** **MATCHES REPORT**
- **Correctness & Architectural Caveat:**
  - The check successfully blocks the authoring doctor from self-approving discounts >15%.
  - **Limitation:** While `STAFF` is allowed, the implementation does not currently verify whether the `STAFF` user belongs to the same `facilityId` as the treatment offer. Any user with role `STAFF` can technically approve discounts for any facility.
- **Security & Authorization:** Prevents unauthorized self-discounting. Audit event `DISCOUNT_APPROVED` or `DISCOUNT_REJECTED` is recorded in `treatment_offer_history`.
- **Test Evidence:** Verified in `phase-12-master-engineering-repair.spec.ts` (test A2) and `treatment-offer.service.spec.ts`.
- **Final Status:** **PARTIALLY VERIFIED** (Self-approval blocked; cross-facility staff scoping recommended for future enhancement).

---

### A3 & C: Treatment Offer Dispatch & PostgreSQL Abort Resolution
- **Endpoint:**
  - `POST /api/v1/doctors/treatment-offers/:offerId/dispatch`
- **Original Defect:**
  Dispatches crashed with `HTTP 500: Internal Server Error`. Inside `this.db.$transaction`, an invalid enum value `notificationType: 'GENERAL'` was inserted into `notifications`. In PostgreSQL, any SQL error within a transaction immediately marks the entire transaction aborted. When Prisma attempted `COMMIT`, PostgreSQL rejected it with a transaction abort error, rolling back the offer status transition.
- **Actual Source Files & Methods:**
  - `src/modules/treatment-offer/infrastructure/database/treatment-offer.repository.ts`: `dispatchOffer()` (lines 363–474)
  - `src/modules/treatment-offer/application/use-cases/treatment-offer.service.ts`: `dispatchOffer()` (lines 562–670)
- **Actual Implementation:**
  ```typescript
  // In treatment-offer.repository.ts (lines 370-442):
  const dispatched = await this.db.$transaction(async (tx) => {
    // 1. FOR UPDATE row lock
    // 2. Status check & OCC expectedVersion check
    // 3. Status transition to DISPATCHED
    // 4. Offer history & audit log creation
    return updated;
  });

  // Post-commit non-blocking patient notification dispatch (lines 445-472):
  try {
    const patientUser = await this.db.patientProfile.findUnique({
      where: { id: dispatched.patientProfileId },
      select: { userId: true },
    });
    if (patientUser && patientUser.userId) {
      await this.db.notification.create({
        data: {
          recipientUserId: patientUser.userId,
          notificationType: 'PATIENT' as any, // Aligned enum
          priority: 'HIGH' as any,
          channel: 'IN_APP' as any,
          status: 'PENDING' as any,
          ...
        },
      });
    }
  } catch {
    // Non-blocking notification dispatch: never aborts offer dispatch
  }
  ```
- **Report Matching:** **MATCHES REPORT EXACTLY**
- **Correctness:** **CORRECT.** Moving notification out of the transaction guarantees that the offer status change is committed regardless of notification delivery issues.
- **Architectural Risk:** Because the notification creation is wrapped in an empty `catch {}` without a persistent transactional outbox table or message broker retry, if the notification insert fails, the notification is permanently lost.
- **Clinical Prerequisite Validation:**
  - Mandates multidisciplinary review is `APPROVED` (lines 620–639).
  - Mandates clinician attestation matching the current offer version (lines 642–665).
  - Enforces optimistic concurrency control (`FOR UPDATE` lock and `expectedVersion` check).
- **Test Evidence:** Verified in `treatment-offer.service.spec.ts` (14 dispatch tests).
- **Final Status:** **VERIFIED**

---

### A4. Treatment Offer Listing for Admin and Staff
- **Endpoint:**
  - `GET /api/v1/doctors/treatment-offers`
- **Original Defect:**
  Query included non-existent Prisma fields on related models: `primarySpecialty`, `firstName`, and `lastName` on `DoctorProfile` (which defines `fullName` and `primarySpecialization`), and `uhid` on `PatientProfile` (which defines `patientNumber`). Prisma client rejected the invalid fields at runtime, throwing HTTP 500 on all admin offer queries.
- **Actual Source File & Method:**
  `src/modules/treatment-offer/application/use-cases/treatment-offer.service.ts`: `getDoctorOffers()` (lines 380–383, 413–416)
- **Actual Implementation:**
  ```typescript
  doctor: { select: { id: true, fullName: true, primarySpecialization: true } },
  patient: { select: { id: true, firstName: true, lastName: true, patientNumber: true } },
  facility: { select: { id: true, name: true, city: true } },
  ```
- **Report Matching:** **MATCHES REPORT EXACTLY**
- **Correctness:** **CORRECT.** All fields exist in `prisma/schema.prisma` models `DoctorProfile` and `PatientProfile`.
- **Final Status:** **VERIFIED**

---

## 2. WORKSTREAM B: APPOINTMENT & CLINICAL READINESS (11–15)

### B1. Pre-Operative Readiness Contract Reconciliation
- **Endpoint:**
  - `PATCH /api/v1/appointments/:id/readiness`
- **Contract Reconciliation Analysis:**
  The audit identified a critical documentation discrepancy between the supplied engineering reports:
  - **Documented Report Matrix / Runbook cURL:**
    `{ "checklist": { "labWorkConfirmed": false, "consentSigned": true, "fastingCompliant": true, "anesthesiaCleared": true, "imagingUploaded": true }, "decision": "GO" }`
  - **Actual Source Code DTO & Service (`UpdateReadinessDto`):**
    Top-level boolean properties:
    1. `fastingConfirmed?: boolean`
    2. `medicationHoldConfirmed?: boolean`
    3. `transportationArranged?: boolean`
    4. `consentVerified?: boolean`
    5. `vitalsWithinThreshold?: boolean`
    6. `decision?: string`
    7. `notes?: string`
  - **Authoritative Postman Reference:**
    Line 33326 of `CareID_Doctor_application/CareID-Staging.postman_collection.json` confirms the actual contract matches the DTO:
    ```json
    {
      "fastingConfirmed": true,
      "medicationHoldConfirmed": true,
      "transportationArranged": true,
      "consentVerified": true,
      "vitalsWithinThreshold": true,
      "decision": "GO",
      "notes": "Patient ready for procedure suite admission"
    }
    ```
- **Actual Source File & Method:**
  `src/modules/appointment/application/use-cases/appointment.service.ts`: `updateReadiness()` (lines 737–775)
- **Actual Implementation:**
  ```typescript
  if (updated.decision === 'GO') {
    const missingItems: string[] = [];
    if (!updated.consentVerified) missingItems.push('consentVerified');
    if (!updated.fastingConfirmed) missingItems.push('fastingConfirmed');
    if (!updated.medicationHoldConfirmed) missingItems.push('medicationHoldConfirmed');
    if (!updated.vitalsWithinThreshold) missingItems.push('vitalsWithinThreshold');
    if (!updated.transportationArranged) missingItems.push('transportationArranged');
    if (missingItems.length > 0) {
      throw new BadRequestException(
        `Cannot issue 'GO' readiness decision: all mandatory pre-operative checklist items must be confirmed true. Unconfirmed items: [${missingItems.join(', ')}]`,
      );
    }
  }
  ```
- **Correctness:** **CORRECT IN CODE.** Rejects `decision: 'GO'` when any of the 5 checklist items is missing or false.
- **Documentation Status:** **DOCUMENTATION MISMATCH.** The previous acceptance matrix documentation must be corrected to reflect the authentic top-level DTO property names.
- **Final Status:** **VERIFIED (Code) / DOCUMENTATION MISMATCH**

---

### B2. Appointment Hold Conversion
- **Endpoints:**
  - `POST /api/v1/appointments/holds`
  - `GET /api/v1/appointments/holds/:id`
  - `DELETE /api/v1/appointments/holds/:id`
  - `POST /api/v1/appointments` (supporting `holdId`)
- **Original Defect:**
  When a procedure suite slot was held via `POST /appointments/holds`, `holdSlot` updated the slot status in PostgreSQL to `'BLOCKED'`. When the client called `POST /appointments`, the booking engine rejected the request because `slot.status !== 'AVAILABLE'`, rendering held slots unbookable.
- **Actual Source Files & Methods:**
  - `src/modules/appointment/presentation/dto/appointment.dto.ts`: `CreateAppointmentDto` (line 122: `@IsOptional() @IsString() holdId?: string`)
  - `src/modules/appointment/application/use-cases/appointment.service.ts`: `bookAppointment()` (lines 148–188) and `holdSlot()` (lines 608–658)
- **Actual Implementation:**
  When `dto.holdId` is provided:
  1. Validates hold existence and expiration against `AppointmentService.activeHolds`.
  2. Accepts `slot.status === 'BLOCKED'` as a valid held slot.
  3. Atomically updates slot status to `'BOOKED'` via `this.repository.updateSlotStatus(targetSlotId, 'BOOKED')`.
  4. Removes the hold from `activeHolds`.
  5. If `dto.holdId` is omitted, standard direct booking is preserved (`slot.status === 'AVAILABLE'` required).
- **Architectural Limitation & In-Memory Volatility:**
  `AppointmentService.activeHolds = new Map<string, any>()` is stored in process heap memory. If the Node.js server restarts:
  - All active holds are lost.
  - Held slots remain stuck as `BLOCKED` in PostgreSQL without a database-persisted hold record to unblock them.
  - Multi-instance clusters cannot share holds across processes.
- **Test Evidence:** Verified in `phase-12-master-engineering-repair.spec.ts` (test B2).
- **Final Status:** **PARTIALLY VERIFIED** (Functional in single-instance; requires Redis or DB persistence for multi-instance clusters).

---

### B3. Check-In Record Persistence and Retrieval
- **Endpoints:**
  - `POST /api/v1/appointments/:id/check-in`
  - `GET /api/v1/appointments/:id/check-in`
- **Original Defect:**
  `POST /appointments/:id/check-in` updated appointment status to `IN_PROGRESS` but failed to save structured vitals and bed numbers. The retrieval endpoint `GET /appointments/:id/check-in` was missing from the controller.
- **Actual Source Files & Methods:**
  - `src/modules/appointment/application/use-cases/appointment.service.ts`: `checkIn()` (lines 787–839), `getCheckInRecord()` (lines 841–870)
  - `src/modules/appointment/presentation/controllers/appointment.controller.ts`: exposed `@Get(':id/check-in')`
- **Actual Implementation:**
  - Structured `checkInRecord` is serialized into `appointment.notes` within a markdown section:
    `--- CHECK_IN ---\n${JSON.stringify(checkInRecord, null, 2)}`
  - `GET :id/check-in` deserializes the JSON block from notes and returns the structured payload.
- **Clinical Data Risk:**
  Serializing structured clinical records into a free-form text field (`notes`) creates vulnerability to accidental overwrite if another endpoint modifies `appointment.notes` without merging. A dedicated `AppointmentCheckIn` entity should be planned for future phases.
- **Test Evidence:** Verified in `phase-12-master-engineering-repair.spec.ts` (test B3).
- **Final Status:** **PARTIALLY VERIFIED** (Operational; free-form storage risk documented).

---

## 3. WORKSTREAM D: PLATFORM SECURITY SETTINGS RESET

- **Endpoint:**
  - `POST /api/v1/admin/settings/reset?category=SECURITY`
- **Original Defect:**
  Administrators lacked an automated endpoint to restore all 19 enterprise baseline security settings following unauthorized or corrupt configuration updates.
- **Actual Source Files & Methods:**
  - `src/modules/admin/presentation/controllers/admin.controller.ts`: lines 481–495
  - `src/modules/admin/application/use-cases/admin.service.ts`: lines 625–648
  - `src/modules/admin/infrastructure/database/admin.repository.ts`: lines 958–1150
- **Actual Implementation:**
  - Controller requires query parameter `category=SECURITY`. Any other category throws `BadRequestException`.
  - Protected by class-level `@Roles('ADMIN', 'SUPER_ADMIN')` and `@UseGuards(AuthGuard('jwt'), RolesGuard)`.
  - Transactionally upserts all 19 baseline security settings in a single `$transaction`.
  - Dispatches audit event `SECURITY_SETTINGS_RESET`.
- **Forensic Setting Value Analysis:**
  - `PASSWORD_ROTATION_INTERVAL`: `'90 Days (Enterprise Standard)'` (`STRING`)
  - `PASSWORD_MIN_LENGTH`: `'12 Characters (Mandatory)'` (`STRING`)
  - `SESSION_INACTIVITY_TIMEOUT`: `'15 Minutes (Active Clinical Standard)'` (`STRING`)
  - `LOCKOUT_DURATION_WINDOW`: `'30 Minutes (Auto-Release)'` (`STRING`)
  - `IP_WHITELISTING_ACTIVE`: `'true'` (`BOOLEAN`)
  - `WHITELISTED_SUBNETS`: `'[{"id":"cidr-1","cidr":"192.168.10.0/24","description":"Cath Lab","type":"on-premise","active":true}]'` (`JSON`)
- **Enforcement Reality:**
  These values are human-readable descriptive metadata stored in `platform_settings` for admin UI display. The backend authentication module (`AuthService`, `JwtStrategy`) does NOT query `platform_settings` to enforce these settings. The CIDR `192.168.10.0/24` is a placeholder and is not enforced by any IP middleware.
- **Test Evidence:** Verified in `admin.service.spec.ts`.
- **Final Status:** **VERIFIED**

---

## 4. WORKSTREAM E: ADMIN PATIENT PROFILE DEFECT (LUCAS VANCE)

- **Endpoints:**
  - `GET /api/v1/admin/patients` (Page 12 pagination crash)
  - `GET /api/v1/admin/patients/:patientId`
  - `GET /api/v1/admin/patients/:patientId/medical-records`
  - `GET /api/v1/admin/patients/:patientId/medical-records/timeline`
  - `PUT /api/v1/admin/patients/:patientId`
- **Original Defect:**
  Lucas Vance (`patientProfileId: 9a4ad630-de90-40e9-b4cd-1d76f8f63069`, user status: `BLOCKED`) caused HTTP 500 when querying page 12 of admin patients. Unsanitized `.toISOString()` calls on null or invalid Date values threw unhandled `RangeError: Invalid time value`.
- **Actual Source File & Methods:**
  `src/modules/admin/infrastructure/database/admin.repository.ts`:
  - `toSafeIsoString()` utility (lines 10–14)
  - `findPatients()` (lines 1590–1620)
  - `findPatientById()` (lines 1655–1685)
  - `getPatientTimeline()` (lines 2085–2135)
  - `mapAdminMedicalRecord()` (lines 2140–2170)
- **Actual Implementation:**
  ```typescript
  function toSafeIsoString(dateVal: any): string | null {
    if (!dateVal) return null;
    const d = dateVal instanceof Date ? dateVal : new Date(dateVal);
    return !isNaN(d.getTime()) ? d.toISOString() : null;
  }
  ```
  - Replaced raw `.toISOString()` calls with `toSafeIsoString(dateVal)`.
  - Added null safety for patient users: `userStatus: p.user?.status || (p.status === 'BLOCKED' ? 'BLOCKED' : 'ACTIVE')`.
  - Guaranteed array defaults for demographic arrays (`languages`, `allergies`).
- **Report Matching:** **MATCHES REPORT EXACTLY**
- **Correctness:** **CORRECT.** Prevents runtime crashes on corrupted or missing timestamps.
- **Status Fallback Caveat:** If `p.user` is null and `p.status` is not `'BLOCKED'`, `userStatus` defaults to `'ACTIVE'`. This avoids crashing the table, but can synthesize an active status for orphaned profiles.
- **Test Evidence:** Verified in `phase-12-master-engineering-repair.spec.ts` (test E1).
- **Final Status:** **VERIFIED**

---

## 5. WORKSTREAM F: OCR BACKEND STABILITY & REPROCESSING

- **Endpoints:**
  - `POST /api/v1/ocr/jobs`
  - `POST /api/v1/ocr/jobs/:jobId/reprocess`
  - `GET /api/v1/ocr/jobs/:jobId`
  - `POST /api/v1/ocr/jobs/:jobId/complete`
- **Original Defects:**
  1. Reprocessing an OCR job retained stale error messages in `failureReason` because Prisma ignores `undefined` during updates.
  2. Uploading an unsupported file format triggered unhandled subprocess exceptions rather than clean HTTP 400 responses.
- **Actual Source Files & Methods:**
  - `src/modules/ocr/infrastructure/database/ocr.repository.ts`: `updateJobStatus()` (lines 90–108)
  - `src/modules/ocr/application/use-cases/ocr.service.ts`: `processJobLocalPipeline()` (lines 455–463)
- **Actual Implementation:**
  ```typescript
  // In ocr.repository.ts line 102:
  failureReason: failureReason !== undefined ? failureReason : (status !== 'FAILED' ? null : undefined),

  // In ocr.service.ts lines 455-462:
  const ext = path.extname(originalFilename).toLowerCase();
  const allowedExtensions = ['.png', '.jpg', '.jpeg', '.tiff', '.tif', '.bmp', '.webp', '.pdf'];
  if (ext && !allowedExtensions.includes(ext)) {
    const errMsg = `Unsupported file format '${ext}'. OCR engine only supports standard image files (PNG, JPG, TIFF, BMP, WEBP) and PDF documents.`;
    const durationMs = Date.now() - startTime;
    await this.ocrRepository.updateJobStatus(jobId, 'FAILED', 0.0, 'LOW', durationMs, errMsg);
    throw new BadRequestException(errMsg);
  }
  ```
- **Report Matching:** **MATCHES REPORT** (Code supports 8 extensions including `.webp` and `.tif`, while report matrix listed 6).
- **Job Lifecycle Reality:** When an unsupported file is uploaded, the job record is created in `QUEUED` status, the pipeline detects the invalid extension, updates the job to `FAILED` with `failureReason`, and throws `BadRequestException` (HTTP 400).
- **Security:** Worker callback requires header `x-ocr-secret` matching `CAREID_OCR_SECRET`.
- **Test Evidence:** Verified in `phase-12-master-engineering-repair.spec.ts` (test F1) and `ocr.service.spec.ts`.
- **Final Status:** **VERIFIED**

---

## 6. WORKSTREAM G: CROSS-MODULE LIFECYCLE & INTEGRITY

- **Scope:** Clinical workflow continuity across Consultation -> Offer -> Financing -> Schedule -> Check-In -> Medical Records.
- **Integrity Findings:**
  1. **Foreign Key Alignment:** Validated across Prisma schema relations (`TreatmentOffer -> DoctorProfile`, `TreatmentOffer -> PatientProfile`, `Appointment -> PatientProfile`).
  2. **Audit Logging:** Platform security audit logs (`SecurityPlatformAuditLog`) are created on critical mutations (`DISPATCH_TREATMENT_OFFER`, `SECURITY_SETTINGS_RESET`, `PATIENT_UPDATED`).
  3. **Data Boundary:** Doctor and patient access to draft offers and unpublished records is restricted by ownership checks in service methods.
- **Final Status:** **VERIFIED**
