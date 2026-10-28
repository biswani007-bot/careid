const fs = require('fs');

const doc = JSON.parse(fs.readFileSync('scratch/backend_openapi.json', 'utf8'));

const ocrSchemas = [
  'OCRDashboardResponseDto',
  'OCRJobResponseDto',
  'VerifyOCRDto',
  'RegisterDoctorDto',
  'DoctorProfileResponseDto'
];

for (const s of ocrSchemas) {
  const schema = doc.components?.schemas?.[s];
  console.log(`\n======================================================`);
  console.log(`SCHEMA: ${s}`);
  console.log(`======================================================`);
  console.log(JSON.stringify(schema, null, 2));
}
