# CareID Doctor Web Batch 3 — Security & Regression Audit Report

**Target:** Doctor Web Batch 3 Final Acceptance Gap Review  
**Project:** CareID Platform  
**Master Goal:** `CAREID-MASTER-DOCTOR-WEB-001`  
**Execution Mode:** Forensic Audit + Verification + Test Execution  
**Status:** Audit In-Progress — Batch 4 Not Approved  
**Date:** 2026-11-21  

---

## 1. Executive Summary

This Security and Regression Audit independently evaluates the security controls, species isolation boundaries, role-based access enforcement, prescription safeguards, and QR subsystem security implemented in CareID Doctor Web Batch 3.

### Key Security Determinations:
1. **Species Isolation (Backend):** The NestJS backend strictly enforces clinical boundaries between human healthcare and veterinary medicine. Ordinary human physicians cannot read or write companion animal clinical data (`403 Forbidden`). Pure veterinarians cannot access human patient directories, medical records, or prescriptions (`403 Forbidden`).
2. **Cross-Veterinarian Access Boundaries:** A veterinarian without an active, established care relationship to a specific companion animal cannot query its vaccination records, add vaccinations, or view its longitudinal timeline (`403 Forbidden`).
3. **Prescription Security Boundaries:** Species isolation checks in `PrescriptionService` strictly reject pure veterinarians attempting to author or query human patient prescriptions (`403 Forbidden`).
4. **QR Subsystem Security:** The supported endpoint is confirmed as `POST /api/v1/qr/verify` (requiring JWT authentication). It verifies cryptographic signatures and status, logs all validation attempts to `qr_scan_logs`, and returns metadata only without bypassing clinical access controls.
5. **Dual-Role Safety Gate:** `RoleRouteGuard.tsx` implements Clinical Safety Gate R1 to halt execution upon dual-role ambiguity. However, an architectural defect in `AuthContext.tsx` was identified during this audit wherein all single-role veterinarians are misidentified as ambiguous dual-role holders due to the shared `DOCTOR` database role.

---

## 2. Test Execution Inventory: Security & Authorization

