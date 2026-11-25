# Handoff Report: Consultation Listing, Filtering, Search, Manual Refresh & Action Triggers

**Explorer**: `explorer_m2_actions_1`  
**Milestone**: Milestone 2 (Module A: Dashboard Listing, Filters, Search, Refresh, CTAs)  
**Target File**: `src/pages/treatment-offers/TreatmentOffersDashboardPage.tsx`  
**Related Files**: `src/services/consultationService.ts`, `src/services/treatmentOfferService.ts`, `src/pages/treatment-offers/types.ts`  
**Date**: 2026-11-09T18:29:00Z  

---

## 1. Observation

Direct examination of `src/pages/treatment-offers/TreatmentOffersDashboardPage.tsx` reveals the exact current implementation, along with several critical hardcoded/fake fallbacks violating Requirement R4:

### 1.1 Action CTAs Hardcoded Mock Values (Lines 405–446)
In `TreatmentOffersDashboardPage.tsx`:
```tsx
// Lines 405-424: "Create Offer" CTA
<button
  type="button"
  onClick={() =>
    navigate('/treatment-offers/new/step-1', {
      state: {
        patientId: item.patientProfileId,
        patientName: item.patientName,
        patientCid: item.patientMrn,
        patientGender: item.patientGender,
        facility: item.facilityName,
        cptCode: item.cptCode || 'CPT #93458', // VIOLATION: Hardcoded mock CPT #93458
        procedureName: item.procedureName || 'Left Heart Catheterization with Coronary Angiogram', // VIOLATION: Hardcoded procedure
        clinicalNecessity: item.chiefComplaint || 'Diagnostic assessment and coronary angiography evaluation.', // VIOLATION: Hardcoded necessity
      },
    })
  }
  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
>
  Create Offer
</button>

// Lines 426-446: "Proceed Lifecycle" CTA
<button
  type="button"
  onClick={() =>
    navigate(`/treatment-offers/${item.offerId || 'TR-8921'}/accepted`, { // VIOLATION: Hardcoded mock ID 'TR-8921'
      state: {
        offerId: item.offerId || 'TR-8921', // VIOLATION: Hardcoded mock ID 'TR-8921'
        patientId: item.patientProfileId,
        patientName: item.patientName,
        patientCid: item.patientMrn,
        procedureName: item.procedureName || 'Left Heart Catheterization with Coronary Angiogram', // VIOLATION: Hardcoded procedure
        facility: item.facilityName,
        attendingDoctor: user.fullName || 'Attending Physician',
      },
    })
  }
  className="px-3.5 py-1.5 rounded-lg bg-[#28006d] hover:bg-[#3f1d8b] text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
>
  <span>Proceed Lifecycle</span>
  <ArrowRight className="size-3" />
</button>
```

### 1.2 Appointment Time Hardcoded Fallback (Line 390)
```tsx
<span className="flex items-center gap-1">
  <Calendar className="size-3" />
  {item.appointmentDate} • {item.appointmentTime || '10:00 AM'} {/* VIOLATION: Hardcoded fake '10:00 AM' */}
</span>
```

### 1.3 Filtering Incompleteness & Runtime Vulnerabilities (Lines 51–74)
```tsx
const filteredConsultations = useMemo(() => {
  let result = consultations;

  if (searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    result = result.filter(
      (c) =>
        c.patientName.toLowerCase().includes(q) || // Unsafe if patientName is null/undefined
        c.patientMrn.toLowerCase().includes(q) ||  // Unsafe if patientMrn is null/undefined
        (c.procedureName && c.procedureName.toLowerCase().includes(q)) ||
        c.title.toLowerCase().includes(q)          // Unsafe if title is null/undefined
    );
  }

  if (selectedTab === 'active') {
    result = result.filter((c) => c.status === 'SCHEDULED' || c.status === 'CONFIRMED' || c.status === 'IN_PROGRESS');
  } else if (selectedTab === 'accepted') {
    result = result.filter((c) => c.offerStatus === 'ACCEPTED' || c.offerStatus === 'PROCEDURE_READY'); // MISSING: 'RATIFIED_ACCEPTED'
  } else if (selectedTab === 'completed') {
    result = result.filter((c) => c.status === 'COMPLETED' || c.offerStatus === 'COMPLETED');
  }

  return result;
}, [consultations, searchQuery, selectedTab]);
```
- In backend Postman DTOs (Folder 05/06), the accepted status is `'RATIFIED_ACCEPTED'` or `'ACCEPTED'`. Line 68 omits `'RATIFIED_ACCEPTED'`.
- Search query filter omits `c.cptCode` and `c.facilityName`.
- Direct `.toLowerCase()` calls without null-checking will throw a TypeError if fields are null/undefined.

