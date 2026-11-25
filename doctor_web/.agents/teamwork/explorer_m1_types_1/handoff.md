# Handoff Report: Milestone 1 — Component 3 (`src/pages/treatment-offers/types.ts` Type Definitions & Mock Cleanup Blueprint)

## 1. Observation

### 1.1 Existing `types.ts` Structure & Mock Defaults
Inspection of `src/pages/treatment-offers/types.ts` (251 lines) revealed that the file contains legacy mock objects and unaligned types:
- Lines 1–15: `FinancingPackageOption` interface
- Lines 17–93: `FINANCING_PACKAGES_MAP` mock record containing hardcoded mock packages (`careid-0`, `careid-zero`, `healthpay-bridge`, `medpay-flex`, `prompt-cash`).
- Lines 95–143: `TreatmentOfferState` UI form state interface.
- Lines 145–188: `DEFAULT_OFFER_STATE` mock constant containing hardcoded mock patient (`PT-ACTIVE`, `Patient Record`, `#CID-ACTIVE`), static CPT (`CPT #93458`), fake fee ($5,200), mock referral (`#REF-4491`), and dummy ID (`TR-8921`).
- Lines 190–202: `ProceduralSlot` interface.
- Lines 204–226: `AppointmentRecord` interface.
- Lines 228–250: `DEFAULT_APPOINTMENT_RECORD` mock constant (`#PROC-2026-93458`, `TR-8921`, `Cath Lab Suite 3`).

### 1.2 Downstream Consumer Inventory
Running an automated scan across `src/` for imports of `types.ts` and references to `DEFAULT_OFFER_STATE`, `DEFAULT_APPOINTMENT_RECORD`, and `FINANCING_PACKAGES_MAP` revealed 12 consumer files:

1. `src/pages/treatment-offers/TreatmentOfferCreatePage.tsx`:
   - Line 20–22: `import { TreatmentOfferState, DEFAULT_OFFER_STATE, FINANCING_PACKAGES_MAP } from './types';`
   - Line 63: `if (rawId && FINANCING_PACKAGES_MAP[rawId])`
   - Line 71: `hubPayload?.cptCode || DEFAULT_OFFER_STATE.cptCode`
   - Line 74: `hubPayload?.procedureName || DEFAULT_OFFER_STATE.procedureName`
   - Line 77: `DEFAULT_OFFER_STATE.clinicalNecessity`
   - Line 80: `hubPayload?.baselineFee || DEFAULT_OFFER_STATE.baselineFee`
   - Line 90: `const [offerTitle, setOfferTitle] = useState<string>(DEFAULT_OFFER_STATE.offerTitle);`
   - Line 92: `const [doctorNotes, setDoctorNotes] = useState<string>(DEFAULT_OFFER_STATE.doctorNotes);`
   - Line 114: `const pkg = FINANCING_PACKAGES_MAP[selectedFinancingPkg] || FINANCING_PACKAGES_MAP['careid-0'];`
   - Line 142 & 184: Spreads `...DEFAULT_OFFER_STATE` into state payload.
2. `src/pages/treatment-offers/TreatmentOfferReviewPage.tsx`:
   - Line 19: `import { TreatmentOfferState, DEFAULT_OFFER_STATE } from './types';`
   - Line 29: `const offer = (location.state as TreatmentOfferState) || DEFAULT_OFFER_STATE;`
3. `src/pages/treatment-offers/TreatmentOfferStatusPage.tsx`:
   - Line 24: `import { TreatmentOfferState, DEFAULT_OFFER_STATE } from './types';`
   - Line 31: `const offer = (location.state as TreatmentOfferState) || DEFAULT_OFFER_STATE;`
4. `src/pages/treatment-offers/TreatmentOfferAcceptedPage.tsx`:
   - Line 22: `import { TreatmentOfferState, DEFAULT_OFFER_STATE } from './types';`
   - Line 29: `const offer = (location.state as TreatmentOfferState) || DEFAULT_OFFER_STATE;`
5. `src/pages/treatment-offers/AppointmentDetailsPage.tsx`:
   - Line 26: `import { TreatmentOfferState, DEFAULT_OFFER_STATE, DEFAULT_APPOINTMENT_RECORD } from './types';`
   - Line 34: `const offer = (location.state as TreatmentOfferState) || DEFAULT_OFFER_STATE;`
   - Line 35: `const appointment = DEFAULT_APPOINTMENT_RECORD;`
