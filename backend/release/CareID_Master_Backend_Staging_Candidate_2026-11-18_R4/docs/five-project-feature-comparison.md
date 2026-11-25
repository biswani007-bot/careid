# CareID — Five-Project Feature Discovery and Gap Analysis

**Analysis Date:** October 26, 2026  
**Target Repository (Source of Truth):** `C:\Users\PABANI\Downloads\hvapi-main\hvapi-main`  
**Reference Baseline Snapshot (Strictly Read-Only):** `C:\Users\PABANI\Downloads\hvapi-main\hvapi-main - Copy`  
**Reference Projects Audited (Strictly Read-Only):**
1. `C:\Users\PABANI\Downloads\hvapi-main\Healthcare-app-main\Healthcare-app-main`
2. `C:\Users\PABANI\Downloads\hvapi-main\Hospital-Management-System-React-main\Hospital-Management-System-React-main`
3. `C:\Users\PABANI\Downloads\hvapi-main\hms_backend-main\hms_backend-main`
4. `C:\Users\PABANI\Downloads\hvapi-main\icd-11-nextjs-nestjs-boilerplate-main\icd-11-nextjs-nestjs-boilerplate-main`
5. `C:\Users\PABANI\Downloads\hvapi-main\medical-system-backend-master\medical-system-backend-master`

---

## 1. Executive Overview & Methodology

This report documents an evidence-based, read-only discovery and comparative gap analysis of five external healthcare applications against the target CareID NestJS backend. The objective is to identify verified, genuinely implemented capabilities across the reference projects that could provide clinical, operational, or architectural value to CareID, while filtering out mock code, incompatible architectures, security risks, and unapproved features.

### Inspection Principles & Constraints
- **Zero Modifications:** No files were copied, moved, renamed, merged, or modified across any project.
- **Source-Grounded Verification:** Every capability claim is supported by actual source files, controller routes, Prisma/TypeORM/Mongoose models, and services. No README claims or assumptions were accepted as proof.
- **CareID as Target Source of Truth:** CareID's modular NestJS architecture, PostgreSQL database, Prisma ORM, and documented security model remain the benchmark. Features are not integrated by redesigning CareID to match external stacks.
- **Mandatory Safety Boundaries:** Appointment booking, doctor cross-profile clinical access, Prisma schema changes, database migrations, and Redis/Valkey deployment remain strictly guarded by governance approval boundaries.

---

## 2. Target Project Baseline: CareID API (`hvapi-main`)

Before evaluating external projects, CareID's existing architecture, models, and boundaries were audited:

### 2.1 Core Technology Stack
- **Framework:** NestJS 11.1.28 on Express 5, TypeScript 5.7, Node.js 20+
- **Database & ORM:** PostgreSQL 15+ via Prisma 7.9.1 (`@prisma/client` and `@prisma/adapter-pg`)
- **Authentication & Security:** Phone OTP with bcrypt, JWT access tokens, atomic refresh token rotation with UUID `jti`, Helmet 8.3, strict production CORS, loopback host binding (`127.0.0.1:3073`), and proxy trust guardrails.
- **Observability & Logging:** `nestjs-pino` with Pino 10, custom health probes (`/health/live`, `/health/ready`).

### 2.2 Domain Scope & Implemented Modules
CareID contains **24 active domain modules** and **28 controllers**:
1. `auth`: OTP request, verification, resend, refresh rotation, session tracking, logout.
2. `patient`: Demographic profile, blood group, emergency contacts, profile auditing.
3. `family`: Family member linkage, legal relationship types, consent records.
4. `doctor`: Doctor profile, qualifications, certifications, experience, facility affiliations.
5. `facility`: Healthcare facilities, branches, departments, rooms, licenses, accreditations.
6. `staff`: Staff profiles, certifications, department assignments.
7. `medical-record`: Encounters, clinical diagnoses, vital signs, procedures, attachments, audit logs.
8. `referral`: Doctor-to-doctor patient referrals, clinical notes, attachments, triage workflows.
9. `immunisation`: Vaccine catalog, vaccination schedules, records, certificates, reminders.
10. `health-card`: Digital health cards, issue/expiry, status transitions, card history.
11. `qr`: Dynamic and static QR codes, cryptographic verification, scan logs.
12. `report` & `reports`: Patient medical report metadata, download token issuance, analytics definitions, generated PDF reports.
13. `insurance`: Insurance providers, plans, policies, beneficiaries, claim drafts.
14. `schedule`: Weekly working hours, shift assignments, holiday calendars, schedule exceptions, slot generation.
15. `cms`: Pages, FAQs, announcements, banners, policies, media library.
16. `notifications`: Multi-channel notification dispatch, templates, user preferences, delivery queue.
17. `observability`: Metrics, application logs, distributed traces, background jobs, performance snapshots.
18. `governance` & `security`: Platform maintenance configuration, encryption key records, security incident logs, data retention policies.
19. `ai-ocr` & `ocr`: OCR document processing, text extraction, review queue, template verification.
20. `admin`: Administrative dashboard metrics, user status controls, platform statistics.

