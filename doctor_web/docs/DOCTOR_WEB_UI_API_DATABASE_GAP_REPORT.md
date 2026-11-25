# CAREID DOCTOR WEB — UI, API & DATABASE GAP REPORT

**Document ID:** CAREID-REPORT-DOCWEB-002-GAP  
**Date:** November 21, 2026  
**Auditor:** Antigravity Senior Principal Systems & Regulatory Compliance Auditor  
**Project:** CAREID — HEALTH VAULT 360  
**Master Goal:** CAREID-MASTER-DOCTOR-WEB-002  
**Target:** CareID Doctor Web Application, NestJS Backend & PostgreSQL Database  

---

## 1. Executive Summary

This report provides a forensic evaluation of the end-to-end technical connectivity across the three architectural tiers of the CareID Doctor Web platform:
1. **Frontend Presentation Tier**: React 18, Vite, TypeScript, React Router DOM, Tailwind CSS.
2. **Backend Application Tier**: NestJS, Express, Passport JWT, Role Guards, Service Layer.
3. **Database Persistence Tier**: PostgreSQL, Prisma ORM, Migration History.

Every clinical feature was audited across the transaction path:
$$\text{Doctor Web UI} \longrightarrow \text{Backend API} \longrightarrow \text{Business Logic} \longrightarrow \text{PostgreSQL} \longrightarrow \text{API Response} \longrightarrow \text{Updated Doctor Web UI}$$

---

## 2. Technical Findings Across Application Tiers

### 2.1 Placeholder Pages & Inactive Route Handlers

The following routes currently render `PlaceholderPage` or `AuthPlaceholder` instead of fully functional clinical screens:

| Route Path | Component Rendered | Node ID | Module Name | Root Cause & Technical Impact |
| :--- | :--- | :---: | :--- | :--- |
| `/settings/schedule` | `PlaceholderPage` | `1:9120` | Settings | Doctor schedule slot availability and clinic block-outs are not editable from the frontend. The backend `ScheduleController` exists but has no frontend client wire. |
| `/reports/outcomes` | `PlaceholderPage` | `1:7120` | Clinical Reports | Treatment efficacy, readmission rates, and patient satisfaction charts are non-functional placeholders. |
| `/reports/exports` | `PlaceholderPage` | `1:7230` | Clinical Reports | Custom dataset exports and HIPAA audit log CSV generation have no triggering UI. |
| `/treatment-offers/:id/notes` | `PlaceholderPage` | `1:15610` | CareID Treatment Lifecycle | Intra-operative clinical notes placeholder. (Associated with Cath Lab surgical expansion). |
| `/treatment-offers/:id/follow-up` | `PlaceholderPage` | `1:15850` | CareID Treatment Lifecycle | Post-operative checkup booking placeholder. |

### 2.2 Unconnected Event Handlers & Missing Frontend Triggers

| UI Screen | Element / Action | Observed Behavior | Required Behavior |
| :--- | :--- | :--- | :--- |
| `DashboardPage.tsx` | "Export PDF" / "Export Excel" buttons | Inactive `onClick` or logs to console | Invoke `reportService.exportDashboardMetrics({ format: 'pdf' \| 'xlsx' })` and stream binary download. |
| `PrescriptionsPage.tsx` | Prescription Issuance Modal | Creates prescription, but lacks reminder toggle | Must include a checkbox for "Patient Pickup Reminder" and numeric input for "Reminder Interval (hours)" conforming to CR-08. |
| `Facility Management` | Affiliated Facility Switcher / Staff List | No page exists in `doctor_web/src/pages/` | Build `FacilityManagementPage.tsx` using existing `facilityService.ts` to assign Facility Admin and view mapped doctors/staff (PRD §4.2). |
| `Messaging / Office Chat` | Patient Inquiry Response Console | No page or drawer exists in Doctor Web | Build `OfficeChatConsole.tsx` connecting to backend `MessagingController` (CR-07). |

### 2.3 Hardcoded Data & Fallback Object Audit

A code scan was conducted to locate static initial state, fabricated clinical values, and mock objects:
- **`treatmentOfferService.ts` & `consultationService.ts`**: The legacy `careid_treatment_offers_store` localStorage mock was fully eliminated during Batch 1 remediation. Data models now hydrate directly from `/api/v1/doctors/treatment-offers` and `/api/v1/appointments/doctor/me`.
- **`PatientMedicalHistoryPage.tsx`**: Fully integrated with live backend endpoint `GET /api/v1/patients/:id/medical-history`. Static fallback arrays are removed.
- **`PrescriptionsPage.tsx`**: Batch 2 refactored prescription generation to consume PostgreSQL records.
- **`VeterinaryPetPage.tsx`**: Batch 3 refactored pet vaccinations and clinical notes to persist directly to `pet_vaccinations` and `pet_clinical_records`.
- **Remaining Hardcoded Artifact**: In `treatment-offers/AppointmentDetailsPage.tsx`, static clinic address lines ("Cardiology Pavilion, Suite 400") remain hardcoded if the appointment object's `facility` relation is unpopulated.

