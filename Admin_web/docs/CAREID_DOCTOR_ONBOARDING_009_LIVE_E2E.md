# CAREID DOCTOR ONBOARDING 009 — LIVE END-TO-END VERIFICATION REPORT

**Project:** CAREID / HEALTH VAULT 360  
**Goal:** CAREID-DOCTOR-ONBOARDING-AUTH-PHOTO-SPECIALITY-FIX-009  
**Execution Mode:** LIVE BROWSER AUTOMATION (PUPPETEER + BACKEND + POSTGRESQL)  
**Date:** November 24, 2026  
**Status:** **READY FOR EXECUTION**

---

## 1. Test Architecture & Environments

- **Admin Web URL:** `http://localhost:5174`
- **Doctor Web URL:** `http://localhost:5173`
- **Backend API URL:** `http://localhost:3001`
- **PostgreSQL Database:** `localhost:5433` (`careid_integration_db`)
- **Puppeteer Test Runner:** `D:\careid\e2e-doctor-onboarding-009.cjs`
- **Evidence Storage:** `D:\careid\Admin_web\docs\evidence\CAREID_DOCTOR_ONBOARDING_009\`

---

## 2. Test Plan & Execution Scenarios

### Scenario 1: Admin Onboarding of Human Doctor (Pulmonology)
1. **Admin Authentication:**
   - Navigates to `http://localhost:5174/admin/login`.
   - Submits approved admin credentials (`superadmin@careid.test` / `NewSecureAdminPassword123!`).
   - Verifies redirection to `/admin/dashboard`.
   - *Evidence:* `01_admin_login_page.png`, `02_admin_dashboard.png`.

2. **Speciality Catalogue Verification:**
   - Navigates to `/admin/doctors/create`.
   - Inspects speciality dropdown.
   - Confirms dynamic inclusion of **Pulmonology** and **Rheumatology**.
   - *Evidence:* `03_admin_add_doctor_form.png`.

3. **Doctor Creation & Photo Upload:**
   - Fills doctor details:
     - Full Name: `Dr. QA Human Pulmonologist`
     - Email: `doc.human.qa009@careid.test`
     - Phone: `+16505559001`
     - Speciality: `Pulmonology`
     - License: `MED-REG-PULM-9001`
   - Attaches `test_doctor_photo.png` (verified PNG within 2 MB limit).
   - Submits form; verifies HTTP 201 response from backend and subsequent multipart photo upload.
   - Verifies `profile_photo_url` is stored in PostgreSQL.

### Scenario 2: Doctor Web Password Login (Defect 1 Verification)
1. **Login Submission:**
   - Navigates to `http://localhost:5173/auth/login`.
   - Submits `doc.human.qa009@careid.test` and provisioned password.
   - Captures `POST /api/v1/auth/password/login` network exchange.
   - **Verification:** HTTP status is `200 OK` (HTTP 403 "Administrator privileges required" is completely eliminated).
   - *Evidence:* `04_doctor_web_login_page.png`, `05_doctor_login_response.png`.

2. **Doctor Dashboard & Profile Rendering:**
   - Doctor Web stores genuine JWT `careid_access_token` and `careid_refresh_token` in `localStorage`.
   - Doctor is redirected to `/dashboard`.
   - Header and profile sidebar render the uploaded profile avatar from PostgreSQL.

3. **Session Persistence & Relogin:**
   - Page refresh confirms authenticated state is maintained.
   - User clicks Logout -> redirected to `/auth/login`.
   - Re-authenticates successfully with same credentials.

### Scenario 3: Negative & Security Assertions
1. **Incorrect Password Rejection:**
   - Submitting incorrect password returns `HTTP 401 Unauthorized` (`"Invalid identifier or password"`), NOT 403.
2. **Inactive Account Rejection:**
   - Accounts with status `INACTIVE` or `SUSPENDED` return `HTTP 401 Unauthorized` (`"Account is inactive or blocked"`).
3. **Admin Privilege Boundary:**
   - Attempting to call `/api/v1/admin/*` endpoints using the Doctor JWT access token returns `HTTP 403 Forbidden` (`"Insufficient permissions"`).

### Scenario 4: Veterinary Doctor Workflow
1. **Onboarding:**
   - Admin creates veterinary doctor `Dr. QA Vet Specialist` (`doc.vet.qa009@careid.test`).
   - Speciality selected: `Veterinary Medicine`.
2. **Login & Dashboard:**
   - Logs into Doctor Web.
   - Confirms automatic routing to Veterinary Workspace and patient isolation.

---

## 3. Automation Script

The automated test suite has been prepared at:
`d:\careid\e2e-doctor-onboarding-009.cjs`

To run the automated suite once the integration services are active:
```bash
node D:\careid\e2e-doctor-onboarding-009.cjs
```
