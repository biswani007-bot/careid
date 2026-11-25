# CareID API Inventory & Endpoint Analysis

**Audit Date:** October 2026  
**Target Platform:** CareID / Health Vault 360 Monolith Backend  
**Framework:** NestJS 11.1.28 + TypeScript 5.7 + Prisma 7.9.1  
**Baseline Verification:** 427 HTTP route handlers across 29 controllers  
**Specification Parity:** 427/427 endpoints verified across Source, Local OpenAPI (`swagger-spec.json`), and Postman (`CareID-Staging.postman_collection.json`)  

---

## 1. Executive Summary & Routing Methodology

This inventory provides an exhaustive, evidence-based catalog of all 427 registered endpoints in the CareID backend monolith, verified by AST parsing of controller source code, inspection of the OpenAPI 3.0 specification (`docs/swagger-spec.json`), and structural comparison against the authoritative staging Postman collection (`CareID-Staging.postman_collection.json`).

### Key Classification Taxonomy
- **Already Exists**: Registered in source code, OpenAPI specification, and Postman collection; active in runtime routing table.
- **Confirmed Missing**: Explicitly required by functional specifications but completely absent from source routing, controllers, OpenAPI, and Postman.
- **Security Defect**: Endpoint exists but exhibits missing authentication, broken role-based access control (RBAC), or object-level authorization (IDOR) vulnerabilities.
- **Data Integrity/Performance Defect**: Endpoint exists but executes unbounded queries without pagination or performs multi-table mutations without database transactions.
- **Enhancement Required**: Endpoint exists but does not support required filtering, pagination, or field persistence.
- **Not Required**: Feature requested or proposed without approved product backing (e.g. generic administrative user creation).
- **Blocked**: Feature cannot be implemented without database schema modifications, currently prohibited by Phase 1 read-only constraints.

---

## 2. Admin Portal Core Focus Endpoints (Section 7 Audit)

| Endpoint | Method | Source Status | Deployed Live Status | Classification | Evidence & Architectural Analysis |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/v1/admin/patients` | GET | **ABSENT** | **404 Not Found** | **Confirmed Missing** | Route is not registered in `AdminController` or any other controller. `GET /api/v1/admin/users` cannot substitute as it lacks role filtering and patient profile fields. |
| `/api/v1/admin/patients/:patientId` | GET | **ABSENT** | **404 Not Found** | **Confirmed Missing** | No admin endpoint exists to view patient details. `GET /api/v1/patients/me` is strictly bound to caller `req.user.userId`. |
| `/api/v1/admin/users` | GET | **EXISTS** | **401 Unauthorized** (Live) | **Enhancement Required** | Registered in `AdminController.getUsers`. Queries all users without role filtering (`PATIENT`) and without database pagination (`take`/`skip` absent in `AdminRepository`). |
| `/api/v1/admin/medical-records` | GET | **ABSENT** | **404 Not Found** | **Confirmed Missing** | No global or administrative medical records query exists. `MedicalRecordController` only provides patient-scoped `/medical-records` which rejects non-patient users. |
| `/api/v1/admin/medical-records/:recordId` | GET | **ABSENT** | **404 Not Found** | **Confirmed Missing** | No admin record lookup exists. Existing `GET /medical-records/:id` strictly validates `record.patientProfileId === profileId`. |
| `/api/v1/admin/patients/:patientId/medical-records` | GET | **ABSENT** | **404 Not Found** | **Confirmed Missing** | No patient-scoped administrative record list endpoint exists in `AdminController` or `MedicalRecordController`. |
| `/api/v1/admin/patients/:patientId/medical-records/timeline` | GET | **ABSENT** | **404 Not Found** | **Confirmed Missing** | No administrative timeline query exists. Patient timeline is strictly scoped to authenticated user profile. |
| `/api/v1/ocr/reviews/history` | GET | **ABSENT** | **404 Not Found** | **Confirmed Missing** | `OCRController` only exposes `GET /ocr/review` (pending jobs). No review history endpoint exists. |
| `/api/v1/ocr/jobs` | GET | **EXISTS** | **401 Unauthorized** (Live) | **Already Exists** | Registered in `OCRController.getJobs`. Supports `status` and `documentType` query filters. |
| `/api/v1/ocr/review/:jobId` | POST | **EXISTS** | **401 Unauthorized** (Live) | **Enhancement Required** | Registered in `OCRController.submitVerification`. **Defect**: When `reviewStatus === 'CORRECTED'`, corrected fields are NOT accepted by DTO or persisted to database. |
| `/api/v1/ocr/reprocess/:jobId` | POST | **ABSENT** | **404 Not Found** (Live) | **Confirmed Missing** | Live 404 probe confirmed. The route is completely unmapped in NestJS source controllers. |
| `/api/v1/admin/users` | POST | **ABSENT** | **404 Not Found** | **Not Required** | User creation in CareID is strictly domain-specific (OTP registration, Doctor registration, Staff registration). Generic admin user creation is unapproved and unnecessary. |

---

## 3. Comprehensive Inventory of Registered Endpoints (By Domain)


### 3.1. Controller: `HealthController`

- **Prefix**: `/`
- **Source File**: `src/core/health/health.controller.ts`
- **Registered Routes**: 3
- **Class Guards**: None
- **Class Roles**: None

| Method | Full Route Path | Handler Method | Auth Guard | Roles / Permissions | Final Classification | Notes / Defect Flags |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/health` | `getHealth` | Public (None) | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/ready` | `getReadiness` | Public (None) | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/live` | `getLiveness` | Public (None) | Authenticated (Any Role) | **Already Exists** | Implemented |

### 3.2. Controller: `AdminController`

- **Prefix**: `/admin`
- **Source File**: `src/modules/admin/presentation/controllers/admin.controller.ts`
- **Registered Routes**: 23
- **Class Guards**: AuthGuard('jwt'), RolesGuard
- **Class Roles**: ADMIN, SUPER_ADMIN

