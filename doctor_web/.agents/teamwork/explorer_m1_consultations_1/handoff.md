# Implementation Blueprint & Architecture Report: `src/services/consultationService.ts` Refactoring

**Milestone**: Milestone 1 — Component 2  
**Target File**: `src/services/consultationService.ts`  
**Investigator**: `explorer_m1_consultations_1` (Teamwork Explorer)  
**Timestamp**: 2026-11-09T17:31:00Z  
**Workspace**: `d:\New folder\New folder\doctor web\doctor-web-frontend-main`  
**State Folder**: `d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\explorer_m1_consultations_1`

---

## 1. Observation

### 1.1 LocalStorage Mock Store Usage & Inventory
Direct inspection of `src/services/consultationService.ts` reveals the following mock storage keys and calls:
- **Lines 118–121**:
  ```typescript
  const STORAGE_KEYS = {
    TREATMENT_OFFERS: 'careid_treatment_offers_store',
    ACTIVE_ENCOUNTERS: 'careid_active_encounters_store',
  };
  ```
- **Lines 204–236**:
  ```typescript
  // 3. Merge locally persisted treatment offers
  const savedOffers = consultationService.getTreatmentOffers();
  for (const off of savedOffers) {
    const existing = consultations.find((c) => c.patientProfileId === off.patientId || c.offerId === off.offerId);
    if (existing) {
      existing.offerId = off.offerId;
      existing.procedureName = off.procedureName;
      existing.cptCode = off.cptCode;
    } else {
      consultations.unshift({
        id: off.offerId,
        offerId: off.offerId,
        patientProfileId: off.patientId,
        patientName: off.patientName,
        patientMrn: off.patientCid,
        patientGender: off.patientGender,
        patientPhone: undefined,
        title: off.offerTitle || 'Cardiology Diagnostic Consultation',
        chiefComplaint: off.clinicalNecessity,
        treatmentPlan: off.doctorNotes,
        status: 'IN_PROGRESS',
        appointmentDate: new Date().toISOString().split('T')[0],
        appointmentTime: '10:00 AM',
        facilityName: off.facility,
        doctorName: off.attendingDoctor,
        doctorSpecialty: off.doctorSpecialty,
        cptCode: off.cptCode,
        procedureName: off.procedureName,
        offerStatus: 'ACCEPTED',
        createdAt: off.dispatchedAt || new Date().toISOString(),
      });
    }
  }
  ```
- **Lines 362–387**:
  ```typescript
  getTreatmentOffers(): TreatmentOfferState[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.TREATMENT_OFFERS);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  getTreatmentOfferById(offerId: string): TreatmentOfferState | null {
    const offers = consultationService.getTreatmentOffers();
    return offers.find((o) => o.offerId === offerId) || null;
  },

  saveTreatmentOffer(offer: TreatmentOfferState): void {
    try {
      const existing = consultationService.getTreatmentOffers();
      const filtered = existing.filter((o) => o.offerId !== offer.offerId);
      filtered.unshift(offer);
      localStorage.setItem(STORAGE_KEYS.TREATMENT_OFFERS, JSON.stringify(filtered));
    } catch {
      // Ignore storage errors
    }
  },
  ```
- **Global Codebase Search**:
  A repository-wide regex search confirms that `careid_treatment_offers_store` and `careid_active_encounters_store` are referenced **exclusively** within `src/services/consultationService.ts`. No other file in `src/` references these keys.

### 1.2 Static Procedural & Facility Attributes Injected into Live Appointments
In `src/services/consultationService.ts`, live appointments fetched from `/api/v1/appointments/doctor/me` are mutated with hardcoded defaults at lines 148–174:
- Line 149: `const facilityName = String(fac.name || 'Metro General Hospital');` — static fallback facility.
- Line 152: `const apptTime = String(appt.startTime || '09:30 AM');` — static fallback time.
- Line 163: `title: String(appt.reason || 'Cardiology Diagnostic Consultation')` — static fallback reason.
- Line 164: `chiefComplaint: String(appt.notes || 'Cardiovascular checkup and procedural evaluation')` — static fallback notes.
- Line 169: `doctorName: 'Attending Physician'` — static fallback doctor string.
- Line 170: `cptCode: 'CPT #93458'` — **hardcoded procedural CPT code**.
- Line 171: `procedureName: 'Left Heart Catheterization with Coronary Angiogram'` — **hardcoded procedural name**.
- Line 172: `offerStatus: status === 'COMPLETED' ? 'COMPLETED' : 'DISPATCHED'` — **simulated fake offer lifecycle status**.

