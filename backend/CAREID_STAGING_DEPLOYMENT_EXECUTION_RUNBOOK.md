# CareID Backend — Staging Deployment Execution Runbook (Direct Startup Script)

> [!CAUTION]
> **DEPLOYMENT READINESS VERDICT: NOT READY — DO NOT DEPLOY**
> 
> The CareID backend runs directly through an existing server startup script and is **NOT managed by PM2, systemd, or Docker**. Because remote server access is strictly prohibited in this audit session, the actual startup script, its filename, process behavior, PID handling, and logging destinations on `/www/wwwroot/360api.vnvision.in` **HAVE NOT BEEN INSPECTED**.
> 
> This runbook is a safety specification and execution guide. **Deployment must not proceed until the server operator completes the pre-checks in Section 2, inspects the actual startup script, and supplies the verified commands.**

---

## 1. Release & Target Environment Parameters

| Parameter | Specification / Verified Baseline |
| :--- | :--- |
| **Target Host IP** | `161.97.89.183` |
| **Public Staging Domain** | `https://360api.vnvision.in` |
| **Application Directory** | `/www/wwwroot/360api.vnvision.in` |
| **Internal Port** | `3073` (Reverse-proxied via Nginx 443/80) |
| **Process Manager** | **None (NO PM2, NO systemd, NO Docker)** |
| **Startup Mechanism** | **NOT VERIFIED** (Existing server-side script on staging host) |
| **Release Package** | `release/CareID_Backend_Staging_Release_2026-11-03.zip` |
| **Expected SHA-256** | `98AD41BE4517A194F079222634E2EB44AB3F22FC1D905CC5B225AE2BE0B7CF2B` |
| **Package Size** | `1,602,362 bytes` (1.53 MB, 1,124 verified files) |
| **Database Migrations** | **0 (Zero)** — strictly preserves the 144 existing PostgreSQL tables |

---

## 2. Server Startup Script Inspection (MANDATORY OPERATOR PRE-CHECK)

> [!WARNING]
> **DO NOT USE GUESSED COMMANDS (`nohup node`, `./start.sh`, `./run.sh`).**  
> The local repository does not contain a shell startup script. The script exists exclusively on the staging server. The operator must execute the following commands in the server terminal and record the exact behavior before executing the deployment:

```bash
# 1. Navigate to active application directory
cd /www/wwwroot/360api.vnvision.in

# 2. Inspect all shell scripts present in the active deployment
ls -la *.sh scripts/*.sh 2>/dev/null || true

# 3. Inspect the contents of the identified startup script
# (Replace <SCRIPT_NAME> with the actual script found, e.g., start.sh, run.sh, etc.)
cat <SCRIPT_NAME>
```

### Operator Verification Questionnaire (Must Be Completed Before Deployment):
1. **Script Filename:** What is the exact filename and path of the startup script?
2. **Invocation Method:** How does it launch Node.js? (e.g. `node dist/src/main.js`, `nohup`, background `&`, subshell)?
3. **Environment Loading:** Does the script export variables directly, or does it rely on `dotenv` reading `.env`?
4. **PID File Handling:** Does the script record a PID file (e.g. `echo $! > app.pid`) or maintain duplicate process prevention?
5. **Stdout / Stderr Logging:** Where does the script write output? (e.g. `logs/app.log`, `/dev/null`, or system logger)?
6. **Execution User:** Which Linux user account executes the script? (Do not assume `www`).

---

## 3. Dependency Installation & Prisma CLI Integrity Protocol

### 3.1 Lockfile Analysis & The Prisma CLI Challenge
Inspection of [`package.json`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/package.json) and [`package-lock.json`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/package-lock.json) reveals:
- Runtime client: `"@prisma/client": "^7.9.1"` (under `dependencies`)
- Prisma CLI: `"prisma": "^7.9.1"` (pinned to `7.10.1` under `devDependencies`)

> [!CAUTION]
> **The `npm ci --omit=dev` Trap:**  
> If an operator runs `npm ci --omit=dev`, `prisma` (the CLI package) is **omitted from installation**. Subsequently executing `npx prisma generate` forces `npx` to query the public npm registry to download an unpinned `prisma` version. This introduces three critical failure modes:
> 1. In non-interactive environments, `npx` prompts for stdin or fails immediately.
> 2. `npx` may download an incompatible major version (e.g. Prisma 8.x), breaking client generation against schema v7.9.
> 3. If the server has restricted internet egress, `npx` fails with network timeout.

