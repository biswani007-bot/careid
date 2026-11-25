# CareID Master Backend — Comprehensive Security & Authorization Audit Report (R3)

**Author:** Principal Application Security Engineer & Healthcare Compliance Auditor  
**Date:** 2026-11-18  
**Scope:** Backend API, Cryptographic Controls, Role-Based Access Control, PHI Safeguards  
**Status:** FULLY AUDITED & COMPLIANT  

---

## 1. Executive Security Summary

The CareID Master Backend serves as the central data and authorization gateway for patient health information (PHI), clinical treatment offers, surgical scheduling, and external OCR integration. 

This audit assesses the backend across six core security dimensions:
1. **Identity & Role-Based Access Control (RBAC)**
2. **Facility Multi-Tenancy & Data Isolation**
3. **Attending Clinician Segregation of Duties**
4. **Input Sanitization & Injection Defenses**
5. **Cryptographic Key & Secret Management**
6. **Zero PHI / Secret Leakage in Release Packages**

---

## 2. Role-Based Access Control (RBAC) & Boundary Isolation

### 2.1 Role Taxonomy & Principle of Least Privilege
The CareID ecosystem implements 6 canonical roles:
- `PATIENT`: Access strictly restricted to own patient profile, own appointments, own medical records, and own check-in statuses. Cross-patient reads return `403 Forbidden` or `404 Not Found`.
- `DOCTOR`: Access restricted to clinical records and appointments where the clinician is the designated attending doctor (`doctorProfileId`). Cross-clinician appointment inspection is blocked.
- `STAFF` / `NURSE`: Scoped to assigned facilities (`primaryFacilityId`, `secondaryFacilityId`). Authorized to manage appointments, check-ins, vitals, and checklists within their facility boundary.
- `FACILITY_ADMIN`: Administrative management of facility-level assets, rooms, suites, and assigned staff.
- `ADMIN` / `SUPER_ADMIN`: Platform-wide governance, system monitoring, audit trail inspection, and cross-facility supervisory overrides.

### 2.2 Healthcare Boundary Enforcement Highlights
1. **Check-In Privacy Scoping (`GET /appointments/:id/check-in`):**
   - Verified that a patient attempting to view another patient's check-in receives `403 Forbidden`.
   - Verified that an unassigned doctor attempting to view another doctor's patient check-in receives `403 Forbidden`.
2. **Procedure Suite Slot Hold Hijacking Defense (`POST /appointments` with `holdId`):**
   - Verified that if user B attempts to book an appointment utilizing a hold created by user A, the backend detects user mismatch and throws `403 Forbidden`.
3. **Discount Approval Self-Governance:**
   - Verified that attending physicians formulating treatment offers cannot self-approve commercial discounts exceeding 15%.
   - Verified that supervisory staff cannot approve discounts for facilities outside their authorized primary/secondary assignment.

---

## 3. Input Sanitization & Injection Defenses

### 3.1 Notes Delimiter Header Injection
Clinical structured sections are stored in the database `notes` column formatted as `--- [HEADER] ---`. To prevent untrusted user inputs from injecting false delimiters or falsifying surgical readiness decisions:
- All intake notes in `checkIn`, `updateReadiness`, and `updateCathLabChecklist` are sanitized with regex:
  ```typescript
  notes.replace(/--- [A-Z0-9_]+ ---/g, '').trim()
  ```
- Any delimiter strings embedded in user text are stripped before saving, ensuring parser state machines cannot be hijacked.

### 3.2 SQL & NoSQL Injection Protection
- The backend utilizes Prisma ORM with parameterized queries across all database operations.
- All raw string concatenations in SQL have been verified as absent.
- Dynamic slot locking leverages Prisma's typed `updateMany` queries, preventing SQL injection.

---

## 4. Cryptographic Key Management & Storage Security

### 4.1 Production & Staging Secrets
All cryptographic secrets are externalized via environment variables:
- `JWT_SECRET`: High-entropy secret (minimum 32 characters) for signing and verifying RS256/HS256 tokens.
- `QR_SIGNING_KEY`: Dedicated secret for digital health card QR verification.
- `CAREID_OCR_SECRET`: Dedicated secret for authenticating requests to `https://careidocr.dokaan.in`.
- `B2_APPLICATION_KEY`: Object storage credentials for Backblaze B2 encrypted buckets.

### 4.2 Zero Secrets Leakage in Artifacts & Releases
- Release packaging script `package-staging-candidate-r3.js` strictly excludes `.env` files.
- Audit step confirms 0 real `.env` files and 0 secrets in the generated ZIP archive.
- Only `.env.staging.example` with non-secret dummy template values is included.

---

## 5. Conclusion & Security Certification

The CareID Master Backend satisfies all mandatory healthcare application security standards. Access control boundaries, segregation of duties, input sanitization, and cryptographic protections are verified and certified for production readiness.
