# CAREID DOCTOR WEB — STRICT PROFILE MODULE BACKEND INTEGRATION REPORT

**Project:** CareID Doctor Web Portal (`doctor-web-frontend-main`)  
**Module:** Profile / Settings (`/settings`, `/settings/security`, `/settings/notifications`, `/settings/support`)  
**Backend:** NestJS Deployed Staging (`https://360api.vnvision.in/api/v1`)  
**Postman Source of Truth:** `Postman collection/CareID-Staging.postman_collection.json`  
**Verification Date:** November 11, 2026  

---

## 1. APIs Discovered in Postman Collection

From `CareID-Staging.postman_collection.json`:
- **Authentication & Account (Folder 01):**
  - `GET /api/v1/auth/me` — Authenticated user claims, roles, permissions, email, phone.
  - `PUT /api/v1/auth/me` — Update account `email` / `phone`.
  - `POST /api/v1/auth/otp/request` & `POST /api/v1/auth/otp/verify` (`{ challengeId, otpCode }`).
  - `POST /api/v1/auth/password/change` — Change account password (`{ currentPassword, newPassword }`).
  - `GET /api/v1/auth/sessions` — List active authenticated sessions (`id`, `ipAddress`, `userAgent`, `createdAt`).
  - `DELETE /api/v1/auth/sessions` — Terminate other active sessions.
  - `DELETE /api/v1/auth/sessions/:sessionId` — Terminate specific session by ID.
  - `POST /api/v1/auth/logout-all` — Logout across all sessions (`{ refreshToken }`).
- **Doctor Portal (Folder 05):**
  - `GET /api/v1/doctors/me` — Authenticated doctor profile (`fullName`, `primarySpecialization`, `licenseNumber`, `registrationNumber`, `providerIdentifier`, `verificationStatus`, `registrationExpiryDate`, `department`, `biography`, `professionalSummary`, `servicesOffered`, `experiences`, `qualifications`, `certifications`, `profilePhotoUrl`, `emergencyPhone`).
  - `PUT /api/v1/doctors/:id` — Update doctor profile fields.
- **Attachments (Folder 16):**
  - `POST /api/v1/attachments` — Multipart upload (`file`, `category`).
  - `GET /api/v1/attachments/file/:filename` — Protected binary attachment stream.
- **Notifications (Folder 18):**
  - `GET /api/v1/notifications/preferences` — Retrieve notification channel preferences.
  - `PUT /api/v1/notifications/preferences` — Update notification channel preferences (`emailEnabled`, `smsEnabled`, `pushEnabled`, `inAppEnabled`, `webhookEnabled`).
- **Security Audit:**
  - `GET /api/v1/security/audit` — Security audit log query.

---

## 2. APIs Successfully Integrated

- `GET /api/v1/auth/me` & `GET /api/v1/doctors/me` (via `authService` and `AuthContext`)
- `PUT /api/v1/doctors/:id` (via `profileService.updateDoctorProfile`)
- `PUT /api/v1/auth/me` (via `profileService.updateUserAccount`)
- `POST /api/v1/attachments` + `PUT /api/v1/doctors/:id` photo persistence (via `profileService.uploadDoctorPhoto`, surfacing backend error when rejected)
- `GET /api/v1/auth/sessions` (via `profileService.getActiveSessions`)
- `DELETE /api/v1/auth/sessions/:sessionId`, `DELETE /api/v1/auth/sessions`, `POST /api/v1/auth/logout-all`
- `POST /api/v1/auth/password/change` (via `profileService.changePassword`)
- `GET /api/v1/security/audit` (via `profileService.getSecurityAuditLogs`, handles 403/404 honestly)
- `GET /api/v1/notifications/preferences` & `PUT /api/v1/notifications/preferences` (via `profileService`)

---

## 3. Profile Fields Mapped to Backend Response Fields

