# Key Postman API Contracts Documentation

### POST /api/v1/doctors/treatment-offers (Create a new draft treatment proposal)
- **Folder**: `05. Doctor Portal`
- **URL**: `{{baseUrl}}/api/v1/doctors/treatment-offers`
- **Headers**:
  - `Content-Type: application/json`
  - `Accept: application/json`
- **Request Body**:
```json
{
  "patientProfileId": "string",
  "facilityId": "string",
  "clinicalIndication": "string",
  "procedures": [
    {
      "procedureCode": "string",
      "procedureName": "string",
      "unitCost": 9075.247776047214,
      "category": "SURGICAL",
      "quantity": 1,
      "isOptional": false,
      "clinicalJustification": "string"
    },
    {
      "procedureCode": "string",
      "procedureName": "string",
      "unitCost": 1736.0278869047875,
      "category": "SURGICAL",
      "quantity": 1,
      "isOptional": false,
      "clinicalJustification": "string"
    }
  ],
  "validUntil": "string",
  "encounterId": "string",
  "discountAmount": 0,
  "financingEligible": false,
  "recommendedTenureMonths": 2734.589294109142,
  "clinicalNotes": "string",
  "termsAndConditions": "string"
}
```
- **Sample Response (201 Created)**:
```json
{
  "id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  "offerNumber": "TO-2026-00001",
  "doctorProfileId": "d3eebc99-9c0b-4ef8-bb6d-6bb9bd380d44",
  "patientProfileId": "e4eebc99-9c0b-4ef8-bb6d-6bb9bd380e55",
  "facilityId": "f5eebc99-9c0b-4ef8-bb6d-6bb9bd380f66",
  "clinicalIndication": "Severe coronary artery disease requiring PCI stenting",
  "grossEstimate": 300000,
  "discountAmount": 25000,
  "netPayable": 275000,
  "currency": "PKR",
  "financingEligible": true,
  "status": "DISPATCHED",
  
```

---

### GET /api/v1/doctors/treatment-offers (List authored treatment proposals)
- **Folder**: `05. Doctor Portal`
- **URL**: `{{baseUrl}}/api/v1/doctors/treatment-offers?status=EXPIRED&patientId=string&search=string&page=1&limit=20`
- **Headers**:
  - *(Standard Bearer Authorization)*
- **Request Body**: *(None)*
- **Sample Response (200 OK)**:
```json

```

---

### GET /api/v1/doctors/treatment-offers/:offerId (Get treatment offer details)
- **Folder**: `05. Doctor Portal`
- **URL**: `{{baseUrl}}/api/v1/doctors/treatment-offers/:offerId`
- **Headers**:
  - `Accept: application/json`
- **Request Body**: *(None)*
- **Sample Response (200 OK)**:
```json
{
  "id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  "offerNumber": "TO-2026-00001",
  "doctorProfileId": "d3eebc99-9c0b-4ef8-bb6d-6bb9bd380d44",
  "patientProfileId": "e4eebc99-9c0b-4ef8-bb6d-6bb9bd380e55",
  "facilityId": "f5eebc99-9c0b-4ef8-bb6d-6bb9bd380f66",
  "clinicalIndication": "Severe coronary artery disease requiring PCI stenting",
  "grossEstimate": 300000,
  "discountAmount": 25000,
  "netPayable": 275000,
  "currency": "PKR",
  "financingEligible": true,
  "status": "DISPATCHED",
  
```

---

### PUT /api/v1/doctors/treatment-offers/:offerId (Update draft treatment offer)
- **Folder**: `05. Doctor Portal`
- **URL**: `{{baseUrl}}/api/v1/doctors/treatment-offers/:offerId`
- **Headers**:
  - `Content-Type: application/json`
  - `Accept: application/json`
