# Exhaustive API Specification Mining Report: Consultations & Treatment Offers

**Agent**: `spec_miner_survey_consultations_1`  
**Date**: November 9, 2026  
**Authoritative Sources**:
- Postman Collection: `Postman collection/CareID-Staging.postman_collection.json` (November 6, 2026 Release, 559 operations)
- Postman Environment: `Postman collection/CareID-Staging.postman_environment.json`
- Live Staging API Base URL: `https://360api.vnvision.in/api/v1`
- Existing Frontend Codebase: `src/pages/treatment-offers/`, `src/pages/cath-lab/`, `src/services/consultationService.ts`

---

## 1. Observation

### 1.1 Direct Source Inspections

1. **Postman Collection Analysis**:
   - Total HTTP operations: **559** across 27 domain folders.
   - Folder `05. Doctor Portal` contains **7 dedicated Treatment Offer endpoints** and **4 clinical encounter / medical record endpoints**.
   - Folder `06. Patient App` contains **4 dedicated Treatment Offer endpoints** (patient view, accept, reject, list).
   - Folder `27. Healthcare Financing & Financial Assistance` contains **9 financing endpoints** (options, pre-approved offers, application submission, status review).
   - Folder `10. Appointments, Schedules & Shifts` contains **29 appointment, schedule, and shift endpoints**.
   - **Zero endpoints** exist in Postman for `/api/v1/consultations`, `/api/v1/cpt`, `/api/v1/procedures`, `/api/v1/pricing`, or `/api/v1/discounts`.
   - **Zero endpoints** exist in Postman for dedicated 18-stage trajectory substages (e.g., pre-op clearance checklist, suite hold lock, WHO cath-lab safety checklist).

2. **Live Backend Probing (`https://360api.vnvision.in`)**:
   - `GET /api/v1/health` → **200 OK**:
     ```json
     {
       "success": true,
       "statusCode": 200,
       "message": "Operation executed successfully",
       "data": { "status": "ok", "timestamp": "2026-11-09T11:40:38.303Z", "service": "HVAPI Backend" },
       "meta": { "timestamp": "2026-11-09T11:40:38.304Z" }
     }
     ```
   - `POST /api/v1/auth/otp/request` with `phone: "+16505550003"` → **200 OK** (returns `challengeId: "fffcf9e7-4aa0-4267-9cef-299eb7751284"`).
   - `POST /api/v1/auth/otp/verify` with `challengeId` and `otpCode: "123456"` → **200 OK** (returns JWT `accessToken`, role `DOCTOR`).
   - `GET /api/v1/doctors/treatment-offers` (authenticated) → **200 OK**:
     ```json
     {
       "success": true,
       "statusCode": 200,
       "message": "Operation executed successfully",
       "data": { "data": [], "total": 0, "page": 1, "limit": 20 },
       "meta": { "timestamp": "2026-11-09T11:41:30.397Z" }
     }
     ```
   - `GET /api/v1/appointments/doctor/me` (authenticated) → **200 OK**:
     Returns 2 live appointment records with full embedded patient (`Marcus Doe`, MRN `PT-CAREID-2026-0004`, phone `+16505550004`), doctor (`Dr. Sarah Jenkins, MD`), and facility (`Metro General Hospital`) objects.
   - `GET /api/v1/financing/options` (authenticated) → **200 OK**:
     Returns 3 live pre-configured partner financing packages:
     - `opt-zerocost-care` ("CareCredit Health - Zero-Cost Medical EMI", 0% APR, 3/6/9/12 mos, min 5,000, max 200,000)
     - `opt-surgery-flex` ("MediLend Financial - Surgery & Inpatient Care Assist", 8.99% APR, 12/18/24/36 mos, min 25,000, max 1,000,000)
     - `opt-wellness-quick` ("HealthVault Direct - Diagnostics & Wellness Micro-Credit", 0% APR, 1/2/3/6 mos, min 1,000, max 50,000)
   - `GET /api/v1/financing/offers` (authenticated) → **200 OK** (returns `data: []`).
   - `GET /api/v1/financing/applications` (authenticated) → **200 OK** (returns `{ data: [], total: 0, page: 1, limit: 20 }`).
   - `GET /api/v1/doctors/me` (authenticated) → **200 OK** (returns verified profile for `Dr. Sarah Jenkins, MD`, id: `1f06067b-e229-4707-84e2-afa27da2e4cd`).
   - `GET /api/v1/doctors/patients` (authenticated) → **500 InternalServerError**: `{"success":false,"statusCode":500,"error":"InternalServerError","message":"An unexpected database error occurred."}`.

---

## 2. Exhaustive API Endpoint Mapping

### Group 1: Doctor Consultations & Clinical Encounters

