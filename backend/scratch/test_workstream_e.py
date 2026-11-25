import urllib.request
import json

# Admin Login
req = urllib.request.Request(
    'https://360api.vnvision.in/api/v1/auth/password/login',
    data=json.dumps({'identifier': 'admin@careid.test', 'password': 'Admin@123'}).encode(),
    headers={'Content-Type': 'application/json'}
)
with urllib.request.urlopen(req) as res:
    data = json.loads(res.read().decode())
    token = (data.get('data') or data).get('accessToken')

headers = {'Authorization': f'Bearer {token}'}

patient_id = '9a4ad630-de90-40e9-b4cd-1d76f8f63069'
endpoints = [
    ('GET', '/api/v1/admin/patients'),
    ('GET', f'/api/v1/admin/patients/{patient_id}'),
    ('GET', f'/api/v1/admin/patients/{patient_id}/medical-records'),
    ('GET', f'/api/v1/admin/patients/{patient_id}/medical-records/timeline')
]

for method, path in endpoints:
    try:
        r = urllib.request.Request(f'https://360api.vnvision.in{path}', headers=headers)
        with urllib.request.urlopen(r) as res:
            print(f"SUCCESS {method} {path}: {res.status}")
    except urllib.error.HTTPError as e:
        print(f"ERROR {method} {path}: {e.code} -> {e.read().decode()[:200]}")
    except Exception as e:
        print(f"EXCEPTION {method} {path}: {e}")
