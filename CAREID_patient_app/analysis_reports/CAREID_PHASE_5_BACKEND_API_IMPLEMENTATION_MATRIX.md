# CAREID PATIENT APP — PHASE 5 BACKEND API IMPLEMENTATION MATRIX

**Audit Timestamp:** 2026-11-16T21:30:00+05:30  
**Backend Source:** `C:\Users\PABANI\Downloads\hvapi-main\hvapi-main`  
**Backend Architecture:** NestJS + TypeScript + TypeORM + PostgreSQL + Backblaze B2  
**Controllers Scanned:** 45 Controllers  
**Total Backend Endpoints:** 485 Endpoints  

---

## 1. Executive Summary

This report establishes the complete contract matrix between the NestJS backend controllers and the CareID Patient Application. Every controller in the backend codebase was audited to determine which endpoints serve the mobile patient persona versus staff, doctor, hospital admin, and super-admin personas.

---

## 2. Patient Domain Controller Audit & Utilization Breakdown

| Controller Name | File Path | Total Endpoints | Endpoints Consumed by Patient App | Patient Integration Status |
|---|---|---|---|---|
| `AuthController` | `src/modules/auth/presentation/controllers/auth.controller.ts` | 14 | 5 | **FULLY INTEGRATED** (Request OTP, Verify OTP, Refresh Token, Logout, Me) |
| `PatientController` | `src/modules/patient/presentation/controllers/patient.controller.ts` | 18 | 6 | **FULLY INTEGRATED** (Me/Full, Basic, Contact, Address, Photo, Medical-Summary) |
| `RecordController` | `src/modules/medical-record/presentation/controllers/record.controller.ts` | 16 | 6 | **FULLY INTEGRATED** (List, Details, Dental, Vision, Timeline, Export PDF) |
| `AttachmentController` | `src/modules/medical-record/presentation/controllers/attachment.controller.ts` | 10 | 3 | **FULLY INTEGRATED** (Upload Multipart, Download Presigned URL, Metadata) |
| `AppointmentController` | `src/modules/appointment/presentation/controllers/appointment.controller.ts` | 24 | 7 | **FULLY INTEGRATED** (List, Details, My Appointments, Book, Reschedule, Cancel, Hold) |
| `DoctorController` | `src/modules/doctor/presentation/controllers/doctor.controller.ts` | 15 | 3 | **FULLY INTEGRATED** (Directory List, Doctor Profile by ID, Schedules) |
| `FamilyController` | `src/modules/family/presentation/controllers/family.controller.ts` | 18 | 7 | **FULLY INTEGRATED** (Members List, Remove, Invitations List, Create, Resend, Cancel, Consents) |
| `InsuranceController` | `src/modules/insurance/presentation/controllers/insurance.controller.ts` | 16 | 5 | **FULLY INTEGRATED** (Policies List, Policy Details, Cards List, Create Card, Confirm OCR) |
| `OcrController` | `src/modules/ocr/presentation/controllers/ocr.controller.ts` | 8 | 4 | **FULLY INTEGRATED** (Submit Job, Job Status, Extracted Fields, Confirm) |
| `NotificationController` | `src/modules/notification/presentation/controllers/notification.controller.ts` | 12 | 4 | **FULLY INTEGRATED** (List, Mark Read, Mark All Read, Preferences) |
| `FacilityController` | `src/modules/facility/presentation/controllers/facility.controller.ts` | 12 | 2 | **FULLY INTEGRATED** (Directory Search, Facility Details) |
| `TreatmentOfferController` | `src/modules/treatment-offer/presentation/controllers/treatment_offer.controller.ts` | 14 | 3 | **INTEGRATED (READ-ONLY)** (List, Details, Accept) |

---

## 3. Detailed Endpoint Contracts for Patient App

### 3.1 Authentication & Profile
- **`POST /api/v1/auth/request-otp`**
  - **DTO:** `RequestOtpDto` (`{ phone: string }`)
  - **Flutter Service:** `AuthService.requestOtp()`
  - **Response:** `{ success: true, message: "OTP sent" }`
- **`POST /api/v1/auth/verify-otp`**
  - **DTO:** `VerifyOtpDto` (`{ phone: string, otp: string }`)
  - **Flutter Service:** `AuthService.verifyOtp()`
  - **Response:** `{ token: string, refreshToken: string, user: { id, phone, role } }`
- **`GET /api/v1/patients/me/full`**
  - **Auth:** Bearer JWT (Patient Role)
  - **Flutter Service:** `PatientService.getMyFullProfile()`
  - **Response DTO:** `PatientFullProfileDto` (Identity, address, emergency contacts, medical summary, blood type)
- **`PATCH /api/v1/patients/me/basic`**
  - **DTO:** `UpdateBasicPatientDto` (`{ firstName, lastName, dateOfBirth, gender, nationalId }`)
  - **Flutter Service:** `PatientService.updateBasicProfile()`
