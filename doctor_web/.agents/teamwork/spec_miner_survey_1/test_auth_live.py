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

print("1. Requesting OTP for doctor phone: +16505550003...")
status, body = make_req(
    "https://360api.vnvision.in/api/v1/auth/otp/request",
    method="POST",
    data={"phone": "+16505550003"}
)
print("Status:", status)
print("Body:", body)

if status == 200 or status == 201:
    res_json = json.loads(body)
    challenge_id = res_json.get("data", {}).get("challengeId") or res_json.get("challengeId")
    print("\nGot challengeId:", challenge_id)
    
    print("\n2. Verifying OTP with code 123456...")
    status, body = make_req(
        "https://360api.vnvision.in/api/v1/auth/otp/verify",
        method="POST",
        data={"challengeId": challenge_id, "otpCode": "123456"}
    )
    print("Verify Status:", status)
    print("Verify Body:", body)
