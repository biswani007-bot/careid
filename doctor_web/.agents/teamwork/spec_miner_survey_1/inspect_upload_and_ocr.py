import json

with open("Postman collection/CareID-Staging.postman_collection.json", "r", encoding="utf-8") as f:
    data = json.load(f)

def find_by_name_part(items, name_part):
    matches = []
    for it in items:
        if "item" in it:
            matches.extend(find_by_name_part(it["item"], name_part))
        else:
            if name_part.lower() in it.get("name", "").lower():
                matches.append(it)
    return matches

print("=== Upload an unlinked or global attachment ===")
uploads = find_by_name_part(data.get("item", []), "Upload an unlinked or global attachment")
for u in uploads:
    print(json.dumps(u, indent=2)[:3000])

print("\n=== OCR SUBMIT / CREATE JOB ===")
ocr_jobs = find_by_name_part(data.get("item", []), "Submit medical attachment for local CPU OCR processing")
for o in ocr_jobs:
    print(json.dumps(o, indent=2)[:3000])