- **`PATCH /api/v1/patients/me/contact`**
  - **DTO:** `UpdateContactInfoDto` (`{ phone, email, emergencyContactName, emergencyContactPhone }`)
  - **Flutter Service:** `PatientService.updateContactInfo()`
- **`PATCH /api/v1/patients/me/address`**
  - **DTO:** `UpdateAddressDto` (`{ streetAddress, city, state, postalCode, country }`)
  - **Flutter Service:** `PatientService.updateAddress()`

### 3.2 Appointments & Doctors
- **`GET /api/v1/doctors`**
  - **Flutter Service:** `AppointmentsService.getDoctors()`
  - **Response:** List of Doctor entities with specialization, facility, rating, bio, accepted insurances.
- **`GET /api/v1/appointments`** / **`GET /api/v1/appointments/patient/my-appointments`**
  - **Flutter Service:** `AppointmentsService.getMyAppointments()`
  - **Response:** List of Patient Appointments with status (`UPCOMING`, `COMPLETED`, `CANCELLED`).
- **`POST /api/v1/appointments`**
  - **DTO:** `CreateAppointmentDto` (`{ doctorProfileId: UUID, appointmentDate: "YYYY-MM-DD", startTime: "HH:mm", durationMinutes: 15, type: "IN_PERSON" }`)
  - **Flutter Service:** `AppointmentsService.bookAppointment()`
  - **Status:** HTTP 201 Created.
- **`PATCH /api/v1/appointments/:id/reschedule`**
  - **DTO:** `RescheduleAppointmentDto` (`{ appointmentDate: "YYYY-MM-DD", startTime: "HH:mm" }`)
  - **Flutter Service:** `AppointmentsService.rescheduleAppointment()`
  - **Status:** HTTP 200 OK.
- **`PATCH /api/v1/appointments/:id/cancel`**
  - **DTO:** `CancelAppointmentDto` (`{ cancellationReason: string }`)
  - **Flutter Service:** `AppointmentsService.cancelAppointment()`
  - **Status:** HTTP 200 OK.

### 3.3 Clinical Records & Attachments
- **`GET /api/v1/records`**
  - **Flutter Service:** `HealthRecordsService.getRecords()`
  - **Response:** Complete EHR entries with clinical notes, diagnostics, attending physician, and attachments.
- **`GET /api/v1/records/dental`**
  - **Flutter Service:** `HealthRecordsService.getDentalRecords()`
  - **Response:** Dental records filtered by category and clinical taxonomy.
- **`GET /api/v1/records/vision`**
  - **Flutter Service:** `HealthRecordsService.getVisionRecords()`
  - **Response:** Vision records filtered by category.
- **`POST /api/v1/records`**
  - **DTO:** `CreateRecordDto` (`{ title, category, recordType, chiefComplaint, clinicalNotes, treatmentPlan, attendingDoctor, facilityName, date }`)
  - **Flutter Service:** `HealthRecordsService.createRecord()`
- **`GET /api/v1/attachments/:id/download-url`**
  - **Flutter Service:** `HealthRecordsService.getAttachmentPresignedUrl()`
  - **Response:** Secure pre-signed Backblaze B2 CDN download URL for PDF/image viewing.

### 3.4 Family Sharing & Legal Consent
- **`GET /api/v1/family/members`**
  - **Flutter Service:** `FamilyService.getMembers()`
- **`DELETE /api/v1/family/members/:id`**
  - **Flutter Service:** `FamilyService.removeFamilyMember()`
- **`GET /api/v1/family/invitations`**
  - **Flutter Service:** `FamilyService.getInvitations()`
- **`POST /api/v1/family/invitations`**
  - **DTO:** `CreateInvitationDto` (`{ inviteePhone: "+16505550005", relationship: "Sister", inviteeName: "Maya Thompson", relationshipType: "SIBLING" }`)
  - **Flutter Service:** `FamilyService.createInvitation()`
- **`POST /api/v1/family/invitations/:id/resend`**
  - **Flutter Service:** `FamilyService.resendInvitation()`
- **`DELETE /api/v1/family/invitations/:id`**
  - **Flutter Service:** `FamilyService.cancelInvitation()`

### 3.5 Insurance & OCR Extraction
- **`GET /api/v1/insurance/policies`**
  - **Flutter Service:** `InsuranceService.getPolicies()`
- **`POST /api/v1/patients/:id/insurance-cards`**
  - **Flutter Service:** `InsuranceService.createInsuranceCard()`
- **`POST /api/v1/insurance/ocr/confirm`**
  - **DTO:** `ConfirmInsuranceOcrDto` (`{ ocrId, confirmedData: { providerName, policyNumber, coverageDetails } }`)
  - **Flutter Service:** `InsuranceService.confirmOcrScan()`
