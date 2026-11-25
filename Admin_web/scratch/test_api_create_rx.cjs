const { execSync } = require('child_process');

function getDoctorToken(phone) {
  const otpReq = execSync(`curl -s -X POST http://localhost:3001/api/v1/auth/otp/request -H "Content-Type: application/json" -d "{\\"phone\\":\\"${phone}\\"}"`).toString();
  const challengeId = JSON.parse(otpReq).data.challengeId;
  const verifyReq = execSync(`curl -s -X POST http://localhost:3001/api/v1/auth/otp/verify -H "Content-Type: application/json" -d "{\\"challengeId\\":\\"${challengeId}\\",\\"otpCode\\":\\"123456\\"}"`).toString();
  return JSON.parse(verifyReq).data.accessToken;
}

const tok = getDoctorToken('+16505550003');
const patientProfileId = execSync("docker exec careid-integration-postgres psql -U careid_test_user -d careid_integration_db -t -A -c \"SELECT id FROM patient_profiles WHERE first_name = 'John' LIMIT 1;\"").toString().trim();

const payload = {
  diagnosisCode: 'Hyperlipidemia',
  notes: 'Prescription for Hyperlipidemia',
  pickupReminderEnabled: true,
  pickupReminderHours: 1,
  items: [
    {
      drugName: 'Atorvastatin QA Test',
      dosage: '20mg',
      form: 'Tablet',
      route: 'ORAL',
      frequency: 'Once daily',
      durationDays: 30
    }
  ]
};

const payloadJson = JSON.stringify(payload).replace(/"/g, '\\"');
const res = execSync(`curl -s -X POST http://localhost:3001/api/v1/doctors/patients/${patientProfileId}/prescriptions -H "Authorization: Bearer ${tok}" -H "Content-Type: application/json" -d "${payloadJson}"`).toString();
console.log('API Response:', res);
