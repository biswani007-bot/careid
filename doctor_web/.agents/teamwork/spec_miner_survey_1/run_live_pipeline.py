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

with open(".agents/teamwork/spec_miner_survey_1/doctor_tokens.json", "r") as f:
    token_obj = json.load(f)
    token_data = token_obj.get("data", token_obj)
    access_token = token_data.get("accessToken")
    refresh_token = token_data.get("refreshToken")

print("Loaded access token. Testing /auth/me ...")
auth_headers = {
    "Authorization": f"Bearer {access_token}",
    "Accept": "application/json"
}
s, b, _ = make_req("https://360api.vnvision.in/api/v1/auth/me", headers=auth_headers)
print("/auth/me status:", s)
if s == 401:
    print("Token expired, refreshing...")
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
    print("Refreshed token successfully.")

patient_id = "787e5187-7859-4320-bb1a-465a57dd086a"

print("\n==================== STEP 1: UPLOAD BINARY FILE ====================")
boundary = f"----WebKitFormBoundary{uuid.uuid4().hex}"
file_content = b"CareID Clinical Diagnostic Laboratory Report\nPatient Name: Marcus Doe\nMRN: +16505550004\nHospital / Facility: CareID Diagnostics Lab\nCollection Date: 2026-11-09\nReport Type: Complete Blood Count (CBC)\n\nTest Parameter | Result | Reference Range | Units\nHemoglobin: 14.5 g/dL (12.0 - 15.5 g/dL)\nWBC Count: 6.8 x10^3/uL (4.5 - 11.0 x10^3/uL)\nPlatelet Count: 245 x10^3/uL (150 - 450 x10^3/uL)\nRBC Count: 4.8 x10^6/uL (4.0 - 5.5 x10^6/uL)\n"
filename = "marcus_doe_cbc_report.pdf"

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

att_data = json.loads(b).get("data", {})
attachment_id = att_data.get("id")
print("New Attachment ID:", attachment_id)

print("\n==================== STEP 2: SUBMIT OCR JOB ====================")
ocr_submit_payload = {
    "medicalAttachmentId": attachment_id,
    "documentType": "LAB_REPORT"
}
s, b, _ = make_req("https://360api.vnvision.in/api/v1/ocr/jobs", method="POST", data=ocr_submit_payload, headers=auth_headers)
print("Submit OCR Job Status:", s)
print("Submit OCR Job Response:", b)

job_obj = json.loads(b).get("data", {})
job_id = job_obj.get("id")
print("Created OCR Job ID:", job_id)

if job_id:
    print("\n==================== STEP 3: POLL OCR STATUS ====================")
    for p in range(6):
        time.sleep(1)
        s, b, _ = make_req(f"https://360api.vnvision.in/api/v1/ocr/jobs/{job_id}", headers=auth_headers)
        poll_res = json.loads(b).get("data", {})
        print(f"Poll {p+1}: Status = {poll_res.get('status')}, Confidence = {poll_res.get('overallConfidence')}")
        if poll_res.get("status") in ["COMPLETED", "FAILED", "NEEDS_REVIEW"]:
            print("Final Job JSON preview:")
            print(json.dumps(poll_res, indent=2)[:1000])
            break

    print("\n==================== STEP 4: RETRIEVE OCR OUTPUTS ====================")
    s_txt, b_txt, _ = make_req(f"https://360api.vnvision.in/api/v1/ocr/jobs/{job_id}/text", headers=auth_headers)
    print("GET /ocr/jobs/:id/text Status:", s_txt)
    print("Raw text body:", b_txt[:400])

    s_fld, b_fld, _ = make_req(f"https://360api.vnvision.in/api/v1/ocr/jobs/{job_id}/fields", headers=auth_headers)
    print("GET /ocr/jobs/:id/fields Status:", s_fld)
    print("Fields body:", b_fld[:400])

    s_json, b_json, _ = make_req(f"https://360api.vnvision.in/api/v1/ocr/jobs/{job_id}/json", headers=auth_headers)
    print("GET /ocr/jobs/:id/json Status:", s_json)
    print("JSON body:", b_json[:400])

    print("\n==================== STEP 5: TEST REPROCESS ====================")
    s_rep, b_rep, _ = make_req(f"https://360api.vnvision.in/api/v1/ocr/jobs/{job_id}/reprocess", method="POST", headers=auth_headers)
    print("POST /ocr/jobs/:jobId/reprocess Status:", s_rep)
    print("Reprocess body:", b_rep[:300])

print("\n==================== STEP 6: SAVE MEDICAL RECORD ====================")
record_payload = {
    "title": "Complete Blood Count (CBC) Laboratory Evaluation",
    "chiefComplaint": "Annual diagnostic health screen",
    "clinicalNotes": "CBC Report digitized: Hemoglobin 14.5 g/dL, WBC 6.8 x10^3/uL, Platelets 245 x10^3/uL. All markers within reference limits.",
    "treatmentPlan": "Maintain preventative health routine. Re-evaluate in 12 months.",
    "followUpInstructions": "Report any fatigue or unexplained symptoms.",
    "status": "FINAL",
    "encounter": {
        "providerName": "Dr. Sarah Jenkins, MD",
        "facilityName": "CareID Diagnostics Lab",
        "encounterType": "LABORATORY",
        "encounterDate": "2026-11-09T06:30:00Z"
    },
    "diagnoses": [
        {
            "description": "Encounter for general adult medical examination without abnormal findings",
            "code": "Z00.00",
            "type": "PRIMARY",
            "status": "ACTIVE"
        }
    ],
    "vitalSigns": {
        "heightCm": 178,
        "weightKg": 75,
        "systolicBp": 120,
        "diastolicBp": 78,
        "pulseBpm": 70,
        "respirationRate": 16,
        "temperatureC": 36.7,
        "bloodSugarMgDl": 92,
        "oxygenSaturation": 99
    },
    "procedures": [
        {
            "name": "Complete Blood Count (CBC)",
            "code": "CPT-80053",
            "performedAt": "2026-11-09",
            "notes": "Automated hematology analysis"
        }
    ]
}

s_rec, b_rec, _ = make_req(
    f"https://360api.vnvision.in/api/v1/doctors/patients/{patient_id}/medical-records",
    method="POST",
    data=record_payload,
    headers=auth_headers
)
print("Create Medical Record Status:", s_rec)
print("Create Medical Record Response:", b_rec[:800])

print("\n==================== STEP 7: LIST RECENT MEDICAL RECORDS ====================")
s_list, b_list, _ = make_req(
    f"https://360api.vnvision.in/api/v1/doctors/patients/{patient_id}/medical-records?page=1&limit=10&includeArchived=true",
    headers=auth_headers
)
print("List Records Status:", s_list)
print("List Records Body:", b_list[:800])

print("\n==================== STEP 8: PATIENT TIMELINE ====================")
s_time, b_time, _ = make_req(
    f"https://360api.vnvision.in/api/v1/doctors/patients/{patient_id}/medical-records/timeline?page=1&limit=10",
    headers=auth_headers
)
print("Timeline Status:", s_time)
print("Timeline Body:", b_time[:800])