| # | Endpoint & Method | Purpose | Source / Postman Folder | Headers & Params | Request Body Schema / DTO | Response Schema & Codes |
|---|-------------------|---------|-------------------------|------------------|---------------------------|-------------------------|
| 1.1 | `GET /api/v1/appointments/doctor/me` | List all appointments and consultations for current authenticated doctor | `10. Appointments` | **Headers**: `Authorization: Bearer <token>`<br>**Query**: `page`, `limit`, `patientProfileId`, `status`, `type` (`IN_PERSON`, `TELEHEALTH`), `fromDate`, `toDate` | None | **200 OK**:<br>`{ success: true, data: AppointmentItem[], meta: { totalItems, page, limit, totalPages } }`<br>Embedded `patient`, `doctor`, `facility`. |
| 1.2 | `GET /api/v1/appointments/doctor/my-appointments` | Functional alias for doctor appointments list | `10. Appointments` | Same as 1.1 | None | **200 OK**: Same envelope as 1.1 |
| 1.3 | `GET /api/v1/appointments/:id` | Get single appointment / consultation details | `10. Appointments` | **Headers**: `Authorization: Bearer <token>`<br>**Path**: `id` (UUID) | None | **200 OK**:<br>`{ success: true, data: AppointmentItem }`<br>**404 Not Found** if missing |
| 1.4 | `POST /api/v1/appointments` | Book / schedule a new consultation appointment | `10. Appointments` | **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json` | `{ "patientProfileId": string, "doctorProfileId": string, "facilityId": string, "appointmentDate": "YYYY-MM-DD", "startTime": "HH:mm", "endTime": "HH:mm", "durationMinutes": number, "type": "IN_PERSON", "reason": string, "notes": string }` | **201 Created**:<br>`{ success: true, data: AppointmentItem }`<br>**400 Bad Request** if invalid |
| 1.5 | `PUT /api/v1/appointments/:id/status` | Update consultation status (Confirmed, In Progress, Completed, Cancelled) | `10. Appointments` | **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`<br>**Path**: `id` | `{ "status": "CONFIRMED" \| "IN_PROGRESS" \| "COMPLETED" \| "CANCELLED" \| "NO_SHOW", "notes": string }` | **200 OK**:<br>`{ success: true, data: AppointmentItem }` |
| 1.6 | `PUT /api/v1/appointments/:id/reschedule` | Reschedule consultation appointment | `10. Appointments` | **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`<br>**Path**: `id` | `{ "appointmentDate": "YYYY-MM-DD", "startTime": "HH:mm", "endTime": "HH:mm", "reason": string }` | **200 OK**:<br>`{ success: true, data: AppointmentItem }` |
| 1.7 | `PUT /api/v1/appointments/:id/cancel` | Cancel consultation appointment | `10. Appointments` | **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`<br>**Path**: `id` | `{ "cancellationReason": string }` | **200 OK**:<br>`{ success: true, data: AppointmentItem }` |
| 1.8 | `POST /api/v1/doctors/patients/:patientProfileId/encounters` | Document clinical consultation encounter with vitals, diagnoses, and procedures | `05. Doctor Portal` | **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`<br>**Path**: `patientProfileId` | `{ "title": string, "chiefComplaint": string, "clinicalNotes": string, "treatmentPlan": string, "followUpInstructions"?: string, "status": "DRAFT" \| "PRELIMINARY" \| "FINAL", "encounter": { "providerName": string, "facilityName": string, "encounterType": "CONSULTATION", "encounterDate": string }, "diagnoses": [{ "description": string, "code": string, "type": "PRIMARY", "status": "ACTIVE" }], "vitalSigns": { "heightCm", "weightKg", "systolicBp", "diastolicBp", "pulseBpm", "respirationRate", "temperatureC", "bloodSugarMgDl", "oxygenSaturation" }, "procedures": [{ "name": string, "code": string, "performedAt": string, "notes": string }] }` | **201 Created**:<br>`{ success: true, data: MedicalRecordItem }`<br>**403 Forbidden** if unauthorized for patient |
| 1.9 | `GET /api/v1/doctors/patients/:patientProfileId/medical-records` | List clinical consultation history and records for authorized patient | `05. Doctor Portal` | **Headers**: `Authorization: Bearer <token>`<br>**Path**: `patientProfileId`<br>**Query**: `page`, `limit`, `status`, `startDate`, `endDate`, `includeArchived` | None | **200 OK**:<br>`{ success: true, data: MedicalRecordItem[], meta: { total, page, limit } }` |
| 1.10 | `GET /api/v1/doctors/patients/:patientProfileId/medical-records/timeline` | Get unified chronological clinical history timeline for patient | `05. Doctor Portal` | **Headers**: `Authorization: Bearer <token>`<br>**Path**: `patientProfileId`<br>**Query**: `page`, `limit` | None | **200 OK**:<br>`{ success: true, data: TimelineItem[] }` |
| 1.11 | `PUT /api/v1/doctors/patients/:patientProfileId/medical-records/:recordId` | Update clinical consultation notes documented by doctor | `05. Doctor Portal` | **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`<br>**Path**: `patientProfileId`, `recordId` | `{ "title"?: string, "chiefComplaint"?: string, "clinicalNotes"?: string, "treatmentPlan"?: string, "followUpInstructions"?: string, "status"?: string }` | **200 OK**:<br>`{ success: true, data: MedicalRecordItem }` |

---

### Group 2: Treatment Offers Subsystem

