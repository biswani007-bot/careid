const fs = require('fs');
const path = require('path');

const controllers = [
  'src/core/health/health.controller.ts',
  'src/modules/admin/presentation/controllers/admin.controller.ts',
  'src/modules/ai-ocr/presentation/controllers/ai-ocr.controller.ts',
  'src/modules/appointment/presentation/controllers/appointment.controller.ts',
  'src/modules/auth/presentation/controllers/auth.controller.ts',
  'src/modules/cms/presentation/controllers/cms.controller.ts',
  'src/modules/doctor/presentation/controllers/doctor.controller.ts',
  'src/modules/facility/presentation/controllers/facility.controller.ts',
  'src/modules/family/presentation/controllers/family.controller.ts',
  'src/modules/financing/presentation/controllers/financing.controller.ts',
  'src/modules/governance/presentation/controllers/governance.controller.ts',
  'src/modules/health-card/presentation/controllers/health-card.controller.ts',
  'src/modules/immunisation/presentation/controllers/immunisation.controller.ts',
  'src/modules/insurance/presentation/controllers/insurance-card.controller.ts',
  'src/modules/insurance/presentation/controllers/insurance.controller.ts',
  'src/modules/medical-record/presentation/controllers/medical-record.controller.ts',
  'src/modules/notifications/presentation/controllers/notification-template.controller.ts',
  'src/modules/notifications/presentation/controllers/notification.controller.ts',
  'src/modules/observability/presentation/controllers/observability.controller.ts',
  'src/modules/ocr/presentation/controllers/ocr.controller.ts',
  'src/modules/patient/presentation/controllers/patient.controller.ts',
  'src/modules/pet/presentation/controllers/pet.controller.ts',
  'src/modules/qr/presentation/controllers/qr.controller.ts',
  'src/modules/referral/presentation/controllers/referral.controller.ts',
  'src/modules/report/presentation/controllers/report.controller.ts',
  'src/modules/reports/presentation/controllers/reports.controller.ts',
  'src/modules/schedule/presentation/controllers/holiday.controller.ts',
  'src/modules/schedule/presentation/controllers/schedule.controller.ts',
  'src/modules/schedule/presentation/controllers/shift.controller.ts',
  'src/modules/security/presentation/controllers/security.controller.ts',
  'src/modules/staff/presentation/controllers/staff.controller.ts',
  'src/modules/support/presentation/controllers/support.controller.ts',
];

console.log('--- Controller Inspection ---');
controllers.forEach(p => {
  if (!fs.existsSync(p)) {
    console.log(`MISSING: ${p}`);
    return;
  }
  const content = fs.readFileSync(p, 'utf8');
  const tagMatches = [...content.matchAll(/@ApiTags\(([^)]+)\)/g)].map(m => m[1]);
  const ctrlMatches = [...content.matchAll(/@Controller\(([^)]*)\)/g)].map(m => m[1]);
  console.log(`${path.basename(p)}:`);
  console.log(`  Path: ${p}`);
  console.log(`  ApiTags: ${tagMatches.join(', ') || 'NONE'}`);
  console.log(`  Controller: ${ctrlMatches.join(', ') || 'NONE'}`);
});