### 2.4 Backend Controller Security & Guard Integrity

Audit of backend controllers in `backend/src/modules/`:

| Controller | Auth Guard (`JwtAuthGuard`) | Role Guard (`RolesGuard`) | Tenant / Doctor Isolation | Audit Logging (`AuditLog`) |
| :--- | :---: | :---: | :---: | :---: |
| `DoctorController` | Yes | Yes (`DOCTOR`) | Enforced (`req.user.id`) | Yes |
| `PatientController` | Yes | Yes | Enforced (Care relationship check) | Yes |
| `PrescriptionController` | Yes | Yes (`DOCTOR`) | Enforced (Prescriber ID stamped) | Yes |
| `ReferralController` | Yes | Yes (`DOCTOR`) | Enforced (Referring/Referred doctor) | Yes |
| `ScheduleController` | Yes | Yes (`DOCTOR`) | Enforced (`doctorId` check) | Partial (Slot updates logged, reads unlogged) |
| `MessagingController` | Yes | Yes | Enforced (Participant check) | Missing message read audit log |
| `CathLabController` | Yes | Yes (`DOCTOR`) | Enforced | Extensive procedural logs |

### 2.5 Database Model & Schema Integrity

Inspection of `backend/prisma/schema.prisma` against Doctor Web requirements:

| Module | Required Fields | Prisma Model | Table Name | Status |
| :--- | :--- | :--- | :--- | :---: |
| **Doctor Schedule** | `dayOfWeek`, `startTime`, `endTime`, `isAvailable`, `slotDuration` | `DoctorScheduleSlot` | `doctor_schedule_slots` | **Complete** (All fields exist with proper foreign keys to `DoctorProfile`). |
| **Prescription Pickup**| `pickupReminderEnabled`, `pickupReminderHours` | `Prescription` | `prescriptions` | **Field Gap**: `pickupReminderEnabled` (Boolean) and `pickupReminderHours` (Int) are missing on the `Prescription` model. Currently relies on generic `NotificationPreference`. |
| **Facility Management** | `role`, `status`, `approvalStatus` | `FacilityStaff`, `FacilityAdmin` | `facility_staff`, `facility_admins` | **Complete** (Approved by SuperAdmin workflow supported in schema). |
| **2-Way Office Chat** | `senderId`, `recipientId`, `body`, `readAt` | `DirectMessage`, `Conversation` | `direct_messages`, `conversations` | **Complete** (Full relational chat structure exists in database). |

### 2.6 QR Verification Architecture & Flutter Handoff

- **Decision Verification**: Camera QR scanning is strictly assigned to Developer 2's Flutter Doctor App (`CAREID_doctor_app`).
- **Doctor Web Contract**: Doctor Web does not require camera access, WebRTC libraries, or QR scanning modals.
- **Backend Readiness**: Backend provides `POST /api/v1/qr/verify` accepting:
  ```json
  {
    "qrData": "careid://patient/PAT-99214-UUID",
    "facilityId": "fac-01-uuid",
    "scannedBy": "doc-01-uuid"
  }
  ```
  The endpoint verifies signature validity, checks active doctor-patient care relationships, records a `QrVerificationLog`, and returns the authorized `patientId` for navigation to `/patients/:id`.

---

## 3. Prioritized Remediation Summary

To bring the technical integrity to 100%:
1. **P0 (Prisma Migration)**: Add `pickupReminderEnabled` (Boolean default false) and `pickupReminderHours` (Int default 2) to the `Prescription` model in `schema.prisma` when executing the CR-08 batch.
2. **P1 (Frontend Wiring)**: Replace `/settings/schedule` placeholder with an authentic interactive weekly slot editor wired to `ScheduleController`.
3. **P1 (Facility Screen)**: Author `FacilityManagementPage.tsx` using existing `facilityService.ts`.
4. **P1 (Chat Console)**: Author `OfficeChatConsole.tsx` connecting to `MessagingController`.
5. **P2 (Export Triggers)**: Connect Dashboard and Clinical Reports export buttons to backend streaming endpoints.