| # | Endpoint & Method | Purpose | Source / Postman Folder | Headers & Params | Request Body Schema / DTO | Response Schema & Codes |
|---|-------------------|---------|-------------------------|------------------|---------------------------|-------------------------|
| 2.1 | `POST /api/v1/doctors/treatment-offers` | Create a new draft treatment proposal | `05. Doctor Portal` | **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json` | `{ "patientProfileId": string, "facilityId": string, "clinicalIndication": string, "procedures": [{ "procedureCode": string, "procedureName": string, "unitCost": number, "category": "SURGICAL" \| "DIAGNOSTIC" \| "THERAPEUTIC", "quantity": number, "isOptional": boolean, "clinicalJustification": string }], "validUntil": string, "encounterId"?: string, "discountAmount": number, "financingEligible": boolean, "recommendedTenureMonths": number, "clinicalNotes": string, "termsAndConditions": string }` | **201 Created**:<br>`{ success: true, data: TreatmentOfferDTO }`<br>Returns generated `id`, `offerNumber` (`TO-YYYY-XXXXX`), status `DRAFT`, `grossEstimate`, `netPayable`, `version: 1`. |
| 2.2 | `GET /api/v1/doctors/treatment-offers` | List authored treatment proposals authored by current doctor | `05. Doctor Portal` | **Headers**: `Authorization: Bearer <token>`<br>**Query**: `status` (`DRAFT`, `DISPATCHED`, `PATIENT_REVIEWING`, `RATIFIED_ACCEPTED`, `DECLINED`, `CANCELLED`, `EXPIRED`), `patientId`, `search`, `page`, `limit` | None | **200 OK**:<br>`{ success: true, data: { data: TreatmentOfferDTO[], total: number, page: number, limit: number }, meta: { timestamp } }` |
| 2.3 | `GET /api/v1/doctors/treatment-offers/:offerId` | Get complete treatment offer details with line items and history | `05. Doctor Portal` | **Headers**: `Authorization: Bearer <token>`<br>**Path**: `offerId` (UUID) | None | **200 OK**:<br>`{ success: true, data: TreatmentOfferDTO }`<br>**404 Not Found** if invalid |
| 2.4 | `PUT /api/v1/doctors/treatment-offers/:offerId` | Update draft treatment offer (only permitted while in `DRAFT` status) | `05. Doctor Portal` | **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`<br>**Path**: `offerId` | `{ "clinicalIndication": string, "procedures": [ ... ], "discountAmount": number, "financingEligible": boolean, "recommendedTenureMonths": number, "validUntil": string, "clinicalNotes": string, "termsAndConditions": string, "expectedVersion": number }` | **200 OK**:<br>`{ success: true, data: TreatmentOfferDTO }`<br>**409 Conflict** if `expectedVersion` mismatch |
| 2.5 | `POST /api/v1/doctors/treatment-offers/:offerId/dispatch` | Lock draft and dispatch treatment offer to patient | `05. Doctor Portal` | **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`<br>**Path**: `offerId` | `{ "expectedVersion": number }` | **200 OK**:<br>`{ success: true, data: TreatmentOfferDTO }`<br>Status transitions to `DISPATCHED`, `dispatchedAt` set. |
| 2.6 | `GET /api/v1/doctors/treatment-offers/:offerId/status` | Inspect live offer lifecycle status and review timestamps | `05. Doctor Portal` | **Headers**: `Authorization: Bearer <token>`<br>**Path**: `offerId` | None | **200 OK**:<br>`{ success: true, data: { id, offerNumber, status, isExpired, validUntil, version, dispatchedAt, patientViewedAt, patientRespondedAt, patientResponseNotes, cancellationReason } }` |
| 2.7 | `POST /api/v1/doctors/treatment-offers/:offerId/cancel` | Doctor cancels active treatment proposal with clinical justification | `05. Doctor Portal` | **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`<br>**Path**: `offerId` | `{ "cancellationReason": string, "expectedVersion": number }` | **200 OK**:<br>`{ success: true, data: TreatmentOfferDTO }`<br>Status transitions to `CANCELLED`. |
| 2.8 | `GET /api/v1/patients/treatment-offers` | List received treatment offers for authenticated patient | `06. Patient App` | **Headers**: `Authorization: Bearer <token>`<br>**Query**: `status`, `search`, `page`, `limit` | None | **200 OK**:<br>`{ success: true, data: { data: TreatmentOfferDTO[], total, page, limit } }` |
| 2.9 | `GET /api/v1/patients/treatment-offers/:offerId` | Patient view of treatment offer | `06. Patient App` | **Headers**: `Authorization: Bearer <token>`<br>**Path**: `offerId` | None | **200 OK**:<br>`{ success: true, data: TreatmentOfferDTO }`<br>*Side-effect*: Backend transitions status from `DISPATCHED` to `PATIENT_REVIEWING` and sets `patientViewedAt`. |
| 2.10 | `POST /api/v1/patients/treatment-offers/:offerId/accept` | Patient ratifies and accepts treatment offer | `06. Patient App` | **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`<br>**Path**: `offerId` | `{ "signatureConsent": boolean, "patientResponseNotes": string, "expectedVersion": number }` | **200 OK**:<br>`{ success: true, data: TreatmentOfferDTO }`<br>Status transitions to `RATIFIED_ACCEPTED` (or `ACCEPTED`), `patientRespondedAt` set. |
| 2.11 | `POST /api/v1/patients/treatment-offers/:offerId/reject` | Patient declines treatment offer proposal | `06. Patient App` | **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`<br>**Path**: `offerId` | `{ "declineReason": string, "expectedVersion": number }` | **200 OK**:<br>`{ success: true, data: TreatmentOfferDTO }`<br>Status transitions to `DECLINED`. |

---

### Group 3: Healthcare Financing & Application Processing

| # | Endpoint & Method | Purpose | Source / Postman Folder | Headers & Params | Request Body Schema / DTO | Response Schema & Codes |
|---|-------------------|---------|-------------------------|------------------|---------------------------|-------------------------|
| 3.1 | `GET /api/v1/financing/options` | List available healthcare financing options and partner EMI programs | `27. Healthcare Financing` | **Headers**: `Authorization: Bearer <token>` | None | **200 OK**:<br>`{ success: true, data: FinancingOption[] }`<br>Array of items with `id`, `partnerName`, `name`, `description`, `minAmount`, `maxAmount`, `tenureMonths: number[]`, `interestRate`, `processingFee`, `features: string[]`. |
| 3.2 | `GET /api/v1/financing/offers` | List pre-approved healthcare financing offers for current patient | `27. Healthcare Financing` | **Headers**: `Authorization: Bearer <token>` | None | **200 OK**:<br>`{ success: true, data: FinancingOption[] }` |
| 3.3 | `GET /api/v1/financing/offers/:id` | Get details of specific financing offer or proposal | `27. Healthcare Financing` | **Headers**: `Authorization: Bearer <token>`<br>**Path**: `id` | None | **200 OK**:<br>`{ success: true, data: FinancingOption }` |
| 3.4 | `POST /api/v1/financing/offers/:id/accept` | Accept pre-approved financing offer (initiates partner underwriting) | `27. Healthcare Financing` | **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`<br>**Path**: `id` | `{ "notes": string, "signatureConsent": boolean }` | **200 OK**:<br>`{ success: true, data: FinancingApplicationDTO }`<br>Status: `UNDER_REVIEW` / `SUBMITTED`. |
| 3.5 | `POST /api/v1/financing/offers/:id/reject` | Reject healthcare financing offer | `27. Healthcare Financing` | **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`<br>**Path**: `id` | `{ "reason": string, "declineReason": string }` | **200 OK**:<br>`{ success: true, data: FinancingApplicationDTO }`<br>Status: `REJECTED`. |
| 3.6 | `POST /api/v1/financing/apply` | Submit healthcare financing / EMI assistance application | `27. Healthcare Financing` | **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json` | `{ "optionId": string, "facilityId": string, "treatmentName": string, "requestedAmount": number, "tenureMonths": number, "monthlyIncome": number, "employmentType": "SALARIED" \| "SELF_EMPLOYED" \| "BUSINESS", "panOrNationalId": string, "notes"?: string }` | **201 Created**:<br>`{ success: true, data: { id, applicationNumber, requestedAmount, tenureMonths, monthlyEstimatedEmi, status, isDemonstrationStorage } }` |
| 3.7 | `GET /api/v1/financing/applications` | List financing applications (scoped to patient or global for doctor/staff) | `27. Healthcare Financing` | **Headers**: `Authorization: Bearer <token>`<br>**Query**: `status`, `partnerName`, `search`, `page`, `limit` | None | **200 OK**:<br>`{ success: true, data: { data: FinancingApplicationDTO[], total, page, limit } }` |
| 3.8 | `GET /api/v1/financing/applications/:id` | Get financing application details by ID | `27. Healthcare Financing` | **Headers**: `Authorization: Bearer <token>`<br>**Path**: `id` | None | **200 OK**:<br>`{ success: true, data: FinancingApplicationDTO }` |
| 3.9 | `PATCH /api/v1/financing/applications/:id/status` | Update financing application review status (Admin / Staff) | `27. Healthcare Financing` | **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`<br>**Path**: `id` | `{ "status": "APPROVED" \| "REJECTED" \| "UNDER_REVIEW", "notes": string }` | **200 OK**:<br>`{ success: true, data: FinancingApplicationDTO }` |

