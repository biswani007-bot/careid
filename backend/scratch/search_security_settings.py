import os

for root, dirs, files in os.walk('.'):
    for f in files:
        if f.endswith(('.ts', '.js', '.json', '.md')):
            if 'node_modules' not in root and '.git' not in root and 'dist' not in root:
                path = os.path.join(root, f)
                try:
                    text = open(path, encoding='utf-8', errors='ignore').read()
                    if 'category=SECURITY' in text or "'SECURITY'" in text or '"SECURITY"' in text:
                        print(path)
                except Exception:
                    pass
