#!/usr/bin/env python3
"""
CareID Enterprise OCR — Model Pre-caching & Verification Script
Downloads PP-OCRv4 Mobile models during installation to ensure offline operation
and zero cold-start latency in production.
"""

import os
import sys
import time
import numpy as np
from PIL import Image

# Enforce Paddle environment flags
os.environ["FLAGS_use_mkldnn"] = "0"
os.environ["PADDLE_PDX_ENABLE_MKLDNN_BYDEFAULT"] = "0"
os.environ["PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK"] = "True"
os.environ["PADDLE_PDX_CPU_NUM_THREADS"] = "4"

def main():
    print("=" * 60)
    print("CareID OCR: Pre-caching and Initializing PP-OCRv4 Models...")
    print("=" * 60)

    try:
        from paddleocr import PaddleOCR
    except ImportError as e:
        print(f"Error: PaddleOCR is not installed in the active environment: {e}")
        sys.exit(1)

    t0 = time.time()
    try:
        ocr = PaddleOCR(
            ocr_version="PP-OCRv4",
            text_det_thresh=0.2,
            text_det_box_thresh=0.4,
            text_recognition_batch_size=6,
            use_doc_orientation_classify=True,
            use_doc_unwarping=False,
            use_textline_orientation=True,
            lang="en"
        )
        init_duration = round((time.time() - t0), 2)
        print(f"✓ Model weights downloaded and cached in {init_duration}s")

        print("Executing model verification pass...")
        dummy_img = Image.new("RGB", (200, 60), color=(255, 255, 255))
        np_dummy = np.array(dummy_img)
        res = ocr.ocr(np_dummy)
        print("✓ Model inference engine verified successfully!")
        print("✓ All PP-OCRv4 models are ready for production deployment.")
        sys.exit(0)

    except Exception as e:
        print(f"✗ Failed to download or verify PaddleOCR models: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()

