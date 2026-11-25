# CareID R4 Remediation: File Security, Magic Bytes & SSRF Upload Validation

**Document ID:** `CAREID-R4-DOC-05`  
**Security Standards:** OWASP File Upload Security Cheat Sheet / CWE-434 / CWE-918 / CWE-22  
**Implementation Files:**
- `src/common/utils/file-security.util.ts`
- `src/modules/insurance/application/use-cases/insurance.service.ts`
- `src/modules/attachments/application/use-cases/attachment.service.ts`  
**Status:** VERIFIED & COMPLIANT  

---

## 1. Security Architecture & Controls

Medical file uploads in the CareID ecosystem represent a critical security boundary. Healthcare environments are frequent targets of malicious file payloads disguised as legitimate medical imaging, laboratory documents, or insurance policies.

The R4 backend enforces a comprehensive 7-tier defense-in-depth security model on all file processing operations:

```
[Incoming Upload / URL]
         │
         ▼
[Tier 1: Extension Whitelist & Blacklist] (Blocks .exe, .sh, .bat, .php, etc.)
         │
         ▼
[Tier 2: MIME Type Whitelist & Verification] (Must match extension)
         │
         ▼
[Tier 3: Strict Size Limit Ceiling] (15MB attachments, 10MB insurance cards)
         │
         ▼
[Tier 4: Path Traversal Sanitization] (Rejects `../`, absolute paths, null bytes)
         │
         ▼
[Tier 5: Magic Bytes Binary Inspection] (Validates %PDF, PNG, JFIF, WEBP headers)
         │
         ▼
[Tier 6: SSRF & Cloud Metadata Protection] (Blocks 169.254.169.254, loopback, private IPs)
         │
         ▼
[Tier 7: Sanitized Atomic Storage & Cleanup] (Cryptographically random filenames, unlinks on DB failure)
```

---

## 2. Magic Bytes Binary Header Verification

The backend inspects the actual initial bytes of uploaded file buffers via `validateDocumentBuffer` in `src/common/utils/file-security.util.ts`. Files with spoofed MIME headers or extensions are rejected before hitting disk or worker:

| Format | Expected Magic Byte Sequence | Hex Signature |
|---|---|---|
| **PDF** | `%PDF` | `25 50 44 46` |
| **PNG** | `\x89PNG\r\n\x1a\n` | `89 50 4E 47 0D 0A 1A 0A` |
| **JPEG** | `\xFF\xD8\xFF` | `FF D8 FF` |
| **WEBP** | `RIFF....WEBP` | `52 49 46 46 .... 57 45 42 50` |
| **TIFF (LE)** | `II*\x00` | `49 49 2A 00` |
| **TIFF (BE)** | `MM\x00*` | `4D 4D 00 2A` |

Any file upload that does not match its genuine binary signature throws:
`BadRequestException('File contents do not match a valid document or image format')`

---

## 3. SSRF & Cloud Metadata Protection

When processing external image URLs (`dto.imageUrl`), `validateSafeUrl` ensures requests cannot target internal infrastructure:

1. **Protocol Restriction:** Only `http:` and `https:` protocols are permitted (`file:`, `gopher:`, `ftp:` are rejected).
2. **Cloud Metadata IP Blocks:**
   - `169.254.169.254` (AWS, GCP, Azure Instance Metadata Service)
   - `metadata.google.internal` (GCP metadata host)
   - `100.100.100.200` (Alibaba Cloud metadata host)
3. **Private IP & Loopback Blocks:**
   - `127.0.0.0/8`, `localhost`
   - `10.0.0.0/8`
   - `172.16.0.0/12`
   - `192.168.0.0/16`
   - `169.254.0.0/16` (Link-local)
4. **Port Restrictions:** Standard web ports only (`80`, `443`). High-risk internal ports (`22`, `3306`, `5432`, `6379`, `27017`, `9000`) are blocked.

---

## 4. Test Evidence

Implemented in `src/modules/insurance/tests/insurance.service.spec.ts`:
- `should throw BadRequestException if uploaded file exceeds 10MB limit` -> **PASSED**
- `should throw BadRequestException if file magic bytes are invalid` -> **PASSED**
- `should reject imageUrl pointing to private IP or cloud metadata` -> **PASSED**
- `should reject non-document and non-image file uploads` -> **PASSED**
- `should set private cache and security response headers when serving card file` -> **PASSED**
- `should delete newly written card file if database save fails` -> **PASSED**
