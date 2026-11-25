# Project: CareID Doctor Web Portal — Consultations & Treatment Lifecycle Integration

## Architecture
- **Application Stack**: React 18, Vite, TypeScript, Tailwind CSS, React Router DOM, Lucide Icons, Axios.
- **Backend API Base**: `https://360api.vnvision.in/api/v1`
- **Route Topology**:
  - `/treatment-offers`: `TreatmentOffersDashboardPage` (Module A: Dashboard statistics, 18-stage trajectory, consultations & treatment offers listing).
  - `/patients/:id/financing`: `InsuranceFinancingHubPage` (Module B: Step 1 — Financing options & partner packages).
  - `/treatment-offers/new`, `/treatment-offers/new/step-1` through `step-5`: `TreatmentOfferCreatePage` (Module B: Step 2 — Configure treatment offer, procedures, discount, necessity, remarks, attestation).
  - `/treatment-offers/:id/review`: `TreatmentOfferReviewPage` (Module B: Step 3 — Clinical review, attestation certification, dispatch to patient).
  - `/treatment-offers/:id/status`, `/treatment-offers/:id/sent`: `TreatmentOfferStatusPage` (Module B: Step 4 — Dispatched status, lifecycle tracking, live status query).
  - `/treatment-offers/:id/accepted`: `TreatmentOfferAcceptedPage` (Module B: Step 4 — Ratified acceptance, financing confirmation).
- **Service Layer**:
  - `src/services/apiClient.ts`: Core HTTP transport with Bearer JWT injection, base URL resolution, and unified error handling.
  - `src/services/treatmentOfferService.ts` (NEW): Dedicated service implementing the 7 official Doctor Portal endpoints (`POST /api/v1/doctors/treatment-offers`, `GET ...`, `GET .../:id`, `PUT .../:id`, `POST .../dispatch`, `GET .../status`, `POST .../cancel`) and patient acceptance simulation for test environments.
  - `src/services/consultationService.ts`: Consultations and appointment service. Replaces browser `localStorage` mock stores (`careid_treatment_offers_store`) with live unified calls to `treatmentOfferService.listTreatmentOffers()` and `/api/v1/appointments/doctor/me`. Eliminates static CPT `#93458` and mock facility injections.
  - `src/services/financingService.ts` (or methods on `consultationService.ts`): Live healthcare financing integration (`GET /api/v1/financing/options`, `GET /api/v1/financing/offers`, `POST /api/v1/financing/apply`).
  - `src/services/dashboardService.ts`: Doctor profile (`GET /api/v1/doctors/me`) and appointments.
- **Data Models**:
  - `src/pages/treatment-offers/types.ts`: Clean TypeScript interfaces aligned to Postman DTOs (`TreatmentOfferDTO`, `CreateTreatmentOfferPayload`, `FinancingOptionDTO`, `ConsultationItem`). Complete removal of static fallback objects (`DEFAULT_OFFER_STATE`, `DEFAULT_APPOINTMENT_RECORD`).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Treatment Offer API Service | Full REST client for Doctor Treatment Offers (`create`, `list`, `getById`, `update`, `dispatch`, `getStatus`, `cancel`, `accept`) against `360api.vnvision.in` | M1 | Postman 05 & 06 |
| 2 | Live Healthcare Financing Integration | Integration with `GET /api/v1/financing/options` and `offers` using real partner packages (CareCredit, MediLend, HealthVault) | M1 | Postman 27 |
| 3 | Clean DTOs & Service Mock Removal | Replace `localStorage` mock repository in `consultationService.ts` with live API methods; remove static `FINANCING_PACKAGES_MAP` | M1 | R4, R5 |
| 4 | Authentic Dashboard Statistics | Dynamically aggregate Total Consultations, Active / Scheduled, Accepted & Financed, Procedures Completed from live backend data with zero static numbers | M2 | R2 |
| 5 | Dynamic 18-Stage Trajectory Navigation | Connect 18 stages to live offer/appointment instances; eliminate hardcoded `TR-8921`; document missing stages (9, 11, 14, 16) as NOT IMPLEMENTED | M2 | R1, R2 |
| 6 | Live Consultation Listing & Filters | Render authentic appointments & treatment offers; implement All/Active/Accepted/Completed filters, patient search, and manual refresh | M2 | R2 |
| 7 | Step 1 Financing Options Live Data | Load authentic patient demographics from live backend; bind real partner packages from `GET /api/v1/financing/options`; pass real data to Step 2 | M3 | R3 |
| 8 | Step 2 Configure Offer Persistence & Cleanup | Configure procedures, baseline pricing, discount, clinical necessity, remarks conforming to Postman DTO; remove "Robert" and ID `8472-9901` | M3 | R3, R4 |
| 9 | Step 3 Review & Real Dispatch | Submit draft to `POST /api/v1/doctors/treatment-offers`; dispatch via `POST .../:id/dispatch`; eliminate 600ms fake timer and simulated error button | M4 | R3, R4 |
| 10 | Step 4 Authentic Patient Acceptance Status | Fetch real status via `GET /api/v1/doctors/treatment-offers/:id/status`; eliminate hardcoded "Oct 19, 2026" dates, fake "RS" initials, and dummy tokens | M4 | R3, R4 |
| 11 | Workflow State Persistence Across Refresh | Support offer ID via query param / URL path; fetch offer from backend when `location.state` is lost on refresh; prevent duplicate submissions | M4 | R3, R5 |
| 12 | Pixel-for-Pixel UI Preservation | Preserve all approved layouts, colors, typography, spacing, dimensions, icons, and button labels across `/treatment-offers` and stepper | M2-M4 | R6 |
| 13 | E2E Testing Suite (Tiers 1-4) & Quality Gates | Build comprehensive opaque-box test suites; pass 100% of E2E tests, zero TypeScript errors, zero ESLint errors, successful production build | M5 | Acceptance Criteria |
| 14 | Tier 5 Adversarial Coverage Hardening | White-box stress testing, gap analysis, and bug hardening on updated codebase | M5 | Project Pattern Phase 2 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Treatment Offer & Financing Services (`src/services/`) | Create `treatmentOfferService.ts`, enhance `consultationService.ts` and `types.ts` to call live backend endpoints; remove `careid_treatment_offers_store` | none | DONE |
| 2 | Module A: Consultations & 18-Stage Trajectory (`/treatment-offers`) | Integrate live backend data into dashboard stats, 18-stage pipeline navigation, consultation listing, filtering, search, and action triggers | M1 | IN_PROGRESS |
| 3 | Module B: Steps 1 & 2 Financing & Offer Configuration | Implement live patient context, real financing options in Step 1, procedure/pricing/terms configuration in Step 2; remove hardcoded "Robert" and static CPTs | M1 | PLANNED |
| 4 | Module B: Steps 3 & 4 Review, Dispatch, Status & Acceptance | Implement genuine draft creation and dispatch in Step 3; live status resolution in Step 4; eliminate fake timers, simulated errors, and fake tokens | M3 | PLANNED |
| 5 | E2E Testing, Quality Gates & Adversarial Hardening | Run and pass 100% of E2E tests in `TEST_READY.md`; verify TypeScript (`npm run type-check`), ESLint (`npm run lint`), Vite build (`npm run build`); run Tier 5 hardening | M2, M4, TEST_READY.md | PLANNED |

