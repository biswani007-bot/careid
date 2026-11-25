import urllib.request
import urllib.error
import json
import time

with open('live_tokens.json') as f:
    d = json.load(f)
token = d['accessToken']

patient_profile_id = '787e5187-7859-4320-bb1a-465a57dd086a'

# 1. Upload attachment
filepath = r'C:\Users\PABANI\Downloads\hvapi-main\hvapi-main\ocr-poc\sample_docs\01_lab_report.png'
with open(filepath, 'rb') as f:
    file_bytes = f.read()

boundary = '----WebKitFormBoundaryLabReport12345'
body = bytearray()

# Form fields
body.extend(f'--{boundary}\r\n'.encode('utf-8'))
body.extend(b'Content-Disposition: form-data; name="patientProfileId"\r\n\r\n')
body.extend(f'{patient_profile_id}\r\n'.encode('utf-8'))

body.extend(f'--{boundary}\r\n'.encode('utf-8'))
body.extend(b'Content-Disposition: form-data; name="category"\r\n\r\n')
body.extend(b'LAB_REPORT\r\n')

# File field
body.extend(f'--{boundary}\r\n'.encode('utf-8'))
body.extend(b'Content-Disposition: form-data; name="file"; filename="01_lab_report.png"\r\n')
body.extend(b'Content-Type: image/png\r\n\r\n')
body.extend(file_bytes)
body.extend(b'\r\n')
body.extend(f'--{boundary}--\r\n'.encode('utf-8'))

print("Step 1: Uploading attachment via POST /attachments...")
req_upload = urllib.request.Request(
    'https://360api.vnvision.in/api/v1/attachments',
    data=bytes(body),
    headers={
        'Authorization': f'Bearer {token}',
        'Content-Type': f'multipart/form-data; boundary={boundary}',
        'Content-Length': str(len(body)),
    },
    method='POST'
)

attachment_id = None
try:
    with urllib.request.urlopen(req_upload, timeout=30) as resp:
        print('Upload Status:', resp.status)
        raw_res = resp.read().decode('utf-8')
        print('Upload Response:', raw_res)
        res = json.loads(raw_res)
        attachment_id = res.get('data', {}).get('id') or res.get('id')
except urllib.error.HTTPError as e:
    print('Upload HTTP Error:', e.code, e.read().decode('utf-8'))

print(f"Attachment ID: {attachment_id}")

# Step 2: Submit OCR Job
if attachment_id:
    print(f"\nStep 2: Submitting OCR Job via POST /ocr/jobs...")
    job_payload = {
        "medicalAttachmentId": attachment_id,
        "documentType": "LAB_REPORT"
    }
    req_job = urllib.request.Request(
        'https://360api.vnvision.in/api/v1/ocr/jobs',
        data=json.dumps(job_payload).encode('utf-8'),
        headers={
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        },
        method='POST'
    )

    job_id = None
    try:
        with urllib.request.urlopen(req_job, timeout=60) as resp:
            print('Job Submit Status:', resp.status)
            raw_res = resp.read().decode('utf-8')
            print('Job Submit Response:', raw_res)
            res = json.loads(raw_res)
            job_id = res.get('data', {}).get('id') or res.get('id')
    except urllib.error.HTTPError as e:
        print('Job Submit HTTP Error:', e.code, e.read().decode('utf-8'))

    print(f"Job ID: {job_id}")

    if job_id:
        # Step 3: Check Job Status
        print(f"\nStep 3: Checking Job Status via GET /ocr/jobs/{job_id}...")
        req_status = urllib.request.Request(
            f'https://360api.vnvision.in/api/v1/ocr/jobs/{job_id}',
            headers={'Authorization': f'Bearer {token}'}
        )
        with urllib.request.urlopen(req_status, timeout=15) as resp:
            print('Job Status Response:', resp.read().decode('utf-8'))

        # Step 4: Check Fields
        print(f"\nStep 4: Checking Extracted Fields via GET /ocr/jobs/{job_id}/fields...")
        req_fields = urllib.request.Request(
            f'https://360api.vnvision.in/api/v1/ocr/jobs/{job_id}/fields',
            headers={'Authorization': f'Bearer {token}'}
        )
        with urllib.request.urlopen(req_fields, timeout=15) as resp:
            print('Extracted Fields Response:', resp.read().decode('utf-8'))

        # Step 5: Check Text
        print(f"\nStep 5: Checking Raw Text via GET /ocr/jobs/{job_id}/text...")
        req_text = urllib.request.Request(
            f'https://360api.vnvision.in/api/v1/ocr/jobs/{job_id}/text',
            headers={'Authorization': f'Bearer {token}'}
        )
        with urllib.request.urlopen(req_text, timeout=15) as resp:
            print('Raw Text Response:', resp.read().decode('utf-8'))
