# CareID Backend — Phase 4.2: Patient Flutter API Readiness Audit

**Audit Date:** October 2026  
**Target Platform:** CareID Patient Mobile Application (Flutter iOS/Android)  
**Backend Reference:** NestJS 11.1.28 + TypeScript 5.7 + Prisma 7.9.1 + PostgreSQL  
**Audit Scope:** READ-ONLY Verification of 14 PRD Patient Features  

---

## 1. Feature Readiness Summary Matrix

| # | Patient Flutter Feature | Backend Classification | Endpoints Available | Key Limitations & Blockers |
|---|---|---|---|---|
| 1 | **Registration & Authentication** | `READY WITH LIMITATIONS` | 7 endpoints | Production OTP requires SMS gateway integration; works with test numbers |
| 2 | **Patient Profile Management** | `READY` | 11 endpoints | Full coverage of demographics, emergency contacts, blood group, allergies |
| 3 | **Health Card & QR Code** | `READY` | 6 endpoints | Card retrieval, dynamic QR code generation and validation fully functional |
| 4 | **Medical Records Timeline** | `READY WITH LIMITATIONS` | 4 endpoints | Returns unpaginated arrays; high record counts may impact mobile memory |
| 5 | **Dental Records** | `API MISSING` | 0 dedicated | No dental charting or tooth schema; must store as generic medical notes |
| 6 | **Vision Records** | `API MISSING` | 0 dedicated | No optometry refraction schema; must store as generic medical notes |
| 7 | **Diagnostic Reports & Lab Results** | `BACKEND FIX REQUIRED` | 7 endpoints | Downloads blocked by `virusScanStatus: PENDING`; requires virus scan fix |
| 8 | **Prescriptions Management** | `READY WITH LIMITATIONS` | 3 endpoints | Document-only (PDF/images); no structured medication dosage/refill models |
| 9 | **Document Upload & Storage** | `READY WITH LIMITATIONS` | 3 endpoints | Uploads succeed to Backblaze B2, but download fails closed due to scan status |
| 10 | **OCR Status & Results** | `READY WITH LIMITATIONS` | 6 endpoints | Workflow & persistence fully functional; OCR engine is simulated/mocked |
| 11 | **Referral Management** | `READY` | 5 endpoints | Patient can view referrals, attachments, triage notes, and lifecycle history |
| 12 | **Doctor & Facility Discovery** | `READY` | 6 endpoints | Full search and paginated directory listing for doctors and facilities |
| 13 | **Appointment Management** | `API MISSING` | 0 endpoints | `AppointmentController` is an empty stub (`// TODO: Phase 5 Implementation`) |
| 14 | **Notifications & In-App Alerts** | `READY WITH LIMITATIONS` | 6 endpoints | In-app alerts work; push (FCM) & SMS require delivery workers and device tokens |

---

## 2. Detailed Feature-by-Feature Analysis

### Feature 1: Registration and Authentication
- **Classification:** `READY WITH LIMITATIONS`
- **Endpoints Available:**
  - `POST /api/v1/auth/otp/request` (`AuthController.requestOtp`)
  - `POST /api/v1/auth/otp/verify` (`AuthController.verifyOtp`)
  - `POST /api/v1/auth/otp/resend` (`AuthController.resendOtp`)
  - `POST /api/v1/auth/token/refresh` (`AuthController.refreshToken`)
  - `POST /api/v1/auth/password/login` (`AuthController.passwordLogin`)
  - `POST /api/v1/auth/logout` (`AuthController.logout`)
  - `GET /api/v1/auth/me` (`AuthController.getMe`)
- **Request / Response Payload Contract:**
  ```json
  // POST /api/v1/auth/otp/request
  { "phone": "+16505550001", "purpose": "LOGIN" }
  // Response 201 Created:
  { "challengeId": "3fa85f64-5717-4562-b3fc-2c963f66afa6", "message": "OTP sent successfully to registered phone number" }

  // POST /api/v1/auth/otp/verify
  { "challengeId": "3fa85f64-5717-4562-b3fc-2c963f66afa6", "code": "123456", "phone": "+16505550001" }
  // Response 200 OK:
  {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": { "id": "uuid", "phone": "+16505550001", "roles": ["PATIENT"] }
  }
  ```
- **Flutter Integration Caveats:**
  1. In production (`APP_ENV=production`), `requestOtp` hashes a cryptographic random 6-digit number in the database, but does not invoke an SMS delivery API (Twilio/AWS SNS/Gupshup). Real production testing is blocked unless SMS provider credentials are configured or test numbers are used.
  2. Implement automatic token refresh using a Dio interceptor targeting `POST /api/v1/auth/token/refresh`. Refresh tokens are single-use with rotation tracking.

