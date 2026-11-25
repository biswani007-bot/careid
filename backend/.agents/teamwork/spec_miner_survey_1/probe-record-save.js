const https = require('https');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmYTUwMmYyZS0zMzJjLTRlYzAtYjZhYS04MzcxMzIxNmVjODgiLCJwaG9uZSI6IisxNjUwNTU1MDAwMyIsInNlc3Npb25JZCI6IjFmMGE2NjIyLWVjNjAtNDM2MS04YTgzLTgwNzMwOWFiYzUyNyIsInJvbGVzIjpbIkRPQ1RPUiJdLCJwZXJtaXNzaW9ucyI6WyJyZWFkOnByb2ZpbGUiLCJyZWFkOnJlcG9ydHMiLCJ3cml0ZTpyZXBvcnRzIiwicmVhZDpoZWFsdGgtY2FyZCIsInZlcmlmeTpoZWFsdGgtY2FyZCJdLCJpYXQiOjE3OTQyMjcyMDUsImV4cCI6MTc5NDIyODEwNX0.p1igKws9nqasPHFETi8Y68NwTz2WUvC_zDqsmyMV_0g';
const patientProfileId = '787e5187-7859-4320-bb1a-465a57dd086a';

const payload = JSON.stringify({
  title: 'Routine Health Checkup',
  chiefComplaint: 'Mild fatigue',
  clinicalNotes: 'Patient appears well nourished.',
  treatmentPlan: 'Hydration and balanced diet',
  followUpInstructions: 'Review in 2 weeks',
  status: 'FINAL',
  encounter: {
    providerName: 'Dr. Sarah Jenkins',
    facilityName: 'City General Hospital',
    encounterType: 'CONSULTATION',
    encounterDate: new Date().toISOString()
  },
  diagnoses: [
    {
      description: 'Fatigue, unspecified',
      code: 'R53.83',
      type: 'PRIMARY',
      status: 'ACTIVE'
    }
  ],
  vitalSigns: {
    heightCm: 175,
    weightKg: 70,
    systolicBp: 120,
    diastolicBp: 80,
    pulseBpm: 72,
    respirationRate: 16,
    temperatureC: 36.6,
    bloodSugarMgDl: 95,
    oxygenSaturation: 98
  }
});

const req = https.request('https://360api.vnvision.in/api/v1/doctors/patients/' + patientProfileId + '/medical-records', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
}, res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    console.log('Record Save Status:', res.statusCode);
    console.log('Record Save Headers:', JSON.stringify(res.headers, null, 2));
    try {
      console.log('Record Save Body:', JSON.stringify(JSON.parse(d), null, 2));
    } catch (e) {
      console.log('Record Save Body (raw):', d);
    }
  });
});

req.on('error', e => console.error('Record Save Error:', e));
req.write(payload);
req.end();
