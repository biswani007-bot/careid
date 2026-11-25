# CAREID MASTER BACKEND — OCR & SECURITY REGRESSION REPORT

**Document ID:** CRID-DOC-REM-07  
**Subsystems Audited:** OCR Worker Integration, Authentication & Rate Limiting, File Security & Upload Boundaries  
**Target Environment:** Staging (`https://360api.vnvision.in/api/v1`)  

---

## 1. OCR Worker Client & Format Boundary Enforcement

### Supported Extensions & Formats
In `src/modules/ocr/application/use-cases/ocr.service.ts`:
Line 456 strictly enforces:
```typescript
const allowedExtensions = ['.png', '.jpg', '.jpeg', '.tiff', '.tif', '.bmp', '.webp', '.pdf'];
if (ext && !allowedExtensions.includes(ext)) {
  const errMsg = `Unsupported file format '${ext}'. OCR engine only supports standard image files (PNG, JPG, TIFF, BMP, WEBP) and PDF documents.`;
  await this.ocrRepository.updateJobStatus(jobId, 'FAILED', 0.0, 'LOW', durationMs, errMsg);
  throw new BadRequestException(errMsg);
}
```
All other file types (e.g. `.exe`, `.sh`, `.docx`, `.zip`) are rejected with HTTP 400 Bad Request before invoking the remote worker.

### Reprocessing Failure Reason Auto-Nullification
When a previously failed OCR job is reprocessed via `POST /api/v1/ocr/jobs/:id/reprocess`:
```typescript
await this.ocrRepository.updateJobStatus(job.id, 'PROCESSING', 0.0, 'LOW', 0, null);
```
Setting `failureReason` to `null` ensures that historical error messages are cleared and do not persist into the newly processed document.

### Worker Authentication & Timeouts
The OCR client communicates with the standalone PaddleOCR worker at `https://careidocr.dokaan.in` via `POST /internal/ocr/process` using:
- Header: `X-CareID-Internal-Secret: <CAREID_OCR_SECRET>`
- AbortSignal timeout: 30,000 ms (30 seconds)
- Non-blocking error handling: Worker unavailability gracefully marks the job as `FAILED` without crashing NestJS.

---

## 2. Security Subsystems & Anti-Regression Verification

### Authentication & OTP Controls
- **Production Mode:** `NODE_ENV=production` is strictly enforced.
- **Controlled Staging OTP:** Test OTP (`123456`) is activated ONLY when `ENABLE_TEST_OTP=true` AND the incoming phone number matches an explicit entry in `TEST_PHONE_NUMBERS`.
- **Wildcard Prohibited:** Wildcards (`*`) and empty allowlists are strictly rejected.
- **No OTP Leakage:** OTP values are never returned in HTTP responses or written to production logs.

### Proxy Trust Security (`ProxyTrustConfig`)
- Direct boolean values (`true`, `false`) and wildcards (`*`, `all`, `any`) in `TRUST_PROXY` are rejected.
- Overly broad CIDR blocks (`0.0.0.0/0`, `10.0.0.0/8`, `192.168.0.0/16`) are rejected, defaulting securely to `'loopback'`.
- Verified by unit tests in `src/modules/auth/tests/proxy-trust.spec.ts`.

### File Security & Upload Boundary Validation
In `src/common/utils/file-security.util.ts`:
- Magic byte validation prevents MIME-type spoofing (e.g. executable disguised as PNG).
- Directory traversal attacks (`../../`) and null-byte injection (`\0`) in storage keys are rejected with HTTP 400.
- SSRF prevention blocks cloud metadata IP addresses (`169.254.169.254`, `metadata.google.internal`) and local loopback URIs (`file:///etc/passwd`).
- Verified by unit tests in `src/common/utils/tests/file-security.util.spec.ts`.

---
**Verified By:** Healthcare Security Auditor  
**Status:** ALL CONTROLS VERIFIED & HARDENED
