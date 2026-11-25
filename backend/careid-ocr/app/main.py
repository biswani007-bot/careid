import os
import sys
import time
import uuid
import psutil
import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Optional
from concurrent.futures import ThreadPoolExecutor

from fastapi import (
    FastAPI,
    Request,
    Response,
    Depends,
    UploadFile,
    File,
    Form,
    HTTPException,
    status
)
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from app.config import config
from app.schemas import (
    HealthResponse,
    ReadyResponse,
    VersionResponse,
    OcrProcessResponse,
    ProcessFileJsonRequest,
    ErrorResponse
)
from app.security import verify_internal_secret, sanitize_filename, log_phi_safe
from app.engine import PersistentPaddleOCREngine

# Setup structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("careid-ocr-main")

# Global state
START_TIME = time.time()
process_tracker = psutil.Process(os.getpid())
ocr_engine: Optional[PersistentPaddleOCREngine] = None
thread_pool: Optional[ThreadPoolExecutor] = None
semaphore: Optional[asyncio.Semaphore] = None
active_requests_count = 0

@asynccontextmanager
async def lifespan(app: FastAPI):
    global ocr_engine, thread_pool, semaphore
    logger.info("Starting CareID OCR Microservice...")
    os.makedirs(config.TEMP_DIR, exist_ok=True)
    
    # Initialize thread pool for CPU compute
    thread_pool = ThreadPoolExecutor(
        max_workers=config.MAX_CONCURRENCY,
        thread_name_prefix="OcrWorker"
    )
    semaphore = asyncio.Semaphore(config.MAX_CONCURRENCY)
    
    # Initialize engine and run warmup pass
    logger.info("Initializing persistent deep learning models...")
    ocr_engine = PersistentPaddleOCREngine()
    ocr_engine.warmup()
    
    logger.info(f"CareID OCR Microservice is READY on {config.HOST}:{config.PORT}")
    yield
    
    logger.info("Shutting down CareID OCR Microservice...")
    if thread_pool:
        thread_pool.shutdown(wait=True)

app = FastAPI(
    title="CareID Enterprise OCR Service",
    description="Standalone, high-performance PaddleOCR text extraction service for CareID Health Vault 360",
    version=config.APP_VERSION,
    lifespan=lifespan
)

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Formats all HTTPExceptions to match CareID error envelope standard."""
    detail = exc.detail
    if isinstance(detail, dict) and "error" in detail:
        return JSONResponse(status_code=exc.status_code, content=detail)
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": exc.__class__.__name__.replace("Exception", ""),
            "message": str(detail)
        }
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Custom validation error handler returning standard CareID envelope."""
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "success": False,
            "error": "BadRequest",
            "message": "Invalid request parameters or payload formatting."
        }
    )

@app.get("/health", response_model=HealthResponse, tags=["Observability"])
async def get_health():
    """
    Public observability health check required by CareID OcrWorkerClient.
    Reports memory, uptime, active requests, and model engine readiness.
    """
    mem_info = process_tracker.memory_info()
    rss_mb = round(mem_info.rss / (1024 * 1024), 2)
    peak_mb = round(getattr(mem_info, "peak_wset", mem_info.rss) / (1024 * 1024), 2)
    uptime_sec = round(time.time() - START_TIME, 2)

    return HealthResponse(
        status="ok",
        worker=config.APP_NAME,
        engineReady=ocr_engine is not None and getattr(ocr_engine, "is_warmed_up", False),
        ocrVersion=config.OCR_VERSION,
        architecture=config.ARCHITECTURE,
        uptimeSeconds=uptime_sec,
        residentRamMb=rss_mb,
        peakWorkingSetMb=peak_mb,
        activeRequests=active_requests_count,
        maxConcurrency=config.MAX_CONCURRENCY,
        cpuThreads=config.CPU_THREADS,
        pdfDpi=config.PDF_DPI
    )

@app.get("/ready", response_model=ReadyResponse, tags=["Observability"])
async def get_readiness():
    """
    Kubernetes / Load Balancer readiness probe.
    Returns 200 OK only when models are loaded and warmed up.
    """
    is_ready = ocr_engine is not None and getattr(ocr_engine, "is_warmed_up", False)
    if not is_ready:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "ready": False,
                "status": "Engine initializing or model weights loading",
                "modelLoaded": False
            }
        )
    return ReadyResponse(
        ready=True,
        status="OCR Engine loaded, warmed up, and accepting requests",
        modelLoaded=True
    )

@app.get(
    "/internal/ocr/version",
    response_model=VersionResponse,
    dependencies=[Depends(verify_internal_secret)],
    tags=["Internal OCR"]
)
async def get_version():
    """Returns protected internal engine version and runtime environment info."""
    return VersionResponse(
        version=config.APP_VERSION,
        ocrVersion=config.OCR_VERSION,
        architecture=config.ARCHITECTURE,
        pythonVersion=sys.version.split()[0]
    )

