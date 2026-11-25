const fs = require('fs');
const token = JSON.parse(fs.readFileSync('scratch/cached_admin_token.json', 'utf8')).token;
const BASE_URL = 'https://360api.vnvision.in/api/v1';

async function checkRelations() {
  const allAudit = JSON.parse(fs.readFileSync('scratch/all_patient_profiles_audit.json', 'utf8'));
  const working = allAudit.filter(p => p.profileHttpStatus === 200);

  console.log(`Analyzing ${working.length} working patient profiles:\n`);

  const relationStats = {
    hasEmergencyContact: 0,
    hasInsurancePolicy: 0,
    hasHealthCard: 0,
    hasAddress: 0,
    hasCurrentAddress: 0,
    hasPermanentAddress: 0,
    profileStatuses: {},
  };

  for (const p of working) {
    const res = await fetch(`${BASE_URL}/admin/patients/${p.patientProfileId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const json = await res.json();
    const d = json.data;

    if (d.emergencyContact) relationStats.hasEmergencyContact++;
    if (d.insurancePolicy) relationStats.hasInsurancePolicy++;
    if (d.healthCard) relationStats.hasHealthCard++;
    if (d.address) relationStats.hasAddress++;
    if (d.currentAddressLine1) relationStats.hasCurrentAddress++;
    if (d.permanentAddressLine1) relationStats.hasPermanentAddress++;
    relationStats.profileStatuses[d.profileStatus] = (relationStats.profileStatuses[d.profileStatus] || 0) + 1;
  }

  console.log('Relation presence across all working patients:');
  console.log(relationStats);
}

checkRelations().catch(console.error);

