import urllib.request
import json
import ssl
import uuid
import time
from pathlib import Path

ctx = ssl.create_default_context()

def make_req(url, method="GET", data=None, headers=None):
    if headers is None:
        headers = {}
    if data is not None and isinstance(data, (dict, list)):
        data = json.dumps(data).encode("utf-8")
        if "Content-Type" not in headers:
            headers["Content-Type"] = "application/json"
    elif data is not None and isinstance(data, str):
        data = data.encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
            body = resp.read().decode("utf-8")
            return resp.status, body, resp.headers
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        return e.code, body, e.headers
    except Exception as e:
        return 0, str(e), {}

with open(".agents/teamwork/spec_miner_survey_1/doctor_tokens.json", "r") as f:
    token_obj = json.load(f)
    token_data = token_obj.get("data", token_obj)
    access_token = token_data.get("accessToken")
    refresh_token = token_data.get("refreshToken")

auth_headers = {
    "Authorization": f"Bearer {access_token}",
    "Accept": "application/json"
}

# Ensure token is active
s, b, _ = make_req("https://360api.vnvision.in/api/v1/auth/me", headers=auth_headers)
if s == 401:
    s_ref, b_ref, _ = make_req(
        "https://360api.vnvision.in/api/v1/auth/token/refresh",
        method="POST",
        data={"refreshToken": refresh_token}
    )
    tokens = json.loads(b_ref).get("data", {})
    access_token = tokens.get("accessToken")
    auth_headers["Authorization"] = f"Bearer {access_token}"
    with open(".agents/teamwork/spec_miner_survey_1/doctor_tokens.json", "w") as f:
        json.dump(tokens, f)

patient_id = "787e5187-7859-4320-bb1a-465a57dd086a"

# Read real image from src/assets/medical/scanned-lab-report.png
image_path = Path("src/assets/medical/scanned-lab-report.png")
with open(image_path, "rb") as f:
    image_bytes = f.read()

print(f"Read {len(image_bytes)} bytes from {image_path}")

boundary = f"----WebKitFormBoundary{uuid.uuid4().hex}"
filename = "scanned-lab-report.png"

body_parts = []
body_parts.append(f"--{boundary}\r\n".encode("utf-8"))
body_parts.append(f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'.encode("utf-8"))
body_parts.append(b"Content-Type: image/png\r\n\r\n")
body_parts.append(image_bytes)
body_parts.append(b"\r\n")
body_parts.append(f"--{boundary}\r\n".encode("utf-8"))
body_parts.append(b'Content-Disposition: form-data; name="category"\r\n\r\nLAB_RESULT\r\n')
body_parts.append(f"--{boundary}\r\n".encode("utf-8"))
body_parts.append(f'Content-Disposition: form-data; name="patientProfileId"\r\n\r\n{patient_id}\r\n'.encode("utf-8"))
body_parts.append(f"--{boundary}--\r\n".encode("utf-8"))

multipart_data = b"".join(body_parts)
multipart_headers = {
    "Authorization": f"Bearer {access_token}",
    "Accept": "application/json",
    "Content-Type": f"multipart/form-data; boundary={boundary}"
}

s, b, _ = make_req("https://360api.vnvision.in/api/v1/attachments", method="POST", data=multipart_data, headers=multipart_headers)
print("Upload status:", s)
print("Upload response:", b)

att_data = json.loads(b).get("data", {})
attachment_id = att_data.get("id")
print("Genuine Attachment ID:", attachment_id)

if attachment_id:
    print("\n--- Submitting genuine attachment to OCR engine ---")
    ocr_submit_payload = {
        "medicalAttachmentId": attachment_id,
        "documentType": "LAB_REPORT"
    }
    s, b, _ = make_req("https://360api.vnvision.in/api/v1/ocr/jobs", method="POST", data=ocr_submit_payload, headers=auth_headers)
    print("Submit OCR Job Status:", s)
    print("Submit OCR Job Response:", b)
    
    job_id = json.loads(b).get("data", {}).get("id")
    print("OCR Job ID:", job_id)
    
    if job_id:
        print("\n--- Polling OCR Job Status ---")
        for attempt in range(10):
            time.sleep(1)
            s, b, _ = make_req(f"https://360api.vnvision.in/api/v1/ocr/jobs/{job_id}", headers=auth_headers)
            poll_data = json.loads(b).get("data", {})
            status = poll_data.get("status")
            confidence = poll_data.get("overallConfidence")
            print(f"Attempt {attempt+1}: Status = {status}, Confidence = {confidence}")
            if status in ["COMPLETED", "FAILED", "NEEDS_REVIEW"]:
                print("Job finished! Detailed JSON:")
                print(json.dumps(poll_data, indent=2))
                break
        
        # Test fields endpoint
        print("\n--- Testing GET /api/v1/ocr/jobs/:id/fields ---")
        s, b, _ = make_req(f"https://360api.vnvision.in/api/v1/ocr/jobs/{job_id}/fields", headers=auth_headers)
        print("Fields Status:", s)
        print("Fields Body:", b)

        # Test text endpoint
        print("\n--- Testing GET /api/v1/ocr/jobs/:id/text ---")
        s, b, _ = make_req(f"https://360api.vnvision.in/api/v1/ocr/jobs/{job_id}/text", headers=auth_headers)
        print("Text Status:", s)
        print("Text Body:", b)

        # Test json endpoint
        print("\n--- Testing GET /api/v1/ocr/jobs/:id/json ---")
        s, b, _ = make_req(f"https://360api.vnvision.in/api/v1/ocr/jobs/{job_id}/json", headers=auth_headers)
        print("JSON Status:", s)
        print("JSON Body:", b)

        # Test reprocess endpoint
        print("\n--- Testing POST /api/v1/ocr/jobs/:jobId/reprocess ---")
        s, b, _ = make_req(f"https://360api.vnvision.in/api/v1/ocr/jobs/{job_id}/reprocess", method="POST", headers=auth_headers)
        print("Reprocess Status:", s)
        print("Reprocess Body:", b)
