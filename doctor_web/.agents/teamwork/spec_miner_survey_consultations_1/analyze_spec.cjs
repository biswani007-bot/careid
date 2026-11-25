const fs = require('fs');
const path = require('path');

const dump = JSON.parse(fs.readFileSync(path.resolve('.agents/teamwork/spec_miner_survey_consultations_1/treatment_and_consultations_dump.json'), 'utf8'));

console.log(`Analyzing ${dump.length} endpoints...`);

// Group endpoints
const groups = {
  treatmentOffersDoctor: [],
  treatmentOffersPatient: [],
  financing: [],
  appointmentsAndSchedules: [],
  encountersAndMedicalRecords: [],
  cptOrCatalog: [],
  other: []
};

dump.forEach(item => {
  const url = typeof item.url === 'string' ? item.url : (item.url.raw || '');
  if (url.includes('/doctors/treatment-offers')) {
    groups.treatmentOffersDoctor.push(item);
  } else if (url.includes('/patients/treatment-offers')) {
    groups.treatmentOffersPatient.push(item);
  } else if (url.includes('/financing/')) {
    groups.financing.push(item);
  } else if (url.includes('/appointments') || url.includes('/schedules') || url.includes('/shifts')) {
    groups.appointmentsAndSchedules.push(item);
  } else if (url.includes('/encounters') || url.includes('/medical-records') || url.includes('/records')) {
    groups.encountersAndMedicalRecords.push(item);
  } else {
    groups.other.push(item);
  }
});

for (const [groupName, items] of Object.entries(groups)) {
  console.log(`\n================== ${groupName} (${items.length} items) ==================`);
  items.forEach(it => {
    const url = typeof it.url === 'string' ? it.url : (it.url.raw || '');
    console.log(`\n--- [${it.method}] ${url} ---`);
    console.log(`Name: ${it.name}`);
    if (it.description) {
      console.log(`Description: ${it.description.split('\n')[0]}`);
    }
    if (it.body && it.body.raw) {
      console.log(`Request Body: ${it.body.raw.slice(0, 300)}...`);
    }
    if (it.responses && it.responses.length > 0) {
      console.log(`Response Example [${it.responses[0].code}]: ${it.responses[0].body ? it.responses[0].body.slice(0, 300) : 'none'}...`);
    }
  });
}
