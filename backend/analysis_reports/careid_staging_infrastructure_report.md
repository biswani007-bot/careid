# CareID Staging Infrastructure & Environment Isolation Report

**Target Staging Domain:** `staging-360api.vnvision.in`  
**Target Staging API:** `https://staging-360api.vnvision.in/api/v1`  
**Production API:** `https://360api.vnvision.in/api/v1` (IP `161.97.89.183`, Port `3073`, DB `360api`)  
**Staging Host IP:** `161.97.89.183`  
**Target Internal Port:** `3074`  
**Staging Database:** `360api_staging`  
**Staging OCR Worker:** Port `5051` (Isolated from Production `5050`)  
**Generated Date:** November 10, 2026  
**Status:** READY FOR SERVER-ADMIN CONFIGURATION  

---

## 1. Executive Summary

To satisfy the strict mandate of **zero production risk and zero downtime**, the newly implemented CareID backend (Stages 8–18, Cath Lab M01–M05, Prescription Refill D01, Prescription PDF Export D02, and Unified Clinical PDF Export) must operate in an isolated staging environment.

The production server at `161.97.89.183` currently runs an Apache reverse proxy managed via aaPanel. While DNS for `staging-360api.vnvision.in` resolves to `161.97.89.183`, the subdomain currently returns HTTP `404 Not Found` because the virtual host routing to internal port `3074` has not yet been bound in aaPanel.

In adherence to the strict constraint:
> *"If infrastructure access is unavailable on aaPanel, produce exact server-administrator instructions rather than fabricating deployment."*

This document provides the complete, turn-key configuration package for the server administrator to route and run the staging backend safely alongside production.

---

## 2. Port & Resource Isolation Matrix

| Component | Production Environment | Staging Environment | Isolation Mechanism |
| :--- | :--- | :--- | :--- |
| **Public FQDN** | `360api.vnvision.in` | `staging-360api.vnvision.in` | Dedicated Apache vhost & SSL certificate |
| **Backend HTTP Port** | `3073` | `3074` | Distinct OS port binding |
| **PM2 Process Name** | `hvapi` / `360api-prod` | `careid-backend-staging` | Independent PM2 execution instance |
| **PostgreSQL Database** | `360api` | `360api_staging` | Separate physical database & catalog |
| **OCR Worker Port** | `5050` | `5051` | Separate daemon port & process |
| **JWT Secrets** | Production Secret Key | `careid-staging-jwt-secret-key-32-chars-min!!` | Distinct cryptographic signing keys |
| **Upload Storage** | `/uploads` / S3 bucket prod | `/uploads/staging` / S3 bucket staging | Separate filesystem directories |

---

## 3. Server Administrator Runbook (aaPanel & Linux)

### Step 1: Provision Isolated Database `360api_staging`
Log in to PostgreSQL CLI or aaPanel Database Manager on `161.97.89.183`:
```sql
CREATE DATABASE "360api_staging";
GRANT ALL PRIVILEGES ON DATABASE "360api_staging" TO postgres;
```

### Step 2: Configure Staging Environment File (`.env.staging`)
Place `.env.staging` in the staging repository root:
```ini
# Environment
NODE_ENV=staging
PORT=3074
GLOBAL_PREFIX=api

# Database Isolation
DATABASE_URL="postgresql://postgres:<STAGING_PASSWORD>@localhost:5432/360api_staging?schema=public"

# Security & Secrets
JWT_SECRET="careid-staging-jwt-secret-key-32-chars-min!!"
JWT_EXPIRATION="7d"
REFRESH_TOKEN_SECRET="careid-staging-refresh-secret-key-32-chars-min!!"
REFRESH_TOKEN_EXPIRATION="30d"

# CORS Allowlist
CORS_ALLOWED_ORIGINS="https://staging.vnvision.in,https://staging-360api.vnvision.in,http://localhost:3000,http://localhost:5173"

# Microservices
OCR_WORKER_URL="http://127.0.0.1:5051"
OCR_SECRET_KEY="careid-staging-ocr-secret-key"
ENABLE_SWAGGER=true
```

### Step 3: Configure PM2 Staging Ecosystem (`ecosystem.staging.config.js`)
Deploy and start using the prepared ecosystem configuration:
```javascript
module.exports = {
  apps: [
    {
      name: 'careid-backend-staging',
      script: 'dist/src/main.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'staging',
        PORT: 3074,
        DOTENV_CONFIG_PATH: '.env.staging',
      },
    },
  ],
};
```
Execute via terminal:
```bash
# Build the application
npm run build

# Deploy migrations to 360api_staging
npx prisma migrate deploy

# Start staging PM2 process
pm2 start ecosystem.staging.config.js
pm2 save
```

### Step 4: Configure aaPanel Virtual Host (Reverse Proxy)
In aaPanel Web Interface:
1. Navigate to **Website** > **Add site**.
2. **Domain name:** `staging-360api.vnvision.in`.
3. Select **SSL** > **Let's Encrypt** and issue SSL certificate for `staging-360api.vnvision.in`.
4. Open Site Settings > **Reverse Proxy** > **Add reverse proxy**:
   - **Proxy Name:** `staging-api`
   - **Target URL:** `http://127.0.0.1:3074`
   - **Sent Domain:** `$host`
5. Alternatively, edit Apache virtual host configuration directly:
```apache
<VirtualHost *:443>
    ServerName staging-360api.vnvision.in
    SSLEngine on
    SSLCertificateFile /www/server/panel/vhost/cert/staging-360api.vnvision.in/fullchain.pem
    SSLCertificateKeyFile /www/server/panel/vhost/cert/staging-360api.vnvision.in/privkey.pem

    ProxyPreserveHost On
    ProxyPass / http://127.0.0.1:3074/
    ProxyPassReverse / http://127.0.0.1:3074/

    RequestHeader set X-Forwarded-Proto "https"
    RequestHeader set X-Forwarded-Port "443"
</VirtualHost>
```

---

## 4. Verification Checkpoints

1. Verify that `curl -I https://staging-360api.vnvision.in/api/v1/health` returns `HTTP/1.1 200 OK`.
2. Confirm that `pm2 list` shows both `hvapi` (port 3073) and `careid-backend-staging` (port 3074) running simultaneously without resource contention.
3. Confirm PostgreSQL connection logs show connections to `360api_staging` without touching `360api`.