### 1.4 Manual Refresh Button (Lines 295–303)
```tsx
<button
  type="button"
  onClick={fetchConsultations}
  title="Refresh consultations from server"
  className="size-9 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors cursor-pointer shrink-0"
>
  <RotateCw className={cn('size-3.5', isLoading && 'animate-spin')} />
</button>
```
- Missing `disabled={isLoading}`: allows spamming rapid clicks while network request is in flight.

### 1.5 Empty States (Lines 327–344)
- When `filteredConsultations.length === 0`, it displays the authentic empty state:
  - Stethoscope icon
  - "No Consultations Found"
  - Explanatory copy
  - "Initiate New Consultation" button navigating to `/treatment-offers/new/step-1`.
- Contains zero mock data.

---

## 2. Logic Chain

1. **Elimination of Mock Fallbacks in CTAs (R4 Compliance)**:
   - *Premise*: R4 mandates the complete removal of fake CPT codes (`CPT #93458`), hardcoded procedures (`Left Heart Catheterization with Coronary Angiogram`), hardcoded clinical indications, and placeholder offer IDs (`TR-8921`).
   - *Deduction*:
     - In "Create Offer", if `item.cptCode`, `item.procedureName`, or `item.chiefComplaint` are absent on the record, pass `undefined` rather than fake strings.
     - Include `?patientId=${encodeURIComponent(item.patientProfileId)}` in the navigation path to guarantee URL state persistence across page refreshes per R3 and Feature 11.
     - In "Proceed Lifecycle", NEVER fallback to `'TR-8921'`. If `!item.offerId`, the consultation has not started an offer yet; proceeding lifecycle should initiate Step 1 (`/treatment-offers/new/step-1?patientId=...`).
     - If `item.offerId` exists, dynamically navigate to the corresponding lifecycle route based on authentic `item.offerStatus`:
       - `item.offerStatus === 'DRAFT'` → `/treatment-offers/${item.offerId}/review`
       - `item.offerStatus === 'ACCEPTED' || item.offerStatus === 'RATIFIED_ACCEPTED'` → `/treatment-offers/${item.offerId}/accepted`
       - Otherwise (`'DISPATCHED'`, `'PATIENT_REVIEWING'`, etc.) → `/treatment-offers/${item.offerId}/status`

2. **Removal of Hardcoded Appointment Time (R4 Compliance)**:
   - *Premise*: Line 390 injects `'10:00 AM'` if `item.appointmentTime` is missing.
   - *Deduction*: Render `{item.appointmentDate}{item.appointmentTime ? ` • ${item.appointmentTime}` : ''}` so that if the backend does not specify an exact start time, no fictitious time is presented.

3. **Status Badges & Error Tolerance**:
   - *Premise*: Appointments and offers can have status `'CANCELLED'`.
   - *Deduction*: Add `item.status === 'CANCELLED' ? 'bg-rose-50 text-rose-700 border border-rose-200' : ...` to the badge color mapping so cancelled items render with clear, accessible styling.

4. **Filter & Search Normalization (R2 & Test Suite Compliance)**:
   - *Premise*: Tier 1 `feature06_live_consultation_listing_filters.test.ts` (TC-F06-04) and Tier 2 `boundary06_consultation_search_filter_edges.test.ts` require:
     - Accepted filter tab selects items with `RATIFIED_ACCEPTED` or `ACCEPTED` offer status.
     - Search matches query against patient name, MRN, procedure, CPT code, and title safely without regex or null crash.
   - *Deduction*:
     - Update tab `'accepted'` condition to `c.offerStatus === 'ACCEPTED' || c.offerStatus === 'RATIFIED_ACCEPTED' || c.offerStatus === 'PROCEDURE_READY'`.
     - Update search filter to defensively check `(c.patientName && c.patientName.toLowerCase().includes(q))` and include `c.cptCode` and `c.facilityName`.
     - Align `stats` memo with `consultationService.calculateMetrics(consultations)` to guarantee 100% DRY synchronization.

5. **Manual Refresh Debounce / In-flight Protection**:
   - *Premise*: Triggering repeated fetches during loading can cause race conditions.
   - *Deduction*: Add `disabled={isLoading}` to the refresh button while preserving identical visual dimensions, icon, and spin animation.

---

## 3. Caveats

