# CAREID — Dynamic Consultation & Slot Booking Audit (Goal 015)

**Document ID:** `CAREID_DYNAMIC_CONSULTATION_AUDIT_015`  
**Goal Reference:** `CAREID-FULLY-DYNAMIC-CONSULTATION-AND-SLOT-BOOKING-015`  
**Execution Date:** November 25, 2026  
**Status:** PHASE 1 AUDIT COMPLETED  
**Scope:** Complete source code and requirements audit of CareID Consultation, Treatment Offers, Financing, Pricing, Availability, Slot Generation, and Appointment Booking workflows across Doctor Web, Admin Web, and Backend.

---

## 1. Executive Summary & Critical Forensic Findings

This audit evaluated all paths in the CareID Consultation and Appointment lifecycles: from Consultation initiation, patient selection, procedure selection, treatment offers, financing, discounts, pricing, offer validity, and clinical remarks, through doctor availability, appointment slot generation, booking, rescheduling, and cancellation.

### 1.1 Key Architectural Findings & Misconception Corrections

1. **Holiday Controller Route (`GET /api/v1/holidays`) is Active, Not Broken:**
   - Previous assumptions claimed that `/api/v1/schedules/holidays` threw a 404 due to route conflicts with `@Get(':id')`.
   - Forensic inspection revealed that `holiday.controller.ts` is mounted at `@Controller('holidays')`, i.e., `GET /api/v1/holidays`.
   - The route is alive and mounted; however, neither Doctor Web nor Admin Web connects to it, rendering holiday calendars unconsumed during slot generation and scheduling.

2. **Currency Conflict (`PKR` vs `$ USD`):**
   - In `backend/prisma/schema.prisma` line 358, `TreatmentOffer.currency` explicitly defaults to `"PKR"`. Backend calculation services also default to `'PKR'`.
   - In contrast, both Doctor Web and Admin Web frontends hardcode `$` (USD) currency symbols, labels, and formatting across all consultation and offer screens (e.g. `TreatmentOfferCreatePage.tsx`, `InsuranceFinancingHubPage.tsx`, `AdminFinancingDashboard.tsx`).
   - Fix: Externalize the default currency to `PlatformSetting` (`FINANCIAL_DEFAULT_CURRENCY`) and format currency dynamically throughout Doctor Web and Admin Web.

3. **Semantic Conflict in Procedure Categories:**
   - There is a 3-way semantic mismatch across layers:
     - `procedure_catalogue.category` (Raw SQL table): Stores clinical specialties (`CARDIOLOGY`, `DIAGNOSTIC_CARDIOLOGY`, `CARDIOVASCULAR_SURGERY`, `LABORATORY`, `RADIOLOGY`).
     - `TreatmentOfferProcedure.category` (`schema.prisma` line 330): PostgreSQL enum `ProcedureCategory` with cost-center classifications (`SURGICAL`, `DIAGNOSTIC`, `ANESTHESIA`, `ROOM_SUITE`, `MEDICATION`, `DEVICE_IMPLANT`, `OTHER`).
     - Doctor Web `TreatmentOfferCreatePage.tsx` line 105: Hardcodes a local TypeScript union `'SURGICAL' | 'DIAGNOSTIC' | 'THERAPEUTIC'`.
   - Fix: Decouple clinical specialties from cost-center billing categories via dynamic Admin Master Data (`PROCEDURE_CATEGORIES`).

4. **Existing Governance Master Data Infrastructure (`GovernanceModule`):**
   - The backend already possesses an enterprise-grade `GovernanceModule` supporting:
     - `POST/GET /api/v1/governance/master-data/categories` (`MasterDataCategory` model).
     - `POST/GET/PUT/DELETE /api/v1/governance/master-data/items` (`MasterDataItem` model).
     - `POST/GET/PUT /api/v1/governance/configurations` (`SystemConfiguration` / `PlatformSetting` models).
   - Rather than creating duplicate disparate tables, we will leverage this existing infrastructure to manage `CONSULTATION_REASONS`, `APPOINTMENT_TYPES`, `CANCELLATION_REASONS`, and `CLINICAL_REMARK_TEMPLATES`.