---

### Feature 2: Patient Profile Management
- **Classification:** `READY`
- **Endpoints Available:**
  - `GET /api/v1/patients/me` (`PatientController.getMe`)
  - `PUT /api/v1/patients/me` (`PatientController.updateMe`)
  - `GET /api/v1/patients/me/full` (`PatientController.getFullProfile`)
  - `PATCH /api/v1/patients/me/basic` (`PatientController.updateBasicDetails`)
  - `PATCH /api/v1/patients/me/contact` (`PatientController.updateContactDetails`)
  - `PATCH /api/v1/patients/me/address` (`PatientController.updateAddress`)
  - `PATCH /api/v1/patients/me/preferences` (`PatientController.updatePreferences`)
  - `PATCH /api/v1/patients/me/medical-summary` (`PatientController.updateMedicalSummary`)
  - `POST /api/v1/patients/me/photo` (`PatientController.uploadPhoto`)
  - `DELETE /api/v1/patients/me/photo` (`PatientController.deletePhoto`)
  - `GET /api/v1/patients/profile/completion` (`PatientController.getProfileCompletion`)
- **Request / Response Payload Contract:**
  ```json
  // GET /api/v1/patients/me
  {
    "id": "pat-profile-uuid",
    "userId": "user-uuid",
    "firstName": "John",
    "lastName": "Doe",
    "dateOfBirth": "1990-05-15",
    "gender": "MALE",
    "bloodGroup": "O_POSITIVE",
    "allergies": ["Penicillin", "Peanuts"],
    "chronicConditions": ["Hypertension"],
    "emergencyContactName": "Jane Doe",
    "emergencyContactPhone": "+16505550002",
    "emergencyContactRelation": "SPOUSE"
  }
  ```
- **Flutter Integration Caveats:**
  - `bloodGroup` must match the enum: `A_POSITIVE`, `A_NEGATIVE`, `B_POSITIVE`, `B_NEGATIVE`, `AB_POSITIVE`, `AB_NEGATIVE`, `O_POSITIVE`, `O_NEGATIVE`, `UNKNOWN`.
  - Photo upload expects `{ "storageKey": "path/in/b2" }`. Flutter should first upload the binary to B2 storage or use the attachment endpoint.

---

### Feature 3: Health Card and QR Code
- **Classification:** `READY`
- **Endpoints Available:**
  - `GET /api/v1/health-cards` (`HealthCardController.getCards`)
  - `GET /api/v1/health-cards/:id` (`HealthCardController.getCardById`)
  - `POST /api/v1/health-cards/:id/activate` (`HealthCardController.activateCard`)
  - `POST /api/v1/qr/generate` (`QrController.generateQr`)
  - `GET /api/v1/qr` (`QrController.getUserQrTokens`)
  - `GET /api/v1/qr/:id` (`QrController.getQrById`)
- **Request / Response Payload Contract:**
  ```json
  // POST /api/v1/qr/generate
  {
    "entityType": "PATIENT_PROFILE",
    "entityId": "pat-profile-uuid",
    "validityHours": 24,
    "purpose": "EMERGENCY_ACCESS"
  }
  // Response 201 Created:
  {
    "id": "qr-uuid",
    "token": "careid:v1:pat:3fa85f64...",
    "qrData": "careid:v1:pat:3fa85f64...",
    "expiresAt": "2026-10-31T08:00:00.000Z",
    "status": "ACTIVE"
  }
  ```
- **Flutter Integration Caveats:**
  - The Flutter client can render the `qrData` string using standard QR packages (`qr_flutter`).

---

### Feature 4: Medical Records Timeline
- **Classification:** `READY WITH LIMITATIONS`
- **Endpoints Available:**
  - `GET /api/v1/medical-records` (`MedicalRecordController.getRecords`)
  - `GET /api/v1/medical-records/timeline` (`MedicalRecordController.getTimeline`)
  - `GET /api/v1/medical-records/search?q=...` (`MedicalRecordController.searchRecords`)
  - `GET /api/v1/medical-records/:id` (`MedicalRecordController.getRecordById`)
- **Response Payload Contract:**
  ```json
  // GET /api/v1/medical-records/timeline
  [
    {
      "id": "rec-uuid",
      "type": "RECORD",
      "title": "Annual Routine Health Checkup",
      "date": "2026-07-31T10:00:00.000Z",
      "encounter": {
        "providerName": "Dr. Sarah Connor",
        "facilityName": "City General Hospital",
        "encounterType": "CONSULTATION"
      },
      "diagnoses": [{ "code": "E11.9", "description": "Type 2 Diabetes Mellitus" }],
      "vitalSigns": { "systolicBp": 120, "diastolicBp": 80, "pulseBpm": 72, "temperatureC": 36.6 }
    }
  ]
  ```