| UI Field (`DoctorProfile`) | Backend Source Field |
|---|---|
| `name` | `doctorMe.fullName` |
| `credentials` | `doctorMe.qualifications[].degreeName` or comma-suffix of `doctorMe.fullName` |
| `title` | `currentExperience.designation` or `${doctorMe.primarySpecialization} Specialist` |
| `specialty` | `doctorMe.primarySpecialization` |
| `npi` | `doctorMe.providerIdentifier` |
| `licenseNumber` | `doctorMe.licenseNumber || doctorMe.registrationNumber` |
| `licenseState` | Joined `[doctorMe.medicalCouncil, doctorMe.registrationState, doctorMe.registrationCountry]` |
| `licenseStatus` | Formatted `doctorMe.verificationStatus` |
| `licenseExpiry` | Formatted `doctorMe.registrationExpiryDate` |
| `hospital` | `currentExperience.hospitalName` (matching `isCurrent` or first experience) |
| `department` | `doctorMe.department` |
| `office` | `''` (empty-value treatment; no clinic street address field on `/doctors/me`) |
| `email` | `userMe.email` |
| `phone` | `userMe.phone` |
| `pager` | `doctorMe.emergencyPhone` |
| `bio` | `doctorMe.biography || doctorMe.professionalSummary` |
| `consultationTypes` | `doctorMe.servicesOffered` |
| `certifications` | `doctorMe.certifications[].title` |
| `avatarUrl` / `sidebarAvatarUrl` | `doctorMe.profilePhotoUrl` resolved via `resolvePatientPhotoUrl` + `loadAuthenticatedPhotoUrl` |

---

## 4. Mock & Hardcoded Data Removed

