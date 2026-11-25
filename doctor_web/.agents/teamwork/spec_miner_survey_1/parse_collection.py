import json
from pathlib import Path

col_path = Path("Postman collection/CareID-Staging.postman_collection.json")
with open(col_path, "r", encoding="utf-8") as f:
    data = json.load(f)

print("Collection info:", data.get("info", {}).get("name"))

def list_tree(items, path=""):
    results = []
    for it in items:
        name = it.get("name", "")
        current_path = f"{path} / {name}" if path else name
        if "item" in it:
            results.append((current_path, "FOLDER", len(it["item"])))
            results.extend(list_tree(it["item"], current_path))
        else:
            req = it.get("request", {})
            method = req.get("method", "")
            url = req.get("url", {})
            raw_url = url.get("raw", "") if isinstance(url, dict) else str(url)
            results.append((current_path, method, raw_url))
    return results

tree = list_tree(data.get("item", []))
folders = [t for t in tree if t[1] == "FOLDER"]
requests = [t for t in tree if t[1] != "FOLDER"]

print(f"Total folders: {len(folders)}")
print(f"Total requests: {len(requests)}")

print("\n--- TOP-LEVEL / HIGH-LEVEL FOLDERS ---")
for t in tree:
    # print items with depth <= 2
    depth = t[0].count(" / ")
    if depth <= 1 and t[1] == "FOLDER":
        print(f"[{t[1]}] {t[0]} ({t[2]} items)")