### 1.3 Consumer Usages across the Frontend
1. `src/pages/treatment-offers/TreatmentOffersDashboardPage.tsx`:
   - Line 19: `import { consultationService, ConsultationItem } from '@/services/consultationService';`
   - Line 36: `const data = await consultationService.listConsultations(); setConsultations(data);`
   - Lines 77–84: Derives statistics (`total`, `active`, `accepted`, `completed`) via `useMemo` from `consultations`.
2. `src/pages/treatment-offers/TreatmentOfferCreatePage.tsx`:
   - Line 26: `import { consultationService } from '@/services/consultationService';`
   - Line 177: `consultationService.saveTreatmentOffer(payload);` (called on navigating to review).
   - Line 219: `consultationService.saveTreatmentOffer(payload);` (called on manual save button).
3. `src/pages/treatment-offers/TreatmentOfferReviewPage.tsx`:
   - Line 21: `import { consultationService } from '@/services/consultationService';`
   - Line 52: `consultationService.saveTreatmentOffer(offer);` (called on review submit).

### 1.4 Live Backend Verified Data Contracts (`https://360api.vnvision.in`)
1. **`GET /api/v1/appointments/doctor/me`**:
   - Status: HTTP 200 OK.
   - Returns array of live appointment records.
   - Each item includes genuine fields: `id`, `appointmentDate`, `startTime`, `status`, `reason`, `notes`, `patient` (`id`, `firstName`, `lastName`, `mrn`, `gender`, `phone`), `facility` (`id`, `name`), and `doctor` (`id`, `fullName`, `specialty`).
2. **`GET /api/v1/doctors/treatment-offers`**:
   - Status: HTTP 200 OK.
   - Envelope: `{ success: true, statusCode: 200, data: { data: TreatmentOfferDTO[], total: number, page: number, limit: number } }`.
   - Treatment Offer fields: `id`, `offerNumber`, `patientProfileId`, `facilityId`, `clinicalIndication`, `grossEstimate`, `discountAmount`, `netPayable`, `status` (`DRAFT`, `DISPATCHED`, `PATIENT_REVIEWING`, `RATIFIED_ACCEPTED`, `ACCEPTED`, `DECLINED`, `CANCELLED`, `EXPIRED`), `procedures` array with `procedureCode`, `procedureName`, `unitCost`, `clinicalNotes`, `termsAndConditions`.
   - **Current Gap**: Currently completely omitted by `consultationService.ts`.
3. **`GET /api/v1/financing/options`**:
   - Status: HTTP 200 OK.
   - Returns 3 genuine partner financing options:
     - `opt-zerocost-care` ("CareCredit Health - Zero-Cost Medical EMI", 0% APR, 3/6/9/12 mos, min 5,000, max 200,000)
     - `opt-surgery-flex` ("MediLend Financial - Surgery & Inpatient Care Assist", 8.99% APR, 12/18/24/36 mos, min 25,000, max 1,000,000)
     - `opt-wellness-quick` ("HealthVault Direct - Diagnostics & Wellness Micro-Credit", 0% APR, 1/2/3/6 mos, min 1,000, max 50,000)

---

## 2. Logic Chain

1. **Premise 1: Elimination of Mock LocalStorage Stores**:
   - `careid_treatment_offers_store` and `careid_active_encounters_store` simulate a fake database in the browser.
   - Because genuine treatment offers exist on the backend under `GET /api/v1/doctors/treatment-offers` and are managed via `treatmentOfferService.ts`, all `localStorage` reads/writes in `consultationService` must be eradicated.
   - To prevent breaking `TreatmentOfferCreatePage.tsx` and `TreatmentOfferReviewPage.tsx` before their respective refactorings in Milestones 3 and 4, `saveTreatmentOffer` must be marked `@deprecated` and transitioned to an in-memory session cache (`Map<string, TreatmentOfferState>`) with **zero** `localStorage` calls.

2. **Premise 2: Unification of Appointments and Treatment Offers**:
   - Doctor consultations comprise both scheduled clinical visits (`GET /api/v1/appointments/doctor/me`) and authored treatment proposals (`GET /api/v1/doctors/treatment-offers` via `treatmentOfferService.listTreatmentOffers()`).
   - By querying both live endpoints and merging them by `patientProfileId` / `encounterId` / `offerId`:
     - Appointments with existing proposals receive genuine `offerId`, `offerStatus`, `cptCode`, `procedureName`, `totalCost`, and `netPayable`.
     - Authored treatment proposals without prior appointments appear in the consultation ledger as active clinical tracks.
     - Appointments without offers remain visible with genuine appointment details and allow "Create Offer" action.

