const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { getAdminToken } = require('./token_helper.cjs');

const ARTIFACT_DIR = path.resolve('C:/Users/biswa/.gemini/antigravity/brain/e0785a94-53fe-4f28-b816-f2efe4edf49e');
const BASE_URL = 'https://360api.vnvision.in/api/v1';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runPhase4Tests() {
  console.log('====================================================');
  console.log('CAREID — DOCTOR REGISTRATION 409 CONFLICT PHASE 4 RUNTIME TESTS');
  console.log('====================================================\n');

  const adminToken = await getAdminToken();
  console.log('1. Admin Token acquired:', adminToken.slice(0, 25) + '...');

  const results = {
    case1: null,
    case2: null,
    case3: null,
    case4: null,
    case5: null,
    case6: null,
    uiSuccess: null
  };

  const ts = Date.now().toString().slice(-6);

  // ----------------------------------------------------
  // CASE 1: Doctor A (Unique Details)
  // ----------------------------------------------------
  console.log('\n--- CASE 1: Register Doctor A (Unique Registration & License) ---');
  const docA = {
    email: `dr.alice.${ts}@careid.test`,
    phone: `+165011${ts.slice(-4)}`,
    password: 'TestPassword123!',
    role: 'DOCTOR',
    status: 'ACTIVE',
    fullName: `Dr. Alice Smith ${ts}`,
    primarySpecialization: 'Cardiology',
    secondarySpecializations: ['Interventional Cardiology'],
    medicalCouncil: 'State Medical Board',
    registrationNumber: `MED-REG-A-${ts}`,
    licenseNumber: `LIC-A-${ts}`,
    gender: 'FEMALE',
    dateOfBirth: '1982-03-15T00:00:00.000Z',
    yearsOfExperience: 12,
    department: 'Cardiology'
  };

  const resA = await fetch(`${BASE_URL}/admin/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify(docA)
  });
  const dataA = await resA.json();
  console.log(`Doctor A HTTP Status: ${resA.status}`);
  console.log('Doctor A Response:', JSON.stringify(dataA, null, 2));

  if (resA.status === 201 && dataA.data?.doctorProfileId) {
    results.case1 = {
      status: resA.status,
      userId: dataA.data.id,
      doctorProfileId: dataA.data.doctorProfileId,
      fullName: dataA.data.fullName,
      registrationNumber: docA.registrationNumber,
      licenseNumber: docA.licenseNumber,
      providerIdentifier: dataA.data.doctorProfile?.providerIdentifier
    };
    console.log('✓ CASE 1 PASSED: Doctor A created successfully.');
  } else {
    results.case1 = { status: resA.status, error: dataA };
    console.error('✗ CASE 1 FAILED:', dataA);
  }

  // ----------------------------------------------------
  // CASE 2: Doctor B (Unique Details)
  // ----------------------------------------------------
  console.log('\n--- CASE 2: Register Doctor B (Different email, mobile, reg, license) ---');
  const docB = {
    email: `dr.bob.${ts}@careid.test`,
    phone: `+165022${ts.slice(-4)}`,
    password: 'TestPassword123!',
    role: 'DOCTOR',
    status: 'ACTIVE',
    fullName: `Dr. Bob Jones ${ts}`,
    primarySpecialization: 'Neurology',
    secondarySpecializations: ['Neurocritical Care'],
    medicalCouncil: 'General Medical Council',
    registrationNumber: `MED-REG-B-${ts}`,
    licenseNumber: `LIC-B-${ts}`,
    gender: 'MALE',
    dateOfBirth: '1979-08-22T00:00:00.000Z',
    yearsOfExperience: 16,
    department: 'Neurology'
  };

  const resB = await fetch(`${BASE_URL}/admin/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify(docB)
  });
  const dataB = await resB.json();
  console.log(`Doctor B HTTP Status: ${resB.status}`);

  if (resB.status === 201 && dataB.data?.doctorProfileId) {
    results.case2 = {
      status: resB.status,
      userId: dataB.data.id,
      doctorProfileId: dataB.data.doctorProfileId,
      fullName: dataB.data.fullName,
      registrationNumber: docB.registrationNumber,
      licenseNumber: docB.licenseNumber
    };
    console.log('✓ CASE 2 PASSED: Doctor B created successfully.');
  } else {
    results.case2 = { status: resB.status, error: dataB };
    console.error('✗ CASE 2 FAILED:', dataB);
  }

  // ----------------------------------------------------
  // CASE 3: Doctor C (Unique Details)
  // ----------------------------------------------------
  console.log('\n--- CASE 3: Register Doctor C (Another set of unique details) ---');
  const docC = {
    email: `dr.clara.${ts}@careid.test`,
    phone: `+165033${ts.slice(-4)}`,
    password: 'TestPassword123!',
    role: 'DOCTOR',
    status: 'ACTIVE',
    fullName: `Dr. Clara Oswald ${ts}`,
    primarySpecialization: 'Pediatrics',
    secondarySpecializations: ['Neonatology'],
    medicalCouncil: 'State Medical Board',
    registrationNumber: `MED-REG-C-${ts}`,
    licenseNumber: `LIC-C-${ts}`,
    gender: 'FEMALE',
    dateOfBirth: '1986-11-05T00:00:00.000Z',
    yearsOfExperience: 9,
    department: 'Pediatrics'
  };

  const resC = await fetch(`${BASE_URL}/admin/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify(docC)
  });
  const dataC = await resC.json();
  console.log(`Doctor C HTTP Status: ${resC.status}`);

  if (resC.status === 201 && dataC.data?.doctorProfileId) {
    results.case3 = {
      status: resC.status,
      userId: dataC.data.id,
      doctorProfileId: dataC.data.doctorProfileId,
      fullName: dataC.data.fullName,
      registrationNumber: docC.registrationNumber,
      licenseNumber: docC.licenseNumber
    };
    console.log('✓ CASE 3 PASSED: Doctor C created successfully.');
  } else {
    results.case3 = { status: resC.status, error: dataC };
    console.error('✗ CASE 3 FAILED:', dataC);
  }

  // ----------------------------------------------------
  // CASE 4: Duplicate License Number Conflict
  // ----------------------------------------------------
  console.log('\n--- CASE 4: Register Duplicate License Number (Attempt using Doctor A license) ---');
  const docDupLic = {
    email: `dr.duplic.${ts}@careid.test`,
    phone: `+165044${ts.slice(-4)}`,
    password: 'TestPassword123!',
    role: 'DOCTOR',
    status: 'ACTIVE',
    fullName: `Dr. Duplicate License ${ts}`,
    primarySpecialization: 'Cardiology',
    medicalCouncil: 'State Medical Board',
    registrationNumber: `MED-REG-NEW-${ts}`,
    licenseNumber: docA.licenseNumber, // DUPLICATE!
    gender: 'MALE',
    dateOfBirth: '1980-01-01T00:00:00.000Z',
    yearsOfExperience: 5,
    department: 'Cardiology'
  };

  const resDupLic = await fetch(`${BASE_URL}/admin/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify(docDupLic)
  });
  const dataDupLic = await resDupLic.json();
  console.log(`Duplicate License HTTP Status: ${resDupLic.status}`);
  console.log('Duplicate License Response Body:', JSON.stringify(dataDupLic, null, 2));

  if (resDupLic.status === 409 && dataDupLic.message?.includes('license')) {
    results.case4 = {
      status: resDupLic.status,
      errorCode: dataDupLic.error,
      errorMessage: dataDupLic.message,
      conflictField: 'licenseNumber'
    };
    console.log('✓ CASE 4 PASSED: HTTP 409 Conflict correctly caught for duplicate licenseNumber.');
  } else {
    results.case4 = { status: resDupLic.status, response: dataDupLic };
    console.error('✗ CASE 4 FAILED: Expected 409 Conflict for duplicate licenseNumber');
  }

  // ----------------------------------------------------
  // CASE 5: Duplicate Registration Number Conflict
  // ----------------------------------------------------
  console.log('\n--- CASE 5: Register Duplicate Registration Number (Attempt using Doctor A registration) ---');
  const docDupReg = {
    email: `dr.dupreg.${ts}@careid.test`,
    phone: `+165055${ts.slice(-4)}`,
    password: 'TestPassword123!',
    role: 'DOCTOR',
    status: 'ACTIVE',
    fullName: `Dr. Duplicate Reg ${ts}`,
    primarySpecialization: 'Cardiology',
    medicalCouncil: 'State Medical Board',
    registrationNumber: docA.registrationNumber, // DUPLICATE!
    licenseNumber: `LIC-NEW-${ts}`,
    gender: 'MALE',
    dateOfBirth: '1980-01-01T00:00:00.000Z',
    yearsOfExperience: 5,
    department: 'Cardiology'
  };

  const resDupReg = await fetch(`${BASE_URL}/admin/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify(docDupReg)
  });
  const dataDupReg = await resDupReg.json();
  console.log(`Duplicate Reg HTTP Status: ${resDupReg.status}`);
  console.log('Duplicate Reg Response Body:', JSON.stringify(dataDupReg, null, 2));

  if (resDupReg.status === 409 && dataDupReg.message?.includes('registration number')) {
    results.case5 = {
      status: resDupReg.status,
      errorCode: dataDupReg.error,
      errorMessage: dataDupReg.message,
      conflictField: 'registrationNumber'
    };
    console.log('✓ CASE 5 PASSED: HTTP 409 Conflict correctly caught for duplicate registrationNumber.');
  } else {
    results.case5 = { status: resDupReg.status, response: dataDupReg };
    console.error('✗ CASE 5 FAILED: Expected 409 Conflict for duplicate registrationNumber');
  }

  // ----------------------------------------------------
  // CASE 6 & UI VERIFICATION (Puppeteer)
  // ----------------------------------------------------
  console.log('\n--- CASE 6 & PUPPETEER UI TESTS: End-to-End Form, Double-Click & Conflict Handling ---');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    // Inject token before navigation
    await page.goto('http://localhost:5174/admin/doctors', { waitUntil: 'networkidle2' });
    await page.evaluate((token) => {
      localStorage.setItem('careid_access_token', token);
      localStorage.setItem('auth_token', token);
      localStorage.setItem('access_token', token);
      localStorage.setItem('careid_user_session', JSON.stringify({
        id: '554f1941-f337-4a98-a8b6-d4409e1cfa04',
        email: 'admin@careid.test',
        roles: ['ADMIN'],
        permissions: ['read:all', 'write:all']
      }));
    }, adminToken);

    // Navigate to Add Doctor page
    console.log('Navigating to http://localhost:5174/admin/doctors/create...');
    await page.goto('http://localhost:5174/admin/doctors/create', { waitUntil: 'networkidle2' });
    await sleep(1500);

    // Helper function to fill form
    async function fillDoctorForm(formData) {
      await page.evaluate((data) => {
        const setVal = (selector, val) => {
          const el = document.querySelector(selector);
          if (el) {
            const proto = el.tagName === 'SELECT' ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype;
            const desc = Object.getOwnPropertyDescriptor(proto, 'value');
            if (desc && desc.set) {
              desc.set.call(el, val);
            } else {
              el.value = val;
            }
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          }
        };

        setVal('#firstName', data.firstName);
        setVal('#lastName', data.lastName);
        setVal('#gender', data.gender);
        setVal('#dob', data.dob);
        setVal('#license', data.license);
        setVal('#issuingBody', data.issuingBody);
        setVal('#licenseExpiry', data.licenseExpiry);
        setVal('#experienceYears', data.experienceYears);
        setVal('#specialty', data.specialty);
        setVal('#hospital', data.hospital);
        setVal('#department', data.department);
        setVal('#officeNumber', data.officeNumber);
        setVal('#email', data.email);
        setVal('#phone', data.phone);
      }, formData);
    }

    const testUiDoc = {
      firstName: 'David',
      lastName: `Miller ${ts}`,
      gender: 'Male',
      dob: '1984-07-19',
      license: `MD-${ts}`,
      issuingBody: 'State Medical Board',
      licenseExpiry: '2029-12-31',
      experienceYears: '11',
      specialty: 'Cardiology',
      hospital: '40376382-5d29-4cde-9c6f-912319241022',
      department: 'Cardiology',
      officeNumber: 'Ste-402',
      email: `dr.david.${ts}@careid.test`,
      phone: `+165066${ts.slice(-4)}`
    };

    // First fill with duplicate license to test UI conflict feedback
    console.log('Testing UI feedback for duplicate license conflict...');
    await fillDoctorForm({
      ...testUiDoc,
      license: docA.licenseNumber // Use Doctor A's license
    });

    const shot1Path = path.join(ARTIFACT_DIR, 'doctor_409_fix_01_form_filled.png');
    await page.screenshot({ path: shot1Path });
    console.log(`Saved screenshot 1: ${shot1Path}`);

    // Click submit and observe error snackbar
    await page.click('button[type="submit"]');
    await sleep(2000);

    const snackbarText1 = await page.evaluate(() => {
      const el = document.querySelector('.user-action-snackbar, .action-success-snackbar, [role="alert"]');
      return el ? el.textContent : null;
    });
    console.log('UI Snackbar response for duplicate license:', snackbarText1);

    const shot2Path = path.join(ARTIFACT_DIR, 'doctor_409_fix_02_duplicate_license_conflict.png');
    await page.screenshot({ path: shot2Path });
    console.log(`Saved screenshot 2: ${shot2Path}`);

    // Now test Case 6: Double-click submission protection
    console.log('\n--- Testing Case 6: Double-click Submission Protection ---');
    // Monitor outgoing requests to /admin/users
    let adminUsersPostCount = 0;
    page.on('request', req => {
      if (req.method() === 'POST' && req.url().includes('/admin/users')) {
        adminUsersPostCount++;
        console.log(`[Network Monitor] Intercepted POST /admin/users request #${adminUsersPostCount}`);
      }
    });

    // Fill with genuine fresh unique details
    const uniqueUiDoc = {
      ...testUiDoc,
      license: `LIC-UI-${ts}`,
      email: `dr.uniqueui.${ts}@careid.test`,
      phone: `+165077${ts.slice(-4)}`
    };
    await fillDoctorForm(uniqueUiDoc);
    await sleep(500);

    // Rapid double-click on submit button
    console.log('Executing rapid double-click on Register Doctor button...');
    await page.evaluate(() => {
      const btn = document.querySelector('button[type="submit"]');
      if (btn) {
        btn.click();
        btn.click();
      }
    });

    await sleep(2500);
    console.log(`Total POST /admin/users requests fired during double-click: ${adminUsersPostCount}`);

    if (adminUsersPostCount === 1) {
      results.case6 = { passed: true, requestsFired: adminUsersPostCount };
      console.log('✓ CASE 6 PASSED: Double-click protection active. Exactly 1 network request fired.');
    } else {
      results.case6 = { passed: false, requestsFired: adminUsersPostCount };
      console.warn(`Case 6 Notice: Requests fired = ${adminUsersPostCount}`);
    }

    const shot4Path = path.join(ARTIFACT_DIR, 'doctor_409_fix_04_success_registered.png');
    await page.screenshot({ path: shot4Path });
    console.log(`Saved screenshot 4: ${shot4Path}`);

    // Wait for auto-navigation to /admin/doctors
    await sleep(2000);
    const currentUrl = page.url();
    console.log('Current page URL after registration:', currentUrl);

    if (!currentUrl.includes('/admin/doctors')) {
      await page.goto('http://localhost:5174/admin/doctors', { waitUntil: 'networkidle2' });
      await sleep(2000);
    }

    const shot5Path = path.join(ARTIFACT_DIR, 'doctor_409_fix_05_directory_verified.png');
    await page.screenshot({ path: shot5Path });
    console.log(`Saved screenshot 5: ${shot5Path}`);

    // Check if new doctor appears in the table
    const tableText = await page.evaluate(() => document.body.innerText);
    const doctorFoundInTable = tableText.includes(`Dr. David Miller ${ts}`) || tableText.includes(`LIC-UI-${ts}`);
    console.log(`Doctor found in directory table: ${doctorFoundInTable}`);

    results.uiSuccess = {
      registeredName: `Dr. David Miller ${ts}`,
      license: `LIC-UI-${ts}`,
      foundInTable: doctorFoundInTable
    };

  } finally {
    await browser.close();
  }

  // Final Results Output
  console.log('\n====================================================');
  console.log('PHASE 4 TEST EXECUTION SUMMARY:');
  console.log('====================================================');
  console.log(JSON.stringify(results, null, 2));

  fs.writeFileSync('scratch/phase4_test_results.json', JSON.stringify(results, null, 2));
}

runPhase4Tests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});

