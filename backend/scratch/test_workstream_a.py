import urllib.request
import json

# Admin login
req = urllib.request.Request(
    'https://360api.vnvision.in/api/v1/auth/password/login',
    data=json.dumps({'identifier': 'admin@careid.test', 'password': 'Admin@123'}).encode('utf-8'),
    headers={'Content-Type': 'application/json'}
)
res = urllib.request.urlopen(req)
admin_token = (json.loads(res.read().decode()).get('data') or {}).get('accessToken')

# Test directly with admin token (ADMIN has access to inspect all offer endpoints)
token = admin_token

# List treatment offers as admin
req3 = urllib.request.Request(
    'https://360api.vnvision.in/api/v1/doctors/treatment-offers',
    headers={'Authorization': f'Bearer {token}'}
)
res3 = urllib.request.urlopen(req3)
offers_data = json.loads(res3.read().decode()).get('data') or {}
offers = offers_data.get('items') or []
print(f"Total offers found: {len(offers)}")

for off in offers[:3]:
    offer_id = off['id']
    status = off.get('status')
    version = off.get('version')
    print(f"\n--- Offer: {offer_id} (status: {status}, version: {version}) ---")

    # 1. Test financing endpoints
    print("Testing Financing endpoints:")
    # GET financing
    try:
        r = urllib.request.Request(
            f'https://360api.vnvision.in/api/v1/doctors/treatment-offers/{offer_id}/financing',
            headers={'Authorization': f'Bearer {token}'}
        )
        with urllib.request.urlopen(r) as res_fin:
            print("  GET financing: 200 OK ->", res_fin.read().decode()[:120])
    except urllib.error.HTTPError as e:
        print(f"  GET financing: {e.code} -> {e.read().decode()[:120]}")

    # POST financing-preview
    try:
        r = urllib.request.Request(
            f'https://360api.vnvision.in/api/v1/doctors/treatment-offers/{offer_id}/financing-preview',
            data=json.dumps({
                'partnerName': 'CareCredit Health',
                'interestRate': 0,
                'downPaymentPercent': 10,
                'tenureMonths': [3, 6, 9, 12]
            }).encode(),
            headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
        )
        with urllib.request.urlopen(r) as res_prev:
            print("  POST financing-preview: 200 OK ->", res_prev.read().decode()[:120])
    except urllib.error.HTTPError as e:
        print(f"  POST financing-preview: {e.code} -> {e.read().decode()[:120]}")

    # PUT financing
    try:
        r = urllib.request.Request(
            f'https://360api.vnvision.in/api/v1/doctors/treatment-offers/{offer_id}/financing',
            data=json.dumps({
                'partnerName': 'CareCredit Health',
                'packageName': 'Zero-Cost Medical EMI',
                'tenureMonths': 6,
                'monthlyEmi': 5000,
                'totalAmountFinanced': 30000,
                'interestRate': 0,
                'processingFee': 0,
                'downPaymentAmount': 3000
            }).encode(),
            headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'},
            method='PUT'
        )
        with urllib.request.urlopen(r) as res_put:
            print("  PUT financing: 200 OK ->", res_put.read().decode()[:120])
    except urllib.error.HTTPError as e:
        print(f"  PUT financing: {e.code} -> {e.read().decode()[:120]}")

    # 2. Test discount status & approve
    print("Testing Discount endpoints:")
    try:
        r = urllib.request.Request(
            f'https://360api.vnvision.in/api/v1/doctors/treatment-offers/{offer_id}/discount-status',
            headers={'Authorization': f'Bearer {token}'}
        )
        with urllib.request.urlopen(r) as res_ds:
            print("  GET discount-status: 200 OK ->", res_ds.read().decode()[:120])
    except urllib.error.HTTPError as e:
        print(f"  GET discount-status: {e.code} -> {e.read().decode()[:120]}")

    try:
        r = urllib.request.Request(
            f'https://360api.vnvision.in/api/v1/doctors/treatment-offers/{offer_id}/approve-discount',
            data=json.dumps({'approved': True, 'comments': 'Supervisor approved'}).encode(),
            headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
        )
        with urllib.request.urlopen(r) as res_ad_admin:
            print("  Admin POST approve-discount: 200 OK ->", res_ad_admin.read().decode()[:120])
    except urllib.error.HTTPError as e:
        print(f"  Admin POST approve-discount: {e.code} -> {e.read().decode()[:120]}")

