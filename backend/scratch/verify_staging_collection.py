import json

data = json.load(open('CareID-Staging.postman_collection.json', encoding='utf-8'))
print('Collection name:', data['info']['name'])
print('Version:', data['info'].get('version'))
print('Total Folders:', len(data['item']))

# Variables
vars_map = {v['key']: v['value'] for v in data.get('variable', [])}
print('baseUrl variable:', vars_map.get('baseUrl'))
print('base_url variable:', vars_map.get('base_url'))
print('doctorPhone variable:', vars_map.get('doctorPhone'))

double_v1 = []
missing_v1 = []
total_reqs = 0

for folder in data['item']:
    for it in folder.get('item', []):
        total_reqs += 1
        raw = it.get('request', {}).get('url', {}).get('raw', '')
        if '/api/v1/api/v1' in raw:
            double_v1.append((it['name'], raw))
        if '{{baseUrl}}' in raw and not raw.startswith('{{baseUrl}}/api/v1'):
            missing_v1.append((it['name'], raw))

print(f'Total requests scanned: {total_reqs}')
print(f'Double /api/v1 errors: {len(double_v1)}')
print(f'Missing /api/v1 errors: {len(missing_v1)}')

check_ops = [
    ('POST', '/api/v1/auth/refresh'),
    ('GET', '/api/v1/admin/doctors'),
    ('POST', '/api/v1/admin/patients'),
    ('PUT', '/api/v1/admin/patients'),
    ('POST', '/api/v1/admin/medical-records'),
    ('GET', '/api/v1/cpt/search'),
    ('GET', '/api/v1/patients')
]

for m, p in check_ops:
    found = False
    for folder in data['item']:
        for it in folder.get('item', []):
            req = it.get('request', {})
            if req.get('method') == m and p in req.get('url', {}).get('raw', ''):
                found = True
                print(f'  FOUND: {m} {p} in folder "{folder["name"]}"')
                break
        if found: break
    if not found:
        print(f'  NOT FOUND: {m} {p}')
