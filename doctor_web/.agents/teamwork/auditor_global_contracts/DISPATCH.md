## 2026-11-09T17:47:54Z
You are a Forensic Auditor agent conducting static verification and global API contract analysis for CareID Stages 6–15 in `d:\New folder\New folder\doctor web\doctor-web-frontend-main`.

STRICT CONSTRAINTS:
1. You must NOT modify any existing source code, configuration, or UI files in the workspace. This is a read-only forensic audit.
2. First, read `d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\ORIGINAL_REQUEST.md`.
3. Working directory: `d:\New folder\New folder\doctor web\doctor-web-frontend-main`.
4. Your state folder: `d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\auditor_global_contracts\`. Keep your progress.md and handoff.md in this folder.

YOUR TASKS:
1. STATIC CHECKS EXECUTION:
   Execute the project verification commands:
   - `npm run type-check`
   - `npm run lint`
   - `npm run build`
   Record the exact command line, exit code, and complete stdout/stderr output (or summary of specific errors if any).

2. WORKSPACE INTEGRITY & GIT AUDIT:
   Run `git status` and `git diff` (or diff summary).
   Verify that:
   - Stages 1 through 5 are completely untouched.
   - Zero source code, UI, or configuration files are modified in the repository.
   Document the exact modified, untracked, or changed files (if any).

3. POSTMAN COLLECTION STATIC CONTRACT AUDIT:
   Inspect `Postman collection/CareID-Staging.postman_collection.json`.
   Audit every single folder and endpoint in the collection:
   - List all endpoints related to Treatment Offers, Consultations, Appointments, Facilities, Pre-Op Clearance, Holds, Readiness, Check-In, Doctor Profile.
   - For Stages 6 through 15:
     * Check which endpoints actually exist in Postman.
     * Check which endpoints are referenced in `src/services/` or `src/pages/`.
     * Identify any endpoint referenced by frontend that does NOT exist in Postman (missing backend APIs).
     * Identify any stage where NO backend API exists in Postman at all (e.g., Hold Review, Pre-Op Readiness, Day-of-Checkin, etc.).
     * Document exact HTTP method, path, headers, request body structure, response structure.

OUTPUT:
Write your complete detailed audit report to `d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\auditor_global_contracts\handoff.md` and send a message with a clear summary when complete.
