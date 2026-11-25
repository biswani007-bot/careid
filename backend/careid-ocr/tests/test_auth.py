import pytest

def test_auth_success(client, auth_headers):
    """Test 3: Valid X-CareID-Internal-Secret allows access to protected internal routes."""
    response = client.get("/internal/ocr/version", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["version"] == "1.2.0"
    assert data["ocrVersion"] == "PP-OCRv4"
    assert "PP-OCRv4" in data["architecture"]

def test_auth_missing_header_fails(client):
    """Test 4a: Missing X-CareID-Internal-Secret returns HTTP 401 Unauthorized."""
    response = client.get("/internal/ocr/version")
    assert response.status_code == 401
    data = response.json()
    assert data["success"] is False
    assert data["error"] == "Unauthorized"

def test_auth_invalid_header_fails(client):
    """Test 4b: Invalid X-CareID-Internal-Secret returns HTTP 401 Unauthorized."""
    response = client.get(
        "/internal/ocr/version",
        headers={"X-CareID-Internal-Secret": "wrong-secret-value"}
    )
    assert response.status_code == 401
    data = response.json()
    assert data["success"] is False
    assert data["error"] == "Unauthorized"

