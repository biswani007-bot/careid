# CAREID CLINICAL NETWORK — QCA VESSEL FINDINGS & PROCEDURE CODE INTEGRITY REPORT

**Document ID:** CR-QCA-PROC-2026-11-10  
**Milestone:** Final Forensic Verification & Release Acceptance  
**Endpoint:** `POST /api/v1/cath-lab/encounters/:encounterId/vessel-findings`  
**Inspected Source:** [`cath-lab.dto.ts`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/cath-lab/cath-lab.dto.ts), [`cath-lab.service.ts`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/cath-lab/cath-lab.service.ts)  
**Status:** PASS (DEFECT REPAIRED, CLINICALLY MAPPED & TRANSACTIONALLY VERIFIED)

---

## 1. FORENSIC DEFECT IDENTIFICATION

### 1.1 The Prior Defect: Indiscriminate CPT 92928 Assignment
During the forensic audit of `CathLabService.createVesselFindings`, the following code was identified in the prior implementation:

```typescript
// DEFECTIVE PREVIOUS IMPLEMENTATION:
for (const f of dto.findings) {
  if (f.interventionPerformed) {
    try {
      await this.db.medicalProcedure.create({
        data: {
          medicalRecordId: targetRecordId,
          name: `PCI of ${f.vessel} (${f.segment})`,
          code: '92928', // <--- DEFECT: Hardcoded stent placement for EVERY intervention
          performedAt: new Date(now),
          notes: f.stentDetails || `Treated with balloon/stent...`,
        },
      });
    } catch {}
  }
}
```

### 1.2 Clinical & Financial Risks of the Prior Defect
1. **Severe Billing Fraud / Coding Divergence:** CPT `92928` is *Percutaneous transcatheter placement of intracoronary stent(s)*. Automatically assigning 92928 to a plain old balloon angioplasty (PTCA), atherectomy, or thrombectomy constitutes false billing claim generation.
2. **Missing Transactional Boundary:** Individual procedure records were written outside a database transaction with empty `catch {}` blocks, risking partial writes.
3. **Duplicate Procedure Creation:** Re-submitting findings for an encounter would insert duplicate rows into `medical_procedures`.
4. **No Support for Diagnostic Angiography:** Diagnostic catheterizations (e.g. CPT `93454` / `93458`) were completely unrepresented.

---

## 2. ENGINEERING REMEDIATION IMPLEMENTED

### 2.1 Request DTO Enhancements (`VesselFindingItemDto`)
The DTO was extended with explicit clinical procedure discriminators:
- `procedureType?: string` (`DIAGNOSTIC_ANGIOGRAPHY`, `BALLOON_ANGIOPLASTY`, `STENT_PLACEMENT`, `ATHERECTOMY`, `THROMBECTOMY`, `OTHER`)
- `cptCode?: string` (explicitly supplied and validated CPT code)
- `isDiagnosticOnly?: boolean` (flag for non-interventional diagnostic studies)

### 2.2 Clinical CPT Mapping Rules Enforced
1. **Supplied CPT Code:** If `cptCode` is provided, it is trimmed and validated against standard 5-digit CPT formats or approved catalogues.
2. **Balloon Angioplasty (PTCA):** When `procedureType === 'BALLOON_ANGIOPLASTY'`, the service assigns CPT `92920` (Percutaneous transluminal coronary balloon angioplasty, single major coronary artery or branch) and explicitly DOES NOT assign `92928`.
3. **Stent Placement:** When `procedureType === 'STENT_PLACEMENT'` or when `stentDetails` indicates stent deployment, the service assigns CPT `92928`.
4. **Coronary Atherectomy:** When `procedureType === 'ATHERECTOMY'`, the service assigns CPT `92924`.
5. **Coronary Thrombectomy:** When `procedureType === 'THROMBECTOMY'`, the service assigns CPT `92973`.
6. **Diagnostic Angiography:** When `procedureType === 'DIAGNOSTIC_ANGIOGRAPHY'` or `isDiagnosticOnly === true`, the service assigns CPT `93454`.
7. **Unspecified Intervention Safety Gate:** If `interventionPerformed === true` but neither `cptCode`, `procedureType`, nor `stentDetails` is supplied, **the system refuses to guess CPT 92928**. It creates a procedure with `code: 'PENDING_CLINICAL_CODING'` and notes: `Intervention marked performed without specific procedure type or implant details. Pending coding review.`

### 2.3 Transactional Atomic Writing & Duplicate Prevention
- Wrapped in `this.db.$transaction(async (tx) => { ... })`.
- Before creating a `medicalProcedure`, checks if an existing procedure with the same `name` and `code` already exists for `medicalRecordId`. If present, creation is skipped to prevent duplicate records.
- Persists the complete structured QCA document into `MedicalRecord.clinicalNotes` under `--- CATH_LAB_VESSEL_FINDINGS ---`.

---

## 3. AUTOMATED VERIFICATION EVIDENCE

The following dedicated automated unit tests were added to `src/modules/cath-lab/tests/cath-lab.service.spec.ts`:

1. `should map BALLOON_ANGIOPLASTY to CPT 92920 and NOT assign CPT 92928`: **PASS**
2. `should map STENT_PLACEMENT to CPT 92928 with implant details`: **PASS**
3. `should map DIAGNOSTIC_ANGIOGRAPHY to CPT 93454 without therapeutic intervention`: **PASS**
4. `should mark unspecified intervention as PENDING_CLINICAL_CODING without guessing 92928`: **PASS**
5. `should prevent creating duplicate procedure if same procedure already exists for record`: **PASS**
6. `should restore vessel findings from medicalRecord.clinicalNotes after in-memory store restart`: **PASS**

---

## 4. CLINICAL INTEGRITY VERDICT

- **Status:** **PASS**
- **Divergence Prevention:** CPT codes now strictly match clinical procedure types.
- **Auditing:** All procedure insertions link directly to parent medical records with full pre/post TIMI flow notes and audit logs.

