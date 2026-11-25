with open('scripts/generate-careid-postman.js', 'r', encoding='utf-8') as f:
    text = f.read()

targets = [
    "require('../dist/src/database/database.service')",
    "CareID Enterprise API — Staging Integration Collection",
    "'Financing & Financial Assistance': '27. Healthcare Financing & Financial Assistance',",
    "pathStr.includes('/auth/token/refresh')",
    "key: 'baseUrl',\n      value: 'https://360api.vnvision.in/api/v1',",
    'if (currentBase.endsWith("/api/v1")) {',
    "auth/(password/login|admin/login|otp/request|otp/verify|otp/resend|token/refresh|logout)",
    "value: 'https://360api.vnvision.in/api/v1',",
    "baseUrlVar.value = 'http://localhost:3000/api/v1';"
]

for t in targets:
    count = text.count(t)
    print(f'{t[:45]}... -> count: {count}')