6. `src/pages/treatment-offers/PreOpReadinessPage.tsx`:
   - Line 20: `import { TreatmentOfferState, DEFAULT_OFFER_STATE, DEFAULT_APPOINTMENT_RECORD } from './types';`
   - Line 28: `const offer = (location.state as TreatmentOfferState) || DEFAULT_OFFER_STATE;`
   - Line 29: `const appointment = DEFAULT_APPOINTMENT_RECORD;`
7. `src/pages/treatment-offers/ProcedureSchedulingPage.tsx`:
   - Line 28: `import { TreatmentOfferState, DEFAULT_OFFER_STATE } from './types';`
   - Line 40: `const offer = (location.state as TreatmentOfferState) || DEFAULT_OFFER_STATE;`
8. `src/pages/treatment-offers/ClinicalHandoffPage.tsx`:
   - Line 21: `import { TreatmentOfferState, DEFAULT_OFFER_STATE } from './types';`
   - Line 29: `const offer = (location.state as TreatmentOfferState) || DEFAULT_OFFER_STATE;`
9. `src/pages/treatment-offers/DayOfCheckinPage.tsx`:
   - Line 23: `import { TreatmentOfferState, DEFAULT_OFFER_STATE } from './types';`
   - Line 31: `const offer = (location.state as TreatmentOfferState) || DEFAULT_OFFER_STATE;`
10. `src/pages/cath-lab/EncounterCompletedPage.tsx`:
    - Line 19: `import { TreatmentOfferState } from '@/pages/treatment-offers/types';`
    - Line 26: `const incomingOffer = location.state as Partial<TreatmentOfferState> | undefined;`
11. `src/services/consultationService.ts`:
    - Line 25: `import { TreatmentOfferState } from '@/pages/treatment-offers/types';`
    - Line 362–388: Uses `TreatmentOfferState` for `localStorage` mock methods (`getTreatmentOffers`, `getTreatmentOfferById`, `saveTreatmentOffer`).
12. `src/pages/financing/InsuranceFinancingHubPage.tsx`:
    - Does not import `types.ts` directly, but constructs a route payload matching `Partial<TreatmentOfferState>` passed via React Router `navigate('/treatment-offers/new/step-1', { state: ... })`.

### 1.3 Postman Collection Schema Verification
Inspection of `Postman collection/CareID-Staging.postman_collection.json` validated the following live endpoint payloads and response contracts:
- `POST /api/v1/doctors/treatment-offers` (Doctor Portal request body & 201 response)
- `GET /api/v1/doctors/treatment-offers/:offerId` (200 response)
- `PUT /api/v1/doctors/treatment-offers/:offerId` (request body with `expectedVersion` & 200 response)
- `GET /api/v1/doctors/treatment-offers/:offerId/status` (200 response with `isExpired`, `validUntil`, timestamps)
- `POST /api/v1/doctors/treatment-offers/:offerId/cancel` (request body with `cancellationReason`, `expectedVersion`)
- `POST /api/v1/patients/treatment-offers/:offerId/accept` (200 response ratifying `RATIFIED_ACCEPTED`)
- `POST /api/v1/patients/treatment-offers/:offerId/reject` (request body with `declineReason`, `expectedVersion`)
- `GET /api/v1/financing/options` (200 response array of partner financing options)
- `GET /api/v1/financing/offers` (200 response array of pre-approved financing offers)
- `POST /api/v1/financing/apply` (201 response for financing EMI assistance application)

### 1.4 Baseline TypeScript Compilation Status
Ran `npm run type-check` (`tsc -b --noEmit`):
- Exit code: `0`
- Zero errors across the workspace.

---

## 2. Logic Chain

### 2.1 Postman DTO Interface Alignment (Observation 1.3)
1. In `Postman collection/CareID-Staging.postman_collection.json`, the Doctor Portal treatment offer API operates on well-defined schemas:
   - Creation payload expects: `patientProfileId`, `facilityId`, `clinicalIndication`, `procedures` array, `validUntil` (ISO string), `discountAmount`, `financingEligible`, `recommendedTenureMonths`, `clinicalNotes`, `termsAndConditions`, and optional `encounterId`.
   - Update payload expects: `clinicalIndication`, `procedures`, `discountAmount`, `financingEligible`, `recommendedTenureMonths`, `validUntil`, `clinicalNotes`, `termsAndConditions`, and strictly requires `expectedVersion` for optimistic concurrency locking.
   - Response DTO (`TreatmentOfferDTO`) returns UUID `id`, `offerNumber` (`TO-YYYY-XXXXX`), status enum (`DRAFT`, `DISPATCHED`, `PATIENT_REVIEWING`, `RATIFIED_ACCEPTED`, `ACCEPTED`, `DECLINED`, `CANCELLED`, `EXPIRED`), financial amounts (`grossEstimate`, `discountAmount`, `netPayable`, `currency`), procedure items (`unitCost`, `totalCost`, `isOptional`, `sequenceOrder`, `clinicalJustification`), audit history (`history`), and lifecycle timestamps.
   - Status response (`TreatmentOfferStatusResponse`) returns lightweight lifecycle metadata (`id`, `offerNumber`, `status`, `isExpired`, `validUntil`, `version`, `dispatchedAt`, `patientViewedAt`, `patientRespondedAt`, `patientResponseNotes`, `cancellationReason`).
   - Financing options endpoint (`GET /api/v1/financing/options`) returns partner options with `minAmount`, `maxAmount`, `tenureMonths: number[]`, `interestRate`, `processingFee`, `features: string[]`, `isDemonstrationCatalog`, `disclaimer`.
   - Unified consultation listing (`ConsultationItem`) combines appointment and treatment offer records with `patientProfileId`, `patientName`, `facilityName`, `doctorName`, `appointmentDate`, `status`, and `offerStatus`.
