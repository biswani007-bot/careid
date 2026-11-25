import urllib.request
import json
import ssl

ctx = ssl.create_default_context()

def make_req(url, method="GET", data=None, headers=None):
    if headers is None:
        headers = {}
    if data is not None and isinstance(data, (dict, list)):
        data = json.dumps(data).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
            body = resp.read().decode("utf-8")
            return resp.status, body
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        return e.code, body
    except Exception as e:
        return 0, str(e)

# 1. Login to get token
status, body = make_req(
    "https://360api.vnvision.in/api/v1/auth/otp/request",
    method="POST",
    data={"phone": "+16505550003"}
)
res_json = json.loads(body)
challenge_id = res_json.get("data", {}).get("challengeId")

status, body = make_req(
    "https://360api.vnvision.in/api/v1/auth/otp/verify",
    method="POST",
    data={"challengeId": challenge_id, "otpCode": "123456"}
)
token_data = json.loads(body).get("data", {})
access_token = token_data.get("accessToken")
print("Access token acquired successfully.")

auth_headers = {
    "Authorization": f"Bearer {access_token}",
    "Accept": "application/json"
}

# TARGET 1: Patient Profile / Context Resolution
print("\n==================== TARGET 1: PATIENT PROFILE ====================")
patient_id = "787e5187-7859-4320-bb1a-465a57dd086a"

print(f"1. Testing GET /api/v1/doctors/patients/{patient_id} ...")
s, b = make_req(f"https://360api.vnvision.in/api/v1/doctors/patients/{patient_id}", headers=auth_headers)
print("Status:", s)
print("Body:", b[:1000])

print("\n2. Testing GET /api/v1/doctors/patients ...")
s, b = make_req("https://360api.vnvision.in/api/v1/doctors/patients", headers=auth_headers)
print("Status:", s)
print("Body:", b[:500])

print(f"\n3. Testing GET /api/v1/admin/patients/{patient_id} ...")
s, b = make_req(f"https://360api.vnvision.in/api/v1/admin/patients/{patient_id}", headers=auth_headers)
print("Status:", s)
print("Body:", b[:500])

print(f"\n4. Testing GET /api/v1/patients/{patient_id} ...")
s, b = make_req(f"https://360api.vnvision.in/api/v1/patients/{patient_id}", headers=auth_headers)
print("Status:", s)
print("Body:", b[:500])

print("\n5. Testing GET /api/v1/doctors/me ...")
s, b = make_req("https://360api.vnvision.in/api/v1/doctors/me", headers=auth_headers)
print("Status:", s)
print("Body:", b[:500])

print("\n6. Testing GET /api/v1/auth/me ...")
s, b = make_req("https://360api.vnvision.in/api/v1/auth/me", headers=auth_headers)
print("Status:", s)
print("Body:", b[:500])