5. **"Consultation" as a Virtual Synthesized Entity:**
   - There is currently no standalone `consultations` database table. In Doctor Web, `consultationService.ts` synthesizes a virtual `ConsultationItem` array by joining `GET /api/v1/appointments/doctor/me` and `GET /api/v1/doctors/treatment-offers`.
   - Clinical notes are saved via `POST /api/v1/doctors/patients/:patientProfileId/encounters` with hardcoded `encounterType: 'CONSULTATION'`.
   - Preserving this structure while standardizing its configuration ensures zero disruption to existing clinical encounters.

---

## 2. Field-by-Field Audit Matrix

| # | Field / Option / Parameter | UI Location (Doctor Web) | Frontend Source | API Endpoint | Backend Source | Database Source | Admin Management Page | Current Classification | Required Fix |
|---|---|---|---|---|---|---|---|---|---|
| **1** | **Patient Demographics & Isolation** | `TreatmentOfferCreatePage.tsx#L380` | `usePatientProfile` hook | `GET /api/v1/patients/:id` | `patient.service.ts` | `patient_profiles`, `users` | `AdminPatientDirectory.tsx` | `DATABASE-DRIVEN` | Preserve strict Clinical Safety Gate R1 isolation between Human and Veterinary patients. |
| **2** | **Consultation Reason & Chief Complaint** | `useDashboard.ts#L300`, `consultationService.ts#L214` | Hardcoded fallback `'General Clinical Consultation'` | `PUT /api/v1/appointments/:id/status` | `appointment.service.ts` | `appointments.reason`, `appointments.notes` | MISSING | `PARTIALLY-DYNAMIC` | Populate dropdown from `MasterDataItem` (`CONSULTATION_REASONS`); eliminate hardcoded fallback strings. |
| **3** | **Consultation / Appointment Modality** | `ProcedureSchedulingPage.tsx#L375` | Hardcoded `type: 'IN_PERSON'` | `POST /api/v1/appointments` | `appointment.dto.ts` (`AppointmentType`) | `appointments.type` (`IN_PERSON`, `TELECONSULTATION`, `HOME_VISIT`) | MISSING | `FRONTEND-HARDCODED` / `BACKEND-HARDCODED` | Provide dynamic modality selection dropdown driven by `MasterDataItem` (`APPOINTMENT_MODALITIES`). |
| **4** | **Consultation Lifecycle Statuses & Badges** | `useDashboard.ts#L80-L140`, `consultationService.ts#L190-L205` | Hardcoded badge colors & label mapping | `PUT /api/v1/appointments/:id/status` | `appointment.service.ts` (`VALID_STATUS_TRANSITIONS`) | PostgreSQL Enum `AppointmentStatus` | MISSING | `DATABASE-DRIVEN` (Safety in code) / `FRONTEND-HARDCODED` (Labels) | Retain clinical state-machine transitions in code; fetch display labels and color tokens from Admin Master Data. |
| **5** | **CPT / Target Procedure Catalogue** | `TreatmentOfferCreatePage.tsx#L908`, `InsuranceFinancingHubPage.tsx#L163` | `cptService.listCptCodes()`; Hub has fallback `#93458` | `GET /api/v1/cpt?page=1&limit=50` | `cpt.service.ts#L10-L120` (`STANDARD_CPT_CATALOGUE` fallback) | `procedure_catalogue` (Raw SQL; missing in `schema.prisma`) | MISSING (Orphaned `procedureService.ts`) | `PARTIALLY-DYNAMIC` | Add `ProcedureCatalogue` to Prisma schema; build Admin Web Procedure Manager (`AdminProcedureCatalogue.tsx`) with full CRUD. |
| **6** | **Procedure Categories / Cost Centers** | `TreatmentOfferCreatePage.tsx#L105` | Hardcoded union `'SURGICAL' \| 'DIAGNOSTIC' \| 'THERAPEUTIC'` | `POST /api/v1/doctors/treatment-offers` | `treatment-offer.dto.ts` (`ProcedureCategory` enum) | PostgreSQL Enum `ProcedureCategory` (`schema.prisma#L330`) | MISSING | `BACKEND-HARDCODED` / `FRONTEND-HARDCODED` | Harmonize clinical specialties and billing cost centers via `MasterDataItem` (`PROCEDURE_CATEGORIES`); populate dropdown dynamically. |
| **7** | **Standard Hospital Baseline Fee (Chargemaster)** | `TreatmentOfferCreatePage.tsx#L980-L1005` | Populated from `selected.standardCharge` via `cptService` | `GET /api/v1/cpt` | `cpt.service.ts` | `procedure_catalogue.standard_charge` | MISSING | `PARTIALLY-DYNAMIC` | Expose Chargemaster pricing edit interface in Admin Web to manage standard fees per procedure. |
| **8** | **Facility-Specific Procedure Pricing** | `TreatmentOfferCreatePage.tsx#L1000`, `facilityService.ts#L227` | Display string only; `getPricingRules` never invoked in Doctor Web | `GET /api/v1/facilities/:id/pricing-rules` | `treatment-offer.service.ts#L1662` | MISSING (Falls back to hardcoded JS object) | MISSING | `BACKEND-HARDCODED` / `MISSING` | Create `FacilityProcedurePrice` model in Prisma; connect Doctor Web to live facility pricing endpoint; create Admin Facility Pricing screen. |
| **9** | **Currency Assumptions & Formatting** | `TreatmentOfferCreatePage.tsx`, `InsuranceFinancingHubPage.tsx` | Hardcoded `$` in all JSX/formatters | `POST /api/v1/doctors/treatment-offers` | Hardcoded `currency: 'PKR'` in backend service | `treatment_offers.currency` (`@default("PKR")`) | MISSING | `FRONTEND-HARDCODED` / `BACKEND-HARDCODED CONFLICT` | Externalize default currency to `PlatformSetting` (`FINANCIAL_DEFAULT_CURRENCY`); dynamically fetch currency symbol in Doctor Web and Admin Web formatters. |
| **10** | **Doctor Discretionary Discount Limits** | `TreatmentOfferCreatePage.tsx#L1120-L1150` | Slider allows 0–100% without policy bounds check | `POST /api/v1/doctors/treatment-offers` | `treatment-offer.service.ts#L320` (`discountPercent > 30` ceiling) | Stored in `treatment_offers.discount_amount` | MISSING | `BACKEND-HARDCODED` | Store discount ceiling and doctor discretionary thresholds in `PlatformSetting` / `cmsPolicy`; clamp slider bounds dynamically in Doctor Web. |
| **11** | **Discount Supervisor Approval Threshold** | `TreatmentOfferCreatePage.tsx` | Not checked in UI | `POST /api/v1/treatment-offers/:id/approve-discount` | `treatment-offer.service.ts#L1672` (15% hardcoded fallback) | `cms_policies` JSON fallback | MISSING | `BACKEND-HARDCODED` | Store supervisor discount threshold in persistent settings; prompt for supervisor review in Doctor Web when discount exceeds threshold. |
| **12** | **Financing Packages & Partner Catalogue** | `InsuranceFinancingHubPage.tsx#L32-L108` | Static in-memory `FINANCING_PACKAGES` array | `GET /api/v1/financing/options` | `prisma-financing.repository.ts#L17-L60` (`isDemonstrationCatalog: true`) | MISSING (No model in `schema.prisma`) | MISSING (`AdminFinancingDashboard.tsx` only tracks applications) | `FRONTEND-HARDCODED` & `BACKEND-HARDCODED` | Create `FinancingPackage` model in Prisma; build Admin Web Financing Catalogue management screen; wire both Hub & CreatePage to live API. |
| **13** | **Financing Terms (Down Payment, APR, Tenures)** | `TreatmentOfferCreatePage.tsx#L560-L575` | Hardcoded: 10% down, 1.5x max, $1,500 fee, `'TIER_1'` | `POST /api/v1/treatment-offers/:id/bind-financing` | `treatment-offer.service.ts` (`bindFinancingPackage`) | `financing_offers` stores bound instance values | MISSING | `FRONTEND-HARDCODED` | Read package terms (down payment %, tenures, APR, processing fee) directly from persistent `FinancingPackage` database records. |
| **14** | **Financing Eligibility Rules** | `InsuranceFinancingHubPage.tsx#L49` | Static badge strings (`Pre-Approved Tier A`) | `POST /api/v1/financing/apply` | `financing.service.ts#L90-L115` | MISSING | MISSING | `BACKEND-HARDCODED` / `MISSING` | Store eligibility rules (min income, min credit score, eligible tenures) in `FinancingPackage` table; evaluate dynamically in backend. |
| **15** | **Offer Validity Default Duration** | `TreatmentOfferCreatePage.tsx#L110` | Hardcoded 14 days (`Date.now() + 14 * 24 * 60 * 60 * 1000`) | `POST /api/v1/doctors/treatment-offers` | `treatment-offer.service.ts` | `treatment_offers.valid_until` | MISSING | `FRONTEND-HARDCODED` | Introduce Admin-configurable `OFFER_VALIDITY_DAYS_DEFAULT` in `PlatformSetting`; initialize form dynamically. |
| **16** | **Offer Expiration & Extension Rules** | `treatment-offer.service.ts#L150` | Status comparison in status pages | `GET /api/v1/doctors/treatment-offers/:id/status` | Instant transition to `EXPIRED` if past `validUntil` | `treatment_offers.status` | MISSING | `BACKEND-HARDCODED` | Support configurable expiration warning windows, grace periods, and clinician extension workflows via Admin settings. |
| **17** | **Personalized Clinical Remarks & Templates** | `TreatmentOfferCreatePage.tsx#L1360` | Free text textarea; no templates | `POST /api/v1/doctors/treatment-offers` | `treatment-offer.service.ts` | `treatment_offers.clinical_notes` | MISSING | `PARTIALLY-DYNAMIC` | Seed `MasterDataItem` category `CLINICAL_REMARK_TEMPLATES`; provide template dropdown / quick-insertion buttons in Doctor Web. |
| **18** | **Clinician Attestation & Terms Version** | `TreatmentOfferCreatePage.tsx#L583`, `TreatmentOfferReviewPage.tsx#L325` | Hardcoded statement, terms `'2026.1'`, empty string MD5 hash | `POST /api/v1/treatment-offers/:id/attest` | `treatment-offer.service.ts` | `platform_settings` / `cms_policies` | MISSING | `FRONTEND-HARDCODED` | Fetch attestation text and terms version dynamically from `cms_policies`; generate authentic SHA-256 payload digest. |
| **19** | **Doctor Weekly Working Hours Defaults** | `ScheduleManagementPage.tsx#L37-L47` | Hardcoded Mon–Fri 09:00–17:00, lunch 12:00–13:00, Sat–Sun disabled | `PUT /api/v1/schedules/:id/working-hours` | `schedule.service.ts` | `working_hours` | MISSING | `PARTIALLY-DYNAMIC` | Store facility working hours template in `PlatformSetting` or `Facility`; initialize doctor schedules from facility defaults. |
| **20** | **Slot Duration & Buffer Durations** | `ScheduleManagementPage.tsx#L33-L34`, `ProcedureSchedulingPage.tsx#L350` | Hardcoded state defaults (30 min slot, 5 min buffer; fallback 90 min) | `POST /api/v1/schedules`, `POST /api/v1/appointments` | `slot-engine.service.ts#L30` | `schedules.slot_duration_minutes`, `schedules.buffer_minutes` | MISSING | `PARTIALLY-DYNAMIC` | Provide Admin facility/specialty defaults for consultation slot durations and buffer intervals. |
| **21** | **Slot Generation Horizon & Advance Window** | `ScheduleManagementPage.tsx#L160` | Hardcoded 14 days in `handleGenerateSlots` | `POST /api/v1/schedules/:id/slots/generate` | `schedule.service.ts` (`generateSlots`) | `generated_slots` | MISSING | `FRONTEND-HARDCODED` | Make slot generation horizon and max advance booking window Admin-configurable settings (`SLOT_GENERATION_DAYS`, `MAX_ADVANCE_BOOKING_DAYS`). |
| **22** | **Temporary Slot Hold Duration & Procedure Category** | `ProcedureSchedulingPage.tsx#L290` | Hardcoded 45 min hold, hardcoded `'CATH_LAB'` category | `POST /api/v1/appointments/holds` | `appointment.service.ts` (`createSlotHold`) | Stored in appointment hold cache | MISSING | `FRONTEND-HARDCODED` | Read slot hold duration and procedure category from Admin-configurable facility booking policy. |
| **23** | **Rescheduling Policy & Notice Window** | `AppointmentDetailsPage.tsx#L210-L225` | `window.prompt` without policy enforcement | `PUT /api/v1/appointments/:id/reschedule` | `appointment.service.ts#L400-L460` (Only checks conflicts) | MISSING | MISSING | `MISSING / NOT ENFORCED` | Create `AppointmentPolicy` in DB (min notice hours, max reschedules allowed, allowed roles); enforce in backend and display in UI. |
| **24** | **Cancellation Policy & Cancellation Reasons** | `AppointmentDetailsPage.tsx#L190-L205` | `window.prompt` with fallback string `'Clinical rescheduling required'` | `PUT /api/v1/appointments/:id/cancel` | `appointment.service.ts` | `appointments.cancellation_reason` | MISSING | `PARTIALLY-DYNAMIC` / `FRONTEND-HARDCODED` | Populate reasons from `MasterDataItem` (`CANCELLATION_REASONS`); enforce minimum cancellation notice window in backend; replace `window.prompt` with modal dropdown. |
| **25** | **Holiday Calendar & Leave Blocks** | `ProcedureSchedulingPage.tsx#L170` | Assumes Mon–Fri; holidays completely ignored in Doctor Web | `GET /api/v1/holidays` (Active but unconsumed) | `holiday.controller.ts` | `holiday_calendars`, `leave_blocks` | MISSING | `PARTIALLY-DYNAMIC` (Backend table & controller exist, but Admin Web lacks UI and Doctor Web does not query it) | Build Admin Web Holiday Calendar management UI; connect Doctor Web slot selector to `GET /api/v1/holidays` to block holidays. |
| **26** | **Facility Capacity & Schedule Utilization Monitoring** | `AdminCapacityMonitoring.tsx#L27-L86` | `DEFAULT_CAPACITY_DATA` (5 hardcoded mock facility cards) | No API call made | `schedule.service.ts` (`getStatistics` exists) | `schedules`, `generated_slots`, `appointments` | `AdminCapacityMonitoring.tsx` | `FRONTEND-HARDCODED` (100% Mock Data) | Wire `AdminCapacityMonitoring.tsx` to live backend `/api/v1/schedules/statistics` and real facility schedule aggregation. |
| **27** | **Financing Applications Oversight** | `AdminFinancingDashboard.tsx#L27-L88` | `DEFAULT_APPLICATIONS` (5 fake applications shown when DB count is 0) | `GET /api/v1/financing/applications` | `financing.service.ts` | `financing_applications` | `AdminFinancingDashboard.tsx` | `PARTIALLY-DYNAMIC` (Mock Fallback) | Remove fake mockup fallback; show clean empty state when DB has 0 applications; add Partner Configuration tab. |
| **28** | **Clinical Protocol & Anesthesia Settings** | `AppointmentDetailsPage.tsx#L163-L164` | Hardcoded anesthesia protocol & staff strings | `GET /api/v1/appointments/:id` | Stored in serialized string notes | `appointments.notes` (serialized text) | MISSING | `FRONTEND-HARDCODED` | Read facility rooms dynamically from `facility_rooms`; create Admin Master Data for clinical anesthesia protocols. |
| **29** | **Pre-Op Readiness & Surgical Safety Checklists** | `AppointmentDetailsPage.tsx#L167`, `appointment.service.ts#L825` | Hardcoded 60% readiness fallback | `PUT /api/v1/appointments/:id/readiness`, `PUT /api/v1/appointments/:id/cath-lab-checklist` | `appointment.service.ts#L898, L1175` | Serialized JSON `--- READINESS ---` and `--- CATH_LAB_CHECKLIST ---` in `appointments.notes` | MISSING | `FRONTEND-HARDCODED` / `BACKEND HACK` | Model structured pre-op checklist items in DB; allow Admin to configure checklist items per procedure category. |
| **30** | **Notification Templates & Automated Delivery Schedules** | `treatment-offer.service.ts#L1815` | No notification scheduling in Doctor Web | `POST /api/v1/treatment-offers/:id/resend-notification` | Hardcoded SMS text string in backend service | `notification_templates` (bypassed) | `AdminNotificationDashboard.tsx` | `BACKEND-HARDCODED` | Route offer SMS notifications through `NotificationTemplate` table; add automated delivery schedules (24h before expiry, 48h before appointment). |

