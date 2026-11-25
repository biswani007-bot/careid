# CareID Backend — Phase 4.3: Doctor Flutter API Readiness Audit

**Audit Date:** October 2026  
**Target Platform:** CareID Doctor Mobile Application (Flutter iOS/Android)  
**Backend Reference:** NestJS 11.1.28 + TypeScript 5.7 + Prisma 7.9.1 + PostgreSQL  
**Audit Scope:** READ-ONLY Verification of 11 PRD Doctor Features  

---

## 1. Feature Readiness Summary Matrix

| # | Doctor Flutter Feature | Backend Classification | Endpoints Available | Key Limitations & Blockers |
|---|---|---|---|---|
| 1 | **Doctor Registration & Verification** | `READY WITH LIMITATIONS` | 6 endpoints | No `/me` route; requires knowing `DoctorProfile.id`; admin verifies |
| 2 | **Doctor Profile Management** | `READY WITH LIMITATIONS` | 3 endpoints | Profile update works via `PUT /doctors/:id` (requires `id` resolution) |
| 3 | **Facility Affiliation** | `READY` | 5 endpoints | Doctor can query facilities, departments, and assigned facility doctors |
| 4 | **Patient Access via QR Scan** | `BACKEND FIX REQUIRED` | 1 endpoint | QR validation does not create a clinical authorization grant for records |
| 5 | **Patient Records Access** | `BACKEND FIX REQUIRED` | 0 endpoints | `/medical-records` blocks non-patients; `/admin` routes reject `DOCTOR` |
| 6 | **Consultation & Encounter Documentation** | `BACKEND FIX REQUIRED` | 0 endpoints | No endpoint allows a doctor to create or write medical records for a patient |
| 7 | **OCR Verification Workflow** | `READY WITH LIMITATIONS` | 5 endpoints | Queue & review submission fully functional for doctors; OCR engine simulated |
| 8 | **Referral Management** | `READY WITH LIMITATIONS` | 9 endpoints | Full clinical triage & notes; `referringFacilityId` hardcoded to default |
| 9 | **Schedule & Availability** | `READY WITH LIMITATIONS` | 6 endpoints | Doctor can read slots; schedule editing restricted to `FACILITY_ADMIN` |
| 10 | **Appointment Management** | `API MISSING` | 0 endpoints | `AppointmentController` is an empty stub (`// TODO: Phase 5 Implementation`) |
| 11 | **Doctor Notifications & Alerts** | `READY WITH LIMITATIONS` | 6 endpoints | In-app alerts functional; no push notification device token registration |

---

## 2. Critical Blockers for Doctor Mobile Experience

### Blocker 1: Inability to Access or Document Patient Medical Records (Features 5 & 6)
- **Root Cause Analysis:**
  1. `MedicalRecordController` (`src/modules/medical-record/presentation/controllers/medical-record.controller.ts`) is designed exclusively for patient self-records. In `MedicalRecordService`:
     ```typescript
     private async resolveProfile(userId: string): Promise<string> {
       const profile = await this.repository.findProfileByUserId(userId);
       if (!profile) throw new NotFoundException('Patient profile not found. Please complete registration first.');
       return profile.id;
     }
     ```
     When a Doctor invokes `GET /api/v1/medical-records` or `POST /api/v1/medical-records`, `resolveProfile` searches `patient_profiles` for the doctor's user ID, which fails with `404 Not Found`.
  2. The administrative patient lookup endpoint (`GET /api/v1/admin/patients/:patientId/medical-records`) restricts access to `@Roles('ADMIN', 'SUPER_ADMIN')`, returning `403 Forbidden` if called with a doctor's JWT.
- **Impact on Doctor App:**
  A doctor **cannot view past patient history** and **cannot document clinical consultations, encounters, vitals, or diagnoses**.
- **Required Backend Remediation:**
  In Phase 5, either:
  - Add `DOCTOR` role to `GET /api/v1/admin/patients/:patientId/medical-records` with active facility/referral authorization checks, OR
  - Introduce dedicated clinical encounter endpoints: `POST /api/v1/doctors/encounters` and `GET /api/v1/doctors/patients/:patientId/records`.

---

### Blocker 2: QR Scanning Does Not Grant Clinical Access (Feature 4)
- **Root Cause Analysis:**
  `POST /api/v1/qr/verify` (`QrController.verifyQrPayload`) validates the cryptographic integrity and expiration of a patient QR token and logs a scan audit entry. However, it does not persist an access grant in `security_consent_records` or issue a scoped clinical access session.
- **Impact on Doctor App:**
  Scanning a patient's QR code returns `{ isValid: true, entityId: "pat-profile-uuid" }`, but leaves the doctor with no permissions to access the scanned patient's medical records.

---

### Blocker 3: Missing Identity Resolution Route (`GET /api/v1/doctors/me`) (Features 1 & 2)
- **Root Cause Analysis:**
  `AuthController.getMe` returns `{ id: userId, email, phone, roles: ["DOCTOR"] }`. It does not return the `doctorProfileId`. In `DoctorController`, profile operations (`GET /api/v1/doctors/:id`, `PUT /api/v1/doctors/:id`, `GET /api/v1/doctors/:id/documents`) require the `doctorProfileId` (primary key of `doctor_profiles` table).
