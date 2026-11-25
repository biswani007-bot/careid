import urllib.request
import json
import ssl
import time

ctx = ssl.create_default_context()

def make_req(url, method="GET", data=None, headers=None):
    if headers is None:
        headers = {}
    if data is not None and isinstance(data, (dict, list)):
        data = json.dumps(data).encode("utf-8")
        if "Content-Type" not in headers:
            headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
            return resp.status, resp.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8")

# Let's test admin password login first:
s, b = make_req(
    "https://360api.vnvision.in/api/v1/auth/password/login",
    method="POST",
    data={"identifier": "superadmin@careid.test", "password": "Password123!"}
)
print("Superadmin Password Login:", s, b[:300])

# Let's test doctor phone OTP request with backoff
for attempt in range(4):
    s, b = make_req(
        "https://360api.vnvision.in/api/v1/auth/otp/request",
        method="POST",
        data={"phone": "+16505550003"}
    )
    print(f"Attempt {attempt+1} - OTP Request status:", s)
    if s == 200:
        ch_id = json.loads(b).get("data", {}).get("challengeId")
        s2, b2 = make_req(
            "https://360api.vnvision.in/api/v1/auth/otp/verify",
            method="POST",
            data={"challengeId": ch_id, "otpCode": "123456"}
        )
        print("OTP Verify Status:", s2)
        tokens = json.loads(b2).get("data", {})
        print("AccessToken obtained! Length:", len(tokens.get("accessToken", "")))
        print("RefreshToken obtained! Length:", len(tokens.get("refreshToken", "")))
        # Save tokens to a local file so we can reuse without re-requesting OTP
        with open(".agents/teamwork/spec_miner_survey_1/doctor_tokens.json", "w") as f:
            json.dump(tokens, f)
        break
    else:
        print("Waiting 15 seconds before retry...")
        time.sleep(15)
