import os
import pytest
from app.config import config

def test_jpg_extraction(client, auth_headers, create_synthetic_image):
    """Test 5: Extraction from JPG image."""
    jpg_bytes = create_synthetic_image(text="CAREID LAB REPORT 2026", format="JPEG")
    files = {"file": ("report.jpg", jpg_bytes, "image/jpeg")}
    data = {"documentType": "LAB_REPORT"}
    
    response = client.post(
        "/internal/ocr/process",
        headers=auth_headers,
        files=files,
        data=data
    )
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    assert res["documentType"] == "LAB_REPORT"
    assert res["pageCount"] == 1
    assert "CAREID" in res["combinedText"].upper() or len(res["pages"][0]["lines"]) > 0
    assert res["overallConfidence"] > 0.0

def test_png_extraction(client, auth_headers, create_synthetic_image):
    """Test 6: Extraction from PNG image."""
    png_bytes = create_synthetic_image(text="PATIENT PRESCRIPTION RX", format="PNG")
    files = {"file": ("prescription.png", png_bytes, "image/png")}
    data = {"documentType": "PRESCRIPTION"}
    
    response = client.post(
        "/internal/ocr/process",
        headers=auth_headers,
        files=files,
        data=data
    )
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    assert res["documentType"] == "PRESCRIPTION"
    assert res["pageCount"] == 1
    assert res["overallConfidence"] > 0.0

def test_single_page_pdf_extraction(client, auth_headers, create_synthetic_pdf):
    """Test 7: Extraction from single page PDF."""
    pdf_bytes = create_synthetic_pdf(["CAREID DISCHARGE SUMMARY CLINICAL NOTES"])
    files = {"file": ("summary.pdf", pdf_bytes, "application/pdf")}
    data = {"documentType": "DISCHARGE_SUMMARY"}
    
    response = client.post(
        "/internal/ocr/process",
        headers=auth_headers,
        files=files,
        data=data
    )
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    assert res["pageCount"] == 1
    assert len(res["pages"]) == 1
    assert res["pages"][0]["pageNumber"] == 1

def test_multipage_pdf_extraction(client, auth_headers, create_synthetic_pdf):
    """Test 8: Extraction from multi-page PDF."""
    pdf_bytes = create_synthetic_pdf([
        "CAREID PAGE 1 CLINICAL RECORD",
        "CAREID PAGE 2 DIAGNOSTIC FINDINGS"
    ])
    files = {"file": ("multipage.pdf", pdf_bytes, "application/pdf")}
    data = {"documentType": "MEDICAL_RECORD", "pdfDpi": "150"}
    
    response = client.post(
        "/internal/ocr/process",
        headers=auth_headers,
        files=files,
        data=data
    )
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    assert res["pageCount"] == 2
    assert len(res["pages"]) == 2
    assert res["pages"][0]["pageNumber"] == 1
    assert res["pages"][1]["pageNumber"] == 2
    assert "--- Page Break ---" in res["combinedText"]

def test_invalid_file_extension(client, auth_headers):
    """Test 9: Invalid file extension returns HTTP 400 UnsupportedFormat."""
    files = {"file": ("test.exe", b"MZ fake executable binary", "application/octet-stream")}
    
    response = client.post(
        "/internal/ocr/process",
        headers=auth_headers,
        files=files
    )
    assert response.status_code == 400
    data = response.json()
    assert data["success"] is False
    assert data["error"] == "UnsupportedFormat"
    assert "Unsupported file extension" in data["message"]

def test_oversized_file(client, auth_headers):
    """Test 10: Oversized file returns HTTP 400 PayloadTooLarge."""
    # Config is set to 2MB in conftest
    oversized_bytes = b"0" * (2 * 1024 * 1024 + 1024)
    files = {"file": ("huge.png", oversized_bytes, "image/png")}
    
    response = client.post(
        "/internal/ocr/process",
        headers=auth_headers,
        files=files
    )
    assert response.status_code == 400
    data = response.json()
    assert data["success"] is False
    assert data["error"] == "PayloadTooLarge"

def test_corrupted_file(client, auth_headers):
    """Test 11: Corrupted or unreadable image/pdf returns HTTP 400."""
    corrupted_bytes = b"%PDF-1.4 this is a corrupted, incomplete PDF header"
    files = {"file": ("corrupt.pdf", corrupted_bytes, "application/pdf")}
    
    response = client.post(
        "/internal/ocr/process",
        headers=auth_headers,
        files=files
    )
    assert response.status_code == 400
    data = response.json()
    assert data["success"] is False
    assert "Corrupted" in data["message"] or data["error"] == "UnsupportedFormat"

def test_temporary_file_cleanup(client, auth_headers, create_synthetic_image):
    """Test 14: Verifies temporary files in config.TEMP_DIR are deleted on completion."""
    temp_dir = config.TEMP_DIR
    initial_files = os.listdir(temp_dir) if os.path.exists(temp_dir) else []
    
    png_bytes = create_synthetic_image("CLEANUP TEST", "PNG")
    files = {"file": ("cleanup_test.png", png_bytes, "image/png")}
    
    response = client.post(
        "/internal/ocr/process",
        headers=auth_headers,
        files=files
    )
    assert response.status_code == 200
    
    post_files = os.listdir(temp_dir) if os.path.exists(temp_dir) else []
    assert len(post_files) == len(initial_files), f"Temporary files leaked in {temp_dir}: {post_files}"

def test_careid_contract_schema(client, auth_headers, create_synthetic_image):
    """Test 15: Verifies complete contract response schema matching CareID OcrWorkerClient."""
    png_bytes = create_synthetic_image("SCHEMA VERIFICATION", "PNG")
    files = {"file": ("contract.png", png_bytes, "image/png")}
    data = {"documentType": "DISCHARGE_SUMMARY"}
    
    response = client.post(
        "/internal/ocr/process",
        headers=auth_headers,
        files=files,
        data=data
    )
    assert response.status_code == 200
    res = response.json()
    
    # Exact keys required by NestJS OcrWorkerResponse
    required_keys = [
        "success", "documentType", "sourceFile", "pageCount",
        "overallConfidence", "combinedText", "pages", "durationMs", "engine"
    ]
    for k in required_keys:
        assert k in res, f"Missing required key '{k}' in response envelope"
        
    assert isinstance(res["pages"], list)
    assert len(res["pages"]) > 0
    page0 = res["pages"][0]
    assert "pageNumber" in page0
    assert "rawText" in page0
    assert "lines" in page0
    assert isinstance(page0["lines"], list)
    if len(page0["lines"]) > 0:
        line0 = page0["lines"][0]
        assert "text" in line0
        assert "confidence" in line0
        assert "box" in line0

