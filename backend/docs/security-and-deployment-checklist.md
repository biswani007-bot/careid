# CareID Backend: Security & Deployment Verification Checklist

**Document Version:** 1.0.0  
**Scope:** CareID NestJS Backend Deployment, Reverse Proxy Security, and Infrastructure Verification  
**Applies to:** Production, Staging, and Local Development  

---

## 1. Network Exposure & Host Binding

### A. Application Binding
- **Setting:** `HOST` in environment configuration.
- **Production Standard:** `HOST=127.0.0.1` (or `::1` loopback).
- **Security Rationale:** Binding to `0.0.0.0` exposes the internal NestJS HTTP port (`3073`) directly to the public internet or VPS network interface, bypassing all Nginx rate limits, SSL termination, payload size limits, and security headers.
- **Code Enforcement:** In `src/main.ts`, the application defaults to `127.0.0.1` when `NODE_ENV=production`. If an operator explicitly overrides this with `HOST=0.0.0.0`, the application logs a high-severity security alert at bootstrap:
  ```
  SECURITY WARNING: Application is listening on 0.0.0.0 in PRODUCTION.
  Ensure direct port access is blocked by host firewall (ufw/iptables).
  ```

### B. Verification Steps for Sysadmin / DevOps
On the production server (read-only verification):
1. **Verify listening socket:**
   ```bash
   sudo ss -tulpn | grep 3073
   ```
   *Expected Result:* `127.0.0.1:3073` (NOT `0.0.0.0:3073` or `*:3073`).
2. **Verify host firewall (UFW/iptables):**
   ```bash
   sudo ufw status verbose
   ```
   *Expected Result:* Port 3073 is NOT open. Only ports 80 and 443 are allowed from external networks.

---

## 2. Reverse Proxy Trust (`TRUST_PROXY`)

### A. Proxy Architecture
- Production traffic flows from `Client -> Public Internet -> Nginx (Host Loopback) -> NestJS (127.0.0.1:3073)`.
- The Express underlying server relies on `trust proxy` to parse `req.ip` from the `X-Forwarded-For` header.

### B. Security Constraints Implemented in Source
1. **Boolean `true` is Rejected:** In `src/main.ts`, setting `TRUST_PROXY=true` is strictly rejected and throws a bootstrap exception. Boolean `true` trusts the last IP in arbitrary untrusted header chains, allowing client IP spoofing to bypass rate limiters.
2. **Loopback & Specific Subnet Default:** When `TRUST_PROXY` is unset or set to `loopback`, `app.set('trust proxy', 'loopback')` is enforced.
3. **CIDR Subnet Validation:** If set to custom CIDRs (e.g. AWS VPC, Cloudflare IP blocks), only valid IP or CIDR strings are accepted.

### C. Required Nginx Configuration (`/etc/nginx/sites-available/careid.conf`)
Nginx MUST overwrite incoming client-supplied forwarding headers:
```nginx
location / {
    proxy_pass http://127.0.0.1:3073;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;

    # Strictly overwrite client-supplied headers
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
}
```

---

## 3. Rate Limiting: Architecture & Operational Reality

### A. Current Implementation: In-Memory `Map`
- The application currently uses an in-memory process-local store (`AuthRateLimiterService`) for tracking IP and identifier attempts.
- **Bypassing Memory Leaks:** A periodic interval cleanup sweeps expired sliding-window records every 60 seconds (`unref()` timer), and the store enforces a strict `MAX_RECORDS = 10,000` cap with LRU/oldest-eviction to prevent denial-of-service memory exhaustion.

### B. Multi-Process (PM2 Cluster) Limitation
- **Finding:** In production, PM2 runs with 4 worker instances in cluster mode (`exec_mode: 'cluster'`, `instances: 4`).
- **Limitation:** In-memory maps are **process-local** and not shared across workers. A round-robin proxy will distribute successive requests across the 4 worker processes.
- **Effective Impact:** A configured limit of 5 requests per 15 minutes may effectively allow up to 20 requests (5 per worker) before total rate exhaustion if requests round-robin evenly.
- **Architectural Recommendation:** Migrate to a centralized, shared key-value store (Redis / Valkey) for globally synchronized atomic increment and sliding-window rate limiting.