## Interface Contracts

### 1. `treatmentOfferService.ts`
```typescript
export interface CreateTreatmentOfferPayload {
  patientProfileId: string;
  facilityId: string;
  clinicalIndication: string;
  procedures: Array<{
    procedureCode: string;
    procedureName: string;
    unitCost: number;
    category: 'SURGICAL' | 'DIAGNOSTIC' | 'THERAPEUTIC';
    quantity: number;
    isOptional: boolean;
    clinicalJustification: string;
  }>;
  validUntil: string; // ISO 8601
  encounterId?: string;
  discountAmount: number;
  financingEligible: boolean;
  recommendedTenureMonths: number;
  clinicalNotes: string;
  termsAndConditions: string;
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
  status: 'DRAFT' | 'DISPATCHED' | 'PATIENT_REVIEWING' | 'RATIFIED_ACCEPTED' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED' | 'EXPIRED';
  validUntil: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  dispatchedAt?: string;
  patientViewedAt?: string;
  patientRespondedAt?: string;
  patientResponseNotes?: string;
  cancellationReason?: string;
  clinicalNotes: string;
  termsAndConditions: string;
  procedures: Array<{
    id?: string;
    procedureCode: string;
    procedureName: string;
    category: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
    isOptional: boolean;
    sequenceOrder?: number;
    clinicalJustification: string;
  }>;
}

export interface TreatmentOfferStatusResponse {
  id: string;
  offerNumber: string;
  status: string;
  isExpired: boolean;
  validUntil: string;
  version: number;
  dispatchedAt?: string;
  patientViewedAt?: string;
  patientRespondedAt?: string;
  patientResponseNotes?: string;
  cancellationReason?: string;
}
```

### 2. `consultationService.ts` Updates
```typescript
// Unified consultation listing merging live appointments and live treatment offers
export interface ConsultationItem {
  id: string;
  appointmentId?: string;
  offerId?: string;
  patientProfileId: string;
  patientName: string;
  patientMrn: string;
  patientGender?: string;
  facilityName: string;
  doctorName: string;
  appointmentDate: string;
  appointmentTime: string;
  status: 'SCHEDULED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  offerStatus?: string;
  cptCode?: string;
  procedureName?: string;
  title: string;
  chiefComplaint?: string;
  totalCost?: number;
  netPayable?: number;
}
```

## Code Layout
- `src/services/apiClient.ts` — Core HTTP transport and auth headers
- `src/services/treatmentOfferService.ts` — Treatment offer creation, dispatch, listing, status APIs
- `src/services/consultationService.ts` — Unified appointment and consultation listing
- `src/pages/treatment-offers/types.ts` — Type definitions for treatment offers & consultations
- `src/pages/treatment-offers/TreatmentOffersDashboardPage.tsx` — Module A Dashboard
- `src/pages/financing/InsuranceFinancingHubPage.tsx` — Module B Step 1 Financing Hub
- `src/pages/treatment-offers/TreatmentOfferCreatePage.tsx` — Module B Step 2 Offer Configuration
- `src/pages/treatment-offers/TreatmentOfferReviewPage.tsx` — Module B Step 3 Review & Dispatch
- `src/pages/treatment-offers/TreatmentOfferStatusPage.tsx` — Module B Step 4 Dispatched Status
- `src/pages/treatment-offers/TreatmentOfferAcceptedPage.tsx` — Module B Step 4 Accepted/Ratified Offer
- `tests/e2e/` — Opaque-box E2E test suites
