# CareID API Contract Matrix (Five Client Surfaces)

**Document Version:** 1.2.0 (Schema-Corrected & Source-Verified)  
**Initial Baseline Hash (`prisma/schema.prisma`):** `ce7d1238ecb41f4130d33a5c1161cfcdaf5e2c951c76879200f658e44b612894`  
**Corrected Schema Hash (`prisma/schema.prisma`):** `21151ac696e3acfda2c128e9d978a5f1ea800ce5710f85d99275495016fcf490`  
**Target Clients:**
1. Admin React Portal (Web)
2. Patient React Portal (Web)
3. Doctor React Portal (Web)
4. Patient Flutter Application (Mobile)
5. Doctor Flutter Application (Mobile)

---

## 1. Status Key Definitions

> [!IMPORTANT]
> **Source Review vs. Client Execution Limitation:**  
> All statuses in this matrix reflect **backend source-level review, controller decorators, DTO validation rules, and automated unit tests within the NestJS backend codebase**.  
> The external client source repositories (*Admin React, Patient React, Doctor React, Patient Flutter, Doctor Flutter*) are not hosted in this repository workspace. Therefore, **no client execution tests, UI audits, or live client-side integration runs have been performed**. Contracts indicate backend readiness and API compatibility based on documented payload contracts, not verified client execution.

All endpoint contracts are classified using strict status taxonomy grounded in backend source verification:

| Status Label | Definition |
| :--- | :--- |
| `BACKEND VERIFIED` | Route exists, controller/service/repository verified in NestJS source, automated unit/integration test passing. (Client-side execution unverified). |
| `IMPLEMENTED — NOT TESTED` | Backend source code exists and compiles, but lacks dedicated automated test or requires live external infrastructure. |
| `PARTIALLY IMPLEMENTED` | Controller or route exists in backend, but business logic is stubbed or missing underlying persistence. |
| `BLOCKED — SCHEMA/ARCHITECTURE` | Feature cannot be implemented without Prisma schema changes or architectural redesign. |
| `BLOCKED — APPROVAL REQUIRED` | Implementation requires medical ethics, privacy, or security approval (e.g. Clinical Consent Token Flow). |
| `NOT FOUND IN SOURCE` | Route requested or assumed by client is absent from the backend codebase. |

---

## 2. Authentication & Session Management

All client surfaces consume the shared authentication module. All authentication is Phone OTP-based; no password login endpoint exists in the backend.

