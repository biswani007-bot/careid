const { getAdminToken } = require("./token_helper.cjs");
const https = require("https");

async function test() {
  const token = await getAdminToken();
  const headers = { Authorization: "Bearer " + token, "Content-Type": "application/json" };

  async function put(path, body) {
    return new Promise(resolve => {
      const dataStr = JSON.stringify(body);
      const req = https.request("https://360api.vnvision.in" + path, {
        method: "PUT",
        headers: {
          ...headers,
          "Content-Length": Buffer.byteLength(dataStr)
        }
      }, res => {
        let data = "";
        res.on("data", chunk => data += chunk);
        res.on("end", () => {
          try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
          catch(e) { resolve({ status: res.statusCode, raw: data }); }
        });
      });
      req.on("error", e => resolve({ error: e.message }));
      req.write(dataStr);
      req.end();
    });
  }

  async function get(path) {
    return new Promise(resolve => {
      const req = https.request("https://360api.vnvision.in" + path, { method: "GET", headers }, res => {
        let data = "";
        res.on("data", chunk => data += chunk);
        res.on("end", () => {
          try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
          catch(e) { resolve({ status: res.statusCode, raw: data }); }
        });
      });
      req.on("error", e => resolve({ error: e.message }));
      req.end();
    });
  }

  const sampleSettings = [
    { category: 'SECURITY', key: 'MFA_ENFORCED', value: 'true', valueType: 'BOOLEAN', description: 'Two-factor multi-factor authentication enforcement' },
    { category: 'SECURITY', key: 'MFA_SMS_OTP', value: 'true', valueType: 'BOOLEAN', description: 'Permit SMS OTP fallback' },
    { category: 'SECURITY', key: 'MFA_HARDWARE_TOKEN', value: 'true', valueType: 'BOOLEAN', description: 'Permit FIDO2 hardware tokens' },
    { category: 'SECURITY', key: 'MFA_BIOMETRIC_PUSH', value: 'true', valueType: 'BOOLEAN', description: 'Permit Biometric push verification' },
    { category: 'SECURITY', key: 'ONBOARDING_GRACE_PERIOD', value: '7 Days (Enterprise Recommended)', valueType: 'STRING', description: 'Grace period for new staff MFA onboarding' },
    { category: 'SECURITY', key: 'SESSION_INACTIVITY_TIMEOUT', value: '15 Minutes (Active Clinical Standard)', valueType: 'STRING', description: 'Automatic session termination timeout threshold' },
    { category: 'SECURITY', key: 'MAX_CONCURRENT_SESSIONS', value: '1', valueType: 'NUMBER', description: 'Maximum concurrent active user login sessions' },
    { category: 'SECURITY', key: 'FORCE_STEP_UP_REAUTH', value: 'true', valueType: 'BOOLEAN', description: 'Force re-authentication for elevated clinical operations' },
    { category: 'SECURITY', key: 'PASSWORD_MIN_LENGTH', value: '12 Characters (Mandatory)', valueType: 'STRING', description: 'Minimum characters for user security passwords' },
    { category: 'SECURITY', key: 'REQ_UPPERCASE', value: 'true', valueType: 'BOOLEAN', description: 'Require uppercase letters in passwords' },
    { category: 'SECURITY', key: 'REQ_LOWERCASE', value: 'true', valueType: 'BOOLEAN', description: 'Require lowercase letters in passwords' },
    { category: 'SECURITY', key: 'REQ_NUMERIC', value: 'true', valueType: 'BOOLEAN', description: 'Require numeric digits in passwords' },
    { category: 'SECURITY', key: 'REQ_SPECIAL_CHAR', value: 'true', valueType: 'BOOLEAN', description: 'Require special punctuation characters in passwords' },
    { category: 'SECURITY', key: 'PASSWORD_ROTATION_INTERVAL', value: '90 Days (Enterprise Standard)', valueType: 'STRING', description: 'Password expiration and mandatory rotation policy' },
    { category: 'SECURITY', key: 'PREVENT_PASSWORD_REUSE_COUNT', value: '5', valueType: 'NUMBER', description: 'Number of historical passwords prevented from reuse' },
    { category: 'SECURITY', key: 'MAX_FAILED_ATTEMPTS', value: '5', valueType: 'NUMBER', description: 'Maximum consecutive failed login attempts before lockout' },
    { category: 'SECURITY', key: 'LOCKOUT_DURATION_WINDOW', value: '30 Minutes (Auto-Release)', valueType: 'STRING', description: 'Account lockout duration before auto-release' },
    { category: 'SECURITY', key: 'IP_WHITELISTING_ACTIVE', value: 'true', valueType: 'BOOLEAN', description: 'Active firewall IP subnet enforcement flag' },
    { category: 'SECURITY', key: 'WHITELISTED_SUBNETS', value: JSON.stringify([{ id: 'cidr-1', cidr: '192.168.10.0/24', description: 'Cath Lab', type: 'on-premise', active: true }]), valueType: 'JSON', description: 'Subnets' }
  ];

  console.log(`Testing upsert of ${sampleSettings.length} security settings...`);
  let successCount = 0;
  for (const s of sampleSettings) {
    const res = await put("/api/v1/admin/settings", s);
    if (res.status === 200 && res.body?.success) {
      successCount++;
    } else {
      console.error(`Failed ${s.key}:`, res.status, res.body);
    }
  }
  console.log(`Upsert completed: ${successCount} / ${sampleSettings.length} succeeded.`);

  // Refetch
  const getRes = await get("/api/v1/admin/settings?category=SECURITY");
  console.log("Refetch status:", getRes.status, "Count:", getRes.body?.data?.length);
  const keysInDb = getRes.body?.data?.map(s => s.key) || [];
  console.log("Keys in DB:", keysInDb.join(", "));
}
test();

