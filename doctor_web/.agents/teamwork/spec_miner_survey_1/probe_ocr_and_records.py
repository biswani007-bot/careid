import urllib.request
import json
import ssl
import uuid
import time

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

# Login to get doctor token
status, body, _ = make_req(
    "https://360api.vnvision.in/api/v1/auth/otp/request",
    method="POST",
    data={"phone": "+16505550003"}
)
res_json = json.loads(body)
challenge_id = res_json.get("data", {}).get("challengeId")

status, body, _ = make_req(
    "https://360api.vnvision.in/api/v1/auth/otp/verify",
    method="POST",
    data={"challengeId": challenge_id, "otpCode": "123456"}
)
token_data = json.loads(body).get("data", {})
access_token = token_data.get("accessToken")
print("Doctor logged in.")

auth_headers = {
    "Authorization": f"Bearer {access_token}",
    "Accept": "application/json"
}

patient_id = "787e5187-7859-4320-bb1a-465a57dd086a"

# First upload an image or PDF to get a fresh attachment ID
print("\n--- 1. Uploading test attachment ---")
boundary = f"----WebKitFormBoundary{uuid.uuid4().hex}"
file_content = b"Simulated Lab Report Content: Hemoglobin 14.2 g/dL, WBC 7.5 x10^3/uL, Platelets 260 x10^3/uL"
filename = "lab_cbc_results.pdf"

body_parts = []
body_parts.append(f"--{boundary}\r\n".encode("utf-8"))
body_parts.append(f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'.encode("utf-8"))
body_parts.append(b"Content-Type: application/pdf\r\n\r\n")
body_parts.append(file_content)
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

att_id = json.loads(b).get("data", {}).get("id")
print("Uploaded Attachment ID:", att_id)

print("\n==================== TARGET 3: OCR JOB PROCESSING ====================")
ocr_payload = {
    "medicalAttachmentId": att_id,
    "documentType": "LAB_REPORT"
}
s, b, _ = make_req("https://360api.vnvision.in/api/v1/ocr/jobs", method="POST", data=ocr_payload, headers=auth_headers)
print("Submit OCR Job Status:", s)
print("Submit OCR Job Response:", b)

ocr_job = json.loads(b).get("data", {})
ocr_job_id = ocr_job.get("id")
print("OCR Job ID:", ocr_job_id)

if ocr_job_id:
    # Check status by polling
    for i in range(5):
        time.sleep(1)
        s, b, _ = make_req(f"https://360api.vnvision.in/api/v1/ocr/jobs/{ocr_job_id}", headers=auth_headers)
        print(f"Poll {i+1} Status: {s}")
        print(f"Poll {i+1} Body:", b[:400])
        poll_data = json.loads(b).get("data", {})
        job_status = poll_data.get("status")
        if job_status in ["COMPLETED", "FAILED", "NEEDS_REVIEW"]:
            break
    
    # Check text
    print("\nCheck OCR Text endpoint:")
    s, b, _ = make_req(f"https://360api.vnvision.in/api/v1/ocr/jobs/{ocr_job_id}/text", headers=auth_headers)
    print("OCR Text Status:", s)
    print("OCR Text Body:", b[:300])

    # Check fields
    print("\nCheck OCR Fields endpoint:")
    s, b, _ = make_req(f"https://360api.vnvision.in/api/v1/ocr/jobs/{ocr_job_id}/fields", headers=auth_headers)
    print("OCR Fields Status:", s)
    print("OCR Fields Body:", b[:300])

    # Check json
    print("\nCheck OCR JSON endpoint:")
    s, b, _ = make_req(f"https://360api.vnvision.in/api/v1/ocr/jobs/{ocr_job_id}/json", headers=auth_headers)
    print("OCR JSON Status:", s)
    print("OCR JSON Body:", b[:300])

    # Check reprocess
    print("\nCheck OCR Reprocess endpoint:")
    s, b, _ = make_req(f"https://360api.vnvision.in/api/v1/ocr/reprocess/{ocr_job_id}", method="POST", headers=auth_headers)
    print("OCR Reprocess (route 1) Status:", s)
    print("OCR Reprocess Body:", b[:300])
    if s != 200:
        s2, b2, _ = make_req(f"https://360api.vnvision.in/api/v1/ocr/jobs/{ocr_job_id}/reprocess", method="POST", headers=auth_headers)
        print("OCR Reprocess (route 2) Status:", s2)
        print("OCR Reprocess Body:", b2[:300])

print("\n==================== TARGET 4: MEDICAL RECORDS PERSISTENCE ====================")
# Test GET records for patient
print("1. Testing GET /api/v1/doctors/patients/:patientProfileId/medical-records ...")
s, b, _ = make_req(f"https://360api.vnvision.in/api/v1/doctors/patients/{patient_id}/medical-records?page=1&limit=20&includeArchived=true", headers=auth_headers)
print("GET records status:", s)
print("GET records body:", b[:600])

print("\n2. Testing GET /api/v1/doctors/patients/:patientProfileId/medical-records/timeline ...")
s, b, _ = make_req(f"https://360api.vnvision.in/api/v1/doctors/patients/{patient_id}/medical-records/timeline?page=1&limit=20", headers=auth_headers)
print("GET timeline status:", s)
print("GET timeline body:", b[:600])

# Test POST create medical record
print("\n3. Testing POST /api/v1/doctors/patients/:patientProfileId/medical-records ...")
rec_payload = {
    "title": "Complete Blood Count (CBC) Review",
    "chiefComplaint": "Routine health panel checkup",
    "clinicalNotes": "Patient CBC digitized and reviewed: Hemoglobin 14.2 g/dL, WBC 7.5 x10^3/uL, Platelets 260 x10^3/uL.",
    "treatmentPlan": "Maintain normal diet and exercise. Repeat panel in 12 months.",
    "followUpInstructions": "Contact clinic if fatigue develops.",
    "status": "FINAL",
    "encounter": {
        "providerName": "Dr. Sarah Jenkins, MD",
        "facilityName": "City General Hospital",
        "encounterType": "LABORATORY",
        "encounterDate": "2026-11-09T06:00:00Z"
    },
    "diagnoses": [
        {
            "description": "Routine general medical examination",
            "code": "Z00.00",
            "type": "PRIMARY",
            "status": "ACTIVE"
        }
    ],
    "vitalSigns": {
        "heightCm": 175,
        "weightKg": 72,
        "systolicBp": 120,
        "diastolicBp": 80,
        "pulseBpm": 72,
        "respirationRate": 16,
        "temperatureC": 36.6,
        "bloodSugarMgDl": 95,
        "oxygenSaturation": 99
    },
    "procedures": [
        {
            "name": "Complete Blood Count (CBC)",
            "code": "CPT-80053",
            "performedAt": "2026-11-09",
            "notes": "Digitized via OCR"
        }
    ]
}
s, b, _ = make_req(f"https://360api.vnvision.in/api/v1/doctors/patients/{patient_id}/medical-records", method="POST", data=rec_payload, headers=auth_headers)
print("POST create record Status:", s)
print("POST create record Body:", b[:800])