---

## 3. Subsystem Architecture Analysis

### 3.1 CPT & Procedure Catalogue
- Goal 010 implemented a raw PostgreSQL table `procedure_catalogue` in `backend/src/modules/cpt/cpt.service.ts`.
- `schema.prisma` was not updated with a `ProcedureCatalogue` model, preventing type-safe Prisma queries, relations, and standard migrations.
- `STANDARD_CPT_CATALOGUE` (13 hardcoded entries in `cpt.service.ts`) was retained as an in-memory fallback.
- In Admin Web, `procedureService.ts` exists with React Query hooks, but it is orphaned and unimported.
- **Required Action:** Add `ProcedureCatalogue` model to `schema.prisma`; build `AdminProcedureCatalogue.tsx` with full CRUD; eliminate static fallbacks.

### 3.2 Facility Chargemaster & Pricing Overrides
- Currently, Doctor Web displays `selected.standardCharge` directly from the global procedure catalogue.
- Backend has placeholder facility pricing rules in `treatment-offer.service.ts#L1662` that fall back to a hardcoded JS object.
- **Required Action:** Create `FacilityProcedurePrice` model in Prisma linking `procedureId` + `facilityId` with `price`, `effectiveFrom`, `effectiveTo`, and `isActive`. Connect Doctor Web to `GET /api/v1/facilities/:facilityId/procedures/:procedureId/pricing`.

