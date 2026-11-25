import json

with open("Postman collection/CareID-Staging.postman_collection.json", "r", encoding="utf-8") as f:
    data = json.load(f)

def find_by_url_match(items, url_part):
    matches = []
    for it in items:
        if "item" in it:
            matches.extend(find_by_url_match(it["item"], url_part))
        else:
            req = it.get("request", {})
            u = req.get("url", {})
            raw = u.get("raw", "") if isinstance(u, dict) else str(u)
            if url_part in raw:
                matches.append(it)
    return matches

print("Looking for /doctors/patients/:patientProfileId...")
matches = find_by_url_match(data.get("item", []), "/doctors/patients/:patientProfileId")
for m in matches:
    print("MATCH:", m.get("name"))
    print("METHOD:", m.get("request", {}).get("method"))
    print("URL:", m.get("request", {}).get("url"))
    for resp in m.get("response", []):
        print(f"Resp: {resp.get('name')} {resp.get('code')}")
        print("Body:", resp.get("body"))
