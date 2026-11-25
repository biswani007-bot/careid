bundle_path = r'C:\Users\PABANI\careidadmin-bundle.js'
with open(bundle_path, 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

print("Snippet from 1368000 to 1372000:")
print(text[1368000:1372000])

print("\n\nSnippet from 1372000 to 1376000:")
print(text[1372000:1376000])

print("\n\nSnippet from 1376000 to 1380000:")
print(text[1376000:1380000])
