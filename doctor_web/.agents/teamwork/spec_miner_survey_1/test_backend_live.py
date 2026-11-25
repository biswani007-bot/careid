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

print("Checking Health Check...")
status, body = make_req("https://360api.vnvision.in/api/v1/health")
print("Health Status:", status)
print("Health Body:", body)

print("\nChecking Ready Probe...")
status, body = make_req("https://360api.vnvision.in/api/v1/ready")
print("Ready Status:", status)
print("Ready Body:", body)