2. Therefore, all these interfaces must be defined as exported, strictly typed TypeScript interfaces in `src/pages/treatment-offers/types.ts`.

### 2.2 Mock Default Impact Analysis (Observations 1.1 & 1.2)
1. If `DEFAULT_OFFER_STATE`, `DEFAULT_APPOINTMENT_RECORD`, and `FINANCING_PACKAGES_MAP` are abruptly deleted from `src/pages/treatment-offers/types.ts` during Milestone 1:
   - `TreatmentOfferCreatePage.tsx` will fail compilation on lines 20, 21, 22, 63, 71, 74, 77, 80, 90, 92, 114, 142, and 184 (13 errors).
   - `TreatmentOfferReviewPage.tsx` will fail compilation on lines 19 and 29 (2 errors).
   - `TreatmentOfferStatusPage.tsx` will fail compilation on lines 24 and 31 (2 errors).
   - `TreatmentOfferAcceptedPage.tsx` will fail compilation on lines 22 and 29 (2 errors).
   - `AppointmentDetailsPage.tsx` will fail compilation on lines 26, 34, and 35 (3 errors).
   - `PreOpReadinessPage.tsx` will fail compilation on lines 20, 28, and 29 (3 errors).
   - `ProcedureSchedulingPage.tsx` will fail compilation on lines 28 and 40 (2 errors).
   - `ClinicalHandoffPage.tsx` will fail compilation on lines 21 and 29 (2 errors).
   - `DayOfCheckinPage.tsx` will fail compilation on lines 23 and 31 (2 errors).
   - Total compilation failure: At least 31 TypeScript compilation errors across 9 components!
2. Project rule strictly requires `npm run type-check` to pass at all quality gates.
3. Milestones 2, 3, and 4 are specifically scoped to rewrite the UI components to fetch live backend data:
   - Milestone 2: Dashboard & 18-Stage Trajectory components (`AppointmentDetailsPage`, `PreOpReadinessPage`, `ProcedureSchedulingPage`, `ClinicalHandoffPage`, `DayOfCheckinPage`).
   - Milestone 3: Step 1 & Step 2 (`InsuranceFinancingHubPage`, `TreatmentOfferCreatePage`).
   - Milestone 4: Step 3 & Step 4 (`TreatmentOfferReviewPage`, `TreatmentOfferStatusPage`, `TreatmentOfferAcceptedPage`).
4. Therefore, deleting mock constants prematurely in Milestone 1 would violate the quality gate and break UI functionality before the consuming components are scheduled to be re-architected.

### 2.3 Phased Deprecation & Transition Strategy
1. **Milestone 1 (Component 3)**:
   - Introduce all authoritative Postman DTO interfaces (`TreatmentOfferDTO`, `CreateTreatmentOfferPayload`, `UpdateTreatmentOfferPayload`, `TreatmentOfferStatusResponse`, `FinancingOptionDTO`, `ConsultationItem`, etc.).
   - Retain `TreatmentOfferState`, `AppointmentRecord`, `ProceduralSlot`, `FinancingPackageOption`, and the mock constants (`DEFAULT_OFFER_STATE`, `DEFAULT_APPOINTMENT_RECORD`, `FINANCING_PACKAGES_MAP`) marked with `@deprecated` JSDoc annotations and documentation of their scheduled removal milestones.
   - This ensures `npm run type-check` compiles with 0 errors during Milestone 1.
2. **Milestone 2**:
   - Trajectory pages fetch live appointment/offer data by `:id` parameter via `treatmentOfferService.getTreatmentOfferById()` and appointment services.
   - Remove imports of `DEFAULT_OFFER_STATE` and `DEFAULT_APPOINTMENT_RECORD` from the 5 trajectory pages.
