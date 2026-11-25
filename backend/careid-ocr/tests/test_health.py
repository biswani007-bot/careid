import pytest

def test_health_endpoint(client):
    """Test 1: Health endpoint returns valid status, telemetry, and engine readiness."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["worker"] == "CareID-Persistent-PaddleOCR"
    assert data["engineReady"] is True
    assert data["ocrVersion"] == "PP-OCRv4"
    assert "residentRamMb" in data
    assert "uptimeSeconds" in data
    assert data["uptimeSeconds"] >= 0

def test_readiness_endpoint(client):
    """Test 2: Readiness endpoint returns 200 OK when engine is warmed up."""
    response = client.get("/ready")
    assert response.status_code == 200
    data = response.json()
    assert data["ready"] is True
    assert data["modelLoaded"] is True
    assert "accepting requests" in data["status"]

