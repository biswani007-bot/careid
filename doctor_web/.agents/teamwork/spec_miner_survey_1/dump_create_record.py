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
    if "Create medical record for an authorized patient" in it.get("name", "") or "Create a new general medical record" in it.get("name", ""):
        print("==================================================")
        print("NAME:", it.get("name"))
        print("PATH:", path)
        print("METHOD:", it.get("request", {}).get("method"))
        print("URL:", it.get("request", {}).get("url", {}).get("raw"))
        print("HEADERS:", it.get("request", {}).get("header"))
        b = it.get("request", {}).get("body", {})
        print("BODY:", b.get("raw"))
        for resp in it.get("response", []):
            print(f"RESP CODE: {resp.get('code')}")
            print(f"RESP BODY:\n{resp.get('body')}")
