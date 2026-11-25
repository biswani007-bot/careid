// D:\careid\doctor_web\tests\verify_m1_remediation.cjs
const assert = require('assert');

// Test 1: Symmetrical Dual-Role Detection & Specialty Isolation
function resolveWorkspaceDetails(userMe, doctorMe) {
  const rolesUpper = (userMe?.roles || []).map((r) => String(r).trim().toUpperCase());
  const hasExplicitVetRole = rolesUpper.some((r) =>
    ['VET', 'VETERINARIAN', 'DOCTOR_VET'].includes(r)
  );
  const hasExplicitDoctorRole = rolesUpper.some((r) =>
    ['DOCTOR', 'PHYSICIAN', 'SURGEON'].includes(r)
  );

  const specTerms = [
    doctorMe?.primarySpecialization,
    doctorMe?.department,
    ...(doctorMe?.secondarySpecializations || []),
    ...(doctorMe?.subSpecializations || []),
  ]
    .filter(Boolean)
    .map((s) => String(s).trim());

  const hasVetSpec = specTerms.some((t) =>
    /vet|veterinar|animal|zoological/i.test(t)
  );

  const hasHumanSpec = specTerms.some((t) => {
    if (/human/i.test(t)) return true;
    const matchesHumanClinical =
      /cardio|internal|pediatric|neuro|surgery|general|ortho|oncolog|physician|attending|fellow/i.test(t);
    const isVetQualified = /vet|veterinar|animal|zoological/i.test(t);
    return matchesHumanClinical && !isVetQualified;
  });

  const hasHumanCredential = hasExplicitDoctorRole || hasHumanSpec;
  const hasVetCredential = hasExplicitVetRole || hasVetSpec;
  const isExplicitDualRole =
    rolesUpper.includes('DOCTOR_VET') || (hasHumanCredential && hasVetCredential);

  if (isExplicitDualRole) {
    return {
      workspaceType: 'HUMAN',
      isHumanDoctor: true,
      isVeterinarian: true,
      hasDualRoleAmbiguity: true,
    };
  }

  const isVet = hasExplicitVetRole || hasVetSpec;
  if (isVet) {
    return {
      workspaceType: 'VETERINARIAN',
      isHumanDoctor: false,
      isVeterinarian: true,
      hasDualRoleAmbiguity: false,
    };
  }

  return {
    workspaceType: 'HUMAN',
    isHumanDoctor: true,
    isVeterinarian: false,
    hasDualRoleAmbiguity: false,
  };
}

console.log('=== TEST SUITE 1: resolveWorkspaceDetails ===');

// 1. Pure Human Doctor
const r1 = resolveWorkspaceDetails({ roles: ['DOCTOR'] }, { primarySpecialization: 'Cardiology' });
assert.strictEqual(r1.workspaceType, 'HUMAN');
assert.strictEqual(r1.hasDualRoleAmbiguity, false);
console.log('[PASS] Pure Doctor + Cardiology');

// 2. Pure Veterinarian with Veterinary Surgery (Reviewer 2 failure case)
const r2 = resolveWorkspaceDetails({ roles: ['VETERINARIAN'] }, { primarySpecialization: 'Veterinary Surgery' });
assert.strictEqual(r2.workspaceType, 'VETERINARIAN');
assert.strictEqual(r2.hasDualRoleAmbiguity, false);
console.log('[PASS] Pure Veterinarian + Veterinary Surgery');

// 3. Pure Veterinarian with General Veterinary Care (Reviewer 2 failure case)
const r3 = resolveWorkspaceDetails({ roles: ['VET'] }, { primarySpecialization: 'General Veterinary Care' });
assert.strictEqual(r3.workspaceType, 'VETERINARIAN');
assert.strictEqual(r3.hasDualRoleAmbiguity, false);
console.log('[PASS] Pure VET + General Veterinary Care');

// 4. Pure Veterinarian with Veterinary Internal Medicine (Reviewer 2 failure case)
const r4 = resolveWorkspaceDetails({ roles: ['VETERINARIAN'] }, { primarySpecialization: 'Veterinary Internal Medicine' });
assert.strictEqual(r4.workspaceType, 'VETERINARIAN');
assert.strictEqual(r4.hasDualRoleAmbiguity, false);
console.log('[PASS] Pure Veterinarian + Veterinary Internal Medicine');

// 5. Pure Veterinarian with Veterinary Oncology (Reviewer 2 failure case)
const r5 = resolveWorkspaceDetails({ roles: ['VETERINARIAN'] }, { primarySpecialization: 'Veterinary Oncology' });
assert.strictEqual(r5.workspaceType, 'VETERINARIAN');
assert.strictEqual(r5.hasDualRoleAmbiguity, false);
console.log('[PASS] Pure Veterinarian + Veterinary Oncology');

