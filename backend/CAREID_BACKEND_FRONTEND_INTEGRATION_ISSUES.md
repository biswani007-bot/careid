# CareID — Outstanding Backend / Frontend Integration Issues & Recommendations

**Project:** CareID / Health Vault 360 Enterprise Healthcare Platform  
**Target Environment:** aaPanel Linux (Staging: `https://360api.vnvision.in`)  
**Base URL:** `https://360api.vnvision.in/api/v1`  
**Evaluation Date:** November 3, 2026  
**Auditor:** Senior Backend Architect & Frontend Integration Lead  

---

## 1. Executive Overview

During the complete backend audit, remediation, and Postman collection synchronization for the November 3, 2026 staging release, several architectural nuances, response envelope variations, and client-side integration dependencies were identified.

While all 510 backend API endpoints are source-verified and fully functional on the backend, client applications (Patient Mobile App, Doctor Portal Web, Admin Dashboard, and Reception Desk Web) must align with the contracts described below to ensure seamless end-to-end operation.

---

## 2. Identified Integration Issues & Resolution Guide

### 2.1 Issue 1: Executive Dashboard Route Discrepancy
- **Context:** Previous frontend documentation and legacy service clients made requests to `GET /api/v1/reports/executive`.
- **Backend Reality:** The active NestJS controller is [`src/modules/reports/presentation/controllers/reports.controller.ts:28`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/reports/presentation/controllers/reports.controller.ts#L28), which defines `@Controller('reports')` and `@Get('dashboard/executive')`.
- **Impact:** Frontend components calling the legacy path receive HTTP 404 Not Found.
- **Frontend Action Required:** Update API client endpoints in the Admin Web portal from `/api/v1/reports/executive` to:
  ```ts
  GET /api/v1/reports/dashboard/executive?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&facilityId=<UUID>
  ```

---

### 2.2 Issue 2: Notification Platform Singular vs. Plural Route Aliases
- **Context:** Mobile apps historically invoked plural `/api/v1/notifications/preferences` while certain web admin widgets called singular `/api/v1/notification/preferences`.
- **Backend Remediation:** In [`src/modules/notifications/presentation/controllers/notification.controller.ts:19`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/notifications/presentation/controllers/notification.controller.ts#L19), the controller is decorated with `@Controller(['notifications', 'notification'])`, supporting both styles.
- **Frontend Recommendation:** Although the backend transparently accepts both, frontend developers should standardize on plural `/api/v1/notifications/*` across all frontend codebases for API consistency.

---

### 2.3 Issue 3: Admin User List Response Envelope (`items` vs. `data`)
- **Context:** Some frontend table components (e.g. Ant Design or Material UI tables) expect a pagination object with an `items` array, while standard CareID endpoints return a `data` array inside the envelope.
- **Backend Remediation:** `AdminRepository.findUsers` returns a dual-compatible object containing both `.items` and `.data`:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "data": {
      "items": [ /* User objects */ ],
      "data": [ /* User objects (identical) */ ],
      "total": 45,
      "page": 1,
      "limit": 20
    }
  }
  ```
- **Frontend Action Required:** Ensure frontend client interceptors unpack `response.data.data` or `response.data.items` safely without breaking on standard envelopes.

---

### 2.4 Issue 4: Demonstration Persistence Caveat for Support, Pets & Financing
- **Context:** To strictly respect the project safety rule prohibiting unapproved PostgreSQL database migrations, three newly implemented modules operate on local JSON file stores:
  - Support Tickets: `data/support-tickets.json`
  - Pet Health Records: `data/pets.json`
  - Healthcare Financing: `data/financing-applications.json`
- **Backend Behavior:** All responses explicitly disclose this state in their metadata:
  ```json
  {
    "isDemonstrationStorage": true,
    "storageNotice": "Operating on staging demonstration persistence. Dedicated PostgreSQL schema migration pending approval."
  }
  ```
- **Frontend Action Required:**
  - Frontend developers should be aware that while data persists across restarts on a single staging host, it is not replicated in multi-container setups.
  - The UI may optionally display a subtle "Staging Demonstration Mode" badge on these three screens.

---

### 2.5 Issue 5: Authentication Segmentation (OTP vs. Password Login)
- **Context:** CareID strictly enforces role-based authentication segmentation:
  - **Password Login (`POST /api/v1/auth/password/login`):** For `SUPER_ADMIN`, `ADMIN`, `DOCTOR`, `STAFF`, `FACILITY_ADMIN`.
  - **Phone OTP Login (`POST /api/v1/auth/otp/request` & `verify`):** Mandatory for `PATIENT` and `FAMILY_MEMBER` (and optionally available to all other roles).
- **Frontend Error Handling:**
  - If a patient enters an email/password into the admin portal, the backend rejects it.
  - If an administrator calls `POST /api/v1/admin/users/:id/reset-password` on a patient account, the backend returns HTTP 400 with:
    `"Password reset is only applicable to accounts with password authentication. Patients and family members authenticate exclusively via phone OTP."`
- **Frontend Action Required:** The UI must suppress the "Reset Password" button for patient and family member rows in the Admin user management table.

---

### 2.6 Issue 6: Production Disablement of Integration API Keys
- **Context:** In [`src/modules/security/application/use-cases/security.service.ts:106`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/security/application/use-cases/security.service.ts#L106), key creation throws `BadRequestException` when `process.env.NODE_ENV === 'production'`.
- **Frontend Action Required:** The Developer Settings / API Keys management tab in the Admin Web portal should gracefully inspect the environment or handle HTTP 400 by showing:
  `"Integration API keys are disabled in production mode. Available on staging and local test environments only."`

---

### 2.7 Issue 7: Referral Creation & Audit Event Scoping
- **Context:** When creating a referral (`POST /api/v1/referrals`), the frontend must supply `patientId` (UUID) and `receivingFacilityId` (UUID). The referring doctor is automatically resolved from the caller's JWT token.
- **Backend Fix Applied:** Audit logging has been decoupled from the primary database transaction, eliminating PostgreSQL rollback errors.
- **Frontend Action Required:** The frontend referral creation form must validate that the selected doctor belongs to the target facility before submitting.

---

### 2.8 Issue 8: Defensive ISO-8601 Date Serialization
- **Context:** All backend models have been updated with `safeIso` serialization. Dates are formatted as standard ISO strings (e.g. `2026-11-03T12:00:00.000Z`) or `null` if unset.
- **Frontend Action Required:** Frontend components must parse ISO strings using standard date libraries (e.g. `date-fns`, `dayjs`, or native `Intl.DateTimeFormat`) rather than assuming local date-only strings (`YYYY-MM-DD`).

---

## 3. Summary of Frontend Action Items

| Priority | Frontend Component / Area | Action Required | Target Endpoint |
| :---: | :--- | :--- | :--- |
| **P1** | **Admin Web Portal** | Update Executive Dashboard route from `/reports/executive` to `/reports/dashboard/executive`. | `GET /api/v1/reports/dashboard/executive` |
| **P1** | **Admin User Management** | Hide "Reset Password" button on rows where role is `PATIENT` or `FAMILY_MEMBER`. | `POST /api/v1/admin/users/:id/reset-password` |
| **P2** | **Notification Clients** | Standardize route paths on plural `/api/v1/notifications/*`. | `GET/PUT /api/v1/notifications/preferences` |
| **P2** | **Admin Data Tables** | Ensure table pagination handlers check both `.data` and `.items`. | `GET /api/v1/admin/users` |
| **P3** | **Admin API Keys View** | Display informational banner when API key creation is disabled in production. | `POST /api/v1/security/api-keys` |
| **P3** | **Helpdesk, Pets, Financing** | Display staging demonstration storage indicator if desired. | `/api/v1/support/*`, `/pets/*`, `/financing/*` |
