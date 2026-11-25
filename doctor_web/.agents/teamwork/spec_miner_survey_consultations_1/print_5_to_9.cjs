const fs = require('fs');
const path = require('path');

const details = JSON.parse(fs.readFileSync(path.resolve('.agents/teamwork/spec_miner_survey_consultations_1/treatment_and_financing_details.json'), 'utf8'));

for (let i = 4; i < 9; i++) {
  const d = details[i];
  console.log(`\n================================================================`);
  console.log(`[#${i + 1}] ${d.method} ${d.rawUrl}`);
  console.log(`Folder: ${d.folder}`);
  console.log(`Name: ${d.name}`);
  console.log(`Description: ${d.description ? d.description.slice(0, 300) : ''}`);
  if (d.query && d.query.length > 0) {
    console.log(`Query Params:`, d.query.map(q => `${q.key}=${q.value} (${q.description || ''})`).join(', '));
  }
  if (d.bodyRaw) {
    console.log(`Request Body:\n${d.bodyRaw}`);
  }
  if (d.responses && d.responses.length > 0) {
    d.responses.forEach(res => {
      console.log(`Response [${res.code} ${res.status}] (${res.name}):\n${res.body ? res.body.slice(0, 600) : ''}`);
    });
  }
}
