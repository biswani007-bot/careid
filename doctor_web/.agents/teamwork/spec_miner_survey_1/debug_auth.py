import urllib.request
import json
import ssl

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

s1, b1 = make_req(
    "https://360api.vnvision.in/api/v1/auth/otp/request",
    method="POST",
    data={"phone": "+16505550003"}
)
print("OTP Request:", s1, b1)
ch_id = json.loads(b1).get("data", {}).get("challengeId")

s2, b2 = make_req(
    "https://360api.vnvision.in/api/v1/auth/otp/verify",
    method="POST",
    data={"challengeId": ch_id, "otpCode": "123456"}
)
print("OTP Verify:", s2, b2)
token = json.loads(b2).get("data", {}).get("accessToken")
print("Access Token present?", bool(token))
if token:
    print("Token prefix:", token[:30])
