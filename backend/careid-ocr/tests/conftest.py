import os
import io
import pytest
from PIL import Image, ImageDraw, ImageFont
import pymupdf

# Set environment before any app imports
os.environ["CAREID_OCR_SECRET"] = "test-careid-secret-key-123456"
os.environ["CAREID_OCR_TIMEOUT_SECONDS"] = "180"
os.environ["CAREID_OCR_MAX_CONCURRENCY"] = "2"
os.environ["CAREID_OCR_MAX_FILE_SIZE_MB"] = "2" # 2MB for fast tests
os.environ["CAREID_OCR_MAX_PAGES"] = "5"

from fastapi.testclient import TestClient
from app.main import app
from app.config import config

@pytest.fixture(scope="session")
def client():
    with TestClient(app) as test_client:
        yield test_client

@pytest.fixture
def auth_headers():
    return {"X-CareID-Internal-Secret": "test-careid-secret-key-123456"}

@pytest.fixture
def create_synthetic_image():
    def _create(text="CAREID MEDICAL REPORT", format="PNG"):
        img = Image.new("RGB", (400, 100), color=(255, 255, 255))
        draw = ImageDraw.Draw(img)
        draw.text((20, 35), text, fill=(0, 0, 0))
        buf = io.BytesIO()
        img.save(buf, format=format)
        buf.seek(0)
        return buf.getvalue()
    return _create

@pytest.fixture
def create_synthetic_pdf():
    def _create(pages_text=["CareID Clinical Page 1", "CareID Clinical Page 2"]):
        doc = pymupdf.open()
        for t in pages_text:
            page = doc.new_page(width=595, height=842) # A4
            page.insert_text((50, 100), t, fontsize=18)
        buf = io.BytesIO()
        doc.save(buf)
        doc.close()
        buf.seek(0)
        return buf.getvalue()
    return _create