| Test ID | Test Scope & Target | Target Endpoint / Mechanism | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| **SEC-01** | Human Doctor → Pet Directory | `GET /api/v1/pets` | `403 Forbidden` | `403 Forbidden` | **PASS** |
| **SEC-02** | Human Doctor → Doctor Pet Directory | `GET /api/v1/doctors/pets` | `403 Forbidden` | `403 Forbidden` | **PASS** |
| **SEC-03a** | Human Doctor → Add Pet Vaccination | `POST /api/v1/doctors/pets/:id/vaccinations` | `403 Forbidden` | `403 Forbidden` | **PASS** |
| **SEC-03b** | Human Doctor → View Pet Vaccinations | `GET /api/v1/doctors/pets/:id/vaccinations` | `403 Forbidden` | `403 Forbidden` | **PASS** |
| **SEC-03c** | Human Doctor → View Pet Timeline | `GET /api/v1/doctors/pets/:id/timeline` | `403 Forbidden` | `403 Forbidden` | **PASS** |
| **SEC-04** | Veterinarian → Human Patient Directory | `GET /api/v1/doctors/patients` | `403 Forbidden` | `403 Forbidden` | **PASS** |
| **SEC-05** | Veterinarian → Human Medical Records | `GET /api/v1/doctors/patients/:id/medical-records` | `403 Forbidden` | `403 Forbidden` | **PASS** |
| **SEC-06** | Veterinarian → Create Human Prescription | `POST /api/v1/doctors/patients/:id/prescriptions` | `403 Forbidden` | `403 Forbidden` | **PASS** |
| **SEC-07** | Veterinarian → Query Human Prescriptions | `GET /api/v1/prescriptions?patientProfileId=:id` | `403 Forbidden` | `403 Forbidden` | **PASS** |
| **SEC-08** | Veterinarian → Human Consultation Access | `GET /api/v1/consultations?patientProfileId=:id` | `403 Forbidden` | `403 Forbidden` | **PASS** |
| **SEC-09a** | Unrelated Vet → Add Vaccination | `POST /api/v1/doctors/pets/:id/vaccinations` | `403 Forbidden` | `403 Forbidden` | **PASS** |
| **SEC-09b** | Unrelated Vet → View Vaccinations | `GET /api/v1/doctors/pets/:id/vaccinations` | `403 Forbidden` | `403 Forbidden` | **PASS** |
| **SEC-09c** | Unrelated Vet → View Timeline | `GET /api/v1/doctors/pets/:id/timeline` | `403 Forbidden` | `403 Forbidden` | **PASS** |
| **SEC-10** | Unrelated Vet → Pet Clinical Records | `GET /api/v1/doctors/pets/:id/records` | `403 Forbidden` | `403 Forbidden` | **PASS** |
| **VET-01** | Treating Vet → Doctor Pet Directory | `GET /api/v1/doctors/pets` | `200 OK` (list) | `200 OK` (list) | **PASS** |
| **VET-02** | Treating Vet → Add Vaccination | `POST /api/v1/doctors/pets/:id/vaccinations` | `201 Created` | `201 Created` | **PASS** |
| **VET-02b** | Treating Vet → PostgreSQL Persistence | Table `pet_vaccinations` | Record exists | Record persisted | **PASS** |
| **VET-03** | Treating Vet → List Pet Vaccinations | `GET /api/v1/doctors/pets/:id/vaccinations` | `200 OK` (items) | `200 OK` (items) | **PASS** |
| **VET-04** | Treating Vet → View Pet Timeline | `GET /api/v1/doctors/pets/:id/timeline` | `200 OK` (sorted) | `200 OK` (sorted) | **PASS** |
| **QR-01** | Nonexistent QR Verification | `POST /api/v1/qr/verify` (bad token) | `200 OK` (isValid=false) | `200 OK` (isValid=false) | **PASS** |
| **QR-02** | Missing Token Payload | `POST /api/v1/qr/verify` (empty body) | `400 Bad Request` | `400 Bad Request` | **PASS** |
| **QR-03** | Unauthenticated QR Verification | `POST /api/v1/qr/verify` (no Bearer) | `401 Unauthorized` | `401 Unauthorized` | **PASS** |
| **QR-04** | QR Scan Audit Logging | Table `qr_scan_logs` | Audit record written | Audit record written | **PASS** |
| **UNAUTH-01** | Unauthenticated → Patients | `GET /api/v1/doctors/patients` | `401 Unauthorized` | `401 Unauthorized` | **PASS** |
| **UNAUTH-02** | Unauthenticated → Doctor Pets | `GET /api/v1/doctors/pets` | `401 Unauthorized` | `401 Unauthorized` | **PASS** |
| **UNAUTH-03** | Unauthenticated → Referrals | `GET /api/v1/referrals` | `401 Unauthorized` | `401 Unauthorized` | **PASS** |
| **UNAUTH-04** | Unauthenticated → Medical Records | `GET /api/v1/doctors/patients/:id/medical-records` | `401 Unauthorized` | `401 Unauthorized` | **PASS** |
| **UNAUTH-05** | Unauthenticated → Pet Vaccinations | `GET /api/v1/doctors/pets/:id/vaccinations` | `401 Unauthorized` | `401 Unauthorized` | **PASS** |
| **UNAUTH-06** | Unauthenticated → Pet Timeline | `GET /api/v1/doctors/pets/:id/timeline` | `401 Unauthorized` | `401 Unauthorized` | **PASS** |

---

## 3. Deep Dive: QR Subsystem Security Architecture