- Removed `mockData.ts` / static constants (`DEFAULT_DOCTOR_PROFILE`, `INITIAL_TRUSTED_DEVICES`, `INITIAL_AUDIT_LOGS`, `DEFAULT_NOTIFICATION_PREFERENCES`).
- Replaced hardcoded names (`Julian Vance`, `Clinical Admin`), hardware keys (`YubiKey 5C NFC`), static profile avatars (`doctorProfilePrimary`, `doctorAvatarAdmin`), and simulated success timers with real backend state and empty-state rendering.
- Removed Profile expandable/collapsible dropdown state (`isProfileExpanded`) and nested `My Profile` submenu from [`PatientLayout.tsx`](file:///d:/New%20folder/New%20folder/doctor%20web/doctor-web-frontend-main/src/components/layout/PatientLayout.tsx#L410-L428), converting Profile into a direct `<NavLink to="/settings">`.

---

## 5. Security Features Integrated

- **Active Sessions**: Real active sessions loaded from `GET /api/v1/auth/sessions`, matching `sessionId` claim from active JWT to identify current session.
- **Session Revocation**: Real individual session revocation via `DELETE /api/v1/auth/sessions/:sessionId` and bulk termination via `DELETE /api/v1/auth/sessions` / `POST /api/v1/auth/logout-all`.
- **Change Password**: Wired to `POST /api/v1/auth/password/change` with client validation and live backend error surfacing (`400: User does not have a password configured` for OTP-only accounts). No passwords stored in storage/logs.
- **Security Audit Logs**: Wired to `GET /api/v1/security/audit`, displaying an honest permission notice on HTTP 403 (`Forbidden resource` for `DOCTOR` role) instead of fake audit rows, plus CSV export of real loaded entries.

---

## 6. Notification Features Integrated

- Connected `GET /api/v1/notifications/preferences` and `PUT /api/v1/notifications/preferences` in [`NotificationPreferencesPage.tsx`](file:///d:/New%20folder/New%20folder/doctor%20web/doctor-web-frontend-main/src/pages/settings/NotificationPreferencesPage.tsx).
- Synchronized live channel toggles (`emailEnabled`, `smsEnabled`, `pushEnabled`, `inAppEnabled`), preserving `webhookEnabled`, with persistence verified across page reload.
- Error states surfaced directly without fake optimistic success.

---

## 7. Missing Backend APIs / Dependencies

1. **Doctor Profile Photo Upload Endpoint**: `POST /api/v1/attachments` rejects uploads without `patientProfileId` (`HTTP 400: patientProfileId is required for clinical attachment uploads`), and no `/api/v1/doctors/me/photo` endpoint exists in Postman.
2. **Doctor Security Audit Access**: `GET /api/v1/security/audit` rejects `DOCTOR` tokens with `HTTP 403 Forbidden resource`.
3. **Clinic Practice Address on `/doctors/me`**: No street/office address field is returned by `GET /api/v1/doctors/me` or accepted by `PUT /api/v1/doctors/:id`.
4. **Granular Notification Categories & Digest**: Live `PUT /api/v1/notifications/preferences` only exposes boolean channels (`emailEnabled`, `smsEnabled`, `pushEnabled`, `inAppEnabled`, `webhookEnabled`) and lacks per-category (appointment/referral/clinical), sound, maintenance, or digest frequency fields. Note also that Postman's example body (`email`, `sms`, `push`, `inApp`) differs from the live server's `*Enabled` keys.

---

## 8. Files Modified

- [`src/components/layout/PatientLayout.tsx`](file:///d:/New%20folder/New%20folder/doctor%20web/doctor-web-frontend-main/src/components/layout/PatientLayout.tsx)
- [`src/context/AuthContext.tsx`](file:///d:/New%20folder/New%20folder/doctor%20web/doctor-web-frontend-main/src/context/AuthContext.tsx)
- [`src/services/profileService.ts`](file:///d:/New%20folder/New%20folder/doctor%20web/doctor-web-frontend-main/src/services/profileService.ts)
- [`src/pages/settings/types.ts`](file:///d:/New%20folder/New%20folder/doctor%20web/doctor-web-frontend-main/src/pages/settings/types.ts)
- [`src/pages/settings/ProfessionalProfilePage.tsx`](file:///d:/New%20folder/New%20folder/doctor%20web/doctor-web-frontend-main/src/pages/settings/ProfessionalProfilePage.tsx)
- [`src/pages/settings/AccountSecurityPage.tsx`](file:///d:/New%20folder/New%20folder/doctor%20web/doctor-web-frontend-main/src/pages/settings/AccountSecurityPage.tsx)
- [`src/pages/settings/NotificationPreferencesPage.tsx`](file:///d:/New%20folder/New%20folder/doctor%20web/doctor-web-frontend-main/src/pages/settings/NotificationPreferencesPage.tsx)
- [`tests/runtime_profile_verification.cjs`](file:///d:/New%20folder/New%20folder/doctor web/doctor-web-frontend-main/tests/runtime_profile_verification.cjs)

---

## 9. Live API Test Results (`tests/runtime_profile_verification.cjs`)

Executed against `https://360api.vnvision.in/api/v1` (all 13 assertions passed, 0 skipped):
- `[PASS] JWT Claims Decode` (`sub=fa502f2e-332c-4ec0-b6aa-83713216ec88`, `sessionId=841cedaf-5375-44dd-ae51-ea0859948bb8`)
- `[PASS] GET /auth/me`
- `[PASS] GET /doctors/me` (`id=1f06067b-e229-4707-84e2-afa27da2e4cd`, `fullName=Dr. Sarah Jenkins, MD`, `spec=Cardiology`)
- `[PASS] PUT /doctors/:id round-trip & restore`
- `[PASS] PUT /auth/me invalid email validation` (`HTTP 400: ["email must be an email"]`)
- `[PASS] POST /attachments doctor photo gap check` (`HTTP 400: patientProfileId is required...`)
- `[PASS] GET /auth/sessions` (`currentSessionMatched=true`)
- `[PASS] DELETE /auth/sessions/:sessionId` (terminated secondary throwaway session `d23c7cbf-8a80-4d76-8ce9-da966dc48ff9`)
- `[PASS] POST /auth/password/change validation error` (`HTTP 400: User does not have a password configured`)
- `[PASS] GET /security/audit` (`HTTP 403: Forbidden resource`)
- `[PASS] GET & PUT /notifications/preferences persistence` (toggled, verified via GET reload, restored)
- `[PASS] Sidebar Navigation Contract (PatientLayout)`
- `[PASS] Mock & Hardcoded Data Audit` (0 forbidden mock tokens across 8 files)

---

## 10. TypeScript, ESLint & Production Build Results

- `npm run type-check` (`tsc -b --noEmit`): **PASS** (0 errors)
- `npm run lint` (`eslint .`): **PASS** (0 errors / warnings)
- `npm run build` (`tsc -b && vite build`): **PASS** (`✓ 1675 modules transformed`, built in 5.76s)

