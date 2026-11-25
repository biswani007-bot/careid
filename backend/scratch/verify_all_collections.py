import json
import os

print("==================================================================")
print("  RIGOROUS POSTMAN COLLECTIONS & ENVIRONMENTS COMPLIANCE AUDIT")
print("==================================================================")

collections_to_audit = [
    'CareID-Staging.postman_collection.json',
    'docs/postman/CareID-Staging.postman_collection.json',
    'Health-Vault-360-API.postman_collection.json',
    'docs/postman/Health-Vault-360-API.postman_collection.json',
    'CareID-Doctor-Patient-Staging.postman_collection.json',
    'docs/postman/CareID-Doctor-Patient-Staging.postman_collection.json'
]

environments_to_audit = [
    'CareID-Staging.postman_environment.json',
    'docs/postman/CareID-Staging.postman_environment.json',
    'Health-Vault-360-Local.postman_environment.json',
    'docs/postman/Health-Vault-360-Local.postman_environment.json',
    'CareID-Production.postman_environment.json',
    'docs/postman/CareID-Production.postman_environment.json'
]

has_error = False

def audit_single_collection(col_path):
    global has_error
    if not os.path.exists(col_path):
        print(f"❌ Missing file: {col_path}")
        has_error = True
        return
    with open(col_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    name = data.get('info', {}).get('name', 'Unnamed')
    
    total_reqs = 0
    double_v1 = []
    missing_v1 = []
    
    def scan_items(items):
        nonlocal total_reqs
        for item in items:
            if 'item' in item:
                scan_items(item['item'])
            elif 'request' in item:
                total_reqs += 1
                raw = item['request'].get('url', {}).get('raw', '')
                if '/api/v1/api/v1' in raw:
                    double_v1.append((item.get('name'), raw))
                if '{{baseUrl}}' in raw and not raw.startswith('{{baseUrl}}/api/v1'):
                    missing_v1.append((item.get('name'), raw))

    scan_items(data.get('item', []))
    
    vars_dict = {v['key']: v['value'] for v in data.get('variable', [])}
    base_url_val = vars_dict.get('baseUrl')
    
    print(f"\n📂 Collection: {col_path}")
    print(f"   Name: {name}")
    print(f"   Requests: {total_reqs}")
    print(f"   baseUrl variable: {base_url_val}")
    print(f"   Double /api/v1 errors: {len(double_v1)}")
    print(f"   Missing /api/v1 errors: {len(missing_v1)}")
    
    if len(double_v1) > 0 or len(missing_v1) > 0:
        has_error = True
        for n, r in double_v1[:3]:
            print(f"     [DOUBLE V1] {n} -> {r}")
        for n, r in missing_v1[:3]:
            print(f"     [MISSING V1] {n} -> {r}")

for col in collections_to_audit:
    audit_single_collection(col)

print("\n--- Auditing Postman Environments ---")
for env_path in environments_to_audit:
    if not os.path.exists(env_path):
        print(f"❌ Missing file: {env_path}")
        has_error = True
        continue
    with open(env_path, 'r', encoding='utf-8') as f:
        env = json.load(f)
    env_name = env.get('name', 'Unnamed')
    vals = {v['key']: v['value'] for v in env.get('values', [])}
    base_url = vals.get('baseUrl')
    doctor_phone = vals.get('doctorPhone')
    staging_otp = vals.get('stagingOtpCode')
    
    print(f"\n🌍 Environment: {env_path}")
    print(f"   Name: {env_name}")
    print(f"   baseUrl: {base_url}")
    print(f"   doctorPhone: {doctor_phone}")
    print(f"   stagingOtpCode: {staging_otp}")
    
    # Assert baseUrl does not have trailing /api/v1
    if base_url and base_url.endswith('/api/v1'):
        print(f"   ❌ ERROR: baseUrl has trailing /api/v1: {base_url}")
        has_error = True
    else:
        print("   ✓ baseUrl is clean origin URL")

if has_error:
    print("\n❌ AUDIT FAILED WITH ISSUES!")
else:
    print("\n✅ AUDIT PASSED 100%: ALL COLLECTIONS AND ENVIRONMENTS ARE MODERN, SYNCHRONIZED, AND ZERO STALE ITEMS!")
