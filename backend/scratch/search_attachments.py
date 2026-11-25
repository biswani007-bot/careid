import re

bundle_path = r'C:\Users\PABANI\careidadmin-bundle.js'
with open(bundle_path, 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

matches = list(re.finditer(r'attachment', text, re.IGNORECASE))
print(f"Total 'attachment' matches: {len(matches)}")

upload_matches = list(re.finditer(r'upload', text, re.IGNORECASE))
print(f"Total 'upload' matches: {len(upload_matches)}")

# Find FormData usages or file uploads
fd_matches = list(re.finditer(r'FormData', text))
print(f"FormData matches: {len(fd_matches)}")
for m in fd_matches:
    start = max(0, m.start() - 100)
    end = min(len(text), m.end() + 200)
    print(f"\n[FormData at {m.start()}]:")
    print(text[start:end])
