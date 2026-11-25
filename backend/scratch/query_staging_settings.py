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

# Query settings
req2 = urllib.request.Request(
    'https://360api.vnvision.in/api/v1/admin/settings?category=SECURITY',
    headers={'Authorization': f'Bearer {token}'}
)
with urllib.request.urlopen(req2) as res2:
    settings_data = json.loads(res2.read().decode())
    settings = settings_data.get('data') or settings_data
    print('Total SECURITY settings retrieved:', len(settings))
    with open('scratch/live_staging_security_settings.json', 'w', encoding='utf-8') as out:
        json.dump(settings, out, indent=2)
    for s in settings:
        print(f"  {s.get('key')}: value={s.get('value')} (type={s.get('valueType')})")
