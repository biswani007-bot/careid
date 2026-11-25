# 07 — DEPLOYMENT AND ROLLBACK REVIEW
**Project:** CareID Healthcare Ecosystem (Backend API)  
**Date:** November 18, 2026  
**Auditor:** Principal DevOps Release Engineer, Infrastructure Specialist  
**Audit Mode:** STRICT READ-ONLY OPERATIONAL RUNBOOK AUDIT  

---

## 1. RUNTIME & DEPENDENCY VULNERABILITY AUDIT

### 1.1. The `npm ci --omit=dev` and Prisma CLI Risk
The supplied deployment runbook specifies the following command sequence:
```bash
npm ci --omit=dev
npx prisma migrate deploy
npx prisma generate
```

### Forensic Issue Identified
In [package.json](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/package.json):
- `"prisma": "^7.9.1"` is declared in **`devDependencies`** (line 66).
- `"@prisma/client": "^7.9.1"` is declared in **`dependencies`** (line 39).

When `npm ci --omit=dev` is executed:
1. `npm` removes all packages listed under `devDependencies`, including `node_modules/prisma` and its binary link `node_modules/.bin/prisma`.
2. When `npx prisma migrate deploy` is subsequently invoked, `npx` will detect that `prisma` is not present locally in `node_modules/.bin`.
3. `npx` will attempt to dynamically download the latest `prisma` package from the public npm registry over the internet.
4. **Failure Modes:**
   - If the server has restricted internet access or strict firewall rules, the command will fail immediately with `npx: command not found` or network timeout.
   - If the download succeeds, `npx` may download a newer major/minor version than `7.9.1`, introducing unpinned, untested schema compilation differences.
   - It unnecessarily increases staging deployment time by 30–60 seconds on every run.

### Corrective Operational Recommendation
On the staging server, execute `npm ci` **without** `--omit=dev` so that the exact pinned `prisma: ^7.9.1` CLI is preserved locally:
```bash
npm ci
npx prisma migrate deploy
npx prisma generate
```

---

## 2. PM2 EXECUTION MODE & DOWNTIME REALITY

### 2.1. Fork Mode vs "Zero-Downtime" Claim
The deployment report claimed "zero-downtime cluster reload via `pm2 reload hvapi --update-env`."

Forensic inspection of [ecosystem.config.js](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/ecosystem.config.js) reveals:
```javascript
module.exports = {
  apps: [
    {
      name: 'careid-backend-api',
      script: 'dist/src/main.js',
      instances: 1,
      exec_mode: 'fork', // Fork mode ensures stable Prisma connection pool handling and prevents port contention
      autorestart: true,
      ...
    },
  ],
};
```

### Forensic Finding
- `exec_mode: 'fork'` with `instances: 1` **cannot** provide zero-downtime reloading in PM2.
- In fork mode with a single instance, `pm2 reload` sends `SIGINT`/`SIGKILL` to the running process, waits for it to exit, and then starts a fresh Node.js process.
- During the 2–5 seconds while the NestJS framework initializes TypeScript metadata, establishes PostgreSQL connection pools, and begins listening on port 3073, all incoming HTTP requests will receive `502 Bad Gateway` from Nginx.
- **Auditor Note:** In a staging environment, a 3-second restart window during scheduled maintenance is completely acceptable, but release documentation must honestly reflect that maintenance requires a brief connection drop rather than promising uninterrupted zero-downtime clustering.

### 2.2. PM2 Process Name Reconciliation
- `ecosystem.config.js` defines `name: 'careid-backend-api'`.
- aaPanel server process table lists `name: 'hvapi'`.
- Running `pm2 reload hvapi --update-env` operates correctly because PM2 targets the active process by its runtime registered name (`hvapi`).

---

## 3. RELEASE EXTRACTION & RUNBOOK SAFETY

### 3.1. In-Place Archive Extraction
The runbook commands `unzip -o CareID_Master_Backend_Production_Ready_Deployment_2026-11-18.zip` directly in `/www/wwwroot/360api.vnvision.in`.

**Risks:**
- If the archive extraction is terminated mid-flight (e.g. disk quota or disconnect), the server is left with a mixture of old and new compiled files in `dist/`.
- Stale compiled files that were deleted in source but remain in the destination directory are not removed by `unzip -o`.

**Recommendation:**
Always execute a timestamped pre-deployment snapshot before extraction:
```bash
BACKUP_DIR="/www/backup/hvapi_pre_deploy_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r dist prisma package.json "$BACKUP_DIR/"
```

