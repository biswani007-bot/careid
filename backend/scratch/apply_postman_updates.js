const fs = require('fs');
const path = require('path');

// 1. Read existing CareID-Staging.postman_collection.json
const collPath = 'CareID-Staging.postman_collection.json';
const coll = JSON.parse(fs.readFileSync(collPath, 'utf8'));

// 2. Update Collection Description & Title
coll.info.name = 'CareID API — Staging Integration Collection (November 2026 Post-Audit Release)';

// 3. Update Collection Pre-Request Script
coll.event = [
  {
    listen: 'prerequest',
    script: {
      type: 'text/javascript',
      exec: [
        '// Defensive URL Normalizer: Supports baseUrl with or without /api/v1 suffix across all request styles',
        'const rawBase = pm.environment.get("baseUrl") || pm.collectionVariables.get("baseUrl") || "https://360api.vnvision.in/api/v1";',
        'const cleanRoot = rawBase.replace(/\\/api\\/v1\\/?$/, "");',
        'const urlPath = pm.request.url.getPath();',
        'if (urlPath.startsWith("/api/v1") || urlPath.startsWith("api/v1")) {',
        '    // Request explicitly includes /api/v1 in path -> use clean root host',
        '    pm.variables.set("baseUrl", cleanRoot);',
        '} else {',
        '    // Request begins with module path (e.g. /security/audit) -> ensure baseUrl includes /api/v1',
        '    pm.variables.set("baseUrl", cleanRoot + "/api/v1");',
        '}'
      ]
    }
  }
];

// 4. Update Collection Variables
const requiredVars = [
  { key: 'baseUrl', value: 'https://360api.vnvision.in/api/v1', type: 'string', description: 'CareID API Staging Base URL' },
  { key: 'base_url', value: 'https://360api.vnvision.in/api/v1', type: 'string', description: 'CareID API Staging Base URL (snake_case alias)' },
  { key: 'doctorToken', value: '{{accessToken}}', type: 'string', description: 'JWT Access Token for authenticated DOCTOR' },
  { key: 'adminToken', value: '{{accessToken}}', type: 'string', description: 'JWT Access Token for authenticated ADMIN' },
  { key: 'superAdminToken', value: '{{accessToken}}', type: 'string', description: 'JWT Access Token for authenticated SUPER_ADMIN' },
  { key: 'patientToken', value: '{{accessToken}}', type: 'string', description: 'JWT Access Token for authenticated PATIENT' },
  { key: 'facilityAdminToken', value: '{{accessToken}}', type: 'string', description: 'JWT Access Token for authenticated FACILITY_ADMIN' },
  { key: 'doctorUserId', value: '1f06067b-e229-4707-84e2-afa27da2e4cd', type: 'string', description: 'User ID of authenticated Doctor' },
  { key: 'otherUserId', value: 'user-other-target-staging-id', type: 'string', description: 'Disallowed cross-user ID for IDOR defense testing' },
  { key: 'doctorAToken', value: '{{doctorToken}}', type: 'string', description: 'Backward compatibility alias for doctorToken' },
  { key: 'doctorBToken', value: '{{accessToken}}', type: 'string', description: 'Doctor B token alias' },
  { key: 'doctorAId', value: '{{doctorUserId}}', type: 'string', description: 'Doctor A user ID alias' },
  { key: 'doctorBId', value: '{{otherUserId}}', type: 'string', description: 'Doctor B user ID alias' }
];

const existingVars = coll.variable || [];
const varMap = new Map();
existingVars.forEach(v => varMap.set(v.key, v));
requiredVars.forEach(v => varMap.set(v.key, v));
coll.variable = Array.from(varMap.values());

// 5. Update Security Audit Folder in '18. Security, Threat Detection & Sessions'
const secFolder = coll.item.find(i => i.name.startsWith('18. Security'));
if (!secFolder) {
  throw new Error('Could not find folder 18. Security, Threat Detection & Sessions');
}

// Remove old audit items (if present directly in secFolder.item)
secFolder.item = secFolder.item.filter(i => {
  const name = i.name.toLowerCase();
  return !name.includes('audit (no userid)') &&
         !name.includes('self audit') &&
         !name.includes('cross-doctor audit') &&
         !name.includes('platform audit') &&
         !name.includes('audit attempt') &&
         i.name !== 'Security Audit';
});