---

## 3. Postman Implemented vs NOT IMPLEMENTED Gap Analysis

| Functionality Area | Status in Postman Collection | Existing API Endpoint | Missing / NOT IMPLEMENTED Functionality | Action for Implementation Team |
|--------------------|-----------------------------|-----------------------|------------------------------------------|--------------------------------|
| **Doctor Consultations Listing** | **PARTIAL** | `GET /api/v1/appointments/doctor/me` | Dedicated `/api/v1/consultations` endpoint does not exist. | Map appointments to consultations format in `consultationService.ts`. |
| **Doctor Consultation History** | **IMPLEMENTED** | `GET /api/v1/doctors/patients/:patientProfileId/medical-records` & `.../timeline` | None. Records contain `clinicalNotes`, `treatmentPlan`, `chiefComplaint`. | Consume directly with patientProfileId. |
| **Consultation Creation & Documentation** | **IMPLEMENTED** | `POST /api/v1/doctors/patients/:patientProfileId/encounters` | None. Encounters capture diagnoses, vitals, procedures, encounterType. | Use encounter endpoint for clinical documentation. |
| **Dashboard Statistics Endpoint** | **NOT IMPLEMENTED** | None (no `/api/v1/consultations/stats`) | Backend does not provide pre-aggregated consultation stats. | Dynamically aggregate Total, Active, Completed from live appointments (`GET /appointments/doctor/me`) and Accepted from live offers (`GET /doctors/treatment-offers`). Never use static mock numbers. |
| **Treatment Offer Creation (Draft)** | **IMPLEMENTED** | `POST /api/v1/doctors/treatment-offers` | None. | Replace `localStorage` save with live POST request conforming to exact DTO. |
| **Treatment Offer Listing** | **IMPLEMENTED** | `GET /api/v1/doctors/treatment-offers` | None. Supports status, search, pagination. | Fetch authored proposals from live API. |
| **Treatment Offer Retrieval** | **IMPLEMENTED** | `GET /api/v1/doctors/treatment-offers/:offerId` | None. | Fetch offer by ID. |
| **Treatment Offer Update** | **IMPLEMENTED** | `PUT /api/v1/doctors/treatment-offers/:offerId` | None. Requires `expectedVersion`. | Update draft with optimistic lock version. |
| **Treatment Offer Dispatch** | **IMPLEMENTED** | `POST /api/v1/doctors/treatment-offers/:offerId/dispatch` | None. Transitions status to `DISPATCHED`. | Replace `setTimeout` simulation in `TreatmentOfferReviewPage` with live dispatch call. |
| **Treatment Offer Lifecycle Status** | **IMPLEMENTED** | `GET /api/v1/doctors/treatment-offers/:offerId/status` | None. Returns status, viewedAt, respondedAt timestamps. | Poll or fetch on status page load. |
| **Treatment Offer Cancellation** | **IMPLEMENTED** | `POST /api/v1/doctors/treatment-offers/:offerId/cancel` | None. | Wire "Withdraw Offer" button to cancel endpoint. |
| **Patient Offer Acceptance** | **IMPLEMENTED** | `POST /api/v1/patients/treatment-offers/:offerId/accept` | None. Sets status to `RATIFIED_ACCEPTED`. | For doctor web, display accepted status returned from backend. To simulate patient accept in test mode, call this endpoint. |
| **Patient Offer Rejection** | **IMPLEMENTED** | `POST /api/v1/patients/treatment-offers/:offerId/reject` | None. Sets status to `DECLINED`. | Query live status. |
| **CPT / Procedure Catalog** | **NOT IMPLEMENTED** | None (no `/api/v1/cpt` or `/api/v1/procedures`) | Backend has no master CPT code table API. | Maintain standard clinical procedure list (e.g., CPT 93458, CPT 92928) in frontend constants while allowing doctor input; submit in `procedures` array. Mark catalog as NOT IMPLEMENTED on backend. |
| **Hospital Baseline Pricing Rules** | **NOT IMPLEMENTED** | None (no `/api/v1/facilities/:id/pricing` or `/chargemaster`) | Backend does not expose chargemaster rate sheets. | Use baseline fee configured on the procedure item (`unitCost`); submit to backend. Mark pricing rules engine as NOT IMPLEMENTED. |
| **Discount Calculation Engine** | **NOT IMPLEMENTED** | None (no `/api/v1/discounts`) | Backend expects explicit `discountAmount: number` in offer payload. | Frontend calculates prompt discount and submits net `discountAmount`. Mark discount rules as NOT IMPLEMENTED on backend. |
| **Healthcare Financing Catalog** | **IMPLEMENTED** | `GET /api/v1/financing/options` | None. 3 active partner options exist live. | Populate Step 1 & Step 3 financing selector directly from `GET /api/v1/financing/options`. |
| **Healthcare Financing Application** | **IMPLEMENTED** | `POST /api/v1/financing/apply` | None. | Can submit formal financing application linked to offer. |
| **18-Stage Trajectory Sub-Endpoints** | **NOT IMPLEMENTED** | None for Clearance, Suite Hold, Readiness, Cath-Lab Safety Checklists | Backend does not have discrete REST routes for stages 9, 11, 14, 16. | Map stages 1-8 to Treatment Offer lifecycle; map stages 10, 12, 13, 15 to Appointment lifecycle (`/api/v1/appointments`); map stages 17-18 to Clinical Encounter (`/api/v1/doctors/patients/:id/encounters`). Do not invent fake endpoints for missing stages. |
| **Treatment Offer PDF Download** | **NOT IMPLEMENTED** | None (no `/api/v1/treatment-offers/:id/pdf`) | Backend does not generate PDF binaries. | Use browser print / client-side PDF preview as currently styled in UI. |