3. **Premise 3: Eradication of Hardcoded Procedural Attributes**:
   - `cptCode: 'CPT #93458'` and `procedureName: 'Left Heart Catheterization with Coronary Angiogram'` were hardcoded fallbacks applied indiscriminately to all patients.
   - For appointments: `cptCode` and `procedureName` must be populated only if provided on the appointment record (e.g. `appt.procedureCode` or `appt.procedureName`) or enriched from a matching treatment offer. If unspecified, they remain `undefined`. In `TreatmentOffersDashboardPage.tsx`, `{item.cptCode && ...}` is conditionally rendered, ensuring clean UI rendering without fake badges.
   - For treatment offers: `cptCode` and `procedureName` are extracted directly from `offer.procedures[0].procedureCode` and `offer.procedures.map(p => p.procedureName).join(', ')`.
   - Facility names must use `fac.name || appt.facilityName || ''` without falling back to `'Metro General Hospital'`.

4. **Premise 4: Dynamic Metric Aggregation Helper**:
   - Currently, `TreatmentOffersDashboardPage.tsx` recalculates counts in an inline `useMemo`.
   - Placing standard calculation logic into `consultationService.calculateMetrics(items: ConsultationItem[])` and `consultationService.getConsultationMetrics()` guarantees consistency across the portal:
     - `total`: `items.length`
     - `active`: count where `status === 'SCHEDULED' || status === 'CONFIRMED' || status === 'IN_PROGRESS'`
     - `accepted`: count where `offerStatus === 'ACCEPTED' || offerStatus === 'RATIFIED_ACCEPTED' || offerStatus === 'PROCEDURE_READY'`
     - `completed`: count where `status === 'COMPLETED' || offerStatus === 'COMPLETED'`

5. **Premise 5: Live Healthcare Financing Integration**:
   - `getFinancingOptions()` and `getFinancingOffers()` must query `GET /api/v1/financing/options` and `GET /api/v1/financing/offers`.
   - The method must defensively handle both unwrapped array data (`res.data: FinancingOption[]`) and wrapped data (`res.data: { data: FinancingOption[] }`).

---

## 3. Caveats

1. **Milestone Sequencing & Module Independence**:
   - `consultationService.ts` will import `treatmentOfferService` from `./treatmentOfferService`. If `treatmentOfferService.ts` has not yet completed compilation when running isolated type checks, an internal resilient fallback to `apiClient.get('/api/v1/doctors/treatment-offers')` ensures that consultations can function reliably even before `treatmentOfferService` is initialized.
2. **Backward Compatibility for Downstream Pages**:
   - `TreatmentOfferCreatePage.tsx` and `TreatmentOfferReviewPage.tsx` still call `consultationService.saveTreatmentOffer(payload)` until Milestones 3 and 4 refactor them. Retaining `saveTreatmentOffer`, `getTreatmentOffers`, and `getTreatmentOfferById` as deprecated in-memory functions (instead of deleting the symbols outright) allows `npm run type-check` to succeed with 0 errors across the entire codebase during Milestone 1.
3. **Empty Initial Proposals on Staging**:
   - On a freshly seeded or reset doctor account, `GET /api/v1/doctors/treatment-offers` returns `{ data: [], total: 0 }`. The normalization logic handles empty arrays gracefully, populating the consultation list entirely from appointments without error.