// Build 8 Security Audit Requests A through H
const securityAuditRequests = [
  {
    name: 'A. Doctor — Own Audit Logs',
    request: {
      name: 'A. Doctor — Own Audit Logs',
      description: 'Authenticated DOCTOR requests own security audit history without query parameters. Records are scoped strictly using the authenticated JWT subject mapped to the doctor User ID. Response must not expose credentials, password hashes, access tokens, refresh tokens, or cookies.',
      url: {
        raw: '{{baseUrl}}/security/audit',
        host: ['{{baseUrl}}'],
        path: ['security', 'audit'],
        query: [],
        variable: []
      },
      header: [
        { key: 'Accept', value: 'application/json' },
        { key: 'Authorization', value: 'Bearer {{doctorToken}}' }
      ],
      method: 'GET',
      auth: {
        type: 'bearer',
        bearer: [
          { key: 'token', value: '{{doctorToken}}', type: 'string' }
        ]
      }
    },
    response: [],
    event: [
      {
        listen: 'test',
        script: {
          type: 'text/javascript',
          exec: [
            'pm.test("Status code is 200 OK", function () {',
            '    pm.response.to.have.status(200);',
            '});',
            'pm.test("Response is valid JSON array", function () {',
            '    const data = pm.response.json();',
            '    pm.expect(Array.isArray(data)).to.be.true;',
            '});',
            'pm.test("Response schema conforms to SecurityAuditLogResponseDto", function () {',
            '    const data = pm.response.json();',
            '    if (data.length > 0) {',
            '        const record = data[0];',
            '        pm.expect(record).to.have.property("id");',
            '        pm.expect(record).to.have.property("action");',
            '        pm.expect(record).to.have.property("resource");',
            '        pm.expect(record).to.have.property("result");',
            '        pm.expect(record).to.have.property("createdAt");',
            '    }',
            '});',
            'pm.test("Doctor Self-Scope Verification — logs belong only to authenticated doctor", function () {',
            '    const data = pm.response.json();',
            '    const docId = pm.environment.get("doctorUserId") || pm.collectionVariables.get("doctorUserId");',
            '    if (docId && data.length > 0) {',
            '        pm.expect(data.every(item => !item.userId || item.userId === docId)).to.be.true;',
            '    }',
            '});',
            'pm.test("Zero Credential Leakage — passwords, hashes, tokens, cookies excluded", function () {',
            '    const text = pm.response.text().toLowerCase();',
            '    pm.expect(text).to.not.include("password");',
            '    pm.expect(text).to.not.include("passwordhash");',
            '    pm.expect(text).to.not.include("bearer ");',
            '    pm.expect(text).to.not.include("sessiontoken");',
            '    pm.expect(text).to.not.include("refreshtoken");',
            '});'
          ]
        }
      }
    ]
  },
  {
    name: 'B. Doctor — Explicit Own User ID',
    request: {
      name: 'B. Doctor — Explicit Own User ID',
      description: 'Authenticated DOCTOR requests own audit history explicitly passing their own userId as query param. Returns 200 OK with records strictly belonging to the authenticated doctor.',
      url: {
        raw: '{{baseUrl}}/security/audit?userId={{doctorUserId}}',
        host: ['{{baseUrl}}'],
        path: ['security', 'audit'],
        query: [
          {
            key: 'userId',
            value: '{{doctorUserId}}',
            description: 'Target doctor user ID (must match authenticated JWT subject for DOCTOR role)'
          }
        ],
        variable: []
      },
      header: [
        { key: 'Accept', value: 'application/json' },
        { key: 'Authorization', value: 'Bearer {{doctorToken}}' }
      ],
      method: 'GET',
      auth: {
        type: 'bearer',
        bearer: [
          { key: 'token', value: '{{doctorToken}}', type: 'string' }
        ]
      }
    },
    response: [],
    event: [
      {
        listen: 'test',
        script: {
          type: 'text/javascript',
          exec: [
            'pm.test("Status code is 200 OK", function () {',
            '    pm.response.to.have.status(200);',
            '});',
            'pm.test("Response is valid JSON array", function () {',
            '    const data = pm.response.json();',
            '    pm.expect(Array.isArray(data)).to.be.true;',
            '});',
            'pm.test("Doctor Explicit User ID — all records strictly match doctorUserId", function () {',
            '    const data = pm.response.json();',
            '    const docId = pm.environment.get("doctorUserId") || pm.collectionVariables.get("doctorUserId");',
            '    if (docId && data.length > 0) {',
            '        pm.expect(data.every(item => item.userId === docId)).to.be.true;',
            '    }',
            '});',
            'pm.test("Zero Credential Leakage — passwords, hashes, tokens excluded", function () {',
            '    const text = pm.response.text().toLowerCase();',
            '    pm.expect(text).to.not.include("password");',
            '    pm.expect(text).to.not.include("passwordhash");',
            '    pm.expect(text).to.not.include("refreshtoken");',
            '});'
          ]
        }
      }
    ]
  },
  {
    name: 'C. Doctor — Cross-User Access Protection',
    request: {
      name: 'C. Doctor — Cross-User Access Protection',
      description: 'Authenticated DOCTOR attempts cross-user audit log inspection by supplying a different user ID (otherUserId != doctorUserId). Request must be rejected with HTTP 403 Forbidden before querying the audit repository. No other user audit data is disclosed.',
      url: {
        raw: '{{baseUrl}}/security/audit?userId={{otherUserId}}',
        host: ['{{baseUrl}}'],
        path: ['security', 'audit'],
        query: [
          {
            key: 'userId',
            value: '{{otherUserId}}',
            description: 'Disallowed cross-user ID (must differ from doctorUserId)'
          }
        ],
        variable: []
      },
      header: [
        { key: 'Accept', value: 'application/json' },
        { key: 'Authorization', value: 'Bearer {{doctorToken}}' }
      ],
      method: 'GET',
      auth: {
        type: 'bearer',
        bearer: [
          { key: 'token', value: '{{doctorToken}}', type: 'string' }
        ]
      }
    },
    response: [],
    event: [
      {
        listen: 'test',
        script: {
          type: 'text/javascript',
          exec: [
            'pm.test("Status code is 403 Forbidden (cross-user access protection)", function () {',
            '    pm.response.to.have.status(403);',
            '});',
            'pm.test("Cross-User Request Sanity — otherUserId must differ from doctorUserId", function () {',
            '    const docId = pm.environment.get("doctorUserId") || pm.collectionVariables.get("doctorUserId");',
            '    const otherId = pm.environment.get("otherUserId") || pm.collectionVariables.get("otherUserId");',
            '    if (docId && otherId) {',
            '        pm.expect(otherId).to.not.equal(docId);',
            '    }',
            '});',
            'pm.test("Zero Data Disclosure — cross-user request rejected before query without leaking data", function () {',
            '    const data = pm.response.json();',
            '    pm.expect(Array.isArray(data)).to.be.false;',
            '    pm.expect(data.statusCode || pm.response.code).to.equal(403);',
            '});'
          ]
        }
      }
    ]
  },
  {
    name: 'D. Admin — Platform-Wide Audit',
    request: {
      name: 'D. Admin — Platform-Wide Audit',
      description: 'Authenticated ADMIN retrieves platform security audit logs with platform-wide visibility. Returns 200 OK.',
      url: {
        raw: '{{baseUrl}}/security/audit',
        host: ['{{baseUrl}}'],
        path: ['security', 'audit'],
        query: [],
        variable: []
      },
      header: [
        { key: 'Accept', value: 'application/json' },
        { key: 'Authorization', value: 'Bearer {{adminToken}}' }
      ],
      method: 'GET',
      auth: {
        type: 'bearer',
        bearer: [
          { key: 'token', value: '{{adminToken}}', type: 'string' }
        ]
      }
    },
    response: [],
    event: [
      {
        listen: 'test',
        script: {
          type: 'text/javascript',
          exec: [
            'pm.test("Status code is 200 OK", function () {',
            '    pm.response.to.have.status(200);',
            '});',
            'pm.test("Admin platform audit returns valid array", function () {',
            '    const data = pm.response.json();',
            '    pm.expect(Array.isArray(data)).to.be.true;',
            '});',
            'pm.test("Response schema conforms to SecurityAuditLogResponseDto", function () {',
            '    const data = pm.response.json();',
            '    if (data.length > 0) {',
            '        const record = data[0];',
            '        pm.expect(record).to.have.property("id");',
            '        pm.expect(record).to.have.property("action");',
            '        pm.expect(record).to.have.property("resource");',
            '    }',
            '});',
            'pm.test("Zero Credential Leakage — passwords, hashes, tokens excluded", function () {',
            '    const text = pm.response.text().toLowerCase();',
            '    pm.expect(text).to.not.include("password");',
            '    pm.expect(text).to.not.include("sessiontoken");',
            '});'
          ]
        }
      }
    ]
  },
  {
    name: 'E. Super Admin — Platform-Wide Audit',
    request: {
      name: 'E. Super Admin — Platform-Wide Audit',
      description: 'Authenticated SUPER_ADMIN retrieves platform security audit logs with full visibility across all actors. Returns 200 OK.',
      url: {
        raw: '{{baseUrl}}/security/audit',
        host: ['{{baseUrl}}'],
        path: ['security', 'audit'],
        query: [],
        variable: []
      },
      header: [
        { key: 'Accept', value: 'application/json' },
        { key: 'Authorization', value: 'Bearer {{superAdminToken}}' }
      ],
      method: 'GET',
      auth: {
        type: 'bearer',
        bearer: [
          { key: 'token', value: '{{superAdminToken}}', type: 'string' }
        ]
      }
    },
    response: [],
    event: [
      {
        listen: 'test',
        script: {
          type: 'text/javascript',
          exec: [
            'pm.test("Status code is 200 OK", function () {',
            '    pm.response.to.have.status(200);',
            '});',
            'pm.test("Super Admin platform audit returns valid array", function () {',
            '    const data = pm.response.json();',
            '    pm.expect(Array.isArray(data)).to.be.true;',
            '});',
            'pm.test("Zero Credential Leakage — passwords, hashes, tokens excluded", function () {',
            '    const text = pm.response.text().toLowerCase();',
            '    pm.expect(text).to.not.include("password");',
            '    pm.expect(text).to.not.include("sessiontoken");',
            '});'
          ]
        }
      }
    ]
  },
  {
    name: 'F. Patient — Forbidden',
    request: {
      name: 'F. Patient — Forbidden',
      description: 'Authenticated PATIENT role attempts to access security audit endpoint. Must be rejected with HTTP 403 Forbidden.',
      url: {
        raw: '{{baseUrl}}/security/audit',
        host: ['{{baseUrl}}'],
        path: ['security', 'audit'],
        query: [],
        variable: []
      },
      header: [
        { key: 'Accept', value: 'application/json' },
        { key: 'Authorization', value: 'Bearer {{patientToken}}' }
      ],
      method: 'GET',
      auth: {
        type: 'bearer',
        bearer: [
          { key: 'token', value: '{{patientToken}}', type: 'string' }
        ]
      }
    },
    response: [],
    event: [
      {
        listen: 'test',
        script: {
          type: 'text/javascript',
          exec: [
            'pm.test("Status code is 403 Forbidden (patient audit access denied)", function () {',
            '    pm.response.to.have.status(403);',
            '});',
            'pm.test("Patient rejection returns standard error response", function () {',
            '    const data = pm.response.json();',
            '    pm.expect(Array.isArray(data)).to.be.false;',
            '    pm.expect(data.statusCode || pm.response.code).to.equal(403);',
            '});'
          ]
        }
      }
    ]
  },
  {
    name: 'G. Facility Admin — Forbidden',
    request: {
      name: 'G. Facility Admin — Forbidden',
      description: 'Authenticated FACILITY_ADMIN role attempts to access security audit endpoint. Must be rejected with HTTP 403 Forbidden.',
      url: {
        raw: '{{baseUrl}}/security/audit',
        host: ['{{baseUrl}}'],
        path: ['security', 'audit'],
        query: [],
        variable: []
      },
      header: [
        { key: 'Accept', value: 'application/json' },
        { key: 'Authorization', value: 'Bearer {{facilityAdminToken}}' }
      ],
      method: 'GET',
      auth: {
        type: 'bearer',
        bearer: [
          { key: 'token', value: '{{facilityAdminToken}}', type: 'string' }
        ]
      }
    },
    response: [],
    event: [
      {
        listen: 'test',
        script: {
          type: 'text/javascript',
          exec: [
            'pm.test("Status code is 403 Forbidden (facility admin audit access denied)", function () {',
            '    pm.response.to.have.status(403);',
            '});',
            'pm.test("Facility admin rejection returns standard error response", function () {',
            '    const data = pm.response.json();',
            '    pm.expect(Array.isArray(data)).to.be.false;',
            '    pm.expect(data.statusCode || pm.response.code).to.equal(403);',
            '});'
          ]
        }
      }
    ]
  },
  {
    name: 'H. Unauthenticated — Unauthorized',
    request: {
      name: 'H. Unauthenticated — Unauthorized',
      description: 'Unauthenticated request without Bearer token. Must be rejected with HTTP 401 Unauthorized.',
      url: {
        raw: '{{baseUrl}}/security/audit',
        host: ['{{baseUrl}}'],
        path: ['security', 'audit'],
        query: [],
        variable: []
      },
      header: [
        { key: 'Accept', value: 'application/json' }
      ],
      method: 'GET',
      auth: {
        type: 'noauth'
      }
    },
    response: [],
    event: [
      {
        listen: 'test',
        script: {
          type: 'text/javascript',
          exec: [
            'pm.test("Status code is 401 Unauthorized (unauthenticated access denied)", function () {',
            '    pm.response.to.have.status(401);',
            '});',
            'pm.test("Unauthenticated rejection returns standard error response", function () {',
            '    const data = pm.response.json();',
            '    pm.expect(Array.isArray(data)).to.be.false;',
            '    pm.expect(data.statusCode || pm.response.code).to.equal(401);',
            '});'
          ]
        }
      }
    ]
  }
];

