# CAREID PATIENT APP — PHASE 5.2 MISSING BACKEND APIS & GAP CLOSURE SPECIFICATION

**Project:** CareID Patient Mobile Application  
**Audit Phase:** Phase 5.2 Deep Architecture & Backend Gap Identification  
**Frontend Repository:** `C:\Users\PABANI\CareID_patient_app\Care_ID_Patient_App-main`  
**Backend Repository:** `C:\Users\PABANI\Downloads\hvapi-main\hvapi-main`  
**Live Staging API:** `https://360api.vnvision.in/api/v1`  
**Date:** November 16, 2026  
**Auditor:** Senior Flutter Architect, NestJS Integration Engineer & QA Architect

---

## 1. Executive Summary

During Phase 5.2, an exhaustive source-code audit was conducted across all 44 NestJS controllers and 38 modules in `hvapi-main` alongside the Flutter client implementation.

This audit revealed two distinct categories of backend gaps:
1. **Category A: Unimplemented Backend Features (Genuinely Missing from Backend):** Critical capabilities where no controller, service, or Prisma schema exists in `hvapi-main`.
2. **Category B: Existing Backend APIs Not Integrated in Frontend:** Fully functional endpoints present in `hvapi-main` that were previously assumed to be missing, but actually exist and require client-side service/repository mapping.
3. **Category C: Existing Endpoints with Authentication / Authorization / Configuration Mismatches:** Endpoints that exist in code but fail in staging due to role barriers or container environment mismatches (such as the OCR Worker internal secret).

---

## 2. Category A: Genuinely Missing Backend APIs

These features have UI representations or planned functional flows in the CareID Patient App but have **zero backend implementation** in `hvapi-main`.

---

### Gap A.1: Telehealth WebRTC Signaling & Room Management

* **Target Screen / Feature:** `TelehealthPage`, `CallRoomPage`, `VideoConsultationPage` (`/telehealth`, `/call-room`)
* **Current State:** The Patient App has WebRTC UI scaffolding, permission handling, camera/mic controls, and local video track renderers, but there is no backend signaling server to exchange session descriptions or ICE candidates with healthcare providers.
* **Backend Investigation Finding:** `hvapi-main` contains no WebRTC gateways (`@WebSocketGateway`), socket.io modules, or signaling controllers. Only appointment metadata (`AppointmentType.TELEHEALTH`) is tracked in PostgreSQL.
* **Priority:** **P0 (Critical for Telehealth Release)**

#### Proposed Specification:

```http
POST /api/v1/telehealth/sessions
GET /api/v1/telehealth/sessions/:id
POST /api/v1/telehealth/sessions/:id/token
WS /socket.io/?room=:id&role=PATIENT
```

##### 1. Create Telehealth Session / Token
* **Route:** `POST /api/v1/telehealth/sessions/:appointmentId/token`
* **Auth:** Bearer JWT (`PATIENT`, `DOCTOR`)
* **Request DTO:**
```json
{
  "appointmentId": "uuid-v4",
  "clientDevice": "Android 10 - Xiaomi Redmi 8A Dual"
}
```
* **Response DTO:**
```json
{
  "success": true,
  "data": {
    "sessionId": "th_sess_9a8b7c6d",
    "roomId": "room_appt_12345",
    "turnServers": [
      {
        "urls": "turn:turn.careid.in:3478",
        "username": "ephemeral_user",
        "credential": "ephemeral_password"
      },
      {
        "urls": "stun:stun.l.google.com:19302"
      }
    ],
    "jwtToken": "ws_session_token_xyz"
  }
}
```

##### 2. WebRTC WebSocket Signaling Protocol
* **Events Emitted by Client:**
  * `join-room`: `{ roomId, peerId, role: "PATIENT" }`
  * `offer`: `{ sdp: RTCSessionDescriptionInit, to: providerId }`
  * `answer`: `{ sdp: RTCSessionDescriptionInit, to: providerId }`
  * `ice-candidate`: `{ candidate: RTCIceCandidateInit, to: providerId }`
  * `hangup`: `{ roomId, reason: "PATIENT_DISCONNECTED" }`

---

### Gap A.2: Payment Gateway & Card Tokenization Backend

