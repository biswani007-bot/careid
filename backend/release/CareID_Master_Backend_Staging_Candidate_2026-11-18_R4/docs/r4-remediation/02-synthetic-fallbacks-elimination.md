# CareID R4 Remediation: Total Elimination of Synthetic Fallbacks

**Document ID:** `CAREID-R4-DOC-02`  
**Security Severity:** CRITICAL (Data Integrity / Clinical Safety - Silent Mock Data Injection)  
**Target Subsystems:**
- `src/modules/ocr/application/use-cases/ocr.service.ts`
- `src/modules/ai-ocr/application/use-cases/ai-ocr.service.ts`
- `src/modules/insurance/application/use-cases/insurance.service.ts`  
**Status:** IMPLEMENTED & VERIFIED  

---

## 1. Vulnerability Analysis & Discovery

During the R3 audit, forensic code analysis revealed multiple dangerous synthetic fallback mechanisms embedded directly into production processing pipelines:

### 1.1 In `OCRJobService.processJobLocalPipeline`:
- **Sample Document Hijack:** When an attachment file was not found on local disk or storage, the service silently mapped the request to bundled benchmark files (`ocr-poc/sample_docs/01_lab_report.png`, `02_prescription.jpg`, `03_insurance_card.png`, `04_multipage_lab_report.pdf`).
- **Simulated Worker Result:** If `ocrWorkerClient` was null or disconnected, the service synthesized a fake clinical report with `patientName: "John Doe"`, `MRN: "MRN-987654"`, `Test Name: "Complete Blood Count (CBC)"`, `Hemoglobin: 14.5 g/dL`, and marked the job `COMPLETED`.
- **Silent Worker Error Masking:** If the PaddleOCR worker returned `success: false`, the error was not propagated; the job was extracted as if successful.

### 1.2 In `AiOcrService.extractDocument`:
- **Demo File Fallback:** If `imageUrl` could not be resolved, it defaulted to `ocr-poc/sample_docs/01_lab_report.png`.
- **Hardcoded Clinician:** If the OCR worker was missing, it returned synthetic CBC lab report text and hardcoded `prescribedBy: "Dr. John Watson"`.

### 1.3 In `InsuranceService.scanInsuranceCard`:
- **Default Sample Card URL:** If neither a file nor `imageUrl` was provided, it defaulted to `https://storage.healthvault360.com/cards/sample-insurance-card.jpg`.
- **Simulated Policy Data:** When the worker client was absent, it generated synthetic data with `providerName: "Blue Shield OCR Candidate"`, `policyNumber: "POL987654321"`, `isSimulated: true`.
- **Bundled Card Image:** When an image wasn't on disk, it read `ocr-poc/sample_docs/03_insurance_card.png`.
- **Static Fallback Values:** Extracted fields fell back to hardcoded strings `'Blue Shield Premier Health'`, `'BS-88492019'`, `'Office $20, Specialist $40, ER $150'`.

---

## 2. R4 Remediation Implemented

### 2.1 OCR Module (`ocr.service.ts`)
- **Strict File Resolution:** Removed all references to `ocr-poc/sample_docs/` from `processJobLocalPipeline`. If neither `resolvedFilePath` nor `fileBuffer` can be resolved, the pipeline throws `NotFoundException` and persists status `FAILED` with an explicit failure reason in the database:
  ```typescript
  if (!resolvedFilePath && !fileBuffer) {
    const errMsg = `Source document file for medical attachment '${job.medicalAttachmentId}' could not be resolved from storage or disk.`;
    const durationMs = Date.now() - startTime;
    await this.ocrRepository.updateJobStatus(jobId, 'FAILED', 0.0, 'LOW', durationMs, errMsg);
    throw new NotFoundException(errMsg);
  }
  ```
- **Mandatory Worker Client:** Removed synthetic John Doe object. If `ocrWorkerClient` is null or disconnected:
  ```typescript
  const errMsg = 'OCR worker client service is unavailable. Cannot process document.';
  await this.ocrRepository.updateJobStatus(jobId, 'FAILED', 0.0, 'LOW', durationMs, errMsg);
  throw new ServiceUnavailableException(errMsg);
  ```
- **Explicit Worker Error Handling:** If `!workerResult.success`:
  ```typescript
  const errMsg = workerResult.error || 'OCR worker reported failure processing document.';
  await this.ocrRepository.updateJobStatus(jobId, 'FAILED', 0.0, 'LOW', durationMs, errMsg);
  throw new ServiceUnavailableException(errMsg);
  ```

### 2.2 AI OCR Module (`ai-ocr.service.ts`)
- Removed sample fallback `01_lab_report.png`. Throws `BadRequestException` if remote/local image cannot be resolved.
- Removed synthetic worker fallback. Throws `ServiceUnavailableException` if worker is unavailable.
- Throws `ServiceUnavailableException` if worker returns `success: false`.
- Removed hardcoded fallback `'Dr. John Watson'`. If no prescribing doctor field is extracted from genuine OCR tokens, `prescribedBy` is set to `undefined`.

### 2.3 Insurance Module (`insurance.service.ts`)
- Requires genuine file upload or valid `imageUrl`. Throws `BadRequestException` if both are absent.
- Removed `sample-insurance-card.jpg` and `sample_docs/03_insurance_card.png`.
- Removed simulated policy details (`isSimulated: true`, `Blue Shield Premier Health`).
- Requires `ocrWorkerClient`. Throws `ServiceUnavailableException` if worker is absent.
- If extracted fields are missing from the scanned card, fields default to empty strings (`''`) rather than fabricated insurance policies.

---

## 3. Test Evidence

- `ocr-authorization-and-fallbacks.spec.ts`:
  - `should throw NotFoundException and mark job FAILED when source attachment file does not exist (zero synthetic sample doc fallback)` -> **PASSED**
  - `should throw ServiceUnavailableException and mark job FAILED when OCR worker client is not provided (zero synthetic John Doe fallback)` -> **PASSED**
  - `should throw ServiceUnavailableException and mark job FAILED when OCR worker reports success: false` -> **PASSED**
- `ai-ocr.service.spec.ts`:
  - `should throw BadRequestException if source image cannot be resolved (no synthetic fallback)` -> **PASSED**
  - `should throw ServiceUnavailableException if OCR worker client is not provided` -> **PASSED**
  - `should throw ServiceUnavailableException if OCR worker returns success: false` -> **PASSED**
- `insurance.service.spec.ts`:
  - `should allow valid OCR scan and return real candidate extraction with zero simulated fallbacks` -> **PASSED**
  - `should throw ServiceUnavailableException if OCR worker client is not provided` -> **PASSED**
  - `should throw BadRequestException if neither file nor imageUrl is provided` -> **PASSED**
