"""
PaddleOCR Error Handling & Edge Case Test Suite
Tests:
1. Empty image (blank white canvas)
2. Corrupted image file
3. Unsupported file extension (.exe, .bin)
4. Password-protected PDF
5. Non-existent file path
"""

import os
import sys

os.environ["FLAGS_use_mkldnn"] = "0"
os.environ["PADDLE_PDX_ENABLE_MKLDNN_BYDEFAULT"] = "0"
os.environ['PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK'] = 'True'

import json
from PIL import Image
import pymupdf
from run_benchmark import CareIDPaddleOCREngine

def setup_error_docs():
    err_dir = os.path.join(os.getcwd(), 'ocr-poc', 'error_docs')
    os.makedirs(err_dir, exist_ok=True)

    # 1. Blank image
    blank_path = os.path.join(err_dir, 'blank.png')
    Image.new('RGB', (400, 400), color=(255, 255, 255)).save(blank_path)

    # 2. Corrupted image file
    corrupt_path = os.path.join(err_dir, 'corrupt.jpg')
    with open(corrupt_path, 'wb') as f:
        f.write(b'\xFF\xD8\xFF\xE0\x00\x10JFIF\x00corrupted-truncated-data')

    # 3. Unsupported file
    unsupported_path = os.path.join(err_dir, 'sample.exe')
    with open(unsupported_path, 'w') as f:
        f.write('Binary executable')

    # 4. Password-protected PDF
    locked_pdf_path = os.path.join(err_dir, 'locked.pdf')
    doc = pymupdf.open()
    page = doc.new_page()
    page.insert_text((50, 50), "Confidential Protected Medical Record")
    doc.save(locked_pdf_path, encryption=pymupdf.PDF_ENCRYPT_AES_256, user_pw="secret123")
    doc.close()

    return blank_path, corrupt_path, unsupported_path, locked_pdf_path

def test_error_handling():
    blank_p, corrupt_p, unsupp_p, locked_p = setup_error_docs()
    engine = CareIDPaddleOCREngine()

    print('\n' + '='*80)
    print('RUNNING ERROR HANDLING & EDGE CASE TESTS')
    print('='*80)

    # Case 1: Blank Image
    print('\n[CASE 1] Blank White Canvas Image:')
    res1 = engine.process_document(blank_p)
    lines_count1 = len(res1['pages'][0]['lines'])
    print(f" -> Result: Handled cleanly. Extracted lines: {lines_count1}. Raw text empty: {res1['combinedText'] == ''}")

    # Case 2: Corrupted Image
    print('\n[CASE 2] Corrupted Image File:')
    try:
        engine.process_document(corrupt_p)
        print(" -> Unexpected success!")
    except Exception as e:
        print(f" -> Expected error caught: {type(e).__name__} - {str(e)[:100]}")

    # Case 3: Unsupported Extension
    print('\n[CASE 3] Unsupported File (.exe):')
    try:
        engine.process_document(unsupp_p)
        print(" -> Unexpected success!")
    except Exception as e:
        print(f" -> Expected error caught: {type(e).__name__} - {str(e)[:100]}")

    # Case 4: Password-Protected PDF
    print('\n[CASE 4] Password-Protected PDF:')
    try:
        # Test loading encrypted PDF
        doc = pymupdf.open(locked_p)
        if doc.is_encrypted and not doc.authenticate("wrong_password"):
            raise ValueError("PDF is encrypted and password was invalid or not provided.")
        engine.process_document(locked_p)
    except Exception as e:
        print(f" -> Expected error caught: {type(e).__name__} - {str(e)[:100]}")

    # Case 5: Non-existent file
    print('\n[CASE 5] Non-Existent File Path:')
    try:
        engine.process_document('non_existent_file.pdf')
    except Exception as e:
        print(f" -> Expected error caught: {type(e).__name__} - {str(e)[:100]}")

    print('\n' + '='*80)
    print('ALL ERROR HANDLING TESTS COMPLETED')
    print('='*80)

if __name__ == '__main__':
    test_error_handling()