### 3.2 Verified Safe Dependency & Generation Sequence
To guarantee lockfile fidelity without network version drift:

```bash
# 1. Install exact dependencies matching package-lock.json (including locked prisma CLI 7.10.1)
npm ci

# 2. Generate Prisma Client using the locally installed, pinned CLI binary (NO unpinned network download)
./node_modules/.bin/prisma generate

# 3. Prune development dependencies to leave a clean, secure production footprint
npm prune --omit=dev
```

---

## 4. Safe Process Termination Protocol

To prevent terminating unrelated processes or causing port 3073 collisions, the termination procedure validates every candidate process before signaling:

```bash
# 1. Discover all candidate PIDs holding port 3073
CANDIDATE_PIDS=$(lsof -t -i :3073 2>/dev/null || ss -lptn 'sport = :3073' 2>/dev/null | grep -o 'pid=[0-9]*' | cut -d= -f2 | sort -u)

if [ -z "$CANDIDATE_PIDS" ]; then
    echo "Notice: Port 3073 is not currently bound. Checking process table by command name:"
    CANDIDATE_PIDS=$(pgrep -f '[d]ist/src/main' || true)
fi

# 2. Validate candidate PIDs strictly
VALIDATED_PIDS=""
for PID in $CANDIDATE_PIDS; do
    if [ ! -d "/proc/$PID" ]; then
        continue
    fi
    
    PROC_EXE=$(readlink -f /proc/$PID/exe 2>/dev/null || true)
    PROC_CWD=$(readlink -f /proc/$PID/cwd 2>/dev/null || true)
    PROC_CMD=$(tr '\0' ' ' < /proc/$PID/cmdline 2>/dev/null || true)
    PROC_USER=$(ps -o user= -p $PID 2>/dev/null | tr -d ' ')
    
    echo "Evaluating PID $PID:"
    echo "  - User: $PROC_USER"
    echo "  - Exe:  $PROC_EXE"
    echo "  - Cwd:  $PROC_CWD"
    echo "  - Cmd:  $PROC_CMD"
    
    # Must be a Node process running CareID from the expected directory
    if [[ "$PROC_EXE" == *"node"* ]] && [[ "$PROC_CWD" == "/www/wwwroot/360api.vnvision.in"* ]]; then
        echo "  ✓ Confirmed CareID backend process."
        VALIDATED_PIDS="$VALIDATED_PIDS $PID"
    else
        echo "  ❌ DANGER: PID $PID is NOT the CareID backend! ABORTING PROCESS TERMINATION."
        echo "  Manual operator investigation required to protect unrelated processes."
        exit 1
    fi
done

# 3. Graceful Termination (SIGTERM)
if [ -n "$VALIDATED_PIDS" ]; then
    echo "Sending SIGTERM (kill -15) to validated PID(s): $VALIDATED_PIDS..."
    kill -15 $VALIDATED_PIDS
    
    # Wait up to 15 seconds for clean exit (flushing logs, closing DB pool)
    EXITED=0
    for i in {1..15}; do
        STILL_RUNNING=0
        for PID in $VALIDATED_PIDS; do
            if kill -0 "$PID" 2>/dev/null; then
                STILL_RUNNING=1
            fi
        done
        if [ "$STILL_RUNNING" -eq 0 ]; then
            EXITED=1
            echo "✓ Process(es) exited cleanly."
            break
        fi
        sleep 1
    done
    
    # If still running after 15 seconds, DO NOT AUTOMATICALLY SIGKILL
    if [ "$EXITED" -eq 0 ]; then
        echo "❌ ALERT: Process(es) $VALIDATED_PIDS did not exit within 15 seconds."
        echo "   Automatic SIGKILL is prohibited to prevent data corruption."
        echo "   Operator must inspect application logs and manually decide: kill -9 $VALIDATED_PIDS"
        exit 1
    fi
else
    echo "No running CareID process detected."
fi

# 4. Confirm Port 3073 is completely released
if lsof -i :3073 >/dev/null 2>&1; then
    echo "❌ ERROR: Port 3073 is still occupied! Cannot continue."
    lsof -i :3073
    exit 1
fi
echo "✓ Port 3073 confirmed released."
```

---

## 5. Persistent Data Protection & Maintenance Sequence

