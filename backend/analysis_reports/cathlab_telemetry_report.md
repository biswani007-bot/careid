# CAREID — Cath Lab Fluoroscopy & Hemodynamic Telemetry Report

**Capability:** Procedural Radiation & Hemodynamic Telemetry Ingestion (Stages 17–18)  
**Status:** **IMPLEMENTED AND VERIFIED**  
**Source File:** `src/modules/cath-lab/cath-lab.service.ts`  
**Controller:** `src/modules/cath-lab/cath-lab.controller.ts`

---

## 1. Clinical Specification

During cardiac catheterization and percutaneous coronary intervention, intra-procedural telemetry requires tracking radiation exposure, radiopaque contrast load, anticoagulation status (ACT), and hemodynamic stability:

1. **Fluoroscopy Duration:** Total X-ray pedal time in seconds (typically 300 to 1800 seconds).
2. **Dose Area Product (DAP):** Cumulative radiation dose in $mGy \cdot cm^2$.
3. **Contrast Load:** Total volume of iodinated contrast administered in mL (vital for preventing contrast-induced nephropathy).
4. **Activated Clotting Time (ACT):** Bedside clotting time in seconds (target 250–350 seconds during PCI).
5. **Hemodynamic Vitals:** Systolic BP, Diastolic BP, Heart Rate, and Oxygen Saturation ($SpO_2$).

---

## 2. Technical Implementation

### Endpoints
- `POST /api/v1/cath-lab/telemetry/log` (HTTP 201 Created)
- `GET /api/v1/cath-lab/telemetry/live?appointmentId=:id` (HTTP 200 OK)

### Validation & Units
- `fluoroscopyDurationSeconds`: Integer, $0 \le t \le 7200$.
- `doseAreaProductDap`: Non-negative number in $mGy \cdot cm^2$.
- `contrastVolumeMl`: Non-negative number in mL, $0 \le v \le 1000$.
- `activatedClottingTimeSeconds`: Optional number, $50 \le ACT \le 1000$.
- `systolicBp` ($30 \le BP \le 300$) & `diastolicBp` ($20 \le BP \le 200$).
- `meanArterialPressure`: Calculated if omitted: $MAP = \frac{2 \cdot DBP + SBP}{3}$.
- `heartRate`: $20 \le HR \le 250$.
- `oxygenSaturation`: $50 \le SpO_2 \le 100$.

### Live Aggregation Architecture
The `GET /cath-lab/telemetry/live?appointmentId=:id` endpoint:
- Calculates cumulative metrics:
  - `totalFluoroscopyDurationSeconds`: Maximum recorded fluoroscopy run.
  - `totalDoseAreaProductDap`: Cumulative sum of DAP readings.
  - `totalContrastVolumeMl`: Cumulative sum of contrast injected.
  - `latestVitals`: Most recent hemodynamic reading.
  - `latestActSeconds`: Most recent ACT reading.
- **Data Source Integrity:** Explicitly tags output with:
  ```json
  {
    "dataSource": "MANUAL_LOG_FEED",
    "note": "Telemetry represents cumulative logs from procedural reporting. Direct continuous hardware C-arm streaming is not active."
  }
  ```
  This honestly represents that API data originates from staff entry or cart webhook, without falsely claiming physical C-arm bus integration.

---

## 3. Test Evidence

The test suite [`cath-lab.service.spec.ts`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/cath-lab/tests/cath-lab.service.spec.ts) validates:
1. Valid telemetry point logs successfully with server-side observation timestamp and authenticated actor.
2. Multiple logged points correctly aggregate into cumulative totals for contrast volume, DAP, and fluoroscopy time.
3. Live query accurately returns latest vitals and cumulative totals.

