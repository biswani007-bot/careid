import urllib.request
import urllib.error
import json
import os

with open('live_tokens.json') as f:
    d = json.load(f)
token = d['accessToken']

filepath = r'C:\Users\PABANI\Downloads\hvapi-main\hvapi-main\ocr-poc\sample_docs\03_insurance_card.png'
with open(filepath, 'rb') as f:
    file_bytes = f.read()

boundary = '----WebKitFormBoundaryCareIDTest12345'
body = bytearray()
body.extend(f'--{boundary}\r\n'.encode('utf-8'))
body.extend(b'Content-Disposition: form-data; name="file"; filename="03_insurance_card.png"\r\n')
body.extend(b'Content-Type: image/png\r\n\r\n')
body.extend(file_bytes)
body.extend(b'\r\n')
body.extend(f'--{boundary}--\r\n'.encode('utf-8'))

req = urllib.request.Request(
    'https://360api.vnvision.in/api/v1/insurance/ocr',
    data=bytes(body),
    headers={
        'Authorization': f'Bearer {token}',
        'Content-Type': f'multipart/form-data; boundary={boundary}',
    },
    method='POST'
)

print("Sending POST /insurance/ocr with real insurance card image...")
try:
    with urllib.request.urlopen(req, timeout=30) as resp:
        print('HTTP Status:', resp.status)
        res_data = resp.read().decode('utf-8')
        print('Response:', res_data)
        parsed = json.loads(res_data)
        with open('insurance_ocr_result.json', 'w') as out:
            json.dump(parsed, out, indent=2)
except urllib.error.HTTPError as e:
    print('HTTP Error:', e.code)
    print(e.read().decode('utf-8'))
except Exception as ex:
    print('Exception:', type(ex), ex)
