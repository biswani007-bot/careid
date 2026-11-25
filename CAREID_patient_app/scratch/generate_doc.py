# Script to generate the comprehensive CareID Consolidated Backend API Requirements & Feature Gap Document

doc_content = """# CAREID PATIENT APP
# CONSOLIDATED BACKEND API REQUIREMENTS & FEATURE GAP DOCUMENT

**Purpose:** Comprehensive backend development specifications, interface contracts, and feature gap remediation derived from approved Patient App screens, user flows, and technical API acceptance audit.  
**Frontend Repository:** `C:\\Users\\PABANI\\CareID_patient_app\\Care_ID_Patient_App-main`  
**Backend Repository:** `C:\\Users\\PABANI\\Downloads\\hvapi-main\\hvapi-main`  
**API Base URL (Live Staging):** `https://360api.vnvision.in/api/v1`  
**Target Product:** CareID Patient Mobile App (Android / iOS)  
**Implementation Principle:** All approved frontend screens, navigation trees, visual styling, buttons, cards, forms, and micro-interactions are frozen and approved. No screen or UI component shall be removed, redesigned, replaced, hidden, or simplified. Backend APIs must be developed or adjusted to supply persistent, secure data to power every approved frontend capability.

---

# 1. DEVELOPMENT OBJECTIVE & ARCHITECTURAL FOUNDATION

The CareID Patient App frontend has been designed, reviewed, and approved for patient-facing healthcare operations. While the mobile app contains a polished design system and user flows, several screens historically operated on static prototype data, local fallback structures, or partial API connectivity.

The primary engineering objective is to transform every approved screen into an end-to-end persistent, backend-integrated capability powered by real database records, secure cloud document storage, and strict HIPAA/GDPR-compliant authorization.

The backend infrastructure must provide full operational support for:
1. **Patient Identity & Profile Lifecycle:** Demographic persistence, phone-based challenge-response authentication, JWT issuance, profile photo upload/streaming, and emergency (ICE) status.
2. **Tri-Category Health Records Engine:** Unified query and storage for Medical, Dental, and Vision clinical records.
3. **Multi-Attachment Document Management:** Native file picking, camera scans, multi-page document aggregation, persistent cloud storage (Backblaze B2/S3), reliable streaming, and pre-signed download URLs.
4. **Interactive Clinical Record Details:** Attending clinician credentials, clinic metadata, clinical observations, diagnostic timestamps, and verification audit badges.
5. **Record Operations:** Time-limited cryptographic sharing links, high-fidelity PDF exports, print-ready document streams, and cross-session favorites.
6. **Smart Digital Health Identity & Physical Interop:** Digital Health Card, dynamic time-restricted QR issuance/verification, and Apple/Google Wallet integration.
7. **Insurance Management & AI OCR:** Front/back insurance card image storage, asynchronous OCR field extraction, user confirmation/correction pipeline, and claim submission draft workflows.
8. **Doctor Directory & Smart Appointment Engine:** Provider directory with server-side specialty filtering, published availability slots, real-time hold reservations, conflict-free booking, rescheduling, and cancellation.
9. **Family Governance & Granular Consent:** Cross-patient invitations, dependent onboarding, relationship tracking, and per-record access delegation.
10. **Notification Center & Push Infrastructure:** Categorized in-app alerts, unread counters, bulk read actions, preference toggles, and APNs/FCM device token registration.
11. **Security, Row-Level Isolation & Audit Trails:** Zero cross-tenant data leaks, cryptographic QR validation, and non-repudiable audit logs for all clinical document access.

---

# 2. APPROVED SCREEN INVENTORY & DETAILED FIELD MAPPING

## 2.1 Authentication & Onboarding Module

### 2.1.1 Splash Page (`lib/features/auth/presentation/pages/splash_page.dart`)
* **Visible Approved Elements:** CareID animated brand logo, loading indicator, version badge.
* **Functional Behavior:** On boot, checks `SessionManager` for stored JWT tokens in encrypted disk storage.
  * If valid access/refresh tokens exist, probes `GET /patients/me/full`. If HTTP 200, restores session and routes to `/home`.
  * If tokens are expired, attempts `POST /auth/token/refresh`. If refresh succeeds, routes to `/home`.
  * If unauthenticated, expired, or revoked, transitions seamlessly to `/welcome` or `/login`.
* **Backend Route Mapping:**
  * `POST /auth/token/refresh` (Body: `{ refreshToken: string }`)
  * `GET /patients/me/full` (Header: `Authorization: Bearer <accessToken>`)

### 2.1.2 Login Page (`lib/features/auth/presentation/pages/login_page.dart`)
* **Visible Approved Elements:** Interactive country code dropdown (`+1`, `+91`, etc.), 10-to-15 digit mobile input field, language picker (`English`, etc.), biometric login shortcut button, "Send OTP" action button, and end-to-end security badge.
* **Functional Behavior:** Validates E.164 phone format, invokes OTP generation, retrieves cryptographic `challengeId`, starts countdown timer, and transitions to OTP verification.
* **Backend Route Mapping:**
  * `POST /auth/otp/request` (Body: `{ phoneNumber: string }`)
  * Existing Status: **RUNTIME VERIFIED**. Returns `{ success: true, data: { challengeId: string, expiresIn: number } }`.
  * Rate-Limiting Contract: Must return HTTP 429 with clear retry-after headers when threshold is exceeded.

### 2.1.3 OTP Verification Page (`lib/features/auth/presentation/pages/otp_verification_page.dart`)
* **Visible Approved Elements:** 6 responsive discrete PIN cells (`44x72`, rounded radius 16), auto-focus advancing, 60-second cooldown timer, "Resend Code" action, "Verify & Continue" gradient button, inline error toast, and "Identity Verified" confirmation state.
* **Functional Behavior:** Submits `challengeId` and 6-digit `otpCode`. On success, receives Access & Refresh tokens, securely stores credentials, and loads initial patient profile before landing on Home.
* **Backend Route Mapping:**
  * `POST /auth/otp/verify` (Body: `{ challengeId: string, otpCode: string }`)
  * Existing Status: **RUNTIME VERIFIED**. Returns `{ success: true, data: { accessToken: string, refreshToken: string, user: {...} } }`.

---

## 2.2 Home Screen & Digital Health ID (`lib/features/home/presentation/pages/home_page.dart`)

* **Visible Approved Elements:**
  1. Top App Bar: CareID brand header, Notification bell with unread badge, Patient Avatar (with green active presence dot).
  2. Digital Health ID Card:
     * Card gradient banner with watermark shield.
     * Patient Full Name (`Sarah Jenkins`).
     * Member-since year (`Member since 2021`).
     * In Case of Emergency (`ICE Active`) badge.
     * Date of Birth (`12/05/1992`).
     * Blood Group badge (`O Positive`).
     * Dynamic QR Code thumbnail.
     * "Add to Wallet" action button with wallet icon.
  3. Provider Invitation Banner: "Provider not registered? Click here to invite your provider to CareID".
  4. Health Records Hub:
     * Category Cards: **Medical** (Lab results & scans), **Dental** (Checkup & X-rays), **Vision** (Prescriptions & exams), **Pet** (Veterinary records).
  5. Floating Action Buttons:
     * **Scan Health Record** (initiates camera/storage document ingestion).
     * **Scan Insurance** (initiates insurance card capture).
  6. Upcoming Appointments Carousel: Attending doctor name, specialty, clinic location, appointment date/time, and status badge.
  7. Bottom Navigation Bar: Home, Records, Scan (Central elevated FAB), Doctor, Profile.
* **Backend Route Mapping:**
  * `GET /patients/me/full`: Supplies patient name, DOB, blood group, emergency contacts, profile photo.
  * `GET /health-cards`: Returns active health card ID, membership date, ICE status, and QR metadata.
  * `GET /health-cards/:id/wallet`: Generates `.pkpass` (Apple) or Google Wallet pass payload.
  * `GET /records?patientId=:id`: Supplies category counts for Medical, Dental, and Vision.
  * `GET /appointments/patient/my-appointments?status=UPCOMING`: Supplies upcoming appointment banner.

---

## 2.3 Smart Digital Health Card Screen (`lib/features/health_card/presentation/pages/smart_card_page.dart`)

* **Visible Approved Elements:**
  * Interactive 3D flip card (Front: Full demographic identity, photo, member ID, blood group, allergies; Back: Emergency contacts, ICE physician phone, organ donor status, insurance summary).
  * High-resolution full-screen QR code with rotating cryptographic signature.
  * NFC transmission indicator ("Hold near reader to share emergency profile").
  * Native "Add to Apple Wallet" / "Add to Google Wallet" buttons.
  * Action tray: "Share Emergency ID", "Download PDF ID", "Lock Card".
* **Backend Route Mapping:**
  * `GET /health-cards`: Fetches active card details.
  * `POST /health-cards/:id/activate` & `POST /health-cards/:id/deactivate`: Card locking/unlocking.
  * `POST /qr`: Generates short-lived encrypted QR payload (`entityType: 'HEALTH_CARD'`).
  * `GET /health-cards/:id/wallet/apple` & `GET /health-cards/:id/wallet/google`: Direct pass downloads.

---

# 3. HEALTH RECORD MANAGEMENT — TRI-CATEGORY ENGINE

The Patient App enforces a strict tri-category separation across clinical records. The backend must index and filter records based on `category: 'MEDICAL' | 'DENTAL' | 'VISION'`.

## 3.1 Medical Records (`category: 'MEDICAL'`)
* **Record Subcategories:** `LAB_REPORT`, `PRESCRIPTION`, `BLOOD_TEST`, `DISCHARGE_SUMMARY`, `CLINICAL_NOTE`, `DIAGNOSTIC_IMAGING`, `IMMUNISATION`.
* **Clinical Fields Required:**
  * `recordId`: UUIDv4.
  * `title`: Human-readable title (e.g., "Full Blood Count Analysis").
  * `serviceDate`: ISO 8601 date of consultation/test.
  * `doctorName`: Attending physician name.
  * `facilityName`: Hospital or laboratory clinic name.
  * `diagnosis`: Primary ICD-10 or clinical description.
  * `observations`: Comprehensive doctor's clinical notes.
  * `attachments`: Array of attached files (PDF, JPG, PNG, DICOM).
  * `verificationStatus`: `VERIFIED` | `PENDING` | `UNVERIFIED`.
  * `isFavorite`: Boolean flag.

## 3.2 Dental Records (`category: 'DENTAL'`)
* **Visible Approved Demonstration:** The Record Details screen specifically exhibits a **Dental X-Ray** examination:
  * Record Title: "Dental X-Ray".
  * Subcategory: `DENTAL_XRAY` | `ORTHODONTIC_SCAN` | `DENTAL_EXAMINATION` | `PERIODONTAL_CHART`.
  * Visual Hero Asset: High-resolution panoramic dental orthopantomogram (OPG).
  * Attending Provider: Dr. Michael Vance, DDS (License: `#OD-7721`, Specialty: `Dentist & Orthodontist`, Clinic: `Dental Care Specialists`, Address: `Suite 210, Metro Eye Pavilion`).
  * Primary Diagnosis: "Routine Dental Examination - Annual check-up, no significant abnormalities in jaw structure or tooth alignment".
  * Specific Attachments Visible in UI:
    1. `Dental X-Ray Observations.pdf` (3.1 MB, Official Diagnostic Document).
    2. `Dental X-Ray.jpg` (1.4 MB, High Resolution Scan).
* **Backend Requirements:**
  * Support dental record creation with category `DENTAL`.
  * Preserve multi-attachment binding (PDF report + raw X-ray scan).
  * Link dentist license number, clinic address, and orthodontic observations.

## 3.3 Vision Records (`category: 'VISION'`)
* **Record Subcategories:** `OPTOMETRY_EXAM`, `REFRACTION_TEST`, `PRESCRIPTION_GLASSES`, `CONTACT_LENS_FITTING`, `RETINAL_OCT_SCAN`.
* **Clinical Fields Required:**
  * Sphere (SPH), Cylinder (CYL), Axis, and Add parameters for left/right eyes.
  * Visual Acuity (e.g., 20/20, 6/6).
  * Attending Optometrist/Ophthalmologist details and clinic pavilion.
  * Prescribed lens specifications and diagnostic image attachments.

---

# 4. RECORD UPLOAD & DOCUMENT STORAGE LIFECYCLE

The document lifecycle is the core technical bottleneck. Uploaded files must be securely ingested, persisted in object storage (Backblaze B2/S3), cataloged in PostgreSQL, and streamed back with zero latency or timeouts.

```
+-----------------------------------------------------------------------------------+
|                        CareID Document Ingestion Pipeline                        |
+-----------------------------------------------------------------------------------+
| Mobile App (Flutter)       API Gateway (NestJS)             Object Storage (B2)   |
|                                                                                   |
| 1. Select File/Camera ---> POST /records/:id/attachments                           |
|    (multipart/form-data)   ├─ Validate MIME & Size                                |
|                            ├─ Compute SHA-256 Checksum                            |
|                            ├─ Encrypt at rest (AES-256)                           |
|                            └─ Stream to Bucket ----------> attachments/{key}      |
|                                                                                   |
| 2. Document Retrieval <--- GET /attachments/:id/download-url                      |
|    (Pre-signed URL)        └─ Returns 15-min Expiring S3 URL (Direct Download)    |
|                                                                                   |
| 3. Inline Viewer      <--- GET /attachments/file/:filename                        |
|    (Piped Stream)          └─ Stream Proxy with error-handlers (Express res.pipe) |
+-----------------------------------------------------------------------------------+
```

## 4.1 Ingestion Sources
1. **Device Storage Picker:** Allows selection of existing `.pdf`, `.jpg`, `.jpeg`, `.png`, and `.tiff` files up to 25 MB.
2. **Camera Document Scanner:** Multi-page image capture, automatic perspective cropping, and PDF compilation before upload.

## 4.2 Document Metadata Model (PostgreSQL)
Every uploaded file must persist the following database fields:
* `id`: UUIDv4 primary key.
* `patientId`: UUIDv4 (foreign key to `patient_profiles`).
* `recordId`: UUIDv4 (foreign key to `medical_records`, optional on initial draft).
* `filename`: Sanitized original file name.
* `storedKey`: Unique object key in Backblaze B2 (e.g., `patients/{patientId}/records/{uuid}.pdf`).
* `mimeType`: Verified MIME type (never trust client header alone).
* `fileSize`: Exact byte length.
* `checksumSha256`: Hexadecimal SHA-256 checksum for end-to-end integrity.
* `category`: `MEDICAL` | `DENTAL` | `VISION` | `INSURANCE`.
* `documentType`: `OFFICIAL_DIAGNOSTIC_DOCUMENT` | `HIGH_RESOLUTION_SCAN` | `LAB_REPORT`.
* `storageProvider`: `BACKBLAZE_B2`.
* `uploadedAt`: Timestamp with timezone.

## 4.3 Remediation of Backblaze B2 Stream-Hanging Issue (`GET /attachments/file/:filename`)
* **Root Cause Identified in Audit:** In `medical-record.service.ts` (lines 585–596), the code proxies B2 streams using `stream.pipe(res)`. When a stream encounters an upstream network glitch, socket drop, or missing key, no `'error'` listener is attached. Consequently, Express's `res` is never closed, causing the client HTTP connection to hang indefinitely until socket timeout.
* **Backend Fix Required:**
  ```typescript
  import { pipeline } from 'stream/promises';

  async getAttachmentStream(filename: string, res: Response) {
    try {
      const { stream, contentType, contentLength } = 
        await this.b2StorageService.getObjectStream(`attachments/${filename}`);
      
      res.setHeader('Content-Type', contentType || 'application/octet-stream');
      res.setHeader('Content-Length', contentLength);
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      res.setHeader('Cache-Control', 'private, max-age=3600');
      
      // Use pipeline to automatically handle stream errors and close res
      await pipeline(stream, res);
    } catch (error) {
      if (!res.headersSent) {
        throw new NotFoundException('Attachment file could not be streamed');
      }
      res.end();
    }
  }
  ```
* **Recommended Modern Architecture:** Client applications should prioritize `GET /attachments/:id/download-url`, which returns a pre-signed S3 URL with a 15-minute expiration, allowing the mobile client to download directly from the storage CDN without putting load on the NestJS API gateway.

---

# 5. RECORD DETAILS SCREEN SPECIFICATION

Every field visible in the approved Record Details screen must be populated dynamically via `GET /records/:id`:

| UI Section | Visible Element | Backend Field Contract | Data Type | Example Value |
| :--- | :--- | :--- | :--- | :--- |
| **Header** | Record ID Header | `record.recordNumber` | String | `"#VIS-512-094"` |
| **Security Banner** | Encryption Status | `record.isEncrypted` | Boolean | `true` ("End-to-End Encrypted") |
| **Preview** | Hero Document Badge | `record.previewAttachment.type` | String | `"PDF Report • 2.4 MB"` |
| **Preview** | Resolution Badge | `record.previewAttachment.resolution`| String | `"HIGH-RES OCT EXPORT"` |
| **Record Info** | Record Title | `record.title` | String | `"Dental X-Ray"` |
| **Record Info** | CareID Badge | `record.isCareIdVerified` | Boolean | `true` |
| **Record Info** | Last Accessed | `record.lastAccessedAt` | ISO Date | `"Oct 18, 2023 • 11:20 AM"` |
| **Attending Provider**| License Number | `record.doctor.licenseNumber` | String | `"Lic. #OD-7721"` |
| **Attending Provider**| Provider Name | `record.doctor.fullName` | String | `"Dr. Michael Vance"` |
| **Attending Provider**| Specialty | `record.doctor.specialty` | String | `"Dentist & Orthodontist"` |
| **Attending Provider**| Clinic Name | `record.clinic.name` | String | `"Dental Care Specialists"` |
| **Attending Provider**| Clinic Address | `record.clinic.address` | String | `"Suite 210, Metro Eye Pavilion"`|
| **Clinical Details** | Record Type | `record.recordType` | String | `"Dental Record"` |
| **Clinical Details** | Service Date | `record.serviceDate` | Date | `"2023-10-04"` |
| **Clinical Details** | Patient Name | `record.patient.fullName` | String | `"Sarah Jenkins"` |
| **Clinical Details** | Patient CareID | `record.patient.careId` | String | `"CID-8472-9901"` |
| **Clinical Details** | Primary Diagnosis | `record.primaryDiagnosis` | String | `"Routine Dental Examination"` |
| **Clinical Details** | Security Audit | `record.auditStatus` | String | `"CareID Authenticated"` |
| **Attachments** | Total Count & Size | `record.attachmentSummary` | Object | `{ count: 2, totalBytes: 4718592 }` |
| **Observations** | Doctor Observations | `record.clinicalNotes` | Text | `"Routine panoramic X-ray taken..."`|
| **Observations** | Notes Timestamp | `record.notesUpdatedAt` | ISO Date | `"Oct 05, 2023"` |

---

# 6. RECORD SHARING, DOWNLOAD, PRINT & FAVORITES

## 6.1 Cryptographic Share Link (`POST /records/:id/share`)
* **Current Gap:** Currently falls back to native OS text sharing. Requires a dedicated backend access token.
* **Required Backend Contract:**
  * Endpoint: `POST /records/:id/share`
  * Request Body: `{ expiresInHours: number (default: 48), allowedViews: number (optional), recipientEmail?: string }`
  * Response Body: `{ shareId: string, shareUrl: string, expiresAt: string, accessPasscode: string }`
  * Revocation Endpoint: `DELETE /records/:id/share/:shareId`

## 6.2 Full Record PDF Export (`GET /records/export?format=PDF`)
* **Current Status:** **RUNTIME VERIFIED**. Returns HTTP 200 with `%PDF` header (3,408 bytes).
* **Requirement:** Must accept specific record targeting: `GET /records/:id/export?format=PDF` to generate a clinical summary containing clinic letterhead, provider signature, and embedded attachment thumbnails.

## 6.3 Persistent Favorites Engine
* **Current Gap:** UI toggle operates in local memory.
* **Required Endpoints:**
  * `POST /records/:id/favorite` (Marks record as favorite for authenticated patient).
  * `DELETE /records/:id/favorite` (Removes favorite status).
  * `GET /records?isFavorite=true` (Filters user favorites).

---

# 7. INSURANCE & CLAIMS PLATFORM

```
+-----------------------------------------------------------------------------------+
|                         Insurance Card & OCR Lifecycle                            |
+-----------------------------------------------------------------------------------+
| Mobile App (Flutter)       API Gateway (NestJS)             AI OCR Engine         |
|                                                                                   |
| 1. Capture Front/Back ---> POST /insurance/ocr                                    |
|    (Multipart Images)      ├─ Upload images to B2                                 |
|                            └─ Queue Extraction Job -------> ocr_jobs worker       |
|                                                               ├─ Google Cloud Vision|
| 2. Poll Status        <--- GET /insurance/ocr/:jobId          └─ Parse Fields     |
|    (or WebSocket)          └─ Returns Status: COMPLETED                           |
|                                                                                   |
| 3. Verify & Correct   ---> POST /insurance/ocr/confirm                            |
|    (User Edits in UI)      └─ Persists to insurance_cards table in PostgreSQL     |
|                                                                                   |
| 4. Submit Claim Draft ---> POST /insurance/claims                                 |
|    (Link Medical Records)  └─ Generates Claim Reference Number                    |
+-----------------------------------------------------------------------------------+
```

## 7.1 Insurance Card Data Model
* `GET /patients/:id/insurance-cards`: Returns all stored physical cards.
* Fields: `cardId`, `providerName`, `policyNumber`, `memberId`, `groupNumber`, `effectiveDate`, `expirationDate`, `copayAmount`, `frontImageUrl`, `backImageUrl`, `status: 'ACTIVE' | 'EXPIRED'`.

## 7.2 Claim Draft Submission (`POST /insurance/claims`)
* **Verified Backend Status:** Present in `insurance.controller.ts` (`createClaimDraft` method).
* **Request DTO:**
  * `policyId`: string (UUIDv4).
  * `totalAmount`: number (e.g., 1250.50).
  * `diagnosisCodes`: string[] (e.g., `["ICD10-K02.9"]`).
  * `serviceDate`: string (ISO date).
  * `recordIds`: string[] (UUIDs of linked medical/dental records).
  * `notes`: string (patient remarks).
* **Response:** `{ claimId: string, claimNumber: string, status: 'DRAFT' | 'SUBMITTED', submittedAt: string }`.

---

# 8. APPOINTMENTS & DOCTOR DIRECTORY

## 8.1 Doctor Search & Availability Slots
* **Existing Endpoint:** `GET /doctors/search?q={query}` (Verified in `doctor.controller.ts`).
* **Existing Slots Endpoint:** `GET /doctors/:id/slots`.
* **Backend Enhancement Required:**
  * Support specialty filtering: `GET /doctors?specialty=Dentist&city=New+York`.
  * Support slot filtering by date range: `GET /doctors/:id/slots?startDate=2026-11-15&endDate=2026-11-20`.

## 8.2 Conflict-Free Slot Hold & Booking
* **Hold Endpoint:** `POST /appointments/holds` (Present in `appointment.controller.ts`).
  * Locks a 15-minute slot while the patient fills out intake details to prevent double-booking.
* **Booking Endpoint:** `POST /appointments`.
  * Request Body: `{ doctorProfileId: string, appointmentDate: "YYYY-MM-DD", startTime: "HH:mm", durationMinutes: 30, reason: string, holdId?: string }`.
* **Lifecycle Endpoints:**
  * `PATCH /appointments/:id/reschedule` (`{ newDate: string, newStartTime: string }`).
  * `PATCH /appointments/:id/cancel` (`{ cancellationReason: string }`).

---

# 9. FAMILY GOVERNANCE & CONSENT DELEGATION

* **Approved Screens:** Family Member List, Invite Relative Sheet, Dependent Profile, Consent Manager.
* **Existing Backend Endpoints:**
  * `POST /family/invitations` (`{ inviteePhone: string, relationship: string, inviteeName?: string }`).
  * `GET /family/members`: Lists accepted family members.
  * `GET /family/dependents`: Lists minor/elderly dependents managed directly by patient.
  * `POST /family/consents`: Creates granular access rule (`{ granteeId: string, recordCategories: ['MEDICAL', 'DENTAL'], accessLevel: 'READ_ONLY', expiresAt: string }`).
* **Enforcement Rule:** A family relationship alone **must never** automatically expose medical records. The query engine must join against `family_consents` and verify active validity before returning records.

---

# 10. NOTIFICATION CENTER & DEVICE PUSH

* **Existing Endpoints:**
  * `GET /notifications`: Fetches paginated in-app alerts.
  * `PUT /notifications/:id/read`: Marks single item as read.
  * `GET /notifications/preferences` & `PUT /notifications/preferences`: Toggles SMS/Email/Push per category (`APPOINTMENTS`, `RECORDS`, `BILLING`).
* **Missing Backend Capabilities:**
  1. **Mark All As Read:** `PUT /notifications/read-all` (Updates all unread notifications for the patient).
  2. **Unread Counter:** `GET /notifications/unread-count` (Returns `{ unreadCount: number }` for the home bell badge).
  3. **Push Token Registration:** `POST /notifications/devices` (`{ token: string, platform: 'ANDROID' | 'IOS', deviceModel: string }`).

---

# 11. PERSONAL DETAILS & PROFILE PERSISTENCE

* **Approved Screen Elements:** Avatar photo with camera picker, Full Name, DOB, Gender, Blood Group, Mobile, Email, Residential Address, "Save Details", "Discard Changes".
* **Backend Endpoint Mapping:**
  * `GET /patients/me/full`: Complete profile data.
  * `PATCH /patients/me/basic`: `{ firstName: string, lastName: string, dateOfBirth: string, gender: string, bloodGroup: string }`.
  * `PATCH /patients/me/contact`: `{ email: string, phone: string }`.
  * `PATCH /patients/me/address`: `{ addressLine1: string, city: string, state: string, postalCode: string, country: string }`.
  * `POST /patients/me/photo`: Multipart image upload (JPEG/PNG, max 5 MB).
  * `DELETE /patients/me/photo`: Resets profile avatar to default initials.

---

# 12. SECURITY, ACCESS CONTROL & AUDIT LOGGING

1. **Row-Level Patient Isolation:** Every database query touching records, attachments, appointments, or notifications must enforce `WHERE patient_id = :authenticatedPatientId`. Attempting to query another patient's UUID must immediately return HTTP 403 Forbidden.
2. **Download URL Expiration:** Pre-signed URLs generated via `GET /attachments/:id/download-url` must enforce a maximum 15-minute Time-To-Live (TTL).
3. **Comprehensive Clinical Audit Trail:**
   * Every document view, PDF export, or share link generation must write an entry to `audit_logs` containing: `patientId`, `action: 'VIEW' | 'DOWNLOAD' | 'SHARE'`, `resourceId`, `ipAddress`, `userAgent`, and `timestamp`.

---

# 13. CONSOLIDATED MISSING & UNVERIFIED BACKEND CAPABILITIES (PRIORITIZED)

```
+-----------------------------------------------------------------------------------+
|                        Feature Gap Priority Matrix                               |
+-----------------------------------------------------------------------------------+
| Priority | Capability                        | Proposed Endpoint                  |
+----------+-----------------------------------+------------------------------------+
| P0       | B2 Streaming Hang Fix             | GET /attachments/file/:filename    |
| P0       | Direct Pre-signed Download URL    | GET /attachments/:id/download-url |
| P0       | Patient Document Attachment Upload| POST /records/:id/attachments      |
| P0       | Complete Record Details Mapping   | GET /records/:id                   |
| P1       | Record Cryptographic Share Link   | POST /records/:id/share            |
| P1       | Persistent Favorites Engine       | POST/DELETE /records/:id/favorite  |
| P1       | Doctor Search & Specialty Filter  | GET /doctors?specialty=&search=    |
| P1       | Insurance Claim Draft Submission  | POST /insurance/claims             |
| P2       | Notifications Mark All Read       | PUT /notifications/read-all        |
| P2       | In-App Notification Unread Count  | GET /notifications/unread-count    |
| P2       | Push Notification Token Registry  | POST /notifications/devices        |
| P3       | Dynamic Pass Generation for Wallet| GET /health-cards/:id/wallet       |
+-----------------------------------------------------------------------------------+
```

---

# 14. REQUIRED API CONTRACT DELIVERABLES FROM BACKEND TEAM

For each endpoint remediation or new capability, the backend team must deliver:
1. **NestJS Controller & Service Implementation:** Located within the relevant module (`src/modules/*`).
2. **Strict Class-Validator DTOs:** All payload fields decorated with `@IsNotEmpty()`, `@IsUUID()`, `@IsString()`, etc.
3. **Swagger / OpenAPI 3.0 Documentation:** Fully annotated with `@ApiOperation()`, `@ApiProperty()`, and `@SwaggerResponse()`.
4. **Postman Collection Update:** Exported environment and request collection verified against the live staging cluster (`https://360api.vnvision.in/api/v1`).

---

# 15. ACCEPTANCE CRITERIA FOR BACKEND HANDOFF

A backend capability will be deemed accepted only when:
1. **Registered Route:** The endpoint is registered and accessible over HTTPS.
2. **Authentication Enforcement:** Rejects unauthenticated requests with HTTP 401.
3. **Authorization Enforcement:** Rejects cross-tenant access with HTTP 403.
4. **Data Persistence:** Mutations write cleanly to PostgreSQL and survive container restarts.
5. **Roundtrip Consistency:** Immediate subsequent `GET` requests return the updated fields.
6. **Object Storage Integrity:** Uploaded files persist in Backblaze B2 and return correct byte streams.
7. **Timeout Resilience:** File streaming or download operations complete in < 2 seconds with zero hanging.
8. **Predictable Errors:** Validation failures return standard `{ success: false, error: { code: string, message: string } }`.

---

# 16. FRONTEND INTEGRATION PLAN AFTER BACKEND DELIVERY

Following backend delivery, the mobile engineering team will execute the following integrations:
1. **Service Binding:** Bind `ApiClient` methods to the verified endpoints.
2. **Remove Fallbacks:** Swap local mock data models with live response DTOs in controllers/providers.
3. **Native Document Ingestion:** Wire mobile file picker and camera scanner to `POST /records/:id/attachments`.
4. **Document Viewer:** Connect `DocumentViewerPage` directly to pre-signed B2 download URLs.
5. **Insurance OCR Flow:** Wire card capture to `POST /insurance/ocr` and auto-fill manual form with extracted fields.
6. **Appointments:** Wire slot reservation hold timer and live booking confirmation.
7. **Design Preservation:** Verify that all screens retain 100% visual fidelity to approved Figma designs.

---

# 17. FINAL DEVELOPMENT INSTRUCTION

The CareID Patient App frontend represents a finalized, approved clinical user interface. Under no circumstances should frontend screens, cards, actions, or forms be modified or stripped down to bypass backend limitations.

The backend engineering team is instructed to treat every visible user interaction documented herein as an absolute product requirement. Where backend capabilities exist in codebase, expose and document them; where gaps or bugs exist (such as the B2 streaming hang), remediate them immediately according to the technical contracts established in this document.

**Goal:** Every visible approved Patient App action must have a real, secure, persistent, and testable backend implementation.
"""

with open("analysis_reports/CAREID_PATIENT_APP_CONSOLIDATED_BACKEND_REQUIREMENTS_AND_FEATURE_GAPS.md", "w", encoding="utf-8") as f:
    f.write(doc_content)

print("Document generated successfully! Size:", len(doc_content), "bytes.")

