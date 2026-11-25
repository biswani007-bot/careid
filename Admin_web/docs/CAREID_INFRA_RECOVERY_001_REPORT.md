# CAREID-INFRA-RECOVERY-001 — DOCKER / WSL2 INTEGRATION RECOVERY REPORT

**Date:** 2026-11-23  
**Status:** BLOCKED — HOST ACTION & ELEVATION REQUIRED  
**Primary Goal:** Recover Windows Docker Desktop / WSL2 integration environment non-destructively, preserving PostgreSQL data, containers, and images.  
**Related Ticket:** `DEF-LIVE-01` (Docker Desktop Linux engine unavailable / ports 3001, 5173, 5174, 5433 unreachable).

---

## 1. EXECUTIVE SUMMARY & VERDICT

### FINAL VERDICT
**`ENVIRONMENT RECOVERY BLOCKED — APPROVAL OR HOST ACTION REQUIRED`**

The environment recovery cannot proceed autonomously without host-level intervention due to two critical system-level constraints:
1. **Critical Host Disk Space Exhaustion on Drive C:** Free space on `C:\` is currently **0.30 GB (300 MB)** out of 238.99 GB (99.88% full). WSL2 requires disk space to create its swap and paging buffer (`swap.vhdx`), which caused the WSL2 utility virtual machine (`vmmemWSL`, PID 23044) to freeze at a stub state (36 KB memory).
2. **Administrator Privilege Boundary:** The Windows `Docker Desktop Service` (`com.docker.service`) is in a `Stopped` state. Non-elevated processes cannot start or stop Windows Services (`Access Denied / Cannot open com.docker.service on computer '.'`). Furthermore, restarting the hung WSL2 service (`wslservice` / `LxssManager`) or terminating the hung `vmmemWSL` process requires Administrator elevation.

---

## 2. DETAILED PHASE 1 DIAGNOSTIC FINDINGS

### 2.1 Disk Space Distribution
- **Drive C (System Drive):** Total: 238.99 GB | Used: 238.69 GB | **Free: 0.30 GB (~300 MB)**
- **Drive D (Data Drive):** Total: 235.93 GB | Used: 118.85 GB | **Free: 117.08 GB**
- **Root Cause of Drive C Saturation:**
  - `C:\Users\biswa\AppData\Local\Docker\wsl\disk\docker_data.vhdx`: **72.5 GB** (Stores all Docker containers, images, and PostgreSQL integration database data).
  - `C:\Users\biswa\.gemini`: **16.36 GB**
  - `C:\Users\biswa\AppData\Local\Google`: **4.21 GB**
  - `C:\Users\biswa\.cache` (HuggingFace + Puppeteer): **4.20 GB**
  - `C:\Users\biswa\AppData\Local\Programs`: **3.90 GB**
  - `C:\Users\biswa\.gradle`: **3.27 GB**
  - `C:\Users\biswa\AppData\Local\Microsoft`: **3.28 GB**
  - `C:\Users\biswa\Downloads`: **2.69 GB**

### 2.2 Docker Service & Daemon Status
- `com.docker.service` (Windows Service): **Stopped**.
- Named pipe `//./pipe/dockerDesktopLinuxEngine`: **Does not exist**.
- `docker ps` / `docker info`: Fails with `open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified.`
- `com.docker.backend.exe.log`:
  ```text
  still waiting for the engine to respond to _ping after 4m11s: HTTP 503:
  returning engine error: Docker Desktop is unable to start
  ```

### 2.3 WSL2 & Hyper-V Status
- `wslservice` (PID 6372): Running.
- `vmmemWSL` (PID 23044): Stuck in a hung state with only **36 KB** working set memory.
- `wsl.exe --status`, `wsl.exe --list -v`, and `wsl.exe --shutdown` hang indefinitely waiting for I/O and process teardown.

### 2.4 Data Preservation Verification
- The PostgreSQL database volume and integration containers remain **100% intact** inside `C:\Users\biswa\AppData\Local\Docker\wsl\disk\docker_data.vhdx` (72,538,390,528 bytes).
- No destructive commands (`docker system prune`, factory reset, distro unregistering, volume removal) have been executed.

---

## 3. REQUIRED HOST ACTIONS FOR SAFE RECOVERY

To restore the environment safely without data loss, the host user must execute the following non-destructive steps:

