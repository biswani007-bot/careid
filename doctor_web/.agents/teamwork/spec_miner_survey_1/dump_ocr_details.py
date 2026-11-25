import json

with open("Postman collection/CareID-Staging.postman_collection.json", "r", encoding="utf-8") as f:
    data = json.load(f)

def dump_all_leaves(items, parent=""):
    results = []
    for it in items:
        name = it.get("name", "")
        current = f"{parent} > {name}" if parent else name
        if "item" in it:
            results.extend(dump_all_leaves(it["item"], current))
        else:
            results.append((current, it))
    return results

leaves = dump_all_leaves(data.get("item", []))
ocr_items = [l for l in leaves if "15. OCR & Document Verification" in l[0] or "/ocr" in str(l[1].get("request", {}).get("url", ""))]

for path, it in ocr_items:
    req = it.get("request", {})
    u = req.get("url", {})
    raw = u.get("raw", "") if isinstance(u, dict) else str(u)
    method = req.get("method", "")
    print("==================================================")
    print(f"NAME: {it.get('name')}")
    print(f"PATH: {path}")
    print(f"METHOD: {method} {raw}")
    if req.get("body"):
        b = req.get("body")
        print(f"BODY MODE: {b.get('mode')}")
        if b.get("raw"):
            print(f"BODY RAW:\n{b.get('raw')}")
        elif b.get("formdata"):
            print("FORMDATA:", [(p.get('key'), p.get('type'), p.get('value')) for p in b.get('formdata')])
    for resp in it.get("response", []):
        print(f"  RESP {resp.get('code')} {resp.get('status')} - Name: {resp.get('name')}")
        if resp.get("body"):
            print(f"  Body preview:\n{resp.get('body')[:800]}")
