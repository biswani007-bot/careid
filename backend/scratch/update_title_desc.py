with open('scripts/generate-careid-postman.js', 'r', encoding='utf-8') as f:
    text = f.read()

target = "collection.info.name = 'CareID API — Staging Integration Collection (November 6, 2026 Release)';"
replacement = "collection.info.name = 'CareID Enterprise API — Consolidated Staging Integration Collection (Phase 12 Release — November 16, 2026)';"
assert target in text, 'Target not found'
text = text.replace(target, replacement)

# Replace description elements
text = text.replace('November 6, 2026 Production & Staging Release', 'Phase 12 Final Consolidated Release (November 16, 2026)')
text = text.replace('Total Operations: 559 HTTP operations across 27 domain folders', 'Total Operations: 687 HTTP operations across 36 domain folders')
text = text.replace('Default Base URL: `https://360api.vnvision.in/api/v1`', 'Default Base URL: `https://360api.vnvision.in`')
text = text.replace('6 sequential migrations', '7 sequential migrations')

with open('scripts/generate-careid-postman.js', 'w', encoding='utf-8') as f:
    f.write(text)
print('SUCCESS: Updated line 794 and description!')