### 2.3 Explicit CareID Blocked Boundaries (Documented in `docs/blocked-features-and-approvals.md`)
- **Appointment Booking:** `AppointmentController` is an empty stub. No `Appointment` model exists in `prisma/schema.prisma`. Schema modifications are blocked pending owner approval.
- **Doctor Cross-Profile Record Access:** Direct record queries enforce patient ownership (`record.patientProfileId !== callerProfileId` -> 403 Forbidden). Doctor access requires an approved Patient Consent Token workflow.
- **Shared Multi-Process Rate Limiter:** `AuthRateLimiterService` is currently an in-memory process-local map; Redis/Valkey integration is blocked.
- **Antivirus Daemon:** Attachment virus scanning defaults to `'PENDING'`; ClamAV or external daemon integration is pending infrastructure provisioning.

---

## 3. Reference Project Audits

```
+----------------------------------------------------------------------------------------------------+
|                                    FIVE REFERENCE PROJECTS OVERVIEW                                |
+------------------------------------+--------------------------+-----------------+------------------+
| Project Folder                     | Primary Tech Stack       | Database/ORM    | Primary Role     |
+------------------------------------+--------------------------+-----------------+------------------+
| 1. Healthcare-app-main             | NestJS 10 + Next.js      | PostgreSQL/Pris | Patient/Appt Demo|
| 2. Hospital-Management-System-React| NestJS 10 + React Vite   | MS SQL/Prisma   | Full Clinic/Phar |
| 3. hms_backend-main                | NestJS 10                | PostgreSQL/Type | Appt Lifecycle   |
| 4. icd-11-nextjs-nestjs-boilerplate| NestJS 10 + Next.js      | PostgreSQL/Type | WHO ICD-11 Lookup|
| 5. medical-system-backend-master   | NestJS 10                | MongoDB/Mongoose| Rx & Drug Catalog|
+------------------------------------+--------------------------+-----------------+------------------+
```

---

### 3.1 Project 1: `Healthcare-app-main`

- **Repository Path:** `Healthcare-app-main\Healthcare-app-main`
- **Architecture:** Full-stack monorepo featuring a NestJS 10 backend (`backend/`) and Next.js 14 frontend (`frontend/`).
- **Database & ORM:** PostgreSQL using Prisma 5.16.2.
- **Dependencies:** `@prisma/client`, `dayjs`, `pdf-lib`, `class-validator`.

#### A. Implemented Data Models
Defined in `backend/prisma/schema.prisma`:
1. `Patient`: Autoincrement integer `id`, `firstName`, `lastName`, `birthDate`, `address`.
2. `Appointment`: Autoincrement integer `id`, `date`, `startTime`, `doctor` (plain string), `reason`, foreign key `patientId`.
3. `MedicalRecord`: Autoincrement integer `id`, `date`, `diagnosis` (enum), `treatment` (enum), `medication` (enum), `visitType` (enum), vitals (`bloodPressure`, `heartRate`, `temperature`, `weight`, `height`), `notes`.

#### B. Verified Endpoints & Capabilities
- **Appointments (`backend/src/appointment/appointment.controller.ts`):**
  - `POST /appointments`: Creates appointment with duplicate date/time conflict check.
  - `GET /appointments`: Lists all appointments.
  - `GET /appointments/:id`: Fetches appointment by ID with patient relation.
  - `PUT /appointments/:id`: Updates appointment details.
  - `DELETE /appointments/:id`: Deletes appointment.
  - `GET /appointments/day/:day`: Fetches sorted appointments for a specific calendar date.
  - `GET /appointments/nearest/:patientId`: Queries the closest upcoming appointment for a given patient.
  - `PUT /appointments/:id/reschedule`: Reschedules appointment to a future date/time with conflict validation.
  - `validateTimeRange`: Enforces clinic working hours between 08:00 and 20:00.
- **Patients (`backend/src/patient/patient.controller.ts`):**
  - Full CRUD with first/last name case-insensitive search (`/patients/search/fullname`).