### 3.3 Financing Partner Catalog
- In Doctor Web, `InsuranceFinancingHubPage.tsx` defines a local hardcoded array of 3 packages (`Care ID In-House`, `HealthPay Bridge`, `MedPay Flex`).
- Backend `prisma-financing.repository.ts` serves 3 completely different hardcoded packages (`CareCredit Health`, `MediLend Financial`, `HealthVault Direct`) marked `isDemonstrationCatalog: true`.
- `treatment-offer.service.ts` duplicates those 3 packages in `CONFIGURED_FINANCING_PARTNERS`.
- **Required Action:** Create `FinancingPackage` model in Prisma; build Admin Web Financing Catalogue management screen; wire both Hub & CreatePage to `GET /api/v1/financing/options`.

### 3.4 Discount Governance & Pricing Policies
- In `treatment-offer.service.ts#L320`, discounts > 30% are hard-rejected in code.
- In `treatment-offer.service.ts#L1671`, supervisor approval threshold is hardcoded to 15%.
- In `TreatmentOfferCreatePage.tsx`, the discount slider allows 0 to 100%, without checking the facility's max discount ceiling or supervisor approval threshold.
- **Required Action:** Store discount ceiling and doctor discretionary thresholds in `PlatformSetting` / `cmsPolicy`; clamp slider bounds dynamically in Doctor Web; require supervisor approval when exceeded.

