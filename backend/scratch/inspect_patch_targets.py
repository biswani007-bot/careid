bundle_path = r'C:\Users\PABANI\careidadmin-bundle.js'
with open(bundle_path, 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

import re

# Find ay()
m_ay = re.search(r'function ay\(\)\{let e=S\(\);return et\(\{mutationFn:async e=>\{let t=`\$\{e\.firstName\.trim\(\)\} \$\{e\.lastName\.trim\(\)\}`.*?\}\)\}', text)
if m_ay:
    print("Found ay():", len(m_ay.group(0)), "chars")
    print(m_ay.group(0)[:200], "...", m_ay.group(0)[-100:])
else:
    print("ay() not matched by regex, searching substring...")
    idx = text.find('function ay()')
    if idx != -1:
        print(text[idx:idx+500])

# Find nS()
idx_ns = text.find('nS=()=>{let e=S();return et({mutationFn:async e=>{throw Error(`Admin Medical Record Upload is not currently exposed')
if idx_ns != -1:
    print("\nFound nS():")
    print(text[idx_ns:idx_ns+350])