3. **Milestone 3**:
   - `TreatmentOfferCreatePage` loads financing options from `financingService.getFinancingOptions()` and patient data from `usePatientProfile()`.
   - Remove imports of `DEFAULT_OFFER_STATE` and `FINANCING_PACKAGES_MAP` from `TreatmentOfferCreatePage`.
4. **Milestone 4**:
   - `TreatmentOfferReviewPage`, `TreatmentOfferStatusPage`, and `TreatmentOfferAcceptedPage` load authentic offer data and status via `treatmentOfferService.getTreatmentOfferStatus()`.
   - Remove imports of `DEFAULT_OFFER_STATE` from all 3 review/status pages.
5. **Milestone 5 (Quality Gate Cleanup)**:
   - With zero remaining consumers in the codebase, safely delete `DEFAULT_OFFER_STATE`, `DEFAULT_APPOINTMENT_RECORD`, and `FINANCING_PACKAGES_MAP` from `types.ts`.
   - Run `npm run type-check`, `npm run lint`, and `npm run build` to verify 100% clean compilation.

---

## 3. Caveats

- **No Caveats**: The Postman collection provides complete and authoritative schemas for all treatment offer endpoints (`POST /api/v1/doctors/treatment-offers`, `GET ...`, `PUT .../:offerId`, `POST .../dispatch`, `GET .../status`, `POST .../cancel`, `GET /api/v1/financing/options`).
- **Concurrency Locking**: The backend enforces optimistic concurrency locking on offer updates and cancellations via `expectedVersion: number`. The `UpdateTreatmentOfferPayload`, `TreatmentOfferCancelPayload`, and `TreatmentOfferDeclinePayload` interfaces must strictly include `expectedVersion`.
- **Read-Only Explorer Scope**: In accordance with the dispatch instructions, this investigation made no direct modifications to source code files. The exact implementation code blueprint is provided in Section 4 for the implementer agent.

---

## 4. Conclusion & Implementation Blueprint

### 4.1 Strict Postman DTO Definitions
The following table summarizes the authoritative DTO interfaces to be implemented in `src/pages/treatment-offers/types.ts`:

| Interface | Postman Endpoint / Context | Primary Fields & Types |
|---|---|---|
| `TreatmentOfferDTO` | `GET /api/v1/doctors/treatment-offers/:id`, `POST /.../dispatch` | `id: string`, `offerNumber: string`, `doctorProfileId: string`, `patientProfileId: string`, `facilityId: string`, `clinicalIndication: string`, `grossEstimate: number`, `discountAmount: number`, `netPayable: number`, `currency: string`, `financingEligible: boolean`, `status: TreatmentOfferStatus`, `validUntil: string`, `version: number`, `procedures: TreatmentOfferProcedureDTO[]`, `history?: TreatmentOfferHistoryItemDTO[]` |
| `CreateTreatmentOfferPayload` | `POST /api/v1/doctors/treatment-offers` | `patientProfileId: string`, `facilityId: string`, `clinicalIndication: string`, `procedures: Array<{ procedureCode, procedureName, unitCost, category, quantity, isOptional, clinicalJustification }>`, `validUntil: string`, `discountAmount: number`, `financingEligible: boolean`, `recommendedTenureMonths: number`, `clinicalNotes: string`, `termsAndConditions: string`, `encounterId?: string` |
| `UpdateTreatmentOfferPayload` | `PUT /api/v1/doctors/treatment-offers/:id` | `clinicalIndication?: string`, `procedures?: Array<...>`, `discountAmount?: number`, `financingEligible?: boolean`, `recommendedTenureMonths?: number`, `validUntil?: string`, `clinicalNotes?: string`, `termsAndConditions?: string`, `expectedVersion: number` |
| `TreatmentOfferStatusResponse` | `GET /api/v1/doctors/treatment-offers/:id/status` | `id: string`, `offerNumber: string`, `status: string`, `isExpired: boolean`, `validUntil: string`, `version: number`, `dispatchedAt?: string`, `patientViewedAt?: string`, `patientRespondedAt?: string`, `patientResponseNotes?: string`, `cancellationReason?: string` |
| `FinancingOptionDTO` | `GET /api/v1/financing/options` | `id: string`, `partnerName: string`, `name: string`, `description: string`, `minAmount: number`, `maxAmount: number`, `tenureMonths: number[]`, `interestRate: number`, `processingFee: number`, `features: string[]`, `isDemonstrationCatalog?: boolean`, `disclaimer?: string` |
| `ConsultationItem` | Unified appointment + treatment offer listing | `id: string`, `appointmentId?: string`, `offerId?: string`, `patientProfileId: string`, `patientName: string`, `patientMrn: string`, `patientGender?: string`, `facilityName: string`, `doctorName: string`, `appointmentDate: string`, `appointmentTime?: string`, `status: 'SCHEDULED' \| 'CONFIRMED' \| 'IN_PROGRESS' \| 'COMPLETED' \| 'CANCELLED'`, `offerStatus?: string`, `cptCode?: string`, `procedureName?: string`, `totalCost?: number`, `netPayable?: number` |