- **Missing Backend Filter Endpoints**: The backend does NOT have server-side filter endpoints for doctor appointments (`GET /api/v1/appointments/doctor/me` returns the full list for the doctor). Thus, client-side filtering via `useMemo` on `consultations` is the authoritative, correct approach aligned with the API contract.
- **Appointments Without Active Treatment Proposals**: A patient may have a confirmed clinical consultation appointment without any treatment proposal yet created. The "Proceed Lifecycle" button cleanly handles this by guiding the physician to Step 1 (Offer Creation) with genuine patient profile context, rather than erroring or falling back to a dummy proposal ID.
- **Scope Boundary**: 18-stage pipeline navigation header (lines 86–105) is investigated by peer `explorer_m2_trajectory_1`. Metric summary cards (lines 141–197) are investigated by peer `explorer_m2_dashboard_1`. This handoff specifically governs the consultation card list, search bar, filter tabs, refresh button, and action triggers (lines 235–455).

---

## 4. Conclusion & Implementation Blueprint

### 4.1 Concrete Replacement Snippet for Worker

#### A. Filter & Search Logic (replace lines 51–85):
```tsx
  // Filtered consultations with safe null checks and authentic status properties
  const filteredConsultations = useMemo(() => {
    let result = consultations;

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (c) =>
          (c.patientName && c.patientName.toLowerCase().includes(q)) ||
          (c.patientMrn && c.patientMrn.toLowerCase().includes(q)) ||
          (c.procedureName && c.procedureName.toLowerCase().includes(q)) ||
          (c.cptCode && c.cptCode.toLowerCase().includes(q)) ||
          (c.facilityName && c.facilityName.toLowerCase().includes(q)) ||
          (c.title && c.title.toLowerCase().includes(q))
      );
    }

    if (selectedTab === 'active') {
      result = result.filter(
        (c) => c.status === 'SCHEDULED' || c.status === 'CONFIRMED' || c.status === 'IN_PROGRESS'
      );
    } else if (selectedTab === 'accepted') {
      result = result.filter(
        (c) =>
          c.offerStatus === 'ACCEPTED' ||
          c.offerStatus === 'RATIFIED_ACCEPTED' ||
          c.offerStatus === 'PROCEDURE_READY'
      );
    } else if (selectedTab === 'completed') {
      result = result.filter(
        (c) => c.status === 'COMPLETED' || c.offerStatus === 'COMPLETED'
      );
    }

    return result;
  }, [consultations, searchQuery, selectedTab]);

  // Dynamic Statistics from authentic consultations (using consultationService)
  const stats = useMemo(() => {
    return consultationService.calculateMetrics(consultations);
  }, [consultations]);
```

#### B. Manual Refresh Button (replace lines 295–303):
```tsx
            <button
              type="button"
              onClick={fetchConsultations}
              disabled={isLoading}
              title="Refresh consultations from server"
              aria-label="Refresh consultations from server"
              className={cn(
                'size-9 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors cursor-pointer shrink-0',
                isLoading && 'cursor-not-allowed opacity-70'
              )}
            >
              <RotateCw className={cn('size-3.5', isLoading && 'animate-spin')} />
            </button>
```

