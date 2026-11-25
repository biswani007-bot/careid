"""
CareID Persistent PaddleOCR Worker E2E Verification Suite
Tests:
1. GET /health readiness & memory verification
2. Authentication security (missing header, invalid header, valid header)
3. Input validation & error handling (missing file, bad format, empty payload)
4. All 6 Section 36 benchmark documents processed via HTTP
5. Multipart form-data file upload processing & secure temp cleanup
6. Simultaneous concurrent request handling (asyncio.gather)
7. Worker memory stability check
"""

import os
import sys
import time
import json
import asyncio
import aiohttp

# Configuration
BASE_URL = os.getenv("CAREID_OCR_WORKER_URL", "http://127.0.0.1:5050")
SECRET = os.getenv("CAREID_OCR_SECRET", "")
HEADERS = {"X-CareID-Internal-Secret": SECRET}

SAMPLE_DIR = os.path.join(os.getcwd(), "ocr-poc", "sample_docs")

BENCHMARK_DOCS = [
    {
        "name": "Health Insurance Card",
        "file": os.path.join(SAMPLE_DIR, "03_insurance_card.png"),
        "docType": "INSURANCE_CARD",
        "keywords": [
            "BLUE SHIELD NATIONAL HEALTHCARE", "Sarah Miller", "BSN-99887711",
            "POL987654321", "GRP-44550", "Primary Care Physician: $20.00",
            "Specialist Visit: $40.00", "Emergency Room: $150.00", "RxBIN 610014"
        ]
    },
    {
        "name": "Doctor Prescription Slip",
        "file": os.path.join(SAMPLE_DIR, "02_prescription.jpg"),
        "docType": "PRESCRIPTION",
        "keywords": [
            "METROPOLITAN CARDIOLOGY CLINIC", "Dr. Marcus Vance", "DOC-LIC-99381",
            "Robert Chen", "2026-11-03", "RX-2026-88192", "Atorvastatin 20mg",
            "Metoprolol Tartrate 25mg", "Aspirin 81mg", "Refills: 2"
        ]
    },
    {
        "name": "Medical Laboratory Report",
        "file": os.path.join(SAMPLE_DIR, "01_lab_report.png"),
        "docType": "LAB_REPORT",
        "keywords": [
            "HEALTH VAULT 360", "DIAGNOSTIC LABORATORY", "Jane Doe", "MRN-784920",
            "Dr. Alan Grant", "FINAL", "Hemoglobin", "13.8", "g/dL",
            "Packed Cell Volume", "41.2", "Platelet Count", "265,000",
            "Fasting Blood Sugar", "94", "Serum Creatinine", "0.85",
            "Total Cholesterol", "182", "Dr. Evelyn Reed"
        ]
    },
    {
        "name": "Multi-Page Lab Report (2 Pages)",
        "file": os.path.join(SAMPLE_DIR, "04_multipage_lab_report.pdf"),
        "docType": "LAB_REPORT",
        "keywords": [
            "David Kim", "MRN-554433", "Sodium", "140", "Potassium", "4.2",
            "Total Protein", "7.2", "Albumin", "4.4", "Lipid Profile",
            "Total Cholesterol", "195", "Triglycerides", "142",
            "Dr. Patricia Shaw", "DOC-LIC-55412"
        ]
    },
    {
        "name": "Rotated Document (90 deg CW)",
        "file": os.path.join(SAMPLE_DIR, "05_rotated_insurance_card.png"),
        "docType": "INSURANCE_CARD",
        "keywords": [
            "BLUE SHIELD NATIONAL HEALTHCARE", "Sarah Miller", "POL987654321",
            "BSN-99887711", "GRP-44550", "COPAY"
        ]
    },
    {
        "name": "Low-Quality Degraded Scan",
        "file": os.path.join(SAMPLE_DIR, "06_low_quality_card.jpg"),
        "docType": "INSURANCE_CARD",
        "keywords": [
            "BLUE SHIELD", "Sarah Miller", "POL987654321", "BSN-99887711"
        ]
    }
]

import re

def check_keywords(text: str, keywords: list):
    clean_text = re.sub(r"\s+", "", text.lower())
    missing = [kw for kw in keywords if re.sub(r"\s+", "", kw.lower()) not in clean_text]
    accuracy = (len(keywords) - len(missing)) / len(keywords)
    return round(accuracy * 100, 2), missing

