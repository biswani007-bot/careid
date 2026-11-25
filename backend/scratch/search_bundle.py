import re

bundle_path = r'C:\Users\PABANI\careidadmin-bundle.js'
with open(bundle_path, 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

print("File size:", len(text))

patterns = [
    r'api/v1/admin/doctors',
    r'api/v1/doctors',
    r'api/v1/admin/patients',
    r'api/v1/admin/medical-records',
    r'api/v1/medical-records',
    r'api/v1/attachments',
    r'api/v1/facilities',
]

for pat in patterns:
    matches = list(re.finditer(pat, text))
    print(f"\n=== Pattern: {pat} (Count: {len(matches)}) ===")
    for m in matches[:5]:
        start = max(0, m.start() - 80)
        end = min(len(text), m.end() + 120)
        snippet = text[start:end].replace('\n', ' ')
        print(f"[{m.start()}]: ... {snippet} ...")
