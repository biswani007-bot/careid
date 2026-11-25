# CAREID DOCTOR ONBOARDING 009 — ROOT CAUSE ANALYSIS REPORT

**Project:** CAREID / HEALTH VAULT 360  
**Goal:** CAREID-DOCTOR-ONBOARDING-AUTH-PHOTO-SPECIALITY-FIX-009  
**Priority:** P0 (Doctor Login Blocked)  
**Date:** November 24, 2026  
**Status:** **ROOT CAUSE VERIFIED & REMEDIATED**

---

## 1. Executive Summary

This report documents the exhaustive root cause investigation for three critical defects identified in the CareID Doctor Onboarding and Authentication workflows:
1. **Defect 1 (P0):** Newly created Doctor accounts could not log in through Doctor Web, returning `HTTP 403 Forbidden: "Access denied. Administrator privileges required."`.
2. **Defect 2 (P1):** Doctor profile photo upload failed to persist images across sessions, disappearing upon browser refresh.
3. **Defect 3 (P2):** Speciality selection was restricted to a static hardcoded dropdown lacking approved medical specialities such as *Pulmonology* and *Rheumatology*.

---

## 2. Defect 1: Doctor Password Login 403 Forbidden

### 2.1 Observed Behavior
- An administrator logs into Admin Web (`http://localhost:5174`) and creates a new Doctor account at `/admin/doctors/create`.
- Admin Web reports successful creation of the doctor and user records in PostgreSQL (`careid_integration_db`).
- The doctor attempts to log in at Doctor Web (`http://localhost:5173/auth/login`) using their email and newly provisioned password.
- The request `POST /api/v1/auth/password/login` fails with `HTTP 403 Forbidden`.
- **Response Payload:**
  ```json
  {
    "statusCode": 403,
    "message": "Access denied. Administrator privileges required.",
    "error": "Forbidden"
  }
  ```

### 2.2 Code Analysis & Root Cause
In `backend/src/modules/auth/application/use-cases/auth.service.ts`, lines 543–553:
```typescript
// 8. Verify administrator privileges (ADMIN or SUPER_ADMIN required)
const hasAdminRole = userRoles.includes('ADMIN') || userRoles.includes('SUPER_ADMIN');
if (!hasAdminRole) {
  await this.authRepository.createAuditLog(
    user.id,
    'ADMIN_PASSWORD_LOGIN_FAILED',
    'Non-admin user attempted password login',
    ipAddress,
  );
  throw new ForbiddenException('Access denied. Administrator privileges required.');
}
```

The `passwordLogin` method in `auth.service.ts` was originally authored exclusively for the Admin portal and hardcoded a strict check requiring the caller to hold `ADMIN` or `SUPER_ADMIN` roles. Because the newly created Doctor user has the `DOCTOR` role, the backend rejected authentication at the authorization gate, even though the identifier and password hash matched successfully in step 5.

Furthermore, Doctor Web's `authService.loginWithPassword` (in `doctor_web/src/services/authService.ts`) routes to `/api/v1/auth/password/login`. Because this shared endpoint rejected non-admin roles, all doctors attempting password login were systematically blocked.

---

## 3. Defect 2: Doctor Profile Photo Upload Failure

### 3.1 Observed Behavior
- Administrator selects a JPG/PNG profile photo during doctor onboarding in Admin Web.
- The UI shows an immediate image preview.
- Doctor creation is completed.
- Upon navigating to the Doctor Directory or refreshing the Doctor Profile, the avatar reverts to a generic placeholder.

### 3.2 Code Analysis & Root Cause
1. **Missing Multipart Dispatch:** In `Admin_web/src/components/doctors/AdminAddDoctor.tsx`, the form handled the file selection via `handleAvatarChange`, creating a local blob/data URL (`avatarPreview`). However, the form submission handler did not send a multipart/form-data upload request to the authorized backend upload endpoint (`POST /api/v1/doctors/:id/photo`).
2. **Persistence Gap:** The backend `DoctorProfile` schema contains `profilePhotoUrl: String?`. Because the binary was never transferred to the backend or saved to disk/storage, `profilePhotoUrl` remained `null` in the PostgreSQL `doctor_profiles` table.
3. **Data Loss on Refresh:** Because only the in-memory React state held the local preview URL, any page refresh or navigation wiped the preview and displayed the default fallback icon.

---

## 4. Defect 3: Hardcoded Speciality Dropdown

### 4.1 Observed Behavior
- In `/admin/doctors/create` and the Doctor Profile Edit modal, the speciality selection dropdown was rendered from a static array in frontend source code.
- Essential medical specialities—specifically **Pulmonology** and **Rheumatology**—were absent from the list.
- Administrators had no interface to introduce new specialities or modify existing ones without modifying TypeScript source code and rebuilding the frontend bundle.

### 4.2 Code Analysis & Root Cause
In `Admin_web/src/components/doctors/AdminAddDoctor.tsx`:
```typescript
const SPECIALTY_OPTIONS = [
  'Cardiology', 'Neurology', 'Oncology', 'Pediatrics',
  'Dermatology', 'Orthopedics', 'General Surgery', 'Psychiatry'
];
```
The application did not query the backend catalogue API and had no dynamic query integration. Furthermore, TypeScript interfaces lacked status/active flags for managing speciality lifecycles safely without affecting historical doctor assignments.

---

## 5. Summary Matrix

| Defect ID | Description | Root Cause Location | Mechanism | Severity |
|---|---|---|---|---|
| **DEF-009-01** | Doctor Login 403 Forbidden | `backend/src/modules/auth/application/use-cases/auth.service.ts` | Role check enforced `ADMIN`/`SUPER_ADMIN` on password login | **P0** |
| **DEF-009-02** | Profile Photo Not Persisted | `Admin_web/src/components/doctors/AdminAddDoctor.tsx` | Binary never dispatched via `FormData` to backend photo endpoint | **P1** |
| **DEF-009-03** | Fixed Speciality Dropdown | `Admin_web/src/components/doctors/AdminAddDoctor.tsx` | Static array in UI; missing catalogue query integration | **P2** |
