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
    "/doctors/patients/:patientProfileId/medical-records",
    "/medical-records",
    "/records"
]

for path, it in leaves:
    req = it.get("request", {})
    u = req.get("url", {})
    raw = u.get("raw", "") if isinstance(u, dict) else str(u)
    method = req.get("method", "")
    
    # filter specific medical records creation / list endpoints
    if any(raw.endswith(tu) or tu + "?" in raw or raw == "{{baseUrl}}" + tu for tu in [
        "/api/v1/doctors/patients/:patientProfileId/medical-records",
        "/api/v1/medical-records",
        "/api/v1/records"
    ]) or "medical record" in it.get("name", "").lower():
        if method in ["POST", "GET"]:
            print("==================================================")
            print(f"NAME: {it.get('name')}")
            print(f"PATH: {path}")
            print(f"METHOD: {method} {raw}")
            b = req.get("body")
            if b:
                print(f"BODY MODE: {b.get('mode')}")
                if b.get("raw"):
                    print(f"BODY RAW:\n{b.get('raw')[:1000]}")
            for resp in it.get("response", []):
                print(f"  RESP {resp.get('code')} {resp.get('status')} - {resp.get('name')}")
                if resp.get("body"):
                    print(f"  BODY preview:\n{resp.get('body')[:600]}")