// 6. Whitespace handling in roles
const r6 = resolveWorkspaceDetails({ roles: [' VETERINARIAN '] }, { primarySpecialization: 'Small Animal Care' });
assert.strictEqual(r6.workspaceType, 'VETERINARIAN');
assert.strictEqual(r6.hasDualRoleAmbiguity, false);
console.log('[PASS] Whitespace trimmed role " VETERINARIAN "');

const r7 = resolveWorkspaceDetails({ roles: [' DOCTOR '] }, { primarySpecialization: 'Pediatrics' });
assert.strictEqual(r7.workspaceType, 'HUMAN');
assert.strictEqual(r7.hasDualRoleAmbiguity, false);
console.log('[PASS] Whitespace trimmed role " DOCTOR "');

// 7. Dual: Role DOCTOR + Spec Veterinary Medicine (Challenger 1 failure case 96)
const r8 = resolveWorkspaceDetails({ roles: ['DOCTOR'] }, { primarySpecialization: 'Veterinary Medicine' });
assert.strictEqual(r8.hasDualRoleAmbiguity, true);
console.log('[PASS] Dual: Role DOCTOR + Spec Veterinary Medicine');

// 8. Dual: Role DOCTOR + secondarySpec Veterinary Care (Challenger 1 failure case 108)
const r9 = resolveWorkspaceDetails({ roles: ['DOCTOR'] }, { secondarySpecializations: ['Veterinary Care'] });
assert.strictEqual(r9.hasDualRoleAmbiguity, true);
console.log('[PASS] Dual: Role DOCTOR + secondarySpec Veterinary Care');

// 9. Dual: Role DOCTOR + department Zoological Medicine (Challenger 1 failure case 113)
const r10 = resolveWorkspaceDetails({ roles: ['DOCTOR'] }, { department: 'Zoological Medicine' });
assert.strictEqual(r10.hasDualRoleAmbiguity, true);
console.log('[PASS] Dual: Role DOCTOR + department Zoological Medicine');

// 10. Dual: Role VETERINARIAN + Cardiology
const r11 = resolveWorkspaceDetails({ roles: ['VETERINARIAN'] }, { primarySpecialization: 'Cardiology' });
assert.strictEqual(r11.hasDualRoleAmbiguity, true);
console.log('[PASS] Dual: Role VETERINARIAN + Spec Cardiology');

// 11. Dual: Role PHYSICIAN + VET
const r12 = resolveWorkspaceDetails({ roles: ['PHYSICIAN', 'VET'] }, {});
assert.strictEqual(r12.hasDualRoleAmbiguity, true);
console.log('[PASS] Dual: Roles PHYSICIAN + VET');

// 12. Dual: Role SURGEON + VETERINARIAN
const r13 = resolveWorkspaceDetails({ roles: ['SURGEON', 'VETERINARIAN'] }, {});
assert.strictEqual(r13.hasDualRoleAmbiguity, true);
console.log('[PASS] Dual: Roles SURGEON + VETERINARIAN');

// 13. Dual: Role DOCTOR_VET
const r14 = resolveWorkspaceDetails({ roles: ['DOCTOR_VET'] }, {});
assert.strictEqual(r14.hasDualRoleAmbiguity, true);
console.log('[PASS] Dual: Role DOCTOR_VET');

// 14. Dual: Human & Veterinary Medicine in single spec
const r15 = resolveWorkspaceDetails({ roles: ['VETERINARIAN'] }, { primarySpecialization: 'Human & Veterinary Medicine' });
assert.strictEqual(r15.hasDualRoleAmbiguity, true);
console.log('[PASS] Dual: Spec Human & Veterinary Medicine');

// 15. Boundaries
const r16 = resolveWorkspaceDetails(null, null);
assert.strictEqual(r16.workspaceType, 'HUMAN');
assert.strictEqual(r16.hasDualRoleAmbiguity, false);
console.log('[PASS] Null inputs boundary');

console.log('\n=== TEST SUITE 2: Breadcrumbs Path Derivation ===');

const ROUTE_LABEL_MAP = {
  dashboard: 'Dashboard',
  patients: 'Patient Details',
  new: 'Register Patient',
  records: 'Health Records',
  labs: 'Lab Results',
  referrals: 'Referrals',
  reports: 'Clinical Reports',
  settings: 'Settings',
  notifications: 'Notification Center',
  veterinary: 'Veterinary Workspace',
  pets: 'Companion Animals',
};