// Add the dedicated Security Audit subfolder inside 18. Security
secFolder.item.push({
  name: 'Security Audit',
  description: 'Doctor-scoped and administrative security audit history access verification with role-based isolation (DOCTOR, ADMIN, SUPER_ADMIN, PATIENT, FACILITY_ADMIN, Unauthenticated).',
  item: securityAuditRequests
});

// Save updated collection in root and in docs/postman
fs.writeFileSync('CareID-Staging.postman_collection.json', JSON.stringify(coll, null, 2), 'utf8');
if (fs.existsSync('docs/postman/CareID-Staging.postman_collection.json')) {
  fs.writeFileSync('docs/postman/CareID-Staging.postman_collection.json', JSON.stringify(coll, null, 2), 'utf8');
}
console.log('Saved updated CareID-Staging.postman_collection.json successfully.');

// 6. Update Staging Environment Template (No Secrets)
const stagingEnvPath = 'CareID-Staging.postman_environment.json';
const stagingEnv = JSON.parse(fs.readFileSync(stagingEnvPath, 'utf8'));

const requiredEnvVars = [
  { key: 'baseUrl', value: 'https://360api.vnvision.in/api/v1', type: 'default', enabled: true },
  { key: 'base_url', value: 'https://360api.vnvision.in/api/v1', type: 'default', enabled: true },
  { key: 'doctorToken', value: '', type: 'secret', enabled: true },
  { key: 'adminToken', value: '', type: 'secret', enabled: true },
  { key: 'superAdminToken', value: '', type: 'secret', enabled: true },
  { key: 'patientToken', value: '', type: 'secret', enabled: true },
  { key: 'facilityAdminToken', value: '', type: 'secret', enabled: true },
  { key: 'doctorUserId', value: '1f06067b-e229-4707-84e2-afa27da2e4cd', type: 'default', enabled: true },
  { key: 'otherUserId', value: 'user-other-target-staging-id', type: 'default', enabled: true },
  { key: 'accessToken', value: '', type: 'secret', enabled: true },
  { key: 'access_token', value: '{{accessToken}}', type: 'secret', enabled: true },
  { key: 'bearerToken', value: '{{accessToken}}', type: 'secret', enabled: true },
  { key: 'refreshToken', value: '', type: 'secret', enabled: true },
  { key: 'refresh_token', value: '{{refreshToken}}', type: 'secret', enabled: true },
  { key: 'adminPassword', value: '', type: 'secret', enabled: true }
];

