import urllib.request
import json
import ssl
import mimetypes
import uuid

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
print("Logged in as Doctor. Token acquired.")

auth_headers = {
    "Authorization": f"Bearer {access_token}",
    "Accept": "application/json"
}

patient_id = "787e5187-7859-4320-bb1a-465a57dd086a"

print("\n==================== TARGET 2: DOCUMENT UPLOAD API ====================")

# Probe 1: JSON payload to /api/v1/attachments
print("1. Testing POST /api/v1/attachments with JSON metadata...")
json_payload = {
    "patientProfileId": patient_id,
    "fileName": "test_cbc_lab_report.pdf",
    "originalName": "test_cbc_lab_report.pdf",
    "fileSize": 10240,
    "mimeType": "application/pdf",
    "category": "LAB_RESULT"
}
s, b, _ = make_req("https://360api.vnvision.in/api/v1/attachments", method="POST", data=json_payload, headers=auth_headers)
print("POST /attachments (JSON) Status:", s)
print("Response:", b[:600])

# Probe 2: Multipart form-data upload to /api/v1/attachments
print("\n2. Testing POST /api/v1/attachments with multipart/form-data...")
boundary = f"----WebKitFormBoundary{uuid.uuid4().hex}"
file_content = b"%PDF-1.4 sample pdf content for careid diagnostic report"
filename = "sample_clinical_report.pdf"

# Let's try form field name 'file'
body_parts = []
body_parts.append(f"--{boundary}\r\n".encode("utf-8"))
body_parts.append(f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'.encode("utf-8"))
body_parts.append(b"Content-Type: application/pdf\r\n\r\n")
body_parts.append(file_content)
body_parts.append(b"\r\n")

# Add category and patientProfileId fields
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

req = urllib.request.Request("https://360api.vnvision.in/api/v1/attachments", data=multipart_data, headers=multipart_headers, method="POST")
try:
    with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
        print("POST /attachments (Multipart 'file') Status:", resp.status)
        print("Response:", resp.read().decode("utf-8")[:600])
except urllib.error.HTTPError as e:
    print("POST /attachments (Multipart 'file') Error Status:", e.code)
    print("Response:", e.read().decode("utf-8")[:600])
except Exception as e:
    print("POST /attachments Error:", str(e))

# Probe 3: Check GET /api/v1/attachments/:id or list if any
print("\n3. Testing GET /api/v1/attachments/file/:filename or metadata...")
s, b, _ = make_req("https://360api.vnvision.in/api/v1/attachments/test-attachment-id", headers=auth_headers)
print("GET /attachments/:id Status:", s)
print("Response:", b[:300])

# Probe 4: Also test medical record attachment endpoint
print("\n4. Testing POST /api/v1/medical-records/:id/attachments ...")
test_rec_id = "45d5ba2a-05bd-4a7f-ad34-fe9e677cff78"
s, b, _ = make_req(f"https://360api.vnvision.in/api/v1/medical-records/{test_rec_id}/attachments", method="POST", data=json_payload, headers=auth_headers)
print("POST /medical-records/:id/attachments Status:", s)
print("Response:", b[:400])

