import os
import shutil
import zipfile
import re

ROOT_DIR = r"c:\Users\PABANI\Downloads\hvapi-main\hvapi-main"
SOURCE_DIR = os.path.join(ROOT_DIR, "careid-ocr")
ZIP_PATH = os.path.join(ROOT_DIR, "careid-ocr-deployment.zip")

print("--- Preparing CareID OCR Deployment Archive ---")

# 1. Clean cache directories
for root, dirs, files in os.walk(SOURCE_DIR, topdown=False):
    for d in dirs:
        if d in ("__pycache__", ".pytest_cache", "tmp", "temp"):
            full_path = os.path.join(root, d)
            print(f"Removing cache directory: {full_path}")
            shutil.rmtree(full_path, ignore_errors=True)

# 2. Convert shell scripts to LF line endings for Linux compatibility
scripts_to_fix = [
    os.path.join(SOURCE_DIR, "scripts", "install.sh"),
    os.path.join(SOURCE_DIR, "scripts", "start.sh"),
    os.path.join(SOURCE_DIR, "scripts", "health-check.sh"),
    os.path.join(SOURCE_DIR, "scripts", "download_models.py"),
]

for s in scripts_to_fix:
    if os.path.exists(s):
        with open(s, "rb") as f:
            content = f.read()
        lf_content = content.replace(b"\r\n", b"\n")
        with open(s, "wb") as f:
            f.write(lf_content)
        print(f"Normalized LF line endings for: {os.path.basename(s)}")

# 3. Create ZIP archive
if os.path.exists(ZIP_PATH):
    os.remove(ZIP_PATH)

prohibited_patterns = [
    r"venv", r"\.env$", r"__pycache__", r"\.pytest_cache", r"\.pyc$", r"\.git[\\/]", r"Thumbs\.db"
]

zip_entries = []
with zipfile.ZipFile(ZIP_PATH, "w", zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk(SOURCE_DIR):
        for file in files:
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, SOURCE_DIR).replace('\\', '/')
            
            # Verify no prohibited file
            for pat in prohibited_patterns:
                if re.search(pat, rel_path, re.IGNORECASE):
                    raise ValueError(f"Prohibited file detected: {rel_path} matches {pat}")
            
            zf.write(full_path, rel_path)
            zip_entries.append(rel_path)

print(f"\nSuccessfully created: {ZIP_PATH}")
print(f"Total files in archive: {len(zip_entries)}")
print(f"Archive file size: {os.path.getsize(ZIP_PATH):,} bytes")

print("\n--- Validating ZIP Archive ---")
with zipfile.ZipFile(ZIP_PATH, "r") as zf:
    bad_file = zf.testzip()
    if bad_file:
        raise ValueError(f"Corrupted file in ZIP: {bad_file}")
    print("✓ ZIP integrity test: PASSED (Zero corruption)")
    
    infolist = zf.infolist()
    print(f"✓ Total verified entries: {len(infolist)}")
    for info in infolist:
        print(f"  [{info.file_size:6d} bytes] {info.filename}")
