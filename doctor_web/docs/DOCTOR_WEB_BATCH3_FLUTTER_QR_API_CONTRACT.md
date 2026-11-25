# CareID — Flutter Doctor App QR API Contract
## Document Reference: `DOCTOR_WEB_BATCH3_FLUTTER_QR_API_CONTRACT`
**Version:** 1.0  
**Date:** 2026-11-20  
**Batch:** CAREID-DOCTOR-WEB-BATCH-03-REVISED  
**Audience:** Developer 2 (Flutter Doctor App team)  
**Status:** APPROVED FOR INTEGRATION

---

## Architecture Decision (Locked)

Camera-based QR scanning is **exclusively assigned to the Flutter Doctor App** (Developer 2). The CareID Doctor Web browser application does **not** implement camera QR scanning, WebRTC, or any browser camera permission workflow. The QR scanner modal has been removed from Doctor Web as of Batch 3 Milestone 3.

Doctor Web retains read-only Smart Health Card verification capabilities by calling the same backend QR API endpoints documented here — triggered by the Flutter app's scan result forwarded over secure channels, not by in-browser camera capture.

---

## Base URL

| Environment | Base URL |
|---|---|
| Local Integration | `http://localhost:3001` |
| Staging | `https://api-staging.careid.example.com` |
| Production | `https://api.careid.example.com` |

All endpoints require `Content-Type: application/json`.

---

## Authentication

All QR verification endpoints require a valid **Bearer JWT** token issued by the CareID Auth service.

```
Authorization: Bearer <jwt_token>
```

The JWT must be issued for a user with one of the following roles:
- `DOCTOR`
- `VETERINARIAN`
- `DOCTOR_VET`
- `ADMIN`
- `SUPER_ADMIN`

Requests without a valid JWT → `401 Unauthorized`.  
Requests with a valid JWT but insufficient role → `403 Forbidden`.

---

## Endpoint 1: Verify QR Token

### `POST /api/v1/qr/verify`

Verifies a QR token scanned by the Flutter Doctor App. Checks token authenticity, status, expiry, and logs the scan to the audit trail.

**This is the primary endpoint for Flutter to call after capturing a QR code.**

#### Request

```http
POST /api/v1/qr/verify
Authorization: Bearer <doctor_jwt_token>
Content-Type: application/json
```