- **Flutter Workaround:**
  Upon logging in, the Flutter client must execute a search query: `GET /api/v1/doctors/search?q={doctorPhone}` to locate their own record and extract `id`.
- **Permanent Solution:**
  Add `GET /api/v1/doctors/me` to `DoctorController`.

---

## 3. Detailed Feature-by-Feature Analysis

### Feature 1 & 2: Doctor Registration & Profile Management
- **Classification:** `READY WITH LIMITATIONS`
- **Endpoints Available:**
  - `POST /api/v1/doctors` (`DoctorController.registerDoctor`)
  - `GET /api/v1/doctors/:id` (`DoctorController.getDoctorById`)
  - `PUT /api/v1/doctors/:id` (`DoctorController.updateDoctor`)
  - `POST /api/v1/doctors/:id/documents` (`DoctorController.attachDocument`)
  - `GET /api/v1/doctors/:id/documents` (`DoctorController.getDocuments`)
  - `GET /api/v1/doctors/:id/history` (`DoctorController.getHistory`)
  - `POST /api/v1/doctors/:id/renew-license` (`DoctorController.renewLicense`)
  - `POST /api/v1/doctors/:id/generate-qr` (`DoctorController.generateQr`)
- **Request / Response Payload Contract:**
  ```json
  // PUT /api/v1/doctors/:id
  {
    "consultationFee": 75.00,
    "bio": "Senior Consultant Cardiologist with 15+ years of clinical experience.",
    "languages": ["English", "Hindi", "Spanish"],
    "qualifications": ["MBBS", "MD - Cardiology", "FACC"]
  }
  // Response 200 OK:
  {
    "id": "doc-uuid",
    "userId": "user-uuid",
    "firstName": "Robert",
    "lastName": "Chen",
    "specialization": "Cardiology",
    "registrationNumber": "MCI-2015-88492",
    "verificationStatus": "VERIFIED",
    "consultationFee": 75.00,
    "bio": "Senior Consultant Cardiologist with 15+ years of clinical experience.",
    "languages": ["English", "Hindi", "Spanish"]
  }
  ```

---

### Feature 3: Facility Affiliation
- **Classification:** `READY`
- **Endpoints Available:**
  - `GET /api/v1/facilities` (`FacilityController.getFacilities`)
  - `GET /api/v1/facilities/:id` (`FacilityController.getFacilityById`)
  - `GET /api/v1/facilities/:id/departments` (`FacilityController.getDepartments`)
  - `GET /api/v1/facilities/:id/rooms` (`FacilityController.getRooms`)
  - `GET /api/v1/facilities/:id/doctors` (`FacilityController.getDoctors`)
- **Status:** Doctors can view facilities and check departmental affiliations. Assignments are managed by facility administrators via `POST /api/v1/facilities/:id/assign-doctor`.

---

### Feature 4: Patient Access via QR Code
- **Classification:** `BACKEND FIX REQUIRED`
- **Endpoints Available:**
  - `POST /api/v1/qr/verify` (`QrController.verifyQr`)
- **Payload Contract:**
  ```json
  // POST /api/v1/qr/verify
  {
    "token": "careid:v1:pat:3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "deviceInfo": "iPhone 15 Pro, iOS 18.1, Doctor App v1.0.0",
    "location": "Facility OPD Room 3"
  }
  // Response 200 OK:
  {
    "isValid": true,
    "status": "ACTIVE",
    "entityType": "PATIENT_PROFILE",
    "entityId": "pat-profile-uuid",
    "ownerId": "user-uuid",
    "scannedAt": "2026-10-30T09:00:00.000Z"
  }
  ```
- **Limitation:** Does not grant access permissions to patient medical records.

---

### Feature 5 & 6: Patient Records & Consultation Documentation
- **Classification:** `BACKEND FIX REQUIRED` / `API MISSING`
- **Status:** **CRITICAL LAUNCH BLOCKER**.
- **Remediation Plan:**
  Must be prioritized in Phase 5 before deploying the Doctor Flutter application.

---

### Feature 7: OCR Verification Workflow
- **Classification:** `READY WITH LIMITATIONS`
- **Endpoints Available:**
  - `GET /api/v1/ocr/review` (`OCRController.getReviewQueue`) — `@Roles('ADMIN', 'SUPER_ADMIN', 'DOCTOR', 'STAFF')`
  - `POST /api/v1/ocr/review/:jobId` (`OCRController.submitVerification`) — `@Roles('ADMIN', 'SUPER_ADMIN', 'DOCTOR', 'STAFF')`
  - `GET /api/v1/ocr/jobs/:id` (`OCRController.getJobById`)
  - `GET /api/v1/ocr/jobs/:id/fields` (`OCRController.getJobFields`)
  - `POST /api/v1/ocr/reprocess/:jobId` (`OCRController.reprocessJob`)