---

## 4. ROLLBACK STRATEGY EVALUATION

### 4.1. Deficiencies in the Existing Rollback Plan
The existing rollback documentation states:
`cp -r /www/backup/hvapi_pre_master_[TIMESTAMP]/dist ./`
`pm2 reload hvapi --update-env`

**Why this is inadequate:**
1. **Ignores Database Mutations:** If a migration introduced schema changes, restoring `dist/` leaves the old code running against a modified schema.
2. **Ignores Dependency Changes:** If `package.json` was updated, restoring only `dist/` leaves inconsistent `node_modules`.
3. **Ignores Prisma Client:** If Prisma client was regenerated against a new schema, restoring only `dist/` causes runtime model mismatches.

### 4.2. Corrected Production-Grade Rollback Plan

The rollback procedure must separate application code rollback from database state restoration:

#### Stage A: Application Code Rollback
```bash
cd /www/wwwroot/360api.vnvision.in

# 1. Restore complete application snapshot (dist, prisma schema, package manifests)
cp -r "$BACKUP_DIR"/dist ./
cp -r "$BACKUP_DIR"/prisma ./
cp "$BACKUP_DIR"/package.json ./
cp "$BACKUP_DIR"/package-lock.json ./

# 2. Re-align dependencies & regenerate Prisma client
npm ci
npx prisma generate

# 3. Reload PM2 process
pm2 reload hvapi --update-env
```

#### Stage B: Database State Rollback (If Migration Failed)
Because Prisma does not generate automated down migrations, database recovery requires restoring the pre-deployment `pg_dump` snapshot:
```bash
# Terminate existing connections to database
psql -U postgres -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'hvapi_db' AND pid <> pg_backend_pid();"

# Restore database snapshot
pg_restore -U postgres -d hvapi_db --clean --if-exists "/www/backup/hvapi_db_pre_deploy_[TIMESTAMP].dump"
```

---

## 5. CORRECTED OPERATOR STAGING RUNBOOK

```bash
#!/usr/bin/env bash
set -e

# ==============================================================================
# CareID Staging Release Deployment Runbook (Corrected & Hardened)
# Environment: https://360api.vnvision.in/api/v1 (Port 3073)
# ==============================================================================

TARGET_DIR="/www/wwwroot/360api.vnvision.in"
BACKUP_DIR="/www/backup/hvapi_pre_deploy_$(date +%Y%m%d_%H%M%S)"
ZIP_NAME="CareID_Master_Backend_Production_Ready_Deployment_2026-11-18.zip"
EXPECTED_SHA="c5ec528941e6b693e26ec96026f9d181fcac9896bae4d562f82f56d48596fad2"

cd "$TARGET_DIR"

# 1. Checksum verification
echo "==> Verifying archive SHA-256..."
CALCULATED_SHA=$(sha256sum "$ZIP_NAME" | awk '{print $1}')
if [ "$CALCULATED_SHA" != "$EXPECTED_SHA" ]; then
  echo "ERROR: SHA256 mismatch! Expected $EXPECTED_SHA, got $CALCULATED_SHA"
  exit 1
fi
echo "SHA-256 verified successfully."

# 2. Pre-deployment backups
echo "==> Creating pre-deployment filesystem backup at $BACKUP_DIR..."
mkdir -p "$BACKUP_DIR"
cp -r dist prisma package.json package-lock.json "$BACKUP_DIR/"

echo "==> Creating pre-deployment PostgreSQL database dump..."
pg_dump -U postgres -d hvapi_db -F c -b -v -f "$BACKUP_DIR/hvapi_db_pre_deploy.dump"

# 3. Extract release archive
echo "==> Extracting release package..."
unzip -o "$ZIP_NAME"

# 4. Dependency alignment (Run npm ci WITHOUT --omit=dev to keep Prisma CLI)
echo "==> Installing dependencies and aligning Prisma..."
npm ci
npx prisma migrate deploy
npx prisma generate

# 5. Process restart
echo "==> Reloading PM2 process hvapi..."
pm2 reload hvapi --update-env

# 6. Post-deployment smoke check
echo "==> Verifying API health..."
curl -s -f http://127.0.0.1:3073/api/v1/health || {
  echo "WARNING: Health check failed on port 3073!"
  exit 1
}
echo "Deployment completed successfully."
```