```json
{
  "token": "HVQR-A1B2C3D4E5F6G7H8",
  "deviceInfo": "Flutter / Android 14 / Pixel 8",
  "location": "37.7749,-122.4194"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `token` | `string` | **Yes** | QR token string from the scanned QR code |
| `deviceInfo` | `string` | No | Device and OS info for audit logging |
| `location` | `string` | No | GPS coordinates for audit logging (`lat,lng`) |

#### Response: 200 OK — Valid Token

```json
{
  "isValid": true,
  "status": "VALID",
  "entityType": "HEALTH_CARD",
  "entityId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "ownerId": "owner-profile-uuid-here",
  "scannedAt": "2026-11-20T15:30:00.000Z"
}
```

#### Response: 200 OK — Invalid / Expired / Revoked Token

The HTTP status is always `200`; the `isValid` flag and `status` field encode the result:

```json
{
  "isValid": false,
  "status": "EXPIRED",
  "entityType": "HEALTH_CARD",
  "entityId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "ownerId": "owner-profile-uuid-here",
  "failureReason": "QR Token has expired",
  "scannedAt": "2026-11-20T15:30:00.000Z"
}
```

| `status` | `isValid` | Meaning |
|---|---|---|
| `VALID` | `true` | Token is authentic, active and not expired |
| `EXPIRED` | `false` | Token validity period has passed |
| `REVOKED` | `false` | Token was revoked by owner or admin |
| `ROTATED` | `false` | Token was superseded by a rotated token |
| `INVALID` | `false` | Token not found in repository (malformed or forged) |
| `UNKNOWN` | `false` | Unknown error or missing token |

#### Response Schema

| Field | Type | Description |
|---|---|---|
| `isValid` | `boolean` | Whether the scan was clinically accepted |
| `status` | `string` | Verification outcome (see table above) |
| `entityType` | `string` | Type of CareID entity (see Entity Types below) |
| `entityId` | `string` | UUID of the entity linked to this QR code |
| `ownerId` | `string` | UUID of the profile that owns this QR code |
| `failureReason` | `string?` | Human-readable failure description (if `isValid=false`) |
| `scannedAt` | `string` | ISO 8601 UTC timestamp of the scan |

#### Entity Types

| `entityType` | Description |
|---|---|
| `HEALTH_CARD` | Patient Smart Health Card |
| `MEDICAL_RECORD` | Individual medical record |
| `MEDICAL_REPORT` | Diagnostic report |
| `INSURANCE` | Insurance card |
| `IMMUNISATION` | Vaccination / immunisation record |
| `DOCTOR_ID` | Doctor identity card |
| `FACILITY_ID` | Healthcare facility ID |
| `STAFF_ID` | Staff member ID |
| `EMERGENCY_CARD` | Emergency access card |
| `CUSTOM` | Custom/miscellaneous entity |

---

## Endpoint 2: Generate QR Token

### `POST /api/v1/qr/generate`

Generates a new cryptographically signed QR token for a CareID entity.

> **Note:** This endpoint is typically called by the backend/admin when issuing a new Smart Health Card, not by the Flutter scanning flow. Included here for completeness.

#### Request

```http
POST /api/v1/qr/generate
Authorization: Bearer <doctor_jwt_token>
Content-Type: application/json
```

```json
{
  "entityId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "entityType": "HEALTH_CARD",
  "validityDays": 365
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `entityId` | `string` | **Yes** | UUID of the entity to associate with this QR |
| `entityType` | `string` | **Yes** | One of the entity types listed above |
| `validityDays` | `number` | No | Days until expiry (default: 365, min: 1) |

#### Response: 201 Created

```json
{
  "id": "qr-record-uuid",
  "entityId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "entityType": "HEALTH_CARD",
  "ownerId": "owner-profile-uuid",
  "token": "HVQR-A1B2C3D4E5F6G7H8",
  "signature": "hmac-sha256-hex-string",
  "status": "ACTIVE",
  "version": 1,
  "nonce": "random-hex-nonce",
  "checksum": "sha256-hex-checksum",
  "issuedAt": "2026-11-20T00:00:00.000Z",
  "expiresAt": "2027-11-20T00:00:00.000Z",
  "isDeleted": false,
  "createdAt": "2026-11-20T00:00:00.000Z",
  "updatedAt": "2026-11-20T00:00:00.000Z"
}
```

---

## Token Cryptography

QR tokens are cryptographically signed using **HMAC-SHA256**.

### Token Format

```
HVQR-<16-character-uppercase-hex>
Example: HVQR-A1B2C3D4E5F6G7H8
```

### Signing Process

1. Build raw payload: `{entityType}:{entityId}:{nonce}:{timestamp}`
2. Compute SHA-256 checksum of the raw payload
3. Sign checksum with HMAC-SHA256 using `QR_HMAC_SECRET`
4. Store `token`, `signature`, `checksum`, and `nonce` in the database

### Verification Process

The backend `POST /api/v1/qr/verify`:
1. Looks up the token in the database
2. Checks token status (`ACTIVE`, `REVOKED`, `ROTATED`)
3. Checks expiry against `expiresAt`
4. If valid, records a scan log entry
5. Returns `isValid: true` with entity details

> **Important:** The Flutter app does **not** need to verify the HMAC signature itself — the backend performs all cryptographic verification. The Flutter app only needs to send the raw `token` string from the QR code.

---

## Scan Audit Logging

Every call to `POST /api/v1/qr/verify` writes a scan log entry regardless of outcome. The log captures:

- `verifierUserId` — the authenticated doctor's user ID
- `validationResult` — `VALID`, `INVALID`, `EXPIRED`, `REVOKED`
- `failureReason` — description if not valid
- `deviceInfo` — from request body (Flutter device string)
- `location` — from request body (GPS coordinates)
- `scannedAt` — UTC timestamp

Scan logs are queryable by admin via `GET /api/v1/qr/:id/scan-logs`.

---

## Species / Identity Binding

QR tokens encode `entityType` and `entityId`. The backend enforces species-level access:

| Token `entityType` | Required doctor role for clinical follow-up |
|---|---|
| `HEALTH_CARD` (human patient) | `DOCTOR` or `DOCTOR_VET` |
| `HEALTH_CARD` (pet/companion animal) | `VETERINARIAN` or `DOCTOR_VET` |

After a successful QR verification, the Flutter app must use the returned `entityId` to fetch clinical records through role-appropriate endpoints. Calling human record endpoints with a veterinarian JWT → `403 Forbidden`.

---

## Error Codes

| HTTP Status | Meaning | When |
|---|---|---|
| `200 OK` | Verification attempt processed | Always (even when `isValid=false`) |
| `201 Created` | QR token generated | `POST /api/v1/qr/generate` success |
| `400 Bad Request` | Missing required field or malformed UUID | Invalid `token` format |
| `401 Unauthorized` | Missing or invalid JWT | No/expired `Authorization` header |
| `403 Forbidden` | Valid JWT but insufficient role | Doctor role missing; species mismatch |
| `404 Not Found` | Resource not found | QR ID not found (admin endpoints) |
| `409 Conflict` | Conflict error | Multiple active QRs during rotate without explicit ID |
| `422 Unprocessable Entity` | Validation error | DTO validation failure |
| `500 Internal Server Error` | Unexpected server error | Should be rare; report to backend team |

> **Note:** Replayed and expired tokens return HTTP `200` with `isValid: false` and descriptive `status` / `failureReason` fields — not HTTP 4xx. The Flutter app must check `isValid` and `status`, not just HTTP status code.

---

## Flutter Integration Guide

### Step 1: Scan QR Code
Use the Flutter camera plugin or `mobile_scanner` to capture the raw QR string.

```dart
// Example QR token string captured from QR code:
// "HVQR-A1B2C3D4E5F6G7H8"
String scannedToken = result.code ?? '';
```

### Step 2: Call Verify Endpoint

```dart
final response = await http.post(
  Uri.parse('$baseUrl/api/v1/qr/verify'),
  headers: {
    'Authorization': 'Bearer $doctorJwtToken',
    'Content-Type': 'application/json',
  },
  body: jsonEncode({
    'token': scannedToken,
    'deviceInfo': 'Flutter / ${Platform.operatingSystem}',
    'location': '$latitude,$longitude',  // optional
  }),
);

final body = jsonDecode(response.body);
final isValid = body['isValid'] as bool;
final status = body['status'] as String;
final entityType = body['entityType'] as String;
final entityId = body['entityId'] as String;
```

### Step 3: Handle Result

```dart
if (response.statusCode == 200 && isValid) {
  // Token is valid — proceed to fetch patient/pet record
  if (entityType == 'HEALTH_CARD') {
    navigateToPatientRecord(entityId);
  }
} else {
  // Show appropriate error to doctor
  switch (status) {
    case 'EXPIRED':
      showError('This Smart Health Card has expired.');
      break;
    case 'REVOKED':
      showError('This card has been revoked.');
      break;
    case 'ROTATED':
      showError('This card has been updated. Please rescan the new card.');
      break;
    case 'INVALID':
    default:
      showError('Invalid or unrecognized QR code.');
  }
}
```

---

## Synthetic Test Payloads

> Use these payloads with the local integration backend (`localhost:3001`) only. All tokens are synthetic and must not be used in staging or production.

### Valid Scan (integration test)

```json
{
  "token": "HVQR-TEST000000000001",
  "deviceInfo": "Flutter Integration Test / Android 14",
  "location": "12.9716,77.5946"
}
```
*Expected: `isValid: true, status: "VALID"` (token must exist in integration DB)*

### Nonexistent Token

```json
{
  "token": "HVQR-DOESNOTEXIST0001",
  "deviceInfo": "Flutter Integration Test"
}
```
*Expected: `isValid: false, status: "INVALID"`*

### Missing Token Field

```json
{
  "deviceInfo": "Flutter Integration Test"
}
```
*Expected: `400 Bad Request` — validation error on `token`*

### Unauthenticated Request

```
POST /api/v1/qr/verify
(No Authorization header)
```
*Expected: `401 Unauthorized`*

---

## Integration Test Cases for Flutter Developer 2

| # | Test | Expectation |
|---|---|---|
| QR-01 | Valid token + DOCTOR JWT → `POST /api/v1/qr/verify` | `200 { isValid: true, status: "VALID" }` |
| QR-02 | Nonexistent token string → verify | `200 { isValid: false, status: "INVALID" }` |
| QR-03 | Revoked token → verify | `200 { isValid: false, status: "REVOKED" }` |
| QR-04 | Expired token → verify | `200 { isValid: false, status: "EXPIRED" }` |
| QR-05 | Rotated token → verify | `200 { isValid: false, status: "ROTATED" }` |
| QR-06 | Valid token, no JWT → verify | `401 Unauthorized` |
| QR-07 | Valid token, PATIENT role JWT → verify | `403 Forbidden` |
| QR-08 | Missing `token` field → verify | `400 Bad Request` |
| QR-09 | Valid verify → scan log written to DB | Confirm `qr_scan_logs` row exists |
| QR-10 | DOCTOR JWT → fetch human records after valid verify | `200` with records |
| QR-11 | VETERINARIAN JWT → fetch human records after valid verify | `403 Forbidden` |
| QR-12 | VETERINARIAN JWT → fetch pet records after valid verify | `200` with pet records |
| QR-13 | DOCTOR JWT → fetch pet records | `403 Forbidden` |

---

## Contact

- **Backend team**: CareID NestJS Backend (`d:/careid/backend`)  
- **QR module path**: `backend/src/modules/qr/`  
- **Pet module path**: `backend/src/modules/pet/`  
- **Doctor module**: `backend/src/modules/doctor/`  
- **This document**: `doctor_web/docs/DOCTOR_WEB_BATCH3_FLUTTER_QR_API_CONTRACT.md`
