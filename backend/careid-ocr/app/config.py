import os
import tempfile
from typing import Set

class OCRConfig:
    # Server Binding
    HOST: str = os.getenv("CAREID_OCR_HOST", "0.0.0.0")
    PORT: int = int(os.getenv("CAREID_OCR_PORT", "5050"))
    INTERNAL_SECRET: str = os.getenv("CAREID_OCR_SECRET", "")
    
    # Engine & Models
    OCR_VERSION: str = os.getenv("CAREID_OCR_ENGINE_VERSION", "PP-OCRv4")
    ARCHITECTURE: str = "PP-OCRv4_mobile_det + en_PP-OCRv4_mobile_rec"
    LANG: str = os.getenv("CAREID_OCR_LANG", "en")
    CPU_THREADS: int = int(os.getenv("PADDLE_PDX_CPU_NUM_THREADS", os.getenv("CAREID_OCR_CPU_THREADS", "4")))
    PDF_DPI: int = int(os.getenv("CAREID_OCR_PDF_DPI", "150"))
    DET_THRESH: float = float(os.getenv("CAREID_OCR_DET_THRESH", "0.2"))
    BOX_THRESH: float = float(os.getenv("CAREID_OCR_BOX_THRESH", "0.4"))
    REC_BATCH_SIZE: int = int(os.getenv("CAREID_OCR_REC_BATCH_SIZE", "6"))
    USE_ORIENTATION: bool = True
    
    # Safety Limits & Timeouts
    MAX_CONCURRENCY: int = int(os.getenv("CAREID_OCR_MAX_CONCURRENCY", "2"))
    TIMEOUT_SECONDS: int = int(os.getenv("CAREID_OCR_TIMEOUT_SECONDS", "180"))
    MAX_FILE_SIZE_BYTES: int = int(os.getenv("CAREID_OCR_MAX_FILE_SIZE_MB", "50")) * 1024 * 1024
    MAX_PAGES: int = int(os.getenv("CAREID_OCR_MAX_PAGES", "50"))
    ALLOWED_EXTENSIONS: Set[str] = {".pdf", ".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff"}
    
    # Storage
    TEMP_DIR: str = os.getenv("CAREID_OCR_TEMP_DIR", os.path.join(tempfile.gettempdir(), "careid-ocr-tmp"))
    
    # Application Metadata
    APP_NAME: str = "CareID-Persistent-PaddleOCR"
    APP_VERSION: str = "1.2.0"

config = OCRConfig()