### 4.2 Exact Implementation Code for `src/pages/treatment-offers/types.ts`
The implementer agent for Milestone 1 Component 3 can replace `src/pages/treatment-offers/types.ts` with the following clean, strictly typed blueprint:

```typescript
/**
 * CareID Doctor Web - Treatment Offers & Financing Types
 * Authoritative API Contract: CareID-Staging.postman_collection.json
 * - 05. Doctor Portal (Treatment proposals, draft management, dispatch, status, cancellation)
 * - 06. Patient App (Patient view, ratification/acceptance, decline)
 * - 27. Healthcare Financing & Assistance (Options, pre-approved offers, applications)
 */

// ============================================================================
// 1. Authoritative Backend DTOs (Postman 05 & 06)
// ============================================================================

export type TreatmentOfferStatus =
  | 'DRAFT'
  | 'DISPATCHED'
  | 'PATIENT_REVIEWING'
  | 'RATIFIED_ACCEPTED'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'CANCELLED'
  | 'EXPIRED';

export type ProcedureCategory =
  | 'SURGICAL'
  | 'DIAGNOSTIC'
  | 'THERAPEUTIC'
  | string;

export interface TreatmentOfferProcedureDTO {
  id?: string;
  procedureCode: string;
  procedureName: string;
  category: ProcedureCategory;
  quantity: number;
  unitCost: number;
  totalCost?: number;
  isOptional: boolean;
  sequenceOrder?: number;
  clinicalJustification: string;
}

export interface TreatmentOfferHistoryItemDTO {
  id: string;
  newStatus: TreatmentOfferStatus | string;
  action: string;
  performedBy: string;
  createdAt: string;
  previousStatus?: TreatmentOfferStatus | string;
  performerRole?: string;
  notes?: string;
}

export interface TreatmentOfferDTO {
  id: string;
  offerNumber: string;
  doctorProfileId: string;
  patientProfileId: string;
  facilityId: string;
  clinicalIndication: string;
  grossEstimate: number;
  discountAmount: number;
  netPayable: number;
  currency: string;
  financingEligible: boolean;
  status: TreatmentOfferStatus;
  validUntil: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  recommendedTenureMonths?: number;
  dispatchedAt?: string;
  patientViewedAt?: string;
  patientRespondedAt?: string;
  patientResponseNotes?: string;
  cancellationReason?: string;
  encounterId?: string;
  clinicalNotes?: string;
  termsAndConditions?: string;
  doctorName?: string;
  patientName?: string;
  facilityName?: string;
  procedures: TreatmentOfferProcedureDTO[];
  history?: TreatmentOfferHistoryItemDTO[];
}

export interface CreateTreatmentOfferPayload {
  patientProfileId: string;
  facilityId: string;
  clinicalIndication: string;
  procedures: Array<{
    procedureCode: string;
    procedureName: string;
    unitCost: number;
    category: ProcedureCategory;
    quantity: number;
    isOptional: boolean;
    clinicalJustification: string;
  }>;
  validUntil: string; // ISO 8601 string
  encounterId?: string;
  discountAmount: number;
  financingEligible: boolean;
  recommendedTenureMonths: number;
  clinicalNotes: string;
  termsAndConditions: string;
}

export interface UpdateTreatmentOfferPayload {
  clinicalIndication?: string;
  procedures?: Array<{
    procedureCode: string;
    procedureName: string;
    unitCost: number;
    category: ProcedureCategory;
    quantity: number;
    isOptional: boolean;
    clinicalJustification: string;
  }>;
  discountAmount?: number;
  financingEligible?: boolean;
  recommendedTenureMonths?: number;
  validUntil?: string;
  clinicalNotes?: string;
  termsAndConditions?: string;
  expectedVersion: number;
}

export interface TreatmentOfferStatusResponse {
  id: string;
  offerNumber: string;
  status: TreatmentOfferStatus | string;
  isExpired: boolean;
  validUntil: string;
  version: number;
  dispatchedAt?: string;
  patientViewedAt?: string;
  patientRespondedAt?: string;
  patientResponseNotes?: string;
  cancellationReason?: string;
}

export interface TreatmentOfferCancelPayload {
  cancellationReason: string;
  expectedVersion: number;
}

export interface TreatmentOfferDeclinePayload {
  declineReason: string;
  expectedVersion: number;
}

export interface TreatmentOfferListParams {
  status?: TreatmentOfferStatus | string;
  patientId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

// ============================================================================
// 2. Authoritative Financing DTOs (Postman 27)
// ============================================================================

export interface FinancingOptionDTO {
  id: string;
  partnerName: string;
  name: string;
  description: string;
  minAmount: number;
  maxAmount: number;
  tenureMonths: number[];
  interestRate: number;
  processingFee: number;
  features: string[];
  isDemonstrationCatalog?: boolean;
  disclaimer?: string;
}

export interface FinancingApplicationPayload {
  optionId: string;
  facilityId?: string;
  treatmentName: string;
  requestedAmount: number;
  tenureMonths: number;
  monthlyIncome: number;
  employmentType: 'SALARIED' | 'SELF_EMPLOYED' | 'BUSINESS' | string;
  panOrNationalId: string;
  notes?: string;
}

export interface FinancingApplicationResponse {
  id: string;
  applicationNumber: string;
  userId: string;
  optionId: string;
  partnerName: string;
  treatmentName: string;
  requestedAmount: number;
  tenureMonths: number;
  monthlyEstimatedEmi: number;
  status: string;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
  isDemonstrationStorage?: boolean;
  storageNotice?: string;
}

// ============================================================================
// 3. Common Pagination & Consultation Models
// ============================================================================

export interface PaginationMeta {
  totalItems: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ConsultationItem {
  id: string;
  appointmentId?: string;
  offerId?: string;
  patientProfileId: string;
  patientName: string;
  patientMrn: string;
  patientGender?: string;
  patientPhone?: string;
  patientAge?: string;
  facilityName: string;
  doctorName: string;
  doctorSpecialty?: string;
  appointmentDate: string;
  appointmentTime?: string;
  status: 'SCHEDULED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  offerStatus?: TreatmentOfferStatus | 'SCHEDULED' | 'PROCEDURE_READY' | 'COMPLETED' | string;
  cptCode?: string;
  procedureName?: string;
  title: string;
  chiefComplaint?: string;
  clinicalNotes?: string;
  treatmentPlan?: string;
  totalCost?: number;
  netPayable?: number;
  createdAt?: string;
}

// ============================================================================
// 4. Legacy UI Form States & Deprecated Bridge Defaults (Milestones 2–4 Transition)
// ============================================================================

export interface ProceduralSlot {
  id: string;
  timeWindow: string;
  durationMinutes: number;
  suiteName: string;
  suiteNumber: number;
  status: 'available' | 'selected' | 'booked' | 'conflict' | 'maintenance';
  attendingName?: string;
  procedureType?: string;
  checkInTime?: string;
  holdExpiresMinutes?: number;
  tags?: string[];
}

export interface FinancingPackageOption {
  id: string;
  name: string;
  partnerTag: string;
  badge: string;
  termMonths: number;
  termMonthsDisplay: string;
  apr: number;
  aprDisplay: string;
  calculateMonthly: (net: number) => number;
  calculateTotal: (net: number) => number;
  enrollmentFee: string;
  penaltyFee: string;
  availableCredit: string;
}

export interface TreatmentOfferState {
  patientId: string;
  patientName: string;
  patientCid: string;
  patientAge: string;
  patientGender: string;
  patientBlood: string;
  patientAllergy: string;
  insuranceStatus: string;
  referralId: string;

  // Procedure
  cptCode: string;
  procedureName: string;
  department: string;
  facility: string;
  clinicalNecessity: string;
  baselineFee: number;

  // Discount
  discountEnabled: boolean;
  discountMode: 'percentage' | 'fixed';
  discountValue: number;
  calculatedDiscount: number;
  netProcedureCost: number;

  // Financing
  financingPackageId: string;
  financingPackageName: string;
  monthlyInstallment: string;
  termMonths: number;
  apr: string;
  totalPayable: string;

  // Terms & Remarks
  offerTitle: string;
  expirationDate: string;
  clinicalHoldDays: number;
  doctorNotes: string;
  complianceConfirmed: boolean;
  clinicianAttested: boolean;

  // Meta
  offerId: string;
  dispatchedAt?: string;
  attendingDoctor: string;
  doctorSpecialty: string;
  auditHash: string;
}

export interface AppointmentRecord {
  appointmentId: string;
  offerId: string;
  patientId: string;
  patientName: string;
  procedureName: string;
  cptCode: string;
  facility: string;
  facilityAddress: string;
  suite: string;
  scheduledDate: string;
  scheduledTime: string;
  arrivalWindow: string;
  attendingDoctor: string;
  attendingLicense: string;
  anesthesiaProtocol: string;
  anesthesiaStaff: string;
  underwrittenAmount: string;
  financingPlan: string;
  lockedTimestamp: string;
  auditHash: string;
  readinessPercentage: number;
}

/**
 * @deprecated Legacy mock financing package map.
 * Consumers: TreatmentOfferCreatePage (Milestone 3).
 * Will be removed in Milestone 3 once dynamic financing options from GET /api/v1/financing/options are hooked up.
 */
export const FINANCING_PACKAGES_MAP: Record<string, FinancingPackageOption> = {
  'careid-0': {
    id: 'careid-0',
    name: 'Care ID In-House 0% APR',
    partnerTag: 'CARE ID DIRECT',
    badge: '0% APR (Pre-Qualified)',
    termMonths: 12,
    termMonthsDisplay: '12 Months Fixed',
    apr: 0.0,
    aprDisplay: '0.0% APR Fixed Rate',
    calculateMonthly: (net: number) => Number((net / 12).toFixed(2)),
    calculateTotal: (net: number) => net,
    enrollmentFee: '$0 Enrollment Fee',
    penaltyFee: 'No Early Payoff Penalty',
    availableCredit: 'Up to $6,000.00',
  },
  'careid-zero': {
    id: 'careid-0',
    name: 'Care ID In-House 0% APR',
    partnerTag: 'CARE ID DIRECT',
    badge: '0% APR (Pre-Qualified)',
    termMonths: 12,
    termMonthsDisplay: '12 Months Fixed',
    apr: 0.0,
    aprDisplay: '0.0% APR Fixed Rate',
    calculateMonthly: (net: number) => Number((net / 12).toFixed(2)),
    calculateTotal: (net: number) => net,
    enrollmentFee: '$0 Enrollment Fee',
    penaltyFee: 'No Early Payoff Penalty',
    availableCredit: 'Up to $6,000.00',
  },
  'healthpay-bridge': {
    id: 'healthpay-bridge',
    name: 'HealthPay Bridge Credit Line',
    partnerTag: 'HEALTHPAY PARTNER',
    badge: 'Flexible 24-36 Mo',
    termMonths: 24,
    termMonthsDisplay: '24 Months Term',
    apr: 5.9,
    aprDisplay: '5.9% Fixed APR',
    calculateMonthly: (net: number) => Number(((net * 1.077828) / 24).toFixed(2)),
    calculateTotal: (net: number) => Number((net * 1.077828).toFixed(2)),
    enrollmentFee: '$25 Annual Servicing Fee (Waived Year 1)',
    penaltyFee: 'None',
    availableCredit: 'Up to $15,000.00',
  },
  'medpay-flex': {
    id: 'medpay-flex',
    name: 'MedPay Flex Extended Plan',
    partnerTag: 'MEDPAY NETWORK',
    badge: 'Lowest Monthly',
    termMonths: 36,
    termMonthsDisplay: '36 Months Term',
    apr: 9.9,
    aprDisplay: '9.9% APR Fixed Term Loan',
    calculateMonthly: (net: number) => Number(((net * 1.150045) / 36).toFixed(2)),
    calculateTotal: (net: number) => Number((net * 1.150045).toFixed(2)),
    enrollmentFee: '$0 Down Payment at clinical discharge',
    penaltyFee: 'None',
    availableCredit: 'Up to $10,000.00',
  },
  'prompt-cash': {
    id: 'prompt-cash',
    name: 'No Financing / Prompt Full Cash Payment',
    partnerTag: 'SELF-PAY DIRECT',
    badge: 'Full Settlement',
    termMonths: 1,
    termMonthsDisplay: 'Single Settlement Payment at Intake',
    apr: 0.0,
    aprDisplay: '0.0% APR',
    calculateMonthly: (net: number) => net,
    calculateTotal: (net: number) => net,
    enrollmentFee: '$0 Fee',
    penaltyFee: 'None',
    availableCredit: 'N/A',
  },
};

/**
 * @deprecated Legacy mock offer state fallback.
 * Consumers: TreatmentOfferCreatePage, ReviewPage, StatusPage, AcceptedPage, Trajectory Pages (M2-M4).
 * Will be removed in Milestone 4/5 once all consumers resolve live offer data from backend by offerId.
 */
export const DEFAULT_OFFER_STATE: TreatmentOfferState = {
  patientId: 'PT-ACTIVE',
  patientName: 'Patient Record',
  patientCid: '#CID-ACTIVE',
  patientAge: '45',
  patientGender: 'M',
  patientBlood: 'O Pos (+)',
  patientAllergy: 'Penicillin',
  insuranceStatus: 'Self-Pay / Non-Insured',
  referralId: '#REF-4491',

  cptCode: 'CPT #93458',
  procedureName: 'Left Heart Catheterization with Coronary Angiogram',
  department: 'Cardiology Department',
  facility: 'Heart Center Outpatient Unit',
  clinicalNecessity: 'Diagnostic assessment following exertional angina and abnormal treadmill ECG stress test. Linked Referral: #REF-4491.',
  baselineFee: 5200,

  discountEnabled: true,
  discountMode: 'percentage',
  discountValue: 15,
  calculatedDiscount: 780,
  netProcedureCost: 4420,

  financingPackageId: 'careid-0',
  financingPackageName: 'Care ID In-House 0% APR',
  monthlyInstallment: '$368.33',
  termMonths: 12,
  apr: '0.0%',
  totalPayable: '$4,420.00',

  offerTitle: 'Cardiac Catheterization Treatment Package',
  expirationDate: 'November 1, 2026',
  clinicalHoldDays: 14,
  doctorNotes: 'This offer reflects our standard diagnostic catheterization package with an authorized prompt settlement cash discount paired with our in-house 0% financing option. Reviewing and accepting this in your Care ID app secures your Cath Lab slot.',
  complianceConfirmed: true,
  clinicianAttested: true,

  offerId: 'TR-8921',
  dispatchedAt: 'Oct 18, 2026 • 10:42 AM EST',
  attendingDoctor: 'Attending Physician',
  doctorSpecialty: 'Cardiology Specialist',
  auditHash: 'SHA256-8921-TR-VERIFIED-7A890D',
};

/**
 * @deprecated Legacy mock appointment record fallback.
 * Consumers: AppointmentDetailsPage, PreOpReadinessPage (Milestone 2).
 * Will be removed in Milestone 2 once authentic backend appointment records are wired.
 */
export const DEFAULT_APPOINTMENT_RECORD: AppointmentRecord = {
  appointmentId: '#PROC-2026-93458',
  offerId: 'TR-8921',
  patientId: 'PT-ACTIVE',
  patientName: 'Patient Record',
  procedureName: 'Diagnostic Cardiac Catheterization & Coronary Angiogram',
  cptCode: 'CPT #93458',
  facility: 'Heart Center Outpatient Unit',
  facilityAddress: 'Cardiac Outpatient Pavilion',
  suite: 'Cath Lab Suite 3 (Interventional Wing, 4th Fl)',
  scheduledDate: 'Wednesday, Nov 4, 2026',
  scheduledTime: '09:30 AM – 11:00 AM EST',
  arrivalWindow: '07:30 AM EST (2 Hours Prior)',
  attendingDoctor: 'Attending Physician, MD',
  attendingLicense: 'State Lic #88392 • Interventional Cardiology',
  anesthesiaProtocol: 'MAC Tier 1 Standby (Mild conscious sedation / Local lidocaine 1%)',
  anesthesiaStaff: 'NP Elena Rostova / CRNA Standby',
  underwrittenAmount: '$4,420.00',
  financingPlan: 'Care ID In-House 0% APR (12-Mo)',
  lockedTimestamp: 'Oct 19, 2026 • 02:45 PM',
  auditHash: 'SHA256:4b91f638c502e8f118de00184bba74902b7c7a5128106c820a',
  readinessPercentage: 60,
};
```

---

## 5. Verification Method

To independently verify this blueprint:
1. **DTO Contract Conformance**: Inspect `Postman collection/CareID-Staging.postman_collection.json` under folders `05. Doctor Portal` and `27. Healthcare Financing & Financial Assistance` to confirm all field names, types, and HTTP methods match the interfaces defined in Section 4.2.
2. **Type Safety & Build Cleanliness**:
   Execute:
   ```powershell
   npm run type-check
   ```
   Confirm that when `src/pages/treatment-offers/types.ts` is updated with the blueprint above, `tsc -b --noEmit` exits with status `0` and generates 0 errors.
3. **Downstream Consumer Stability**:
   Verify that all 12 consumer files listed in Section 1.2 continue to import their expected symbols without breakages during Milestone 1.
4. **Invalidation Conditions**:
   - If backend schemas in `CareID-Staging.postman_collection.json` change field names (e.g. `patientProfileId` vs `patientId`).
   - If UI pages in `src/pages/treatment-offers/` or `src/pages/financing/` are modified to use different state property names before Milestones 2–4.
