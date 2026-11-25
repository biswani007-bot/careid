const fs = require('fs');

const collectionPath = 'CareID-Staging.postman_collection.json';
const postman = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));

function findFolder(items, name) {
  for (const item of items) {
    if (item.name === name) return item;
    if (item.item) {
      const found = findFolder(item.item, name);
      if (found) return found;
    }
  }
  return null;
}

const doctorPortal = findFolder(postman.item, '05. Doctor Portal');
const appointmentsFolder = findFolder(postman.item, '10. Appointments, Schedules & Shifts');
const medicalRecordsFolder = findFolder(postman.item, '08. Medical Records (General, Dental & Vision)');
const facilitiesFolder = findFolder(postman.item, '09. Facilities & Branches');

const newRequests = [];

// 1. Stage 8: Acceptance Certificate
if (doctorPortal) {
  const req1 = {
    name: 'Stage 8: Get Offer Acceptance Certificate (Doctor)',
    request: {
      method: 'GET',
      header: [
        { key: 'Authorization', value: 'Bearer {{doctor_token}}', type: 'text' },
        { key: 'Accept', value: 'application/json', type: 'text' }
      ],
      url: {
        raw: '{{base_url}}/api/v1/doctors/treatment-offers/{{offer_id}}/acceptance-certificate',
        host: ['{{base_url}}'],
        path: ['api', 'v1', 'doctors', 'treatment-offers', '{{offer_id}}', 'acceptance-certificate']
      },
      description: 'Stage 8: Retrieves cryptographically verified acceptance certificate with SHA-256 hash for ratified offer.'
    }
  };
  doctorPortal.item.push(req1);
  newRequests.push(req1.name);

  // Stage 9: Clearance GET & PUT
  const req2 = {
    name: 'Stage 9: Get Multidisciplinary Pre-Op Clearance',
    request: {
      method: 'GET',
      header: [
        { key: 'Authorization', value: 'Bearer {{doctor_token}}', type: 'text' },
        { key: 'Accept', value: 'application/json', type: 'text' }
      ],
      url: {
        raw: '{{base_url}}/api/v1/treatment-offers/{{offer_id}}/clearance',
        host: ['{{base_url}}'],
        path: ['api', 'v1', 'treatment-offers', '{{offer_id}}', 'clearance']
      },
      description: 'Stage 9: Retrieves 5-domain clearance checklist (Cardiology, Anesthesia, Medical, Surgical, Lab).'
    }
  };
  doctorPortal.item.push(req2);
  newRequests.push(req2.name);

  const req3 = {
    name: 'Stage 9: Update Multidisciplinary Pre-Op Clearance',
    request: {
      method: 'PUT',
      header: [
        { key: 'Authorization', value: 'Bearer {{doctor_token}}', type: 'text' },
        { key: 'Content-Type', value: 'application/json', type: 'text' }
      ],
      body: {
        mode: 'raw',
        raw: JSON.stringify({
          cardiologyClearance: { status: 'CLEARED', notes: 'ECG and Echo normal, LVEF 60%' },
          anesthesiaClearance: { status: 'CLEARED', notes: 'Mallampati Class 1, airway clear' },
          medicalClearance: { status: 'CLEARED', notes: 'Diabetic and hypertensive control optimal' },
          surgicalClearance: { status: 'CLEARED', notes: 'Procedural consent signed, site marked' },
          labClearance: { status: 'CLEARED', notes: 'CBC, BMP, PT/INR within normal limits' },
          notes: 'Multidisciplinary clearance complete for PCI suite'
        }, null, 2)
      },
      url: {
        raw: '{{base_url}}/api/v1/treatment-offers/{{offer_id}}/clearance',
        host: ['{{base_url}}'],
        path: ['api', 'v1', 'treatment-offers', '{{offer_id}}', 'clearance']
      },
      description: 'Stage 9: Updates clearance domains. Automatically marks overallStatus to CLEARED when all domains are cleared.'
    }
  };
  doctorPortal.item.push(req3);
  newRequests.push(req3.name);
}