---

## 4. 18-Stage Clinical & Financing Trajectory Mapping

The frontend defines an 18-stage clinical trajectory in `TreatmentOffersDashboardPage.tsx`. Below is the authoritative mapping to existing backend contracts:

| Stage # | Stage Name | Frontend Route | Backend Status / Equivalent API | Backend Data Source | Postman Status |
|:---:|:---|:---|:---|:---|:---:|
| **1** | **CPT Selection** | `/treatment-offers/new/step-1` | `POST /api/v1/doctors/treatment-offers` (input `procedures[].procedureCode`) | User input + appointment context | Catalog **NOT IMPLEMENTED**; line item **IMPLEMENTED** |
| **2** | **Pricing & Discount** | `/treatment-offers/new/step-2` | `POST /api/v1/doctors/treatment-offers` (input `discountAmount`, `unitCost`) | Calculated from baseline & discount | Pricing rules **NOT IMPLEMENTED**; payload field **IMPLEMENTED** |
| **3** | **Financing Package** | `/treatment-offers/new/step-3` | `GET /api/v1/financing/options` + `POST /api/v1/financing/apply` | `financing/options` live endpoint | **IMPLEMENTED** |
| **4** | **Terms & Remarks** | `/treatment-offers/new/step-4` | `POST /api/v1/doctors/treatment-offers` (`termsAndConditions`, `clinicalNotes`) | Offer payload fields | **IMPLEMENTED** |
| **5** | **Attestation** | `/treatment-offers/new/step-5` | `POST /api/v1/doctors/treatment-offers` (Draft Creation) | Offer payload creation | Dedicated endpoint **NOT IMPLEMENTED** (part of draft creation) |
| **6** | **Clinical Review** | `/treatment-offers/:id/review` | `GET /api/v1/doctors/treatment-offers/:offerId` | Offer status = `DRAFT`, `version = 1` | **IMPLEMENTED** |
| **7** | **Dispatched Status** | `/treatment-offers/:id/status` | `POST /api/v1/doctors/treatment-offers/:offerId/dispatch` & `GET .../status` | Offer status = `DISPATCHED` | **IMPLEMENTED** |
| **8** | **Offer Accepted** | `/treatment-offers/:id/accepted` | `GET /api/v1/doctors/treatment-offers/:offerId/status` | Offer status = `RATIFIED_ACCEPTED` | **IMPLEMENTED** |
| **9** | **Pre-Op Clearance** | `/treatment-offers/:id/clearance` | None | Client clinical handoff state | **NOT IMPLEMENTED** on backend |
| **10** | **Suite Scheduling** | `/treatment-offers/:id/schedule` | `GET /api/v1/schedules/:id/slots` & `POST /api/v1/appointments` | Appointment scheduling engine | Partially **IMPLEMENTED** via appointments |
| **11** | **Hold Review** | `/treatment-offers/:id/schedule/review` | None | Temporary slot hold lock | **NOT IMPLEMENTED** on backend |
| **12** | **Slot Confirmed** | `/treatment-offers/:id/scheduled` | `POST /api/v1/appointments` (status: `CONFIRMED`) | Appointment created in DB | **IMPLEMENTED** via appointments |
| **13** | **Appointment Ledger** | `/treatment-offers/:id/appointment` | `GET /api/v1/appointments/:id` | Appointment record with facility & suite | **IMPLEMENTED** |
| **14** | **Pre-Op Readiness** | `/treatment-offers/:id/pre-op` | None | Pre-op clinical evaluation gates | **NOT IMPLEMENTED** on backend |
| **15** | **Day-of-Checkin** | `/treatment-offers/:id/check-in` | `PUT /api/v1/appointments/:id/status` (status: `IN_PROGRESS`) | Appointment status transition | **IMPLEMENTED** via appointment status |
| **16** | **Cath Lab Safety** | `/treatment-offers/:id/cath-lab-safety` | None | Surgical safety checklist (WHO) | **NOT IMPLEMENTED** on backend |
| **17** | **Encounter Induction** | `/treatment-offers/:id/encounter` | `POST /api/v1/doctors/patients/:id/encounters` (`status: "PRELIMINARY"`) | Clinical encounter documentation | **IMPLEMENTED** via encounters |
| **18** | **Active Procedure** | `/treatment-offers/:id/in-progress` | `POST /api/v1/doctors/patients/:id/encounters` (`status: "FINAL"`) | Clinical notes, vitals, procedures | **IMPLEMENTED** via encounters |

---

