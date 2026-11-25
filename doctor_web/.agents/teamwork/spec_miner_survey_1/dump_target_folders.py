import json

col_path = "Postman collection/CareID-Staging.postman_collection.json"
with open(col_path, "r", encoding="utf-8") as f:
    data = json.load(f)

target_folders = [
    "01. Environment & Health Checks",
    "02. Authentication & OTP",
    "03. User Profile & Account",
    "05. Doctor Portal",
    "06. Patient App",
    "08. Medical Records (General, Dental & Vision)",
    "15. OCR & Document Verification",
    "16. File Uploads & Attachments",
]

def dump_folder(item, parent_name=""):
    name = item.get("name", "")
    full_name = f"{parent_name} / {name}" if parent_name else name
    if "item" in item:
        for sub in item["item"]:
            dump_folder(sub, full_name)
    else:
        req = item.get("request", {})
        method = req.get("method", "")
        url = req.get("url", {})
        raw_url = url.get("raw", "") if isinstance(url, dict) else str(url)
        print(f"[{method}] {full_name} -> {raw_url}")

for it in data.get("item", []):
    name = it.get("name", "")
    if any(tf in name for tf in target_folders):
        print(f"\n=================== FOLDER: {name} ===================")
        dump_folder(it)
