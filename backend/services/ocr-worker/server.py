import os
import sys
import time
import uuid
import psutil
import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from aiohttp import web

from config import config
from engine import PersistentPaddleOCREngine

# Setup structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("careid-ocr-worker")

# Ensure temporary directory exists
os.makedirs(config.TEMP_DIR, exist_ok=True)

# Initialize persistent OCR engine and state
START_TIME = time.time()
process_tracker = psutil.Process(os.getpid())
ocr_engine: PersistentPaddleOCREngine = None
thread_pool = ThreadPoolExecutor(max_workers=config.MAX_CONCURRENCY, thread_name_prefix="OcrWorker")
semaphore: asyncio.Semaphore = None
active_requests_count = 0

@web.middleware
async def auth_middleware(request: web.Request, handler):
    # Check internal API secret for protected routes
    if request.path.startswith("/internal/"):
        secret_header = request.headers.get("X-CareID-Internal-Secret")
        if not config.INTERNAL_SECRET or not secret_header or secret_header != config.INTERNAL_SECRET:
            logger.warning(f"Unauthorized access attempt to {request.path} from {request.remote}")
            return web.json_response(
                {
                    "success": False,
                    "error": "Unauthorized",
                    "message": "Invalid or missing X-CareID-Internal-Secret authentication header."
                },
                status=401
            )
    return await handler(request)

async def handle_health(request: web.Request) -> web.Response:
    global active_requests_count
    mem_info = process_tracker.memory_info()
    rss_mb = round(mem_info.rss / (1024 * 1024), 2)
    peak_mb = round(getattr(mem_info, "peak_wset", mem_info.rss) / (1024 * 1024), 2)
    uptime_sec = round(time.time() - START_TIME, 2)

    return web.json_response({
        "status": "ok",
        "worker": "CareID-Persistent-PaddleOCR",
        "engineReady": ocr_engine is not None,
        "ocrVersion": config.OCR_VERSION,
        "architecture": "PP-OCRv4_mobile_det + en_PP-OCRv4_mobile_rec",
        "uptimeSeconds": uptime_sec,
        "residentRamMb": rss_mb,
        "peakWorkingSetMb": peak_mb,
        "activeRequests": active_requests_count,
        "maxConcurrency": config.MAX_CONCURRENCY,
        "cpuThreads": config.CPU_THREADS,
        "pdfDpi": config.PDF_DPI
    })

async def handle_process_ocr(request: web.Request) -> web.Response:
    global active_requests_count, semaphore
    file_path = None
    is_temp_file = False
    document_type = "GENERIC"
    pdf_dpi = config.PDF_DPI

    try:
        content_type = request.content_type.lower() if request.content_type else ""

        if "multipart/form-data" in content_type:
            reader = await request.multipart()
            part = await reader.next()
            temp_ext = ".bin"

            while part is not None:
                if part.name == "file":
                    orig_filename = part.filename or "upload.png"
                    temp_ext = os.path.splitext(orig_filename)[1].lower()
                    temp_filename = f"upload_{uuid.uuid4().hex}{temp_ext}"
                    file_path = os.path.join(config.TEMP_DIR, temp_filename)
                    is_temp_file = True

                    with open(file_path, "wb") as f:
                        while True:
                            chunk = await part.read_chunk()
                            if not chunk:
                                break
                            f.write(chunk)
                elif part.name == "documentType":
                    document_type = (await part.text()).strip()
                elif part.name == "pdfDpi":
                    try:
                        pdf_dpi = int((await part.text()).strip())
                    except ValueError:
                        pass
                part = await reader.next()

            if not file_path or not os.path.exists(file_path):
                return web.json_response(
                    {"success": False, "error": "BadRequest", "message": "No valid 'file' part received in form-data."},
                    status=400
                )
        else:
            try:
                body = await request.json()
            except Exception:
                return web.json_response(
                    {"success": False, "error": "BadRequest", "message": "Invalid JSON payload or missing content type."},
                    status=400
                )

            file_path = body.get("filePath")
            document_type = body.get("documentType", "GENERIC")
            pdf_dpi = body.get("pdfDpi", config.PDF_DPI)

            if not file_path:
                return web.json_response(
                    {"success": False, "error": "BadRequest", "message": "Missing required 'filePath' parameter in JSON."},
                    status=400
                )

        # Enforce controlled concurrency via semaphore
        async with semaphore:
            active_requests_count += 1
            loop = asyncio.get_running_loop()
            try:
                logger.info(f"Dispatching OCR extraction for {file_path} (docType: {document_type}, DPI: {pdf_dpi})")
                ocr_result = await asyncio.wait_for(
                    loop.run_in_executor(thread_pool, ocr_engine.process_file, file_path, pdf_dpi),
                    timeout=config.TIMEOUT_SECONDS
                )

                response_payload = {
                    "success": True,
                    "documentType": document_type,
                    "sourceFile": os.path.basename(file_path) if is_temp_file else file_path,
                    **ocr_result
                }
                return web.json_response(response_payload)

            except FileNotFoundError as e:
                return web.json_response({"success": False, "error": "NotFound", "message": str(e)}, status=404)
            except ValueError as e:
                return web.json_response({"success": False, "error": "UnsupportedFormat", "message": str(e)}, status=400)
            except asyncio.TimeoutError:
                logger.error(f"OCR processing timed out after {config.TIMEOUT_SECONDS} seconds: {file_path}")
                return web.json_response(
                    {"success": False, "error": "Timeout", "message": f"OCR processing exceeded {config.TIMEOUT_SECONDS}s limit."},
                    status=504
                )
            except Exception as e:
                logger.exception(f"Unhandled error during OCR execution: {e}")
                return web.json_response({"success": False, "error": "InternalServerError", "message": str(e)}, status=500)
            finally:
                active_requests_count -= 1

    finally:
        # Securely clean up any temporary uploaded file
        if is_temp_file and file_path and os.path.exists(file_path):
            try:
                os.remove(file_path)
                logger.info(f"Securely scrubbed temporary file: {file_path}")
            except Exception as e:
                logger.warning(f"Failed to scrub temporary file {file_path}: {e}")

async def create_app() -> web.Application:
    global ocr_engine, semaphore
    logger.info("Initializing CareID Persistent OCR Worker Application...")
    ocr_engine = PersistentPaddleOCREngine()
    ocr_engine.warmup()
    semaphore = asyncio.Semaphore(config.MAX_CONCURRENCY)

    app = web.Application(middlewares=[auth_middleware], client_max_size=50 * 1024 * 1024)
    app.router.add_get("/health", handle_health)
    app.router.add_post("/internal/ocr/process", handle_process_ocr)
    return app

def main():
    logger.info(f"Starting CareID OCR Worker on http://{config.HOST}:{config.PORT}")
    app = asyncio.run(create_app())
    web.run_app(app, host=config.HOST, port=config.PORT, print=None)

if __name__ == "__main__":
    main()

