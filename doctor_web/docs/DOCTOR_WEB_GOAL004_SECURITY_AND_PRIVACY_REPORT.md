# CareID Doctor Web — Master Goal 004: Security & Privacy Report

**Project**: CAREID — Health Vault 360  
**Title**: Forensic Security, Species Isolation, and Participant Authorization Audit  
**Artifact ID**: `DOCTOR_WEB_GOAL004_SECURITY_AND_PRIVACY_REPORT`  
**Execution Timestamp**: 2026-11-21T13:20:00Z  
**Compliance Standard**: HIPAA §164.312, GDPR Art. 9, Species Isolation Protocol  

---

## 1. Security Architecture Overview

The CareID Health Vault 360 platform implements a multi-layer zero-trust clinical authorization model:
1. **Network Layer**: TLS 1.3 / reverse-proxied containers with strict CORS boundaries.
2. **Authentication Layer**: Phone-based two-factor OTP with cryptographic JWT bearer tokens (`JwtStrategy`) and rate limiting.
3. **Role-Based Access Control (RBAC)**: Enforced via NestJS `RolesGuard` and `@Roles(...)` metadata.
4. **Species Isolation Boundary**: Strict segregation between human clinical datasets (`/patients`, `/medical-records`) and veterinary companion animal datasets (`/pets`, `/vaccinations`).
5. **Participant & Ownership Interlocks**: Object-level authorization preventing cross-doctor or cross-patient data access.

---

## 2. Species Isolation Verification (CR-01)

Automated testing in `test_batch3_security.cjs` (35 assertions) proved 100% enforcement of the species barrier:
- **Human Doctors Blocked from Veterinary Endpoints**:
  - `GET /api/v1/pets` -> `403 Forbidden`
  - `GET /api/v1/doctors/pets` -> `403 Forbidden`
  - `POST /api/v1/doctors/pets/:id/vaccinations` -> `403 Forbidden`
  - `GET /api/v1/doctors/pets/:id/timeline` -> `403 Forbidden`
- **Veterinarians Blocked from Human Endpoints**:
  - `GET /api/v1/doctors/patients` -> `403 Forbidden`
  - `GET /api/v1/doctors/patients/:id/medical-records` -> `403 Forbidden`
  - `POST /api/v1/doctors/patients/:id/prescriptions` -> `403 Forbidden`

---

## 3. Object-Level Authorization Hardening (Goal 004 Remediations)

Prior to Goal 004, two security vulnerabilities existed at the business logic layer:

### 3.1 Messaging Participant Authorization (`SEC-DEFECT-01`)
- **Vulnerability**: Any authenticated user could invoke `getConversationById`, `getMessages`, `sendMessage`, and `markAsRead` with a target conversation UUID, even if they were not a party to the conversation.
- **Remediation**: Implemented `validateParticipant(conv, userId)` in `MessagingService`. Validates `conv.doctorProfile?.userId === userId || conv.patientProfile?.userId === userId`. If false, rejects immediately with `ForbiddenException('Access denied: You are not a participant in this conversation')`.
- **Verification**: Verified via `test_goal004_regression.cjs` (tests SEC-01f through SEC-01i) — Unrelated Doctor 2 receives HTTP 403 across all conversation endpoints.

### 3.2 Schedule Ownership Authorization (`SEC-DEFECT-02`)
- **Vulnerability**: Non-admin doctors could invoke `PUT /schedules/:id`, slot generation, blocking, unblocking, and leave submission against schedules owned by other clinicians.
- **Remediation**: Implemented `validateScheduleOwnership(schedule, user)` in `ScheduleService`. For non-admin doctors, checks `doctorProfile.userId === user.userId` and `schedule.doctorProfileId === doctorProfile.id`.
- **Verification**: Verified via `test_goal004_regression.cjs` (tests SEC-02d through SEC-02g) — Unrelated Doctor 2 receives HTTP 403 on schedule modification attempts.

---

## 4. Unauthenticated Access Gates

All private endpoints enforce JWT presence and validity:
- Non-authenticated requests to `/patients`, `/medical-records`, `/schedules`, `/conversations`, and `/referrals` consistently return `401 Unauthorized`.
- Nonexistent or corrupted QR verification tokens return `200` with `isValid: false` and `status: 'INVALID'` without exposing patient health records.