### 3.1 Supported Endpoint Resolution
* **Endpoint Confirmed:** `POST /api/v1/qr/verify`
* **Non-Existent Endpoint:** `POST /api/v1/qr/scan` returns `404 Not Found`. Any client or documentation referencing `/api/v1/qr/scan` is outdated and non-operational.
* **Authentication:** Enforced by `@UseGuards(AuthGuard('jwt'), RolesGuard)` on `QrController`. Unauthenticated calls are rejected with `401 Unauthorized`.

### 3.2 Token Lifecycle & Cryptographic Signing
* QR tokens are reusable Smart Health Card identity tokens signed with HMAC-SHA256 (`crypto.createHmac('sha256', secret)`).
* Tokens carry an `expiresAt` timestamp (default validity: 365 days).
* Supported status values: `VALID`, `EXPIRED`, `REVOKED`, `ROTATED`, `INVALID`.
* Verification does not consume or destroy the token; it logs each scan event to `qr_scan_logs`.

### 3.3 Scope Isolation & Clinical Guardrails
* `POST /api/v1/qr/verify` returns entity metadata only:
  ```json
  {
    "isValid": true,
    "status": "VALID",
    "entityType": "PATIENT",
    "entityId": "3896bc97-bd3b-40ae-80c1-0cc0455ca3a4",
    "ownerId": "...",
    "scannedAt": "2026-11-21T04:45:52.000Z"
  }
  ```
* **Critical Guard:** Verification does NOT return clinical records, prescriptions, vitals, or SOAP notes. It does NOT generate or issue an access token. The scanning app must separately query clinical APIs under the clinician's own authenticated session, subject to full authorization checks.

---

## 4. Deep Dive: Prescription Security & Boundaries

### 4.1 Species Isolation in Prescriptions
* `backend/src/modules/prescription/prescription.service.ts` inspects the prescriber's user roles and doctor profile specializations.
* Pure veterinarians (`hasVetSpec && !hasHumanSpec && !roles.includes('ADMIN')`) attempting to call `POST /api/v1/doctors/patients/:patientProfileId/prescriptions` or query `GET /api/v1/prescriptions` are rejected with `403 Forbidden`:
  > *"Access denied: Veterinarians are not authorized to create prescriptions for human patients"*
* Authorized human physicians (`Dr. Sarah Jenkins`) successfully create and manage human prescriptions.

### 4.2 Pharmacy Management Scope Exclusion
CareID supports electronic prescription authoring, encounter linkage, and binary PDF export. The following are explicitly excluded from platform scope:
* Pharmacy POS / retail sales.
* Pharmacy inventory and stock reconciliation.
* Drug dispensing workflows.
* Pharmacy administrative billing.

---

## 5. Security Regressions & Defects Identified

### FINDING-SEC-01: Dual-Role Misclassification in AuthContext (Resolved)
* **Finding ID:** `FINDING-SEC-01`
* **Severity:** High / Blocker
* **Description:** In `doctor_web/src/context/AuthContext.tsx`, `hasHumanCredential` was previously computed as `hasExplicitDoctorRole || hasHumanSpec`. Because every clinician in CareID possesses the PostgreSQL enum role `DOCTOR`, all veterinarians had `hasHumanCredential = true`. When combined with their `Veterinary Medicine` specialization (`hasVetCredential = true`), `isExplicitDualRole` evaluated to `true` for all pure veterinarians, blocking legitimate veterinarians behind the R1 Clinical Safety Gate barrier.
* **Resolution Applied:** Refactored `resolveWorkspaceDetails()` in `AuthContext.tsx` to require verified human clinical specialization for human credentials, correctly distinguishing single-role veterinarians without conflating the `DOCTOR` database role. Updated `AuthPlaceholder.tsx` to dynamically navigate based on `authUser.workspaceType`.
* **Verification Status:** **RESOLVED & VERIFIED PASS.** Tested against 15 automated matrix cases and confirmed in live browser (`E2E-05`, `E2E-08`, `E2E-09`, `E2E-10`). Zero regressions across all 35 backend security tests.
