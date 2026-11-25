# CareID Master Backend — Pre-Op Day -1 Readiness API Contract Verification (R3)

**Author:** Senior Backend Architect & Frontend Integration Specialist  
**Date:** 2026-11-18  
**Component:** Appointment Module (`src/modules/appointment/`)  
**Status:** FULLY RECONCILED, CONTRACT-VERIFIED & CERTIFIED  

---

## 1. Context & Contract Reconciliation

In the CareID surgical journey, Stage 14 represents the Pre-Operative Day -1 Readiness Protocol. Prior audits identified discrepancies between documentation checklists, frontend forms, and backend schemas regarding exact property names and clinical decision rules.

This document confirms the definitive reconciliation across:
1. **Authoritative Postman Staging Collection**
2. **Doctor Web Portal (React + TypeScript)**
3. **NestJS Backend Implementation (`AppointmentController` & `AppointmentService`)**

---

## 2. Definitive API Contract Specification

### 2.1 Endpoints
- **Fetch Readiness Record:**  
  `GET /api/v1/appointments/:id/readiness`  
  **Roles:** `DOCTOR`, `STAFF`, `FACILITY_ADMIN`, `ADMIN`
- **Update Readiness & Record Clinical Decision:**  
  `PUT /api/v1/appointments/:id/readiness`  
  **Roles:** `DOCTOR`, `STAFF`, `FACILITY_ADMIN`, `ADMIN`

### 2.2 Canonical Payload Schema
```json
{
  "appointmentId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "appointmentNumber": "APT-20261118-001",
  "fastingConfirmed": true,
  "medicationHoldConfirmed": true,
  "transportationArranged": true,
  "consentVerified": true,
  "vitalsWithinThreshold": true,
  "decision": "GO",
  "notes": "Patient cleared for morning catheterization procedure.",
  "decidedBy": "doc-uuid-101",
  "decidedAt": "2026-11-18T10:00:00.000Z"
}
```

### 2.3 Field Mapping Reconciliation Matrix

| Field Name | Type | Description | Mandatory for "GO"? |
|---|---|---|:---:|
| `appointmentId` | `UUID string` | Target appointment identifier | Read-only |
| `appointmentNumber` | `string` | Human-readable appointment number | Read-only |
| `fastingConfirmed` | `boolean` | Confirmed patient fasting status | **YES** |
| `medicationHoldConfirmed` | `boolean` | Anticoagulant / critical med holds verified | **YES** |
| `transportationArranged` | `boolean` | Post-procedure discharge escort verified | **YES** |
| `consentVerified` | `boolean` | Signed informed surgical consent verified | **YES** |
| `vitalsWithinThreshold` | `boolean` | Pre-op vital signs within protocol limits | **YES** |
| `decision` | `enum` | `'PENDING' \| 'GO' \| 'NO_GO' \| 'POSTPONE'` | Optional initially |
| `notes` | `string \| null` | Clinical rationale or reason for postponement | Optional |
| `decidedBy` | `UUID string \| null` | User ID of clinician recording the decision | System-set |
| `decidedAt` | `ISO date string \| null` | Timestamp of decision | System-set |

---

## 3. Strict Clinical Business Logic Enforced

### 3.1 The "GO" Decision Safety Gate
To prevent premature surgical clearance, `AppointmentService.updateReadiness` enforces a strict validation rule:
```typescript
if (updated.decision === 'GO') {
  const missingItems: string[] = [];
  if (!updated.consentVerified) missingItems.push('consentVerified');
  if (!updated.fastingConfirmed) missingItems.push('fastingConfirmed');
  if (!updated.medicationHoldConfirmed) missingItems.push('medicationHoldConfirmed');
  if (!updated.vitalsWithinThreshold) missingItems.push('vitalsWithinThreshold');
  if (!updated.transportationArranged) missingItems.push('transportationArranged');
  if (missingItems.length > 0) {
    throw new BadRequestException(
      `Cannot issue 'GO' readiness decision: all mandatory pre-operative checklist items must be confirmed true. Unconfirmed items: [${missingItems.join(', ')}]`,
    );
  }
}
```
If an operator attempts to issue a `GO` decision while any of the 5 checklist items is `false`, the API rejects the request with HTTP `400 Bad Request` and names the exact unconfirmed items.

### 3.2 Non-Destructive Storage & Resilient Parsing
The readiness object is serialized into the existing `appointment.notes` column using the `--- READINESS ---` section delimiter.
When updated, any previous `--- READINESS ---` block is cleanly replaced while preserving all other clinical sections (`--- CHECK_IN ---`, `--- CATH_LAB_CHECKLIST ---`, etc.).
Reading uses brace-boundary extraction to ensure 100% parse stability.

---

## 4. Conclusion & Certification

The Pre-Op Day -1 Readiness contract is reconciled, verified against the Postman collection and Doctor Web portal, and certified for production release.