4. **Appointment Status Canonical Mapping**:
   - Staging appointment statuses include `CONFIRMED`, `SCHEDULED`, `ARRIVED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `NO_SHOW`. These are mapped systematically to `ConsultationItem['status']` (`SCHEDULED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`).

---

## 4. Conclusion & Complete Implementation Blueprint

Below is the complete, drop-in replacement blueprint for `src/services/consultationService.ts`.

### 4.1 Proposed Implementation: `src/services/consultationService.ts`

```typescript
/**
 * CareID Doctor Web - Consultation & Treatment Offer Backend API Service
 * 
 * Source of Truth: Postman Collection (CareID-Staging.postman_collection.json)
 * - 05. Doctor Portal:
 *   - GET /api/v1/doctors/treatment-offers (List authored treatment proposals)
 *   - POST /api/v1/doctors/patients/:patientProfileId/encounters (Document clinical encounter)
 *   - POST /api/v1/doctors/patients/:patientProfileId/medical-records (Create medical record)
 *   - PUT /api/v1/doctors/patients/:patientProfileId/medical-records/:recordId (Update clinical record)
 *   - GET /api/v1/doctors/patients/:patientProfileId/medical-records (Get patient records with pagination)
 *   - GET /api/v1/doctors/patients/:patientProfileId/medical-records/timeline (Get timeline)
 * - 10. Appointments:
 *   - GET /api/v1/appointments/doctor/me (Appointments scheduled for authenticated doctor)
 *   - GET /api/v1/appointments/:id (Get appointment details)
 *   - PUT /api/v1/appointments/:id/status (Update appointment status)
 * - 27. Healthcare Financing & Financial Assistance:
 *   - GET /api/v1/financing/options (List available healthcare financing options and partners)
 *   - GET /api/v1/financing/offers (List pre-approved healthcare financing offers)
 *   - POST /api/v1/financing/apply (Submit application for healthcare financing / EMI assistance)
 *   - GET /api/v1/financing/applications (List financing applications)
 */

import { apiClient } from './apiClient';
import { TreatmentOfferState } from '@/pages/treatment-offers/types';
import { treatmentOfferService, TreatmentOfferDTO } from './treatmentOfferService';

export interface ClinicalEncounterPayload {
  title: string;
  chiefComplaint: string;
  clinicalNotes: string;
  treatmentPlan: string;
  followUpInstructions?: string;
  status: 'DRAFT' | 'PRELIMINARY' | 'FINAL' | string;
  encounter?: {
    providerName?: string;
    facilityName?: string;
    encounterType?: string;
    encounterDate?: string;
  };
  diagnoses?: Array<{
    description: string;
    code: string;
    type: 'PRIMARY' | 'SECONDARY' | string;
    status: 'ACTIVE' | 'RESOLVED' | string;
  }>;
  vitalSigns?: {
    heightCm?: number;
    weightKg?: number;
    systolicBp?: number;
    diastolicBp?: number;
    pulseBpm?: number;
    respirationRate?: number;
    temperatureC?: number;
    bloodSugarMgDl?: number;
    oxygenSaturation?: number;
  };
  procedures?: Array<{
    name: string;
    code: string;
    performedAt: string;
    notes?: string;
  }>;
}

export interface FinancingOption {
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
  title: string;
  chiefComplaint?: string;
  clinicalNotes?: string;
  treatmentPlan?: string;
  status: 'SCHEDULED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  offerStatus?: 'DRAFT' | 'DISPATCHED' | 'PATIENT_REVIEWING' | 'RATIFIED_ACCEPTED' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED' | 'EXPIRED' | 'SCHEDULED' | 'PROCEDURE_READY' | 'COMPLETED' | string;
  appointmentDate: string;
  appointmentTime?: string;
  facilityName: string;
  doctorName: string;
  doctorSpecialty?: string;
  cptCode?: string;
  procedureName?: string;
  totalCost?: number;
  netPayable?: number;
  createdAt?: string;
}

export interface ConsultationMetrics {
  total: number;
  active: number;
  accepted: number;
  completed: number;
}

/**
 * In-memory temporary cache to maintain backwards compatibility for transitional
 * methods during Milestone 1 without persisting any sensitive clinical data to localStorage.
 */
const _inMemoryOfferStore: Map<string, TreatmentOfferState> = new Map();

