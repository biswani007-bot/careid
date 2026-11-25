"""
Standalone PaddleOCR Proof-of-Concept & Benchmark Suite
Processes images (PNG, JPG) and multi-page PDFs with:
- Page conversion via PyMuPDF
- Orientation classification and unwarping
- Line text detection, recognition, confidence scores
- Memory usage (RAM) and latency profiling
- Ground truth character/word level accuracy calculation
- Structured JSON output matching CareID DTO specifications
"""

import os
import sys

# Disable oneDNN / MKLDNN PIR conversion issue and bypass remote connectivity checks
os.environ["FLAGS_use_mkldnn"] = "0"
os.environ["PADDLE_PDX_ENABLE_MKLDNN_BYDEFAULT"] = "0"
os.environ['PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK'] = 'True'

import time
import json
import psutil
import pymupdf
from PIL import Image
import numpy as np
from paddleocr import PaddleOCR

class CareIDPaddleOCREngine:
    def __init__(self):
        print('[INIT] Initializing PaddleOCR CPU Engine...')
        self.ocr = PaddleOCR(
            use_doc_orientation_classify=True,
            use_doc_unwarping=False,
            use_textline_orientation=True,
            lang='en',
        )
        print('[INIT] PaddleOCR CPU Engine ready.')

    def process_image(self, image_input):
        """
        Runs OCR on a file path, PIL Image, or numpy array.
        Returns list of (box, text, score).
        """
        if isinstance(image_input, str):
            res = self.ocr.ocr(image_input)
        elif isinstance(image_input, Image.Image):
            np_img = np.array(image_input.convert('RGB'))
            res = self.ocr.ocr(np_img)
        elif isinstance(image_input, np.ndarray):
            res = self.ocr.ocr(image_input)
        else:
            raise ValueError(f"Unsupported image input type: {type(image_input)}")

        lines = []
        if res and len(res) > 0 and res[0] is not None:
            # Handle standard paddleocr output: [[[ [x,y]... ], (text, score)]...]
            # Or in paddlex 3.x dict format
            first_elem = res[0]
            if isinstance(first_elem, list):
                for item in first_elem:
                    if len(item) == 2 and isinstance(item[1], (tuple, list)):
                        box, (text, score) = item[0], item[1]
                        lines.append({
                            'text': text.strip(),
                            'confidence': round(float(score), 4),
                            'box': box
                        })
            elif isinstance(first_elem, dict):
                # Paddlex format
                rec_texts = first_elem.get('rec_texts', [])
                rec_scores = first_elem.get('rec_scores', [])
                dt_polys = first_elem.get('dt_polys', [])
                for idx in range(len(rec_texts)):
                    lines.append({
                        'text': rec_texts[idx].strip(),
                        'confidence': round(float(rec_scores[idx]) if idx < len(rec_scores) else 0.0, 4),
                        'box': dt_polys[idx].tolist() if idx < len(dt_polys) and hasattr(dt_polys[idx], 'tolist') else dt_polys[idx] if idx < len(dt_polys) else []
                    })
        return lines

    def process_document(self, file_path):
        """
        Processes single image or multi-page PDF.
        Returns structured CareID JSON payload.
        """
        ext = os.path.splitext(file_path)[1].lower()
        pages_result = []

        if ext == '.pdf':
            doc = pymupdf.open(file_path)
            for page_num in range(len(doc)):
                page = doc.load_page(page_num)
                pix = page.get_pixmap(dpi=200)
                img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                lines = self.process_image(img)
                pages_result.append({
                    'pageNumber': page_num + 1,
                    'lines': lines,
                    'rawText': '\n'.join(l['text'] for l in lines)
                })
            doc.close()
        elif ext in ['.png', '.jpg', '.jpeg', '.webp', '.tiff', '.bmp']:
            lines = self.process_image(file_path)
            pages_result.append({
                'pageNumber': 1,
                'lines': lines,
                'rawText': '\n'.join(l['text'] for l in lines)
            })
        else:
            raise ValueError(f"Unsupported file format: {ext}")

        # Compute overall stats
        all_confidences = [l['confidence'] for p in pages_result for l in p['lines'] if l.get('confidence')]
        avg_confidence = round(sum(all_confidences) / len(all_confidences), 4) if all_confidences else 0.0

        return {
            'filePath': file_path,
            'pageCount': len(pages_result),
            'overallConfidence': avg_confidence,
            'pages': pages_result,
            'combinedText': '\n\n--- Page Break ---\n\n'.join(p['rawText'] for p in pages_result)
        }

def calculate_word_accuracy(extracted_text, ground_truth_keywords):
    """
    Calculates keyword-level recall/accuracy against known ground truth entities.
    """
    if not ground_truth_keywords:
        return 1.0, []
    extracted_lower = extracted_text.lower()
    found = []
    missing = []
    for kw in ground_truth_keywords:
        if kw.lower() in extracted_lower:
            found.append(kw)
        else:
            missing.append(kw)
    accuracy = len(found) / len(ground_truth_keywords)
    return round(accuracy, 4), missing

