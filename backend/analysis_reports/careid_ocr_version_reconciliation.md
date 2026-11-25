# CAREID OCR VERSION RECONCILIATION REPORT

**Date:** November 10, 2026  
**Auditor:** Antigravity Forensic Engineering  
**Scope:** OCR Worker Service Architecture & Python Runtime Dependencies  
**Component:** `services/ocr-worker/` & NestJS OCR Client Integration  
**Status:** **RECONCILED & COMPATIBLE**

---

## 1. OBJECTIVE & RECONCILIATION SUMMARY

Historical reports in the repository contained conflicting claims regarding the OCR engine versioning, variously referencing "PaddleOCR 3.7.0", "PaddleOCR v4", and "PaddlePaddle 3.0.0". 

A complete forensic inspection of `services/ocr-worker/requirements.txt`, `services/ocr-worker/server.py`, `services/ocr-worker/engine.py`, and `src/modules/ocr/infrastructure/clients/ocr-worker.client.ts` was performed.

### Findings Summary:
- **PyPI Library Package:** `paddleocr==2.7.3`
- **Deep Learning Framework:** `paddlepaddle>=2.5.0`
- **OCR Model Architecture:** `PP-OCRv4` (PaddleOCR v4 mobile/server model series)
- **Root Cause of Discrepancy:** Previous documentation conflated the **model architecture generation** (`PP-OCRv4`) with the **Python package distribution version** (`paddleocr 2.7.3`), creating fictitious references to "PaddleOCR 3.7.0".
- **Reconciliation Verdict:** The current codebase and worker implementation are **100% syntactically and architecturally valid**. PaddleOCR `2.7.3` is the official, stable release engineered specifically to load and execute `PP-OCRv4` models.

---

## 2. PYTHON RUNTIME DEPENDENCY AUDIT

Inspection of `services/ocr-worker/requirements.txt`:

```text
aiohttp>=3.9.0
paddleocr==2.7.3
paddlepaddle>=2.5.0
PyMuPDF>=1.23.0
Pillow>=10.0.0
numpy>=1.24.0
python-dotenv>=1.0.0
```

### Dependency Analysis:
1. **`paddleocr==2.7.3`**: The official Baidu PaddleOCR Python client library. It provides native support for `PP-OCRv4` text detection and recognition algorithms.
2. **`paddlepaddle>=2.5.0`**: The core execution engine. Python 3.10 / 3.11 environments should run PaddlePaddle `2.5.2` or `2.6.x`. (PaddlePaddle 3.0 is currently in pre-release/beta and is NOT required or recommended for production stability).
3. **`aiohttp>=3.9.0`**: Asynchronous HTTP web framework powering the REST worker server on port 5050.
4. **`PyMuPDF>=1.23.0` (fitz)**: High-speed rasterization of PDF medical records into image buffers before feeding to the OCR pipeline.
5. **`Pillow>=10.0.0` & `numpy>=1.24.0`**: Image preprocessing, cropping, and array manipulation.
6. **`python-dotenv>=1.0.0`**: Environment variable loading for internal secret verification.

---

## 3. ENGINE IMPLEMENTATION VERIFICATION

Inspection of `services/ocr-worker/engine.py`:

```python
self.ocr = paddleocr.PaddleOCR(
    use_angle_cls=True,
    lang='en',
    ocr_version='PP-OCRv4'
)
```

- **Orientation Classification:** `use_angle_cls=True` ensures that rotated medical scans (e.g. tilted ECGs, angiogram reports, prescriptions) are automatically corrected.
- **Language Mode:** `lang='en'` utilizes the optimized English/Latin character set.
- **Model Version Specification:** `ocr_version='PP-OCRv4'` instructs PaddleOCR 2.7.3 to fetch and execute the 4th generation convolutional-transformer text detection (`ch_PP-OCRv4_det`) and text recognition (`ch_PP-OCRv4_rec`) models.

---

## 4. INTEGRATION & AUTHENTICATION PROTOCOL

The NestJS backend communicates with the Python worker via `OcrWorkerClient` (`src/modules/ocr/infrastructure/clients/ocr-worker.client.ts`):

- **Default Endpoint:** `http://localhost:5050/api/v1/ocr/process`
- **Authentication Header:** `X-CareID-Internal-Secret`
- **Payload Schema:** `multipart/form-data` with `file` buffer and `jobId` parameter.
- **Security Validation:** Both the NestJS client and the Python worker read `OCR_INTERNAL_SECRET` from environment variables. If headers do not match, the worker returns HTTP 401 Unauthorized, preventing unauthorized intranet access.

---

## 5. VERSION RECONCILIATION MATRIX

| Parameter | Historical Claim | Actual Verified Implementation | Reconciliation Status |
| :--- | :--- | :--- | :--- |
| **Python Library** | PaddleOCR 3.7.0 / v4 | `paddleocr==2.7.3` | **RESOLVED** (Conflation corrected) |
| **Model Weights** | PP-OCRv4 | `PP-OCRv4` | **VERIFIED** |
| **Paddle Engine** | PaddlePaddle 3.0.0 | `paddlepaddle>=2.5.0` | **RESOLVED** (Targeting 2.5.2/2.6.x) |
| **Worker Framework** | FastStream / Flask | `aiohttp` on port `5050` | **VERIFIED** |
| **PDF Extraction** | pdf2image (poppler) | `PyMuPDF` (fitz) | **VERIFIED** (No poppler binary dep needed) |
| **Auth Scheme** | Custom token | `X-CareID-Internal-Secret` | **VERIFIED** |

---

## 6. RECOMMENDATIONS FOR DEPLOYMENT

1. **Python Virtual Environment:** Always deploy the worker inside an isolated virtual environment (`python -m venv venv_ocr`) to prevent conflicts with system Python packages.
2. **Model Cache Staging:** Upon initial boot, PaddleOCR downloads PP-OCRv4 model weights to `~/.paddleocr/`. Ensure the aaPanel deployment directory has outbound HTTPS access to download model checkpoints, or pre-bundle the model weights directory during package packaging.

