import urllib.request
import json

req = urllib.request.Request(
    'https://360api.vnvision.in/api/v1/auth/password/login',
    data=json.dumps({'identifier': 'admin@careid.test', 'password': 'Admin@123'}).encode(),
    headers={'Content-Type': 'application/json'}
)
with urllib.request.urlopen(req) as res:
    data = json.loads(res.read().decode())
    token = (data.get('data') or data).get('accessToken')

for page in range(12, 35):
    url = f'https://360api.vnvision.in/api/v1/admin/patients?page={page}&limit=1'
    try:
        req2 = urllib.request.Request(url, headers={'Authorization': f'Bearer {token}'})
        with urllib.request.urlopen(req2) as res2:
            body = json.loads(res2.read().decode())
            items = body.get('data') or []
            if not items:
                print(f"Page {page}: Empty, finished.")
                break
            patient = items[0]
            print(f"Page {page}: OK - ID: {patient.get('id')} Name: {patient.get('firstName')} {patient.get('lastName')} Phone: {patient.get('phone')} UserStatus: {patient.get('userStatus')} ProfileStatus: {patient.get('profileStatus')}")
    except urllib.error.HTTPError as e:
        print(f"Page {page}: CRASHED WITH {e.code}")

