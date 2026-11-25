import json

with open("Postman collection/CareID-Staging.postman_collection.json", "r", encoding="utf-8") as f:
    data = json.load(f)

def find_all(items, parent=""):
    results = []
    for it in items:
        name = it.get("name", "")
        current = f"{parent} > {name}" if parent else name
        if "item" in it:
            results.extend(find_all(it["item"], current))
        else:
            req = it.get("request", {})
            results.append((current, req, it.get("response", [])))
    return results

all_requests = find_all(data.get("item", []))

print(f"Total endpoints: {len(all_requests)}")

def search_terms(terms):
    matches = []
    for path, req, responses in all_requests:
        url_obj = req.get("url", {})
        raw_url = url_obj.get("raw", "") if isinstance(url_obj, dict) else str(url_obj)
        method = req.get("method", "")
        combined = f"{path} {method} {raw_url}".lower()
        if any(t.lower() in combined for t in terms):
            matches.append((path, method, raw_url, req, responses))
    return matches

# Check patient endpoints
print("\n=== PATIENT ENDPOINTS ===")
for path, method, raw_url, req, responses in search_terms(["patient", "/patients"]):
    print(f"[{method}] {path}")
    print(f"    URL: {raw_url}")