* **Target Screen / Feature:** `PaymentMethodsPage`, `AddPaymentMethodModal`, `CheckoutPage` (`/payment-methods`, `/bills/:id/pay`)
* **Current State:** `PaymentMethodsPage` and billing flows allow selecting payment options, but actual tokenization, card setup intents, and Razorpay/Stripe webhook verification endpoints do not exist in `hvapi-main`.
* **Backend Investigation Finding:** `hvapi-main` only has static invoice models and `InvoiceStatus` enum. There is no Stripe SDK (`stripe`), Razorpay SDK (`razorpay`), or payment processing module.
* **Priority:** **P0 (Critical for Monetization & In-App Payments)**

#### Proposed Specification:

```http
POST /api/v1/payments/setup-intent
GET /api/v1/payments/methods
DELETE /api/v1/payments/methods/:id
POST /api/v1/payments/charge
```

##### 1. Create Payment Setup Intent (Card Attachment)
* **Route:** `POST /api/v1/payments/setup-intent`
* **Auth:** Bearer JWT (`PATIENT`)
* **Request Body:** `{}`
* **Response DTO:**
```json
{
  "success": true,
  "data": {
    "clientSecret": "seti_1N4XYZ_secret_ABC123",
    "customerId": "cus_CareID_Patient_99",
    "publishableKey": "pk_live_51XYZ..."
  }
}
```

##### 2. List Saved Payment Methods
* **Route:** `GET /api/v1/payments/methods`
* **Auth:** Bearer JWT (`PATIENT`)
* **Response DTO:**
```json
{
  "success": true,
  "data": [
    {
      "id": "pm_1N4XYZ",
      "brand": "visa",
      "last4": "4242",
      "expMonth": 12,
      "expYear": 2028,
      "isDefault": true
    }
  ]
}
```

---

### Gap A.3: Medication Alarm & Remote Push Notification Sync

* **Target Screen / Feature:** `PillReminderPage`, `MedicationDetailPage`, `AddPillReminderSheet` (`/pill-reminder`, `/medications/:id`)
* **Current State:** Flutter uses `flutter_local_notifications` for local Android alarms. If the user changes devices, reinstalls the app, or requires caretaker notifications, alarm schedules are not persisted in the cloud.
* **Backend Investigation Finding:** `hvapi-main` has a `Prescription` model with dosage instructions, but no `PatientMedicationAlarm` table or notification scheduler for pill times.
* **Priority:** **P1 (High)**

#### Proposed Specification:

```http
GET /api/v1/patients/me/medication-reminders
POST /api/v1/patients/me/medication-reminders
PUT /api/v1/patients/me/medication-reminders/:id
DELETE /api/v1/patients/me/medication-reminders/:id
```

##### Request Body for Create Alarm:
```json
{
  "prescriptionId": "uuid-v4",
  "medicationName": "Amoxicillin 500mg",
  "times": ["08:00", "14:00", "20:00"],
  "startDate": "2026-11-16",
  "endDate": "2026-11-23",
  "notifyFamilyMembers": true,
  "sound": "alarm_gentle"
}
```

---

## 3. Category B: Existing Backend APIs in `hvapi-main` Discovered in Phase 5.2

During our inspection of `hvapi-main/src/modules`, we verified that the following controllers **already exist in the backend** and can be connected directly to the Flutter application:

| Backend Controller | Module | Available Endpoints | Method | Flutter Screen / Capability | Status in Staging |
|---|---|---|---|---|---|
| `FinancingController` | `financing` | `/financing/options` | GET | `FinancialOptionsPage` | Live (HTTP 200) |
| `FinancingController` | `financing` | `/financing/offers` | GET | `FinancialOffersPage` | Live (HTTP 200) |
| `FinancingController` | `financing` | `/financing/apply` | POST | Apply for Treatment Loan | Live (HTTP 201) |
| `PetController` | `pets` | `/pets` | GET, POST | `PetHealthCardPage`, `PetsListPage` | Live (Requires Pet Owner) |
| `PetController` | `pets` | `/pets/:id` | GET, PUT, DELETE | Pet Detail & Edit Screens | Live |
| `PetController` | `pets` | `/pets/:id/vaccinations` | GET, POST | Pet Vaccination Records | Live |
| `SupportController` | `support` | `/support/tickets` | GET, POST | `SupportPage`, Help Center | Live (HTTP 200 / 201) |
| `SupportController` | `support` | `/support/tickets/:id/reply`| POST | Support Chat / Ticket Thread | Live (HTTP 201) |
| `MessagingController` | `messaging` | `/conversations` | GET, POST | In-App Patient-Clinic Messages | Live (HTTP 200) |
| `MessagingController` | `messaging` | `/conversations/:id/messages`| GET, POST | Conversation Chat Thread | Live (HTTP 200 / 201) |
| `HealthCardController` | `health-cards` | `/health-cards/active` | GET | Digital CareID Card | Live (HTTP 200) |
| `HealthCardController` | `health-cards` | `/health-cards/:id/wallet/google` | POST | Add to Google Wallet Pass | Live (HTTP 200) |
| `QrController` | `qr` | `/qr/generate` | POST | Dynamic Patient QR Generation | Live (HTTP 200) |
| `QrController` | `qr` | `/qr/verify` | POST | Provider Scan Verification | Live (HTTP 200) |
| `PatientTreatmentOfferController` | `treatment-offers` | `/patients/treatment-offers` | GET | Treatment Offers & Quotes | Live (Requires PATIENT role) |