- **Request Body**:
```json
{
  "clinicalIndication": "string",
  "procedures": [
    {
      "procedureCode": "string",
      "procedureName": "string",
      "unitCost": 4018.8680365558093,
      "category": "SURGICAL",
      "quantity": 1,
      "isOptional": false,
      "clinicalJustification": "string"
    },
    {
      "procedureCode": "string",
      "procedureName": "string",
      "unitCost": 6506.738656644382,
      "category": "SURGICAL",
      "quantity": 1,
      "isOptional": false,
      "clinicalJustification": "string"
    }
  ],
  "discountAmount": 4807.219522303252,
  "financingEligible": true,
  "recommendedTenureMonths": 2573.025151074737,
  "validUntil": "string",
  "clinicalNotes": "string",
  "termsAndConditions": "string",
  "expectedVersion": 1753.1245021832665
}
```
- **Sample Response (200 OK)**:
```json
{
  "id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  "offerNumber": "TO-2026-00001",
  "doctorProfileId": "d3eebc99-9c0b-4ef8-bb6d-6bb9bd380d44",
  "patientProfileId": "e4eebc99-9c0b-4ef8-bb6d-6bb9bd380e55",
  "facilityId": "f5eebc99-9c0b-4ef8-bb6d-6bb9bd380f66",
  "clinicalIndication": "Severe coronary artery disease requiring PCI stenting",
  "grossEstimate": 300000,
  "discountAmount": 25000,
  "netPayable": 275000,
  "currency": "PKR",
  "financingEligible": true,
  "status": "DISPATCHED",
  
```

---

### POST /api/v1/doctors/treatment-offers/:offerId/dispatch (Lock draft and dispatch treatment offer to patient)
- **Folder**: `05. Doctor Portal`
- **URL**: `{{baseUrl}}/api/v1/doctors/treatment-offers/:offerId/dispatch`
- **Headers**:
  - `Content-Type: application/json`
  - `Accept: application/json`
- **Request Body**:
```json
{
  "expectedVersion": 51.68578073745378
}
```
- **Sample Response (200 OK)**:
```json
{
  "id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  "offerNumber": "TO-2026-00001",
  "doctorProfileId": "d3eebc99-9c0b-4ef8-bb6d-6bb9bd380d44",
  "patientProfileId": "e4eebc99-9c0b-4ef8-bb6d-6bb9bd380e55",
  "facilityId": "f5eebc99-9c0b-4ef8-bb6d-6bb9bd380f66",
  "clinicalIndication": "Severe coronary artery disease requiring PCI stenting",
  "grossEstimate": 300000,
  "discountAmount": 25000,
  "netPayable": 275000,
  "currency": "PKR",
  "financingEligible": true,
  "status": "DISPATCHED",
  
```

---

### GET /api/v1/doctors/treatment-offers/:offerId/status (Inspect live offer lifecycle status and review timestamps)
- **Folder**: `05. Doctor Portal`
- **URL**: `{{baseUrl}}/api/v1/doctors/treatment-offers/:offerId/status`
- **Headers**:
  - `Accept: application/json`
- **Request Body**: *(None)*
- **Sample Response (200 OK)**:
```json
{
  "id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  "offerNumber": "TO-2026-00001",
  "status": "DISPATCHED",
  "isExpired": false,
  "validUntil": "2026-12-31T23:59:59.000Z",
  "version": 1,
  "dispatchedAt": "2026-11-06T12:00:00.000Z",
  "patientViewedAt": "2026-11-06T12:05:00.000Z",
  "patientRespondedAt": "2026-11-06T12:10:00.000Z",
  "patientResponseNotes": "Accepted with informed consent",
  "cancellationReason": "Elective procedure deferred"
}
```

---

### POST /api/v1/doctors/treatment-offers/:offerId/cancel (Doctor cancels active treatment proposal with clinical justification)
- **Folder**: `05. Doctor Portal`
- **URL**: `{{baseUrl}}/api/v1/doctors/treatment-offers/:offerId/cancel`
- **Headers**:
  - `Content-Type: application/json`
  - `Accept: application/json`
- **Request Body**:
```json
{
  "cancellationReason": "string",
  "expectedVersion": 8285.85026418029
}
```
- **Sample Response (200 OK)**:
```json
{
  "id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  "offerNumber": "TO-2026-00001",
  "doctorProfileId": "d3eebc99-9c0b-4ef8-bb6d-6bb9bd380d44",
  "patientProfileId": "e4eebc99-9c0b-4ef8-bb6d-6bb9bd380e55",
  "facilityId": "f5eebc99-9c0b-4ef8-bb6d-6bb9bd380f66",
  "clinicalIndication": "Severe coronary artery disease requiring PCI stenting",
  "grossEstimate": 300000,
  "discountAmount": 25000,
  "netPayable": 275000,
  "currency": "PKR",
  "financingEligible": true,
  "status": "DISPATCHED",
  
```