> [!IMPORTANT]
> **Data Loss Prevention:**  
> Copying `data/`, `uploads/`, and logs *before* stopping the application creates a critical race condition: any write occurring during the build or preflight will be lost.  
> **Rule:** Code extraction and dependencies are prepared offline while the old application runs. Persistent data synchronization occurs **ONLY AFTER** the running process is stopped and writes are frozen.

### 5.1 Pre-Stop Staging Phase (Application Remains Online)

```bash
# 1. Define deployment parameters (self-contained, no external session reliance)
export APP_DIR="/www/wwwroot/360api.vnvision.in"
export RELEASES_DIR="/www/releases/360api"
export BACKUP_DIR="/www/backups/360api"
export TIMESTAMP=$(date +%Y%m%d_%H%M%S)
export STAGE_DIR="${RELEASES_DIR}/release_${TIMESTAMP}"

# 2. Extract release archive in isolated staging folder
mkdir -p "${STAGE_DIR}"
mkdir -p /www/releases/packages
PACKAGE_FILE="/www/releases/packages/CareID_Backend_Staging_Release_2026-11-03.zip"

EXPECTED_SHA="98ad41be4517a194f079222634e2eb44ab3f22fc1d905cc5b225ae2be0b7cf2b"
ACTUAL_SHA=$(sha256sum "$PACKAGE_FILE" | awk '{print tolower($1)}')
if [ "$ACTUAL_SHA" != "$EXPECTED_SHA" ]; then
    echo "❌ CHECKSUM MISMATCH! Aborting."
    exit 1
fi
unzip -q "$PACKAGE_FILE" -d "${STAGE_DIR}"

# 3. Execute safe dependency installation & Prisma generation in staged directory
cd "${STAGE_DIR}"
npm ci
./node_modules/.bin/prisma generate
npm prune --omit=dev

# 4. Verify pre-compiled bundle exists
test -f dist/src/main.js && echo "✓ dist/src/main.js present in staged release."
```

---

### 5.2 Maintenance Window & Process Stop Phase (Writes Frozen)

```bash
# 1. Announce or initiate maintenance window (Nginx reverse proxy can optionally return 503)

# 2. Execute Section 4 Safe Process Termination Protocol to stop active CareID process
# (Run Section 4 script block here)
# Port 3073 is now released. Zero writes can occur to disk.
```

---

### 5.3 Post-Stop Final Persistent Data Synchronization Phase

Now that the application is stopped, perform the final synchronization:

```bash
# 1. Copy live .env into staged release with strict 600 permissions
cp -a "${APP_DIR}/.env" "${STAGE_DIR}/.env"
chmod 600 "${STAGE_DIR}/.env"
echo "✓ Live .env synchronized (chmod 600)."

# 2. Synchronize all local JSON stores in data/
mkdir -p "${STAGE_DIR}/data"
if [ -d "${APP_DIR}/data" ]; then
    cp -a "${APP_DIR}/data/." "${STAGE_DIR}/data/"
    echo "✓ Persistent data/ stores synchronized (support-tickets, financing, pets)."
fi

# 3. Synchronize clinical uploads directory
if [ -d "${APP_DIR}/uploads" ]; then
    cp -a "${APP_DIR}/uploads" "${STAGE_DIR}/"
    echo "✓ Uploaded clinical documents and avatars synchronized."
else
    mkdir -p "${STAGE_DIR}/uploads"
fi

# 4. Synchronize application logs
mkdir -p "${STAGE_DIR}/logs"
if [ -d "${APP_DIR}/logs" ]; then
    cp -a "${APP_DIR}/logs/." "${STAGE_DIR}/logs/"
fi

# 5. Synchronize the verified server-side startup script(s)
# (Copy identified script from Section 2)
if [ -f "${APP_DIR}/<VERIFIED_SCRIPT_NAME>" ]; then
    cp -a "${APP_DIR}/<VERIFIED_SCRIPT_NAME>" "${STAGE_DIR}/"
    chmod 750 "${STAGE_DIR}/<VERIFIED_SCRIPT_NAME>"
    echo "✓ Server startup script preserved."
fi

# 6. Run pre-flight check in staged directory with live .env
cd "${STAGE_DIR}"
node scripts/deploy-preflight.js
if [ $? -ne 0 ]; then
    echo "❌ PREFLIGHT FAILED! Do not proceed to directory swap."
    exit 1
fi
```

---

### 5.4 Directory Replacement & Permission Hardening Phase