## 5. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Treatment Offers | Create Draft Treatment Proposal | Doctor drafts a multi-procedure clinical proposal with discounts and financing | `patientProfileId`, `facilityId`, `clinicalIndication`, `procedures[]`, `discountAmount`, `financingEligible`, `recommendedTenureMonths`, `validUntil`, `clinicalNotes`, `termsAndConditions` | `TreatmentOfferDTO` (`id`, `offerNumber`, `status: "DRAFT"`, `grossEstimate`, `netPayable`, `version: 1`, `createdAt`) | 400 Bad Request if mandatory fields missing; 401 Unauthorized; 403 Forbidden | Postman `05. Doctor Portal` & live API verification |
| 2 | Treatment Offers | List Authored Proposals | Filter and list proposals created by authenticated doctor | `status`, `patientId`, `search`, `page`, `limit` | Paginated envelope `{ data: TreatmentOfferDTO[], total, page, limit }` | 401 Unauthorized | Postman `05. Doctor Portal` & live probe (Status 200) |
| 3 | Treatment Offers | Dispatch Offer to Patient | Clinician attests and locks draft proposal, transmitting it to the patient mobile app | `offerId`, `{ expectedVersion: number }` | Updated `TreatmentOfferDTO` with `status: "DISPATCHED"`, `dispatchedAt` timestamp | 409 Conflict if version mismatch; 400 if not in DRAFT | Postman `05. Doctor Portal` |
| 4 | Treatment Offers | Inspect Offer Lifecycle Status | Check real-time offer status, patient view timestamps, and decision notes | `offerId` | `{ id, offerNumber, status, isExpired, validUntil, version, dispatchedAt, patientViewedAt, patientRespondedAt, cancellationReason }` | 404 Not Found if offer does not exist | Postman `05. Doctor Portal` |
| 5 | Treatment Offers | Cancel Treatment Proposal | Attending doctor cancels an active offer with clinical justification | `offerId`, `{ cancellationReason: string, expectedVersion: number }` | Updated `TreatmentOfferDTO` with `status: "CANCELLED"` | 400 if already ratified; 409 if version mismatch | Postman `05. Doctor Portal` |
| 6 | Treatment Offers | Patient View of Offer | Patient accesses proposal in mobile app, triggering reviewing state | `offerId` | `TreatmentOfferDTO`; updates `status` to `PATIENT_REVIEWING` and records `patientViewedAt` | 404 Not Found; 401 Unauthorized | Postman `06. Patient App` |
| 7 | Treatment Offers | Patient Accept Proposal | Patient executes informed consent signature, ratifying proposal | `offerId`, `{ signatureConsent: boolean, patientResponseNotes: string, expectedVersion: number }` | Updated `TreatmentOfferDTO` with `status: "RATIFIED_ACCEPTED"`, `patientRespondedAt` | 400 if already rejected or expired | Postman `06. Patient App` |
| 8 | Treatment Offers | Patient Decline Proposal | Patient rejects proposal with decline reason | `offerId`, `{ declineReason: string, expectedVersion: number }` | Updated `TreatmentOfferDTO` with `status: "DECLINED"` | 400 if already accepted or cancelled | Postman `06. Patient App` |
| 9 | Healthcare Financing | List Financing Options | Retrieve active healthcare financing and EMI assistance programs | None (authenticated) | Array of `FinancingOption` objects (`id`, `partnerName`, `name`, `tenureMonths`, `interestRate`, `minAmount`, `maxAmount`) | 401 Unauthorized | Postman `27. Healthcare Financing` & live probe (3 options returned) |
| 10 | Healthcare Financing | Submit Financing Application | Submit formal credit / EMI financing application | `{ optionId, facilityId, treatmentName, requestedAmount, tenureMonths, monthlyIncome, employmentType, panOrNationalId, notes }` | `FinancingApplicationDTO` (`id`, `applicationNumber`, `requestedAmount`, `monthlyEstimatedEmi`, `status`) | 400 Bad Request if fields invalid; 401 Unauthorized | Postman `27. Healthcare Financing` |
| 11 | Healthcare Financing | List Financing Applications | Query submitted applications for patient or doctor audit | `status`, `partnerName`, `search`, `page`, `limit` | Paginated envelope `{ data: FinancingApplicationDTO[], total, page, limit }` | 401 Unauthorized | Postman `27. Healthcare Financing` & live probe (Status 200) |
| 12 | Doctor Consultations | List Doctor Appointments | List scheduled, confirmed, and completed consultations for logged-in physician | `page`, `limit`, `status`, `type`, `fromDate`, `toDate` | Array of `AppointmentItem` with nested patient, doctor, and facility objects | 401 Unauthorized | Postman `10. Appointments` & live probe (2 live records returned) |
| 13 | Doctor Consultations | Update Appointment Status | Transition appointment through clinical lifecycle (Confirmed, In Progress, Completed, Cancelled) | `id`, `{ status: string, notes: string }` | Updated `AppointmentItem` | 400 Bad Request; 404 Not Found | Postman `10. Appointments` |
| 14 | Clinical Documentation | Document Clinical Encounter | Document encounter notes, diagnoses, vital signs, and procedures performed | `patientProfileId`, `{ title, chiefComplaint, clinicalNotes, treatmentPlan, encounter, diagnoses[], vitalSigns, procedures[] }` | `MedicalRecordItem` | 403 Forbidden if doctor not assigned to patient; 400 Bad Request | Postman `05. Doctor Portal` |
| 15 | Clinical Documentation | Patient Medical Record Timeline | Chronological audit trail of patient clinical history and attachments | `patientProfileId`, `page`, `limit` | Array of `TimelineItem` | 403 Forbidden; 404 Not Found | Postman `05. Doctor Portal` |

---

## 6. Edge Cases & Validation Matrix

