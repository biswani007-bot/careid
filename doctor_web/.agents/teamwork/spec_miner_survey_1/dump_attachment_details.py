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

for path, it in leaves:
    req = it.get("request", {})
    u = req.get("url", {})
    raw = u.get("raw", "") if isinstance(u, dict) else str(u)
    if "/attachments" in raw and req.get("method") == "POST":
        print("==================================================")
        print("PATH:", path)
        print("NAME:", it.get("name"))
        print("METHOD:", req.get("method"))
        print("URL:", raw)
        print("HEADERS:", req.get("header"))
        print("AUTH:", req.get("auth"))
        print("BODY:", json.dumps(req.get("body"), indent=2))
        print("DESCRIPTION:", req.get("description"))
        print("RESPONSES:")
        for r in it.get("response", []):
            print(f"  Status: {r.get('code')} {r.get('status')}")
            print(f"  Headers: {r.get('header')}")
            print(f"  Body: {r.get('body')}")