| Feature & Client | Method | Actual Route | Auth | Required Role | Request DTO / Params | Response Structure | Status Codes | Source Controller / Service | Status |
| :--- | :---: | :--- | :---: | :---: | :--- | :--- | :---: | :--- | :---: |
| **Request Phone OTP**<br>*(All 5 Clients)* | `POST` | `/api/v1/auth/otp/request` | Public | None | `{ "phone": "+14155552671" }` | `{ "challengeId": "uuid...", "message": "OTP sent successfully" }` | 200, 400, 429 | `AuthController.requestOtp`<br>`AuthService.requestOtp` | `VERIFIED` |
| **Verify Phone OTP**<br>*(All 5 Clients)* | `POST` | `/api/v1/auth/otp/verify` | Public | None | `{ "challengeId": "uuid...", "otpCode": "123456", "phone": "+14155552671" }` | `{ "accessToken": "jwt...", "refreshToken": "jwt...", "expiresIn": "15m" }` | 200, 400, 401, 429 | `AuthController.verifyOtp`<br>`AuthService.verifyOtp` | `VERIFIED` |
| **Resend Phone OTP**<br>*(All 5 Clients)* | `POST` | `/api/v1/auth/otp/resend` | Public | None | `{ "challengeId": "uuid..." }` | `{ "challengeId": "uuid...", "message": "OTP resent successfully" }` | 200, 400, 429 | `AuthController.resendOtp`<br>`AuthService.resendOtp` | `VERIFIED` |
| **Password Login**<br>*(Assumed by Admin Portal)* | `POST` | `/api/v1/auth/login` | Public | None | `{ "email": "...", "password": "..." }` | N/A | 404 | N/A (No controller route exists) | **`NOT FOUND IN SOURCE`** |
| **Refresh Access Token**<br>*(All 5 Clients)* | `POST` | `/api/v1/auth/token/refresh` | Public | None | `{ "refreshToken": "jwt..." }` | `{ "accessToken": "jwt...", "refreshToken": "jwt..." }` | 200, 400, 401, 429 | `AuthController.refreshToken`<br>`AuthService.refreshToken` | `VERIFIED` |
| **User Logout (Current Session)**<br>*(All 5 Clients)* | `POST` | `/api/v1/auth/logout` | Public* | Active Session | `{ "refreshToken": "jwt..." }` | `{ "success": true, "message": "Logged out successfully" }` | 200, 401 | `AuthController.logout`<br>`AuthService.logout` | `VERIFIED` |
| **Logout All Devices**<br>*(All 5 Clients)* | `POST` | `/api/v1/auth/logout-all` | Public* | Active Session | `{ "refreshToken": "jwt..." }` | `{ "success": true, "message": "Logged out all devices successfully" }` | 200, 401 | `AuthController.logoutAll`<br>`AuthService.logoutAll` | `VERIFIED` |
| **Current User Profile & Claims**<br>*(All 5 Clients)* | `GET` | `/api/v1/auth/me` | JWT | Any Active | None | `{ "id": "...", "phone": "...", "status": "ACTIVE", "roles": [...], "permissions": [...] }` | 200, 401 | `AuthController.getMe`<br>`AuthService.getMe` | `VERIFIED` |
| **List Active Sessions**<br>*(All 5 Clients)* | `GET` | `/api/v1/auth/sessions` | JWT | Any Active | None | `SessionResponseDto[]` | 200, 401 | `AuthController.getSessions`<br>`AuthService.getActiveSessions` | `VERIFIED` |
| **Revoke Specific Session**<br>*(All 5 Clients)* | `DELETE` | `/api/v1/auth/sessions/:sessionId` | JWT | Any Active | Param: `sessionId` | None (204 No Content) | 204, 401 | `AuthController.revokeSession`<br>`AuthService.revokeSession` | `VERIFIED` |
| **Revoke All Other Sessions**<br>*(All 5 Clients)* | `DELETE` | `/api/v1/auth/sessions` | JWT | Any Active | None | None (204 No Content) | 204, 401 | `AuthController.revokeOtherSessions`<br>`AuthService.revokeOtherSessions` | `VERIFIED` |

*\*Note on Logout:* While public at the HTTP level (no `Bearer` Authorization header required), `logout` and `logoutAll` cryptographically verify the refresh token's signature, session ID, and user binding in the request payload.

---

## 3. Patient & Doctor Demographic Profiles

