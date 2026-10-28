const fs = require('fs');

const doc = JSON.parse(fs.readFileSync('scratch/backend_openapi.json', 'utf8'));

const schemaNames = [
  'RequestOtpDto',
  'VerifyOtpDto',
  'VerifyOtpResponseDto',
  'RefreshTokenDto',
  'RefreshTokenResponseDto',
  'UserMeResponseDto',
  // OCR
  'OcrJobResponseDto',
  'OcrDashboardResponseDto',
  'OcrReviewSubmitDto',
  'CreateOcrJobDto',
  // Admin & Users
  'AdminUserListResponseDto',
  'UpdateUserStatusDto',
  'AssignRolesDto',
  // Doctors
  'CreateDoctorDto',
  'DoctorResponseDto',
  'VerifyDoctorDto',
  'SuspendDoctorDto',
  // Facilities
  'CreateFacilityDto',
  'FacilityResponseDto',
  'AssignDoctorToFacilityDto',
  // Staff
  'CreateStaffDto',
  'StaffResponseDto',
  // Medical Records
  'CreateMedicalRecordDto',
  'MedicalRecordResponseDto'
];

console.log('=== SELECTED SCHEMAS DEFINITION ===');
for (const s of schemaNames) {
  const def = doc.components?.schemas?.[s];
  if (def) {
    console.log(`\nSCHEMA: ${s}`);
    console.log(JSON.stringify(def, null, 2));
  } else {
    // Check if there are similar schemas
    const similar = Object.keys(doc.components?.schemas || {}).filter(k => k.toLowerCase().includes(s.toLowerCase().replace('dto', '')));
    console.log(`\nSCHEMA: ${s} NOT FOUND. Similar:`, similar.join(', '));
  }
}