// 2. Stage 11, 14, 15, 16 in Appointments
if (appointmentsFolder) {
  const reqHold1 = {
    name: 'Stage 11: Create Temporary Procedure Slot Hold',
    request: {
      method: 'POST',
      header: [
        { key: 'Authorization', value: 'Bearer {{doctor_token}}', type: 'text' },
        { key: 'Content-Type', value: 'application/json', type: 'text' }
      ],
      body: {
        mode: 'raw',
        raw: JSON.stringify({
          facilityId: '{{facility_id}}',
          slotId: '{{slot_id}}',
          procedureCategory: 'CATH_LAB',
          holdDurationMinutes: 45
        }, null, 2)
      },
      url: {
        raw: '{{base_url}}/api/v1/appointments/holds',
        host: ['{{base_url}}'],
        path: ['api', 'v1', 'appointments', 'holds']
      },
      description: 'Stage 11: Places a 45-minute concurrency-safe hold on a procedure suite slot.'
    }
  };
  appointmentsFolder.item.push(reqHold1);
  newRequests.push(reqHold1.name);

  const reqHold2 = {
    name: 'Stage 11: Get Temporary Slot Hold Status',
    request: {
      method: 'GET',
      header: [
        { key: 'Authorization', value: 'Bearer {{doctor_token}}', type: 'text' }
      ],
      url: {
        raw: '{{base_url}}/api/v1/appointments/holds/{{hold_id}}',
        host: ['{{base_url}}'],
        path: ['api', 'v1', 'appointments', 'holds', '{{hold_id}}']
      },
      description: 'Stage 11: Inspects remaining hold seconds and status.'
    }
  };
  appointmentsFolder.item.push(reqHold2);
  newRequests.push(reqHold2.name);

  const reqHold3 = {
    name: 'Stage 11: Release Temporary Slot Hold',
    request: {
      method: 'DELETE',
      header: [
        { key: 'Authorization', value: 'Bearer {{doctor_token}}', type: 'text' }
      ],
      url: {
        raw: '{{base_url}}/api/v1/appointments/holds/{{hold_id}}',
        host: ['{{base_url}}'],
        path: ['api', 'v1', 'appointments', 'holds', '{{hold_id}}']
      },
      description: 'Stage 11: Releases temporary hold early, returning slot to AVAILABLE.'
    }
  };
  appointmentsFolder.item.push(reqHold3);
  newRequests.push(reqHold3.name);

  const reqReadiness1 = {
    name: 'Stage 14: Get Pre-Op Day -1 Readiness Checklist',
    request: {
      method: 'GET',
      header: [
        { key: 'Authorization', value: 'Bearer {{doctor_token}}', type: 'text' }
      ],
      url: {
        raw: '{{base_url}}/api/v1/appointments/{{appointment_id}}/readiness',
        host: ['{{base_url}}'],
        path: ['api', 'v1', 'appointments', '{{appointment_id}}', 'readiness']
      },
      description: 'Stage 14: Inspects fasting, medication hold, transportation, consent, and GO/NO_GO decision.'
    }
  };
  appointmentsFolder.item.push(reqReadiness1);
  newRequests.push(reqReadiness1.name);

  const reqReadiness2 = {
    name: 'Stage 14: Update Pre-Op Day -1 Readiness Checklist & Decision',
    request: {
      method: 'PATCH',
      header: [
        { key: 'Authorization', value: 'Bearer {{doctor_token}}', type: 'text' },
        { key: 'Content-Type', value: 'application/json', type: 'text' }
      ],
      body: {
        mode: 'raw',
        raw: JSON.stringify({
          fastingConfirmed: true,
          medicationHoldConfirmed: true,
          transportationArranged: true,
          consentVerified: true,
          vitalsWithinThreshold: true,
          decision: 'GO',
          notes: 'Patient ready for procedure suite admission'
        }, null, 2)
      },
      url: {
        raw: '{{base_url}}/api/v1/appointments/{{appointment_id}}/readiness',
        host: ['{{base_url}}'],
        path: ['api', 'v1', 'appointments', '{{appointment_id}}', 'readiness']
      },
      description: 'Stage 14: Submits clinical decision GO/NO_GO.'
    }
  };
  appointmentsFolder.item.push(reqReadiness2);
  newRequests.push(reqReadiness2.name);

  const reqCheckIn = {
    name: 'Stage 15: Day of Procedure Patient Check-In',
    request: {
      method: 'POST',
      header: [
        { key: 'Authorization', value: 'Bearer {{staff_token}}', type: 'text' },
        { key: 'Content-Type', value: 'application/json', type: 'text' }
      ],
      body: {
        mode: 'raw',
        raw: JSON.stringify({
          bedOrBayNumber: 'PRE-OP-BAY-03',
          vitals: {
            bloodPressure: '124/82',
            heartRate: 72,
            oxygenSaturation: 99,
            temperature: 36.6
          },
          notes: 'Patient checked in at pre-op intake desk'
        }, null, 2)
      },
      url: {
        raw: '{{base_url}}/api/v1/appointments/{{appointment_id}}/check-in',
        host: ['{{base_url}}'],
        path: ['api', 'v1', 'appointments', '{{appointment_id}}', 'check-in']
      },
      description: 'Stage 15: Intake check-in. Transitions appointment status to IN_PROGRESS.'
    }
  };
  appointmentsFolder.item.push(reqCheckIn);
  newRequests.push(reqCheckIn.name);

  const reqCath1 = {
    name: 'Stage 16: Get Cath Lab Safety Checklist',
    request: {
      method: 'GET',
      header: [
        { key: 'Authorization', value: 'Bearer {{doctor_token}}', type: 'text' }
      ],
      url: {
        raw: '{{base_url}}/api/v1/appointments/{{appointment_id}}/cath-lab-checklist',
        host: ['{{base_url}}'],
        path: ['api', 'v1', 'appointments', '{{appointment_id}}', 'cath-lab-checklist']
      },
      description: 'Stage 16: WHO Surgical Safety Checklist for procedure suite.'
    }
  };
  appointmentsFolder.item.push(reqCath1);
  newRequests.push(reqCath1.name);

  const reqCath2 = {
    name: 'Stage 16: Update Cath Lab Safety Checklist',
    request: {
      method: 'POST',
      header: [
        { key: 'Authorization', value: 'Bearer {{doctor_token}}', type: 'text' },
        { key: 'Content-Type', value: 'application/json', type: 'text' }
      ],
      body: {
        mode: 'raw',
        raw: JSON.stringify({
          signIn: {
            patientIdentityConfirmed: true,
            siteMarked: true,
            anesthesiaSafetyCheckCompleted: true,
            pulseOximeterOn: true,
            allergiesChecked: true
          },
          timeOut: {
            allTeamMembersIntroduced: true,
            patientNameProcedureSiteConfirmed: true,
            anticipatedCriticalEventsReviewed: true,
            antibioticProphylaxisAdministered: true,
            imagingDisplayed: true
          },
          signOut: {
            procedureNameRecorded: true,
            instrumentSpongeNeedleCountsCorrect: true,
            specimenLabeled: true,
            equipmentProblemsAddressed: true,
            keyPostOpConcernsReviewed: true
          },
          overallStatus: 'COMPLETED',
          notes: 'Cath lab safety checklist fully verified'
        }, null, 2)
      },
      url: {
        raw: '{{base_url}}/api/v1/appointments/{{appointment_id}}/cath-lab-checklist',
        host: ['{{base_url}}'],
        path: ['api', 'v1', 'appointments', '{{appointment_id}}', 'cath-lab-checklist']
      },
      description: 'Stage 16: Records completed WHO checklist verification.'
    }
  };
  appointmentsFolder.item.push(reqCath2);
  newRequests.push(reqCath2.name);
}