### C. Defense-in-Depth: Nginx Rate Limiting
To mitigate the PM2 cluster division, configure Nginx zones specifically targeting sensitive endpoints:
```nginx
# In http block:
limit_req_zone $binary_remote_addr zone=careid_auth_otp:10m rate=5r/m;
limit_req_zone $binary_remote_addr zone=careid_auth_refresh:10m rate=30r/m;

# In server location blocks:
location /api/v1/auth/request-otp {
    limit_req zone=careid_auth_otp burst=5 nodelay;
    proxy_pass http://127.0.0.1:3073;
}
location /api/v1/auth/refresh {
    limit_req zone=careid_auth_refresh burst=10 nodelay;
    proxy_pass http://127.0.0.1:3073;
}
```

---

## 4. Secrets & Environment Configuration

### A. Pre-Flight Configuration Rules
1. **JWT Secrets:**
   - `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` must be distinct, high-entropy cryptographic strings of at least 32 characters (256 bits).
   - In `production`, startup validation fails immediately if secrets are default placeholder strings (`secret`, `changeme`, etc.) or shorter than 32 characters.
2. **Database Connection:**
   - `DATABASE_URL` must connect over SSL (`sslmode=require` or `sslmode=verify-full`) in production environments.
   - Connection pool settings should be tuned: `connection_limit=10` per PM2 worker prevents exhausting PostgreSQL's `max_connections` (4 workers * 10 = 40 pool connections).
3. **CORS Whitelist:**
   - `CORS_ORIGIN` must contain explicit origins (e.g. `https://admin.careid.com,https://patient.careid.com`).
   - Wildcards (`*`) or reflection of arbitrary `Origin` headers are strictly forbidden in production mode.

---

## 5. File Uploads & Malware Scanning

### A. Current Status: `virusScanStatus: 'PENDING'`
- **Remediation Implemented:** In `MedicalRecordService` and `MedicalRecordRepository`, all newly uploaded medical records and files now initialize with:
  ```typescript
  virusScanStatus: 'PENDING'
  ```
- **Prior Defect:** Files previously defaulted to `'CLEAN'`, misleading users and administrators into believing an automated antivirus inspection had completed when no antivirus engine was installed.

### B. Storage & Validation Safeguards
- File uploads enforce strict MIME type checks (`image/jpeg`, `image/png`, `application/pdf`).
- Maximum upload size is enforced at NestJS multer level (10 MB).
- File paths use UUID-generated storage keys, eliminating directory traversal vulnerabilities.

### C. Future Scanner Integration (Infrastructure Required)
Before marking files as `CLEAN`, the deployment requires one of:
1. Local ClamAV daemon (`clamd`) running on the server, scanning the upload directory via a post-upload background hook.
2. Object storage trigger (e.g. AWS S3 Event / Cloudflare R2 worker) invoking an automated malware analysis container.

---

## 6. Pre-Release Deployment Verification Runbook

Before enabling production traffic, the operations engineer must perform these verification checks:

| Check # | Item | Command / Action | Expected Result | Pass/Fail |
| :---: | :--- | :--- | :--- | :---: |
| **1** | **Host Binding** | `curl -I http://127.0.0.1:3073/api/v1/health` | HTTP 200 OK | [ ] |
| **2** | **External Port Block** | `curl -I http://<PUBLIC_SERVER_IP>:3073/api/v1/health` from external machine | Connection timed out / Refused | [ ] |
| **3** | **HTTPS Termination** | `curl -I https://api.careid.com/api/v1/health` | HTTP 200 OK (Strict-Transport-Security present) | [ ] |
| **4** | **Proxy Headers** | Inspect PM2 logs for incoming request IPs | Shows real client public IP, NOT `127.0.0.1` | [ ] |
| **5** | **Draft CMS Protection** | `curl -I https://api.careid.com/api/v1/cms/pages/slug/draft-test` (no auth) | HTTP 404 Not Found | [ ] |
| **6** | **Admin CMS Guard** | `curl -X POST https://api.careid.com/api/v1/cms/pages` (no auth) | HTTP 401 Unauthorized | [ ] |
| **7** | **Rate Limiter Trigger** | Send 15 OTP requests in rapid succession | Returns HTTP 429 Too Many Requests | [ ] |
| **8** | **Prisma Hash** | Verify SHA-256 of active `prisma/schema.prisma` | Must equal `ce7d1238ecb41f4130d33a5c1161cfcdaf5e2c951c76879200f658e44b612894` | [ ] |