---

### POST /api/v1/patients/treatment-offers/:offerId/accept (Patient ratifies and accepts treatment offer (RATIFIED_ACCEPTED))
- **Folder**: `06. Patient App`
- **URL**: `{{baseUrl}}/api/v1/patients/treatment-offers/:offerId/accept`
- **Headers**:
  - `Content-Type: application/json`
  - `Accept: application/json`
- **Request Body**:
```json
{
  "signatureConsent": true,
  "patientResponseNotes": "string",
  "expectedVersion": 1885.198472948083
}
```
- **Sample Response (200 OK)**:
```json
{
  "id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  "offerNumber": "TO-2026-00001",
  "doctorProfileId": "d3eebc99-9c0b-4ef8-bb6d-6bb9bd380d44",
  "patientProfileId": "e4eebc99-9c0b-4ef8-bb6d-6bb9bd380e55",
  "facilityId": "f5eebc99-9c0b-4ef8-bb6d-6bb9bd380f66",
  "clinicalIndication": "Severe coronary artery disease requiring PCI stenting",
  "grossEstimate": 300000,
  "discountAmount": 25000,
  "netPayable": 275000,
  "currency": "PKR",
  "financingEligible": true,
  "status": "DISPATCHED",
  
```

---

### POST /api/v1/patients/treatment-offers/:offerId/reject (Patient declines treatment offer proposal (DECLINED))
- **Folder**: `06. Patient App`
- **URL**: `{{baseUrl}}/api/v1/patients/treatment-offers/:offerId/reject`
- **Headers**:
  - `Content-Type: application/json`
  - `Accept: application/json`
- **Request Body**:
```json
{
  "declineReason": "Seeking second opinion",
  "expectedVersion": 492.45563914452896
}
```
- **Sample Response (200 OK)**:
```json
{
  "id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  "offerNumber": "TO-2026-00001",
  "doctorProfileId": "d3eebc99-9c0b-4ef8-bb6d-6bb9bd380d44",
  "patientProfileId": "e4eebc99-9c0b-4ef8-bb6d-6bb9bd380e55",
  "facilityId": "f5eebc99-9c0b-4ef8-bb6d-6bb9bd380f66",
  "clinicalIndication": "Severe coronary artery disease requiring PCI stenting",
  "grossEstimate": 300000,
  "discountAmount": 25000,
  "netPayable": 275000,
  "currency": "PKR",
  "financingEligible": true,
  "status": "DISPATCHED",
  
```

---

### POST /api/v1/appointments (Book a new appointment)
- **Folder**: `10. Appointments, Schedules & Shifts`
- **URL**: `{{baseUrl}}/api/v1/appointments`
- **Headers**:
  - `Content-Type: application/json`
  - `Accept: application/json`
- **Request Body**:
```json
{
  "doctorProfileId": "{{doctorId}}",
  "patientProfileId": "{{patientId}}",
  "facilityId": "{{facilityId}}",
  "appointmentDate": "2026-11-15",
  "startTime": "09:30",
  "endTime": "09:45",
  "durationMinutes": 15,
  "type": "IN_PERSON",
  "reason": "Routine cardiology follow-up and prescription review",
  "notes": "Patient requested morning appointment slot"
}
```
- **Sample Response (201 Created)**:
```json
{
  "id": "string",
  "appointmentNumber": "string",
  "patientProfileId": "string",
  "doctorProfileId": "string",
  "appointmentDate": "string",
  "startTime": "string",
  "endTime": "string",
  "durationMinutes": 7492.098821810215,
  "type": "TELECONSULTATION",
  "status": "CONFIRMED",
  "createdAt": "string",
  "updatedAt": "string",
  "facilityId": "string",
  "scheduleId": "string",
  "slotId": "string",
  "reason": "string",
  "notes": "string",
  "bookedBy": "string",
  "cancelledAt": "s
```

---