### 3.5 Offer Validity & Clinical Remarks
- Doctor Web hardcodes 14 days default validity (`TreatmentOfferCreatePage.tsx#L110`).
- Remarks are freeform text with no template support.
- **Required Action:** Introduce `OFFER_VALIDITY_DAYS_DEFAULT` in `PlatformSetting`. Seed `MasterDataItem` category `CLINICAL_REMARK_TEMPLATES` and offer template selector in Doctor Web.

### 3.6 Scheduling, Availability & Holiday Infrastructure
- `slot-engine.service.ts` provides clean slot math, but working hours, slot duration, buffer, and 14-day horizon are hardcoded in the frontend.
- Admin Web has no UI for holiday calendars or leave blocks, even though `holiday_calendars` table and `holiday.controller.ts` exist.
- Cancellation and rescheduling are triggered via crude `window.prompt` dialogs without minimum notice enforcement.
- **Required Action:** Connect Doctor Web to `GET /api/v1/holidays`; provide Admin UI for holiday calendars; replace `window.prompt` with modal dropdown populated from `CANCELLATION_REASONS`; enforce minimum notice policies in backend.

---

## 4. Admin Consultation Management Blueprint (15 Subsections)

To provide unified administration without scattered menus, Admin Web will consolidate consultation configuration under **Consultation Management** (`/admin/consultation-management`):

