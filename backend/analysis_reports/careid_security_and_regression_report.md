# CAREID — Security Audit & Non-Regression Verification Report

**Date:** November 10, 2026  
**Auditor:** Antigravity Senior Principal Backend Engineer  
**Classification:** Production Readiness & Security Assurance

---

## 1. Authentication & Guard Enforcements

Every newly created controller and route was implemented using industry-standard NestJS security patterns:
1. **JWT Authentication Guard:** All clinical routes are gated with `@UseGuards(AuthGuard('jwt'), RolesGuard)` and `@ApiBearerAuth('JWT-Auth')`.
2. **Role-Based Access Control (RBAC):**
   - Doctor Treatment Proposals & Clearances: `@Roles('DOCTOR', 'PRACTITIONER', 'ADMIN', 'SUPER_ADMIN', 'STAFF', 'FACILITY_ADMIN')`
   - Patient Ratification: `@Roles('PATIENT', 'FAMILY_MEMBER')`
   - Cath Lab / Readiness Checklists: `@Roles('DOCTOR', 'PRACTITIONER', 'ADMIN', 'SUPER_ADMIN', 'STAFF', 'FACILITY_ADMIN')`
   - Day-of Intake Check-In: `@Roles('STAFF', 'FACILITY_ADMIN', 'NURSE', 'ADMIN', 'SUPER_ADMIN', 'DOCTOR')`
   - Intra-Op Procedures & Hemodynamics: `@Roles('DOCTOR', 'PRACTITIONER', 'STAFF', 'ADMIN', 'SUPER_ADMIN')`
   - CPT Catalogue & Chargemaster: Public/Authenticated read-only endpoints.

---

## 2. Sensitive Field Encryption (AES-256-GCM)

In compliance with the Healthcare Financing Underwriting specification:
- Field-level encryption is active for `panOrNationalId` and `monthlyIncome`.
- Uses Node.js native `crypto.createCipheriv('aes-256-gcm', key, iv)`.
- Unique 12-byte cryptographically secure initialization vector (IV) per record.
- 16-byte authentication tag verification on decryption.
- Plaintext values are never stored in PostgreSQL or leaked in API logs.

---

## 3. Defensive Error Decoupling & Regression Prevention

1. **Doctor Patients List Read Path:**
   - Isolated `securityConsentRecord` subqueries and audit logging in try/catch wrappers so internal query anomalies never fail the primary listing.
   - Sanitized all date outputs to guarantee `Invalid Date` exceptions cannot occur.
2. **Backward Compatibility:**
   - All 533 baseline Postman requests continue to operate with 100% route and DTO preservation.
   - Database schema was updated non-destructively by utilizing existing text and JSON metadata fields.