- **Medical Records (`backend/src/medical-record/medical-record.controller.ts`):**
  - Full CRUD with SQL raw aggregations:
    - `getMedicalRecordsCountByDiagnosisPerMonth`: Monthly breakdown of diagnoses.
    - `getMedicalRecordsCountByVisitTypePerMonth`: Monthly breakdown of visit types.

#### C. Architectural & Security Limitations
- **Zero Authentication:** No JWT, no passwords, no OTP, no guards, no roles. All clinical data is accessible to any unauthenticated HTTP client.
- **Incompatible ID Architecture:** Uses autoincrement integers (`id: Int`) rather than CareID's standard UUIDv4 strings.
- **Unverified Doctor Identification:** Stores `doctor` as an arbitrary free-text string rather than a relational reference to an authenticated `DoctorProfile`.
- **Hardcoded Diagnostic Enums:** Diagnosis and medications are rigid Prisma enums (`Hypertension`, `Antibiotics`, etc.) rather than standardized terminology codes.

---

### 3.2 Project 2: `Hospital-Management-System-React-main`

- **Repository Path:** `Hospital-Management-System-React-main\Hospital-Management-System-React-main`
- **Architecture:** Monorepo containing a NestJS 10 backend (`apps/api/`) and React frontend (`apps/web/`).
- **Database & ORM:** Microsoft SQL Server (`sqlserver` provider) using Prisma 5.22.0.
- **Dependencies:** `@nestjs/jwt`, `@nestjs/passport`, `bcryptjs`, `@tanstack/react-table`, `jspdf`.

#### A. Implemented Data Models
Defined in `apps/api/prisma/schema.prisma` and SQL migrations:
1. `User`: `email`, `password`, `name`, `role` (`Admin`, `Doctor`, `Receptionist`, `Pharmacist`, `Nurse`), `phone`, `department`, `status`.
2. `Patient`: `name`, `age`, `gender`, `contact`, `email`, `bloodGroup`, `disease`, `address`, `emergencyContact`, `emergencyPhone`, `photoUrl`.
3. `Doctor`: `name`, `age`, `gender`, `contact`, `email`, `address`, `specialization`, `qualification`, `availability`, `consultationFee`, `licenseNumber`.
4. `Appointment`: `patientId`, `doctorId`, `date`, `time`, `status` (`Pending`, `Confirmed`, `Completed`, `Cancelled`), `type` (`In-Person`, `Teleconsultation`), `notes`.
5. `Medicine`: `name`, `manufacturer`, `category`, `priceCents`, `quantity`, `reorderLevel`, `expiryDate`, `batchNumber`, `unit`.
6. `Dispensation` & `DispensationItem`: Tracks medication dispensation to patients by pharmacists.
7. `Invoice` & `InvoiceItem`: Invoicing system with subtotal, tax, discount, total, payment modes (`Cash`, `Card`, `UPI`, `Insurance`), and itemized billing links.
8. `Ward`: Hospital bed management with `totalBeds` and `occupiedBeds`.
9. `Vital`: Detailed vitals tracking (`heartRate`, `systolic`, `diastolic`, `spo2`, `temperatureC`).

#### B. Verified Endpoints & Capabilities
- **Appointments (`apps/api/src/appointments/appointments.controller.ts`):**
  - Protected with `AuthGuard('jwt')` and `RolesGuard`.
  - Roles permitted: `ADMIN`, `DOCTOR`, `RECEPTIONIST`, `STAFF`.
  - Conflict checking: rejects bookings if doctor already has an active appointment at that date/time.
- **Pharmacy & Dispensation (`apps/api/src/pharmacy/pharmacy.service.ts`):**
  - Medicine inventory management with reorder thresholds and expiry tracking.
  - Transactional dispensation (`dispense`): executes inside a Prisma `$transaction`, verifies stock, atomically decrements inventory (`quantity: { decrement: item.quantity }`), creates dispensation records, and generates an associated invoice.
- **Billing & Invoices (`apps/api/src/billing/billing.controller.ts`):**
  - Generates itemized invoices, computes subtotals and taxes, tracks payment status (`UNPAID`, `PAID`, `CANCELLED`), and supports multiple payment methods.
- **Wards & Beds (`apps/api/src/wards/wards.controller.ts`):**
  - Bed occupancy tracking for inpatient wards.

#### C. Architectural & Security Limitations
- **Database Incompatibility:** Configured specifically for Microsoft SQL Server (`provider = "sqlserver"`, `NVARCHAR`, `DATETIME2`). CareID uses PostgreSQL 15+.
- **Staff-Only Appointment Model:** Only staff and receptionists can manage appointments; patient self-service booking is not supported.
- **Monolithic User Passwords:** Uses traditional username/password authentication rather than CareID's secure phone OTP and refresh token rotation model.

