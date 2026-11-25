with open('scripts/generate-careid-postman.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update DocumentBuilder title and description
old_doc_builder = """  const config = new DocumentBuilder()
    .setTitle('CareID Enterprise API — Staging Integration Collection')
    .setDescription(
      'Official CareID / Health Vault 360 centralized clinical, identity, compliance, and governance platform backend API'
    )
    .setVersion('1.0.0')"""

new_doc_builder = """  const config = new DocumentBuilder()
    .setTitle('CareID Enterprise API — Consolidated Staging Integration Collection')
    .setDescription(
      'Official CareID / Health Vault 360 centralized clinical, identity, compliance, and governance platform backend API (Phase 12 Consolidated Release — November 16, 2026)'
    )
    .setVersion('1.2.2')"""

assert old_doc_builder in content, "old_doc_builder not found"
content = content.replace(old_doc_builder, new_doc_builder)

# 2. Add folder descriptions for 28-36
old_folder_desc = """    '27. Healthcare Financing & Financial Assistance':
      'Medical financing, partner EMI schemes, pre-approved loan offers, credit applications, and underwriting status workflow. Backed by PostgreSQL persistence (financing_applications & financing_history) with AES-256-GCM field-level encryption.',
  };"""

new_folder_desc = """    '27. Healthcare Financing & Financial Assistance':
      'Medical financing, partner EMI schemes, pre-approved loan offers, credit applications, and underwriting status workflow. Backed by PostgreSQL persistence (financing_applications & financing_history) with AES-256-GCM field-level encryption.',
    '28. CPT Clinical Procedure Catalogue':
      'Current Procedural Terminology (CPT) clinical procedure catalog: procedure search with fuzzy matching (/cpt/search?q=...), category filtering, and code details (/cpt/:code). Protected by JWT authentication.',
    '29. Cath Lab & Interventional Cardiology':
      'Cardiac catheterization and interventional cardiology subsystem: pre-procedure safety timeout (/cath-lab/safety-timeout/:id), safety hold clearances, vessel anatomical findings, and DICOM cine angiogram series retrieval.',
    '30. Dental Records (Clinical Subsystem)':
      'Comprehensive dental health records for Doctor and Patient applications: odontogram chartings, dental procedures, periodontal findings, and record lifecycle management.',
    '31. Vision & Optometry Records':
      'Vision, ophthalmology, and optometric clinical records: subjective/objective refraction (SPH, CYL, AXIS), visual acuity, intraocular pressure (IOP), and corrective lens prescriptions.',
    '32. Diagnostic Laboratory Results':
      'Clinical pathology and diagnostic lab results: structured diagnostic panels, reference ranges, specimen metadata, abnormal auto-flagging, and doctor sign-off.',
    '33. Prescriptions & Drug Interactions':
      'Comprehensive pharmaceutical management: e-prescribing, drug-drug and drug-allergy interaction screening (/prescriptions/check-interactions), digital Rx certificates, refills, and discontinuations.',
    '34. Patient-Doctor Secure Messaging':
      'HIPAA-compliant doctor-patient clinical messaging: threaded conversations, unread counters, attachments, and read receipts.',
    '35. Public Clinical Record Sharing':
      'Secure patient-authorized cryptographic clinical record sharing: time-bound share links, revocable access tokens, and public grantee record view (/shares/:shareToken).',
    '36. Treatment Proposals & Pre-Clearance':
      'Formal clinical treatment offers: multi-specialty proposals, clinical clearances, pre-authorization attestation, discounts, and patient digital ratification/acceptance certificates.',
  };"""

assert old_folder_desc in content, "old_folder_desc not found"
content = content.replace(old_folder_desc, new_folder_desc)

# 3. Add mapping for 11 clinical tags to folderMapping
old_mapping = """    'Pet Health Records': '26. Pet Health Records',
    'Financing & Financial Assistance': '27. Healthcare Financing & Financial Assistance',
  };"""

new_mapping = """    'Pet Health Records': '26. Pet Health Records',
    'Doctor - Pet Clinical Records': '26. Pet Health Records',
    'Financing & Financial Assistance': '27. Healthcare Financing & Financial Assistance',
    'CPT Catalogue': '28. CPT Clinical Procedure Catalogue',
    'Cath Lab & Interventional Cardiology': '29. Cath Lab & Interventional Cardiology',
    'Dental Records (Doctor App)': '30. Dental Records (Clinical Subsystem)',
    'Vision Records (Doctor App)': '31. Vision & Optometry Records',
    'Laboratory Results (Doctor App)': '32. Diagnostic Laboratory Results',
    'Prescriptions': '33. Prescriptions & Drug Interactions',
    'Prescriptions & Drug Interactions (Doctor App)': '33. Prescriptions & Drug Interactions',
    'Patient-Doctor Messaging Inbox (Doctor App)': '34. Patient-Doctor Secure Messaging',
    'Public Record Share': '35. Public Clinical Record Sharing',
    'Treatment Offers': '36. Treatment Proposals & Pre-Clearance',
    'Encounters': '08. Medical Records (General, Dental & Vision)',
  };"""

assert old_mapping in content, "old_mapping not found"
content = content.replace(old_mapping, new_mapping)

# 4. Route /auth/refresh into 02. Authentication & OTP
old_auth_split = """        if (
          pathStr.includes('/auth/password/login') ||
          pathStr.includes('/auth/admin/login') ||
          pathStr.includes('/auth/otp/request') ||
          pathStr.includes('/auth/otp/verify') ||
          pathStr.includes('/auth/otp/resend') ||
          pathStr.includes('/auth/token/refresh') ||
          pathStr.includes('/auth/logout') ||"""

new_auth_split = """        if (
          pathStr.includes('/auth/password/login') ||
          pathStr.includes('/auth/admin/login') ||
          pathStr.includes('/auth/otp/request') ||
          pathStr.includes('/auth/otp/verify') ||
          pathStr.includes('/auth/otp/resend') ||
          pathStr.includes('/auth/token/refresh') ||
          pathStr.includes('/auth/refresh') ||
          pathStr.includes('/auth/logout') ||"""

assert old_auth_split in content, "old_auth_split not found"
content = content.replace(old_auth_split, new_auth_split)

# 5. Update collection variables in enhancePostmanCollection
old_vars = """  // 1. Setup Collection Variables
  collection.variable = [
    {
      key: 'baseUrl',
      value: 'https://360api.vnvision.in/api/v1',
      type: 'string',
      description: 'CareID API Staging Base URL',
    },
    {
      key: 'base_url',
      value: 'https://360api.vnvision.in/api/v1',
      type: 'string',
      description: 'CareID API Staging Base URL (snake_case alias)',
    },"""

new_vars = """  // 1. Setup Collection Variables
  collection.variable = [
    {
      key: 'baseUrl',
      value: 'https://360api.vnvision.in',
      type: 'string',
      description: 'CareID API Origin Host (e.g. https://360api.vnvision.in)',
    },
    {
      key: 'base_url',
      value: 'https://360api.vnvision.in',
      type: 'string',
      description: 'CareID API Origin Host (alias)',
    },"""

assert old_vars in content, "old_vars not found"
content = content.replace(old_vars, new_vars)

# 6. Update doctorPhone and add new clinical variables in collection.variable
old_doc_var = """    {
      key: 'doctorPhone',
      value: '+16505550003',
      type: 'string',
      description: 'Staging Doctor Test Phone Number',
    },"""

new_doc_var = """    {
      key: 'doctorPhone',
      value: '+919876543210',
      type: 'string',
      description: 'Primary Staging Verified Doctor Phone Number',
    },
    {
      key: 'testDoctorPhone',
      value: '+919876543210',
      type: 'string',
      description: 'Staging Test Doctor Phone Number',
    },
    {
      key: 'seedDoctorPhone',
      value: '+16505550003',
      type: 'string',
      description: 'Synthetic Doctor Test Phone Number (Sarah Jenkins)',
    },"""

assert old_doc_var in content, "old_doc_var not found"
content = content.replace(old_doc_var, new_doc_var)

# Add missing variables before end of collection.variable:
old_end_var = """    {
      key: 'jobId',
      value: 'job-sample-001',
      type: 'string',
      description: 'Sample OCR Job UUID',
    },
  ];"""

new_end_var = """    {
      key: 'jobId',
      value: 'job-sample-001',
      type: 'string',
      description: 'Sample OCR Job UUID',
    },
    {
      key: 'cptCode',
      value: '93458',
      type: 'string',
      description: 'Sample CPT Code (Coronary Angiogram)',
    },
    {
      key: 'encounterId',
      value: 'enc-sample-001',
      type: 'string',
      description: 'Clinical Encounter UUID',
    },
    {
      key: 'holdId',
      value: 'hold-sample-001',
      type: 'string',
      description: 'Cath Lab Safety Hold UUID',
    },
    {
      key: 'seriesId',
      value: 'series-sample-001',
      type: 'string',
      description: 'Cath Lab DICOM Series UUID',
    },
    {
      key: 'dentalRecordId',
      value: 'den-sample-001',
      type: 'string',
      description: 'Dental Record UUID',
    },
    {
      key: 'visionRecordId',
      value: 'vis-sample-001',
      type: 'string',
      description: 'Vision Record UUID',
    },
    {
      key: 'conversationId',
      value: 'conv-sample-001',
      type: 'string',
      description: 'Doctor-Patient Conversation UUID',
    },
    {
      key: 'shareToken',
      value: 'share-sample-token-abc',
      type: 'string',
      description: 'Cryptographic Clinical Record Share Token',
    },
  ];"""

assert old_end_var in content, "old_end_var not found"
content = content.replace(old_end_var, new_end_var)

# 7. Update pre-request script to sanitize both baseUrl and base_url
old_prereq = """        '// Defensive URL Normalizer: Supports baseUrl with or without /api/v1 suffix',
        'let currentBase = pm.environment.get("baseUrl") || pm.collectionVariables.get("baseUrl") || "https://360api.vnvision.in/api/v1";',
        'if (currentBase.endsWith("/api/v1")) {',
        '    pm.variables.set("baseUrl", currentBase.replace(/\\\\/api\\\\/v1\\\\/?$/, ""));',
        '}',"""

new_prereq = """        '// Defensive URL Normalizer: Supports baseUrl with or without /api/v1 suffix',
        'let currentBase = pm.environment.get("baseUrl") || pm.collectionVariables.get("baseUrl") || "https://360api.vnvision.in";',
        'if (typeof currentBase === "string" && currentBase.endsWith("/api/v1")) {',
        '    pm.variables.set("baseUrl", currentBase.replace(/\\\\/api\\\\/v1\\\\/?$/, "").replace(/\\\\/+$/, ""));',
        '}',
        'let currentSnake = pm.environment.get("base_url") || pm.collectionVariables.get("base_url") || "https://360api.vnvision.in";',
        'if (typeof currentSnake === "string" && currentSnake.endsWith("/api/v1")) {',
        '    pm.variables.set("base_url", currentSnake.replace(/\\\\/api\\\\/v1\\\\/?$/, "").replace(/\\\\/+$/, ""));',
        '}',"""

assert old_prereq in content, "old_prereq not found"
content = content.replace(old_prereq, new_prereq)

# 8. Update publicPathRegex to include refresh and shares
old_public_regex = "const publicPathRegex = /^\\/api\\/v1\\/(health|ready|live|docs-json|observability\\/health|auth\\/(password\\/login|admin\\/login|otp\\/request|otp\\/verify|otp\\/resend|token\\/refresh|logout))/;"
new_public_regex = "const publicPathRegex = /^\\/api\\/v1\\/(health|ready|live|docs-json|observability\\/health|shares\\/|auth\\/(password\\/login|admin\\/login|otp\\/request|otp\\/verify|otp\\/resend|token\\/refresh|refresh|logout))/;"

assert old_public_regex in content, "old_public_regex not found"
content = content.replace(old_public_regex, new_public_regex)

# 9. Support token refresh test script for both /auth/token/refresh and /auth/refresh
old_refresh_test = "} else if (urlPath === '/api/v1/auth/token/refresh') {"
new_refresh_test = "} else if (urlPath === '/api/v1/auth/token/refresh' || urlPath === '/api/v1/auth/refresh') {"

assert old_refresh_test in content, "old_refresh_test not found"
content = content.replace(old_refresh_test, new_refresh_test)

# 10. Enhance path variables for clinical endpoints
old_path_vars = """          } else if (varKey.includes('prescription')) {
            v.value = '{{prescriptionId}}';
          } else if (varKey.includes('job')) {
            v.value = '{{jobId}}';
          }"""

new_path_vars = """          } else if (varKey.includes('prescription')) {
            v.value = '{{prescriptionId}}';
          } else if (varKey.includes('job')) {
            v.value = '{{jobId}}';
          } else if (varKey.includes('cpt') || (urlPath.includes('/cpt') && varKey === 'code')) {
            v.value = '{{cptCode}}';
          } else if (varKey.includes('encounter')) {
            v.value = '{{encounterId}}';
          } else if (varKey.includes('hold')) {
            v.value = '{{holdId}}';
          } else if (varKey.includes('series')) {
            v.value = '{{seriesId}}';
          } else if (varKey.includes('dental')) {
            v.value = '{{dentalRecordId}}';
          } else if (varKey.includes('vision')) {
            v.value = '{{visionRecordId}}';
          } else if (varKey.includes('conversation')) {
            v.value = '{{conversationId}}';
          } else if (varKey.includes('share')) {
            v.value = '{{shareToken}}';
          }"""

assert old_path_vars in content, "old_path_vars not found"
content = content.replace(old_path_vars, new_path_vars)

# 11. Add dynamic ID captures for admin endpoints
old_post_captures = """    // Capture dynamic IDs upon creation
    if (method === 'POST') {
      if (urlPath === '/api/v1/patients') {
        item.event.push({
          listen: 'test',
          script: {
            type: 'text/javascript',
            exec: [
              'const res = pm.response.json();',
              'const data = res.data || res;',
              'if (data && data.id) {',
              '    pm.environment.set("patientId", data.id);',
              '    pm.environment.set("patient_id", data.id);',
              '    pm.collectionVariables.set("patientId", data.id);',
              '    pm.collectionVariables.set("patient_id", data.id);',
              '    console.log("[CareID] Auto-saved new patientId:", data.id);',
              '}',
            ],
          },
        });
      } else if (urlPath === '/api/v1/facilities') {
        item.event.push({
          listen: 'test',
          script: {
            type: 'text/javascript',
            exec: [
              'const res = pm.response.json();',
              'const data = res.data || res;',
              'if (data && data.id) {',
              '    pm.environment.set("facilityId", data.id);',
              '    pm.environment.set("facility_id", data.id);',
              '    pm.collectionVariables.set("facilityId", data.id);',
              '    pm.collectionVariables.set("facility_id", data.id);',
              '    console.log("[CareID] Auto-saved new facilityId:", data.id);',
              '}',
            ],
          },
        });
      } else if (urlPath === '/api/v1/doctors') {
        item.event.push({
          listen: 'test',
          script: {
            type: 'text/javascript',
            exec: [
              'const res = pm.response.json();',
              'const data = res.data || res;',
              'if (data && data.id) {',
              '    pm.environment.set("doctorId", data.id);',
              '    pm.environment.set("doctor_id", data.id);',
              '    pm.collectionVariables.set("doctorId", data.id);',
              '    pm.collectionVariables.set("doctor_id", data.id);',
              '    console.log("[CareID] Auto-saved new doctorId:", data.id);',
              '}',
            ],
          },
        });
      } else if (urlPath === '/api/v1/medical-records') {"""

new_post_captures = """    // Capture dynamic IDs upon creation
    if (method === 'POST') {
      if (urlPath === '/api/v1/patients' || urlPath === '/api/v1/admin/patients') {
        item.event.push({
          listen: 'test',
          script: {
            type: 'text/javascript',
            exec: [
              'const res = pm.response.json();',
              'const data = res.data || res;',
              'if (data && data.id) {',
              '    pm.environment.set("patientId", data.id);',
              '    pm.environment.set("patient_id", data.id);',
              '    pm.collectionVariables.set("patientId", data.id);',
              '    pm.collectionVariables.set("patient_id", data.id);',
              '    console.log("[CareID] Auto-saved new patientId:", data.id);',
              '}',
            ],
          },
        });
      } else if (urlPath === '/api/v1/facilities') {
        item.event.push({
          listen: 'test',
          script: {
            type: 'text/javascript',
            exec: [
              'const res = pm.response.json();',
              'const data = res.data || res;',
              'if (data && data.id) {',
              '    pm.environment.set("facilityId", data.id);',
              '    pm.environment.set("facility_id", data.id);',
              '    pm.collectionVariables.set("facilityId", data.id);',
              '    pm.collectionVariables.set("facility_id", data.id);',
              '    console.log("[CareID] Auto-saved new facilityId:", data.id);',
              '}',
            ],
          },
        });
      } else if (urlPath === '/api/v1/doctors' || urlPath === '/api/v1/admin/doctors') {
        item.event.push({
          listen: 'test',
          script: {
            type: 'text/javascript',
            exec: [
              'const res = pm.response.json();',
              'const data = res.data || res;',
              'if (data && (data.id || data.doctorId)) {',
              '    const docId = data.id || data.doctorId;',
              '    pm.environment.set("doctorId", docId);',
              '    pm.environment.set("doctor_id", docId);',
              '    pm.collectionVariables.set("doctorId", docId);',
              '    pm.collectionVariables.set("doctor_id", docId);',
              '    console.log("[CareID] Auto-saved new doctorId:", docId);',
              '}',
            ],
          },
        });
      } else if (urlPath === '/api/v1/medical-records' || urlPath === '/api/v1/admin/medical-records') {"""

assert old_post_captures in content, "old_post_captures not found"
content = content.replace(old_post_captures, new_post_captures)

# 12. Update generateStagingPostmanEnvironment
old_staging_env = """function generateStagingPostmanEnvironment() {
  return {
    id: 'careid-staging-environment-2026',
    name: 'CareID API - Staging Environment',
    values: [
      {
        key: 'baseUrl',
        value: 'https://360api.vnvision.in/api/v1',
        type: 'default',
        enabled: true,
      },
      {
        key: 'base_url',
        value: 'https://360api.vnvision.in/api/v1',
        type: 'default',
        enabled: true,
      },"""

new_staging_env = """function generateStagingPostmanEnvironment() {
  return {
    id: 'careid-staging-environment-2026',
    name: 'CareID API - Staging Environment',
    values: [
      {
        key: 'baseUrl',
        value: 'https://360api.vnvision.in',
        type: 'default',
        enabled: true,
      },
      {
        key: 'base_url',
        value: 'https://360api.vnvision.in',
        type: 'default',
        enabled: true,
      },"""

assert old_staging_env in content, "old_staging_env not found"
content = content.replace(old_staging_env, new_staging_env)

# Also update doctorPhone in staging env to +919876543210
old_doc_phone = """      {
        key: 'doctorPhone',
        value: '+16505550003',
        type: 'default',
        enabled: true,
      },"""

new_doc_phone = """      {
        key: 'doctorPhone',
        value: '+919876543210',
        type: 'default',
        enabled: true,
      },
      {
        key: 'testDoctorPhone',
        value: '+919876543210',
        type: 'default',
        enabled: true,
      },
      {
        key: 'seedDoctorPhone',
        value: '+16505550003',
        type: 'default',
        enabled: true,
      },
      {
        key: 'cptCode',
        value: '93458',
        type: 'default',
        enabled: true,
      },
      {
        key: 'offerId',
        value: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22',
        type: 'default',
        enabled: true,
      },
      {
        key: 'encounterId',
        value: 'enc-sample-001',
        type: 'default',
        enabled: true,
      },"""

assert old_doc_phone in content, "old_doc_phone not found"
content = content.replace(old_doc_phone, new_doc_phone)

# 13. Update generateLocalPostmanEnvironment
old_local_env = """  const baseUrlVar = env.values.find(v => v.key === 'baseUrl');
  if (baseUrlVar) baseUrlVar.value = 'http://localhost:3000/api/v1';
  const baseUrlSnakeVar = env.values.find(v => v.key === 'base_url');
  if (baseUrlSnakeVar) baseUrlSnakeVar.value = 'http://localhost:3000/api/v1';"""

new_local_env = """  const baseUrlVar = env.values.find(v => v.key === 'baseUrl');
  if (baseUrlVar) baseUrlVar.value = 'http://localhost:3000';
  const baseUrlSnakeVar = env.values.find(v => v.key === 'base_url');
  if (baseUrlSnakeVar) baseUrlSnakeVar.value = 'http://localhost:3000';"""

assert old_local_env in content, "old_local_env not found"
content = content.replace(old_local_env, new_local_env)

# 14. Add generateProductionPostmanEnvironment & sync CareID-Production.postman_environment.json
old_env_calls = """    const stagingEnv = generateStagingPostmanEnvironment();
    const localEnv = generateLocalPostmanEnvironment();"""

new_env_calls = """    const stagingEnv = generateStagingPostmanEnvironment();
    const localEnv = generateLocalPostmanEnvironment();
    const prodEnv = generateStagingPostmanEnvironment();
    prodEnv.id = 'careid-production-environment-2026';
    prodEnv.name = 'CareID API - Production Environment';"""

assert old_env_calls in content, "old_env_calls not found"
content = content.replace(old_env_calls, new_env_calls)

old_write_calls = """    // Write Primary
    fs.writeFileSync(careidCollectionRoot, collectionJson, 'utf8');
    fs.writeFileSync(careidEnvRoot, stagingEnvJson, 'utf8');
    fs.writeFileSync(careidCollectionDocs, collectionJson, 'utf8');
    fs.writeFileSync(careidEnvDocs, stagingEnvJson, 'utf8');"""

new_write_calls = """    const prodEnvJson = JSON.stringify(prodEnv, null, 2);
    const prodEnvRoot = path.join(__dirname, '../CareID-Production.postman_environment.json');
    const prodEnvDocs = path.join(docsPostmanDir, 'CareID-Production.postman_environment.json');

    // Write Primary
    fs.writeFileSync(careidCollectionRoot, collectionJson, 'utf8');
    fs.writeFileSync(careidEnvRoot, stagingEnvJson, 'utf8');
    fs.writeFileSync(careidCollectionDocs, collectionJson, 'utf8');
    fs.writeFileSync(careidEnvDocs, stagingEnvJson, 'utf8');
    fs.writeFileSync(prodEnvRoot, prodEnvJson, 'utf8');
    fs.writeFileSync(prodEnvDocs, prodEnvJson, 'utf8');"""

assert old_write_calls in content, "old_write_calls not found"
content = content.replace(old_write_calls, new_write_calls)

with open('scripts/generate-careid-postman.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("SUCCESS: scripts/generate-careid-postman.js successfully patched!")
