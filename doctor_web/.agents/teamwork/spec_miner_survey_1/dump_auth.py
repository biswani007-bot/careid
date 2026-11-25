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

f02_items = [l for l in leaves if "02. Authentication & OTP" in l[0]]
for path, it in f02_items:
    req = it.get("request", {})
    u = req.get("url", {})
    raw = u.get("raw", "") if isinstance(u, dict) else str(u)
    method = req.get("method", "")
    print("==================================================")
    print(f"[{method}] {it.get('name')}")
    print(f"URL: {raw}")
    b = req.get("body")
    if b:
        print(f"BODY MODE: {b.get('mode')}")
        if b.get("raw"):
            print("BODY RAW:", b.get("raw"))
    for resp in it.get("response", []):
        print(f"  RESP {resp.get('code')} {resp.get('status')}")
        if resp.get("body"):
            print(f"  BODY:\n{resp.get('body')[:500]}")