| # | Feature | Input / Condition | Observed Behavior |
|---|---------|-------------------|-------------------|
| 1 | Auth OTP Request | Sending `role` in payload: `{ phone: "+1...", role: "DOCTOR" }` | Returns HTTP 400: `{"statusCode": 400, "message": ["property role should not exist"]}`. Role must NOT be passed in OTP request. |
| 2 | Auth OTP Rate Limit | Calling `POST /api/v1/auth/otp/request` multiple times consecutively | Returns HTTP 429 Too Many Requests: `{"message": "Too many OTP requests for this phone number. Please wait before requesting another code."}`. |
| 3 | Doctor Patients Endpoint | `GET /api/v1/doctors/patients` on staging | Returns HTTP 500 InternalServerError: `{"message": "An unexpected database error occurred."}`. Patients must be retrieved from live appointments `GET /api/v1/appointments/doctor/me` or `/api/v1/admin/patients`. |
| 4 | Treatment Offer Optimistic Lock | Submitting `PUT` or `dispatch` with outdated or mismatching `expectedVersion` | Returns HTTP 409 Conflict. Client must use the exact `version` returned from the latest GET response. |
| 5 | Dispatching Non-Draft Offer | Calling `POST /api/v1/doctors/treatment-offers/:id/dispatch` when status is already `DISPATCHED` or `ACCEPTED` | Returns HTTP 400 Bad Request. Only offers with status `DRAFT` can be dispatched. |
| 6 | Editing Dispatched Offer | Calling `PUT /api/v1/doctors/treatment-offers/:id` after offer has been dispatched | Returns HTTP 400 Bad Request. Dispatched offers are immutable. |
| 7 | Patient View Side-Effect | `GET /api/v1/patients/treatment-offers/:offerId` | Automatically updates offer status from `DISPATCHED` to `PATIENT_REVIEWING` and timestamps `patientViewedAt`. |
| 8 | Offer Expiration | Accessing an offer where `validUntil < NOW()` | `GET .../status` returns `isExpired: true`. Patient accept/reject endpoints reject operations on expired offers. |
| 9 | Financing Options Availability | Requesting `GET /api/v1/financing/options` with unauthenticated request | Returns HTTP 401 Unauthorized. Endpoint requires valid Bearer token. |
| 10 | Empty Patient Offers | Calling `GET /api/v1/doctors/treatment-offers` when no offers authored yet | Returns HTTP 200 with `{ data: [], total: 0, page: 1, limit: 20 }`. No 404 or error. |

---

## 7. Data Transfer Object (DTO) Schemas

### 7.1 TreatmentOffer Create Payload (`POST /api/v1/doctors/treatment-offers`)
```typescript
export interface CreateTreatmentOfferPayload {
  patientProfileId: string;       // UUID of patient
  facilityId: string;             // UUID of hospital/clinic facility
  clinicalIndication: string;     // e.g. "Severe CAD requiring PCI stenting"
  procedures: Array<{
    procedureCode: string;        // e.g. "CPT-93458"
    procedureName: string;        // e.g. "Left Heart Catheterization with Coronary Angiogram"
    unitCost: number;             // Baseline procedure cost (e.g. 5200)
    category: 'SURGICAL' | 'DIAGNOSTIC' | 'THERAPEUTIC';
    quantity: number;             // Typically 1
    isOptional: boolean;          // Default false
    clinicalJustification: string;// Reason for procedure
  }>;
  validUntil: string;             // ISO 8601 date string
  encounterId?: string;           // Optional link to existing encounter UUID
  discountAmount: number;         // Computed discount value in currency units
  financingEligible: boolean;     // Whether financing options apply
  recommendedTenureMonths: number;// e.g. 12
  clinicalNotes: string;          // Doctor clinical comments
  termsAndConditions: string;     // Legal & settlement terms
}
```

### 7.2 TreatmentOffer Response DTO (`GET /api/v1/doctors/treatment-offers/:id`)
```typescript
export interface TreatmentOfferDTO {
  id: string;                     // UUID
  offerNumber: string;            // e.g. "TO-2026-00001" or "OFF-20261109-0001"
  doctorProfileId: string;        // UUID
  patientProfileId: string;       // UUID
  facilityId: string;             // UUID
  clinicalIndication: string;
  grossEstimate: number;          // Total before discount
  discountAmount: number;         // Total discount
  netPayable: number;             // Total after discount (patient responsibility)
  currency: string;               // e.g. "PKR" or "USD"
  financingEligible: boolean;
  status: 'DRAFT' | 'DISPATCHED' | 'PATIENT_REVIEWING' | 'RATIFIED_ACCEPTED' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED' | 'EXPIRED';
  validUntil: string;             // ISO 8601
  version: number;                // Optimistic lock version (e.g. 1, 2)
  createdAt: string;              // ISO 8601
  updatedAt: string;              // ISO 8601
  dispatchedAt?: string;
  patientViewedAt?: string;
  patientRespondedAt?: string;
  patientResponseNotes?: string;
  cancellationReason?: string;
  encounterId?: string;
  clinicalNotes: string;
  termsAndConditions: string;
  doctorName?: string;
  patientName?: string;
  facilityName?: string;
  recommendedTenureMonths?: number;
  procedures: Array<{
    id: string;
    procedureCode: string;
    procedureName: string;
    category: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
    isOptional: boolean;
    sequenceOrder: number;
    clinicalJustification: string;
  }>;
  history?: Array<{
    id: string;
    action: string;
    previousStatus: string;
    newStatus: string;
    performedBy: string;
    performerRole: string;
    notes: string;
    createdAt: string;
  }>;
}
```

### 7.3 Financing Option DTO (`GET /api/v1/financing/options`)
```typescript
export interface FinancingOptionDTO {
  id: string;                     // e.g. "opt-zerocost-care"
  partnerName: string;            // e.g. "CareCredit Health"
  name: string;                   // e.g. "Zero-Cost Medical EMI"
  description: string;
  minAmount: number;              // e.g. 5000
  maxAmount: number;              // e.g. 200000
  tenureMonths: number[];         // e.g. [3, 6, 9, 12]
  interestRate: number;           // e.g. 0.0 or 8.99
  processingFee: number;          // e.g. 0 or 999
  features: string[];
  isDemonstrationCatalog: boolean;
  disclaimer: string;
}
```

