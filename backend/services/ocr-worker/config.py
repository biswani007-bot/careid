import os

# Load root .env file if environment variables are not pre-set
if not os.getenv("CAREID_OCR_SECRET"):
    root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    env_path = os.path.join(root_dir, ".env")
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, _, val = line.partition("=")
                    key = key.strip()
                    val = val.strip().strip("'\"")
                    if key and key not in os.environ:
                        os.environ[key] = val

class WorkerConfig:
    HOST: str = os.getenv("CAREID_OCR_HOST", "127.0.0.1")
    PORT: int = int(os.getenv("CAREID_OCR_PORT", "5050"))
    INTERNAL_SECRET: str = os.getenv("CAREID_OCR_SECRET", "")
    
    # Engine Settings
    OCR_VERSION: str = "PP-OCRv4"
    CPU_THREADS: int = int(os.getenv("PADDLE_PDX_CPU_NUM_THREADS", "4"))
    PDF_DPI: int = int(os.getenv("CAREID_OCR_PDF_DPI", "150"))
    DET_THRESH: float = float(os.getenv("CAREID_OCR_DET_THRESH", "0.2"))
    BOX_THRESH: float = float(os.getenv("CAREID_OCR_BOX_THRESH", "0.4"))
    REC_BATCH_SIZE: int = int(os.getenv("CAREID_OCR_REC_BATCH_SIZE", "6"))
    USE_ORIENTATION: bool = True
    
    # Concurrency & Timeouts
    MAX_CONCURRENCY: int = int(os.getenv("CAREID_OCR_MAX_CONCURRENCY", "2"))
    TIMEOUT_SECONDS: int = int(os.getenv("CAREID_OCR_TIMEOUT_SECONDS", "180"))
    
    # Storage
    BASE_DIR: str = os.path.dirname(os.path.abspath(__file__))
    TEMP_DIR: str = os.path.join(BASE_DIR, "tmp")

config = WorkerConfig()
