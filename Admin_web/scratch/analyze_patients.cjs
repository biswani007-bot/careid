const fs = require('fs');
const tokenHelper = require('./token_helper.cjs');

async function check() {
  const token = await tokenHelper.getAdminToken();
  const res = await fetch('https://360api.vnvision.in/api/v1/admin/users?limit=100', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  const items = Array.isArray(data) ? data : (data.items || []);
  console.log('Total users fetched:', items.length, 'Total reported:', data.total);
  
  // Look at role distribution and patient profile
  const patients = items.filter(u => {
    const roles = Array.isArray(u.roles) ? u.roles : (u.role ? [u.role] : []);
    return roles.includes('PATIENT') || !!u.patientProfileId;
  });
  console.log('Total patient users in users endpoint:', patients.length);
  
  const stats = {
    total: patients.length,
    withProfileId: 0,
    withoutProfileId: 0,
    statuses: {},
    verified: 0,
    pending: 0,
    inactive: 0,
    active: 0
  };
  
  patients.forEach(p => {
    stats.statuses[p.status] = (stats.statuses[p.status] || 0) + 1;
    if (p.patientProfileId) stats.withProfileId++;
    else stats.withoutProfileId++;
    
    const isInactive = p.status === 'INACTIVE' || p.status === 'BLOCKED' || p.status === 'SUSPENDED';
    if (isInactive) stats.inactive++;
    else stats.active++;
    
    // Check verification criteria
    // Let's see what properties p has
    const isVerified = Boolean(p.patientProfileId);
    if (isVerified) stats.verified++;
    else stats.pending++;
  });
  
  console.log('Patient Analysis from users API:', JSON.stringify(stats, null, 2));

  // Let also check stats endpoint
  const statsRes = await fetch('https://360api.vnvision.in/api/v1/admin/dashboard/stats', {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('Dashboard Stats endpoint:', await statsRes.json());

  // Also check if there are other patient endpoints, e.g. /patients?
  const testEndpoints = [
    '/api/v1/patients',
    '/api/v1/patients?limit=100',
    '/api/v1/admin/patients',
    '/api/v1/admin/dashboard/summary'
  ];
  for (const ep of testEndpoints) {
    const epRes = await fetch('https://360api.vnvision.in' + ep, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(ep, epRes.status);
    if (epRes.status === 200) {
      const epData = await epRes.json();
      console.log('  Count/keys:', Array.isArray(epData) ? epData.length : Object.keys(epData), 'total:', epData.total);
    }
  }

  // Print all 37 patients detail summary
  console.log('\n--- 37 PATIENTS BREAKDOWN ---');
  patients.forEach((p, i) => {
    console.log(`${i+1}. ID: ${p.id} | Name: ${p.firstName || ''} ${p.lastName || ''} | Phone: ${p.phone} | Status: ${p.status} | ProfileId: ${p.patientProfileId ? p.patientProfileId : 'NONE'} | Created: ${p.createdAt}`);
  });
}

check().catch(console.error);

