const fs = require('fs');

const colPath = 'CareID-Doctor-Patient-Staging.postman_collection.json';
const docsColPath = 'docs/postman/CareID-Doctor-Patient-Staging.postman_collection.json';

const col = JSON.parse(fs.readFileSync(colPath, 'utf8'));

// 1. Add offerId and applicationId to collection variables if not present
if (!col.variable.find(v => v.key === 'offerId')) {
  col.variable.push({
    key: 'offerId',
    value: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22',
    type: 'string',
    description: 'Sample Treatment Offer UUID'
  });
}
if (!col.variable.find(v => v.key === 'applicationId')) {
  col.variable.push({
    key: 'applicationId',
    value: 'app-sample-001',
    type: 'string',
    description: 'Sample Financing Application UUID'
  });
}

// 2. Doctor section: Add '07. Treatment Proposals & Offers'
const doctorFolder = col.item.find(i => i.name === '1. Doctor App Integration');
if (doctorFolder && !doctorFolder.item.find(i => i.name.includes('Treatment Proposals'))) {
  const doctorTreatmentFolder = {
    name: '07. Treatment Proposals & Offers',
    description: 'Doctor workflows for authoring multi-procedure treatment proposals, locking drafts, dispatching to patients, and lifecycle status inspection.',
    item: [
      {
        name: 'Create a new draft treatment proposal [Doctor]',
        request: {
          auth: {
            type: 'bearer',
            bearer: [{ key: 'token', value: '{{doctorAccessToken}}', type: 'string' }]
          },
          method: 'POST',
          header: [{ key: 'Content-Type', value: 'application/json' }],
          body: {
            mode: 'raw',
            raw: JSON.stringify({
              patientProfileId: '{{patientId}}',
              title: 'Comprehensive Dental Reconstruction Plan',
              clinicalRationale: 'Patient requires multi-stage restorative procedure following periodontal assessment',
              expiresAt: '2026-12-01T00:00:00.000Z',
              notes: 'Includes bone graft, titanium fixture, and porcelain crown',
              procedures: [
                {
                  procedureCode: 'D6010',
                  procedureName: 'Surgical Placement of Implant Body',
                  category: 'DENTAL',
                  unitPrice: 45000,
                  quantity: 1,
                  discountAmount: 5000
                },
                {
                  procedureCode: 'D6058',
                  procedureName: 'Abutment Supported Porcelain Crown',
                  category: 'DENTAL',
                  unitPrice: 25000,
                  quantity: 1,
                  discountAmount: 0
                }
              ],
              financingOptions: [
                {
                  financingOptionId: 'opt-zerocost-care',
                  partnerName: 'Bajaj Finserv Health',
                  tenureMonths: 12,
                  monthlyEmi: 5416.67,
                  interestRatePercent: 0,
                  preApproved: true
                }
              ]
            }, null, 2)
          },
          url: {
            raw: '{{baseUrl}}/api/v1/doctors/treatment-offers',
            host: ['{{baseUrl}}'],
            path: ['api', 'v1', 'doctors', 'treatment-offers']
          }
        },
        event: [
          {
            listen: 'test',
            script: {
              type: 'text/javascript',
              exec: [
                'pm.test("Status code is 201 (Offer Created)", function () {',
                '    pm.response.to.have.status(201);',
                '});',
                'const res = pm.response.json();',
                'const data = res.data || res;',
                'if (data && data.id) {',
                '    pm.collectionVariables.set("offerId", data.id);',
                '    console.log("[Doctor App] Saved new offerId:", data.id);',
                '}'
              ]
            }
          }
        ]
      },
      {
        name: 'List authored treatment proposals [Doctor]',
        request: {
          auth: {
            type: 'bearer',
            bearer: [{ key: 'token', value: '{{doctorAccessToken}}', type: 'string' }]
          },
          method: 'GET',
          url: {
            raw: '{{baseUrl}}/api/v1/doctors/treatment-offers?page=1&limit=20',
            host: ['{{baseUrl}}'],
            path: ['api', 'v1', 'doctors', 'treatment-offers'],
            query: [
              { key: 'page', value: '1' },
              { key: 'limit', value: '20' }
            ]
          }
        }
      },
      {
        name: 'Get treatment offer details [Doctor]',
        request: {
          auth: {
            type: 'bearer',
            bearer: [{ key: 'token', value: '{{doctorAccessToken}}', type: 'string' }]
          },
          method: 'GET',
          url: {
            raw: '{{baseUrl}}/api/v1/doctors/treatment-offers/{{offerId}}',
            host: ['{{baseUrl}}'],
            path: ['api', 'v1', 'doctors', 'treatment-offers', '{{offerId}}']
          }
        }
      },
      {
        name: 'Lock draft and dispatch treatment offer to patient [Doctor]',
        request: {
          auth: {
            type: 'bearer',
            bearer: [{ key: 'token', value: '{{doctorAccessToken}}', type: 'string' }]
          },
          method: 'POST',
          header: [{ key: 'Content-Type', value: 'application/json' }],
          body: {
            mode: 'raw',
            raw: JSON.stringify({ notes: 'Clinical proposal finalized and dispatched to patient' }, null, 2)
          },
          url: {
            raw: '{{baseUrl}}/api/v1/doctors/treatment-offers/{{offerId}}/dispatch',
            host: ['{{baseUrl}}'],
            path: ['api', 'v1', 'doctors', 'treatment-offers', '{{offerId}}', 'dispatch']
          }
        }
      },
      {
        name: 'Cancel active treatment proposal [Doctor]',
        request: {
          auth: {
            type: 'bearer',
            bearer: [{ key: 'token', value: '{{doctorAccessToken}}', type: 'string' }]
          },
          method: 'POST',
          header: [{ key: 'Content-Type', value: 'application/json' }],
          body: {
            mode: 'raw',
            raw: JSON.stringify({ reason: 'Patient requested revision of procedure plan' }, null, 2)
          },
          url: {
            raw: '{{baseUrl}}/api/v1/doctors/treatment-offers/{{offerId}}/cancel',
            host: ['{{baseUrl}}'],
            path: ['api', 'v1', 'doctors', 'treatment-offers', '{{offerId}}', 'cancel']
          }
        }
      }
    ]
  };
  doctorFolder.item.push(doctorTreatmentFolder);
}