```bash
# 1. Determine verified application user and group (from pre-check)
export APP_USER="<VERIFIED_APP_USER>"
export APP_GROUP=$(id -gn "$APP_USER")

# 2. Set directory permissions: 750 for code; 770 for writable data/uploads/logs
find "${STAGE_DIR}" -type d -exec chmod 750 {} +
chmod 770 "${STAGE_DIR}/data" "${STAGE_DIR}/uploads" "${STAGE_DIR}/logs" 2>/dev/null || true

# 3. Set regular file permissions: 640; .env strictly 600
find "${STAGE_DIR}" -type f -exec chmod 640 {} +
chmod 600 "${STAGE_DIR}/.env"
find "${STAGE_DIR}/uploads" -type f -exec chmod 640 {} + 2>/dev/null || true

# 4. Preserve executable permissions for node binaries and shell scripts
chmod -R 750 "${STAGE_DIR}/node_modules/.bin" 2>/dev/null || true
find "${STAGE_DIR}" -maxdepth 2 -type f -name "*.sh" -exec chmod 750 {} + 2>/dev/null || true

# 5. Enforce ownership
chown -R "${APP_USER}:${APP_GROUP}" "${STAGE_DIR}"

# 6. Physical Directory Replacement
cd /www/wwwroot
mv "${APP_DIR}" "${APP_DIR}.prev_${TIMESTAMP}"
mv "${STAGE_DIR}" "${APP_DIR}"

if [ ! -d "${APP_DIR}" ]; then
    echo "❌ CRITICAL: Directory move failed! Restoring previous version..."
    mv "${APP_DIR}.prev_${TIMESTAMP}" "${APP_DIR}"
    exit 1
fi

chown -R "${APP_USER}:${APP_GROUP}" "${APP_DIR}"
chmod 600 "${APP_DIR}/.env"
echo "✓ Application directory replaced successfully."
```

---

### 5.5 Launch Phase via Verified Server Startup Script

> [!NOTE]
> The operator must execute the exact, verified startup command identified in Section 2. Do not guess.

```bash
cd "${APP_DIR}"

# Execute verified startup script as the designated application user:
su -s /bin/bash "${APP_USER}" -c "cd ${APP_DIR} && <VERIFIED_STARTUP_COMMAND>"

# Wait for process initialization
sleep 5

# Confirm process is running and bound to port 3073
NEW_PID=$(lsof -ti :3073 2>/dev/null)
if [ -n "$NEW_PID" ]; then
    echo "✓ CareID backend successfully launched: PID ${NEW_PID} on port 3073."
    ps -fp ${NEW_PID}
else
    echo "❌ LAUNCH FAILED: Port 3073 not bound. Check logs immediately."
    exit 1
fi
```

---

## 6. Self-Contained Emergency Rollback Runbook

> [!IMPORTANT]
> **Rollback Invariants:**  
> - Must not depend on terminal variables from a previous session.
> - Must validate that the rollback source exists, contains `dist/src/main.js`, and contains `.env` before touching the active directory.
> - Preserves the failed release for forensic investigation.