| Feature & Client | Method | Actual Route | Auth | Required Role | Request DTO / Params | Response Structure | Status Codes | Source Controller / Service | Status |
| :--- | :---: | :--- | :---: | :---: | :--- | :--- | :---: | :--- | :---: |
| **Initialize Patient Draft**<br>*(Patient React & Flutter)* | `POST` | `/api/v1/patients/register` | JWT | `PATIENT` | `{}` | `{ "id": "...", "status": "DRAFT", "step": 1 }` | 201, 401, 403 | `PatientController.register`<br>`PatientService.register` | `VERIFIED` |
| **Patient Demographics Onboard**<br>*(Patient React & Flutter)* | `POST` | `/api/v1/patients/onboarding/demographics` | JWT | `PATIENT` | OnboardDemographicsDto | OnboardDemographicsResponseDto | 200, 400, 401, 403 | `PatientController.onboardDemographics`<br>`PatientService` | `VERIFIED` |
| **Get Onboarding Progress**<br>*(Patient React & Flutter)* | `GET` | `/api/v1/patients/onboarding/progress` | JWT | `PATIENT` | None | `{ "completionPercentage": 75, "steps": [...] }` | 200, 401, 403 | `PatientController.getOnboardingProgress`<br>`PatientService` | `VERIFIED` |
| **Get Patient Profile**<br>*(Patient React & Flutter)* | `GET` | `/api/v1/patients/me` | JWT | `PATIENT` | None | PatientProfileResponseDto | 200, 401, 403, 404 | `PatientController.getProfile`<br>`PatientService.getProfile` | `VERIFIED` |
| **Update Patient Profile**<br>*(Patient React & Flutter)* | `PUT` | `/api/v1/patients/me` | JWT | `PATIENT` | OnboardDemographicsDto | PatientProfileResponseDto | 200, 400, 401, 403 | `PatientController.updateProfile`<br>`PatientService.updateProfile` | `VERIFIED` |
| **Get Full Patient Profile**<br>*(Patient React & Flutter)* | `GET` | `/api/v1/patients/me/full` | JWT | `PATIENT` | None | FullPatientProfileResponseDto | 200, 401, 403, 404 | `PatientController.getFullProfile`<br>`PatientService.getFullProfile` | `VERIFIED` |
| **Get Doctor Profile by ID**<br>*(Doctor React & Flutter)* | `GET` | `/api/v1/doctors/:id` | JWT | Authenticated | Param: `id: UUID` | DoctorProfileFullResponseDto | 200, 401, 404 | `DoctorController.getDoctorById`<br>`DoctorService.getDoctorById` | `VERIFIED` |
| **Doctor Self Profile Route**<br>*(Doctor React & Flutter)* | `GET` | `/api/v1/doctors/me` | JWT | `DOCTOR` | None | N/A | 404 | N/A (Route does not exist in controller) | **`NOT FOUND IN SOURCE`** |
| **Public Doctor Directory**<br>*(Patient React & Flutter)* | `GET` | `/api/v1/doctors` | JWT | Authenticated | None | `DoctorProfileFullResponseDto[]` | 200, 401 | `DoctorController.getDoctors`<br>`DoctorService.getDoctors` | `VERIFIED` |
| **Search Doctor Directory**<br>*(Patient React & Flutter)* | `GET` | `/api/v1/doctors/search` | JWT | Authenticated | Query: `?q=cardiologist` | `DoctorProfileFullResponseDto[]` | 200, 400, 401 | `DoctorController.searchDoctors`<br>`DoctorService.searchDoctors` | `VERIFIED` |

*\*Note on Doctor Profile:* The backend does not implement `GET /api/v1/doctors/me`. Doctors query their assigned profile using `GET /api/v1/doctors/:id` with their profile ID or obtain profile summary metadata from `GET /api/v1/auth/me`.

---

## 4. Patient Clinical Records & Reports