def run_benchmarks():
    poc_dir = os.path.join(os.getcwd(), 'ocr-poc')
    samples_dir = os.path.join(poc_dir, 'sample_docs')
    results_dir = os.path.join(poc_dir, 'results')
    os.makedirs(results_dir, exist_ok=True)

    engine = CareIDPaddleOCREngine()
    process = psutil.Process(os.getpid())

    test_cases = [
        {
            'name': 'Medical Laboratory Report',
            'file': os.path.join(samples_dir, '01_lab_report.png'),
            'format': 'PNG',
            'keywords': [
                'HEALTH VAULT 360', 'DIAGNOSTIC LABORATORY', 'Jane Doe', 'MRN-784920',
                'Dr. Alan Grant', 'FINAL', 'Hemoglobin', '13.8', 'g/dL',
                'Packed Cell Volume', '41.2', 'Platelet Count', '265,000',
                'Fasting Blood Sugar', '94', 'Serum Creatinine', '0.85',
                'Total Cholesterol', '182', 'Dr. Evelyn Reed'
            ]
        },
        {
            'name': 'Doctor Prescription',
            'file': os.path.join(samples_dir, '02_prescription.jpg'),
            'format': 'JPEG',
            'keywords': [
                'METROPOLITAN CARDIOLOGY CLINIC', 'Dr. Marcus Vance', 'DOC-LIC-99381',
                'Robert Chen', '2026-11-03', 'RX-2026-88192', 'Atorvastatin 20mg',
                'Metoprolol Tartrate 25mg', 'Aspirin 81mg', 'Refills: 2'
            ]
        },
        {
            'name': 'Insurance Card',
            'file': os.path.join(samples_dir, '03_insurance_card.png'),
            'format': 'PNG',
            'keywords': [
                'BLUE SHIELD NATIONAL HEALTHCARE', 'Sarah Miller', 'BSN-99887711',
                'POL987654321', 'GRP-44550', 'Primary Care Physician: $20.00',
                'Specialist Visit: $40.00', 'Emergency Room: $150.00', 'RxBIN 610014'
            ]
        },
        {
            'name': 'Multi-Page Lab Report (2 Pages)',
            'file': os.path.join(samples_dir, '04_multipage_lab_report.pdf'),
            'format': 'PDF (2 Pages)',
            'keywords': [
                'David Kim', 'MRN-554433', 'Sodium', '140', 'Potassium', '4.2',
                'Total Protein', '7.2', 'Albumin', '4.4', 'Lipid Profile',
                'Total Cholesterol', '195', 'Triglycerides', '142',
                'Dr. Patricia Shaw', 'DOC-LIC-55412'
            ]
        },
        {
            'name': 'Rotated Document (90 deg Clockwise)',
            'file': os.path.join(samples_dir, '05_rotated_insurance_card.png'),
            'format': 'PNG (Rotated)',
            'keywords': [
                'BLUE SHIELD NATIONAL HEALTHCARE', 'Sarah Miller', 'POL987654321',
                'BSN-99887711', 'GRP-44550', 'COPAY'
            ]
        },
        {
            'name': 'Low-Quality Degraded Scan',
            'file': os.path.join(samples_dir, '06_low_quality_card.jpg'),
            'format': 'JPEG (Degraded)',
            'keywords': [
                'BLUE SHIELD', 'Sarah Miller', 'POL987654321', 'BSN-99887711'
            ]
        }
    ]

    benchmark_summary = []

    print('\n' + '='*80)
    print('STARTING CAREID PADDLEOCR BENCHMARK RUN')
    print('='*80)

    for tc in test_cases:
        print(f"\n[RUNNING] {tc['name']} ({tc['format']})...")
        ram_before_mb = process.memory_info().rss / (1024 * 1024)
        t_start = time.perf_counter()

        try:
            res = engine.process_document(tc['file'])
            t_elapsed_ms = round((time.perf_counter() - t_start) * 1000, 2)
            ram_after_mb = process.memory_info().rss / (1024 * 1024)
            ram_delta_mb = round(ram_after_mb - ram_before_mb, 2)

            acc, missing = calculate_word_accuracy(res['combinedText'], tc['keywords'])

            item_res = {
                'name': tc['name'],
                'format': tc['format'],
                'pages': res['pageCount'],
                'durationMs': t_elapsed_ms,
                'avgConfidence': res['overallConfidence'],
                'accuracyPercent': round(acc * 100, 2),
                'missingKeywords': missing,
                'residentRamMb': round(ram_after_mb, 2),
                'extractedLinesCount': sum(len(p['lines']) for p in res['pages']),
                'status': 'PASS'
            }

            # Save detailed per-document JSON result
            out_name = os.path.basename(tc['file']) + '.ocr.json'
            with open(os.path.join(results_dir, out_name), 'w', encoding='utf-8') as f:
                json.dump(res, f, indent=2, ensure_ascii=False)

            print(f" -> Duration: {t_elapsed_ms} ms | Pages: {res['pageCount']} | Accuracy: {item_res['accuracyPercent']}% | Confidence: {res['overallConfidence']} | RAM: {item_res['residentRamMb']} MB")
            if missing:
                print(f" -> Missing items: {missing}")

            benchmark_summary.append(item_res)

        except Exception as e:
            print(f" -> FAILED with exception: {str(e)}")
            benchmark_summary.append({
                'name': tc['name'],
                'format': tc['format'],
                'status': 'FAILED',
                'error': str(e)
            })

    # Save summary report
    summary_path = os.path.join(results_dir, 'benchmark_summary.json')
    with open(summary_path, 'w', encoding='utf-8') as f:
        json.dump(benchmark_summary, f, indent=2)

    print('\n' + '='*80)
    print('BENCHMARK COMPLETE. Summary saved to:', summary_path)
    print('='*80)

if __name__ == '__main__':
    run_benchmarks()