```bash
# 1. Define self-contained paths
export APP_DIR="/www/wwwroot/360api.vnvision.in"
export ROLLBACK_SOURCE=$(ls -dt /www/wwwroot/360api.vnvision.in.prev_* 2>/dev/null | head -n 1)

if [ -z "$ROLLBACK_SOURCE" ]; then
    echo "No .prev directory found, checking backups..."
    export ROLLBACK_SOURCE=$(ls -dt /www/backups/360api/backup_* 2>/dev/null | head -n 1)
fi

echo "Identified rollback source: ${ROLLBACK_SOURCE}"

# 2. Pre-Rollback Validation (Fail-Safe Checks)
if [ -z "$ROLLBACK_SOURCE" ] || [ ! -d "$ROLLBACK_SOURCE" ]; then
    echo "❌ FATAL: No valid rollback directory located! Halting rollback."
    exit 1
fi

if [ ! -f "${ROLLBACK_SOURCE}/dist/src/main.js" ]; then
    echo "❌ FATAL: Rollback source missing dist/src/main.js! Halting."
    exit 1
fi

if [ ! -f "${ROLLBACK_SOURCE}/.env" ]; then
    echo "❌ FATAL: Rollback source missing .env file! Halting."
    exit 1
fi
echo "✓ Rollback source integrity confirmed."

# 3. Stop Failed Process Gracefully (SIGTERM)
FAILED_PID=$(lsof -ti :3073 2>/dev/null || pgrep -f '[d]ist/src/main' | head -n 1)
if [ -n "$FAILED_PID" ]; then
    echo "Stopping failed PID ${FAILED_PID} via SIGTERM..."
    kill -15 ${FAILED_PID} 2>/dev/null || true
    sleep 3
    if kill -0 ${FAILED_PID} 2>/dev/null; then
        echo "⚠️ Failed process did not exit; terminating..."
        kill -9 ${FAILED_PID} 2>/dev/null || true
    fi
fi

# 4. Preserve Failed Release & Restore Previous Directory
TIMESTAMP_RB=$(date +%Y%m%d_%H%M%S)
cd /www/wwwroot
mv "${APP_DIR}" "${APP_DIR}.failed_${TIMESTAMP_RB}"

if [[ "$ROLLBACK_SOURCE" == *".prev_"* ]]; then
    mv "${ROLLBACK_SOURCE}" "${APP_DIR}"
else
    mkdir -p "${APP_DIR}"
    cp -a "${ROLLBACK_SOURCE}/." "${APP_DIR}/"
fi

# 5. Restore Permissions & Ownership
APP_USER=$(stat -c '%U' "$APP_DIR" 2>/dev/null || echo "www")
APP_GROUP=$(id -gn "$APP_USER" 2>/dev/null || echo "$APP_USER")

chown -R "${APP_USER}:${APP_GROUP}" "${APP_DIR}"
chmod 600 "${APP_DIR}/.env"
chmod 770 "${APP_DIR}/data" "${APP_DIR}/uploads" "${APP_DIR}/logs" 2>/dev/null || true

# 6. Launch Restored Release via Verified Startup Script
cd "${APP_DIR}"
su -s /bin/bash "${APP_USER}" -c "cd ${APP_DIR} && <VERIFIED_STARTUP_COMMAND>"
sleep 5

# 7. Verify Port 3073 and Restored Health
RESTORED_PID=$(lsof -ti :3073 2>/dev/null)
if [ -n "$RESTORED_PID" ]; then
    echo "✓ Rollback SUCCESSFUL: PID ${RESTORED_PID} listening on port 3073."
    curl -i http://127.0.0.1:3073/api/v1/health
else
    echo "❌ ROLLBACK FAILED: Port 3073 not bound after rollback!"
    exit 1
fi
```

---

## 7. Post-Deployment Smoke Test Protocol

Verify all endpoints with authorized credentials:

```bash
# 1. Health Probe
curl -s -X GET https://360api.vnvision.in/api/v1/health
# Expected: HTTP 200 OK, {"status":"ok","service":"HVAPI Backend"}

# 2. Database Readiness Probe
curl -s -X GET https://360api.vnvision.in/api/v1/ready
# Expected: HTTP 200 OK, {"status":"ready","database":"connected"}

# 3. Password Authentication
LOGIN_RESPONSE=$(curl -s -X POST https://360api.vnvision.in/api/v1/auth/password/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "<STAGING_ADMIN_IDENTIFIER>",
    "password": "<STAGING_ADMIN_PASSWORD>"
  }')
ADMIN_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

# 4. Executive Dashboard (Verified Exact Route)
curl -s -X GET https://360api.vnvision.in/api/v1/reports/dashboard/executive \
  -H "Authorization: Bearer ${ADMIN_TOKEN}"
# Expected: HTTP 200 OK with dashboard metrics

# 5. Referrals Scoping
curl -s -X GET https://360api.vnvision.in/api/v1/referrals \
  -H "Authorization: Bearer ${ADMIN_TOKEN}"
# Expected: HTTP 200 OK

# 6. Security Consents RBAC
curl -s -X GET https://360api.vnvision.in/api/v1/security/consents \
  -H "Authorization: Bearer ${ADMIN_TOKEN}"
# Expected: HTTP 200 OK

# 7. Notifications Aliases (Plural & Singular)
curl -s -o /dev/null -w "Plural: %{http_code}\n" -X GET https://360api.vnvision.in/api/v1/notifications -H "Authorization: Bearer ${ADMIN_TOKEN}"
curl -s -o /dev/null -w "Singular: %{http_code}\n" -X GET https://360api.vnvision.in/api/v1/notification -H "Authorization: Bearer ${ADMIN_TOKEN}"
# Expected: Both return 200 OK
```
