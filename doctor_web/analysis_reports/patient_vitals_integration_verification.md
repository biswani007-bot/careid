# CAREID DOCTOR WEB — PATIENT VITALS INTEGRATION VERIFICATION REPORT

**Date:** November 10, 2026  
**Environment:** Staging (`https://360api.vnvision.in/api/v1`)  
**Target Patient ID:** `787e5187-7859-4320-bb1a-465a57dd086a` (Marcus Doe)  
**Target Patient MRN:** `PT-CAREID-2026-0004`  
**Page Component:** `src/pages/records/MedicalRecordsPage.tsx`  
**Card Inspected:** *Latest Vitals Card* (Figma Node `1:6228`)  

---

## 1. Executive Summary

In the Doctor Web Portal at `/records?patientId=787e5187-7859-4320-bb1a-465a57dd086a`, the **Latest Vitals** component was displaying empty readings:
- Measurement Timestamp: `No recent readings`
- Blood Pressure: `—`
- Heart Rate: `—`
- SpO2: `—`

This occurred because vitals telemetry was previously derived exclusively as a secondary side-effect of `patientService.getPatientMedicalRecords()`. When that endpoint crashed with HTTP 500 on the live staging backend, the service swallowed the exception, returning an empty records array, which caused `extractLatestVitalsFromRecords([])` to return `undefined`.

---

## 2. Documented Vitals APIs & Contract Analysis

According to the authoritative Postman collection (`CareID-Staging.postman_collection.json`), vitals can be retrieved through two documented paths:

### 2.1 Dedicated Doctor Vitals Endpoint
- **Method:** `GET`
- **Path:** `/api/v1/doctors/patients/:patientProfileId/vitals?page=1&limit=20`
- **Description:** List vital signs records for an authorized patient.
- **DTO Structure (`VitalSignsDTO`):**
  ```typescript
  export interface VitalSignsDTO {
    id: string;
    medicalRecordId?: string;
    heightCm?: number;
    weightKg?: number;
    bmi?: number;
    systolicBp?: number;
    diastolicBp?: number;
    bloodPressure?: string;
    pulseBpm?: number;
    respirationRate?: number;
    temperatureC?: number;
    bloodSugarMgDl?: number;
    oxygenSaturation?: number;
    recordedAt: string;
    createdAt?: string;
    updatedAt?: string;
  }
  ```

### 2.2 Embedded Encounter / Medical Record Vitals
- **Method:** `GET`
- **Path:** `/api/v1/doctors/patients/:patientProfileId/medical-records`
- **Schema:**
  ```typescript
  vitalSigns: Array<{
    id: string;
    systolicBp: number;
    diastolicBp: number;
    pulseBpm: number;
    respirationRate?: number;
    temperatureC?: number;
    bloodSugarMgDl?: number;
    oxygenSaturation: number;
    recordedAt: string;
  }>;
  ```

---

## 3. Database Persistent Vitals Reconciled

The target patient Marcus Doe (`787e5187-7859-4320-bb1a-465a57dd086a`) has multiple authentic sets of vital signs persisted in the backend database:

### Reading Set 1 (Latest Attested Reading)
- **Record ID:** `103941ad-08e6-455e-8f67-d9202bc7b8f2` (*Diagnostic Left Heart Catheterization — Attested Report*)
- **Timestamp (`recordedAt`):** `2026-11-10T06:19:32.609Z`
- **Systolic BP:** `124 mmHg`
- **Diastolic BP:** `76 mmHg`
- **Heart Rate / Pulse:** `72 bpm`
- **SpO2:** `99%`
- **Temperature:** `36.8 °C`
- **Status:** Authentic, recorded in Cath Lab post-radial recovery.

### Reading Set 2 (Routine Health Checkup)
- **Record ID:** `dec25303-5f95-4418-ba01-83ef40b487b0` (*Routine Health Checkup*)
- **Provider:** Dr. Sarah Jenkins
- **Timestamp (`recordedAt`):** `2026-11-09T12:35:03.127Z`
- **Systolic BP:** `120 mmHg`
- **Diastolic BP:** `80 mmHg`
- **Heart Rate / Pulse:** `72 bpm`
- **SpO2:** `98%`
- **Temperature:** `36.6 °C`
- **Respiration Rate:** `16 bpm`

### Reading Set 3 (Annual Health Checkup)
- **Record ID:** `68d786a3-8681-4893-a58d-7125081ef2a4` (*Annual Routine Health Checkup*)
- **Provider:** Dr. Sarah Connor
- **Timestamp (`recordedAt`):** `2026-11-05T08:12:03.200Z`
- **Systolic BP:** `120 mmHg`
- **Diastolic BP:** `80 mmHg`
- **Heart Rate / Pulse:** `72 bpm`
- **SpO2:** `98%`
- **Blood Sugar:** `95 mg/dL`

---

## 4. Architectural Fix & Dual-Pipeline Telemetry

To ensure robust vitals presentation without fabrication:

1. **Created Dedicated Hook `usePatientVitals` (`src/hooks/usePatients.ts`):**
   - Calls `patientService.getPatientVitals(patientId)`.
   - Surfaces structured telemetry directly from the `/vitals` backend endpoint.
2. **Added Multi-Source Extractor `extractLatestVitalsFromVitalsList` (`src/services/patientService.ts`):**
   - Sorts vital readings chronologically by `recordedAt` / `createdAt`.
   - Aggregates the most recent valid metric for BP, Heart Rate, SpO2, Temperature, and Respiration Rate.
   - Preserves authentic measurement dates (`lastUpdated`).
3. **Tri-Tier Priority Resolution in `MedicalRecordsPage.tsx`:**
   ```typescript
   const latestVitals = useMemo(() => {
     // Priority 1: Direct dedicated vitals endpoint (/api/v1/doctors/patients/:id/vitals)
     if (vitalsFromEndpoint && (vitalsFromEndpoint.bp || vitalsFromEndpoint.hr || vitalsFromEndpoint.spo2 || vitalsFromEndpoint.temp)) {
       return vitalsFromEndpoint;
     }
     // Priority 2: Extracted from authentic patient medical records
     const fromRecords = extractLatestVitalsFromRecords(patientRecords);
     if (fromRecords && (fromRecords.bp || fromRecords.hr || fromRecords.spo2 || fromRecords.temp)) {
       return fromRecords;
     }
     // Priority 3: Fallback to patient profile vitals summary
     if (patient?.vitals && (patient.vitals.bp || patient.vitals.hr || patient.vitals.spo2 || patient.vitals.temp)) {
       return patient.vitals;
     }
     return fromRecords || vitalsFromEndpoint;
   }, [vitalsFromEndpoint, patientRecords, patient?.vitals]);
   ```
4. **Honest Empty State:**
   - If no vitals are present in the database or if the query fails, the card shows `—` and `No recent readings`, rather than inventing placeholder values.

---

## 5. Quality Gates & Live Verification

- `npm run type-check`: **0 errors**
- `npm run lint`: **0 errors**
- `npm run build`: **0 errors, built in 6.24s**
- Live Staging Backend Audit:
  - Patient Mobile App / Admin API: Confirmed authentic vitals (`124/76 mmHg`, `72 bpm`, `99% SpO2`).
  - Doctor API: Identified backend `500 InternalServerError` regression in `DoctorPatientsController` on `/vitals` and `/medical-records`.
  - Frontend Resiliency: Display honest error states on query failures; zero fabrication.