// 3. Patient section: Add '08. Treatment Offers & Healthcare Financing'
const patientFolder = col.item.find(i => i.name === '2. Patient App Integration');
if (patientFolder && !patientFolder.item.find(i => i.name.includes('Treatment Offers'))) {
  const patientTreatmentFolder = {
    name: '08. Treatment Offers & Healthcare Financing',
    description: 'Patient workflows for reviewing received clinical treatment offers, ratifying/accepting or declining proposals, and applying for healthcare EMI financing.',
    item: [
      {
        name: 'List received treatment offers for authenticated patient [Patient]',
        request: {
          auth: {
            type: 'bearer',
            bearer: [{ key: 'token', value: '{{patientAccessToken}}', type: 'string' }]
          },
          method: 'GET',
          url: {
            raw: '{{baseUrl}}/api/v1/patients/treatment-offers?page=1&limit=20',
            host: ['{{baseUrl}}'],
            path: ['api', 'v1', 'patients', 'treatment-offers'],
            query: [
              { key: 'page', value: '1' },
              { key: 'limit', value: '20' }
            ]
          }
        }
      },
      {
        name: 'Patient view of treatment offer [Patient]',
        request: {
          auth: {
            type: 'bearer',
            bearer: [{ key: 'token', value: '{{patientAccessToken}}', type: 'string' }]
          },
          method: 'GET',
          url: {
            raw: '{{baseUrl}}/api/v1/patients/treatment-offers/{{offerId}}',
            host: ['{{baseUrl}}'],
            path: ['api', 'v1', 'patients', 'treatment-offers', '{{offerId}}']
          }
        }
      },
      {
        name: 'Patient ratifies and accepts treatment offer [Patient]',
        request: {
          auth: {
            type: 'bearer',
            bearer: [{ key: 'token', value: '{{patientAccessToken}}', type: 'string' }]
          },
          method: 'POST',
          header: [{ key: 'Content-Type', value: 'application/json' }],
          body: {
            mode: 'raw',
            raw: JSON.stringify({
              selectedFinancingOptionId: 'opt-zerocost-care',
              notes: 'Patient ratified treatment plan with 12-month financing'
            }, null, 2)
          },
          url: {
            raw: '{{baseUrl}}/api/v1/patients/treatment-offers/{{offerId}}/accept',
            host: ['{{baseUrl}}'],
            path: ['api', 'v1', 'patients', 'treatment-offers', '{{offerId}}', 'accept']
          }
        }
      },
      {
        name: 'Patient declines treatment offer [Patient]',
        request: {
          auth: {
            type: 'bearer',
            bearer: [{ key: 'token', value: '{{patientAccessToken}}', type: 'string' }]
          },
          method: 'POST',
          header: [{ key: 'Content-Type', value: 'application/json' }],
          body: {
            mode: 'raw',
            raw: JSON.stringify({
              rejectionReason: 'Patient elected to defer procedure'
            }, null, 2)
          },
          url: {
            raw: '{{baseUrl}}/api/v1/patients/treatment-offers/{{offerId}}/reject',
            host: ['{{baseUrl}}'],
            path: ['api', 'v1', 'patients', 'treatment-offers', '{{offerId}}', 'reject']
          }
        }
      },
      {
        name: 'List available healthcare financing options [Patient]',
        request: {
          auth: {
            type: 'bearer',
            bearer: [{ key: 'token', value: '{{patientAccessToken}}', type: 'string' }]
          },
          method: 'GET',
          url: {
            raw: '{{baseUrl}}/api/v1/financing/options',
            host: ['{{baseUrl}}'],
            path: ['api', 'v1', 'financing', 'options']
          }
        }
      },
      {
        name: 'Submit healthcare financing application [Patient]',
        request: {
          auth: {
            type: 'bearer',
            bearer: [{ key: 'token', value: '{{patientAccessToken}}', type: 'string' }]
          },
          method: 'POST',
          header: [{ key: 'Content-Type', value: 'application/json' }],
          body: {
            mode: 'raw',
            raw: JSON.stringify({
              optionId: 'opt-zerocost-care',
              facilityId: '{{facilityId}}',
              treatmentName: 'Orthopedic Knee Replacement Surgery',
              requestedAmount: 50000,
              tenureMonths: 6,
              monthlyIncome: 65000,
              employmentType: 'SALARIED',
              panOrNationalId: 'ABCDE1234F',
              notes: 'Planned surgery next month'
            }, null, 2)
          },
          url: {
            raw: '{{baseUrl}}/api/v1/financing/apply',
            host: ['{{baseUrl}}'],
            path: ['api', 'v1', 'financing', 'apply']
          }
        },
        event: [
          {
            listen: 'test',
            script: {
              type: 'text/javascript',
              exec: [
                'pm.test("Status code is 201 (Financing Application Created)", function () {',
                '    pm.response.to.have.status(201);',
                '});',
                'const res = pm.response.json();',
                'const data = res.data || res;',
                'if (data && data.id) {',
                '    pm.collectionVariables.set("applicationId", data.id);',
                '    console.log("[Patient App] Saved new applicationId:", data.id);',
                '}'
              ]
            }
          }
        ]
      },
      {
        name: 'List patient financing applications [Patient]',
        request: {
          auth: {
            type: 'bearer',
            bearer: [{ key: 'token', value: '{{patientAccessToken}}', type: 'string' }]
          },
          method: 'GET',
          url: {
            raw: '{{baseUrl}}/api/v1/financing/applications?page=1&limit=20',
            host: ['{{baseUrl}}'],
            path: ['api', 'v1', 'financing', 'applications'],
            query: [
              { key: 'page', value: '1' },
              { key: 'limit', value: '20' }
            ]
          }
        }
      }
    ]
  };
  patientFolder.item.push(patientTreatmentFolder);
}

const formatted = JSON.stringify(col, null, 2);
fs.writeFileSync(colPath, formatted, 'utf8');
if (fs.existsSync('docs/postman')) {
  fs.writeFileSync(docsColPath, formatted, 'utf8');
}

console.log('Updated CareID-Doctor-Patient-Staging collection.');
let total = 0;
function countReq(item) {
  if (item.request) total++;
  if (item.item) item.item.forEach(countReq);
}
countReq(col);
console.log('Total requests in Doctor-Patient collection now:', total);

