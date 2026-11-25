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

print("\n>>>>>>>>>> TARGET 2: DOCUMENT UPLOAD & ATTACHMENTS <<<<<<<<<<")
leaves = dump_all_leaves(data.get("item", []))
upload_eps = [l for l in leaves if any(w in l[0].lower() or w in str(l[1].get("request", {}).get("url", "")).lower() for w in ["attachment", "upload"])]

for path, it in upload_eps:
    req = it.get("request", {})
    u = req.get("url", {})
    raw = u.get("raw", "") if isinstance(u, dict) else str(u)
    method = req.get("method", "")
    print("--------------------------------------------------")
    print(f"PATH: {path}")
    print(f"METHOD: {method} {raw}")
    print("HEADERS:")
    for h in req.get("header", []):
        print(f"  {h.get('key')}: {h.get('value')}")
    body = req.get("body")
    if body:
        print(f"BODY MODE: {body.get('mode')}")
        if body.get("mode") == "formdata":
            for f in body.get("formdata", []):
                print(f"  formdata param: {f.get('key')} | type: {f.get('type')} | value: {f.get('value')} | src: {f.get('src')} | desc: {f.get('description')}")
        elif body.get("mode") == "raw":
            print(f"  raw body:\n{body.get('raw')[:400]}")
    for i, resp in enumerate(it.get("response", [])):
        print(f"  RESP {i+1}: {resp.get('code')} {resp.get('status')} - Name: {resp.get('name')}")
        if resp.get("body"):
            print("  Response Body preview:")
            print(resp.get("body")[:600])
