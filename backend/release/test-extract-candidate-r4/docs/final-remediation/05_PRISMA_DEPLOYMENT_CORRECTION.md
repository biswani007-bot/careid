# CAREID MASTER BACKEND — PRISMA DEPLOYMENT DEPENDENCY RECONCILIATION

**Document ID:** CRID-DOC-REM-05  
**Component:** DevOps Release Pipeline & Database Tooling  
**Target Environment:** Staging (`https://360api.vnvision.in`)  
**Server Path:** `/www/wwwroot/360api.vnvision.in`  

---

## 1. Problem Statement & Risk Analysis

In historical runbooks and operator transcripts, the deployment command executed on the Linux host was:
```bash
npm ci --omit=dev
```
While this command cleanly installs production runtime packages (`@nestjs/*`, `@prisma/client`, `pg`, `pino`, etc.), it omits `devDependencies`. In `package.json`, the Prisma CLI is categorized as:
```json
"devDependencies": {
  "prisma": "^7.9.1"
}
```

### Risk Manifestation:
1. `npm ci --omit=dev` strips `node_modules/.bin/prisma`.
2. When the operator subsequent executes:
   ```bash
   npx prisma migrate status
   npx prisma generate
   ```
   `npx` detects that `prisma` is not present locally in `node_modules/.bin` and attempts to dynamically download the latest version of `prisma` from `https://registry.npmjs.org/` at execution time.
3. This creates two critical vulnerabilities:
   - **Non-deterministic version drift:** A newer major/minor Prisma CLI might be downloaded that behaves differently from the pinned `@prisma/client` version `7.9.1`.
   - **Network failure risk:** If internet access from the server to npmjs.org times out or fails, the deployment halts with an unhandled exception.

---

## 2. Definitive Reconciliation & Standardized Command Sequence

### Standard Deterministic Approach (Recommended)
On the staging host `/www/wwwroot/360api.vnvision.in`, run:
```bash
npm ci
```
Because the deployment package contains the locked `package-lock.json` with pinned `prisma@7.9.1`, `npm ci` installs the exact, reproducible binary directly into `node_modules/.bin/prisma`. Subsequent commands execute instantly offline without accessing npmjs.org.

### Alternative Production-Hardened Approach (If devDependencies are strictly omitted)
If the operator must omit development dependencies to minimize disk footprint, the pinned CLI must be installed explicitly:
```bash
npm ci --omit=dev
npm install --no-save --no-audit prisma@7.9.1
```
This ensures that `prisma` version `7.9.1` is guaranteed to match `@prisma/client@7.9.1`.

---

## 3. Verified Staging Command Sequence

The authoritative operational sequence for staging deployment is:

```bash
# Navigate to deployment root
cd /www/wwwroot/360api.vnvision.in

# 1. Deterministic package installation (pinned Prisma CLI included)
npm ci

# 2. Generate Prisma Client from schema.prisma
npx prisma generate

# 3. Verify database migration status (all 7 migrations already applied)
npx prisma migrate status

# 4. Preflight validation
node scripts/deploy-preflight.js

# 5. Zero-downtime PM2 reload
pm2 reload ecosystem.config.js || pm2 reload careid-backend-api || pm2 reload hvapi

# 6. Verify health endpoint
node scripts/server-healthcheck.js
```

---
**Verified By:** DevOps Release Engineer  
**Status:** FULLY RECONCILED & DOCUMENTED
