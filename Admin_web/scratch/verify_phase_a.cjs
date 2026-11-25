const http = require('http');
const net = require('net');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function checkPort(port) {
  return new Promise((resolve) => {
    const s = net.createConnection({ port, host: '127.0.0.1', timeout: 2000 }, () => {
      s.end();
      resolve(true);
    });
    s.on('error', () => resolve(false));
    s.on('timeout', () => { s.destroy(); resolve(false); });
  });
}

function runSql(query) {
  const cmd = `docker exec careid-integration-postgres psql -U careid_test_user -d careid_integration_db -t -A -c "${query}"`;
  return execSync(cmd).toString().trim();
}

async function main() {
  const evidenceDir = path.join('D:', 'careid', 'Admin_web', 'docs', 'evidence', 'CAREID_VISIBLE_LIVE_E2E_005');
  if (!fs.existsSync(evidenceDir)) {
    fs.mkdirSync(evidenceDir, { recursive: true });
  }

  const p3001 = await checkPort(3001);
  const p5173 = await checkPort(5173);
  const p5174 = await checkPort(5174);
  const p5433 = await checkPort(5433);

  const counts = {
    users: runSql('SELECT count(*) FROM users;'),
    doctors: runSql('SELECT count(*) FROM doctor_profiles;'),
    patients: runSql('SELECT count(*) FROM patient_profiles;'),
    facilities: runSql('SELECT count(*) FROM facilities;'),
    prescriptions: runSql('SELECT count(*) FROM prescriptions;'),
    reminderSchedules: runSql('SELECT count(*) FROM prescription_reminder_schedules;'),
    reminderEvents: runSql('SELECT count(*) FROM prescription_reminder_events;'),
    appointments: runSql('SELECT count(*) FROM appointments;'),
    referrals: runSql('SELECT count(*) FROM patient_referrals;'),
    auditLogs: runSql('SELECT count(*) FROM audit_logs;'),
  };

  const cr08Migration = runSql("SELECT migration_name FROM _prisma_migrations WHERE migration_name LIKE '%cr08%';");

  console.log('PHASE A READINESS RESULTS:');
  console.log('Ports Status:', { p3001, p5173, p5174, p5433 });
  console.log('CR-08 Migration:', cr08Migration);
  console.log('Initial Database Counts:', counts);
  console.log('Evidence Directory:', evidenceDir);
}

main().catch(err => {
  console.error('Phase A Readiness Error:', err);
  process.exit(1);
});