| Method | Full Route Path | Handler Method | Auth Guard | Roles / Permissions | Final Classification | Notes / Defect Flags |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/admin/dashboard/stats` | `getDashboardStats` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `GET` | `/api/v1/admin/dashboard/summary` | `getDashboardSummary` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `GET` | `/api/v1/admin/users` | `getUsers` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `GET` | `/api/v1/admin/users/:id` | `getUserById` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `PUT` | `/api/v1/admin/users/:id/status` | `updateUserStatus` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `PUT` | `/api/v1/admin/users/:id/roles` | `assignUserRoles` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `DELETE` | `/api/v1/admin/users/:id` | `softDeleteUser` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `POST` | `/api/v1/admin/users/:id/restore` | `restoreUser` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `GET` | `/api/v1/admin/roles` | `getRoles` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `GET` | `/api/v1/admin/permissions` | `getPermissions` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `GET` | `/api/v1/admin/permission-groups` | `getPermissionGroups` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `POST` | `/api/v1/admin/permission-groups` | `createPermissionGroup` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `POST` | `/api/v1/admin/permissions` | `createPermission` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `PUT` | `/api/v1/admin/roles/:id/permissions` | `assignRolePermissions` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `GET` | `/api/v1/admin/permission-matrix` | `getPermissionMatrix` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `POST` | `/api/v1/admin/organizations` | `createOrganization` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `GET` | `/api/v1/admin/organizations` | `getOrganizations` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `GET` | `/api/v1/admin/organizations/:id` | `getOrganizationById` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `PUT` | `/api/v1/admin/organizations/:id` | `updateOrganization` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `DELETE` | `/api/v1/admin/organizations/:id` | `softDeleteOrganization` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `GET` | `/api/v1/admin/settings` | `getSettings` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `PUT` | `/api/v1/admin/settings` | `upsertSetting` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `GET` | `/api/v1/admin/audit-logs` | `getAuditLogs` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |

### 3.3. Controller: `AiOcrController`

- **Prefix**: `/ai/ocr`
- **Source File**: `src/modules/ai-ocr/presentation/controllers/ai-ocr.controller.ts`
- **Registered Routes**: 2
- **Class Guards**: AuthGuard('jwt')
- **Class Roles**: None

| Method | Full Route Path | Handler Method | Auth Guard | Roles / Permissions | Final Classification | Notes / Defect Flags |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/ai/ocr/extract` | `extractDocument` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/ai/ocr/confirm` | `confirmOcr` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |

### 3.4. Controller: `AuthController`

- **Prefix**: `/auth`
- **Source File**: `src/modules/auth/presentation/controllers/auth.controller.ts`
- **Registered Routes**: 14
- **Class Guards**: None
- **Class Roles**: None

| Method | Full Route Path | Handler Method | Auth Guard | Roles / Permissions | Final Classification | Notes / Defect Flags |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/password/login` | `passwordLogin` | Public (None) | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/auth/admin/login` | `adminLogin` | Public (None) | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/auth/otp/request` | `requestOtp` | Public (None) | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/auth/otp/verify` | `verifyOtp` | Public (None) | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/auth/otp/resend` | `resendOtp` | Public (None) | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/auth/token/refresh` | `refreshToken` | Public (None) | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/auth/logout` | `logout` | Public (None) | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/auth/logout-all` | `logoutAll` | Public (None) | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/auth/me` | `getMe` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/auth/sessions` | `getSessions` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `DELETE` | `/api/v1/auth/sessions/:sessionId` | `revokeSession` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `DELETE` | `/api/v1/auth/sessions` | `revokeOtherSessions` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/auth/roles` | `getRoles` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/auth/permissions` | `getPermissions` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |

### 3.5. Controller: `CmsController`

- **Prefix**: `/cms`
- **Source File**: `src/modules/cms/presentation/controllers/cms.controller.ts`
- **Registered Routes**: 31
- **Class Guards**: None
- **Class Roles**: None

| Method | Full Route Path | Handler Method | Auth Guard | Roles / Permissions | Final Classification | Notes / Defect Flags |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/cms/statistics` | `getStatistics` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `POST` | `/api/v1/cms/pages` | `createPage` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `GET` | `/api/v1/cms/pages` | `getPages` | Public (None) | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/cms/pages/search` | `searchPages` | Public (None) | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/cms/pages/:id` | `getPageById` | Public (None) | Authenticated (Any Role) | **Already Exists** | Implemented |
| `PUT` | `/api/v1/cms/pages/:id` | `updatePage` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `DELETE` | `/api/v1/cms/pages/:id` | `softDeletePage` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `POST` | `/api/v1/cms/faqs` | `createFaq` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `GET` | `/api/v1/cms/faqs` | `getFaqs` | Public (None) | Authenticated (Any Role) | **Already Exists** | Implemented |
| `PUT` | `/api/v1/cms/faqs/:id` | `updateFaq` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `DELETE` | `/api/v1/cms/faqs/:id` | `softDeleteFaq` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `POST` | `/api/v1/cms/announcements` | `createAnnouncement` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `GET` | `/api/v1/cms/announcements` | `getAnnouncements` | Public (None) | Authenticated (Any Role) | **Already Exists** | Implemented |
| `PUT` | `/api/v1/cms/announcements/:id` | `updateAnnouncement` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `DELETE` | `/api/v1/cms/announcements/:id` | `softDeleteAnnouncement` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `POST` | `/api/v1/cms/policies` | `createPolicy` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `GET` | `/api/v1/cms/policies` | `getPolicies` | Public (None) | Authenticated (Any Role) | **Already Exists** | Implemented |
| `PUT` | `/api/v1/cms/policies/:id` | `updatePolicy` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `DELETE` | `/api/v1/cms/policies/:id` | `softDeletePolicy` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `POST` | `/api/v1/cms/banners` | `createBanner` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `GET` | `/api/v1/cms/banners` | `getBanners` | Public (None) | Authenticated (Any Role) | **Already Exists** | Implemented |
| `PUT` | `/api/v1/cms/banners/:id` | `updateBanner` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `DELETE` | `/api/v1/cms/banners/:id` | `softDeleteBanner` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `POST` | `/api/v1/cms/media` | `createMedia` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `GET` | `/api/v1/cms/media` | `getMedia` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `GET` | `/api/v1/cms/media/search` | `searchMedia` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `DELETE` | `/api/v1/cms/media/:id` | `softDeleteMedia` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `POST` | `/api/v1/cms/blocks` | `createBlock` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `GET` | `/api/v1/cms/blocks` | `getBlocks` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `PUT` | `/api/v1/cms/blocks/:id` | `updateBlock` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `DELETE` | `/api/v1/cms/blocks/:id` | `softDeleteBlock` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |

### 3.6. Controller: `DoctorController`

- **Prefix**: `/doctors`
- **Source File**: `src/modules/doctor/presentation/controllers/doctor.controller.ts`
- **Registered Routes**: 18
- **Class Guards**: AuthGuard('jwt'), RolesGuard
- **Class Roles**: None