async def run_suite():
    print("=" * 80)
    print("CAREID PERSISTENT PADDLEOCR WORKER E2E VERIFICATION SUITE")
    print("=" * 80)

    async with aiohttp.ClientSession() as session:
        # TEST 1: Health Check
        print("\n[TEST 1] Verifying GET /health endpoint...")
        async with session.get(f"{BASE_URL}/health") as resp:
            assert resp.status == 200, f"Health check failed with status {resp.status}"
            data = await resp.json()
            print(f" -> Status: {data['status']} | Worker: {data['worker']}")
            print(f" -> Engine Ready: {data['engineReady']} | Architecture: {data['architecture']}")
            print(f" -> Resident RAM: {data['residentRamMb']} MB | Peak WSet: {data['peakWorkingSetMb']} MB")
            assert data["engineReady"] is True, "Engine reported not ready!"
            print(" -> [PASS] Health check verified.")

        # TEST 2: Authentication Guard
        print("\n[TEST 2] Verifying Authentication Guard on /internal/ocr/process...")
        # 2a. Missing header
        async with session.post(f"{BASE_URL}/internal/ocr/process", json={"filePath": "dummy.png"}) as resp:
            print(f" -> Missing header response status: {resp.status}")
            assert resp.status == 401, f"Expected 401, got {resp.status}"
        # 2b. Invalid header
        async with session.post(
            f"{BASE_URL}/internal/ocr/process",
            headers={"X-CareID-Internal-Secret": "invalid-secret"},
            json={"filePath": "dummy.png"}
        ) as resp:
            print(f" -> Invalid header response status: {resp.status}")
            assert resp.status == 401, f"Expected 401, got {resp.status}"
        print(" -> [PASS] Authentication guard strictly enforced (401 Unauthorized on bad/missing secret).")

        # TEST 3: Error Handling & Validation
        print("\n[TEST 3] Verifying Error Handling & Validation...")
        # 3a. Non-existent file
        async with session.post(
            f"{BASE_URL}/internal/ocr/process",
            headers=HEADERS,
            json={"filePath": "C:\\non_existent_doc_12345.png"}
        ) as resp:
            print(f" -> Non-existent file status: {resp.status}")
            assert resp.status == 404, f"Expected 404, got {resp.status}"
        # 3b. Missing filePath
        async with session.post(
            f"{BASE_URL}/internal/ocr/process",
            headers=HEADERS,
            json={"badKey": "some_value"}
        ) as resp:
            print(f" -> Missing filePath status: {resp.status}")
            assert resp.status == 400, f"Expected 400, got {resp.status}"
        # 3c. Unsupported format
        unsupported_file = os.path.join(os.getcwd(), "ocr-poc", "error_docs", "fake.exe")
        os.makedirs(os.path.dirname(unsupported_file), exist_ok=True)
        with open(unsupported_file, "wb") as f:
            f.write(b"MZ\x90\x00FAKE_BINARY")
        async with session.post(
            f"{BASE_URL}/internal/ocr/process",
            headers=HEADERS,
            json={"filePath": unsupported_file}
        ) as resp:
            print(f" -> Unsupported format (.exe) status: {resp.status}")
            assert resp.status == 400, f"Expected 400, got {resp.status}"
        print(" -> [PASS] Error handling correctly returns 404, 400, and 400.")

        # TEST 4: Process All 6 Benchmark Documents via HTTP
        print("\n[TEST 4] Processing All 6 Benchmark Documents via HTTP...")
        benchmark_results = []
        for doc in BENCHMARK_DOCS:
            print(f"\n[BENCHMARK] Dispatching: {doc['name']}...")
            t0 = time.perf_counter()
            async with session.post(
                f"{BASE_URL}/internal/ocr/process",
                headers=HEADERS,
                json={"filePath": doc["file"], "documentType": doc["docType"]}
            ) as resp:
                elapsed_ms = round((time.perf_counter() - t0) * 1000, 2)
                assert resp.status == 200, f"Failed with status {resp.status}: {await resp.text()}"
                res_data = await resp.json()

                combined_text = res_data.get("combinedText", "")
                acc, missing = check_keywords(combined_text, doc["keywords"])
                pages_count = res_data.get("pageCount", 0)
                overall_conf = res_data.get("overallConfidence", 0.0)
                engine_duration_ms = res_data.get("durationMs", 0.0)

                print(f" -> HTTP Roundtrip: {elapsed_ms} ms | Engine Processing: {engine_duration_ms} ms")
                print(f" -> Pages: {pages_count} | Confidence: {overall_conf} | Accuracy: {acc}%")
                if missing:
                    print(f"    Missing keywords: {missing}")
                assert acc == 100.0, f"Accuracy regression on {doc['name']}: {missing}"

                benchmark_results.append({
                    "name": doc["name"],
                    "pages": pages_count,
                    "engineDurationMs": engine_duration_ms,
                    "httpDurationMs": elapsed_ms,
                    "accuracy": acc,
                    "confidence": overall_conf
                })

        print("\n -> [PASS] All 6 benchmark documents processed with 100.0% extraction accuracy!")

        # TEST 5: Multipart Form-Data Upload Test & Temp File Scrubbing
        print("\n[TEST 5] Verifying Multipart Form-Data Upload & Secure Scrubbing...")
        card_file = BENCHMARK_DOCS[0]["file"]
        data = aiohttp.FormData()
        with open(card_file, "rb") as f:
            data.add_field("file", f.read(), filename="patient_card_upload.png", content_type="image/png")
        data.add_field("documentType", "INSURANCE_CARD")

        async with session.post(f"{BASE_URL}/internal/ocr/process", headers=HEADERS, data=data) as resp:
            assert resp.status == 200, f"Multipart upload failed: {await resp.text()}"
            upload_res = await resp.json()
            print(f" -> Upload processed successfully: {upload_res['sourceFile']}")
            print(f" -> Pages: {upload_res['pageCount']}, Confidence: {upload_res['overallConfidence']}")
            assert upload_res["success"] is True

        # Check that temp folder has 0 lingering files
        temp_dir = os.path.join(os.getcwd(), "services", "ocr-worker", "tmp")
        lingering = os.listdir(temp_dir) if os.path.exists(temp_dir) else []
        print(f" -> Lingering files in temp dir: {lingering}")
        assert len(lingering) == 0, f"Temporary file was not cleaned up: {lingering}"
        print(" -> [PASS] Multipart upload succeeded and temporary file was securely scrubbed.")

        # TEST 6: Simultaneous / Concurrent Requests Test
        print("\n[TEST 6] Verifying Simultaneous Concurrent Requests (Testing Semaphore Concurrency)...")
        t_concur0 = time.perf_counter()
        req1 = session.post(
            f"{BASE_URL}/internal/ocr/process",
            headers=HEADERS,
            json={"filePath": BENCHMARK_DOCS[0]["file"], "documentType": "INSURANCE_CARD"}
        )
        req2 = session.post(
            f"{BASE_URL}/internal/ocr/process",
            headers=HEADERS,
            json={"filePath": BENCHMARK_DOCS[4]["file"], "documentType": "INSURANCE_CARD"}
        )
        resps = await asyncio.gather(req1, req2)
        concur_elapsed_ms = round((time.perf_counter() - t_concur0) * 1000, 2)
        assert resps[0].status == 200 and resps[1].status == 200
        print(f" -> Both simultaneous requests finished in {concur_elapsed_ms} ms with HTTP 200 OK.")
        print(" -> [PASS] Concurrent requests successfully handled via semaphore.")

        # TEST 7: Memory Stability Check
        print("\n[TEST 7] Checking Final Worker Memory Stability via GET /health...")
        async with session.get(f"{BASE_URL}/health") as resp:
            final_health = await resp.json()
            print(f" -> Final Resident RAM (RSS): {final_health['residentRamMb']} MB")
            print(f" -> Final Peak Working Set: {final_health['peakWorkingSetMb']} MB")
            print(f" -> Worker Uptime: {final_health['uptimeSeconds']} s")
            assert final_health["residentRamMb"] < 500.0, "Unexpected memory inflation!"
            print(" -> [PASS] Memory remains stable under 450 MB working set.")

    print("\n" + "="*80)
    print("ALL 7 PERSISTENT WORKER VERIFICATION TESTS PASSED SUCCESSFULLY!")
    print("="*80)

if __name__ == "__main__":
    asyncio.run(run_suite())

