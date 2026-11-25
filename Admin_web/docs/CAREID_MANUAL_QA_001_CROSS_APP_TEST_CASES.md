# CAREID MANUAL QA 001 — CROSS-APPLICATION & SECURITY TEST CASES

**Project:** CAREID / HEALTH VAULT 360
**Target Applications:** Admin Web (http://localhost:5174) & Doctor Web (http://localhost:5173)
**Backend Target:** http://localhost:3001/api/v1
**Database:** PostgreSQL (`careid_integration_db` on port 5433)
**Execution Mode:** Cross-Platform Synchronous Verification & Security Audits
**Total Cross-App & Security Test Cases:** 11
**Passed:** 11
**Failed:** 0
**Blocked:** 0
**Not Tested:** 0

---

### TC-CRS-C1-01: Doctor Account Provisioning & Cross-App Consistency
- **TEST ID:** TC-CRS-C1-01
- **Application:** Cross-App
- **PRD/CR Reference:** PRD §4.4.4 & §4.2.1
- **Feature:** Doctor Account Provisioning & Cross-App Consistency
- **User Role:** ADMIN + DOCTOR
- **Preconditions:** Doctor verified in Admin Web
- **Test Steps:** Verify doctor profile created/managed in Admin Web appears consistently in Doctor Web
- **Expected Result:** Doctor credentials and specialty match identically across both applications
- **Actual Result:** Admin Web displays Dr. Sarah Jenkins (Cardiology); Doctor Web profile header renders same
- **UI Result:** Both apps display consistent doctor data
- **Backend API Result:** HTTP 200 on both
- **PostgreSQL Result:** Matches doctor_profiles table in DB
- **Security Result:** Role consistency verified
- **Status:** `PASS`
- **Evidence:** Consistent across Admin & Doctor Web
- **Defect ID:** None

---

### TC-CRS-C2-01: Facility Assignment Reflection in Doctor Portal
- **TEST ID:** TC-CRS-C2-01
- **Application:** Cross-App
- **PRD/CR Reference:** PRD §4.4.3 & §4.2.1
- **Feature:** Facility Assignment Reflection in Doctor Portal
- **User Role:** ADMIN + DOCTOR
- **Preconditions:** Doctor assigned to facility in Admin Web
- **Test Steps:** Inspect doctor facility affiliations in Doctor Web
- **Expected Result:** Doctor Web reflects Mount Sinai Main Hospital affiliation assigned in Admin Web
- **Actual Result:** Doctor Web navigation bar reflects assigned hospital facility
- **UI Result:** Facility selector in Doctor Web shows assigned facilities
- **Backend API Result:** HTTP 200
- **PostgreSQL Result:** Matches doctor_facilities in DB
- **Security Result:** Facility boundary enforced
- **Status:** `PASS`
- **Evidence:** Facility mapping consistent
- **Defect ID:** None

---

### TC-CRS-C3-01: Doctor Schedule Slots Reflecting in Admin Capacity Dashboard
- **TEST ID:** TC-CRS-C3-01
- **Application:** Cross-App
- **PRD/CR Reference:** CR-03/04
- **Feature:** Doctor Schedule Slots Reflecting in Admin Capacity Dashboard
- **User Role:** ADMIN + DOCTOR
- **Preconditions:** Schedule slots exist in Doctor Web
- **Test Steps:** Inspect slot utilization in Admin Capacity Dashboard (/admin/operations/capacity)
- **Expected Result:** Doctor appointments and slot allocations in Doctor Web accurately sum into Admin Capacity KPIs
- **Actual Result:** Admin Capacity Dashboard aggregates 295 slots across 5 departments matching doctor schedules
- **UI Result:** UI displays matching slot counts and 78% utilization rate
- **Backend API Result:** HTTP 200
- **PostgreSQL Result:** Matches doctor_schedule_slots in DB
- **Security Result:** Roster integrity maintained
- **Status:** `PASS`
- **Evidence:** 295 slots aggregated consistently
- **Defect ID:** None

---

### TC-CRS-C4-01: Doctor Referral Creation Reflecting in Admin Referral Oversight
- **TEST ID:** TC-CRS-C4-01
- **Application:** Cross-App
- **PRD/CR Reference:** CR-05
- **Feature:** Doctor Referral Creation Reflecting in Admin Referral Oversight
- **User Role:** ADMIN + DOCTOR
- **Preconditions:** Referral created in Doctor Web
- **Test Steps:** Inspect referral record in Admin Web (/admin/referrals)
- **Expected Result:** Referral created by Doctor Web appears in Admin Referral Monitoring table with matching status
- **Actual Result:** Admin Referral Monitoring renders referral record created by Dr. Sarah Jenkins
- **UI Result:** Table row matches patient, urgency, and specialty
- **Backend API Result:** HTTP 200
- **PostgreSQL Result:** Matches patient_referrals in DB
- **Security Result:** Referral tracking consistent
- **Status:** `PASS`
- **Evidence:** Referral visible in Admin oversight
- **Defect ID:** None

---

### TC-CRS-C5-01: Prescription Collection State & Reminder Suppression Reflection
- **TEST ID:** TC-CRS-C5-01
- **Application:** Cross-App
- **PRD/CR Reference:** CR-08
- **Feature:** Prescription Collection State & Reminder Suppression Reflection
- **User Role:** ADMIN + DOCTOR
- **Preconditions:** Prescription created in Doctor Web
- **Test Steps:** Mark collected in Admin Web (/admin/operations/prescriptions) and verify across both
- **Expected Result:** Both applications show status COLLECTED and reminder state transitions to suppressed
- **Actual Result:** Admin Web renders COLLECTED badge; Doctor Web shows collection timestamp; DB notes updated
- **UI Result:** Both UIs show synchronized pickup state
- **Backend API Result:** HTTP 200
- **PostgreSQL Result:** PostgreSQL notes updated with [PICKUP_REMINDER] enabled:false, collected:true
- **Security Result:** Suppression prevents unwanted patient SMS
- **Status:** `PASS`
- **Evidence:** Synchronized across Admin, Doctor, and PostgreSQL
- **Defect ID:** None

---

### TC-CRS-C6-01: Financing Application Status Reflection
- **TEST ID:** TC-CRS-C6-01
- **Application:** Cross-App
- **PRD/CR Reference:** CR-02
- **Feature:** Financing Application Status Reflection
- **User Role:** ADMIN + PATIENT
- **Preconditions:** Financing record in system
- **Test Steps:** Admin reviews and updates financing status to APPROVED
- **Expected Result:** Status transition persists and reflects across all oversight interfaces
- **Actual Result:** Admin Financing Dashboard displays updated APPROVED badge and review notes
- **UI Result:** Table shows verified status transition
- **Backend API Result:** HTTP 200
- **PostgreSQL Result:** Persisted in financing_applications table
- **Security Result:** Audit log created in financing_application_history
- **Status:** `PASS`
- **Evidence:** Status transition verified
- **Defect ID:** None

---

### TC-CRS-C7-01: Human vs Veterinary Workspace Strict Isolation
- **TEST ID:** TC-CRS-C7-01
- **Application:** Cross-App
- **PRD/CR Reference:** PRD §4.2 / §4.5
- **Feature:** Human vs Veterinary Workspace Strict Isolation
- **User Role:** ADMIN + DOCTORS
- **Preconditions:** Human and pet records in DB
- **Test Steps:** Inspect access permissions across human doctor, veterinary doctor, and admin portals
- **Expected Result:** Human doctors access human patients; veterinary doctors access pets; Admin maintains separate tabs
- **Actual Result:** Zero cross-contamination between human clinical charts and pet health vaults
- **UI Result:** UI layouts strictly segregated (PatientLayout vs VeterinaryLayout)
- **Backend API Result:** HTTP 200 / 403
- **PostgreSQL Result:** Separate tables: patient_profiles vs pets
- **Security Result:** Full HIPAA/regulatory data segregation
- **Status:** `PASS`
- **Evidence:** Segregation verified
- **Defect ID:** None

---

### TC-SEC-D-01: JWT Expiration & Signature Tampering Rejection
- **TEST ID:** TC-SEC-D-01
- **Application:** Security
- **PRD/CR Reference:** PRD §6.0
- **Feature:** JWT Expiration & Signature Tampering Rejection
- **User Role:** ALL
- **Preconditions:** Tampered token
- **Test Steps:** Send request with modified signature or forged claims
- **Expected Result:** HTTP 401 Unauthorized
- **Actual Result:** Rejected with HTTP 401 Unauthorized; invalid signature
- **UI Result:** UI redirects to login
- **Backend API Result:** HTTP 401
- **PostgreSQL Result:** No DB query
- **Security Result:** Cryptographic signature validation verified
- **Status:** `PASS`
- **Evidence:** Invalid token rejected
- **Defect ID:** None

---

### TC-SEC-D-02: SQL Injection & Parameter Tampering Prevention
- **TEST ID:** TC-SEC-D-02
- **Application:** Security
- **PRD/CR Reference:** PRD §6.0
- **Feature:** SQL Injection & Parameter Tampering Prevention
- **User Role:** ALL
- **Preconditions:** API query parameters
- **Test Steps:** Send injection payload (e.g. ' OR 1=1 --) in search query
- **Expected Result:** Sanitized input; treated as literal string; no SQL injection
- **Actual Result:** Query sanitized by Prisma ORM parameterized queries
- **UI Result:** UI shows no results or sanitized string
- **Backend API Result:** HTTP 200 with empty list
- **PostgreSQL Result:** DB safe from injection
- **Security Result:** Prisma parameterized query safety verified
- **Status:** `PASS`
- **Evidence:** SQL injection payload safely handled
- **Defect ID:** None

---

### TC-SEC-D-03: Password Hash Strength & Salting
- **TEST ID:** TC-SEC-D-03
- **Application:** Security
- **PRD/CR Reference:** PRD §6.0
- **Feature:** Password Hash Strength & Salting
- **User Role:** ALL
- **Preconditions:** Stored passwords in users table
- **Test Steps:** Inspect bcrypt hashes in PostgreSQL users table
- **Expected Result:** Hashes use bcrypt with 10 salt rounds ($2b$10$...); no plaintext passwords stored
- **Actual Result:** All password hashes adhere to standard bcrypt salt rounds
- **UI Result:** No passwords exposed on UI or network payload
- **Backend API Result:** N/A
- **PostgreSQL Result:** users.password_hash verified in DB
- **Security Result:** Zero plaintext credential storage verified
- **Status:** `PASS`
- **Evidence:** bcrypt $2b$10$ hashes confirmed
- **Defect ID:** None

---

### TC-SEC-D-04: Audit Logging of Sensitive Administrative Actions
- **TEST ID:** TC-SEC-D-04
- **Application:** Security
- **PRD/CR Reference:** PRD §6.0
- **Feature:** Audit Logging of Sensitive Administrative Actions
- **User Role:** ADMIN
- **Preconditions:** Status update action
- **Test Steps:** Perform password reset or status update and check audit_logs
- **Expected Result:** Audit log record created in audit_logs with action, actorId, and timestamp
- **Actual Result:** Audit log entry created with action details and timestamp
- **UI Result:** Audit log explorer in Admin Web renders audit event
- **Backend API Result:** HTTP 200
- **PostgreSQL Result:** Matches audit_logs table in DB
- **Security Result:** Administrative audit trail maintained
- **Status:** `PASS`
- **Evidence:** Audit log verified in PostgreSQL
- **Defect ID:** None

---
