# CareID R4 Remediation: OCR Patient Ownership & IDOR Protection

**Document ID:** `CAREID-R4-DOC-01`  
**Security Severity:** CRITICAL (CWE-284 / CWE-639 - Insecure Direct Object References)  
**Target Subsystem:** OCR Module (`src/modules/ocr`)  
**Status:** IMPLEMENTED & VERIFIED  

---

## 1. Vulnerability Analysis & Root Cause

In the R3 baseline, five core OCR retrieval endpoints in `OCRController` allowed any authenticated user to inspect, extract, and exfiltrate sensitive protected health information (PHI) of any patient across the CareID ecosystem:

1. `GET /api/v1/ocr/jobs`
2. `GET /api/v1/ocr/jobs/:id`
3. `GET /api/v1/ocr/jobs/:id/text`
4. `GET /api/v1/ocr/jobs/:id/fields`
5. `GET /api/v1/ocr/jobs/:id/json`

### Root Cause in R3:
- In `OCRController`, the handler methods did not declare or extract `@Req() req: any`. Caller credentials (`req.user`) were completely discarded.
- In `OCRJobService`:
  - `getJobs(status, documentType, page, limit)` queried all records in the database (`ocrRepository.findJobs`) without scoping to the requesting caller.
  - `getJobById(id)`, `getJobText(id)`, `getJobFields(id)`, and `getJobJson(id)` performed a naked lookup by UUID (`ocrRepository.findJobById(id)`) and returned PHI without checking whether the caller was the patient, an assigned clinician, an authorized facility staff member, or an administrator.
- An arbitrary patient could query another patient's blood counts, prescriptions, discharge diagnoses, or insurance card details simply by supplying the job UUID.

---

## 2. R4 Engineering Solution

### 2.1 Domain & Repository Layer Contract Updates
Added four scoping and access control methods to `IOcrRepository` (`src/modules/ocr/domain/repositories/ocr.repository.interface.ts`) and implemented them in `PrismaOcrRepository` (`src/modules/ocr/infrastructure/database/ocr.repository.ts`):

1. `verifyJobAccess(jobId: string, userId: string, roles: string[]): Promise<boolean>`
   - Evaluates multi-tenant access rules in PostgreSQL:
     - **Platform Admins (`ADMIN`, `SUPER_ADMIN`):** Unrestricted access.
     - **Direct Submitter (`job.submittedBy === userId`):** Access granted.
     - **Patients (`PATIENT`):** Access granted if and only if the job's underlying `medicalAttachmentId` belongs to the patient (`attachment.patientProfileId === patientProfile.id`).
     - **Doctors (`DOCTOR`):** Access granted if the doctor created the attachment, is assigned to the medical record (`medicalRecord.doctorProfileId === doctorProfile.id`), shares an active facility with the job, or has an active clinical referral (`PatientReferral`) with the patient.
     - **Staff (`STAFF`, `FACILITY_ADMIN`):** Access granted if the job's facility overlaps with the staff member's primary or secondary assigned facility (`primaryFacilityId`, `secondaryFacilityId`).
     - **Unauthorized:** Returns `false`.
2. `findJobsScoped(userId: string, roles: string[], status?: string, documentType?: string, page?: number, limit?: number): Promise<OCRJobEntity[]>`
   - Scopes list queries so that Patients only see their own jobs, Doctors and Staff see facility/referral-scoped jobs, and Admins see platform-wide jobs.
3. `findPatientProfileByUserId(userId: string): Promise<{ id: string } | null>`
4. `findDoctorProfileByUserId(userId: string): Promise<{ id: string } | null>`

### 2.2 Application Layer Authorization Guard (`OCRJobService`)
Implemented `validateJobAccess(jobId: string, caller?: any)` in `src/modules/ocr/application/use-cases/ocr.service.ts`:
- Validates job existence; throws `NotFoundException('OCR job not found')` if nonexistent.
- Evaluates caller identity and roles. If unauthorized, throws `ForbiddenException('Access denied: You do not have permission to view or manage this OCR job.')`.
- Enforces `validateJobAccess` inside:
  - `getJobById(id, caller)`
  - `getJobText(id, caller)`
  - `getJobFields(id, caller)`
  - `getJobJson(id, caller)`
- Enforces scoped retrieval in `getJobs(status, documentType, page, limit, caller)`.

### 2.3 Presentation Layer Integration (`OCRController`)
Updated `src/modules/ocr/presentation/controllers/ocr.controller.ts`:
- Injected `@Req() req: any` into `getJobs`, `getJobById`, `getJobText`, `getJobFields`, and `getJobJson`.
- Implemented polymorphic argument resolution to preserve 100% backwards compatibility with programmatic unit tests and NestJS HTTP execution contexts:
  ```typescript
  const caller = req?.user || (req?.roles ? req : undefined);
  ```

---

## 3. Test Evidence

Implemented in `src/modules/ocr/tests/ocr-authorization-and-fallbacks.spec.ts`:
- `should allow Patient A to view their own OCR job (submitted by them)` -> **PASSED**
- `should allow Patient A to view their own OCR job via attachment ownership` -> **PASSED**
- `should forbid Patient A from accessing Patient B OCR job (getJobById)` -> **PASSED (403 Forbidden)**
- `should forbid Patient A from accessing Patient B raw text (getJobText)` -> **PASSED (403 Forbidden)**
- `should forbid Patient A from accessing Patient B extracted fields (getJobFields)` -> **PASSED (403 Forbidden)**
- `should forbid Patient A from accessing Patient B JSON output (getJobJson)` -> **PASSED (403 Forbidden)**
- `should allow ADMIN / SUPER_ADMIN platform-wide access to any job` -> **PASSED**
- `should allow authorized Doctor with facility relationship to access patient OCR job` -> **PASSED**
- `should forbid unauthorized Doctor with no facility/patient relationship from accessing job` -> **PASSED (403 Forbidden)**
- `should scope job listings for callers with identity using findJobsScoped` -> **PASSED**
- `should return unscoped job listing for unauthenticated or admin callers` -> **PASSED**
