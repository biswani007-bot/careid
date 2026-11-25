const http = require('http');

async function request(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function login(identifier, password) {
  const res = await request(
    {
      hostname: 'localhost',
      port: 3001,
      path: '/api/v1/auth/password/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { identifier, password }
  );
  if (res.status !== 200 && res.status !== 201) {
    throw new Error(`Login failed for ${identifier}: ${JSON.stringify(res.data)}`);
  }
  return {
    token: res.data.data?.accessToken || res.data.data?.tokens?.accessToken,
    user: res.data.data?.user,
  };
}

async function main() {
  console.log('=== CareID Goal 014 Milestone 1 Live API Verification ===\n');

  // 1. Authenticate Admin and Doctor
  console.log('1. Authenticating Admin and Doctor...');
  const admin = await login('admin@careid.test', 'NewSecureAdminPassword123!');
  console.log('✓ Admin authenticated:', admin.user.email, 'Roles:', admin.user.roles);

  const doctor = await login('dr.smith@careid.com', 'Password123!');
  console.log('✓ Doctor authenticated:', doctor.user.email, 'Roles:', doctor.user.roles);

  // 2. Test GET /api/v1/clinical-practice-types with Doctor token
  console.log('\n2. Testing GET /api/v1/clinical-practice-types with Doctor token...');
  const docPublicRes = await request({
    hostname: 'localhost',
    port: 3001,
    path: '/api/v1/clinical-practice-types',
    method: 'GET',
    headers: { Authorization: `Bearer ${doctor.token}` },
  });
  console.log(`Status: ${docPublicRes.status}`);
  if (docPublicRes.status === 200 && Array.isArray(docPublicRes.data.data)) {
    console.log(`✓ Success: Retrieved ${docPublicRes.data.data.length} practice types:`);
    docPublicRes.data.data.forEach((pt) => {
      console.log(`   - [${pt.code}] ${pt.displayName} (status: ${pt.status}, canonical: ${pt.isCanonical})`);
    });
  } else {
    console.error('✗ Failed doctor public access:', docPublicRes.data);
    process.exit(1);
  }

  // 3. Test GET /api/v1/clinical-practice-types with Admin token
  console.log('\n3. Testing GET /api/v1/clinical-practice-types with Admin token...');
  const adminPublicRes = await request({
    hostname: 'localhost',
    port: 3001,
    path: '/api/v1/clinical-practice-types',
    method: 'GET',
    headers: { Authorization: `Bearer ${admin.token}` },
  });
  console.log(`Status: ${adminPublicRes.status}`);
  if (adminPublicRes.status === 200) {
    console.log(`✓ Success: Admin can also access dropdown API (${adminPublicRes.data.data.length} types)`);
  } else {
    console.error('✗ Failed admin public access:', adminPublicRes.data);
    process.exit(1);
  }

  // 4. Test RBAC: Doctor attempting Admin endpoint GET /api/v1/admin/clinical-practice-types
  console.log('\n4. Testing RBAC: Doctor attempting GET /api/v1/admin/clinical-practice-types...');
  const docAdminRes = await request({
    hostname: 'localhost',
    port: 3001,
    path: '/api/v1/admin/clinical-practice-types',
    method: 'GET',
    headers: { Authorization: `Bearer ${doctor.token}` },
  });
  console.log(`Status: ${docAdminRes.status}`);
  if (docAdminRes.status === 403) {
    console.log('✓ Success: Doctor correctly rejected with 403 Forbidden from admin endpoints');
  } else {
    console.error('✗ Failed RBAC check! Expected 403 but got:', docAdminRes.status, docAdminRes.data);
    process.exit(1);
  }

  // 5. Test Admin CRUD: List all with _count
  console.log('\n5. Testing Admin GET /api/v1/admin/clinical-practice-types with usage counts...');
  const adminListRes = await request({
    hostname: 'localhost',
    port: 3001,
    path: '/api/v1/admin/clinical-practice-types',
    method: 'GET',
    headers: { Authorization: `Bearer ${admin.token}` },
  });
  console.log(`Status: ${adminListRes.status}`);
  if (adminListRes.status === 200 && Array.isArray(adminListRes.data.data)) {
    console.log('✓ Success: Admin retrieved practice types with counts:');
    adminListRes.data.data.forEach((pt) => {
      console.log(
        `   - [${pt.code}] ${pt.displayName} -> Doctors: ${pt._count?.doctors ?? 'N/A'}, Specialties: ${pt._count?.specialties ?? 'N/A'}`
      );
    });
  } else {
    console.error('✗ Failed admin list:', adminListRes.data);
    process.exit(1);
  }

  // 6. Test Canonical Protection: Reject deactivation and deletion of canonical codes
  console.log('\n6. Testing Canonical Protection Rules...');
  const humanPt = adminListRes.data.data.find((pt) => pt.code === 'HUMAN_HEALTHCARE');
  if (!humanPt) throw new Error('HUMAN_HEALTHCARE not found');

  // 6a. Try to deactivate canonical type
  const deactRes = await request(
    {
      hostname: 'localhost',
      port: 3001,
      path: `/api/v1/admin/clinical-practice-types/${humanPt.id}/status`,
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${admin.token}`,
        'Content-Type': 'application/json',
      },
    },
    { status: 'INACTIVE' }
  );
  console.log(`Deactivate canonical status: ${deactRes.status}`);
  if (deactRes.status === 400) {
    console.log('✓ Success: Deactivating canonical practice type rejected (400 Bad Request):', deactRes.data.message);
  } else {
    console.error('✗ Failed canonical deactivation check! Expected 400 but got:', deactRes.status);
    process.exit(1);
  }

  // 6b. Try to delete canonical type
  const delCanonicalRes = await request({
    hostname: 'localhost',
    port: 3001,
    path: `/api/v1/admin/clinical-practice-types/${humanPt.id}`,
    method: 'DELETE',
    headers: { Authorization: `Bearer ${admin.token}` },
  });
  console.log(`Delete canonical status: ${delCanonicalRes.status}`);
  if (delCanonicalRes.status === 400) {
    console.log('✓ Success: Deleting canonical practice type rejected (400 Bad Request):', delCanonicalRes.data.message);
  } else {
    console.error('✗ Failed canonical deletion check! Expected 400 but got:', delCanonicalRes.status);
    process.exit(1);
  }

  // 6c. Try to delete an in-use practice type (should return 409 Conflict)
  console.log('\n6c. Testing In-Use Practice Type Deletion Rejection (409 Conflict)...');
  const inUsePt = adminListRes.data.data.find((pt) => pt._count?.doctors > 0 && !pt.isCanonical);
  if (inUsePt) {
    const delInUseRes = await request({
      hostname: 'localhost',
      port: 3001,
      path: `/api/v1/admin/clinical-practice-types/${inUsePt.id}`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${admin.token}` },
    });
    console.log(`Delete in-use status: ${delInUseRes.status}`);
    if (delInUseRes.status === 409) {
      console.log('✓ Success: In-use practice type deletion rejected (409 Conflict):', delInUseRes.data.message);
    } else {
      console.error('✗ Failed in-use deletion check! Expected 409 but got:', delInUseRes.status, delInUseRes.data);
      process.exit(1);
    }
  } else {
    console.log('Notice: No non-canonical in-use practice type found to test 409 deletion rejection.');
  }
  console.log('\n7. Testing Admin CRUD: Create, Update, Status toggle, and Delete Custom Type...');
  const testCode = `TEST_CLINICAL_${Date.now()}`;
  const createRes = await request(
    {
      hostname: 'localhost',
      port: 3001,
      path: '/api/v1/admin/clinical-practice-types',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${admin.token}`,
        'Content-Type': 'application/json',
      },
    },
    {
      code: testCode,
      displayName: 'Test Clinical Specialty',
      description: 'Temporary clinical practice type for verification',
      clinicalAuthorizationMapping: 'UNMAPPED',
    }
  );
  console.log(`Create status: ${createRes.status}`);
  if (createRes.status !== 201 && createRes.status !== 200) {
    console.error('✗ Failed creation:', createRes.data);
    process.exit(1);
  }
  const createdPt = createRes.data.data;
  console.log(`✓ Success: Created custom practice type ID: ${createdPt.id}, Code: ${createdPt.code}`);

  // 7b. Update custom type
  const updateRes = await request(
    {
      hostname: 'localhost',
      port: 3001,
      path: `/api/v1/admin/clinical-practice-types/${createdPt.id}`,
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${admin.token}`,
        'Content-Type': 'application/json',
      },
    },
    {
      displayName: 'Test Clinical Specialty Updated',
      description: 'Updated description',
    }
  );
  console.log(`Update status: ${updateRes.status}`);
  if (updateRes.status === 200 && updateRes.data.data.displayName === 'Test Clinical Specialty Updated') {
    console.log('✓ Success: Updated display name and description');
  } else {
    console.error('✗ Failed update:', updateRes.data);
    process.exit(1);
  }

  // 7c. Toggle status of custom type
  const statusRes = await request(
    {
      hostname: 'localhost',
      port: 3001,
      path: `/api/v1/admin/clinical-practice-types/${createdPt.id}/status`,
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${admin.token}`,
        'Content-Type': 'application/json',
      },
    },
    { status: 'INACTIVE' }
  );
  console.log(`Toggle status: ${statusRes.status}`);
  if (statusRes.status === 200 && statusRes.data.data.status === 'INACTIVE') {
    console.log('✓ Success: Inactivated custom practice type');
  } else {
    console.error('✗ Failed status toggle:', statusRes.data);
    process.exit(1);
  }

  // 7d. Delete custom type
  const deleteRes = await request({
    hostname: 'localhost',
    port: 3001,
    path: `/api/v1/admin/clinical-practice-types/${createdPt.id}`,
    method: 'DELETE',
    headers: { Authorization: `Bearer ${admin.token}` },
  });
  console.log(`Delete status: ${deleteRes.status}`);
  if (deleteRes.status === 200) {
    console.log('✓ Success: Deleted custom unused practice type');
  } else {
    console.error('✗ Failed delete:', deleteRes.data);
    process.exit(1);
  }

  // 8. Test Doctor Self-Edit Lockdown
  console.log('\n8. Testing Doctor Self-Edit Scope Lockdown...');
  // Doctor attempts to alter their clinical practice type
  const docProfileRes = await request({
    hostname: 'localhost',
    port: 3001,
    path: '/api/v1/doctors/me',
    method: 'GET',
    headers: { Authorization: `Bearer ${doctor.token}` },
  });
  if (docProfileRes.status === 200 && docProfileRes.data.data) {
    const docProfileId = docProfileRes.data.data.id;
    const hackRes = await request(
      {
        hostname: 'localhost',
        port: 3001,
        path: `/api/v1/doctors/${docProfileId}`,
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${doctor.token}`,
          'Content-Type': 'application/json',
        },
      },
      {
        clinicalPracticeType: 'VETERINARY_MEDICINE',
      }
    );
    console.log(`Doctor self-edit status: ${hackRes.status}`);
    if (hackRes.status === 403) {
      console.log('✓ Success: Clinician self-modification of clinical practice type rejected (403 Forbidden):', hackRes.data.message);
    } else {
      console.error('✗ Failed doctor self-edit lockdown! Expected 403 but got:', hackRes.status, hackRes.data);
      process.exit(1);
    }
  } else {
    console.warn('! Could not fetch dr.smith profile for self-edit test, status:', docProfileRes.status);
  }

  // 9. Test In-Use Specialty Compatibility Check in Admin Doctor Creation
  console.log('\n9. Testing Database-Backed Specialty Compatibility Check...');
  const incompatibleDoctorPayload = {
    email: `vet.incompatible.${Date.now()}@careid.com`,
    phone: `+1650555${Math.floor(1000 + Math.random() * 9000)}`,
    password: 'Password123!',
    firstName: 'Incompatible',
    lastName: 'Doctor',
    role: 'DOCTOR',
    primarySpecialization: 'Cardiology', // Human specialty!
    clinicalPracticeType: 'VETERINARY_MEDICINE', // Veterinary practice type!
    medicalCouncil: 'State Veterinary Council',
    registrationNumber: `VET-REG-${Date.now()}`,
    licenseNumber: `VET-LIC-${Date.now()}`,
    yearsOfExperience: 5,
  };

  const compatRes = await request(
    {
      hostname: 'localhost',
      port: 3001,
      path: '/api/v1/admin/users',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${admin.token}`,
        'Content-Type': 'application/json',
      },
    },
    incompatibleDoctorPayload
  );
  console.log(`Specialty compatibility rejection status: ${compatRes.status}`);
  if (compatRes.status === 400) {
    console.log('✓ Success: Incompatible specialty and clinical practice type rejected (400 Bad Request):', compatRes.data.message);
  } else {
    console.error('✗ Failed specialty compatibility check! Expected 400 but got:', compatRes.status, compatRes.data);
    process.exit(1);
  }

  console.log('\n=== ALL MILESTONE 1 VERIFICATION CHECKS PASSED SUCCESSFULLY! ===\n');
}

main().catch((err) => {
  console.error('Fatal error during verification:', err);
  process.exit(1);
});
