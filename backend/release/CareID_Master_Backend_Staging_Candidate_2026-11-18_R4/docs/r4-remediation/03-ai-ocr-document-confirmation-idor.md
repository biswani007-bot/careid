# CareID R4 Remediation: AI OCR Document Confirmation IDOR Guard

**Document ID:** `CAREID-R4-DOC-03`  
**Security Severity:** HIGH (CWE-639 - Authorization Bypass via User-Controlled Key)  
**Target Subsystem:** AI OCR Module (`src/modules/ai-ocr`)  
**Status:** IMPLEMENTED & VERIFIED  

---

## 1. Vulnerability Analysis & Root Cause

In the R3 baseline, endpoint `POST /api/v1/ai/ocr/confirm` allowed any patient to review, overwrite, and permanently confirm clinical extraction data belonging to any other patient across the database:

### Vulnerable Implementation in R3 (`AiOcrService.confirmOcr`):
```typescript
async confirmOcr(userId: string, dto: AiOcrConfirmDto): Promise<AiOcrConfirmResponseDto> {
  const profile = await this.aiOcrRepository.findProfileByUserId(userId);
  if (!profile) {
    throw new NotFoundException('Patient profile not found');
  }

  const doc = await this.aiOcrRepository.findDocumentById(dto.documentId);
  if (!doc) {
    throw new NotFoundException('OCR Document not found');
  }

  if (doc.status === 'CONFIRMED') {
    throw new BadRequestException('OCR Document has already been confirmed');
  }

  await this.aiOcrRepository.createReview(dto.documentId, dto.confirmedData);
  await this.aiOcrRepository.updateDocumentStatus(dto.documentId, 'CONFIRMED');
...
```

### Exploit Scenario:
1. `Patient A` (`userId: 'user-a'`, `profile.id: 'profile-a'`) submits a confirmation request with `dto.documentId = 'doc-b'` (belonging to `profile-b`).
2. The service verified that `Patient A` had a valid profile (`profile.id`), and verified that `doc-b` existed.
3. Crucially, the service **never compared** `doc.patientProfileId` with `profile.id`.
4. As a result, `Patient A` could hijack and confirm `Patient B`'s medical lab reports and prescriptions, injecting forged medication dosages or clinical notes into `Patient B`'s health records.

---

## 2. R4 Engineering Solution

### 2.1 Multi-Tenant Ownership Enforcement
Updated `AiOcrService.confirmOcr` in `src/modules/ai-ocr/application/use-cases/ai-ocr.service.ts`:
- Accepts `roles: string[] = []` from caller authentication context.
- For non-administrative callers, explicitly enforces:
  ```typescript
  if (!isAdmin) {
    const profile = await this.aiOcrRepository.findProfileByUserId(userId);
    if (!profile) {
      throw new NotFoundException('Patient profile not found');
    }

    if (doc.patientProfileId !== profile.id) {
      throw new ForbiddenException('Access denied: You do not have permission to confirm this OCR document');
    }
  }
  ```
- Retains protection against duplicate confirmation:
  ```typescript
  if (doc.status === 'CONFIRMED') {
    throw new BadRequestException('OCR Document has already been confirmed');
  }
  ```

### 2.2 Controller Integration
Updated `AiOcrController.confirmOcr` in `src/modules/ai-ocr/presentation/controllers/ai-ocr.controller.ts`:
- Extracts caller roles from `req.user.roles` or `req.user.role`.
- Passes roles to `this.aiOcrService.confirmOcr(req.user.userId, dto, roles)`.

---

## 3. Test Evidence

Implemented in `src/modules/ai-ocr/tests/ai-ocr.service.spec.ts`:
- `should forbid non-owner patient from confirming another patient OCR document` -> **PASSED (403 Forbidden)**
- `should allow owner patient to confirm own OCR document` -> **PASSED (200 OK, status updated to CONFIRMED)**
- `should allow admin to confirm any OCR document without matching patient profile` -> **PASSED (200 OK)**
- `should throw BadRequestException if document is already confirmed` -> **PASSED (400 Bad Request)**