export const consultationService = {
  /**
   * List all consultations and appointments for current authenticated doctor.
   * Merges live appointments (`GET /api/v1/appointments/doctor/me`) with live
   * authored treatment proposals (`GET /api/v1/doctors/treatment-offers`).
   */
  async listConsultations(): Promise<ConsultationItem[]> {
    const consultations: ConsultationItem[] = [];

    // 1. Fetch live appointments from backend
    let rawAppts: Record<string, unknown>[] = [];
    try {
      const apptRes = await apiClient.get<unknown>('/api/v1/appointments/doctor/me');
      if (Array.isArray(apptRes.data)) {
        rawAppts = apptRes.data as Record<string, unknown>[];
      } else if (apptRes.data && typeof apptRes.data === 'object' && Array.isArray((apptRes.data as { data: unknown[] }).data)) {
        rawAppts = (apptRes.data as { data: Record<string, unknown>[] }).data;
      }
    } catch {
      // Continue even if appointments call fails
    }

    // 2. Fetch live treatment offers authored by current doctor
    let rawOffers: TreatmentOfferDTO[] = [];
    try {
      const offersRes = await treatmentOfferService.listTreatmentOffers();
      if (Array.isArray(offersRes)) {
        rawOffers = offersRes;
      } else if (offersRes && typeof offersRes === 'object' && Array.isArray((offersRes as { data?: TreatmentOfferDTO[] }).data)) {
        rawOffers = (offersRes as { data: TreatmentOfferDTO[] }).data;
      }
    } catch {
      // Inline fallback directly via apiClient if treatmentOfferService encounters issues
      try {
        const toRes = await apiClient.get<unknown>('/api/v1/doctors/treatment-offers');
        if (Array.isArray(toRes.data)) {
          rawOffers = toRes.data as TreatmentOfferDTO[];
        } else if (toRes.data && typeof toRes.data === 'object' && Array.isArray((toRes.data as { data?: TreatmentOfferDTO[] }).data)) {
          rawOffers = (toRes.data as { data: TreatmentOfferDTO[] }).data;
        }
      } catch {
        // Continue with empty offers if call fails
      }
    }

    // 3. Normalize live appointments into ConsultationItem[]
    for (const appt of rawAppts) {
      const p = (appt.patient as Record<string, unknown>) || {};
      const pId = String(p.id || appt.patientProfileId || appt.patientId || '');
      if (!pId) continue;

      const firstName = String(p.firstName || '');
      const lastName = String(p.lastName || '');
      const fullName = (p.fullName as string) || `${firstName} ${lastName}`.trim() || 'Patient Record';
      const mrn = String(p.mrn || p.patientNumber || appt.patientMrn || '');
      const gender = (p.gender as string) || (appt.gender as string) || undefined;
      const phone = (p.phone as string) || (appt.phone as string) || undefined;

      const fac = (appt.facility as Record<string, unknown>) || {};
      const facilityName = String(fac.name || appt.facilityName || '');

      const doc = (appt.doctor as Record<string, unknown>) || {};
      const doctorName = String(doc.fullName || appt.doctorName || '');
      const doctorSpecialty = (doc.specialty as string) || (doc.primarySpecialization as string) || (appt.doctorSpecialty as string) || undefined;

      const apptDate = String(appt.appointmentDate || '');
      const apptTime = String(appt.startTime || appt.appointmentTime || '');
      const rawStatus = String(appt.status || 'CONFIRMED').toUpperCase();

      let status: ConsultationItem['status'] = 'CONFIRMED';
      if (rawStatus === 'SCHEDULED' || rawStatus === 'CONFIRMED') {
        status = 'SCHEDULED';
      } else if (rawStatus === 'IN_PROGRESS' || rawStatus === 'ARRIVED') {
        status = 'IN_PROGRESS';
      } else if (rawStatus === 'COMPLETED') {
        status = 'COMPLETED';
      } else if (rawStatus === 'CANCELLED' || rawStatus === 'NO_SHOW') {
        status = 'CANCELLED';
      }

      consultations.push({
        id: String(appt.id || `appt-${pId}`),
        appointmentId: String(appt.id || ''),
        patientProfileId: pId,
        patientName: fullName,
        patientMrn: mrn,
        patientGender: gender,
        patientPhone: phone,
        title: String(appt.reason || appt.title || 'Clinical Consultation'),
        chiefComplaint: appt.notes ? String(appt.notes) : undefined,
        status,
        appointmentDate: apptDate,
        appointmentTime: apptTime,
        facilityName,
        doctorName,
        doctorSpecialty,
        cptCode: (appt.cptCode as string) || (appt.procedureCode as string) || undefined,
        procedureName: (appt.procedureName as string) || (appt.reason as string) || undefined,
        offerStatus: undefined, // Will be bound if matching treatment offer exists
        createdAt: String(appt.createdAt || ''),
      });
    }

    // 4. Merge live treatment offers into consultation items
    for (const offer of rawOffers) {
      const primaryProc = Array.isArray(offer.procedures) && offer.procedures.length > 0 ? offer.procedures[0] : null;
      const procCode = primaryProc?.procedureCode || undefined;
      const procName = Array.isArray(offer.procedures) && offer.procedures.length > 0
        ? offer.procedures.map((pr) => pr.procedureName).filter(Boolean).join(', ')
        : primaryProc?.procedureName || undefined;

      let normalizedOfferStatus: ConsultationItem['offerStatus'];
      if (offer.status === 'RATIFIED_ACCEPTED' || offer.status === 'ACCEPTED') {
        normalizedOfferStatus = 'ACCEPTED';
      } else if (offer.status === 'DRAFT') {
        normalizedOfferStatus = 'DRAFT';
      } else if (offer.status === 'DISPATCHED' || offer.status === 'PATIENT_REVIEWING') {
        normalizedOfferStatus = 'DISPATCHED';
      } else if (offer.status === 'COMPLETED') {
        normalizedOfferStatus = 'COMPLETED';
      } else {
        normalizedOfferStatus = offer.status;
      }

      const existing = consultations.find(
        (c) =>
          (offer.encounterId && c.appointmentId === offer.encounterId) ||
          c.patientProfileId === offer.patientProfileId ||
          c.offerId === offer.id
      );

      if (existing) {
        existing.offerId = offer.id;
        existing.offerStatus = normalizedOfferStatus;
        if (!existing.cptCode && procCode) existing.cptCode = procCode;
        if (!existing.procedureName && procName) existing.procedureName = procName;
        if (!existing.facilityName && offer.facilityName) existing.facilityName = offer.facilityName;
        if (!existing.chiefComplaint && offer.clinicalIndication) existing.chiefComplaint = offer.clinicalIndication;
        if (offer.grossEstimate !== undefined) existing.totalCost = offer.grossEstimate;
        if (offer.netPayable !== undefined) existing.netPayable = offer.netPayable;
      } else {
        const patientName = offer.patientName || 'Patient Record';
        const patientMrn = (offer as { patientMrn?: string; patient?: { mrn?: string } }).patientMrn ||
          (offer as { patient?: { mrn?: string } }).patient?.mrn || '';
        const patientGender = (offer as { patientGender?: string; patient?: { gender?: string } }).patientGender ||
          (offer as { patient?: { gender?: string } }).patient?.gender || undefined;
        const dateStr = offer.createdAt ? String(offer.createdAt).split('T')[0] : '';
        const timeStr = offer.createdAt
          ? new Date(offer.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : '';

        let consultStatus: ConsultationItem['status'] = 'SCHEDULED';
        if (offer.status === 'RATIFIED_ACCEPTED' || offer.status === 'ACCEPTED') {
          consultStatus = 'IN_PROGRESS';
        } else if (offer.status === 'COMPLETED') {
          consultStatus = 'COMPLETED';
        } else if (offer.status === 'CANCELLED' || offer.status === 'DECLINED') {
          consultStatus = 'CANCELLED';
        }

        consultations.unshift({
          id: offer.id,
          offerId: offer.id,
          patientProfileId: offer.patientProfileId,
          patientName,
          patientMrn,
          patientGender,
          title: offer.offerNumber ? `Treatment Offer ${offer.offerNumber}` : (offer.clinicalIndication || 'Treatment Offer'),
          chiefComplaint: offer.clinicalIndication,
          clinicalNotes: offer.clinicalNotes,
          treatmentPlan: offer.termsAndConditions,
          status: consultStatus,
          appointmentDate: dateStr,
          appointmentTime: timeStr,
          facilityName: offer.facilityName || '',
          doctorName: offer.doctorName || '',
          doctorSpecialty: (offer as { doctorSpecialty?: string }).doctorSpecialty,
          cptCode: procCode,
          procedureName: procName,
          offerStatus: normalizedOfferStatus,
          totalCost: offer.grossEstimate,
          netPayable: offer.netPayable,
          createdAt: String(offer.createdAt || new Date().toISOString()),
        });
      }
    }

    // 5. Fetch medical records concurrently for assigned patients
    if (consultations.length > 0) {
      const uniquePatientIds = Array.from(new Set(consultations.map((c) => c.patientProfileId)));
      await Promise.allSettled(
        uniquePatientIds.map(async (pId) => {
          try {
            const recRes = await apiClient.get<Array<Record<string, unknown>>>(
              `/api/v1/doctors/patients/${encodeURIComponent(pId)}/medical-records`
            );
            const records = Array.isArray(recRes.data)
              ? recRes.data
              : recRes.data && typeof recRes.data === 'object' && Array.isArray((recRes.data as { data?: unknown[] }).data)
              ? (recRes.data as { data: Record<string, unknown>[] }).data
              : [];

            for (const rec of records) {
              const match = consultations.find((c) => c.patientProfileId === pId);
              if (match) {
                if (rec.clinicalNotes && !match.clinicalNotes) match.clinicalNotes = String(rec.clinicalNotes);
                if (rec.treatmentPlan && !match.treatmentPlan) match.treatmentPlan = String(rec.treatmentPlan);
                if (rec.title && match.title === 'Clinical Consultation') match.title = String(rec.title);
              }
            }
          } catch {
            // Ignore individual patient record errors
          }
        })
      );
    }

    return consultations;
  },

  /**
   * Helper method to compute dynamic dashboard metrics from consultation items.
   */
  calculateMetrics(items: ConsultationItem[]): ConsultationMetrics {
    const total = items.length;
    const active = items.filter(
      (c) => c.status === 'SCHEDULED' || c.status === 'CONFIRMED' || c.status === 'IN_PROGRESS'
    ).length;
    const accepted = items.filter(
      (c) =>
        c.offerStatus === 'ACCEPTED' ||
        c.offerStatus === 'RATIFIED_ACCEPTED' ||
        c.offerStatus === 'PROCEDURE_READY'
    ).length;
    const completed = items.filter(
      (c) => c.status === 'COMPLETED' || c.offerStatus === 'COMPLETED'
    ).length;

    return { total, active, accepted, completed };
  },

  /**
   * Query consultations and calculate dynamic metrics in a single operation.
   */
  async getConsultationMetrics(): Promise<ConsultationMetrics> {
    const items = await this.listConsultations();
    return this.calculateMetrics(items);
  },

  /**
   * Document a clinical encounter live on backend.
   * Endpoint: POST /api/v1/doctors/patients/:patientProfileId/encounters
   */
  async createClinicalEncounter(
    patientProfileId: string,
    payload: ClinicalEncounterPayload
  ): Promise<Record<string, unknown>> {
    const response = await apiClient.post<Record<string, unknown>>(
      `/api/v1/doctors/patients/${encodeURIComponent(patientProfileId)}/encounters`,
      payload
    );
    return response.data;
  },

  /**
   * Create medical record live on backend.
   * Endpoint: POST /api/v1/doctors/patients/:patientProfileId/medical-records
   */
  async createMedicalRecord(
    patientProfileId: string,
    payload: Partial<ClinicalEncounterPayload>
  ): Promise<Record<string, unknown>> {
    const response = await apiClient.post<Record<string, unknown>>(
      `/api/v1/doctors/patients/${encodeURIComponent(patientProfileId)}/medical-records`,
      payload
    );
    return response.data;
  },

  /**
   * Update clinical notes documented by doctor live on backend.
   * Endpoint: PUT /api/v1/doctors/patients/:patientProfileId/medical-records/:recordId
   */
  async updateClinicalEncounter(
    patientProfileId: string,
    recordId: string,
    payload: {
      title?: string;
      chiefComplaint?: string;
      clinicalNotes?: string;
      treatmentPlan?: string;
      followUpInstructions?: string;
      status?: string;
    }
  ): Promise<Record<string, unknown>> {
    const response = await apiClient.put<Record<string, unknown>>(
      `/api/v1/doctors/patients/${encodeURIComponent(patientProfileId)}/medical-records/${encodeURIComponent(recordId)}`,
      payload
    );
    return response.data;
  },

  /**
   * Get available healthcare financing options from backend API.
   * Endpoint: GET /api/v1/financing/options
   */
  async getFinancingOptions(): Promise<FinancingOption[]> {
    try {
      const response = await apiClient.get<FinancingOption[] | { data: FinancingOption[] }>('/api/v1/financing/options');
      if (Array.isArray(response.data)) {
        return response.data;
      }
      if (response.data && typeof response.data === 'object' && Array.isArray((response.data as { data: FinancingOption[] }).data)) {
        return (response.data as { data: FinancingOption[] }).data;
      }
      return [];
    } catch {
      return [];
    }
  },

  /**
   * Get pre-approved financing offers for patient.
   * Endpoint: GET /api/v1/financing/offers
   */
  async getFinancingOffers(): Promise<FinancingOption[]> {
    try {
      const response = await apiClient.get<FinancingOption[] | { data: FinancingOption[] }>('/api/v1/financing/offers');
      if (Array.isArray(response.data)) {
        return response.data;
      }
      if (response.data && typeof response.data === 'object' && Array.isArray((response.data as { data: FinancingOption[] }).data)) {
        return (response.data as { data: FinancingOption[] }).data;
      }
      return [];
    } catch {
      return [];
    }
  },

  /**
   * Submit healthcare financing application.
   * Endpoint: POST /api/v1/financing/apply
   */
  async applyForFinancing(payload: FinancingApplicationPayload): Promise<Record<string, unknown>> {
    const response = await apiClient.post<Record<string, unknown>>('/api/v1/financing/apply', payload);
    return response.data;
  },

  /**
   * List healthcare financing applications.
   * Endpoint: GET /api/v1/financing/applications
   */
  async getFinancingApplications(): Promise<Array<Record<string, unknown>>> {
    try {
      const response = await apiClient.get<{ data?: Array<Record<string, unknown>> }>('/api/v1/financing/applications');
      const payload = response.data;
      if (payload && Array.isArray(payload.data)) return payload.data;
      if (Array.isArray(payload)) return payload as Array<Record<string, unknown>>;
      return [];
    } catch {
      return [];
    }
  },

  /**
   * Transition appointment status live on backend.
   * Endpoint: PUT /api/v1/appointments/:id/status
   */
  async updateAppointmentStatus(
    appointmentId: string,
    status: 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW',
    notes?: string
  ): Promise<void> {
    await apiClient.put(`/api/v1/appointments/${encodeURIComponent(appointmentId)}/status`, {
      status,
      notes: notes || `Status updated to ${status} by attending physician`,
    });
  },

  // --- Transitional Methods for Milestone 1 Backwards Compatibility (Zero LocalStorage) ---

  /**
   * @deprecated Retained for transitional compatibility with TreatmentOfferCreatePage during M1.
   * Does NOT touch localStorage; uses in-memory session cache.
   */
  getTreatmentOffers(): TreatmentOfferState[] {
    return Array.from(_inMemoryOfferStore.values());
  },

  /**
   * @deprecated Retained for transitional compatibility during M1.
   */
  getTreatmentOfferById(offerId: string): TreatmentOfferState | null {
    return _inMemoryOfferStore.get(offerId) || null;
  },

  /**
   * @deprecated Retained for transitional compatibility with TreatmentOfferCreatePage and ReviewPage during M1.
   * Stores offer in-memory without using browser localStorage.
   */
  saveTreatmentOffer(offer: TreatmentOfferState): void {
    if (offer && offer.offerId) {
      _inMemoryOfferStore.set(offer.offerId, offer);
    }
  },
};
```

---

## 5. Verification Method

### 5.1 Static Verification: Removal of LocalStorage and Hardcoded Procedural Attributes
Run the following PowerShell check to verify that no `localStorage` or hardcoded procedural literals remain:
```powershell
# 1. Verify localStorage is completely removed from consultationService.ts
Select-String -Path src/services/consultationService.ts -Pattern "localStorage", "careid_treatment_offers_store", "careid_active_encounters_store"

# 2. Verify hardcoded procedural literals are eliminated from consultationService.ts
Select-String -Path src/services/consultationService.ts -Pattern "CPT #93458", "Left Heart Catheterization with Coronary Angiogram", "Metro General Hospital"
```
**Expected Result**: Both commands must return **no output** (exit code 0, 0 matches).

### 5.2 TypeScript Compilation Check
Execute:
```powershell
npm run type-check
```
**Expected Result**: Exit code 0, zero TypeScript errors across all source and test targets.

### 5.3 Live Backend Service Verification Script
Execute via Node.js with active JWT session:
```powershell
node -e "
const https = require('https');
const cache = JSON.parse(require('fs').readFileSync('.token_cache.json', 'utf8'));

function check(path) {
  return new Promise((resolve) => {
    https.get('https://360api.vnvision.in' + path, {
      headers: { 'Authorization': 'Bearer ' + cache.accessToken, 'Accept': 'application/json' }
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => resolve({ path, status: res.statusCode, ok: res.statusCode === 200 }));
    });
  });
}

Promise.all([
  check('/api/v1/appointments/doctor/me'),
  check('/api/v1/doctors/treatment-offers'),
  check('/api/v1/financing/options')
]).then(results => console.log('Service endpoints verification:', results));
"
```
**Expected Result**: All three endpoints return `status: 200, ok: true`.

### 5.4 Invalidation Conditions
This blueprint is invalidated if:
1. The backend removes `GET /api/v1/doctors/treatment-offers` or modifies its schema to omit `procedures` or `status`.
2. `TreatmentOfferCreatePage` or `TreatmentOfferReviewPage` are modified to require persistent offline browser storage rather than REST API drafts.
