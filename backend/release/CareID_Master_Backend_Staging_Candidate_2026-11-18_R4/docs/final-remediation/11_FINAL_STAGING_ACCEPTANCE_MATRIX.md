# CAREID MASTER BACKEND — FINAL STAGING ACCEPTANCE MATRIX

**Document ID:** CRID-DOC-REM-11  
**Target Environment:** Staging (`https://360api.vnvision.in/api/v1`)  
**Scope:** Complete Backend API Subsystems (Phases 1–16)  

---

## 1. Subsystem Acceptance Status

| Subsystem | Functional Scope | Security / RBAC Gate | Persistence Gate | Status |
|---|---|---|---|---|
| **Auth & Sessions** | OTP login, password login, token refresh, logout, audit logging | Rate-limited, proxy-trust verified, sensitive hashes excluded | PostgreSQL `users`, `audit_logs` | **ACCEPTED** |
| **Doctor Portal** | Doctor profile, active visits, patient lookups, templates, referrals | Verified doctor status enforced, profile soft-delete respected | PostgreSQL `doctor_profiles`, `doctors_patients` | **ACCEPTED** |
| **Patient Registration** | Walk-in patient creation, QR issuance, HealthCard assignment | 409 Conflict on phone/email collision, role-restricted to doctor/staff | PostgreSQL `patient_profiles`, `health_cards`, `qr_codes` | **ACCEPTED** |
| **Treatment Offers** | Stages 1–6: Creation, itemized estimation, financing, discount approval, dispatch, ratification | Attending physician self-approval blocked, staff scoped by facility | PostgreSQL `treatment_offers`, `treatment_offer_history` | **ACCEPTED** |
| **Appointments & Holds** | Stages 7–16: Slots, durable holds, booking, status transitions, readiness, check-in, safety checklists | Hijacking blocked, vitals bounds checked, patient/doctor clinical privacy | PostgreSQL `appointments`, `generated_slots` | **ACCEPTED** |
| **Clinical Records** | Dental, Vision, Cath Lab, Lab reports, Prescriptions | Drug interaction check, clinical validation | PostgreSQL `clinical_records`, `prescriptions` | **ACCEPTED** |
| **Admin Operations** | Patient list, doctor verification, facility assignment, settings reset | `ADMIN`, `SUPER_ADMIN` only, Lucas Vance null-safe parsing | PostgreSQL `admin_audit_logs`, `system_settings` | **ACCEPTED** |
| **OCR Integration** | Document upload, async processing, reprocessing, format validation | 8 supported formats enforced, token auth with worker | Standalone OCR Worker via HMAC | **ACCEPTED** |
| **Storage & Uploads** | Profile photos, lab attachments, scan uploads | Antivirus boundary, 5MB limit, magic byte validation | Backblaze B2 S3 storage | **ACCEPTED** |

---

## 2. Detailed Workstream Validation Results

### Workstream A: Hold Durability & Crash Recovery
- **Acceptance Criterion:** Temporary holds survive PM2 restart and node process recycling.
- **Verification Method:** Unit tests verified serialization to `generated_slots.status_reason` (`HELD_JSON`). Memory wipe test confirmed automatic recovery from PostgreSQL. Expired holds auto-revert slot to `AVAILABLE`.
- **Result:** **PASSED**

### Workstream B: Discount Approval Facility Scoping
- **Acceptance Criterion:** Staff supervisors can only approve discounts for offers at their assigned facility.
- **Verification Method:** Out-of-facility staff supervisor rejected with HTTP 403 Forbidden. In-facility staff supervisor approved with audit trail. Global admin approved across facilities. Attending physician self-approval rejected.
- **Result:** **PASSED**

### Workstream C: Day-of-Procedure Check-In Integrity & Privacy
- **Acceptance Criterion:** Physiological sanity validation on vitals, clinical privacy scoping on GET check-in.
- **Verification Method:** Out-of-range vitals rejected with HTTP 400 Bad Request. Patient owner and assigned doctor permitted; foreign patient/doctor rejected with HTTP 403 Forbidden.
- **Result:** **PASSED**

### Workstream D: Patient Profile userStatus Fallback
- **Acceptance Criterion:** No false fabrication of `'ACTIVE'` status for patients lacking user accounts.
- **Verification Method:** Fallback returns actual `p.status` or `'UNKNOWN'`.
- **Result:** **PASSED**

### Workstream E: Zero-Migration Database Stability
- **Acceptance Criterion:** Zero changes to Prisma schema or new database migrations.
- **Verification Method:** Existing 7 migrations remain untouched and verified against PostgreSQL 16.
- **Result:** **PASSED**

---
**Acceptance Sign-off:** Principal Software Architect & QA Lead  
**Overall Acceptance:** **100% ACCEPTED (GO FOR OPERATOR DEPLOYMENT)**
