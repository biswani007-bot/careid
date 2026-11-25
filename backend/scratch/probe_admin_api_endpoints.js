const endpoints = [
  // Health & Observability
  { method: 'GET', path: '/api/v1/health', category: 'Health' },
  { method: 'GET', path: '/api/v1/observability/dashboard', category: 'Observability' },
  { method: 'GET', path: '/api/v1/observability/health', category: 'Observability' },
  { method: 'GET', path: '/api/v1/observability/performance', category: 'Observability' },
  { method: 'GET', path: '/api/v1/observability/statistics', category: 'Observability' },
  // Admin Dashboard
  { method: 'GET', path: '/api/v1/admin/dashboard/stats', category: 'Dashboard' },
  { method: 'GET', path: '/api/v1/admin/dashboard/summary', category: 'Dashboard' },
  // Users & Patients
  { method: 'GET', path: '/api/v1/admin/users', category: 'Users' },
  { method: 'GET', path: '/api/v1/admin/patients', category: 'Patients' },
  // Doctors
  { method: 'GET', path: '/api/v1/admin/doctors', category: 'Doctors' },
  { method: 'GET', path: '/api/v1/doctors', category: 'Doctors' },
  { method: 'GET', path: '/api/v1/doctors/verification/pending', category: 'Doctors' },
  { method: 'GET', path: '/api/v1/doctors/statistics', category: 'Doctors' },
  // Facilities
  { method: 'GET', path: '/api/v1/facilities', category: 'Facilities' },
  { method: 'GET', path: '/api/v1/facilities/statistics', category: 'Facilities' },
  // Records
  { method: 'GET', path: '/api/v1/admin/medical-records', category: 'Clinical Records' },
  // OCR
  { method: 'GET', path: '/api/v1/ocr/jobs', category: 'OCR' },
  { method: 'GET', path: '/api/v1/ocr/dashboard', category: 'OCR' },
  { method: 'GET', path: '/api/v1/ocr/statistics', category: 'OCR' },
  // Referrals
  { method: 'GET', path: '/api/v1/referrals', category: 'Referrals' },
  { method: 'GET', path: '/api/v1/referrals/dashboard/stats', category: 'Referrals' },
  { method: 'GET', path: '/api/v1/referrals/audit', category: 'Referrals' },
  // CMS
  { method: 'GET', path: '/api/v1/cms/announcements', category: 'CMS' },
  // Security & Audit
  { method: 'GET', path: '/api/v1/admin/audit-logs', category: 'Audit Logs' },
  { method: 'GET', path: '/api/v1/security/dashboard', category: 'Security' },
  { method: 'GET', path: '/api/v1/security/compliance/reports', category: 'Security' },
  { method: 'GET', path: '/api/v1/security/incidents', category: 'Security' },
  { method: 'GET', path: '/api/v1/security/keys/active', category: 'Security' },
  // Roles & Permissions
  { method: 'GET', path: '/api/v1/admin/roles', category: 'Roles & Permissions' },
  { method: 'GET', path: '/api/v1/admin/permission-matrix', category: 'Roles & Permissions' },
  { method: 'GET', path: '/api/v1/admin/settings', category: 'Settings' },
  // Reports
  { method: 'GET', path: '/api/v1/reports/dashboard/executive', category: 'Reports' },
  { method: 'GET', path: '/api/v1/reports/generated', category: 'Reports' },
];

const BASE_URL = 'https://360api.vnvision.in';

async function run() {
  console.log('Testing Admin Web API endpoints against ' + BASE_URL);
  const results = [];
  for (const ep of endpoints) {
    try {
      const res = await fetch(`${BASE_URL}${ep.path}`, {
        method: ep.method,
        headers: { 'Accept': 'application/json' }
      });
      const data = await res.json().catch(() => null);
      results.push({
        category: ep.category,
        path: ep.path,
        status: res.status,
        statusText: res.statusText,
        message: data ? (data.message || data.error) : null
      });
    } catch (e) {
      results.push({
        category: ep.category,
        path: ep.path,
        status: 0,
        statusText: 'Network Error',
        message: e.message
      });
    }
  }

  console.table(results);
}

run();