// 3. Stage 17 & 18 in Medical Records
if (medicalRecordsFolder) {
  const reqProc = {
    name: 'Stage 17: Document Intra-Operative Procedure Details',
    request: {
      method: 'POST',
      header: [
        { key: 'Authorization', value: 'Bearer {{doctor_token}}', type: 'text' },
        { key: 'Content-Type', value: 'application/json', type: 'text' }
      ],
      body: {
        mode: 'raw',
        raw: JSON.stringify({
          name: 'Percutaneous coronary intervention of LAD with drug-eluting stent',
          code: '92928',
          notes: 'Successful deployment of 3.0 x 18 mm DES with TIMI 3 flow and 0% residual stenosis'
        }, null, 2)
      },
      url: {
        raw: '{{base_url}}/api/v1/encounters/{{encounter_id}}/procedures',
        host: ['{{base_url}}'],
        path: ['api', 'v1', 'encounters', '{{encounter_id}}', 'procedures']
      },
      description: 'Stage 17: Documents intra-op procedure findings, devices, and CPT code.'
    }
  };
  medicalRecordsFolder.item.push(reqProc);
  newRequests.push(reqProc.name);

  const reqHemo = {
    name: 'Stage 18: Record Intra-Operative Hemodynamics',
    request: {
      method: 'POST',
      header: [
        { key: 'Authorization', value: 'Bearer {{doctor_token}}', type: 'text' },
        { key: 'Content-Type', value: 'application/json', type: 'text' }
      ],
      body: {
        mode: 'raw',
        raw: JSON.stringify({
          systolicBp: 122,
          diastolicBp: 78,
          pulseBpm: 70,
          respirationRate: 14,
          oxygenSaturation: 99,
          temperatureC: 36.7
        }, null, 2)
      },
      url: {
        raw: '{{base_url}}/api/v1/encounters/{{encounter_id}}/hemodynamics',
        host: ['{{base_url}}'],
        path: ['api', 'v1', 'encounters', '{{encounter_id}}', 'hemodynamics']
      },
      description: 'Stage 18: Records real-time vitals and hemodynamics during procedural intervention.'
    }
  };
  medicalRecordsFolder.item.push(reqHemo);
  newRequests.push(reqHemo.name);
}