### GET /api/v1/appointments (List appointments with filtering and pagination)
- **Folder**: `10. Appointments, Schedules & Shifts`
- **URL**: `{{baseUrl}}/api/v1/appointments?page=1&limit=20&patientProfileId=string&doctorProfileId=string&facilityId=string&status=SCHEDULED&type=IN_PERSON&fromDate=string&toDate=string`
- **Headers**:
  - `Accept: application/json`
- **Request Body**: *(None)*
- **Sample Response (200 OK)**:
```json
{
  "data": [
    [],
    []
  ],
  "meta": {
    "totalItems": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5,
    "hasNextPage": {},
    "hasPreviousPage": false
  }
}
```

---

### GET /api/v1/appointments/doctor/me (Get appointments scheduled for authenticated doctor)
- **Folder**: `10. Appointments, Schedules & Shifts`
- **URL**: `{{baseUrl}}/api/v1/appointments/doctor/me?page=1&limit=20&patientProfileId=string&doctorProfileId=string&facilityId=string&status=SCHEDULED&type=IN_PERSON&fromDate=string&toDate=string`
- **Headers**:
  - `Accept: application/json`
- **Request Body**: *(None)*
- **Sample Response (200 OK)**:
```json
{
  "data": [
    [],
    []
  ],
  "meta": {
    "totalItems": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5,
    "hasNextPage": {},
    "hasPreviousPage": false
  }
}
```

---

### GET /api/v1/appointments/:id (Get appointment details by ID)
- **Folder**: `10. Appointments, Schedules & Shifts`
- **URL**: `{{baseUrl}}/api/v1/appointments/:id`
- **Headers**:
  - `Accept: application/json`
- **Request Body**: *(None)*
- **Sample Response (200 OK)**:
```json
{
  "id": "string",
  "appointmentNumber": "string",
  "patientProfileId": "string",
  "doctorProfileId": "string",
  "appointmentDate": "string",
  "startTime": "string",
  "endTime": "string",
  "durationMinutes": 7492.098821810215,
  "type": "TELECONSULTATION",
  "status": "CONFIRMED",
  "createdAt": "string",
  "updatedAt": "string",
  "facilityId": "string",
  "scheduleId": "string",
  "slotId": "string",
  "reason": "string",
  "notes": "string",
  "bookedBy": "string",
  "cancelledAt": "s
```

---

### PUT /api/v1/appointments/:id/status (Update appointment status (clinical & operational staff))
- **Folder**: `10. Appointments, Schedules & Shifts`
- **URL**: `{{baseUrl}}/api/v1/appointments/:id/status`
- **Headers**:
  - `Content-Type: application/json`
  - `Accept: application/json`
- **Request Body**:
```json
{
  "status": "RESCHEDULED",
  "notes": "string"
}
```
- **Sample Response (200 OK)**:
```json
{
  "id": "string",
  "appointmentNumber": "string",
  "patientProfileId": "string",
  "doctorProfileId": "string",
  "appointmentDate": "string",
  "startTime": "string",
  "endTime": "string",
  "durationMinutes": 7492.098821810215,
  "type": "TELECONSULTATION",
  "status": "CONFIRMED",
  "createdAt": "string",
  "updatedAt": "string",
  "facilityId": "string",
  "scheduleId": "string",
  "slotId": "string",
  "reason": "string",
  "notes": "string",
  "bookedBy": "string",
  "cancelledAt": "s
```

---

### GET /api/v1/facilities (List all registered facility profiles)
- **Folder**: `09. Facilities & Branches`
- **URL**: `{{baseUrl}}/api/v1/facilities?page=3467.616117677217&limit=3467.616117677217`
- **Headers**:
  - `Accept: application/json`
- **Request Body**: *(None)*
- **Sample Response (200 OK)**:
```json
[
  {
    "id": "string",
    "name": "string",
    "legalName": "string",
    "facilityCode": "string",
    "registrationNumber": "string",
    "facilityType": "string",
    "ownershipType": "string",
    "buildingName": "string",
    "streetAddress": "string",
    "city": "string",
    "district": "string",
    "state": "string",
    "country": "string",
    "pinCode": "string",
    "latitude": 8427.524863816794,
    "longitude": 9780.226495093812,
    "timezone": "string",
    "phone": "strin
```

---