@app.post(
    "/internal/ocr/process",
    response_model=OcrProcessResponse,
    dependencies=[Depends(verify_internal_secret)],
    tags=["Internal OCR"]
)
async def process_ocr(
    request: Request,
    file: Optional[UploadFile] = File(None),
    documentType: Optional[str] = Form("GENERIC"),
    pdfDpi: Optional[int] = Form(150),
):
    """
    Core document OCR processing endpoint.
    Supports both:
      1. multipart/form-data: Binary file upload with documentType and pdfDpi form fields.
      2. application/json: JSON payload with filePath, documentType, and pdfDpi.
    Protected by X-CareID-Internal-Secret.
    """
    global active_requests_count, semaphore
    file_path = None
    is_temp_file = False
    source_filename = "document"
    doc_type = documentType or "GENERIC"
    dpi = pdfDpi or config.PDF_DPI

    try:
        content_type = request.headers.get("content-type", "").lower()

        # Handle Multipart Upload (Primary CareID Production Flow)
        if "multipart/form-data" in content_type:
            if not file or not file.filename:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "success": False,
                        "error": "BadRequest",
                        "message": "No valid 'file' part received in form-data payload."
                    }
                )

            orig_filename = sanitize_filename(file.filename)
            source_filename = orig_filename
            ext = os.path.splitext(orig_filename)[1].lower()

            if ext not in config.ALLOWED_EXTENSIONS:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "success": False,
                        "error": "UnsupportedFormat",
                        "message": f"Unsupported file extension '{ext}'. Allowed: {sorted(list(config.ALLOWED_EXTENSIONS))}"
                    }
                )

            temp_filename = f"upload_{uuid.uuid4().hex}{ext}"
            file_path = os.path.join(config.TEMP_DIR, temp_filename)
            is_temp_file = True

            # Stream chunks to temporary file and enforce size limits
            bytes_read = 0
            with open(file_path, "wb") as f:
                while True:
                    chunk = await file.read(1024 * 1024) # 1MB chunks
                    if not chunk:
                        break
                    bytes_read += len(chunk)
                    if bytes_read > config.MAX_FILE_SIZE_BYTES:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail={
                                "success": False,
                                "error": "PayloadTooLarge",
                                "message": f"Uploaded file exceeds maximum limit of {config.MAX_FILE_SIZE_BYTES // (1024 * 1024)}MB."
                            }
                        )
                    f.write(chunk)

            if bytes_read == 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "success": False,
                        "error": "BadRequest",
                        "message": "Uploaded file is empty (0 bytes)."
                    }
                )

        # Handle JSON Payload (Server-Local File Processing)
        else:
            try:
                body = await request.json()
            except Exception:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "success": False,
                        "error": "BadRequest",
                        "message": "Invalid JSON payload or missing content-type header."
                    }
                )

            file_path = body.get("filePath")
            doc_type = body.get("documentType", "GENERIC")
            dpi = body.get("pdfDpi", config.PDF_DPI)

            if not file_path:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "success": False,
                        "error": "BadRequest",
                        "message": "Missing required 'filePath' parameter in JSON."
                    }
                )

            source_filename = os.path.basename(file_path)
            if not os.path.exists(file_path):
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail={
                        "success": False,
                        "error": "NotFound",
                        "message": f"Specified document does not exist."
                    }
                )

        # Enforce concurrency semaphore
        if semaphore.locked() and active_requests_count >= config.MAX_CONCURRENCY:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "success": False,
                    "error": "TooManyRequests",
                    "message": "OCR worker is currently processing maximum concurrent jobs. Please retry."
                }
            )

        async with semaphore:
            active_requests_count += 1
            loop = asyncio.get_running_loop()
            t0 = time.perf_counter()

            try:
                log_phi_safe("OCR_START", doc_type, source_filename)
                
                # Execute CPU OCR inside thread pool with timeout enforcement
                ocr_result = await asyncio.wait_for(
                    loop.run_in_executor(
                        thread_pool,
                        ocr_engine.process_file,
                        file_path,
                        dpi
                    ),
                    timeout=config.TIMEOUT_SECONDS
                )

                elapsed_ms = round((time.perf_counter() - t0) * 1000, 2)
                log_phi_safe(
                    "OCR_SUCCESS",
                    doc_type,
                    source_filename,
                    duration_ms=elapsed_ms,
                    pages=ocr_result.get("pageCount")
                )

                return OcrProcessResponse(
                    success=True,
                    documentType=doc_type,
                    sourceFile=source_filename,
                    pageCount=ocr_result["pageCount"],
                    overallConfidence=ocr_result["overallConfidence"],
                    combinedText=ocr_result["combinedText"],
                    pages=ocr_result["pages"],
                    durationMs=ocr_result["durationMs"],
                    engine=ocr_result["engine"],
                    ocrVersion=ocr_result.get("ocrVersion", config.OCR_VERSION)
                )

            except FileNotFoundError:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail={"success": False, "error": "NotFound", "message": "Document file not found."}
                )
            except ValueError as e:
                log_phi_safe("OCR_VALIDATION_ERROR", doc_type, source_filename, error=str(e))
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={"success": False, "error": "UnsupportedFormat", "message": str(e)}
                )
            except asyncio.TimeoutError:
                log_phi_safe("OCR_TIMEOUT", doc_type, source_filename, error=f"Exceeded {config.TIMEOUT_SECONDS}s")
                raise HTTPException(
                    status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                    detail={"success": False, "error": "Timeout", "message": f"OCR processing exceeded {config.TIMEOUT_SECONDS}s limit."}
                )
            except Exception as e:
                logger.exception(f"Unhandled exception during OCR extraction: {e}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail={"success": False, "error": "InternalServerError", "message": "An unexpected error occurred during OCR extraction."}
                )
            finally:
                active_requests_count -= 1

    finally:
        # Securely scrub any temporary uploaded document file
        if is_temp_file and file_path and os.path.exists(file_path):
            try:
                os.remove(file_path)
                logger.debug(f"Scrubbed temporary file: {file_path}")
            except Exception as e:
                logger.warning(f"Failed to scrub temporary file {file_path}: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=config.HOST,
        port=config.PORT,
        log_level="info",
        reload=False
    )