### Frontend Recommendation:
Create dedicated Flutter services (`FinancingService`, `PetService`, `SupportService`, `MessagingService`) to hook these existing backend APIs directly into the respective screens.

---

## 4. Category C: Configuration & Authorization Mismatches

### Gap C.1: OCR Worker Internal Secret (`CAREID_OCR_SECRET`)
* **Endpoint:** `POST /api/v1/ocr/process`
* **Controller:** `OcrController` calling `OcrWorkerClient`
* **Target Worker:** `services/ocr-worker/server.py`
* **Symptom:** OCR extraction jobs fail in staging with HTTP 401 Unauthorized from the worker container.
* **Root Cause Identified in Codebase:**
  1. In `hvapi-main/src/modules/ocr/ocr-worker.client.ts`:
     ```typescript
     headers: {
       'X-CareID-Internal-Secret': this.configService.get('CAREID_OCR_SECRET'),
     }
     ```
  2. In `hvapi-main/services/ocr-worker/server.py`:
     ```python
     expected_secret = os.environ.get("CAREID_OCR_SECRET", "")
     client_secret = request.headers.get("X-CareID-Internal-Secret")
     if not expected_secret or client_secret != expected_secret:
         return jsonify({"error": "Unauthorized"}), 401
     ```
  3. In Staging Environment: Either `CAREID_OCR_SECRET` is not set in the Python Docker container environment, or the NestJS API container and the Python OCR worker container have differing values.
* **Fix for DevOps / Backend Team:**
  * Ensure the staging environment `.env` or Kubernetes secret provides the exact same string value for `CAREID_OCR_SECRET` to both the NestJS API pod and the OCR worker pod.

---

### Gap C.2: Treatment Offers Role Restriction
* **Endpoint:** `GET /api/v1/patients/treatment-offers`
* **Controller:** `PatientTreatmentOfferController`
* **Code in `hvapi-main`:**
  ```typescript
  @Controller('patients/treatment-offers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PATIENT, Role.FAMILY_MEMBER)
  ```
* **Observation:** During staging testing with administrative or staff tokens, this endpoint returned HTTP 403 Forbidden. The endpoint is strictly guarded for `PATIENT` and `FAMILY_MEMBER` user roles. Tokens issued to test accounts must have `role: "PATIENT"` in their JWT payload.

---

## 5. Prioritized Remediation Roadmap

```
+---------------------------------------------------------------------------------+
|                               PRIORITY MATRIX                                   |
+---------------------------------------------------------------------------------+
| P0 (Immediate Backend Fix / Deploy):                                            |
|   1. Synchronize CAREID_OCR_SECRET between NestJS and Python worker container   |
|   2. Implement Telehealth WebRTC signaling gateway                             |
|   3. Implement Payment Gateway setup intents & webhook receiver                 |
+---------------------------------------------------------------------------------+
| P1 (Client Integration of Existing Backend Controllers):                       |
|   1. Integrate FinancingController in FinancialOptionsPage                      |
|   2. Integrate PetController in PetHealthCardPage                               |
|   3. Integrate SupportController in SupportPage                                 |
|   4. Integrate MessagingController in clinic chat threads                       |
+---------------------------------------------------------------------------------+
| P2 (Feature Enhancements):                                                      |
|   1. Medication Alarm remote sync API                                           |
|   2. Native Google Wallet pass button via /health-cards/:id/wallet/google       |
+---------------------------------------------------------------------------------+
```

---
*Report certified by CareID Quality Assurance & Architecture Review Team.*