### GET /api/v1/facilities/:id (Get complete facility details)
- **Folder**: `09. Facilities & Branches`
- **URL**: `{{baseUrl}}/api/v1/facilities/:id`
- **Headers**:
  - `Accept: application/json`
- **Request Body**: *(None)*
- **Sample Response (200 OK)**:
```json
{
  "id": "string",
  "name": "string",
  "legalName": "string",
  "facilityCode": "string",
  "registrationNumber": "string",
  "facilityType": "string",
  "ownershipType": "string",
  "buildingName": "string",
  "streetAddress": "string",
  "city": "string",
  "district": "string",
  "state": "string",
  "country": "string",
  "pinCode": "string",
  "latitude": 8212.524273838488,
  "longitude": 5950.084480374197,
  "timezone": "string",
  "phone": "string",
  "emergencyPhone": "string",
  "ema
```

---

### GET /api/v1/facilities/:id/rooms (List facility rooms)
- **Folder**: `09. Facilities & Branches`
- **URL**: `{{baseUrl}}/api/v1/facilities/:id/rooms`
- **Headers**:
  - `Accept: application/json`
- **Request Body**: *(None)*
- **Sample Response (200 OK)**:
```json
[
  {
    "id": "string",
    "facilityId": "string",
    "departmentId": "string",
    "roomNumber": "string",
    "roomName": "string",
    "building": "string",
    "block": "string",
    "floor": "string",
    "wing": "string",
    "roomCategory": "string",
    "capacity": 9295.061080548576,
    "isOperational": false,
    "createdAt": "string"
  },
  {
    "id": "string",
    "facilityId": "string",
    "departmentId": "string",
    "roomNumber": "string",
    "roomName": "string",
    "bui
```

---

### GET /api/v1/doctors/me (Get current authenticated doctor profile)
- **Folder**: `05. Doctor Portal`
- **URL**: `{{baseUrl}}/api/v1/doctors/me`
- **Headers**:
  - `Accept: application/json`
- **Request Body**: *(None)*
- **Sample Response (200 OK)**:
```json
{
  "id": "string",
  "userId": "string",
  "fullName": "string",
  "gender": "string",
  "dateOfBirth": "string",
  "profilePhotoUrl": "string",
  "digitalSignatureUrl": "string",
  "biography": "string",
  "professionalSummary": "string",
  "yearsOfExperience": 1429.492499492082,
  "primarySpecialization": "string",
  "secondarySpecializations": [
    "string",
    "string"
  ],
  "medicalCouncil": "string",
  "registrationNumber": "string",
  "licenseNumber": "string",
  "providerIdentifier":
```

---

### GET /api/v1/doctors/:id/slots (Get Doctor Availability Schedule Slots)
- **Folder**: `05. Doctor Portal`
- **URL**: `{{baseUrl}}/api/v1/doctors/:id/slots`
- **Headers**:
  - `Accept: application/json`
- **Request Body**: *(None)*
- **Sample Response (200 OK)**:
```json
[
  {
    "id": "slot-uuid-v4",
    "startTime": "2026-07-30T09:00:00.000Z",
    "endTime": "2026-07-30T09:30:00.000Z",
    "isBooked": false
  },
  {
    "id": "slot-uuid-v4",
    "startTime": "2026-07-30T09:00:00.000Z",
    "endTime": "2026-07-30T09:30:00.000Z",
    "isBooked": false
  }
]
```

---

### GET /api/v1/financing/options (List available healthcare financing options and partners)
- **Folder**: `27. Healthcare Financing & Financial Assistance`
- **URL**: `{{baseUrl}}/api/v1/financing/options`
- **Headers**:
  - `Accept: application/json`
- **Request Body**: *(None)*
- **Sample Response (200 OK)**:
```json
[
  {
    "id": "string",
    "partnerName": "string",
    "name": "string",
    "description": "string",
    "minAmount": 8206.841331793696,
    "maxAmount": 2165.3721213802846,
    "tenureMonths": [
      4514.056877201674,
      8027.091770981997
    ],
    "interestRate": 4802.488029617769,
    "processingFee": 8097.646380862996,
    "features": [
      "string",
      "string"
    ],
    "isDemonstrationCatalog": true,
    "disclaimer": "string"
  },
  {
    "id": "string",
    "partnerName
```

---