#### C. Card Rendering & Action Triggers (replace lines 345–450):
```tsx
          <div className="divide-y divide-slate-100">
            {filteredConsultations.map((item) => {
              const monogram = (item.patientName || 'PT')
                .trim()
                .split(/\s+/)
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase() || 'PT';

              return (
                <div
                  key={item.id}
                  className="p-4 sm:p-5 hover:bg-slate-50/80 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="size-12 rounded-xl bg-[#3f1d8b] text-white flex items-center justify-center font-extrabold text-sm shadow-xs shrink-0">
                      {monogram}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-sm font-bold text-[#0f172a]">
                          {item.patientName || 'Patient Record'}
                        </span>
                        {item.patientMrn && (
                          <span className="text-[11px] font-mono font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            {item.patientMrn}
                          </span>
                        )}
                        <span
                          className={cn(
                            'text-[10px] font-bold px-2 py-0.5 rounded-full uppercase',
                            item.status === 'COMPLETED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : item.status === 'IN_PROGRESS'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : item.status === 'CANCELLED'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-purple-50 text-[#3f1d8b] border border-purple-200'
                          )}
                        >
                          {item.status}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-700">
                        {item.procedureName || item.title || 'Clinical Consultation'}
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3" />
                          {item.appointmentDate}
                          {item.appointmentTime ? ` • ${item.appointmentTime}` : ''}
                        </span>
                        {item.facilityName && (
                          <>
                            <span>•</span>
                            <span>{item.facilityName}</span>
                          </>
                        )}
                        {item.cptCode && (
                          <>
                            <span>•</span>
                            <span className="font-semibold text-slate-700">{item.cptCode}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        navigate(`/treatment-offers/new/step-1?patientId=${encodeURIComponent(item.patientProfileId)}`, {
                          state: {
                            patientId: item.patientProfileId,
                            patientName: item.patientName,
                            patientCid: item.patientMrn,
                            patientGender: item.patientGender,
                            facility: item.facilityName,
                            cptCode: item.cptCode || undefined,
                            procedureName: item.procedureName || undefined,
                            clinicalNecessity: item.chiefComplaint || undefined,
                          },
                        })
                      }
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                    >
                      Create Offer
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (!item.offerId) {
                          // No offer exists yet; initiate Step 1
                          navigate(`/treatment-offers/new/step-1?patientId=${encodeURIComponent(item.patientProfileId)}`, {
                            state: {
                              patientId: item.patientProfileId,
                              patientName: item.patientName,
                              patientCid: item.patientMrn,
                              patientGender: item.patientGender,
                              facility: item.facilityName,
                              cptCode: item.cptCode || undefined,
                              procedureName: item.procedureName || undefined,
                              clinicalNecessity: item.chiefComplaint || undefined,
                            },
                          });
                          return;
                        }

                        // Offer exists; route according to authentic offerStatus
                        let targetRoute = `/treatment-offers/${item.offerId}/status`;
                        if (item.offerStatus === 'DRAFT') {
                          targetRoute = `/treatment-offers/${item.offerId}/review`;
                        } else if (
                          item.offerStatus === 'ACCEPTED' ||
                          item.offerStatus === 'RATIFIED_ACCEPTED'
                        ) {
                          targetRoute = `/treatment-offers/${item.offerId}/accepted`;
                        }

                        navigate(targetRoute, {
                          state: {
                            offerId: item.offerId,
                            patientId: item.patientProfileId,
                            patientName: item.patientName,
                            patientCid: item.patientMrn,
                            patientGender: item.patientGender,
                            procedureName: item.procedureName,
                            facility: item.facilityName,
                            attendingDoctor: user?.fullName || item.doctorName || 'Attending Physician',
                          },
                        });
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-[#28006d] hover:bg-[#3f1d8b] text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <span>Proceed Lifecycle</span>
                      <ArrowRight className="size-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
```

---

## 5. Verification Method

To independently verify the implementation:

1. **Static Analysis & Type Integrity**:
   ```powershell
   npm run type-check
   npm run lint
   ```
   *Expected outcome*: Zero TypeScript errors, zero ESLint warnings.

2. **Consultation Listing E2E Feature Test**:
   ```powershell
   npm run test:consultations
   ```
   *Verify specifically*:
   - `TC-F06-01`: Live consultation records load from backend appointments and offers.
   - `TC-F06-02`: ALL filter tab returns all loaded items without exclusion.
   - `TC-F06-03`: ACTIVE filter tab isolates scheduled, confirmed, and in-progress consultations.
   - `TC-F06-04`: ACCEPTED filter tab selects items with `RATIFIED_ACCEPTED` or `ACCEPTED` offer status.
   - `TC-F06-05`: Patient search filter matches query case-insensitively.
   - `TC-B06-01` to `TC-B06-05`: Boundary conditions (regex metacharacters, whitespace trimming, partial MRN match).
   - `TC-X06-01` to `TC-X06-02`: Newly created offers dynamically reflect in the consultation listing.

3. **Grep Audit for Hardcoded Mock Remnants**:
   Verify zero occurrences of the removed mock strings:
   ```powershell
   Select-String -Path "src\pages\treatment-offers\TreatmentOffersDashboardPage.tsx" -Pattern "TR-8921"
   Select-String -Path "src\pages\treatment-offers\TreatmentOffersDashboardPage.tsx" -Pattern "93458"
   Select-String -Path "src\pages\treatment-offers\TreatmentOffersDashboardPage.tsx" -Pattern "Left Heart Catheterization with Coronary Angiogram"
   Select-String -Path "src\pages\treatment-offers\TreatmentOffersDashboardPage.tsx" -Pattern "10:00 AM"
   ```
   *Expected outcome*: Zero hits in the consultation listing section.

4. **Visual UI Inspection**:
   - Verify pixel-for-pixel alignment: tabs layout, search input with magnifying glass, refresh button, monogram badge, patient name, MRN pill, status pill, procedure title, appointment calendar date, facility name, "Create Offer" secondary button, and "Proceed Lifecycle" primary purple button with arrow icon.
