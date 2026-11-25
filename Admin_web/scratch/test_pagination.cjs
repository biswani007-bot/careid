const tokenHelper = require('./token_helper.cjs');

async function reconcile() {
  const token = await tokenHelper.getAdminToken();
  const res = await fetch('https://360api.vnvision.in/api/v1/admin/users', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const users = await res.json();
  const patients = users.filter(u => (Array.isArray(u.roles) && u.roles.includes('PATIENT')) || Boolean(u.patientProfileId));
  
  console.log('Total patient accounts in backend:', patients.length);

  let verifiedCount = 0;
  let pendingCount = 0;
  let otherVerificationCount = 0;

  let activeAccountCount = 0;
  let inactiveAccountCount = 0;
  let blockedAccountCount = 0;
  let otherAccountCount = 0;

  patients.forEach((p, idx) => {
    // Verification status
    const isVerified = Boolean(
      p.patientProfileId ||
      (p.profileStatus && (p.profileStatus || '').toUpperCase() === 'COMPLETED')
    );
    if (isVerified) {
      verifiedCount++;
    } else {
      pendingCount++;
    }

    // Account status
    const rawStatus = (p.status || p.userStatus || '').toUpperCase();
    if (rawStatus === 'ACTIVE') {
      activeAccountCount++;
    } else if (rawStatus === 'BLOCKED') {
      blockedAccountCount++;
      inactiveAccountCount++;
    } else if (rawStatus === 'INACTIVE' || rawStatus === 'SUSPENDED') {
      inactiveAccountCount++;
    } else {
      otherAccountCount++;
    }
  });

  console.log('=== VERIFICATION DIMENSION ===');
  console.log('Verified:', verifiedCount);
  console.log('Pending Verification:', pendingCount);
  console.log('Other Verification States:', otherVerificationCount);
  console.log('Sum (Verified + Pending + Other):', verifiedCount + pendingCount + otherVerificationCount);
  console.log('Matches Total Patients (37)?', (verifiedCount + pendingCount + otherVerificationCount) === patients.length);

  console.log('\n=== ACCOUNT STATUS DIMENSION ===');
  console.log('Active Accounts:', activeAccountCount);
  console.log('Inactive / Blocked Accounts:', inactiveAccountCount, `(${blockedAccountCount} blocked)`);
  console.log('Other Account States:', otherAccountCount);
  console.log('Sum (Active + Inactive + Other):', activeAccountCount + inactiveAccountCount + otherAccountCount);
  console.log('Matches Total Patients (37)?', (activeAccountCount + inactiveAccountCount + otherAccountCount) === patients.length);

  // Check the single blocked account:
  const blocked = patients.find(p => (p.status || '').toUpperCase() === 'BLOCKED');
  console.log('\nBlocked account details:', {
    id: blocked.id,
    phone: blocked.phone,
    profileId: blocked.patientProfileId,
    status: blocked.status
  });
}

reconcile().catch(console.error);
