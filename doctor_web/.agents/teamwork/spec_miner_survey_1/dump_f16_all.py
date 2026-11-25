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
    if "16. File Uploads & Attachments" in path:
        print("==================================================")
        print("NAME:", it.get("name"))
        print("METHOD:", it.get("request", {}).get("method"))
        print("URL:", it.get("request", {}).get("url", {}).get("raw"))
        print("BODY:", json.dumps(it.get("request", {}).get("body"), indent=2))
        for r in it.get("response", []):
            print(f"Resp: {r.get('code')} {r.get('name')}")
            print("Resp Body:", r.get("body")[:300] if r.get("body") else None)
