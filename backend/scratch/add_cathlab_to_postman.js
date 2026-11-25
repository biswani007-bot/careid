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

let cathLabFolder = findFolder(postman.item, '29. Cath Lab & Interventional Cardiology');
if (!cathLabFolder) {
  cathLabFolder = {
    name: '29. Cath Lab & Interventional Cardiology',
    item: [
      {
        name: 'Stage 16: Ratify Surgical Safety Time-Out',
        request: {
          method: 'POST',
          header: [
            { key: 'Authorization', value: 'Bearer {{doctor_token}}', type: 'text' },
            { key: 'Content-Type', value: 'application/json', type: 'text' }
          ],
          body: {
            mode: 'raw',
            raw: JSON.stringify({
              appointmentId: '{{appointment_id}}',
              treatmentOfferId: '{{offer_id}}',
              circulatingNurseId: 'nurse-uuid-001',
              anesthesiaProviderId: 'anesthetist-uuid-002',
              gates: {
                patientIdentityConfirmed: true,
                procedureConfirmed: true,
                accessSiteConfirmed: true,
                consentAndAnticoagulationVerified: true,
                equipmentAndEmergencyPrepared: true,
                radiationAndShieldingVerified: true
              },
              notes: 'Pre-puncture time-out complete. Right radial access prepped. Heparin 5000 IU given.'
            }, null, 2)
          },
          url: {
            raw: '{{base_url}}/api/v1/cath-lab/safety-timeout',
            host: ['{{base_url}}'],
            path: ['api', 'v1', 'cath-lab', 'safety-timeout']
          },
          description: 'Stage 16: Pre-puncture active multidisciplinary surgical safety time-out ratification with SHA-256 integrity hash.'
        }
      },
      {
        name: 'Stage 16: Get Ratified Safety Time-Out Record',
        request: {
          method: 'GET',
          header: [
            { key: 'Authorization', value: 'Bearer {{doctor_token}}', type: 'text' }
          ],
          url: {
            raw: '{{base_url}}/api/v1/cath-lab/safety-timeout/{{appointment_id}}',
            host: ['{{base_url}}'],
            path: ['api', 'v1', 'cath-lab', 'safety-timeout', '{{appointment_id}}']
          },
          description: 'Stage 16: Retrieves the ratified surgical safety time-out document and cryptographic checksum.'
        }
      },
      {
        name: 'Stage 16-17: Declare Emergency Safety Hold',
        request: {
          method: 'POST',
          header: [
            { key: 'Authorization', value: 'Bearer {{doctor_token}}', type: 'text' },
            { key: 'Content-Type', value: 'application/json', type: 'text' }
          ],
          body: {
            mode: 'raw',
            raw: JSON.stringify({
              appointmentId: '{{appointment_id}}',
              holdCategory: 'PATIENT_HEMODYNAMIC_INSTABILITY',
              reason: 'Sudden transient bradycardia during catheter engagement',
              clinicalNotes: 'Atropine drawn, paused procedure.'
            }, null, 2)
          },
          url: {
            raw: '{{base_url}}/api/v1/cath-lab/safety-hold',
            host: ['{{base_url}}'],
            path: ['api', 'v1', 'cath-lab', 'safety-hold']
          },
          description: 'Stage 16–17: Declares procedural safety hold. Blocks concurrent actions until cleared.'
        }
      },
      {
        name: 'Stage 16-17: Clear Emergency Safety Hold',
        request: {
          method: 'POST',
          header: [
            { key: 'Authorization', value: 'Bearer {{doctor_token}}', type: 'text' },
            { key: 'Content-Type', value: 'application/json', type: 'text' }
          ],
          body: {
            mode: 'raw',
            raw: JSON.stringify({
              resolutionNotes: 'Atropine administered, rhythm returned to normal sinus, BP 120/80. Resumed procedure.'
            }, null, 2)
          },
          url: {
            raw: '{{base_url}}/api/v1/cath-lab/safety-hold/{{safety_hold_id}}/clear',
            host: ['{{base_url}}'],
            path: ['api', 'v1', 'cath-lab', 'safety-hold', '{{safety_hold_id}}', 'clear']
          },
          description: 'Stage 16–17: Clears active safety hold and records resolution duration.'
        }
      },
      {
        name: 'Stage 16-17: Get Active Emergency Safety Hold',
        request: {
          method: 'GET',
          header: [
            { key: 'Authorization', value: 'Bearer {{doctor_token}}', type: 'text' }
          ],
          url: {
            raw: '{{base_url}}/api/v1/cath-lab/safety-hold/active?appointmentId={{appointment_id}}',
            host: ['{{base_url}}'],
            path: ['api', 'v1', 'cath-lab', 'safety-hold', 'active'],
            query: [{ key: 'appointmentId', value: '{{appointment_id}}' }]
          },
          description: 'Stage 16–17: Checks whether appointment has an active unresolved safety hold.'
        }
      },
      {
        name: 'Stage 17-18: Log Telemetry & Radiation Observation',
        request: {
          method: 'POST',
          header: [
            { key: 'Authorization', value: 'Bearer {{doctor_token}}', type: 'text' },
            { key: 'Content-Type', value: 'application/json', type: 'text' }
          ],
          body: {
            mode: 'raw',
            raw: JSON.stringify({
              appointmentId: '{{appointment_id}}',
              fluoroscopyDurationSeconds: 480,
              doseAreaProductDap: 32000,
              contrastVolumeMl: 80,
              contrastAgent: 'Iohexol 350',
              activatedClottingTimeSeconds: 285,
              systolicBp: 122,
              diastolicBp: 78,
              heartRate: 72,
              oxygenSaturation: 99,
              sourceDevice: 'MANUAL_ENTRY'
            }, null, 2)
          },
          url: {
            raw: '{{base_url}}/api/v1/cath-lab/telemetry/log',
            host: ['{{base_url}}'],
            path: ['api', 'v1', 'cath-lab', 'telemetry', 'log']
          },
          description: 'Stage 17–18: Logs fluoroscopy time, DAP radiation, contrast volume, ACT, and vitals.'
        }
      },
      {
        name: 'Stage 17-18: Get Live Telemetry & Radiation Summary',
        request: {
          method: 'GET',
          header: [
            { key: 'Authorization', value: 'Bearer {{doctor_token}}', type: 'text' }
          ],
          url: {
            raw: '{{base_url}}/api/v1/cath-lab/telemetry/live?appointmentId={{appointment_id}}',
            host: ['{{base_url}}'],
            path: ['api', 'v1', 'cath-lab', 'telemetry', 'live'],
            query: [{ key: 'appointmentId', value: '{{appointment_id}}' }]
          },
          description: 'Stage 17–18: Cumulative totals for contrast, fluoroscopy time, DAP, and latest vitals.'
        }
      },
      {
        name: 'Stage 18: Document Coronary Vessel Findings (QCA)',
        request: {
          method: 'POST',
          header: [
            { key: 'Authorization', value: 'Bearer {{doctor_token}}', type: 'text' },
            { key: 'Content-Type', value: 'application/json', type: 'text' }
          ],
          body: {
            mode: 'raw',
            raw: JSON.stringify({
              coronaryDominance: 'RIGHT',
              lvefPercentage: 55,
              hemostasisMethod: 'RADIAL_BAND',
              findings: [
                {
                  vessel: 'LAD',
                  segment: 'MID',
                  stenosisPercentage: 90,
                  timiFlowPre: 'TIMI_1',
                  timiFlowPost: 'TIMI_3',
                  calcification: 'MODERATE',
                  lesionType: 'TYPE_B2',
                  interventionPerformed: true,
                  stentDetails: 'Promus PREMIER 3.0 x 24 mm DES deployed at 14 atm'
                }
              ],
              summary: 'Primary PCI to mid LAD successful. TIMI 3 flow restored with 0% residual stenosis.'
            }, null, 2)
          },
          url: {
            raw: '{{base_url}}/api/v1/cath-lab/encounters/{{encounter_id}}/vessel-findings',
            host: ['{{base_url}}'],
            path: ['api', 'v1', 'cath-lab', 'encounters', '{{encounter_id}}', 'vessel-findings']
          },
          description: 'Stage 18: Documents detailed coronary vessel lesion analysis, TIMI flow, and dominance.'
        }
      },
      {
        name: 'Stage 18: Get Coronary Vessel Findings',
        request: {
          method: 'GET',
          header: [
            { key: 'Authorization', value: 'Bearer {{doctor_token}}', type: 'text' }
          ],
          url: {
            raw: '{{base_url}}/api/v1/cath-lab/encounters/{{encounter_id}}/vessel-findings',
            host: ['{{base_url}}'],
            path: ['api', 'v1', 'cath-lab', 'encounters', '{{encounter_id}}', 'vessel-findings']
          },
          description: 'Stage 18: Retrieves recorded coronary vessel lesion findings for encounter.'
        }
      },
      {
        name: 'Stage 18: Register DICOM Angiography Series Metadata',
        request: {
          method: 'POST',
          header: [
            { key: 'Authorization', value: 'Bearer {{doctor_token}}', type: 'text' },
            { key: 'Content-Type', value: 'application/json', type: 'text' }
          ],
          body: {
            mode: 'raw',
            raw: JSON.stringify({
              studyInstanceUid: '1.2.840.10008.5.1.4.1.1.12.1.20261110.001',
              seriesInstanceUid: '1.2.840.10008.5.1.4.1.1.12.1.20261110.001.01',
              modality: 'XA',
              seriesDescription: 'LAD Cranial 30/30 Run 02',
              numberOfFrames: 64,
              keyFrameNumbers: [16, 32, 48],
              kvp: 75,
              exposureTimeMs: 12
            }, null, 2)
          },
          url: {
            raw: '{{base_url}}/api/v1/cath-lab/encounters/{{encounter_id}}/dicom-series',
            host: ['{{base_url}}'],
            path: ['api', 'v1', 'cath-lab', 'encounters', '{{encounter_id}}', 'dicom-series']
          },
          description: 'Stage 18: Registers DICOM study/series acquisition metadata for angiography.'
        }
      },
      {
        name: 'Stage 18: List DICOM Series for Encounter',
        request: {
          method: 'GET',
          header: [
            { key: 'Authorization', value: 'Bearer {{doctor_token}}', type: 'text' }
          ],
          url: {
            raw: '{{base_url}}/api/v1/cath-lab/encounters/{{encounter_id}}/dicom-series',
            host: ['{{base_url}}'],
            path: ['api', 'v1', 'cath-lab', 'encounters', '{{encounter_id}}', 'dicom-series']
          },
          description: 'Stage 18: Lists registered DICOM series for encounter.'
        }
      },
      {
        name: 'Stage 18: Retrieve DICOM Keyframe',
        request: {
          method: 'GET',
          header: [
            { key: 'Authorization', value: 'Bearer {{doctor_token}}', type: 'text' }
          ],
          url: {
            raw: '{{base_url}}/api/v1/cath-lab/dicom-series/{{series_id}}/frames/12',
            host: ['{{base_url}}'],
            path: ['api', 'v1', 'cath-lab', 'dicom-series', '{{series_id}}', 'frames', '12']
          },
          description: 'Stage 18: Retrieves single cine keyframe. (Reports BLOCKED_BY_EXTERNAL_DEPENDENCY if PACS node is offline).'
        }
      }
    ]
  };
  postman.item.push(cathLabFolder);
}

fs.writeFileSync(collectionPath, JSON.stringify(postman, null, 2), 'utf8');
console.log('Successfully added 29. Cath Lab & Interventional Cardiology folder with 12 requests!');