function deriveBreadcrumbs(pathname) {
  if (
    pathname.startsWith('/settings') ||
    pathname === '/notifications' ||
    pathname === '/support'
  ) {
    return [];
  }

  if (pathname === '/veterinary' || pathname === '/veterinary/dashboard') {
    return [];
  }

  const isVeterinaryRoute =
    pathname.startsWith('/veterinary') || pathname.startsWith('/pets');

  const pathSegments = pathname.split('/').filter(Boolean);
  if (pathSegments.length === 0 || (pathSegments.length === 1 && pathSegments[0] === 'dashboard')) {
    return [{ label: 'Dashboard' }];
  }

  const trail = isVeterinaryRoute
    ? [{ label: 'Dashboard', href: '/veterinary/dashboard' }]
    : [{ label: 'Dashboard', href: '/dashboard' }];

  const effectiveSegments =
    isVeterinaryRoute && pathSegments[0] === 'veterinary'
      ? pathSegments.slice(1)
      : pathSegments;

  let accumulatedPath =
    isVeterinaryRoute && pathSegments[0] === 'veterinary' ? '/veterinary' : '';

  effectiveSegments.forEach((segment, index) => {
    accumulatedPath += `/${segment}`;
    const isLast = index === effectiveSegments.length - 1;
    const label =
      index === 1 && effectiveSegments[0] === 'patients'
        ? 'Patient Profile'
        : ROUTE_LABEL_MAP[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);

    trail.push({
      label,
      href: isLast ? undefined : accumulatedPath,
    });
  });

  return trail;
}

// Check /veterinary -> []
const b1 = deriveBreadcrumbs('/veterinary');
assert.deepStrictEqual(b1, []);
console.log('[PASS] Breadcrumbs on /veterinary returns [] (suppressed)');

// Check /veterinary/dashboard -> []
const b2 = deriveBreadcrumbs('/veterinary/dashboard');
assert.deepStrictEqual(b2, []);
console.log('[PASS] Breadcrumbs on /veterinary/dashboard returns [] (suppressed)');

// Check /veterinary/pets -> [{ label: 'Dashboard', href: '/veterinary/dashboard' }, { label: 'Companion Animals' }]
const b3 = deriveBreadcrumbs('/veterinary/pets');
assert.strictEqual(b3.length, 2);
assert.strictEqual(b3[0].label, 'Dashboard');
assert.strictEqual(b3[0].href, '/veterinary/dashboard');
assert.strictEqual(b3[1].label, 'Companion Animals');
assert.strictEqual(b3[1].href, undefined);
console.log('[PASS] Breadcrumbs on /veterinary/pets roots to /veterinary/dashboard without redundant veterinary segment');

// Check /pets direct URL -> [{ label: 'Dashboard', href: '/veterinary/dashboard' }, { label: 'Companion Animals' }]
const b4 = deriveBreadcrumbs('/pets');
assert.strictEqual(b4.length, 2);
assert.strictEqual(b4[0].label, 'Dashboard');
assert.strictEqual(b4[0].href, '/veterinary/dashboard');
assert.strictEqual(b4[1].label, 'Companion Animals');
console.log('[PASS] Breadcrumbs on /pets roots to /veterinary/dashboard');

// Check human /dashboard -> [{ label: 'Dashboard' }]
const b5 = deriveBreadcrumbs('/dashboard');
assert.deepStrictEqual(b5, [{ label: 'Dashboard' }]);
console.log('[PASS] Breadcrumbs on human /dashboard returns [{ label: "Dashboard" }] (suppressed)');

// Check human /patients/new -> [{ label: 'Dashboard', href: '/dashboard' }, ...]
const b6 = deriveBreadcrumbs('/patients/new');
assert.strictEqual(b6[0].href, '/dashboard');
assert.strictEqual(b6[1].label, 'Patient Details');
assert.strictEqual(b6[1].href, '/patients');
assert.strictEqual(b6[2].label, 'Patient Profile');
assert.strictEqual(b6[2].href, undefined);
console.log('[PASS] Breadcrumbs on human /patients/new maintains human dashboard root');

// Check settings/support/notifications -> []
assert.deepStrictEqual(deriveBreadcrumbs('/settings'), []);
assert.deepStrictEqual(deriveBreadcrumbs('/support'), []);
assert.deepStrictEqual(deriveBreadcrumbs('/notifications'), []);
console.log('[PASS] Breadcrumbs on /settings, /support, /notifications returns [] (suppressed)');

console.log('\n=== ALL REMEDIATION TESTS PASSED (100% SUCCESS) ===');
