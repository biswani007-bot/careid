import json

with open("Postman collection/CareID-Staging.postman_collection.json", "r", encoding="utf-8") as f:
    data = json.load(f)

def extract_details(items, parent=""):
    results = []
    for it in items:
        name = it.get("name", "")
        current = f"{parent} > {name}" if parent else name
        if "item" in it:
            results.extend(extract_details(it["item"], current))
        else:
            req = it.get("request", {})
            responses = it.get("response", [])
            results.append({
                "path": current,
                "name": name,
                "request": req,
                "responses": responses
            })
    return results

all_endpoints = extract_details(data.get("item", []))

def inspect_endpoint_matches(keywords):
    matched = []
    for ep in all_endpoints:
        req = ep["request"]
        url_obj = req.get("url", {})
        raw_url = url_obj.get("raw", "") if isinstance(url_obj, dict) else str(url_obj)
        method = req.get("method", "")
        name = ep["name"]
        path = ep["path"]
        
        for kw in keywords:
            if kw.lower() in raw_url.lower() or kw.lower() in name.lower():
                matched.append(ep)
                break
    return matched

# Let's inspect specific endpoints
def dump_ep_info(ep):
    req = ep["request"]
    url_obj = req.get("url", {})
    raw_url = url_obj.get("raw", "") if isinstance(url_obj, dict) else str(url_obj)
    method = req.get("method", "")
    print(f"==================================================")
    print(f"NAME: {ep['name']}")
    print(f"PATH: {ep['path']}")
    print(f"METHOD: {method}")
    print(f"URL: {raw_url}")
    print(f"HEADERS:")
    for h in req.get("header", []):
        print(f"  {h.get('key')}: {h.get('value')}")
    body = req.get("body")
    if body:
        print(f"BODY MODE: {body.get('mode')}")
        if body.get("mode") == "raw":
            print(f"RAW BODY:\n{body.get('raw')}")
        elif body.get("mode") == "formdata":
            print("FORMDATA:")
            for p in body.get("formdata", []):
                print(f"  {p.get('key')} ({p.get('type')}): {p.get('value')} (src: {p.get('src')})")
        elif body.get("mode") == "urlencoded":
            print("URLENCODED:")
            for p in body.get("urlencoded", []):
                print(f"  {p.get('key')}: {p.get('value')}")
    print(f"RESPONSES COUNT: {len(ep['responses'])}")
    for i, resp in enumerate(ep['responses']):
        print(f"  --- Response {i+1}: {resp.get('name')} (Status: {resp.get('code')} {resp.get('status')}) ---")
        resp_body = resp.get("body", "")
        if resp_body:
            # print first 500 chars or formatted json
            try:
                parsed = json.loads(resp_body)
                print("  Body preview (JSON):")
                print(json.dumps(parsed, indent=2)[:800])
            except Exception:
                print("  Body preview (Text):", resp_body[:300])

print("\n>>>>>>>>>> TARGET 1: PATIENT PROFILE / CONTEXT RESOLUTION <<<<<<<<<<")
t1_matches = [ep for ep in all_endpoints if any(k in ep['request'].get('url', {}).get('raw', '') for k in [
    "/doctors/patients/:patientProfileId",
    "/doctors/patients",
    "/admin/patients/:patientId",
    "/patients/profile",
    "/patients/me"
])]
for ep in t1_matches:
    dump_ep_info(ep)

