import re

bundle_path = r'C:\Users\PABANI\careidadmin-bundle.js'
with open(bundle_path, 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

# Search for /upload or post(.*upload)
matches = list(re.finditer(r'q\.post\([^)]*upload', text, re.IGNORECASE))
print(f"q.post with upload matches: {len(matches)}")
for m in matches:
    start = max(0, m.start() - 50)
    end = min(len(text), m.end() + 150)
    print(text[start:end])

# Also search for files/upload, media/upload, documents, etc.
matches2 = list(re.finditer(r'/api/v1/[a-zA-Z0-9_\-/]*upload[a-zA-Z0-9_\-/]*', text, re.IGNORECASE))
print(f"API endpoints with upload: {len(matches2)}")
for m in matches2:
    start = max(0, m.start() - 50)
    end = min(len(text), m.end() + 100)
    print(text[start:end])

# Search for where attachments or documents are uploaded in the UI
matches3 = list(re.finditer(r'attachment', text, re.IGNORECASE))
for m in matches3[:10]:
    start = max(0, m.start() - 50)
    end = min(len(text), m.end() + 150)
    print("ATTACHMENT:", text[start:end])