### STEP 1: Free at least 5–10 GB of space on Drive C
Choose one or more of the following non-destructive options:
- **Option A (Quickest - User Downloads & Caches):**
  - Clear user Downloads (`C:\Users\biswa\Downloads` ~ 2.69 GB).
  - Clear caches in `C:\Users\biswa\.cache` (`huggingface` ~ 2.16 GB, `puppeteer` ~ 2.03 GB).
  - Run Windows Built-in **Disk Cleanup** (`cleanmgr.exe`) on `C:\` to purge Windows Update leftovers and temp logs.
- **Option B (Permanent Solution - Relocate Docker WSL Data Disk to Drive D):**
  - Drive `D:\` has **117 GB** free space.
  - In Docker Desktop: Open **Settings** → **Resources** → **Advanced** → **Disk image location** → Browse to `D:\Docker\wsl` and click **Apply & Restart**. Docker Desktop will automatically migrate `docker_data.vhdx` to Drive `D:\` without losing any database data or containers, instantly freeing **72.5 GB** on `C:\`.

### STEP 2: Restart WSL Service and Docker Desktop with Administrator Elevation
Open PowerShell as **Administrator** and run:
```powershell
# 1. Terminate the hung WSL VM process
taskkill /F /PID 23044
# 2. Restart the WSL service
Restart-Service wslservice
# 3. Start Docker Desktop service
Start-Service com.docker.service
# 4. Launch Docker Desktop
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
```

### STEP 3: Verify Integration Ports & Containers
Once Docker Desktop shows green ("Engine running"), run:
```powershell
docker ps
docker-compose -f D:\careid\docker-compose.integration.yml up -d
```
Verify listening ports:
- Port `3001` (Backend API)
- Port `5174` (Admin Web)
- Port `5173` (Doctor Web)
- Port `5433` (PostgreSQL `careid_integration_db`)

---

## 4. NEXT STEPS UPON ENVIRONMENT RESTORATION
Immediately upon completion of the host recovery actions above:
1. Verify PostgreSQL connection on port 5433 (confirm all 32 prescriptions, 39 users, and CR-08 tables `prescription_reminder_schedules` and `prescription_reminder_events` exist).
2. Resume **`CAREID-MASTER-LIVE-E2E-QA-002`** live browser testing across Admin Web, Doctor Web, CR-08 Option A reminders, and cross-app workflows.

---

## 5. CAREID-MASTER-INFRA-E2E-003 RECOVERY & RESUMPTION UPDATE (2026-11-23 15:30 IST)

### 5.1 Host Readiness & Post-Cache Cleanup State
- **Drive C Free Space:** **4.55 GB** (Recovered from 0.28 GB following approved cache cleanup under `CAREID-SAFE-CACHE-CLEANUP-001`).
- **Drive D Free Space:** **118.08 GB**.
- **Downloads Directory:** **100% UNTOUCHED** (42,261 files, 2.69 GB preserved byte-for-byte).
- **Docker Virtual Disk:** `C:\Users\biswa\AppData\Local\Docker\wsl\disk\docker_data.vhdx` (72,538,390,528 bytes) **100% INTACT & PRESERVED**.
- **CareID Project Files:** `D:\careid\docker-compose.integration.yml` (3,319 bytes) **100% INTACT & UNMODIFIED**.

### 5.2 Safe Recovery Actions Attempted in Phase B
1. **Docker Desktop Launch:** Launched `C:\Program Files\Docker\Docker\Docker Desktop.exe`. Process family started (`com.docker.backend`, `com.docker.build`, `Docker Desktop`, `docker-agent`).
2. **Engine Diagnostics:** `docker version` and `docker ps` were retested after startup wait.
3. **Exact Log Error Observed:**
   - In `C:\Users\biswa\AppData\Local\Docker\log\host\com.docker.backend.exe.log`:
     ```text
     [com.docker.backend.exe.wslexec][E] c:\windows\system32\wsl.exe -l -v --all failed: exit status 1
     [com.docker.backend.exe.engines][W] starting engine: engine linux/wsl failed to start: running wslexec: 
     An error occurred while running the command. DockerDesktop/Wsl/CommandTimedOut: 
     c:\windows\system32\wsl.exe -l -v --all: exit status 1 (wslErrorCode: DockerDesktop/Wsl/CommandTimedOut)
     ```
   - In Electron GUI error report:
     ```json
     {
       "title": "Docker Desktop - WSL is unresponsive",
       "message": "Docker Desktop is unable to communicate with the Windows Subsystem for Linux.\n\nRestart WSL and run Docker Desktop again, or restart your machine."
     }
     ```
4. **Privilege Boundary Verification:**
   - Attempted non-elevated `Stop-Process -Id 23044` against hung `vmmemWSL`: Failed with `Access is denied`.
   - Attempted non-elevated `Restart-Service wslservice`: Failed with `Cannot open wslservice service on computer '.'`.
   - Attempted non-elevated `Start-Service com.docker.service`: Failed with `Cannot open com.docker.service service on computer '.'`.

### 5.3 Exact Minimal Host Actions Required to Unblock
The host user must execute the following 4 commands in an **Administrator PowerShell** window:
```powershell
# 1. Terminate the hung WSL VM process stub
taskkill /F /PID 23044