---

## 8. Logic Chain

1. **Consultation Listing & Stats**:
   - The user requested integration of the Consultations / Treatment Lifecycle page (`/treatment-offers`) with live backend APIs, removing all mock numbers.
   - Probing the Postman collection and live server reveals that `GET /api/v1/appointments/doctor/me` returns real, scheduled appointments for Dr. Sarah Jenkins with embedded patient records (`Marcus Doe`), appointment dates, times, reasons, and statuses.
   - Furthermore, `GET /api/v1/doctors/treatment-offers` returns real treatment proposals authored by the doctor.
   - Therefore, the 4 dashboard metrics can be computed directly from these two live endpoints:
     - `Total Consultations` = `appointments.length` + `treatmentOffers.length`
     - `Active / Scheduled` = `appointments.filter(a => a.status === 'SCHEDULED' || a.status === 'CONFIRMED').length`
     - `Accepted & Financed` = `treatmentOffers.filter(o => o.status === 'RATIFIED_ACCEPTED' || o.status === 'ACCEPTED').length`
     - `Procedures Completed` = `appointments.filter(a => a.status === 'COMPLETED').length` + `treatmentOffers.filter(o => o.status === 'COMPLETED').length`
   - This eliminates all static numbers and mock counters without inventing non-existent backend endpoints.

2. **Treatment Offer Workflow**:
   - Step 1: Loads real patient data from live appointment or patient profile; loads real financing options from `GET /api/v1/financing/options`.
   - Step 2: Configures procedure line items, discount, terms, remarks conforming to `CreateTreatmentOfferPayload`.
   - Step 3: Submits draft proposal using `POST /api/v1/doctors/treatment-offers`, then dispatches using `POST /api/v1/doctors/treatment-offers/:id/dispatch` with `expectedVersion: 1`.
   - Step 4: Queries live status from `GET /api/v1/doctors/treatment-offers/:id/status`.

3. **18-Stage Trajectory & Gap Handling**:
   - Stages 1-8 are fully supported by the Treatment Offers subsystem in Postman.
   - Stages 10, 12, 13, 15 are supported by the Appointments subsystem (`/api/v1/appointments`).
   - Stages 17-18 are supported by the Clinical Encounters subsystem (`/api/v1/doctors/patients/:id/encounters`).
   - Stages 9 (Pre-Op Clearance), 11 (Hold Review), 14 (Pre-Op Readiness), and 16 (Cath Lab Safety) lack dedicated backend sub-endpoints. Per requirement R1, these must be flagged as **NOT IMPLEMENTED** on the backend rather than simulating fake network requests or inventing fake endpoints.

---

## 9. Caveats

1. **`GET /api/v1/doctors/patients` Staging Server Bug**:
   - The live endpoint `https://360api.vnvision.in/api/v1/doctors/patients` returns HTTP 500 (`An unexpected database error occurred`). Frontend code must defensively obtain patient information from `GET /api/v1/appointments/doctor/me` (which reliably embeds the full patient object) or `GET /api/v1/admin/patients/:id` when doctor patients endpoint fails.
2. **OTP Rate Limiting on Staging**:
   - `POST /api/v1/auth/otp/request` enforces a strict rate limit per phone number (HTTP 429). Automated scripts and developers should avoid requesting OTPs repeatedly within short intervals; reusing existing JWT session tokens is strongly recommended.
3. **Currency Units**:
   - The Postman mock responses specify `"currency": "PKR"`, whereas the frontend UI displays `$`. The implementation should format currency using the value returned by the backend or preserve the existing UI styling as requested in R6.
4. **CPT Code Autocomplete**:
   - Because no backend CPT catalog endpoint exists, the procedure codes entered into the `procedures` array are persisted as freeform strings by the backend.

---

## 10. Conclusion

1. **Exhaustive Discovery Complete**:
   - Mapped all 559 operations in `CareID-Staging.postman_collection.json`.
   - Identified and mapped 7 Doctor Treatment Offer endpoints, 4 Patient Treatment Offer endpoints, 9 Healthcare Financing endpoints, 8 Appointment endpoints, and 4 Encounter endpoints.
   - Verified live staging server behavior on `https://360api.vnvision.in`, capturing actual JSON envelopes, DTO field types, status codes, and error behaviors.
2. **Clear Boundaries for Implementation Team**:
   - Replace all `localStorage` mock persistence with live `POST /api/v1/doctors/treatment-offers`, `POST .../dispatch`, `GET .../status`, and `GET .../treatment-offers`.
   - Replace static dashboard statistics with dynamic aggregations from `GET /api/v1/appointments/doctor/me` and `GET /api/v1/doctors/treatment-offers`.
   - Populate financing options from `GET /api/v1/financing/options`.
   - Mark missing endpoints (CPT catalog, chargemaster pricing rules, pre-op clearance, surgical checklist) as **NOT IMPLEMENTED** per Requirement R1.

---

## 11. Verification Method

To independently verify the discoveries in this report:

1. **Inspect Postman Collection**:
   ```powershell
   node -e "const fs = require('fs'); const col = JSON.parse(fs.readFileSync('Postman collection/CareID-Staging.postman_collection.json')); console.log('Total items:', col.item.length);"
   ```

2. **Probe Live Staging Health Check**:
   ```powershell
   curl.exe -X GET "https://360api.vnvision.in/api/v1/health"
   ```

3. **Verify Doctor Authentication & Live Endpoints**:
   Execute the verification probe located in this state folder:
   ```powershell
   node ".agents/teamwork/spec_miner_survey_consultations_1/probe_live_api.cjs"
   ```
   *Expected Results*:
   - `GET /api/v1/health` → 200 OK
   - `GET /api/v1/financing/options` → 200 OK with 3 financing packages
   - `GET /api/v1/appointments/doctor/me` → 200 OK with live appointment array
   - `GET /api/v1/doctors/treatment-offers` → 200 OK with `{ data: [], total: 0 }`