1. **Procedure Catalogue:** Search, add, edit, and deactivate procedures (linked to `ProcedureCatalogue`).
2. **Facility Chargemaster:** Manage facility-specific price overrides and effective dates.
3. **Consultation Types & Modalities:** Dynamic consultation types (In-Person, Teleconsultation, Home Visit).
4. **Treatment Offer Configuration:** Default validity, expiration warning windows, attestation text.
5. **Discount Policies:** Maximum doctor discretionary discount % and supervisor approval thresholds.
6. **Financing Options:** Lender partner programs, APRs, tenures, down payments, and credit tiers.
7. **Offer Validity Rules:** Facility-level validity duration defaults and permitted ranges.
8. **Clinical Remark Templates:** Quick-insert clinical remark snippets by specialty.
9. **Appointment Types:** Duration defaults, buffer intervals, and color codes.
10. **Doctor Availability Policies:** Standard working hour templates and break configurations.
11. **Slot Booking Rules:** Maximum advance booking window, slot generation horizon, temporary hold duration.
12. **Cancellation & Rescheduling Policies:** Minimum notice hours, maximum allowed reschedules, cancellation reasons.
13. **Notification & Reminder Settings:** Automated reminder schedules (SMS/Email triggers).
14. **Facility-Specific Overrides:** Per-facility overrides for working hours, fees, and holiday rosters.
15. **Configuration Audit History:** Change logs and version history for all governance adjustments.

---

## 5. Non-Destructive Database Migration Plan

All database modifications will use reviewed, forward-only Prisma migrations on `careid_integration_db`:
1. **`ProcedureCatalogue`:** Formalize the existing raw SQL table into the Prisma schema with proper indices and timestamps.
2. **`FacilityProcedurePrice`:** New model for facility-specific price overrides (`procedureId`, `facilityId`, `price`, `effectiveFrom`, `effectiveTo`, `isActive`).
3. **`FinancingPackage`:** New model for persistent financing partner options (`provider`, `name`, `apr`, `minDownPaymentPercent`, `tenureMonths`, `minCreditScore`, `isActive`).
4. **`AppointmentPolicy`:** New model for cancellation and rescheduling rules (`minNoticeHoursCancel`, `minNoticeHoursReschedule`, `maxReschedulesAllowed`).
5. **Seed Canonical Data:** Ensure master data items exist for `CONSULTATION_REASONS`, `CANCELLATION_REASONS`, and `CLINICAL_REMARK_TEMPLATES`.

---

## 6. Audit Sign-Off

Phase 1 audit findings confirm that **all 30 identified fields** are documented with their exact code references, failure modes, and required remedies. No implementation work will proceed until this audit and the accompanying Implementation Plan are reviewed and approved.