| Method | Full Route Path | Handler Method | Auth Guard | Roles / Permissions | Final Classification | Notes / Defect Flags |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/doctors` | `registerDoctor` | AuthGuard('jwt', RolesGuard | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/doctors` | `getDoctors` | AuthGuard('jwt', RolesGuard | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/doctors/search` | `searchDoctors` | AuthGuard('jwt', RolesGuard | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/doctors/statistics` | `getStatistics` | AuthGuard('jwt', RolesGuard | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/doctors/verification/pending` | `getPendingDoctors` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN, FACILITY_ADMIN | **Already Exists** | Implemented |
| `GET` | `/api/v1/doctors/:id` | `getDoctorById` | AuthGuard('jwt', RolesGuard | Authenticated (Any Role) | **Already Exists** | Implemented |
| `PUT` | `/api/v1/doctors/:id` | `updateDoctor` | AuthGuard('jwt', RolesGuard | Authenticated (Any Role) | **Security Defect** | Missing Roles / IDOR Risk |
| `DELETE` | `/api/v1/doctors/:id` | `softDeleteDoctor` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN, FACILITY_ADMIN | **Already Exists** | Implemented |
| `POST` | `/api/v1/doctors/:id/verify` | `verifyDoctor` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN, FACILITY_ADMIN | **Already Exists** | Implemented |
| `POST` | `/api/v1/doctors/:id/reject` | `rejectDoctor` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN, FACILITY_ADMIN | **Already Exists** | Implemented |
| `POST` | `/api/v1/doctors/:id/suspend` | `suspendDoctor` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN, FACILITY_ADMIN | **Already Exists** | Implemented |
| `POST` | `/api/v1/doctors/:id/restore` | `restoreDoctor` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN, FACILITY_ADMIN | **Already Exists** | Implemented |
| `POST` | `/api/v1/doctors/:id/renew-license` | `renewLicense` | AuthGuard('jwt', RolesGuard | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/doctors/:id/generate-qr` | `generateQr` | AuthGuard('jwt', RolesGuard | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/doctors/:id/documents` | `getDocuments` | AuthGuard('jwt', RolesGuard | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/doctors/:id/documents` | `attachDocument` | AuthGuard('jwt', RolesGuard | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/doctors/:id/history` | `getHistory` | AuthGuard('jwt', RolesGuard | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/doctors/:id/slots` | `getDoctorSlots` | AuthGuard('jwt', RolesGuard | Authenticated (Any Role) | **Already Exists** | Implemented |

### 3.7. Controller: `FacilityController`

- **Prefix**: `/facilities`
- **Source File**: `src/modules/facility/presentation/controllers/facility.controller.ts`
- **Registered Routes**: 20
- **Class Guards**: AuthGuard('jwt'), RolesGuard
- **Class Roles**: None

| Method | Full Route Path | Handler Method | Auth Guard | Roles / Permissions | Final Classification | Notes / Defect Flags |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/facilities` | `registerFacility` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN, FACILITY_ADMIN | **Already Exists** | Implemented |
| `GET` | `/api/v1/facilities` | `getFacilities` | AuthGuard('jwt', RolesGuard | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/facilities/search` | `searchFacilities` | AuthGuard('jwt', RolesGuard | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/facilities/statistics` | `getStatistics` | AuthGuard('jwt', RolesGuard | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/facilities/:id` | `getFacilityById` | AuthGuard('jwt', RolesGuard | Authenticated (Any Role) | **Already Exists** | Implemented |
| `PUT` | `/api/v1/facilities/:id` | `updateFacility` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN, FACILITY_ADMIN | **Already Exists** | Implemented |
| `DELETE` | `/api/v1/facilities/:id` | `softDeleteFacility` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `POST` | `/api/v1/facilities/:id/verify` | `verifyFacility` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `POST` | `/api/v1/facilities/:id/suspend` | `suspendFacility` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `POST` | `/api/v1/facilities/:id/restore` | `restoreFacility` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `POST` | `/api/v1/facilities/:id/generate-qr` | `generateQr` | AuthGuard('jwt', RolesGuard | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/facilities/:id/departments` | `getDepartments` | AuthGuard('jwt', RolesGuard | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/facilities/:id/departments` | `createDepartment` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN, FACILITY_ADMIN | **Already Exists** | Implemented |
| `GET` | `/api/v1/facilities/:id/rooms` | `getRooms` | AuthGuard('jwt', RolesGuard | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/facilities/:id/rooms` | `createRoom` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN, FACILITY_ADMIN | **Already Exists** | Implemented |
| `POST` | `/api/v1/facilities/:id/assign-doctor` | `assignDoctor` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN, FACILITY_ADMIN | **Already Exists** | Implemented |
| `GET` | `/api/v1/facilities/:id/doctors` | `listDoctors` | AuthGuard('jwt', RolesGuard | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/facilities/:id/documents` | `getDocuments` | AuthGuard('jwt', RolesGuard | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/facilities/:id/documents` | `attachDocument` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN, FACILITY_ADMIN | **Already Exists** | Implemented |
| `GET` | `/api/v1/facilities/:id/history` | `getHistory` | AuthGuard('jwt', RolesGuard | Authenticated (Any Role) | **Already Exists** | Implemented |

### 3.8. Controller: `FamilyController`

- **Prefix**: `/family`
- **Source File**: `src/modules/family/presentation/controllers/family.controller.ts`
- **Registered Routes**: 22
- **Class Guards**: AuthGuard('jwt')
- **Class Roles**: None

| Method | Full Route Path | Handler Method | Auth Guard | Roles / Permissions | Final Classification | Notes / Defect Flags |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/family/invitations` | `createInvitation` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/family/invitations/:id/resend` | `resendInvitation` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/family/invitations/:id/accept` | `acceptInvitation` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/family/invitations/:id/reject` | `rejectInvitation` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `DELETE` | `/api/v1/family/invitations/:id` | `cancelInvitation` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/family/invitations` | `getInvitations` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/family/members` | `getFamilyMembers` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/family/members/:id` | `getFamilyMemberById` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `PATCH` | `/api/v1/family/members/:id` | `updateFamilyMember` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `DELETE` | `/api/v1/family/members/:id` | `removeFamilyMember` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/family/consents` | `grantConsent` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `PUT` | `/api/v1/family/consents/:id` | `updateConsent` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `DELETE` | `/api/v1/family/consents/:id` | `revokeConsent` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/family/consents` | `getConsents` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/family/consents/history` | `getConsentHistory` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/family/guardians` | `getGuardians` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/family/guardians` | `createGuardian` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `PATCH` | `/api/v1/family/guardians/:id` | `updateGuardian` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/family/dependents` | `getDependents` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/family/dependents` | `createDependent` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `PATCH` | `/api/v1/family/dependents/:id` | `updateDependent` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `DELETE` | `/api/v1/family/dependents/:id` | `removeDependent` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |

### 3.9. Controller: `GovernanceController`

- **Prefix**: `/governance`
- **Source File**: `src/modules/governance/presentation/controllers/governance.controller.ts`
- **Registered Routes**: 28
- **Class Guards**: AuthGuard('jwt'), RolesGuard
- **Class Roles**: ADMIN, SUPER_ADMIN

| Method | Full Route Path | Handler Method | Auth Guard | Roles / Permissions | Final Classification | Notes / Defect Flags |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/governance/dashboard` | `getDashboard` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `POST` | `/api/v1/governance/configurations` | `createConfiguration` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `GET` | `/api/v1/governance/configurations` | `getConfigurations` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `GET` | `/api/v1/governance/configurations/export` | `exportConfigurations` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `POST` | `/api/v1/governance/configurations/import` | `importConfigurations` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `GET` | `/api/v1/governance/configurations/:id` | `getConfigurationById` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `PUT` | `/api/v1/governance/configurations/:id` | `updateConfiguration` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `DELETE` | `/api/v1/governance/configurations/:id` | `softDeleteConfiguration` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `POST` | `/api/v1/governance/features` | `createFeatureFlag` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `GET` | `/api/v1/governance/features` | `getFeatureFlags` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `GET` | `/api/v1/governance/features/:id` | `getFeatureFlagById` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `PUT` | `/api/v1/governance/features/:id` | `updateFeatureFlag` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `DELETE` | `/api/v1/governance/features/:id` | `softDeleteFeatureFlag` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `POST` | `/api/v1/governance/master-data/categories` | `createMasterCategory` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `GET` | `/api/v1/governance/master-data/categories` | `getMasterCategories` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `POST` | `/api/v1/governance/master-data/items` | `createMasterItem` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `GET` | `/api/v1/governance/master-data/items` | `getMasterItems` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `PUT` | `/api/v1/governance/master-data/items/:id` | `updateMasterItem` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `DELETE` | `/api/v1/governance/master-data/items/:id` | `softDeleteMasterItem` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `POST` | `/api/v1/governance/policies` | `createPolicy` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `GET` | `/api/v1/governance/policies` | `getPolicies` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `GET` | `/api/v1/governance/policies/:id` | `getPolicyById` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `PUT` | `/api/v1/governance/policies/:id` | `updatePolicy` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `DELETE` | `/api/v1/governance/policies/:id` | `softDeletePolicy` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `GET` | `/api/v1/governance/maintenance` | `getMaintenanceConfig` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `PUT` | `/api/v1/governance/maintenance` | `updateMaintenanceConfig` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `GET` | `/api/v1/governance/audit` | `getAuditLogs` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `GET` | `/api/v1/governance/audit/:id` | `getAuditLogById` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |

### 3.10. Controller: `HealthCardController`

- **Prefix**: `/health-cards`
- **Source File**: `src/modules/health-card/presentation/controllers/health-card.controller.ts`
- **Registered Routes**: 16
- **Class Guards**: AuthGuard('jwt')
- **Class Roles**: None

| Method | Full Route Path | Handler Method | Auth Guard | Roles / Permissions | Final Classification | Notes / Defect Flags |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/health-cards` | `issueCard` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/health-cards` | `getActiveCard` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/health-cards/search` | `searchCards` | AuthGuard('jwt' | Authenticated (Any Role) | **Security Defect** | Missing Roles / IDOR Risk |
| `GET` | `/api/v1/health-cards/:id` | `getCardById` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `PUT` | `/api/v1/health-cards/:id` | `updateCard` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/health-cards/:id/activate` | `activateCard` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/health-cards/:id/deactivate` | `deactivateCard` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/health-cards/:id/suspend` | `suspendCard` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/health-cards/:id/block` | `blockCard` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/health-cards/:id/unblock` | `unblockCard` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/health-cards/:id/replace` | `replaceCard` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/health-cards/:id/renew` | `renewCard` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/health-cards/:id/archive` | `archiveCard` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/health-cards/:id/restore` | `restoreCard` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/health-cards/:id/history` | `getCardHistory` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/health-cards/verify-qr` | `verifyQr` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |

### 3.11. Controller: `ImmunisationController`

- **Prefix**: `/immunisation`
- **Source File**: `src/modules/immunisation/presentation/controllers/immunisation.controller.ts`
- **Registered Routes**: 18
- **Class Guards**: AuthGuard('jwt')
- **Class Roles**: None

| Method | Full Route Path | Handler Method | Auth Guard | Roles / Permissions | Final Classification | Notes / Defect Flags |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/immunisation/vaccines` | `createVaccine` | AuthGuard('jwt' | Authenticated (Any Role) | **Security Defect** | Missing Roles / IDOR Risk |
| `GET` | `/api/v1/immunisation/vaccines` | `getVaccines` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/immunisation/schedules` | `createSchedule` | AuthGuard('jwt' | Authenticated (Any Role) | **Security Defect** | Missing Roles / IDOR Risk |
| `GET` | `/api/v1/immunisation/schedules` | `getSchedules` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/immunisation/records` | `createRecord` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/immunisation/records` | `getRecords` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/immunisation/search` | `searchRecords` | AuthGuard('jwt' | Authenticated (Any Role) | **Security Defect** | Missing Roles / IDOR Risk |
| `GET` | `/api/v1/immunisation/statistics` | `getStatistics` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/immunisation/records/:id` | `getRecordById` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `PUT` | `/api/v1/immunisation/records/:id` | `updateRecord` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/immunisation/records/:id/administer` | `administerDose` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/immunisation/records/:id/complete` | `completeRecord` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/immunisation/records/:id/defer` | `deferRecord` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/immunisation/records/:id/archive` | `archiveRecord` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/immunisation/records/:id/restore` | `restoreRecord` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/immunisation/certificates` | `generateCertificate` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/immunisation/certificates` | `getCertificates` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/immunisation/reminders/config` | `configureReminder` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |

### 3.12. Controller: `InsuranceController`

- **Prefix**: `/insurance`
- **Source File**: `src/modules/insurance/presentation/controllers/insurance.controller.ts`
- **Registered Routes**: 22
- **Class Guards**: AuthGuard('jwt')
- **Class Roles**: None

| Method | Full Route Path | Handler Method | Auth Guard | Roles / Permissions | Final Classification | Notes / Defect Flags |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/insurance/providers` | `createProvider` | AuthGuard('jwt' | Authenticated (Any Role) | **Security Defect** | Missing Roles / IDOR Risk |
| `GET` | `/api/v1/insurance/providers` | `getProviders` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/insurance/plans` | `createPlan` | AuthGuard('jwt' | Authenticated (Any Role) | **Security Defect** | Missing Roles / IDOR Risk |
| `GET` | `/api/v1/insurance/plans` | `getPlans` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/insurance/policies` | `createFullPolicy` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/insurance/policies` | `getPolicies` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/insurance/search` | `searchPolicies` | AuthGuard('jwt' | Authenticated (Any Role) | **Security Defect** | Missing Roles / IDOR Risk |
| `GET` | `/api/v1/insurance/statistics` | `getStatistics` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/insurance/policies/:id` | `getPolicyById` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `PUT` | `/api/v1/insurance/policies/:id` | `updatePolicyDetails` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/insurance/policies/:id/activate` | `activatePolicy` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/insurance/policies/:id/renew` | `renewPolicy` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/insurance/policies/:id/suspend` | `suspendPolicy` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/insurance/policies/:id/cancel` | `cancelPolicy` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/insurance/policies/:id/archive` | `archivePolicy` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/insurance/policies/:id/restore` | `restorePolicy` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/insurance/policies/:id/verify` | `verifyPolicy` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/insurance/claims` | `createClaimDraft` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/insurance/claims` | `getClaimDrafts` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/insurance/onboard` | `onboardInsurance` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/insurance/ocr/scan` | `scanInsuranceCard` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/insurance/ocr/confirm` | `confirmOcrScan` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |

### 3.13. Controller: `MedicalRecordController`

- **Prefix**: `/medical-records`
- **Source File**: `src/modules/medical-record/presentation/controllers/medical-record.controller.ts`
- **Registered Routes**: 11
- **Class Guards**: AuthGuard('jwt')
- **Class Roles**: None

| Method | Full Route Path | Handler Method | Auth Guard | Roles / Permissions | Final Classification | Notes / Defect Flags |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/medical-records` | `createRecord` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/medical-records` | `getRecords` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/medical-records/timeline` | `getTimeline` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/medical-records/search` | `searchRecords` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/medical-records/:id` | `getRecordById` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `PUT` | `/api/v1/medical-records/:id` | `updateRecord` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `DELETE` | `/api/v1/medical-records/:id` | `softDeleteRecord` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/medical-records/:id/archive` | `archiveRecord` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/medical-records/:id/restore` | `restoreRecord` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/medical-records/:id/attachments` | `uploadRecordAttachment` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/medical-records/:id/attachments` | `getRecordAttachments` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |

### 3.14. Controller: `AttachmentController`

- **Prefix**: `/attachments`
- **Source File**: `src/modules/medical-record/presentation/controllers/medical-record.controller.ts`
- **Registered Routes**: 6
- **Class Guards**: AuthGuard('jwt')
- **Class Roles**: None

| Method | Full Route Path | Handler Method | Auth Guard | Roles / Permissions | Final Classification | Notes / Defect Flags |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/attachments` | `uploadGlobalAttachment` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/attachments/:id` | `getAttachmentById` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `PATCH` | `/api/v1/attachments/:id` | `updateAttachment` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `DELETE` | `/api/v1/attachments/:id` | `softDeleteAttachment` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/attachments/:id/restore` | `restoreAttachment` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/attachments/:id/versions` | `getAttachmentVersions` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |

### 3.15. Controller: `NotificationTemplateController`

- **Prefix**: `/notifications/templates`
- **Source File**: `src/modules/notifications/presentation/controllers/notification-template.controller.ts`
- **Registered Routes**: 5
- **Class Guards**: AuthGuard('jwt'), RolesGuard
- **Class Roles**: ADMIN, SUPER_ADMIN

| Method | Full Route Path | Handler Method | Auth Guard | Roles / Permissions | Final Classification | Notes / Defect Flags |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/notifications/templates` | `createTemplate` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `GET` | `/api/v1/notifications/templates` | `getTemplates` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `GET` | `/api/v1/notifications/templates/:id` | `getTemplateById` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `PUT` | `/api/v1/notifications/templates/:id` | `updateTemplate` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `DELETE` | `/api/v1/notifications/templates/:id` | `softDeleteTemplate` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |

### 3.16. Controller: `NotificationController`

- **Prefix**: `/notifications`
- **Source File**: `src/modules/notifications/presentation/controllers/notification.controller.ts`
- **Registered Routes**: 11
- **Class Guards**: AuthGuard('jwt'), RolesGuard
- **Class Roles**: None

| Method | Full Route Path | Handler Method | Auth Guard | Roles / Permissions | Final Classification | Notes / Defect Flags |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/notifications/dashboard/stats` | `getDashboardStats` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `POST` | `/api/v1/notifications` | `createNotification` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN, FACILITY_ADMIN | **Already Exists** | Implemented |
| `GET` | `/api/v1/notifications` | `getNotifications` | AuthGuard('jwt', RolesGuard | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/notifications/:id` | `getNotificationById` | AuthGuard('jwt', RolesGuard | Authenticated (Any Role) | **Already Exists** | Implemented |
| `PUT` | `/api/v1/notifications/:id/read` | `markAsRead` | AuthGuard('jwt', RolesGuard | Authenticated (Any Role) | **Already Exists** | Implemented |
| `DELETE` | `/api/v1/notifications/:id` | `softDeleteNotification` | AuthGuard('jwt', RolesGuard | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/notifications/preferences` | `getPreferences` | AuthGuard('jwt', RolesGuard | Authenticated (Any Role) | **Already Exists** | Implemented |
| `PUT` | `/api/v1/notifications/preferences` | `updatePreferences` | AuthGuard('jwt', RolesGuard | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/notifications/queue` | `getPendingQueueItems` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `POST` | `/api/v1/notifications/queue/retry` | `retryQueue` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `GET` | `/api/v1/notifications/audit` | `getAuditLogs` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |

### 3.17. Controller: `ObservabilityController`

- **Prefix**: `/observability`
- **Source File**: `src/modules/observability/presentation/controllers/observability.controller.ts`
- **Registered Routes**: 15
- **Class Guards**: None
- **Class Roles**: None

| Method | Full Route Path | Handler Method | Auth Guard | Roles / Permissions | Final Classification | Notes / Defect Flags |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/observability/dashboard` | `getDashboard` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `GET` | `/api/v1/observability/health` | `getHealth` | Public (None) | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/observability/health/live` | `getLiveness` | Public (None) | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/observability/health/ready` | `getReadiness` | Public (None) | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/observability/metrics` | `recordMetric` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `GET` | `/api/v1/observability/metrics` | `getMetrics` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `GET` | `/api/v1/observability/metrics/:category` | `getMetricsByCategory` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `GET` | `/api/v1/observability/logs` | `getLogs` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `GET` | `/api/v1/observability/logs/:requestId` | `getLogsByRequestId` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `GET` | `/api/v1/observability/traces` | `getTraces` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `GET` | `/api/v1/observability/traces/:traceId` | `getTraceById` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `GET` | `/api/v1/observability/jobs` | `getBackgroundJobs` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `GET` | `/api/v1/observability/jobs/:id` | `getBackgroundJobById` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `GET` | `/api/v1/observability/performance` | `getPerformanceSnapshot` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `GET` | `/api/v1/observability/statistics` | `getStatistics` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |

### 3.18. Controller: `OCRController`

- **Prefix**: `/ocr`
- **Source File**: `src/modules/ocr/presentation/controllers/ocr.controller.ts`
- **Registered Routes**: 14
- **Class Guards**: AuthGuard('jwt')
- **Class Roles**: None

| Method | Full Route Path | Handler Method | Auth Guard | Roles / Permissions | Final Classification | Notes / Defect Flags |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/ocr/dashboard` | `getDashboard` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/ocr/statistics` | `getStatistics` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/ocr/jobs` | `submitJob` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/ocr/jobs` | `getJobs` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/ocr/jobs/:id` | `getJobById` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/ocr/jobs/:id/text` | `getJobText` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/ocr/jobs/:id/fields` | `getJobFields` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/ocr/jobs/:id/json` | `getJobJson` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/ocr/templates` | `createTemplate` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/ocr/templates` | `getTemplates` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `PUT` | `/api/v1/ocr/templates/:id` | `updateTemplate` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `DELETE` | `/api/v1/ocr/templates/:id` | `softDeleteTemplate` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/ocr/review` | `getJobsRequiringReview` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/ocr/review/:jobId` | `submitVerification` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |

### 3.19. Controller: `PatientController`

- **Prefix**: `/patients`
- **Source File**: `src/modules/patient/presentation/controllers/patient.controller.ts`
- **Registered Routes**: 28
- **Class Guards**: AuthGuard('jwt')
- **Class Roles**: None

| Method | Full Route Path | Handler Method | Auth Guard | Roles / Permissions | Final Classification | Notes / Defect Flags |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/patients/register` | `register` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/patients/register/status` | `getRegistrationStatus` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `PATCH` | `/api/v1/patients/register/resume` | `resumeRegistration` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/patients/onboarding/demographics` | `onboardDemographics` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `PUT` | `/api/v1/patients/onboarding/demographics` | `updateDemographics` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/patients/onboarding/emergency-contact` | `onboardEmergencyContact` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `PUT` | `/api/v1/patients/onboarding/emergency-contact` | `updateEmergencyContact` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/patients/onboarding/insurance` | `onboardInsurance` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `PUT` | `/api/v1/patients/onboarding/insurance` | `updateInsurance` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/patients/onboarding/health-card` | `onboardHealthCard` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/patients/onboarding/family-invite` | `onboardFamilyInvite` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/patients/onboarding/progress` | `getOnboardingProgress` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/patients/onboarding/complete` | `completeOnboarding` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/patients/onboarding/completion` | `getCompletionPercentage` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/patients/me` | `getProfile` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `PUT` | `/api/v1/patients/me` | `updateProfile` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `PATCH` | `/api/v1/patients/family-consents/:id` | `updateFamilyConsent` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/patients/me/full` | `getFullProfile` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `PATCH` | `/api/v1/patients/me/basic` | `updateBasicInfo` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `PATCH` | `/api/v1/patients/me/contact` | `updateContact` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `PATCH` | `/api/v1/patients/me/address` | `updateAddress` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `PATCH` | `/api/v1/patients/me/preferences` | `updatePreferences` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `PATCH` | `/api/v1/patients/me/medical-summary` | `updateMedicalSummary` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/patients/me/photo` | `uploadPhoto` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `DELETE` | `/api/v1/patients/me/photo` | `deletePhoto` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/patients/profile/completion` | `getProfileCompletion` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/patients/profile/timeline` | `getProfileTimeline` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/patients/profile/activity` | `getProfileActivity` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |

### 3.20. Controller: `QrController`

- **Prefix**: `/qr`
- **Source File**: `src/modules/qr/presentation/controllers/qr.controller.ts`
- **Registered Routes**: 20
- **Class Guards**: AuthGuard('jwt')
- **Class Roles**: None

| Method | Full Route Path | Handler Method | Auth Guard | Roles / Permissions | Final Classification | Notes / Defect Flags |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/qr` | `createQr` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/qr/generate` | `generateQrAlias` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/qr/verify` | `verifyQr` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/qr/rotate` | `rotateQrAlias` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/qr/:id/rotate` | `rotateQr` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/qr/revoke` | `revokeQrAlias` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/qr/:id/revoke` | `revokeQr` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/qr/:id/restore` | `restoreQr` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/qr/:id/archive` | `archiveQr` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/qr` | `getUserQrs` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/qr/search` | `searchQrs` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/qr/statistics` | `getAnalytics` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/qr/:id` | `getQrById` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `PUT` | `/api/v1/qr/:id` | `updateQr` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `DELETE` | `/api/v1/qr/:id` | `softDeleteQr` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/qr/:id/history` | `getQrHistory` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/qr/:id/scans` | `getQrScanLogs` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/qr/bulk-generate` | `bulkGenerate` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/qr/bulk-rotate` | `bulkRotate` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/qr/bulk-revoke` | `bulkRevoke` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |

### 3.21. Controller: `ReferralController`

- **Prefix**: `/referrals`
- **Source File**: `src/modules/referral/presentation/controllers/referral.controller.ts`
- **Registered Routes**: 14
- **Class Guards**: AuthGuard('jwt')
- **Class Roles**: None

| Method | Full Route Path | Handler Method | Auth Guard | Roles / Permissions | Final Classification | Notes / Defect Flags |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/referrals` | `createReferral` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/referrals` | `getReferrals` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/referrals/my-incoming` | `getMyIncoming` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/referrals/my-outgoing` | `getMyOutgoing` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/referrals/dashboard/stats` | `getDashboardStats` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/referrals/:id` | `getReferralById` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `PUT` | `/api/v1/referrals/:id/triage` | `triageReferral` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `PUT` | `/api/v1/referrals/:id/status` | `updateStatus` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/referrals/:id/notes` | `addNote` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/referrals/:id/notes` | `getNotes` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/referrals/:id/attachments` | `addAttachment` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/referrals/:id/attachments` | `getAttachments` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/referrals/:id/history` | `getHistory` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `DELETE` | `/api/v1/referrals/:id` | `softDeleteReferral` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |

### 3.22. Controller: `ReportController`

- **Prefix**: `/reports`
- **Source File**: `src/modules/report/presentation/controllers/report.controller.ts`
- **Registered Routes**: 17
- **Class Guards**: ReportAuthGuard
- **Class Roles**: None

| Method | Full Route Path | Handler Method | Auth Guard | Roles / Permissions | Final Classification | Notes / Defect Flags |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/reports` | `uploadReport` | ReportAuthGuard | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/reports` | `getReportsList` | ReportAuthGuard | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/reports/categories` | `getCategories` | ReportAuthGuard | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/reports/search` | `searchReports` | ReportAuthGuard | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/reports/timeline` | `getTimeline` | ReportAuthGuard | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/reports/:id` | `getReportDetails` | ReportAuthGuard | Authenticated (Any Role) | **Already Exists** | Implemented |
| `PUT` | `/api/v1/reports/:id` | `updateReport` | ReportAuthGuard | Authenticated (Any Role) | **Already Exists** | Implemented |
| `DELETE` | `/api/v1/reports/:id` | `softDeleteReport` | ReportAuthGuard | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/reports/:id/archive` | `archiveReport` | ReportAuthGuard | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/reports/:id/restore` | `restoreReport` | ReportAuthGuard | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/reports/:id/replace` | `replaceReportFile` | ReportAuthGuard | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/reports/:id/versions` | `getReportVersions` | ReportAuthGuard | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/reports/:id/verify` | `verifyReport` | ReportAuthGuard | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/reports/download/:id` | `getDownloadToken` | ReportAuthGuard | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/reports/download/:id/file` | `downloadReportFile` | ReportAuthGuard | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/reports/:id/file` | `downloadReportFileAlias` | ReportAuthGuard | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/reports/preview/:id` | `getPreviewMetadata` | ReportAuthGuard | Authenticated (Any Role) | **Already Exists** | Implemented |

### 3.23. Controller: `ReportsController`

- **Prefix**: `/reports`
- **Source File**: `src/modules/reports/presentation/controllers/reports.controller.ts`
- **Registered Routes**: 17
- **Class Guards**: AuthGuard('jwt'), RolesGuard
- **Class Roles**: ADMIN, SUPER_ADMIN, FACILITY_ADMIN

| Method | Full Route Path | Handler Method | Auth Guard | Roles / Permissions | Final Classification | Notes / Defect Flags |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/reports/dashboard/executive` | `getExecutiveDashboard` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN, FACILITY_ADMIN | **Already Exists** | Implemented |
| `GET` | `/api/v1/reports/analytics/modules/:module` | `getModuleAnalytics` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN, FACILITY_ADMIN | **Already Exists** | Implemented |
| `POST` | `/api/v1/reports/definitions` | `createDefinition` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN, FACILITY_ADMIN | **Already Exists** | Implemented |
| `GET` | `/api/v1/reports/definitions` | `getDefinitions` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN, FACILITY_ADMIN | **Already Exists** | Implemented |
| `GET` | `/api/v1/reports/definitions/:id` | `getDefinitionById` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN, FACILITY_ADMIN | **Already Exists** | Implemented |
| `PUT` | `/api/v1/reports/definitions/:id` | `updateDefinition` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN, FACILITY_ADMIN | **Already Exists** | Implemented |
| `DELETE` | `/api/v1/reports/definitions/:id` | `softDeleteDefinition` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN, FACILITY_ADMIN | **Already Exists** | Implemented |
| `POST` | `/api/v1/reports/generate` | `generateReport` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN, FACILITY_ADMIN | **Already Exists** | Implemented |
| `GET` | `/api/v1/reports/generated` | `getGeneratedReports` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN, FACILITY_ADMIN | **Already Exists** | Implemented |
| `GET` | `/api/v1/reports/generated/:id` | `getGeneratedReportById` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN, FACILITY_ADMIN | **Already Exists** | Implemented |
| `POST` | `/api/v1/reports/generated/:id/export` | `exportReport` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN, FACILITY_ADMIN | **Already Exists** | Implemented |
| `POST` | `/api/v1/reports/widgets` | `createWidget` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN, FACILITY_ADMIN | **Already Exists** | Implemented |
| `GET` | `/api/v1/reports/widgets` | `getWidgets` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN, FACILITY_ADMIN | **Already Exists** | Implemented |
| `PUT` | `/api/v1/reports/widgets/:id` | `updateWidget` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN, FACILITY_ADMIN | **Already Exists** | Implemented |
| `POST` | `/api/v1/reports/widgets/reorder` | `reorderWidgets` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN, FACILITY_ADMIN | **Already Exists** | Implemented |
| `POST` | `/api/v1/reports/snapshots` | `createAnalyticsSnapshot` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN, FACILITY_ADMIN | **Already Exists** | Implemented |
| `GET` | `/api/v1/reports/snapshots` | `getAnalyticsSnapshots` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN, FACILITY_ADMIN | **Already Exists** | Implemented |

### 3.24. Controller: `HolidayController`

- **Prefix**: `/holidays`
- **Source File**: `src/modules/schedule/presentation/controllers/holiday.controller.ts`
- **Registered Routes**: 2
- **Class Guards**: AuthGuard('jwt')
- **Class Roles**: None

| Method | Full Route Path | Handler Method | Auth Guard | Roles / Permissions | Final Classification | Notes / Defect Flags |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/holidays` | `createHoliday` | AuthGuard('jwt' | Authenticated (Any Role) | **Security Defect** | Missing Roles / IDOR Risk |
| `GET` | `/api/v1/holidays` | `getHolidays` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |

### 3.25. Controller: `ScheduleController`

- **Prefix**: `/schedules`
- **Source File**: `src/modules/schedule/presentation/controllers/schedule.controller.ts`
- **Registered Routes**: 13
- **Class Guards**: AuthGuard('jwt')
- **Class Roles**: None

| Method | Full Route Path | Handler Method | Auth Guard | Roles / Permissions | Final Classification | Notes / Defect Flags |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/schedules` | `createSchedule` | AuthGuard('jwt' | Authenticated (Any Role) | **Security Defect** | Missing Roles / IDOR Risk |
| `GET` | `/api/v1/schedules` | `getSchedules` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/schedules/search` | `searchSchedules` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/schedules/statistics` | `getStatistics` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/schedules/:id` | `getScheduleById` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `PUT` | `/api/v1/schedules/:id` | `updateSchedule` | AuthGuard('jwt' | Authenticated (Any Role) | **Security Defect** | Missing Roles / IDOR Risk |
| `DELETE` | `/api/v1/schedules/:id` | `softDeleteSchedule` | AuthGuard('jwt' | Authenticated (Any Role) | **Security Defect** | Missing Roles / IDOR Risk |
| `POST` | `/api/v1/schedules/:id/generate-slots` | `generateSlots` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/schedules/:id/slots` | `getSlots` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/schedules/:id/block` | `blockSchedule` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/schedules/:id/unblock` | `unblockSchedule` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/schedules/:id/leave` | `addLeaveBlock` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/schedules/:id/history` | `getHistory` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |

### 3.26. Controller: `ShiftController`

- **Prefix**: `/shifts`
- **Source File**: `src/modules/schedule/presentation/controllers/shift.controller.ts`
- **Registered Routes**: 4
- **Class Guards**: AuthGuard('jwt')
- **Class Roles**: None

| Method | Full Route Path | Handler Method | Auth Guard | Roles / Permissions | Final Classification | Notes / Defect Flags |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/shifts` | `createShift` | AuthGuard('jwt' | Authenticated (Any Role) | **Security Defect** | Missing Roles / IDOR Risk |
| `GET` | `/api/v1/shifts` | `getShifts` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `POST` | `/api/v1/shifts/:id/assign` | `assignStaffToShift` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |
| `GET` | `/api/v1/shifts/:id/assignments` | `getShiftAssignments` | AuthGuard('jwt' | Authenticated (Any Role) | **Already Exists** | Implemented |

### 3.27. Controller: `SecurityController`

- **Prefix**: `/security`
- **Source File**: `src/modules/security/presentation/controllers/security.controller.ts`
- **Registered Routes**: 17
- **Class Guards**: AuthGuard('jwt'), RolesGuard
- **Class Roles**: ADMIN, SUPER_ADMIN

| Method | Full Route Path | Handler Method | Auth Guard | Roles / Permissions | Final Classification | Notes / Defect Flags |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/security/dashboard` | `getDashboard` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `POST` | `/api/v1/security/consents` | `createConsent` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `GET` | `/api/v1/security/consents` | `getConsents` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `GET` | `/api/v1/security/consents/:id` | `getConsentById` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `POST` | `/api/v1/security/consents/:id/withdraw` | `withdrawConsent` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `POST` | `/api/v1/security/retention` | `createRetentionPolicy` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `GET` | `/api/v1/security/retention` | `getRetentionPolicies` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `PUT` | `/api/v1/security/retention/:id` | `updateRetentionPolicy` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `DELETE` | `/api/v1/security/retention/:id` | `softDeleteRetentionPolicy` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `POST` | `/api/v1/security/incidents` | `createIncident` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `GET` | `/api/v1/security/incidents` | `getIncidents` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `PUT` | `/api/v1/security/incidents/:id/resolve` | `resolveIncident` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `GET` | `/api/v1/security/keys/active` | `getActiveEncryptionKey` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `POST` | `/api/v1/security/keys/rotate` | `rotateEncryptionKey` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `POST` | `/api/v1/security/compliance/report` | `generateComplianceReport` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `GET` | `/api/v1/security/compliance/reports` | `getComplianceReports` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `GET` | `/api/v1/security/audit` | `getAuditLogs` | AuthGuard('jwt', RolesGuard | ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |

### 3.28. Controller: `StaffController`

- **Prefix**: `/staff`
- **Source File**: `src/modules/staff/presentation/controllers/staff.controller.ts`
- **Registered Routes**: 16
- **Class Guards**: AuthGuard('jwt'), RolesGuard
- **Class Roles**: FACILITY_ADMIN, ADMIN, SUPER_ADMIN

| Method | Full Route Path | Handler Method | Auth Guard | Roles / Permissions | Final Classification | Notes / Defect Flags |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/staff` | `registerStaff` | AuthGuard('jwt', RolesGuard | FACILITY_ADMIN, ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `GET` | `/api/v1/staff` | `getStaffMembers` | AuthGuard('jwt', RolesGuard | FACILITY_ADMIN, ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `GET` | `/api/v1/staff/search` | `searchStaff` | AuthGuard('jwt', RolesGuard | FACILITY_ADMIN, ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `GET` | `/api/v1/staff/statistics` | `getStatistics` | AuthGuard('jwt', RolesGuard | FACILITY_ADMIN, ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `GET` | `/api/v1/staff/:id` | `getStaffById` | AuthGuard('jwt', RolesGuard | FACILITY_ADMIN, ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `PUT` | `/api/v1/staff/:id` | `updateStaff` | AuthGuard('jwt', RolesGuard | FACILITY_ADMIN, ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `DELETE` | `/api/v1/staff/:id` | `softDeleteStaff` | AuthGuard('jwt', RolesGuard | FACILITY_ADMIN, ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `POST` | `/api/v1/staff/:id/verify` | `verifyStaff` | AuthGuard('jwt', RolesGuard | FACILITY_ADMIN, ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `POST` | `/api/v1/staff/:id/suspend` | `suspendStaff` | AuthGuard('jwt', RolesGuard | FACILITY_ADMIN, ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `POST` | `/api/v1/staff/:id/restore` | `restoreStaff` | AuthGuard('jwt', RolesGuard | FACILITY_ADMIN, ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `POST` | `/api/v1/staff/:id/generate-qr` | `generateQr` | AuthGuard('jwt', RolesGuard | FACILITY_ADMIN, ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `POST` | `/api/v1/staff/:id/assign-facility` | `assignFacility` | AuthGuard('jwt', RolesGuard | FACILITY_ADMIN, ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `POST` | `/api/v1/staff/:id/assign-department` | `assignDepartment` | AuthGuard('jwt', RolesGuard | FACILITY_ADMIN, ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `GET` | `/api/v1/staff/:id/documents` | `getDocuments` | AuthGuard('jwt', RolesGuard | FACILITY_ADMIN, ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `POST` | `/api/v1/staff/:id/documents` | `attachDocument` | AuthGuard('jwt', RolesGuard | FACILITY_ADMIN, ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
| `GET` | `/api/v1/staff/:id/history` | `getHistory` | AuthGuard('jwt', RolesGuard | FACILITY_ADMIN, ADMIN, SUPER_ADMIN | **Already Exists** | Implemented |