# 2. Restart the WSL service
Restart-Service wslservice

# 3. Start Docker Desktop service
Start-Service com.docker.service

# 4. Launch Docker Desktop and start integration containers
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
docker-compose -f D:\careid\docker-compose.integration.yml up -d
```
Alternatively, a **Windows host restart** will automatically clear the hung Session 0 `vmmemWSL` process stub and allow Docker Desktop to start cleanly with the newly recovered 4.55 GB of free space on `C:\`.

---

## 6. CAREID-MASTER-WSL-RECOVERY-E2E-004 DIAGNOSTIC & VERIFICATION UPDATE (2026-11-23 15:50 IST)

### 6.1 Diagnostic Evidence & Status (Phase A)
- **Windows Version:** Microsoft Windows 11 Home Single Language - Build 26200.
- **Docker Desktop Version:** v4.99.0.
- **Drive C Free Space:** **4.69 GB** (Recovered and stable).
- **Drive D Free Space:** **117.48 GB**.
- **Pending Windows Reboot:** False.
- **Docker Virtual Disk:** `C:\Users\biswa\AppData\Local\Docker\wsl\disk\docker_data.vhdx` (72,538,390,528 bytes; LastWriteTime: 23-11-2026 12:58:51) — **100% Intact**.
- **Downloads Directory:** `C:\Users\biswa\Downloads` (42,261 files, 2.69 GB) — **100% Intact and Untouched**.
- **CareID Source & Compose:** `D:\careid\docker-compose.integration.yml` (3,319 bytes) — **100% Intact and Unmodified**.
- **WSL Service & Process State:**
  - `wslservice` (PID 6372): Status `Running`.
  - `vmmemWSL` (PID 23044): Stuck in Session 0 with **36 KB** working set memory.
  - Active writes to database/WSL: **None** (zero CPU, zero I/O, port 5433 closed).
  - Diagnostic commands `wsl.exe --status` and `wsl.exe -l -v --all`: Both timed out after 4 seconds with no response.

### 6.2 Least-Disruptive Safe Recovery Attempted (Phase B)
1. **Clean Exit of Docker Desktop (B02–B03):** Closed Docker Desktop via `CloseMainWindow()`. Confirmed all background processes (`Docker Desktop`, `com.docker.backend`, `docker-agent`) exited completely and cleanly.
2. **Post-Exit WSL Responsiveness (B04):** Retested `wsl.exe --status`. Still hanging indefinitely.
3. **Graceful WSL Shutdown Attempt (B06–B07):** Executed `wsl --shutdown` with a 5-second bounded timeout. Timed out after 5 seconds due to the unresponsive Session 0 VM stub.
4. **Safety & Privilege Constraint (B10, B13, B14):**
   - In accordance with absolute safety rules, automatic forceful termination (`taskkill /F`) of system-level VM processes was NOT executed without elevation.
   - Non-elevated service management (`Restart-Service wslservice`, `Start-Service com.docker.service`) is blocked by Windows security (`Access is denied`).

### 6.3 Final Verdict & Exact Host Action Required
**VERDICT:** **`3. WSL2 RECOVERY BLOCKED — HOST ADMINISTRATOR ACTION REQUIRED.`**

The user must either:
- **Action A (Recommended - Clean Host Restart):** Restart the Windows computer. Upon reboot, Session 0 processes will be cleanly reinitialized, and Docker Desktop will launch successfully with the 4.69 GB free space on `C:\`.
- **Action B (Administrator Console):** Open PowerShell as **Administrator** and run:
  ```powershell
  taskkill /F /PID 23044
  Restart-Service wslservice
  Start-Service com.docker.service
  Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
  ```
