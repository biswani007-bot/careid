const fs = require('fs');
const path = require('path');

const collectionPath = path.resolve(__dirname, '..', 'CareID-Doctor-Patient-Staging.postman_collection.json');
const collection = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));

const doctorFolder = collection.item.find(i => i.name.includes('Doctor App'));
if (!doctorFolder) {
  console.error('Doctor App folder not found');
  process.exit(1);
}

const baseUrlVar = '{{baseUrl}}';

const newModules = [
  {
    name: '08. Clinical Addenda & Record Sharing',
    item: [
      {
        name: 'Append Clinical Addendum to Medical Record',
        request: {
          method: 'POST',
          header: [
            { key: 'Content-Type', value: 'application/json' },
            { key: 'Authorization', value: 'Bearer {{doctorToken}}' },
          ],
          body: {
            mode: 'raw',
            raw: JSON.stringify({
              addendumNotes: 'Pathology consultation confirms complete margins and no malignant infiltration.',
              reason: 'Final histology report received from central laboratory',
            }, null, 2),
          },
          url: {
            raw: `${baseUrlVar}/medical-records/{{medicalRecordId}}/addenda`,
            host: ['{{baseUrl}}'],
            path: ['medical-records', '{{medicalRecordId}}', 'addenda'],
          },
        },
      },
      {
        name: 'Get Clinical Addenda for Medical Record',
        request: {
          method: 'GET',
          header: [{ key: 'Authorization', value: 'Bearer {{doctorToken}}' }],
          url: {
            raw: `${baseUrlVar}/medical-records/{{medicalRecordId}}/addenda`,
            host: ['{{baseUrl}}'],
            path: ['medical-records', '{{medicalRecordId}}', 'addenda'],
          },
        },
      },
      {
        name: 'Generate Secure Cryptographic Share Link',
        request: {
          method: 'POST',
          header: [
            { key: 'Content-Type', value: 'application/json' },
            { key: 'Authorization', value: 'Bearer {{doctorToken}}' },
          ],
          body: {
            mode: 'raw',
            raw: JSON.stringify({
              recipientType: 'DOCTOR',
              recipientTarget: '{{consultantDoctorId}}',
              purpose: 'Inter-facility cardio-thoracic surgical consultation',
              expiryHours: 72,
            }, null, 2),
          },
          url: {
            raw: `${baseUrlVar}/medical-records/{{medicalRecordId}}/share`,
            host: ['{{baseUrl}}'],
            path: ['medical-records', '{{medicalRecordId}}', 'share'],
          },
        },
      },
      {
        name: 'Access Shared Record via Token (Public / Grantee)',
        request: {
          method: 'GET',
          header: [],
          url: {
            raw: `${baseUrlVar}/shares/{{shareToken}}`,
            host: ['{{baseUrl}}'],
            path: ['shares', '{{shareToken}}'],
          },
        },
      },
    ],
  },
  {
    name: '09. Dental Health Records',
    item: [
      {
        name: 'Create Dental Treatment Record',
        request: {
          method: 'POST',
          header: [
            { key: 'Content-Type', value: 'application/json' },
            { key: 'Authorization', value: 'Bearer {{doctorToken}}' },
          ],
          body: {
            mode: 'raw',
            raw: JSON.stringify({
              toothNumber: '18',
              toothSurface: 'MOD',
              procedureName: 'Composite Resin Restoration',
              procedureCode: 'D2393',
              clinicalFindings: 'Mesial-occlusal-distal class II dentinal caries',
              treatmentDate: '2026-11-14T10:00:00Z',
              status: 'COMPLETED',
            }, null, 2),
          },
          url: {
            raw: `${baseUrlVar}/doctors/patients/{{patientProfileId}}/dental-records`,
            host: ['{{baseUrl}}'],
            path: ['doctors', 'patients', '{{patientProfileId}}', 'dental-records'],
          },
        },
      },
      {
        name: 'List Patient Dental Records',
        request: {
          method: 'GET',
          header: [{ key: 'Authorization', value: 'Bearer {{doctorToken}}' }],
          url: {
            raw: `${baseUrlVar}/doctors/patients/{{patientProfileId}}/dental-records`,
            host: ['{{baseUrl}}'],
            path: ['doctors', 'patients', '{{patientProfileId}}', 'dental-records'],
          },
        },
      },
      {
        name: 'Get Dental Record by ID',
        request: {
          method: 'GET',
          header: [{ key: 'Authorization', value: 'Bearer {{doctorToken}}' }],
          url: {
            raw: `${baseUrlVar}/dental-records/{{dentalRecordId}}`,
            host: ['{{baseUrl}}'],
            path: ['dental-records', '{{dentalRecordId}}'],
          },
        },
      },
    ],
  },
  {
    name: '10. Vision & Optometry Records',
    item: [
      {
        name: 'Create Vision & Refraction Record',
        request: {
          method: 'POST',
          header: [
            { key: 'Content-Type', value: 'application/json' },
            { key: 'Authorization', value: 'Bearer {{doctorToken}}' },
          ],
          body: {
            mode: 'raw',
            raw: JSON.stringify({
              odSphere: -2.5,
              odCylinder: -0.75,
              odAxis: 180,
              odAddition: 1.5,
              odVisualAcuity: '20/20',
              odIopMmHg: 14.5,
              osSphere: -2.75,
              osCylinder: -0.5,
              osAxis: 175,
              osAddition: 1.5,
              osVisualAcuity: '20/20',
              osIopMmHg: 15.0,
              contactLensBaseCurve: 8.6,
              contactLensDiameter: 14.2,
              clinicalNotes: 'Anterior segment quiet, fundus clear without cupping',
              recommendations: 'Bifocal progressive prescription issued',
              status: 'FINAL',
            }, null, 2),
          },
          url: {
            raw: `${baseUrlVar}/doctors/patients/{{patientProfileId}}/vision-records`,
            host: ['{{baseUrl}}'],
            path: ['doctors', 'patients', '{{patientProfileId}}', 'vision-records'],
          },
        },
      },
      {
        name: 'List Patient Vision Records',
        request: {
          method: 'GET',
          header: [{ key: 'Authorization', value: 'Bearer {{doctorToken}}' }],
          url: {
            raw: `${baseUrlVar}/doctors/patients/{{patientProfileId}}/vision-records`,
            host: ['{{baseUrl}}'],
            path: ['doctors', 'patients', '{{patientProfileId}}', 'vision-records'],
          },
        },
      },
      {
        name: 'Get Vision Record by ID',
        request: {
          method: 'GET',
          header: [{ key: 'Authorization', value: 'Bearer {{doctorToken}}' }],
          url: {
            raw: `${baseUrlVar}/vision-records/{{visionRecordId}}`,
            host: ['{{baseUrl}}'],
            path: ['vision-records', '{{visionRecordId}}'],
          },
        },
      },
    ],
  },
  {
    name: '11. Diagnostic Laboratory Results',
    item: [
      {
        name: 'Create Structured Laboratory Report with Auto-Flagging',
        request: {
          method: 'POST',
          header: [
            { key: 'Content-Type', value: 'application/json' },
            { key: 'Authorization', value: 'Bearer {{doctorToken}}' },
          ],
          body: {
            mode: 'raw',
            raw: JSON.stringify({
              laboratoryName: 'Metropolis Central Diagnostic Laboratory',
              specimenType: 'Venous Whole Blood',
              collectedDate: '2026-11-14T08:00:00Z',
              reportedDate: '2026-11-14T11:00:00Z',
              status: 'FINAL',
              overallNotes: 'Anemia screen shows microcytosis',
              testItems: [
                {
                  testName: 'Hemoglobin (Hb)',
                  testCategory: 'Complete Blood Count',
                  numericValue: 11.2,
                  unit: 'g/dL',
                  referenceRange: '13.5 - 17.5 g/dL',
                  referenceLow: 13.5,
                  referenceHigh: 17.5,
                },
                {
                  testName: 'Platelet Count',
                  testCategory: 'Complete Blood Count',
                  numericValue: 245000,
                  unit: '/uL',
                  referenceRange: '150000 - 450000 /uL',
                  referenceLow: 150000,
                  referenceHigh: 450000,
                },
              ],
            }, null, 2),
          },
          url: {
            raw: `${baseUrlVar}/doctors/patients/{{patientProfileId}}/lab-results`,
            host: ['{{baseUrl}}'],
            path: ['doctors', 'patients', '{{patientProfileId}}', 'lab-results'],
          },
        },
      },
      {
        name: 'List Patient Laboratory Results',
        request: {
          method: 'GET',
          header: [{ key: 'Authorization', value: 'Bearer {{doctorToken}}' }],
          url: {
            raw: `${baseUrlVar}/doctors/patients/{{patientProfileId}}/lab-results`,
            host: ['{{baseUrl}}'],
            path: ['doctors', 'patients', '{{patientProfileId}}', 'lab-results'],
          },
        },
      },
    ],
  },
  {
    name: '12. Prescriptions & Drug Interactions',
    item: [
      {
        name: 'Screen Medications for Drug-Drug Interactions & Allergy Conflicts',
        request: {
          method: 'POST',
          header: [
            { key: 'Content-Type', value: 'application/json' },
            { key: 'Authorization', value: 'Bearer {{doctorToken}}' },
          ],
          body: {
            mode: 'raw',
            raw: JSON.stringify({
              patientProfileId: '{{patientProfileId}}',
              medications: [
                { drugName: 'Warfarin', dosage: '5mg', form: 'Tablet', frequency: 'Once daily', durationDays: 30 },
                { drugName: 'Aspirin', dosage: '75mg', form: 'Tablet', frequency: 'Once daily', durationDays: 30 },
              ],
            }, null, 2),
          },
          url: {
            raw: `${baseUrlVar}/prescriptions/check-interactions`,
            host: ['{{baseUrl}}'],
            path: ['prescriptions', 'check-interactions'],
          },
        },
      },
      {
        name: 'Write and Issue Prescription',
        request: {
          method: 'POST',
          header: [
            { key: 'Content-Type', value: 'application/json' },
            { key: 'Authorization', value: 'Bearer {{doctorToken}}' },
          ],
          body: {
            mode: 'raw',
            raw: JSON.stringify({
              diagnosisCode: 'J02.9',
              notes: 'Complete 7-day course. Discontinue if rash appears.',
              items: [
                {
                  drugName: 'Amoxicillin',
                  dosage: '500mg',
                  form: 'Capsule',
                  route: 'ORAL',
                  frequency: 'Three times daily (TID)',
                  durationDays: 7,
                  instructions: 'Take after meals with water',
                },
              ],
            }, null, 2),
          },
          url: {
            raw: `${baseUrlVar}/doctors/patients/{{patientProfileId}}/prescriptions`,
            host: ['{{baseUrl}}'],
            path: ['doctors', 'patients', '{{patientProfileId}}', 'prescriptions'],
          },
        },
      },
      {
        name: 'List Patient Prescriptions',
        request: {
          method: 'GET',
          header: [{ key: 'Authorization', value: 'Bearer {{doctorToken}}' }],
          url: {
            raw: `${baseUrlVar}/doctors/patients/{{patientProfileId}}/prescriptions`,
            host: ['{{baseUrl}}'],
            path: ['doctors', 'patients', '{{patientProfileId}}', 'prescriptions'],
          },
        },
      },
      {
        name: 'Get Prescription Preview (Digital Rx Certificate)',
        request: {
          method: 'GET',
          header: [{ key: 'Authorization', value: 'Bearer {{doctorToken}}' }],
          url: {
            raw: `${baseUrlVar}/prescriptions/{{prescriptionId}}/preview`,
            host: ['{{baseUrl}}'],
            path: ['prescriptions', '{{prescriptionId}}', 'preview'],
          },
        },
      },
      {
        name: 'Discontinue Prescription',
        request: {
          method: 'PATCH',
          header: [
            { key: 'Content-Type', value: 'application/json' },
            { key: 'Authorization', value: 'Bearer {{doctorToken}}' },
          ],
          body: {
            mode: 'raw',
            raw: JSON.stringify({
              reason: 'Adverse gastrointestinal intolerance observed on day 3',
            }, null, 2),
          },
          url: {
            raw: `${baseUrlVar}/prescriptions/{{prescriptionId}}/discontinue`,
            host: ['{{baseUrl}}'],
            path: ['prescriptions', '{{prescriptionId}}', 'discontinue'],
          },
        },
      },
      {
        name: 'Issue Prescription Refill',
        request: {
          method: 'POST',
          header: [
            { key: 'Content-Type', value: 'application/json' },
            { key: 'Authorization', value: 'Bearer {{doctorToken}}' },
          ],
          body: {
            mode: 'raw',
            raw: JSON.stringify({
              notes: 'Authorized 30-day refill dispensation',
            }, null, 2),
          },
          url: {
            raw: `${baseUrlVar}/prescriptions/{{prescriptionId}}/refill`,
            host: ['{{baseUrl}}'],
            path: ['prescriptions', '{{prescriptionId}}', 'refill'],
          },
        },
      },
    ],
  },
  {
    name: '13. Patient-Doctor Secure Messaging',
    item: [
      {
        name: 'List Doctor Conversations',
        request: {
          method: 'GET',
          header: [{ key: 'Authorization', value: 'Bearer {{doctorToken}}' }],
          url: {
            raw: `${baseUrlVar}/conversations`,
            host: ['{{baseUrl}}'],
            path: ['conversations'],
          },
        },
      },
      {
        name: 'Get Unread Messages Count',
        request: {
          method: 'GET',
          header: [{ key: 'Authorization', value: 'Bearer {{doctorToken}}' }],
          url: {
            raw: `${baseUrlVar}/conversations/unread-count`,
            host: ['{{baseUrl}}'],
            path: ['conversations', 'unread-count'],
          },
        },
      },
      {
        name: 'Send Message in Conversation',
        request: {
          method: 'POST',
          header: [
            { key: 'Content-Type', value: 'application/json' },
            { key: 'Authorization', value: 'Bearer {{doctorToken}}' },
          ],
          body: {
            mode: 'raw',
            raw: JSON.stringify({
              content: 'Please apply the ice compress for 15 minutes twice daily and rest.',
            }, null, 2),
          },
          url: {
            raw: `${baseUrlVar}/conversations/{{conversationId}}/messages`,
            host: ['{{baseUrl}}'],
            path: ['conversations', '{{conversationId}}', 'messages'],
          },
        },
      },
    ],
  },
  {
    name: '14. Veterinary Pet Clinical Care',
    item: [
      {
        name: 'List Patient Pets for Doctor',
        request: {
          method: 'GET',
          header: [{ key: 'Authorization', value: 'Bearer {{doctorToken}}' }],
          url: {
            raw: `${baseUrlVar}/doctors/patients/{{patientProfileId}}/pets`,
            host: ['{{baseUrl}}'],
            path: ['doctors', 'patients', '{{patientProfileId}}', 'pets'],
          },
        },
      },
      {
        name: 'Get Pet Veterinary Timeline',
        request: {
          method: 'GET',
          header: [{ key: 'Authorization', value: 'Bearer {{doctorToken}}' }],
          url: {
            raw: `${baseUrlVar}/doctors/pets/{{petId}}/timeline`,
            host: ['{{baseUrl}}'],
            path: ['doctors', 'pets', '{{petId}}', 'timeline'],
          },
        },
      },
      {
        name: 'Add Pet Clinical Record',
        request: {
          method: 'POST',
          header: [
            { key: 'Content-Type', value: 'application/json' },
            { key: 'Authorization', value: 'Bearer {{doctorToken}}' },
          ],
          body: {
            mode: 'raw',
            raw: JSON.stringify({
              diagnosis: 'Canine Atopic Dermatitis',
              treatmentPlan: 'Oclacitinib 5.4mg BID for 14 days, followed by SID maintenance',
              notes: 'Pruritus score 7/10 upon initial examination',
              weightKg: 14.2,
              temperatureC: 38.6,
            }, null, 2),
          },
          url: {
            raw: `${baseUrlVar}/doctors/pets/{{petId}}/records`,
            host: ['{{baseUrl}}'],
            path: ['doctors', 'pets', '{{petId}}', 'records'],
          },
        },
      },
    ],
  },
  {
    name: '15. Doctor QR Verification Audit History',
    item: [
      {
        name: 'Get Doctor Scan Audit Log History',
        request: {
          method: 'GET',
          header: [{ key: 'Authorization', value: 'Bearer {{doctorToken}}' }],
          url: {
            raw: `${baseUrlVar}/qr/history/doctor`,
            host: ['{{baseUrl}}'],
            path: ['qr', 'history', 'doctor'],
          },
        },
      },
    ],
  },
];

// Append new modules if not already present
for (const mod of newModules) {
  const existingIdx = doctorFolder.item.findIndex(f => f.name === mod.name);
  if (existingIdx >= 0) {
    doctorFolder.item[existingIdx] = mod;
  } else {
    doctorFolder.item.push(mod);
  }
}

fs.writeFileSync(collectionPath, JSON.stringify(collection, null, 2), 'utf8');
console.log('Successfully updated CareID-Doctor-Patient-Staging.postman_collection.json with new clinical modules!');

