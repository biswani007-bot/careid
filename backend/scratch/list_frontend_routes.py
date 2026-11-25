import re

bundle_path = r'C:\Users\PABANI\careidadmin-bundle.js'
with open(bundle_path, 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

# Match q.get, q.post, q.put, q.delete, q.patch
routes = set()
for m in re.finditer(r'q\.(get|post|put|delete|patch)\([`\'"](/api/v1/[^`\'"?]+)', text):
    method = m.group(1).upper()
    route = m.group(2)
    # Normalize template literals ${...} to :param
    norm = re.sub(r'\$\{[^}]+\}', ':param', route)
    routes.add((method, norm))

print(f"Total distinct API routes called in careidadmin-bundle.js: {len(routes)}")
for method, r in sorted(routes):
    print(f"{method:6} {r}")
