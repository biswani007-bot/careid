import json

with open('CareID-Staging.postman_collection.json', 'r', encoding='utf-8') as f:
    text = f.read()

import re
matches = re.findall(r'"([^"]*eyJ[^"]*)"', text)
for m in set(matches):
    print('FULL VALUE:', repr(m))

# Find lines containing this value
for i, line in enumerate(text.splitlines()):
    if any(m in line for m in set(matches)):
        print(f'Line {i+1}: {line.strip()}')
