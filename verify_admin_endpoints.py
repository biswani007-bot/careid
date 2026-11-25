import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

BASE_URL = "http://localhost:3001"

def req(method, path, body=None, token=None):
    url = f"{BASE_URL}{path}"
    data = json.dumps(body).encode('utf-8') if body else None
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    r = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r, context=ctx) as response:
            res_body = response.read().decode('utf-8')
            return response.status, json.loads(res_body)
    except urllib.error.HTTPError as e:
        err_body = e.read().decode('utf-8')
        try:
            return e.code, json.loads(err_body)
        except:
            return e.code, err_body
    except Exception as ex:
        return 0, str(ex)

print("=== 1. Testing Password Login ===")
s, b = req("POST", "/api/v1/auth/password/login", {"identifier": "superadmin@careid.test", "password": "NewSecureAdminPassword123!"})
print(f"Status: {s}, Success: {b.get('success') if isinstance(b, dict) else False}")
token = b.get("data", {}).get("access_token") if isinstance(b, dict) else None
print(f"Token acquired: {bool(token)}")

print("\n=== 2. Testing OTP Login (PRD 4.4.1) ===")
s_req, b_req = req("POST", "/api/v1/auth/otp/request", {"phone": "+16505550001"})
print(f"OTP Request status: {s_req}, Success: {b_req.get('success') if isinstance(b_req, dict) else False}")
challenge_id = b_req.get("data", {}).get("challengeId") if isinstance(b_req, dict) else None
print(f"Challenge ID: {challenge_id}")

if challenge_id:
    s_v, b_v = req("POST", "/api/v1/auth/otp/verify", {"challengeId": challenge_id, "otpCode": "123456"})
    print(f"OTP Verify status: {s_v}, Success: {b_v.get('success') if isinstance(b_v, dict) else False}")
    otp_token = b_v.get("data", {}).get("accessToken") if isinstance(b_v, dict) else None
    print(f"OTP Access token acquired: {bool(otp_token)}")
    if otp_token:
        token = otp_token

print("\n=== 3. Testing CMS Policies (PRD 4.4.6 & 4.4.7) ===")
s_pol, b_pol = req("GET", "/api/v1/cms/policies", token=token)
print(f"Policies GET status: {s_pol}, Data count: {len(b_pol.get('data', [])) if isinstance(b_pol, dict) else 'N/A'}")

# Create Privacy Policy test record
s_cp, b_cp = req("POST", "/api/v1/cms/policies", {
    "title": "HIPAA & Patient Data Privacy Policy",
    "policyType": "PRIVACY",
    "version": "2.4",
    "content": "All personal health information (PHI) is encrypted at rest and in transit.",
    "status": "PUBLISHED"
}, token=token)
print(f"Create Policy status: {s_cp}, Success: {b_cp.get('success') if isinstance(b_cp, dict) else False}")

# Create Terms of Service test record
s_ct, b_ct = req("POST", "/api/v1/cms/policies", {
    "title": "CareID Master Terms of Service",
    "policyType": "TERMS",
    "version": "3.1",
    "content": "Terms & Conditions of Service for CareID Health Vault 360.",
    "status": "PUBLISHED"
}, token=token)
print(f"Create Terms status: {s_ct}, Success: {b_ct.get('success') if isinstance(b_ct, dict) else False}")

print("\n=== 4. Testing CMS Pages, FAQs & Banners (PRD 4.4.10) ===")
s_pg, b_pg = req("GET", "/api/v1/cms/pages", token=token)
print(f"Pages status: {s_pg}, count: {len(b_pg.get('data', [])) if isinstance(b_pg, dict) else 0}")
s_faq, b_faq = req("GET", "/api/v1/cms/faqs", token=token)
print(f"FAQs status: {s_faq}, count: {len(b_faq.get('data', [])) if isinstance(b_faq, dict) else 0}")
s_ban, b_ban = req("GET", "/api/v1/cms/banners", token=token)
print(f"Banners status: {s_ban}, count: {len(b_ban.get('data', [])) if isinstance(b_ban, dict) else 0}")

print("\n=== 5. Testing Financing API (CR-02) ===")
s_fin, b_fin = req("GET", "/api/v1/financing/options", token=token)
print(f"Financing Options status: {s_fin}, count: {len(b_fin.get('data', [])) if isinstance(b_fin, dict) else 0}")
s_app, b_app = req("GET", "/api/v1/financing/applications", token=token)
print(f"Financing Applications status: {s_app}, count: {len(b_app.get('data', [])) if isinstance(b_app, dict) else 0}")

print("\n=== 6. Testing System Settings Persistence (PRD 4.4.9) ===")
s_set, b_set = req("GET", "/api/v1/admin/settings", token=token)
print(f"System settings GET status: {s_set}, count: {len(b_set.get('data', [])) if isinstance(b_set, dict) else 0}")
# Test upsert social media platform settings
s_up, b_up = req("PUT", "/api/v1/admin/settings", {
    "category": "BRANDING",
    "key": "SOCIAL_LINKEDIN",
    "value": "https://linkedin.com/company/careid-health",
    "valueType": "STRING",
    "description": "Official LinkedIn handle"
}, token=token)
print(f"Upsert setting status: {s_up}, Success: {b_up.get('success') if isinstance(b_up, dict) else False}")

print("\n=== 7. Testing Reports Executive Endpoint (PRD 4.4.12) ===")
s_rep, b_rep = req("GET", "/api/v1/reports/dashboard/executive", token=token)
print(f"Reports Executive status: {s_rep}, Success: {b_rep.get('success') if isinstance(b_rep, dict) else False}")

print("\nAll API verification steps complete!")