### Strict Authorization Rule:
[`MedicalRecordService`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/medical-record/application/use-cases/medical-record.service.ts#L133) line 133 and [`ReportService`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/report/application/use-cases/report.service.ts#L152) line 152 strictly enforce ownership:
`if (record.patientProfileId !== callerProfileId) throw new ForbiddenException(...)`.
Doctors cannot view these records without an explicit, approved consent mechanism.

| Feature & Client | Method | Actual Route | Auth | Required Role | Request DTO / Params | Response Structure | Status Codes | Source Controller / Service | Status |
| :--- | :---: | :--- | :---: | :---: | :--- | :--- | :---: | :--- | :---: |
| **Create Medical Record**<br>*(Patient React & Flutter)* | `POST` | `/api/v1/medical-records` | JWT | `PATIENT` | CreateMedicalRecordDto | MedicalRecordResponseDto (`virusScanStatus: 'PENDING'`) | 201, 400, 401, 403 | `MedicalRecordController.createRecord`<br>`MedicalRecordService.createRecord` | `VERIFIED` |
| **List Medical Records**<br>*(Patient React & Flutter)* | `GET` | `/api/v1/medical-records` | JWT | `PATIENT` | None | `MedicalRecordResponseDto[]` | 200, 401, 403 | `MedicalRecordController.getRecords`<br>`MedicalRecordService.getRecords` | `VERIFIED` |
| **Get Record by ID**<br>*(Patient React & Flutter)* | `GET` | `/api/v1/medical-records/:id` | JWT | `PATIENT` (Owner) | Param: `id: UUID` | MedicalRecordResponseDto | 200, 401, 403, 404 | `MedicalRecordController.getRecordById`<br>`MedicalRecordService.getRecordById` | `VERIFIED` |
| **Doctor View Patient Record**<br>*(Doctor React & Flutter)* | `GET` | `/api/v1/medical-records/:id` | JWT | `DOCTOR` | Param: `id: UUID` | `HTTP 403 Forbidden` *(Ownership check denied)* | **403 Forbidden** | `MedicalRecordService.getRecordById` | **`BLOCKED — APPROVAL REQUIRED`** |
| **Upload Diagnostic Report**<br>*(Patient React & Flutter)* | `POST` | `/api/v1/reports` | JWT | `PATIENT` | UploadReportDto | FullReportResponseDto | 201, 400, 401, 403 | `ReportController.uploadReport`<br>`ReportService.uploadReport` | `VERIFIED` |
| **List Patient Reports**<br>*(Patient React & Flutter)* | `GET` | `/api/v1/reports` | JWT | `PATIENT` | Query: `?category=LAB` | `FullReportResponseDto[]` | 200, 401, 403 | `ReportController.getReportsList`<br>`ReportService.getReportsList` | `VERIFIED` |
| **Get Report Details**<br>*(Patient React & Flutter)* | `GET` | `/api/v1/reports/:id` | JWT | `PATIENT` (Owner) | Param: `id: UUID` | FullReportResponseDto | 200, 401, 403, 404 | `ReportController.getReportDetails`<br>`ReportService.getReportDetails` | `VERIFIED` |
| **Generate Download Token**<br>*(Patient React & Flutter)* | `GET` | `/api/v1/reports/:id/download-token` | JWT | `PATIENT` (Owner) | Param: `id: UUID` | DownloadTokenResponseDto | 200, 401, 403, 404 | `ReportController.generateDownloadToken`<br>`ReportService` | `VERIFIED` |

---

## 5. Enterprise Reporting & Route Collision Notice

> [!WARNING]
> **Route Prefix Collision Risk on `/api/v1/reports`:**  
> Both [`ReportController`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/report/presentation/controllers/report.controller.ts) (patient diagnostic records) and [`ReportsController`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/reports/presentation/controllers/reports.controller.ts) (administrative executive analytics) mount at `@Controller('reports')`.  
> In [`AppModule`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/app.module.ts#L56-L59), `ReportsModule` precedes `ReportModule`. Therefore, administrative literal paths (`/definitions`, `/dashboard/executive`, `/widgets`) are matched first. Unmatched routes fall through to `ReportController`, where literal paths (`/categories`, `/search`, `/timeline`) precede the wildcard `/:id`.  
> **Operational Risk:** If module import ordering is altered in `AppModule`, `ReportController`'s `/:id` handler will intercept `/reports/definitions`, breaking the administrative reporting subsystem.

| Feature & Client | Method | Actual Route | Auth | Required Role | Request DTO / Params | Response Structure | Status Codes | Source Controller / Service | Status |
| :--- | :---: | :--- | :---: | :---: | :--- | :--- | :---: | :--- | :---: |
| **Executive Dashboard**<br>*(Admin React Portal)* | `GET` | `/api/v1/reports/dashboard/executive` | JWT | `ADMIN`, `SUPER_ADMIN` | Query: `?startDate=&endDate=` | ExecutiveDashboardResponseDto | 200, 401, 403 | `ReportsController.getExecutiveDashboard`<br>`ReportingService` | `VERIFIED` |
| **List Report Definitions**<br>*(Admin React Portal)* | `GET` | `/api/v1/reports/definitions` | JWT | `ADMIN`, `SUPER_ADMIN` | Query: `?module=` | `ReportDefinitionResponseDto[]` | 200, 401, 403 | `ReportsController.getDefinitions`<br>`ReportingService` | `VERIFIED` |
| **Create Report Definition**<br>*(Admin React Portal)* | `POST` | `/api/v1/reports/definitions` | JWT | `ADMIN`, `SUPER_ADMIN` | CreateReportDefinitionDto | ReportDefinitionResponseDto | 201, 400, 401, 403 | `ReportsController.createDefinition`<br>`ReportingService` | `VERIFIED` |
| **Trigger Report Generation**<br>*(Admin React Portal)* | `POST` | `/api/v1/reports/generate` | JWT | `ADMIN`, `SUPER_ADMIN` | GenerateReportDto | GeneratedReportResponseDto | 201, 400, 401, 403 | `ReportsController.generateReport`<br>`ReportingService` | `VERIFIED` |

---

## 6. QR Subsystem & Clinical Consent

The QR subsystem is located at `@Controller('qr')` (not `qr-code`). All routes require JWT authentication.

| Feature & Client | Method | Actual Route | Auth | Required Role | Request DTO / Params | Response Structure | Status Codes | Source Controller / Service | Status |
| :--- | :---: | :--- | :---: | :---: | :--- | :--- | :---: | :--- | :---: |
| **Generate QR Token**<br>*(Patient/Doctor React & Flutter)* | `POST` | `/api/v1/qr/generate` | JWT | Authenticated | GenerateQrDto (`entityType`, `entityId`, `expiresInHours`) | QrResponseDto (`qrPayload`, `expiresAt`, `tokenUuid`) | 201, 400, 401 | `QrController.createQr`<br>`QrService.generateQr` | `VERIFIED` |
| **Verify QR Token**<br>*(Doctor React & Flutter)* | `POST` | `/api/v1/qr/verify` | JWT | Authenticated | VerifyQrPayloadDto (`payload`) | QrVerificationResultDto (`isValid`, `entityType`, `entityId`, `payload`) | 200, 400, 401 | `QrController.verifyQr`<br>`QrService.verifyQrPayload` | `VERIFIED` |
| **Rotate QR Token**<br>*(Patient React & Flutter)* | `POST` | `/api/v1/qr/:id/rotate` | JWT | Authenticated | Param: `id`, RotateQrDto | QrResponseDto | 200, 400, 401, 404 | `QrController.rotateQr`<br>`QrService.rotateQr` | `VERIFIED` |
| **Revoke QR Token**<br>*(Patient React & Flutter)* | `POST` | `/api/v1/qr/:id/revoke` | JWT | Authenticated | Param: `id`, RevokeQrDto | QrResponseDto | 200, 400, 401, 404 | `QrController.revokeQr`<br>`QrService.revokeQr` | `VERIFIED` |
| **Clinical Consent Token Flow**<br>*(Doctor accessing records)* | `POST` | `/api/v1/clinical/consent/grant` | JWT | `PATIENT` | Consent Request Payload | Short-lived signed Consent Token | N/A | N/A (Route not created pending RFC approval) | **`BLOCKED — APPROVAL REQUIRED`** |

---

## 7. Content Management System (CMS)

### A. Public Read Endpoints (All 5 Clients)
No JWT required. Only returns content where `status = 'PUBLISHED'` and within valid date ranges.

| Feature & Client | Method | Actual Route | Auth | Filter Applied in SQL/DB | Response Structure | Status Codes | Source Controller / Service | Status |
| :--- | :---: | :--- | :---: | :--- | :--- | :---: | :--- | :---: |
| **List Published Pages**<br>*(All 5 Clients)* | `GET` | `/api/v1/cms/pages` | Public | `status = 'PUBLISHED'` | `CmsPageResponseDto[]` | 200 | `CmsController.getPages`<br>`CmsService.getPages` | `VERIFIED` |
| **Search Published Pages**<br>*(All 5 Clients)* | `GET` | `/api/v1/cms/pages/search` | Public | `status = 'PUBLISHED'` | `CmsPageResponseDto[]` | 200 | `CmsController.searchPages`<br>`CmsService.searchPages` | `VERIFIED` |
| **Get Page by ID or Slug**<br>*(All 5 Clients)* | `GET` | `/api/v1/cms/pages/:id` | Public | `status = 'PUBLISHED'` (Throws 404 if Draft) | CmsPageResponseDto | 200, 404 | `CmsController.getPageById`<br>`CmsService.getPageById` | `VERIFIED` |
| **List Published FAQs**<br>*(All 5 Clients)* | `GET` | `/api/v1/cms/faqs` | Public | `status = 'PUBLISHED'`, Query: `?category=` | `FaqResponseDto[]` | 200 | `CmsController.getFaqs`<br>`CmsService.getFaqs` | `VERIFIED` |
| **Active Announcements**<br>*(All 5 Clients)* | `GET` | `/api/v1/cms/announcements` | Public | `status = 'PUBLISHED'` AND Date window | `CmsAnnouncementResponseDto[]` | 200 | `CmsController.getAnnouncements`<br>`CmsService.getAnnouncements` | `VERIFIED` |
| **List Published Policies**<br>*(All 5 Clients)* | `GET` | `/api/v1/cms/policies` | Public | `status = 'PUBLISHED'`, Query: `?policyType=` | `CmsPolicyResponseDto[]` | 200 | `CmsController.getPolicies`<br>`CmsService.getPolicies` | `VERIFIED` |
| **Get Policy by ID**<br>*(All 5 Clients)* | `GET` | `/api/v1/cms/policies/:id` | Public | Param: `id: UUID` | CmsPolicyResponseDto | 200, 404 | `CmsController.getPolicyById`<br>`CmsService.getPolicyById` | `VERIFIED` |
| **Active Banners**<br>*(All 5 Clients)* | `GET` | `/api/v1/cms/banners` | Public | `status = 'PUBLISHED'` AND Date window | `CmsBannerResponseDto[]` | 200 | `CmsController.getBanners`<br>`CmsService.getBanners` | `VERIFIED` |

### B. Administrative CMS Endpoints (Admin React Portal Only)
Requires valid JWT and `ADMIN` or `SUPER_ADMIN` role.

| Feature & Client | Method | Actual Route | Auth | Role | Request DTO / Payload | Status Codes | Source Controller / Method | Status |
| :--- | :---: | :--- | :---: | :---: | :--- | :---: | :--- | :---: |
| **Platform CMS Statistics** | `GET` | `/api/v1/cms/statistics` | JWT | `ADMIN` | None | 200, 401, 403 | `CmsController.getStatistics` | `VERIFIED` |
| **Create CMS Page** | `POST` | `/api/v1/cms/pages` | JWT | `ADMIN` | CreateCmsPageDto | 201, 400, 401, 403 | `CmsController.createPage` | `VERIFIED` |
| **Update CMS Page** | `PUT` | `/api/v1/cms/pages/:id` | JWT | `ADMIN` | Partial<CreateCmsPageDto> | 200, 400, 401, 403, 404 | `CmsController.updatePage` | `VERIFIED` |
| **Soft-Delete CMS Page** | `DELETE` | `/api/v1/cms/pages/:id` | JWT | `ADMIN` | Param: `id` | 200, 401, 403, 404 | `CmsController.softDeletePage` | `VERIFIED` |
| **Create FAQ** | `POST` | `/api/v1/cms/faqs` | JWT | `ADMIN` | CreateCmsFaqDto | 201, 400, 401, 403 | `CmsController.createFaq` | `VERIFIED` |
| **Update FAQ** | `PUT` | `/api/v1/cms/faqs/:id` | JWT | `ADMIN` | Partial<CreateCmsFaqDto> | 200, 400, 401, 403, 404 | `CmsController.updateFaq` | `VERIFIED` |
| **Soft-Delete FAQ** | `DELETE` | `/api/v1/cms/faqs/:id` | JWT | `ADMIN` | Param: `id` | 200, 401, 403, 404 | `CmsController.softDeleteFaq` | `VERIFIED` |
| **Create Announcement** | `POST` | `/api/v1/cms/announcements` | JWT | `ADMIN` | CreateCmsAnnouncementDto | 201, 400, 401, 403 | `CmsController.createAnnouncement` | `VERIFIED` |
| **Create Policy** | `POST` | `/api/v1/cms/policies` | JWT | `ADMIN` | CreateCmsPolicyDto | 201, 400, 401, 403 | `CmsController.createPolicy` | `VERIFIED` |
| **Create Banner** | `POST` | `/api/v1/cms/banners` | JWT | `ADMIN` | CreateCmsBannerDto | 201, 400, 401, 403 | `CmsController.createBanner` | `VERIFIED` |
| **Register Media Item** | `POST` | `/api/v1/cms/media` | JWT | `ADMIN` | CreateMediaLibraryDto | 201, 400, 401, 403 | `CmsController.createMedia` | `VERIFIED` |
| **List Media Library** | `GET` | `/api/v1/cms/media` | JWT | `ADMIN` | Query: `?mediaType=IMAGE` | 200, 401, 403 | `CmsController.getMedia` | `VERIFIED` |
| **Search Media Library** | `GET` | `/api/v1/cms/media/search` | JWT | `ADMIN` | Query: `?q=logo` | 200, 401, 403 | `CmsController.searchMedia` | `VERIFIED` |
| **Create Content Block** | `POST` | `/api/v1/cms/blocks` | JWT | `ADMIN` | CreateContentBlockDto | 201, 400, 401, 403 | `CmsController.createBlock` | `VERIFIED` |
| **List Content Blocks** | `GET` | `/api/v1/cms/blocks` | JWT | `ADMIN` | None | 200, 401, 403 | `CmsController.getBlocks` | `VERIFIED` |

---

## 8. Appointment Booking (Blocked)

| Feature & Client | Method | Expected Route | Expected by Client | Actual Source State | Blocker Rationale | Status |
| :--- | :---: | :--- | :--- | :--- | :--- | :---: |
| **Book Appointment**<br>*(Patient React & Flutter)* | `POST` | `/api/v1/appointments` | Patient schedules visit with doctor | [`AppointmentController`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/appointment/presentation/controllers/appointment.controller.ts) is an empty class. Zero endpoints defined. | No `Appointment` table/model in `prisma/schema.prisma`. Schema change prohibited. | **`BLOCKED — SCHEMA/ARCHITECTURE`** |
| **List My Appointments**<br>*(Patient & Doctor)* | `GET` | `/api/v1/appointments` | List patient or doctor upcoming visits | Controller empty. | Missing database models, foreign keys, and status enum. | **`BLOCKED — SCHEMA/ARCHITECTURE`** |
| **Doctor Manage Slot**<br>*(Doctor React & Flutter)* | `POST` | `/api/v1/appointments/slots` | Doctor defines availability schedule | Controller empty. | Missing schema models and relations. | **`BLOCKED — SCHEMA/ARCHITECTURE`** |

---

## 9. Summary of Client Support Matrix

> [!NOTE]
> **Client Verification Status:**  
> The entries below designate **backend API support and contract readiness**. Because client source projects (*Admin React, Patient React, Doctor React, Patient Flutter, Doctor Flutter*) reside outside this workspace, **client-side execution tests are UNTESTED**.

| Workflow Domain | Admin React (Web) | Patient React (Web) | Doctor React (Web) | Patient Flutter (Mobile) | Doctor Flutter (Mobile) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Password Auth** | **`NOT FOUND IN SOURCE`** | **`NOT FOUND IN SOURCE`** | **`NOT FOUND IN SOURCE`** | **`NOT FOUND IN SOURCE`** | **`NOT FOUND IN SOURCE`** |
| **Phone OTP Auth** | `Backend Ready`* | `Backend Ready` | `Backend Ready` | `Backend Ready` | `Backend Ready` |
| **Session Lifecycle** | `Backend Ready` | `Backend Ready` | `Backend Ready` | `Backend Ready` | `Backend Ready` |
| **Demographic Profile** | Read/Admin | Owner CRUD | Read/Query | Owner CRUD | Read/Query |
| **Clinical Records (Owner)** | Read/Admin | Owner CRUD | N/A | Owner CRUD | N/A |
| **Doctor Access to Patient Records** | N/A | N/A | **`BLOCKED`** | N/A | **`BLOCKED`** |
| **Lab Reports Upload & List (Owner)** | Read/Admin | Owner CRUD | N/A | Owner CRUD | N/A |
| **QR Code Identity Generation** | N/A | `Backend Ready` | `Backend Ready` | `Backend Ready` | `Backend Ready` |
| **QR Code Verification** | N/A | N/A | `Backend Ready` | N/A | `Backend Ready` |
| **Clinical Consent Token Flow** | N/A | **`BLOCKED`** | **`BLOCKED`** | **`BLOCKED`** | **`BLOCKED`** |
| **Public CMS Read** | `Backend Ready` | `Backend Ready` | `Backend Ready` | `Backend Ready` | `Backend Ready` |
| **Admin CMS Mutations** | `Backend Ready` | Forbidden (403) | Forbidden (403) | Forbidden (403) | Forbidden (403) |
| **Appointment Booking** | **`BLOCKED`** | **`BLOCKED`** | **`BLOCKED`** | **`BLOCKED`** | **`BLOCKED`** |

*\*Note on Admin React Auth:* Administrative users authenticate via Phone OTP using a registered phone number. Upon OTP verification, the backend issues an access token with roles `['ADMIN']` or `['SUPER_ADMIN']`, unlocking administrative routes.  
*\*Note on Client Execution:* All `Backend Ready` statuses reflect unit-tested NestJS endpoints. End-to-end client validation remains pending external client test execution.
