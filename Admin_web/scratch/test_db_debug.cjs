const { execSync } = require('child_process');

function runSql(query) {
  const escaped = query.replace(/"/g, '\\"');
  const cmd = `docker exec careid-integration-postgres psql -U careid_test_user -d careid_integration_db -t -A -c "${escaped}"`;
  return execSync(cmd).toString().trim();
}

const pId = '3896bc97-bd3b-40ae-80c1-0cc0455ca3a4';
const q = `INSERT INTO prescriptions (id, patient_profile_id, doctor_id, status, prescribed_at, created_at, updated_at) VALUES (gen_random_uuid(), '${pId}', (SELECT id FROM doctor_profiles LIMIT 1), 'ACTIVE', NOW(), NOW(), NOW()) RETURNING id;`;
const res = runSql(q);
console.log('RES:', JSON.stringify(res));
const rxId = res.split(/\r?\n/)[0].trim();
console.log('RXID:', rxId);

const q2 = `INSERT INTO prescription_reminder_schedules (id, prescription_id, patient_profile_id, enabled, interval_hours, reminder_start_time, next_due_at, status, created_at, updated_at) VALUES (gen_random_uuid(), '${rxId}', '${pId}', true, 2, NOW() - interval '2 hours', NOW() - interval '1 hour', 'ACTIVE', NOW(), NOW()) RETURNING id;`;
const res2 = runSql(q2);
console.log('RES2:', JSON.stringify(res2));
const schedId = res2.split(/\r?\n/)[0].trim();
console.log('SCHEDID:', schedId);
