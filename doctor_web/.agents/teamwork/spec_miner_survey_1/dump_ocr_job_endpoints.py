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

target_urls = [
    "/ocr/jobs/:id",
    "/ocr/jobs/:id/text",
    "/ocr/jobs/:id/fields",
    "/ocr/jobs/:id/json",
    "/ocr/reprocess/:jobId",
    "/ocr/jobs/:jobId/reprocess"
]

for path, it in leaves:
    req = it.get("request", {})
    u = req.get("url", {})
    raw = u.get("raw", "") if isinstance(u, dict) else str(u)
    if any(t in raw for t in target_urls):
        print("==================================================")
        print(f"NAME: {it.get('name')}")
        print(f"METHOD: {req.get('method')} {raw}")
        print("DESCRIPTION:", req.get("description", "")[:200])
        print("HEADERS:", [(h.get('key'), h.get('value')) for h in req.get('header', [])])
        for resp in it.get("response", []):
            print(f"  RESP {resp.get('code')} {resp.get('status')}")
            print(f"  BODY:\n{resp.get('body')}")