---

### 3.3 Project 3: `hms_backend-main`

- **Repository Path:** `hms_backend-main\hms_backend-main`
- **Architecture:** Standalone NestJS 10 backend with modular enterprise structure.
- **Database & ORM:** PostgreSQL using TypeORM 0.3.
- **Dependencies:** `@nestjs/typeorm`, `@nestjs/throttler`, `@nestjs/swagger`, `pg`, `class-validator`, `sanitize-html`.

#### A. Implemented Data Models
Defined in `src/entities/`:
1. `Appointment`: `scheduled_date`, `scheduled_time`, `status` (`SCHEDULED`, `CONFIRMED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `POSTPONED`, `NO_SHOW`), `cancellation_reason`, `postponed_from_date`.
2. `Consultation`: Links patient, doctor, and appointment; tracks consultation clinical notes and progression (`DRAFT`, `IN_PROGRESS`, `COMPLETED`).
3. `DayFinalization`: Daily clinic closing ledger tracking audit counts and preventing retroactive changes.
4. `Holiday` & `HolidayTemplate`: Clinic operational holidays and recurring holiday sets.
5. `PatientNote`: Free-form clinical notes categorized by consultation episode.
6. `ScheduleSetting`: Clinic session durations, working intervals, and capacity limits.
7. `Treatment`: Prescribed therapy and procedural plans linked to consultations.

#### B. Verified Endpoints & Capabilities
- **Advanced Appointment Lifecycle (`src/controllers/appointment.controller.ts`):**
  - `PATCH /appointments/:id/postpone`: Postpones an appointment to a specific future date.
  - `POST /appointments/bulk/postpone`: Bulk postpones multiple appointments affected by physician absence or emergency clinic closure.
  - `POST /appointments/bulk/cancel`: Bulk cancels appointments with mandatory audit reason.
  - `POST /appointments/next-available-date`: Algorithmic lookup determining the next available booking slot matching the patient's existing weekday.
  - `GET /appointments/unresolved-past`: Proactively flags past appointments left in `IN_PROGRESS` or unfinalized states.
  - `POST /appointments/absence-justifications`: Records patient justifications for missed appointments.
  - `POST /appointments/recompute-return-for-episode`: Automatically recalculates episode return dates following clinical postponements.
- **Consultation State Machine (`src/controllers/consultation.controller.ts`):**
  - Governs clinical consultation workflows from draft to completion with clinical note locking.
- **Day Finalization Audit (`src/controllers/day-finalization.controller.ts`):**
  - Daily reconciliation audit ensuring all encounters are resolved before closing clinic operations.

#### C. Architectural & Security Limitations
- **ORM Incompatibility:** Uses TypeORM repository patterns (`Repository<Appointment>`); cannot be dropped into CareID's Prisma ORM without complete reimplementation.
- **Integer IDs:** Relies on numeric IDs rather than CareID's UUIDs.
- **No Multi-Profile Separation:** Users and patients share flat ID relationships rather than CareID's strict `User -> PatientProfile / DoctorProfile` architecture.

---

### 3.4 Project 4: `icd-11-nextjs-nestjs-boilerplate-main`

- **Repository Path:** `icd-11-nextjs-nestjs-boilerplate-main\icd-11-nextjs-nestjs-boilerplate-main`
- **Architecture:** Turborepo monorepo with NestJS backend (`packages/backend/`), Next.js frontend (`packages/frontend/`), and shared types (`packages/shared/`).
- **Database & ORM:** PostgreSQL using TypeORM 0.3 for auth/branding; in-memory/Redis caching for ICD-11 lookups.
- **Dependencies:** `@nestjs/axios`, `axios`, `cache-manager`, `cache-manager-redis-yet`, `@nestjs/swagger`.

#### A. Implemented Data Models
- **WHO ICD-11 API Integration:** Stateless proxy consuming the World Health Organization (WHO) Cloud API (`https://id.who.int/icd/release/11/2024-01/mms`).
- **Customization/Branding:** Organization entity and file upload entities in TypeORM.

#### B. Verified Endpoints & Capabilities
- **WHO ICD-11 Search & Navigation (`packages/backend/src/icd11/icd11.controller.ts`):**
  - `POST /icd11/search`: Flexisearch across multilingual ICD-11 diagnostic classifications.
  - `GET /icd11/entity/:id`: Direct retrieval of entity title, definition, and diagnostic coding.
  - `GET /icd11/entity/:id/children`: Queries subcategories and granular child diagnoses.
  - `GET /icd11/entity/:id/parent`: Resolves immediate parent classification.
  - `GET /icd11/entity/:id/ancestors`: Traverses the classification hierarchy to the chapter root.
  - `GET /icd11/entity/:id/breadcrumbs`: Formats breadcrumbs for clinical UI navigation.
  - `GET /icd11/entity/:id/navigation`: Comprehensive navigation context (entity, parent, children, ancestors, breadcrumbs).
  - `GET /icd11/entity/:id/details`: Deep entity view with children preview and ancestor mapping.
- **OAuth2 Token Lifecycle (`packages/backend/src/icd11/icd11.service.ts`):**
  - Automates token exchange against WHO's identity provider (`https://icdaccessmanagement.who.int/connect/token`).
  - Implements in-memory and Redis token caching with automatic expiry tracking.

#### C. Architectural & Security Limitations
- **External Dependency & API Credentials:** Requires registered WHO Client ID and Client Secret. Outbound HTTPS connectivity to `id.who.int` is mandatory.
- **Licensing & Data Attribution:** WHO ICD-11 terms of use require attribution and compliance with WHO licensing agreements.
- **Redis Dependency in Monorepo:** Default configuration expects Redis for response caching; must be configured with an in-memory cache to comply with CareID's zero-Redis constraint.

---

### 3.5 Project 5: `medical-system-backend-master`

- **Repository Path:** `medical-system-backend-master\medical-system-backend-master`
- **Architecture:** Standalone NestJS 10 backend.
- **Database & ORM:** MongoDB using Mongoose 8 (`@nestjs/mongoose`).
- **Dependencies:** `mongoose`, `ioredis`, `@nestjs/jwt`, `bcrypt`, `class-validator`.

#### A. Implemented Data Models
Defined in Mongoose schemas:
1. `User`: `name`, `email`, `password`, `role` (`ADMIN`, `DOCTOR`, `PHARMACIST`, `NURSE`, `LAB_TECH`).
2. `Patient`: Demographic details, lab results array, location tracking.
3. `Drug`: `name`, `brandName`, `dosageForms` (array of strings, e.g., "500mg tablet", "syrup").
4. `Prescription`: Unique `prescriptionId` (`RX-YYYY-MM-DD-xxxxxxxx`), `patient` ObjectId, `doctor` ObjectId, `medications` array (`drug`, `dosage`, `frequency`, `duration`), `isDispensed` boolean, `issuedAt`, `dispensedAt`.

#### B. Verified Endpoints & Capabilities
- **Drug Catalog (`src/drug/drug.controller.ts`):**
  - `GET /drug/search-by-name`: Paginated regex search by brand and generic name.
  - `GET /drug/:id/usage`: Retrieves supported dosage forms for a drug.
  - `POST /drug/create`: Creates or updates a drug, merging dosage forms.
  - `GET /drug`: Paginated listing of all registered drugs.
- **Prescription Workflow (`src/prescription/prescription.controller.ts`):**
  - `POST /prescription/create`: Doctors issue structured multi-medication prescriptions.
  - `GET /prescription/patient/:patientId`: Patient prescription history.
  - `GET /prescription/doctor/:doctorId`: Doctor-issued prescription history.
  - `PUT /prescription/dispense/:id`: Pharmacist marks prescription as fulfilled with timestamp.
- **Token Blacklisting (`src/guards/logout.guard.ts`):**
  - Redis-based JWT token blacklisting on logout.

#### C. Architectural & Security Limitations
- **Database Incompatibility:** Built exclusively on MongoDB / Mongoose (`ObjectId`, NoSQL document queries). Incompatible with CareID's relational PostgreSQL schema.
- **Mandatory Redis Dependency:** Requires an active Redis server for `ioredis` token blacklisting; fails to start without Redis.
- **Redundant Logout Architecture:** CareID already has superior, database-backed refresh token revocation in PostgreSQL (`RefreshToken.revokedAt`).

---

## 4. Comprehensive Feature Comparison Matrix

The following matrix evaluates capabilities discovered across the five reference projects against CareID's target implementation:

| Capability / Feature | Source Project & Code Location | Source Evidence Summary | CareID Status | CareID Implementation Evidence | Schema Impact | Security / Governance Implications | Value | Complexity | Recommended Decision |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **ICD-11 Diagnostic Terminology Lookup** | Project 4: `icd-11...`<br>[`icd11.controller.ts:47-85`](file:///C:/Users/PABANI/Downloads/hvapi-main/icd-11-nextjs-nestjs-boilerplate-main/icd-11-nextjs-nestjs-boilerplate-main/packages/backend/src/icd11/icd11.controller.ts#L47-L85)<br>[`icd11.service.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/icd-11-nextjs-nestjs-boilerplate-main/icd-11-nextjs-nestjs-boilerplate-main/packages/backend/src/icd11/icd11.service.ts) | Working WHO API OAuth2 client with flexisearch, hierarchy traversal, breadcrumbs. | `MISSING` | CareID has `ClinicalDiagnosis` with free-text `code` and `description`, but no terminology lookup service. | **None** (Stateless API proxy) | Requires WHO developer credentials and outbound HTTPS egress. No clinical privacy risk. | **High** | **Medium** | **Integrate as NestJS Module** (No schema change) |
| **Appointment Booking & Scheduling** | Project 1: `Healthcare-app`<br>[`appointment.service.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/Healthcare-app-main/Healthcare-app-main/backend/src/appointment/appointment.service.ts)<br>Project 2: `HMS-React`<br>[`appointments.controller.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/Hospital-Management-System-React-main/Hospital-Management-System-React-main/apps/api/src/appointments/appointments.controller.ts)<br>Project 3: `hms_backend`<br>[`appointment.controller.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hms_backend-main/hms_backend-main/src/controllers/appointment.controller.ts) | Working appointment CRUD, doctor conflict checks, working hour checks (08:00-20:00). | `MISSING` / `BLOCKED` | CareID `AppointmentController` is an empty stub class. Zero routes. No `Appointment` model in Prisma. | **Requires Schema Migration** | Blocked by project constraints. Double-booking race conditions require transactional locking. | **High** | **Large** | **Defer pending PO & Schema Approval** |
| **Algorithmic Rescheduling & Bulk Postponement** | Project 3: `hms_backend`<br>[`appointment.service.ts:400-550`](file:///C:/Users/PABANI/Downloads/hvapi-main/hms_backend-main/hms_backend-main/src/controllers/appointment.controller.ts) | Bulk postpone with return assessment moves, next-available-date calculation on same weekday. | `MISSING` / `BLOCKED` | CareID has `DoctorScheduleSlot` and `ShiftAssignment` in `src/modules/schedule`, but no appointment rescheduling. | **Requires Schema Migration** | Operational integrity: prevents orphan clinical appointments during doctor leaves. | **High** | **Large** | **Adopt logic during Appointment Phase** |
| **Unresolved Past Appointments Audit** | Project 3: `hms_backend`<br>[`appointment.controller.ts:180-210`](file:///C:/Users/PABANI/Downloads/hvapi-main/hms_backend-main/hms_backend-main/src/controllers/appointment.controller.ts) | `GET /appointments/unresolved-past` queries incomplete appointments before current date. | `MISSING` / `BLOCKED` | Not implemented in CareID. | **Requires Schema Migration** | Governance audit capability. | **Medium** | **Small** | **Adopt during Appointment Phase** |
| **Prescription & Medication Issuance** | Project 5: `medical-system`<br>[`prescription.service.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/medical-system-backend-master/medical-system-backend-master/src/prescription/prescription.service.ts)<br>[`prescription.schema.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/medical-system-backend-master/medical-system-backend-master/src/prescription/schemas/prescription.schema.ts) | Structured prescription with drug, dosage, frequency, duration, unique RX-ID, dispensation status. | `PARTIAL` | CareID allows storing medication notes in `MedicalRecord.notes` and attachments, but lacks structured `Prescription` model. | **Requires Schema Migration** | High clinical sensitivity. Must ensure doctor-patient consent relationship is verified. | **High** | **Large** | **Design RFC for future schema release** |
| **Pharmacy Inventory & Dispensation** | Project 2: `HMS-React`<br>[`pharmacy.service.ts:80-160`](file:///C:/Users/PABANI/Downloads/hvapi-main/Hospital-Management-System-React-main/Hospital-Management-System-React-main/apps/api/src/pharmacy/pharmacy.service.ts) | Transactional stock check, atomic decrement (`decrement: qty`), invoice item creation. | `MISSING` | CareID has no pharmacy or medication inventory models. | **Requires Schema Migration** | Financial and inventory audit controls required. | **Medium** | **Large** | **Defer** (Outside current CareID core scope) |
| **Billing & Invoicing System** | Project 2: `HMS-React`<br>[`billing.controller.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/Hospital-Management-System-React-main/Hospital-Management-System-React-main/apps/api/src/billing/billing.controller.ts)<br>[`sql-server-bootstrap.sql`](file:///C:/Users/PABANI/Downloads/hvapi-main/Hospital-Management-System-React-main/Hospital-Management-System-React-main/sql-server-bootstrap.sql) | Invoices with subtotal, tax, discount, total, payment modes (Cash, Card, UPI, Insurance). | `PARTIAL` | CareID has insurance claims (`InsuranceClaimDraft`, `InsurancePolicy`), but no direct out-of-pocket patient invoicing. | **Requires Schema Migration** | PCI-DSS, tax compliance, financial audit logging required. | **Medium** | **Large** | **Defer** (Review after Insurance Claims release) |
| **Inpatient Ward & Bed Management** | Project 2: `HMS-React`<br>[`wards.controller.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/Hospital-Management-System-React-main/Hospital-Management-System-React-main/apps/api/src/wards/wards.controller.ts) | Tracks ward names, total beds, occupied beds. | `PARTIAL` | CareID has `FacilityRoom` (`src/modules/facility`), but lacks bed occupancy counters. | **Existing Schema Compatible** (Can use `FacilityRoom`) | Facility management only. | **Low** | **Small** | **Extend existing `FacilityModule` if needed** |
| **Patient Vitals Tracking** | Project 1: `Healthcare-app`<br>[`schema.prisma`](file:///C:/Users/PABANI/Downloads/hvapi-main/Healthcare-app-main/Healthcare-app-main/backend/prisma/schema.prisma)<br>Project 2: `HMS-React`<br>[`vitals.controller.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/Hospital-Management-System-React-main/Hospital-Management-System-React-main/apps/api/src/vitals/vitals.controller.ts) | Records heart rate, blood pressure, temperature, spo2. | `EXISTS` | Fully implemented in CareID `VitalSigns` model (`src/modules/medical-record/`). | **None** (Already present) | Strict patient profile ownership enforced. | **None** | **None** | **Reject** (CareID already exceeds reference projects) |
| **Monthly Medical Record Aggregations** | Project 1: `Healthcare-app`<br>[`medical-record.service.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/Healthcare-app-main/Healthcare-app-main/backend/src/medical-record/medical-record.service.ts) | SQL raw aggregation grouping diagnoses and visit types per month. | `EXISTS` | Fully implemented in CareID `ReportsModule` & `ObservabilityModule` with typed DTOs and caching. | **None** (Already present) | CareID already has structured analytics. | **None** | **None** | **Reject** (CareID already exceeds reference projects) |
| **Day Finalization & Clinic Ledger Closing** | Project 3: `hms_backend`<br>[`day-finalization.controller.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hms_backend-main/hms_backend-main/src/controllers/day-finalization.controller.ts) | Audits clinic end-of-day state and prevents retroactive edits. | `MISSING` | CareID has `MaintenanceConfiguration` and `SystemHealthCheck`, but no daily operational ledger. | **Requires Schema Migration** | Governance & audit trail integrity. | **Medium** | **Medium** | **Defer to Governance Phase** |
| **Redis JWT Blacklisting on Logout** | Project 5: `medical-system`<br>[`logout.guard.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/medical-system-backend-master/medical-system-backend-master/src/guards/logout.guard.ts) | Stores revoked tokens in Redis with TTL. | `DUPLICATE` / `INCOMPATIBLE` | CareID already implements atomic refresh token revocation in PostgreSQL (`RefreshToken.revokedAt`). | **None** | Redis is prohibited in CareID scope; PostgreSQL solution is already superior and persistent. | **None** | **None** | **Reject** (CareID design is already superior) |
| **Digital Health Cards & Dynamic QR** | Discovered in CareID target | Verified dynamic QR verification with HMAC signatures, expiry, scan logs, health cards. | `EXISTS` | Implemented in `src/modules/health-card/` and `src/modules/qr/`. None of the 5 reference projects have this. | **None** | CareID proprietary capability. | **High** | **None** | **Maintain CareID Leadership** |
| **Vaccine Catalog & Immunisation Records** | Discovered in CareID target | Vaccine schedules, target groups, certificates, reminders. | `EXISTS` | Implemented in `src/modules/immunisation/`. None of the 5 reference projects have this. | **None** | CareID proprietary capability. | **High** | **None** | **Maintain CareID Leadership** |
| **Patient Referral System** | Discovered in CareID target | Inter-facility doctor-to-doctor referrals, notes, attachments, triage workflows. | `EXISTS` | Implemented in `src/modules/referral/`. None of the 5 reference projects have this. | **None** | CareID proprietary capability. | **High** | **None** | **Maintain CareID Leadership** |

---

## 5. In-Depth Evaluation of Candidate Integration Domains

### 5.1 ICD-11 Terminology and Classification Lookup (Top Candidate)
- **Source Evidence:** Project 4 (`icd-11-nextjs-nestjs-boilerplate-main/packages/backend/src/icd11/`).
- **CareID Current State:** CareID has `ClinicalDiagnosis` in `src/modules/medical-record/`, where diagnoses are stored with free-text fields (`code: String`, `description: String`). There is currently no API to search, autocomplete, or validate standardized WHO diagnostic codes.
- **Integration Feasibility:** **Extremely High**.
  - Can be packaged as a standalone NestJS module (`Icd11Module`) in CareID under `src/modules/icd11/`.
  - **Zero Database Schema Changes:** Operates as an external REST client proxying requests to the WHO API and caching results in memory using `@nestjs/cache-manager`.
  - **Client Compatibility:** Preserves 100% of existing client contracts while offering a new utility endpoint (`/api/v1/icd11/search`) for doctor and patient portals to select standardized diagnostic codes.
  - **Prerequisites:** Register for a WHO ICD-11 API account to obtain `WHO_CLIENT_ID` and `WHO_CLIENT_SECRET`.

### 5.2 Appointment Lifecycle & Rescheduling Algorithms
- **Source Evidence:** Project 3 (`hms_backend-main`) and Project 2 (`Hospital-Management-System-React-main`).
- **CareID Current State:** `AppointmentController` is an empty stub. CareID possesses comprehensive facility scheduling, shift assignments, and holiday calendars (`src/modules/schedule/`), but no booking entities.
- **Integration Feasibility:** **Blocked — Priority 4**.
  - Cannot be integrated without adding an `Appointment` model to `prisma/schema.prisma`.
  - The business logic in Project 3 (next-available-date calculation, bulk postponement, unresolved appointment detection) is mature and should be used as the design blueprint once schema migrations are approved.

### 5.3 Prescription & Medication Management
- **Source Evidence:** Project 5 (`medical-system-backend-master`) and Project 2 (`Hospital-Management-System-React-main`).
- **CareID Current State:** CareID allows clinical notes on encounters and lab report attachments, but does not have a distinct `Prescription` entity linking prescribed medications, dosages, frequency, and dispensing state.
- **Integration Feasibility:** **Schema-Dependent — Priority 4**.
  - Requires design approval for a `Prescription` and `PrescriptionItem` model.
  - Requires clinical consent enforcement: a doctor cannot issue prescriptions for a patient without an active, verified consultation or consent relationship.

### 5.4 Pharmacy Inventory & Invoicing
- **Source Evidence:** Project 2 (`Hospital-Management-System-React-main/apps/api/src/pharmacy/` and `billing/`).
- **CareID Current State:** CareID is focused on clinical health records, patient identity (CareID/HealthCard), referrals, immunisation, and insurance claims. It is not currently configured as a physical hospital ERP or pharmacy retail system.
- **Integration Feasibility:** **Defer / Reject — Priority 5**.
  - Out of scope for the current pre-deployment release.

---

## 6. Synthesis: Preserving CareID Compatibility & Safety

1. **Features that require ZERO schema changes:**
   - WHO ICD-11 Terminology Search module (stateless external client with in-memory caching).
   - Clinical diagnosis validation against ICD-11 codes.
   - Enhanced doctor schedule availability queries (leveraging existing `DoctorScheduleSlot` and `GeneratedSlot` in `src/modules/schedule/`).

2. **Features requiring Schema Migrations (Blocked):**
   - Appointment booking (`model Appointment`).
   - Structured digital prescriptions (`model Prescription`, `model PrescriptionItem`).
   - Out-of-pocket patient billing and invoices (`model Invoice`, `model InvoiceItem`).
   - Day finalization closing ledger (`model DayFinalization`).

3. **Incompatible Architectures to Reject:**
   - Unauthenticated endpoints from Project 1.
   - MongoDB/Mongoose models and Redis session token blacklisting from Project 5.
   - Microsoft SQL Server DDL and dialects from Project 2.
   - TypeORM entities from Project 3 and Project 4.

---

## Summary Statement

CareID already substantially surpasses all five reference projects in authentication security, clinical privacy enforcement, multi-role separation, facility scheduling, immunisation tracking, digital health cards, dynamic QR verification, and insurance claim processing. 

The single highest-value, non-disruptive capability identified across all five reference projects is the **WHO ICD-11 Diagnostic Terminology Search service from Project 4**, which can be cleanly adopted into CareID without any database schema changes, migrations, or breaking API changes.