// 4. Phase 9: Facility Chargemaster
if (facilitiesFolder) {
  const reqCharge = {
    name: 'Phase 9: Get Facility Chargemaster Schedule',
    request: {
      method: 'GET',
      header: [
        { key: 'Authorization', value: 'Bearer {{doctor_token}}', type: 'text' }
      ],
      url: {
        raw: '{{base_url}}/api/v1/facilities/{{facility_id}}/chargemaster',
        host: ['{{base_url}}'],
        path: ['api', 'v1', 'facilities', '{{facility_id}}', 'chargemaster']
      },
      description: 'Phase 9: Retrieves facility procedure chargemaster and pricing schedule.'
    }
  };
  facilitiesFolder.item.push(reqCharge);
  newRequests.push(reqCharge.name);
}

// 5. Phase 8: CPT Catalogue folder
let cptFolder = findFolder(postman.item, '28. CPT & Procedure Catalogue');
if (!cptFolder) {
  cptFolder = {
    name: '28. CPT & Procedure Catalogue',
    item: [
      {
        name: 'List CPT Procedure Codes (Paginated)',
        request: {
          method: 'GET',
          header: [{ key: 'Authorization', value: 'Bearer {{doctor_token}}', type: 'text' }],
          url: {
            raw: '{{base_url}}/api/v1/cpt?category=CARDIOLOGY&page=1&limit=20',
            host: ['{{base_url}}'],
            path: ['api', 'v1', 'cpt'],
            query: [
              { key: 'category', value: 'CARDIOLOGY' },
              { key: 'page', value: '1' },
              { key: 'limit', value: '20' }
            ]
          },
          description: 'Lists standardized CPT codes with category filtering.'
        }
      },
      {
        name: 'Search CPT Codes by Keyword',
        request: {
          method: 'GET',
          header: [{ key: 'Authorization', value: 'Bearer {{doctor_token}}', type: 'text' }],
          url: {
            raw: '{{base_url}}/api/v1/cpt/search?q=catheterization',
            host: ['{{base_url}}'],
            path: ['api', 'v1', 'cpt', 'search'],
            query: [{ key: 'q', value: 'catheterization' }]
          },
          description: 'Search CPT catalogue by code or keyword.'
        }
      },
      {
        name: 'Get CPT Code Details',
        request: {
          method: 'GET',
          header: [{ key: 'Authorization', value: 'Bearer {{doctor_token}}', type: 'text' }],
          url: {
            raw: '{{base_url}}/api/v1/cpt/93458',
            host: ['{{base_url}}'],
            path: ['api', 'v1', 'cpt', '93458']
          },
          description: 'Get CPT definition, RVU, and clinical category.'
        }
      }
    ]
  };
  postman.item.push(cptFolder);
  newRequests.push('28. CPT & Procedure Catalogue (3 requests)');
}

fs.writeFileSync(collectionPath, JSON.stringify(postman, null, 2), 'utf8');
console.log(`Successfully added ${newRequests.length} new API requests to ${collectionPath}:`);
newRequests.forEach(r => console.log('  + ' + r));

