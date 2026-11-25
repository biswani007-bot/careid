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

queries = [
    'q=Lucas',
    'q=Vance',
    'q=1407',
    'q=f8f63069',
    'q=7904ad9d',
    'status=COMPLETED',
    'gender=MALE',
    'bloodGroup=O_POSITIVE'
]

for q in queries:
    url = f'https://360api.vnvision.in/api/v1/admin/patients?{q}'
    try:
        req2 = urllib.request.Request(url, headers={'Authorization': f'Bearer {token}'})
        with urllib.request.urlopen(req2) as res2:
            body = json.loads(res2.read().decode())
            data_items = body.get('data') or []
            print(f"OK for {q}: count={len(data_items)}")
    except urllib.error.HTTPError as e:
        print(f"ERR for {q}: {e.code}")
