# CAREID DOCTOR ONBOARDING 009 — SECURITY & PRIVACY AUDIT

**Project:** CAREID / HEALTH VAULT 360  
**Goal:** CAREID-DOCTOR-ONBOARDING-AUTH-PHOTO-SPECIALITY-FIX-009  
**Audit Standard:** HIPAA Security Rule, RBAC Least Privilege, OWASP Top 10  
**Date:** November 24, 2026  
**Status:** **PASSED**

---

## 1. Executive Summary

This security assessment audits the changes made to the password login flow, profile photo upload handler, and speciality catalogue. The remediation resolves the Doctor login blocker without introducing authentication bypasses, privilege escalation, or insecure direct object references.

---

## 2. Role-Based Access Control (RBAC) Integrity

### 2.1 Least Privilege Policy
- Permitting doctors to authenticate via `POST /api/v1/auth/password/login` does **NOT** grant administrative privileges.
- Admin portal routes (`/admin/*`) and Admin backend endpoints (`/api/v1/admin/*`) strictly enforce `@Roles('ADMIN', 'SUPER_ADMIN')` via `RolesGuard`.
- Attempting to access an administrative endpoint with a Doctor JWT access token continues to result in:
  ```json
  {
    "statusCode": 403,
    "message": "Forbidden resource",
    "error": "Forbidden"
  }
  ```

### 2.2 Token Claims & Scope Separation
- Admin sessions carry administrative roles (`ADMIN` / `SUPER_ADMIN`) and permissions from the Admin permission map.
- Doctor sessions carry the `DOCTOR` role and clinical permissions (view patients, author clinical encounters, issue prescriptions, manage slots).
- Patient records remain isolated according to approved facility and physician assignments.

---

## 3. Credential & Password Security

### 3.1 Hashing & Provisioning
- Doctor passwords provisioned by administrators or set via password reset are securely hashed using bcrypt (`SALT_ROUNDS = 12`) before persistence in the `users` table.
- Raw passwords and password hashes are **NEVER** exposed in API responses, logs, or reports.
- Authentication attempts employ constant-time comparison to mitigate timing attacks.

### 3.2 Audit Logging
All authentication events are recorded in the PostgreSQL `audit_logs` table:
- `DOCTOR_PASSWORD_LOGIN_SUCCESS`: Authenticated user ID, client IP address, and timestamp.
- `PASSWORD_LOGIN_FAILED`: Failed identifier, client IP address, reason (invalid password vs. account blocked), without recording the attempted password.

---

## 4. File Upload Security (Profile Photos)

### 4.1 Input Validation & Restrictions
- **MIME Type Validation:** Client-side and server-side checks restrict uploads strictly to `image/jpeg` and `image/png`. Executable files (`.exe`, `.sh`, `.php`, `.js`) and SVG files (which can contain embedded XSS scripts) are strictly rejected.
- **File Size Cap:** Enforced strictly at 2 MB (`2,097,152 bytes`). Files exceeding this size are rejected with a clear 400 Bad Request error.
- **Filename Sanitization:** Uploaded filenames are randomized (UUIDv4) upon storage to prevent path traversal (`../../`) attacks.

### 4.2 Storage & Authorization
- The upload endpoint `POST /api/v1/doctors/:id/photo` verifies that the caller has administrative authorization or is the authenticated doctor modifying their own profile (`id === req.user.id`).
- Direct access to unauthorized storage directories is prohibited.

---

## 5. Security Checklist Audit

| Security Control | Requirement | Status | Verification Detail |
|---|---|---|---|
| **SC-01** | Passwords hashed with bcrypt | **PASS** | Hash verified in database schema; no plaintext stored |
| **SC-02** | No passwords/tokens in reports | **PASS** | Reports sanitized; credentials replaced with synthetic placeholders |
| **SC-03** | No Admin privilege escalation | **PASS** | Doctors cannot invoke `/api/v1/admin/*` endpoints |
| **SC-04** | Inactive accounts blocked | **PASS** | Returns `401 Unauthorized` for `status !== 'ACTIVE'` |
| **SC-05** | Photo upload 2 MB limit | **PASS** | Validated in UI and multer middleware |
| **SC-06** | Audit trail on login | **PASS** | Audit events stored in `audit_logs` |
| **SC-07** | Data isolation (Human/Vet) | **PASS** | Veterinary workspace remains isolated from human clinical records |
