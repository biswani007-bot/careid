import urllib.request
import json
import ssl

ctx = ssl.create_default_context()

refresh_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmYTUwMmYyZS0zMzJjLTRlYzAtYjZhYS04MzcxMzIxNmVjODgiLCJzZXNzaW9uSWQiOiI3MTNiOWM4My04OTQ5LTQ1MDktOGFkNy1mNGVhYTUzOWM1ZDgiLCJqdGkiOiIxNmNhZTkzOC1kNjc2LTQ3MjYtYTViNy00MThhNzJkOTFkNWIiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc5NDIwNzExOCwiZXhwIjoxNzk0ODExOTE4fQ.wSBKzOFsAZ7gVMEik23FLWd2CO8LlLef2_f4yAFRuQo"

req = urllib.request.Request(
    "https://360api.vnvision.in/api/v1/auth/token/refresh",
    data=json.dumps({"refreshToken": refresh_token}).encode("utf-8"),
    headers={"Content-Type": "application/json", "Accept": "application/json"},
    method="POST"
)
try:
    with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
        print("Refresh Status:", resp.status)
        res_body = resp.read().decode("utf-8")
        print("Refresh Body:", res_body)
        with open(".agents/teamwork/spec_miner_survey_1/doctor_tokens.json", "w") as f:
            f.write(res_body)
except urllib.error.HTTPError as e:
    print("Refresh Error Status:", e.code)
    print("Body:", e.read().decode("utf-8"))