- **Flutter Integration Caveats:**
  - **No Pagination:** `GET /api/v1/medical-records/timeline` returns a bare array of all items. For patients with a large history, this can create latency and memory spikes. Local caching with Isar/Hive is recommended.

---

### Feature 5 & 6: Dental and Vision Records
- **Classification:** `API MISSING` / `PRD DOES NOT REQUIRE DEDICATED API`
- **Findings:**
  - There are NO dedicated routes (`/dental`, `/vision`) or Prisma models (`DentalRecord`, `VisionRecord`) in the backend.
  - Dental charting (tooth numbers 1–32, surfaces, periodontal measurements) and Vision optometry (OD/OS sphere, cylinder, axis, visual acuity) cannot be represented in structured format.
- **Flutter Integration Workaround:**
  - Map dental and vision encounters to general `MedicalRecord` objects, populating `chiefComplaint` and `clinicalNotes` with structured JSON strings or markdown, and uploading imaging/scans as `MedicalAttachment` with `category: IMAGE` or `category: OTHER`.

---

### Feature 7: Diagnostic Reports and Lab Results
- **Classification:** `BACKEND FIX REQUIRED` (Operational Blocker)
- **Endpoints Available:**
  - `GET /api/v1/reports` (`ReportController.getReports`)
  - `GET /api/v1/reports/:id` (`ReportController.getReportDetails`)
  - `GET /api/v1/reports/categories` (`ReportController.getCategories`)
  - `GET /api/v1/reports/timeline` (`ReportController.getTimeline`)
  - `GET /api/v1/reports/download/:id` (`ReportController.getDownloadUrl`)
  - `GET /api/v1/reports/download/:id/file` (`ReportController.downloadFile`)
  - `GET /api/v1/reports/preview/:id` (`ReportController.getPreview`)
- **Blocker Root Cause:**
  When a report attachment is uploaded, its `virusScanStatus` is set to `'PENDING'`. Because the backend does not run a ClamAV worker to transition this to `'CLEAN'`, `ReportService.getDownloadUrl`, `downloadFile`, and `getPreview` throw `400 Bad Request`:
  ```typescript
  if (!attachment.virusScanStatus || attachment.virusScanStatus !== 'CLEAN') {
    throw new BadRequestException('Attachment virus scan is pending or failed; download unavailable');
  }
  ```
- **Flutter Impact:** Patients can view report metadata in lists, but **cannot view, preview, or download PDFs/images** of newly uploaded reports.

---

### Feature 8: Prescriptions Management
- **Classification:** `READY WITH LIMITATIONS`
- **Endpoints Available:**
  - `GET /api/v1/reports?category=PRESCRIPTION`
  - `POST /api/v1/reports` (with `category: PRESCRIPTION`)
  - `GET /api/v1/medical-records/:id/attachments` (filtered by `category: PRESCRIPTION`)
- **Limitations:**
  - Prescriptions are handled strictly as uploaded files/documents (PDF scans or images).
  - There is no relational entity for medication items (e.g. drug name, dosage, frequency, course duration, refill count, pharmacy status).
- **Flutter Guidance:** The UI must be designed as a "Prescription Documents & Scans" viewer rather than an interactive medication reminder / digital pharmacy interface.

---

### Feature 9: Document Upload and Management
- **Classification:** `READY WITH LIMITATIONS`
- **Endpoints Available:**
  - `POST /api/v1/reports` (`ReportController.createReport`)
  - `POST /api/v1/medical-records/:id/attachments` (`MedicalRecordController.addAttachment`)
  - `POST /api/v1/attachments` (`MedicalRecordController.createAttachment`)
- **Payload Contract:**
  ```json
  // POST /api/v1/medical-records/:id/attachments
  {
    "fileName": "lab_report_2026.pdf",
    "originalName": "Blood_Work.pdf",
    "fileSize": 1048576,
    "mimeType": "application/pdf",
    "category": "LAB_RESULT",
    "storageKey": "medical-attachments/uuid/lab_report_2026.pdf",
    "storageUrl": "https://f000.backblazeb2.com/file/careid/...",
    "checksum": "a6b7c8..."
  }
  ```
- **Caveat:** The mobile client must manage storage upload (e.g. uploading binary to B2 storage) and pass metadata to the backend. The newly created attachment will have `virusScanStatus: PENDING`.

---

