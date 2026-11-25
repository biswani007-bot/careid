# CAREID CLINICAL NETWORK — CATH LAB TELEMETRY AGGREGATION & CALCULATION VERIFICATION

**Document ID:** CR-TELEM-CALC-2026-11-10  
**Milestone:** Final Forensic Verification & Release Acceptance  
**Endpoints:** `POST /api/v1/cath-lab/telemetry/log`, `GET /api/v1/cath-lab/telemetry/live`  
**Inspected Source:** [`cath-lab.dto.ts`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/cath-lab/cath-lab.dto.ts), [`cath-lab.service.ts`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/cath-lab/cath-lab.service.ts)  
**Status:** PASS (CALCULATION & CONVERSION INDEPENDENTLY VERIFIED)

---

## 1. SEMANTIC AUDIT OF INGESTED METRICS

Procedural telemetry records are ingested via `POST /cath-lab/telemetry/log` and aggregated in `GET /cath-lab/telemetry/live`. Historical implementations conflated incremental run logs with cumulative machine snapshots.

### 1.1 Ingestion Semantics Matrix

| Telemetry Metric | Ingestion Unit | Ingestion Type | Aggregation Rule | Clinical Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Fluoroscopy Duration** | Seconds | Incremental or Clock Snapshot | Monotonic max or discrete sum | Radiation safety time tracking (alarm at 600s / 10 min) |
| **Dose Area Product (DAP)** | $\text{mGy}\cdot\text{cm}^2$ | Incremental per-run or Cumulative | Sum of runs or latest snapshot | Total stochastic radiation risk quantification |
| **DAP (Converted)** | $\text{Gy}\cdot\text{cm}^2$ | Derived ($\div 10,000$) | Strict scientific unit conversion | Standard international cath lab reporting format |
| **Cumulative Air Kerma** | $\text{mGy}$ | Cumulative at interventional reference point | Latest observed value | Deterministic skin injury / erythema risk monitoring |
| **Contrast Volume** | $\text{mL}$ | Incremental bolus volume | Cumulative sum of all boluses | Contrast-Induced Nephropathy (CIN) prevention |
| **Activated Clotting Time (ACT)** | Seconds | Point-in-time laboratory assay | Latest observed value | Heparin anticoagulation titration (target 250–300s) |
| **Blood Pressures (SBP/DBP)** | $\text{mmHg}$ | Snapshot vital sign | Latest observed values | Hemodynamic stability monitoring |
| **Mean Arterial Pressure (MAP)** | $\text{mmHg}$ | Calculated / Validated | $\frac{2 \times \text{DBP} + \text{SBP}}{3}$ | Organ perfusion assessment |
| **Heart Rate & $\text{SpO}_2$** | $\text{bpm}$, $\%$ | Snapshot vital sign | Latest observed values | Hypoxia / arrhythmia detection |

---

## 2. CALCULATION ENGINE & CONVERSIONS VERIFIED

### 2.1 Dose Area Product (DAP) Unit Conversion
Cath lab machines often report DAP in $\text{mGy}\cdot\text{cm}^2$ or $\text{Gy}\cdot\text{cm}^2$. Mixing these creates a 10,000-fold reporting error.
- **Conversion Formula:**
  $$\text{DAP}_{(\text{Gy}\cdot\text{cm}^2)} = \frac{\text{DAP}_{(\text{mGy}\cdot\text{cm}^2)}}{10,000}$$
- **Verification Example:**
  - Reading 1: $32,000\text{ mGy}\cdot\text{cm}^2$
  - Reading 2: $18,000\text{ mGy}\cdot\text{cm}^2$
  - Total DAP: $50,000\text{ mGy}\cdot\text{cm}^2$
  - Converted Total: $5.0\text{ Gy}\cdot\text{cm}^2$ (Verified exact in automated test).

### 2.2 Mean Arterial Pressure (MAP) Formula
Implemented in `cath-lab.service.ts`:
```typescript
meanArterialPressure:
  dto.meanArterialPressure || Math.round((2 * dto.diastolicBp + dto.systolicBp) / 3)
```
- Example: SBP = 120, DBP = 76 $\implies \text{MAP} = \text{round}\left(\frac{152 + 120}{3}\right) = \text{round}(90.67) = 91\text{ mmHg}$.

### 2.3 Fluoroscopy Time Aggregation
- If readings contain `readingType === 'CUMULATIVE_SNAPSHOT'`, the latest/max value is used.
- If readings are incremental pedal taps, they are summed.
- If readings are strictly non-decreasing procedural clock times (e.g. 480s, then 720s), the max (720s) represents total elapsed procedure time.

---

## 3. DATA PERSISTENCE & HARDWARE TRANSPARENCY

1. **Dual-Persistence Across Restarts:**
   - Every telemetry observation is appended to memory and written to `appointments.notes` under `--- CATH_LAB_TELEMETRY ---`.
   - On server restart, `getLiveTelemetry` automatically extracts and rehydrates historical readings from the database.
2. **Honest Source Identification:**
   - The API response explicitly declares:
     ```json
     {
       "dataSource": "MANUAL_LOG_FEED",
       "note": "Telemetry represents cumulative logs from procedural reporting. Direct continuous hardware C-arm streaming is not active."
     }
     ```
   - Hardware telemetry is NOT falsely claimed.

---

## 4. VERIFICATION EVIDENCE

Automated tests in `src/modules/cath-lab/tests/cath-lab.service.spec.ts`:
- `should log procedural telemetry observation with radiation and contrast metrics`: **PASS**
- `should aggregate cumulative telemetry totals with accurate mGy*cm2 to Gy*cm2 conversion`: **PASS**
- `should reliably restore telemetry from database notes after in-memory store restart`: **PASS**