const stagingVarMap = new Map();
(stagingEnv.values || []).forEach(v => {
  // Ensure sensitive values are blank
  if (v.type === 'secret' || v.key.toLowerCase().includes('password') || v.key.toLowerCase().includes('token')) {
    if (v.key === 'bearerToken' || v.key === 'access_token' || v.key === 'refresh_token') {
      // Keep alias expression
    } else {
      v.value = '';
    }
  }
  stagingVarMap.set(v.key, v);
});
requiredEnvVars.forEach(v => stagingVarMap.set(v.key, v));
stagingEnv.values = Array.from(stagingVarMap.values());

fs.writeFileSync('CareID-Staging.postman_environment.json', JSON.stringify(stagingEnv, null, 2), 'utf8');
if (fs.existsSync('docs/postman/CareID-Staging.postman_environment.json')) {
  fs.writeFileSync('docs/postman/CareID-Staging.postman_environment.json', JSON.stringify(stagingEnv, null, 2), 'utf8');
}
console.log('Saved updated CareID-Staging.postman_environment.json successfully.');

// 7. Generate Production Environment Template (No Secrets)
const prodEnv = {
  id: 'careid-production-environment-2026',
  name: 'CareID API - Production Environment',
  values: [
    { key: 'baseUrl', value: 'https://360api.vnvision.in/api/v1', type: 'default', enabled: true },
    { key: 'base_url', value: 'https://360api.vnvision.in/api/v1', type: 'default', enabled: true },
    { key: 'doctorToken', value: '', type: 'secret', enabled: true },
    { key: 'adminToken', value: '', type: 'secret', enabled: true },
    { key: 'superAdminToken', value: '', type: 'secret', enabled: true },
    { key: 'patientToken', value: '', type: 'secret', enabled: true },
    { key: 'facilityAdminToken', value: '', type: 'secret', enabled: true },
    { key: 'doctorUserId', value: '', type: 'default', enabled: true },
    { key: 'otherUserId', value: '', type: 'default', enabled: true },
    { key: 'accessToken', value: '', type: 'secret', enabled: true },
    { key: 'access_token', value: '{{accessToken}}', type: 'secret', enabled: true },
    { key: 'bearerToken', value: '{{accessToken}}', type: 'secret', enabled: true },
    { key: 'refreshToken', value: '', type: 'secret', enabled: true },
    { key: 'refresh_token', value: '{{refreshToken}}', type: 'secret', enabled: true },
    { key: 'challengeId', value: '', type: 'default', enabled: true },
    { key: 'userId', value: '', type: 'default', enabled: true },
    { key: 'patientId', value: '', type: 'default', enabled: true },
    { key: 'doctorId', value: '', type: 'default', enabled: true },
    { key: 'facilityId', value: '', type: 'default', enabled: true },
    { key: 'branchId', value: '', type: 'default', enabled: true },
    { key: 'recordId', value: '', type: 'default', enabled: true },
    { key: 'appointmentId', value: '', type: 'default', enabled: true },
    { key: 'referralId', value: '', type: 'default', enabled: true },
    { key: 'reportId', value: '', type: 'default', enabled: true },
    { key: 'staffId', value: '', type: 'default', enabled: true },
    { key: 'ticketId', value: '', type: 'default', enabled: true },
    { key: 'petId', value: '', type: 'default', enabled: true },
    { key: 'applicationId', value: '', type: 'default', enabled: true },
    { key: 'apiKeyId', value: '', type: 'default', enabled: true },
    { key: 'roleId', value: '', type: 'default', enabled: true },
    { key: 'insuranceCardId', value: '', type: 'default', enabled: true },
    { key: 'adminEmail', value: '', type: 'default', enabled: true },
    { key: 'superAdminEmail', value: '', type: 'default', enabled: true },
    { key: 'adminPassword', value: '', type: 'secret', enabled: true }
  ],
  _postman_variable_scope: 'environment'
};

fs.writeFileSync('CareID-Production.postman_environment.json', JSON.stringify(prodEnv, null, 2), 'utf8');
if (fs.existsSync('docs/postman')) {
  fs.writeFileSync('docs/postman/CareID-Production.postman_environment.json', JSON.stringify(prodEnv, null, 2), 'utf8');
}
console.log('Saved CareID-Production.postman_environment.json successfully.');