### Feature 10: OCR Status and Results
- **Classification:** `READY WITH LIMITATIONS (SIMULATED)`
- **Endpoints Available:**
  - `POST /api/v1/ocr/jobs` (`OCRController.submitJob`)
  - `GET /api/v1/ocr/jobs/:id` (`OCRController.getJobById`)
  - `GET /api/v1/ocr/jobs/:id/fields` (`OCRController.getJobFields`)
  - `GET /api/v1/ocr/jobs/:id/json` (`OCRController.getJobJson`)
  - `POST /api/v1/ai/ocr/extract` (`AiOcrController.extractDocument`)
  - `POST /api/v1/ai/ocr/confirm` (`AiOcrController.confirmOcr`)
- **Caveat:** Submitting an image triggers the state machine (`PREPROCESSING` -> `OCR_RUNNING` -> `EXTRACTING` -> `COMPLETED`), but the extracted text is hardcoded mock data. Safe for UI flow development, but cannot extract real clinical lab values yet.

---

### Feature 11: Referral Management
- **Classification:** `READY`
- **Endpoints Available:**
  - `GET /api/v1/referrals` (`ReferralController.getReferrals`)
  - `GET /api/v1/referrals/:id` (`ReferralController.getReferralById`)
  - `GET /api/v1/referrals/:id/notes` (`ReferralController.getNotes`)
  - `GET /api/v1/referrals/:id/attachments` (`ReferralController.getAttachments`)
  - `GET /api/v1/referrals/:id/history` (`ReferralController.getHistory`)
- **Response Contract:**
  ```json
  // GET /api/v1/referrals
  {
    "data": [
      {
        "id": "ref-uuid",
        "referralNumber": "REF-2026-0001",
        "patientId": "pat-profile-uuid",
        "referringDoctorId": "doc-uuid",
        "receivingFacilityId": "facility-uuid",
        "specialtyRequired": "Cardiology",
        "priority": "ROUTINE",
        "status": "SUBMITTED",
        "reasonForReferral": "Specialist evaluation for recurrent palpitations"
      }
    ],
    "total": 1
  }
  ```
- **Flutter Caveat:** Note the pagination envelope is `{ data: [...], total: n }` rather than `{ data: [...], meta: { ... } }`.

---

### Feature 12: Doctor and Facility Discovery
- **Classification:** `READY`
- **Endpoints Available:**
  - `GET /api/v1/doctors` (Paginated, `{ data, meta }`)
  - `GET /api/v1/doctors/search?q=...` (Bare array)
  - `GET /api/v1/doctors/:id` (Full profile)
  - `GET /api/v1/facilities` (Paginated, `{ data, meta }`)
  - `GET /api/v1/facilities/search?q=...` (Bare array)
  - `GET /api/v1/facilities/:id` (Facility details)
- **Status:** Fully functional. Patients can search by specialty, doctor name, facility location, and retrieve profiles.

---

### Feature 13: Appointment Management
- **Classification:** `API MISSING` (Critical Mobile Blocker)
- **Status:** `AppointmentController` is an empty stub.
- **Available Routes:** NONE.
- **Flutter Impact:** Appointment booking, schedule viewing, cancellation, and rescheduling cannot be integrated until Phase 5 backend implementation lands.

---

### Feature 14: Notifications and In-App Alerts
- **Classification:** `READY WITH LIMITATIONS`
- **Endpoints Available:**
  - `GET /api/v1/notifications` (`NotificationController.getNotifications`)
  - `GET /api/v1/notifications/unread/count` (`NotificationController.getUnreadCount`)
  - `PATCH /api/v1/notifications/:id/read` (`NotificationController.markAsRead`)
  - `POST /api/v1/notifications/read-all` (`NotificationController.markAllAsRead`)
  - `GET /api/v1/notifications/preferences` (`NotificationController.getPreferences`)
  - `PUT /api/v1/notifications/preferences` (`NotificationController.updatePreferences`)
- **Caveat:** In-app notification polling and badge counts work. However, there is no FCM device token registration route, so OS push notifications cannot be received while the app is in the background.

---

## 3. Overall Readiness Score for Patient Flutter App

- **Fully Ready Features:** 5 / 14 (35.7%)
- **Ready with Limitations Features:** 6 / 14 (42.9%)
- **Backend Fix Required (Blocker):** 1 / 14 (7.1% — Report Downloads)
- **APIs Missing:** 2 / 14 (14.3% — Appointments, Dental/Vision)

**Conclusion:** The Patient Flutter application can safely proceed with Authentication, Profile, Health Card, QR Code, Medical Timeline, Referrals, and Doctor/Facility Discovery. The Appointments feature must be disabled or hidden in the initial mobile build.

