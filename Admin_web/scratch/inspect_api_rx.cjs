const { execSync } = require('child_process');
const otpReq = execSync('curl.exe -s -X POST http://localhost:3001/api/v1/auth/otp/request -H "Content-Type: application/json" -d "{\\"phone\\":\\"+16505550003\\"}"').toString();
const challengeId = JSON.parse(otpReq).data.challengeId;
const verifyReq = execSync(`curl.exe -s -X POST http://localhost:3001/api/v1/auth/otp/verify -H "Content-Type: application/json" -d "{\\"challengeId\\":\\"${challengeId}\\",\\"otpCode\\":\\"123456\\"}"`).toString();
const docToken = JSON.parse(verifyReq).data.accessToken;
const res = execSync(`curl.exe -s http://localhost:3001/api/v1/doctors/patients/3896bc97-bd3b-40ae-80c1-0cc0455ca3a4/prescriptions?limit=2 -H "Authorization: Bearer ${docToken}"`).toString();
console.log('API response:', JSON.stringify(JSON.parse(res), null, 2));
