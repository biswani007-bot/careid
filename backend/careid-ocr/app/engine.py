import os
import sys
import time
import logging
from typing import Dict, Any, List
import numpy as np
from PIL import Image

from app.config import config

# Set Paddle environment flags before library load
os.environ["FLAGS_use_mkldnn"] = "0"
os.environ["PADDLE_PDX_ENABLE_MKLDNN_BYDEFAULT"] = "0"
os.environ["PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK"] = "True"
os.environ["PADDLE_PDX_CPU_NUM_THREADS"] = str(config.CPU_THREADS)

import pymupdf
from paddleocr import PaddleOCR

logger = logging.getLogger("careid-ocr-engine")

class PersistentPaddleOCREngine:
    def __init__(self):
        logger.info(
            f"Initializing Persistent PaddleOCR Engine: {config.OCR_VERSION} "
            f"(Threads: {config.CPU_THREADS}, BatchSize: {config.REC_BATCH_SIZE}, "
            f"DetThresh: {config.DET_THRESH}, BoxThresh: {config.BOX_THRESH})"
        )
        t0 = time.perf_counter()
        self.ocr = PaddleOCR(
            ocr_version=config.OCR_VERSION,
            text_det_thresh=config.DET_THRESH,
            text_det_box_thresh=config.BOX_THRESH,
            text_recognition_batch_size=config.REC_BATCH_SIZE,
            use_doc_orientation_classify=config.USE_ORIENTATION,
            use_doc_unwarping=False,
            use_textline_orientation=config.USE_ORIENTATION,
            lang=config.LANG
        )
        self.init_duration_ms = round((time.perf_counter() - t0) * 1000, 2)
        self.is_warmed_up = False
        logger.info(f"PaddleOCR models loaded into memory in {self.init_duration_ms} ms")

    def warmup(self):
        """Pre-compiles PIR execution graphs with a synthetic image to eliminate first-request cold latency."""
        logger.info("Executing engine warm-up pass...")
        t0 = time.perf_counter()
        dummy_img = Image.new("RGB", (200, 60), color=(255, 255, 255))
        np_dummy = np.array(dummy_img)
        _ = self.ocr.ocr(np_dummy)
        warmup_duration_ms = round((time.perf_counter() - t0) * 1000, 2)
        self.is_warmed_up = True
        logger.info(f"Engine warm-up pass complete in {warmup_duration_ms} ms. Engine is WARM.")

    def process_file(self, file_path: str, pdf_dpi: int = None) -> Dict[str, Any]:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Target document not found")

        dpi = pdf_dpi or config.PDF_DPI
        ext = os.path.splitext(file_path)[1].lower()
        if ext not in config.ALLOWED_EXTENSIONS:
            raise ValueError(f"Unsupported document format '{ext}'. Allowed: {sorted(list(config.ALLOWED_EXTENSIONS))}")

        t_start = time.perf_counter()
        pages: List[Dict[str, Any]] = []

        if ext == ".pdf":
            try:
                doc = pymupdf.open(file_path)
            except Exception as e:
                raise ValueError("Corrupted or unreadable PDF document")

            try:
                page_count = len(doc)
                if page_count > config.MAX_PAGES:
                    raise ValueError(f"Document exceeds maximum page limit of {config.MAX_PAGES} pages (found {page_count})")

                for page_num in range(page_count):
                    page = doc.load_page(page_num)
                    pix = page.get_pixmap(dpi=dpi)
                    img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                    np_img = np.array(img)
                    
                    res = self.ocr.ocr(np_img)
                    lines = self._extract_lines(res)
                    pages.append({
                        "pageNumber": page_num + 1,
                        "rawText": "\n".join(l["text"] for l in lines),
                        "lines": lines
                    })
                    # Free pixmap buffer memory immediately
                    del pix
                    del img
                    del np_img
            finally:
                doc.close()
        else:
            try:
                # Validate image can be opened
                with Image.open(file_path) as test_img:
                    test_img.verify()
            except Exception:
                raise ValueError("Corrupted or unreadable image document")

            res = self.ocr.ocr(file_path)
            lines = self._extract_lines(res)
            pages.append({
                "pageNumber": 1,
                "rawText": "\n".join(l["text"] for l in lines),
                "lines": lines
            })

        duration_ms = round((time.perf_counter() - t_start) * 1000, 2)
        all_confidences = [l["confidence"] for p in pages for l in p["lines"] if l.get("confidence") is not None]
        overall_conf = round(sum(all_confidences) / len(all_confidences), 4) if all_confidences else 0.0

        return {
            "pageCount": len(pages),
            "overallConfidence": overall_conf,
            "combinedText": "\n\n--- Page Break ---\n\n".join(p["rawText"] for p in pages),
            "pages": pages,
            "durationMs": duration_ms,
            "engine": f"{config.OCR_VERSION}-Mobile-CPU",
            "ocrVersion": config.OCR_VERSION
        }

    def _extract_lines(self, res) -> List[Dict[str, Any]]:
        lines = []
        if res and len(res) > 0 and res[0] is not None:
            first = res[0]
            if isinstance(first, dict):
                texts = first.get("rec_texts", [])
                scores = first.get("rec_scores", [])
                boxes = first.get("dt_polys", [])
                for i in range(len(texts)):
                    box = boxes[i].tolist() if hasattr(boxes[i], "tolist") else boxes[i] if i < len(boxes) else []
                    lines.append({
                        "text": texts[i].strip(),
                        "confidence": round(float(scores[i]) if i < len(scores) else 0.0, 4),
                        "box": box
                    })
            elif isinstance(first, list):
                for item in first:
                    if len(item) == 2 and isinstance(item[1], (tuple, list)):
                        box, (text, score) = item[0], item[1]
                        lines.append({
                            "text": text.strip(),
                            "confidence": round(float(score), 4),
                            "box": box
                        })
        return lines

