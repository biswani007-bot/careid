# CAREID — CPT Procedure Catalogue & Facility Chargemaster Architecture

**Date:** November 10, 2026  
**Auditor:** Antigravity Senior Principal Backend Engineer  
**Scope:** Phase 8 & 9 Delivery

---

## 1. CPT Procedure Catalogue (`src/modules/cpt`)

The CPT (Current Procedural Terminology) catalogue module provides standardized clinical coding infrastructure for interventional cardiology, cardiovascular surgery, and general hospital operations.

### Endpoints
- `GET /api/v1/cpt`: Paginated listing of standardized CPT codes with category filtering (`CARDIOLOGY`, `SURGICAL`, `DIAGNOSTIC_CARDIOLOGY`, `EVALUATION_MANAGEMENT`, `LABORATORY`, `RADIOLOGY`).
- `GET /api/v1/cpt/search?q=...`: High-speed keyword search matching code numbers, procedure names, or clinical descriptions.
- `GET /api/v1/cpt/:code`: Single code lookup returning RVU (Relative Value Units), clinical category, and description.

### Standard Seed Catalogue Entries
| CPT Code | Procedure Name | Category | Standard Charge (PKR) | RVU |
|---|---|---|---|---|
| `93458` | Left Heart Catheterization with Coronary Angiography | CARDIOLOGY | 150,000 | 6.8 |
| `93454` | Coronary Angiography (Isolated) | CARDIOLOGY | 120,000 | 5.2 |
| `92928` | Percutaneous Transcatheter Coronary Stent Placement | CARDIOLOGY | 275,000 | 14.5 |
| `92929` | Coronary Stent Placement (Each Additional Branch) | CARDIOLOGY | 125,000 | 6.0 |
| `93000` | 12-Lead Electrocardiogram (ECG/EKG) | DIAGNOSTIC_CARDIOLOGY | 3,500 | 0.5 |
| `93306` | Transthoracic Echocardiography (TTE) | DIAGNOSTIC_CARDIOLOGY | 18,000 | 2.1 |
| `33533` | Coronary Artery Bypass Graft (CABG), Single Arterial | CARDIOVASCULAR_SURGERY | 750,000 | 38.0 |
| `99213` | Outpatient Clinical Consultation (Level 3) | EVALUATION_MANAGEMENT | 4,000 | 1.3 |
| `99214` | Outpatient Clinical Consultation (Level 4) | EVALUATION_MANAGEMENT | 6,500 | 1.9 |
| `99285` | Emergency Department Visit (High Severity) | EMERGENCY | 15,000 | 4.2 |
| `80053` | Comprehensive Metabolic Panel (CMP) | LABORATORY | 5,500 | 0.4 |
| `85025` | Complete Blood Count (CBC) with Differential | LABORATORY | 2,500 | 0.3 |
| `71046` | Chest X-Ray (2 Views) | RADIOLOGY | 4,500 | 0.8 |

---

## 2. Facility Chargemaster Architecture (`src/modules/facility`)

### Endpoint
- `GET /api/v1/facilities/:facilityId/chargemaster`

### Purpose & Structure
Provides transparent hospital chargemaster pricing per facility. Allows patients, insurance payers, and underwriting financial engines to compute exact procedure costs, copays, and financing amounts:
```json
{
  "facilityId": "f0a8c2d1-...",
  "facilityName": "National Institute of Cardiovascular Diseases",
  "facilityType": "TERTIARY_HOSPITAL",
  "currency": "PKR",
  "chargemasterVersion": "2026.1",
  "lastUpdatedAt": "2026-11-10T12:00:00.000Z",
  "itemCount": 8,
  "items": [
    {
      "cptCode": "93458",
      "procedureName": "Left Heart Catheterization with Coronary Angiography",
      "category": "CARDIOLOGY",
      "department": "Cath Lab",
      "standardCharge": 150000,
      "discountedCashPrice": 135000,
      "insuredPrice": 142500,
      "status": "ACTIVE"
    }
  ]
}
```