- **Request / Response Payload Contract:**
  ```json
  // POST /api/v1/ocr/review/:jobId
  {
    "corrections": [
      { "fieldName": "hemoglobin", "correctedValue": "14.2 g/dL", "notes": "Adjusted decimal place" }
    ],
    "verificationStatus": "VERIFIED",
    "verificationNotes": "Reviewed and confirmed against physical lab sheet"
  }
  // Response 200 OK:
  {
    "jobId": "ocr-job-uuid",
    "status": "COMPLETED",
    "verifiedBy": "user-uuid",
    "verifiedAt": "2026-10-30T09:15:00.000Z"
  }
  ```
- **Status:** Facility-scoped authorization (Phase 3.1 & 3.2) is fully in place. Doctors can review and verify OCR extractions.

---

### Feature 8: Referral Management
- **Classification:** `READY WITH LIMITATIONS`
- **Endpoints Available:**
  - `POST /api/v1/referrals` (`ReferralController.createReferral`)
  - `GET /api/v1/referrals/my-incoming` (`ReferralController.getMyIncomingReferrals`)
  - `GET /api/v1/referrals/my-outgoing` (`ReferralController.getMyOutgoingReferrals`)
  - `GET /api/v1/referrals/:id` (`ReferralController.getReferralById`)
  - `PUT /api/v1/referrals/:id/triage` (`ReferralController.triageReferral`)
  - `PUT /api/v1/referrals/:id/status` (`ReferralController.updateStatus`)
  - `POST /api/v1/referrals/:id/notes` (`ReferralController.addNote`)
  - `GET /api/v1/referrals/:id/notes` (`ReferralController.getNotes`)
  - `POST /api/v1/referrals/:id/attachments` (`ReferralController.addAttachment`)
- **Request / Response Payload Contract:**
  ```json
  // POST /api/v1/referrals
  {
    "patientId": "pat-profile-uuid",
    "receivingFacilityId": "facility-uuid",
    "receivingDoctorId": "doc-uuid",
    "specialtyRequired": "Neurology",
    "priority": "URGENT",
    "reasonForReferral": "Suspected transient ischemic attack (TIA)",
    "clinicalSummary": "Sudden onset left-sided weakness lasting 15 minutes, resolved spontaneously."
  }
  ```
- **Caveat:** `referringFacilityId` defaults to `'facility-uuid-default'`.

---

### Feature 9: Schedule and Availability Management
- **Classification:** `READY WITH LIMITATIONS`
- **Endpoints Available:**
  - `GET /api/v1/doctors/:id/slots` (`DoctorController.getSlots`) — Public authenticated
  - `POST /api/v1/schedules` (`ScheduleController.createSchedule`) — `@Roles('ADMIN', 'SUPER_ADMIN', 'FACILITY_ADMIN')`
  - `GET /api/v1/schedules/:id` (`ScheduleController.getScheduleById`) — `@Roles('ADMIN', 'SUPER_ADMIN', 'FACILITY_ADMIN')`
  - `POST /api/v1/schedules/:id/generate-slots` (`ScheduleController.generateSlots`) — `@Roles('ADMIN', 'SUPER_ADMIN', 'FACILITY_ADMIN')`
  - `POST /api/v1/schedules/:id/block` (`ScheduleController.blockSlot`) — `@Roles('ADMIN', 'SUPER_ADMIN', 'FACILITY_ADMIN')`
  - `POST /api/v1/schedules/:id/leave` (`ScheduleController.addLeaveBlock`) — `@Roles('ADMIN', 'SUPER_ADMIN', 'FACILITY_ADMIN')`
- **Limitations:** Doctors cannot directly edit their working hours or exceptions unless granted `FACILITY_ADMIN` privileges.

---

### Feature 10: Appointment Management
- **Classification:** `API MISSING`
- **Status:** `AppointmentController` is an empty stub.
- **Available Routes:** NONE.

---

### Feature 11: Doctor Notifications & Alerts
- **Classification:** `READY WITH LIMITATIONS`
- **Endpoints Available:**
  - `GET /api/v1/notifications`
  - `GET /api/v1/notifications/unread/count`
  - `PATCH /api/v1/notifications/:id/read`
  - `POST /api/v1/notifications/read-all`
  - `GET /api/v1/notifications/preferences`
  - `PUT /api/v1/notifications/preferences`
- **Status:** Polling-based notification feed is ready. Background push notifications require device token support.

---

## 4. Overall Readiness Score for Doctor Flutter App

- **Fully Ready Features:** 1 / 11 (9.1% — Facility Affiliation)
- **Ready with Limitations Features:** 6 / 11 (54.5% — Reg/Profile, OCR Review, Referrals, Slots, Alerts)
- **Backend Fix Required (Blockers):** 3 / 11 (27.3% — QR Grant, Patient Records, Consultation Notes)
- **APIs Missing:** 1 / 11 (9.1% — Appointments)

**Conclusion:** The Doctor Flutter application **cannot launch its core clinical workflows** (viewing patient history, writing consultation notes, booking appointments) until Phase 5 backend fixes are implemented. However, the Doctor Profile, OCR Verification Queue, and Referral Management modules are ready for UI development and testing.

