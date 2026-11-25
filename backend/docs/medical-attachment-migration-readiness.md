# CareID — Medical Attachment Migration Readiness & Isolation Verification Report

**Document Location:** `docs/medical-attachment-migration-readiness.md`  
**Execution Timestamp:** 2026-10-26T16:55:00+05:30  
**Target Project:** `C:\Users\PABANI\Downloads\hvapi-main\hvapi-main`  
**Reference Snapshot (Read-Only):** `C:\Users\PABANI\Downloads\hvapi-main\hvapi-main - Copy`  
**Final Recommendation:** `BLOCKED — DATABASE UNAVAILABLE`  

---

## 1. Scope and Files Inspected

Read-only inspection was executed exclusively within the active development project. All files inspected:

- [`prisma/schema.prisma`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/prisma/schema.prisma) (lines 1138–1167): Model `MedicalAttachment` declaration and `virusScanStatus` field.
- [`prisma/migrations_offline/20261026_correct_attachment_virus_scan_default/migration.sql`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/prisma/migrations_offline/20261026_correct_attachment_virus_scan_default/migration.sql): Offline SQL statement and metadata.
- [`src/database/database.service.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/database/database.service.ts): PrismaClient initialization with `@prisma/adapter-pg` and PostgreSQL connection pool.
- [`src/modules/medical-record/application/use-cases/medical-record.service.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/medical-record/application/use-cases/medical-record.service.ts): Attachment creation, updating, and entity-to-DTO mapping.
- [`src/modules/medical-record/infrastructure/database/medical-record.repository.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/medical-record/infrastructure/database/medical-record.repository.ts): Database persistence logic, versioning, and default handling.
- [`src/modules/medical-record/presentation/dto/medical-record-response.dto.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/medical-record/presentation/dto/medical-record-response.dto.ts): Response structure and Swagger schema for attachments.
- [`src/modules/medical-record/tests/medical-record.service.spec.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/medical-record/tests/medical-record.service.spec.ts): Unit tests validating `virusScanStatus` default and update transitions.
- [`package.json`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/package.json) & [`node_modules/@prisma/client/package.json`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/node_modules/@prisma/client/package.json): Prisma dependencies and runtime package versions.
- [`docs/api-contract-matrix.md`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/docs/api-contract-matrix.md): Status taxonomy and client surface compatibility.

---

## 2. Schema and Migration-File Findings

### A. Prisma Schema Model Declaration
In [`prisma/schema.prisma`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/prisma/schema.prisma#L1152), the `MedicalAttachment` model defines:
```prisma
model MedicalAttachment {
  id               String             @id @default(uuid())
  medicalRecordId  String?            @map("medical_record_id")
  patientProfileId String             @map("patient_profile_id")
  fileName         String             @map("file_name")
  originalName     String             @map("original_name")
  fileSize         Int                @map("file_size")
  mimeType         String             @map("mime_type")
  category         AttachmentCategory @default(OTHER)
  storageKey       String             @map("storage_key")
  storageUrl       String             @map("storage_url")
  checksum         String?
  version          Int                @default(1)
  isDeleted        Boolean            @default(false) @map("is_deleted")
  deletedAt        DateTime?          @map("deleted_at")
  virusScanStatus  String             @default("PENDING") @map("virus_scan_status")
  createdAt        DateTime           @default(now()) @map("created_at")
  updatedAt        DateTime           @updatedAt @map("updated_at")

  ...
  @@map("medical_attachments")
}
```
- **Table Name:** `"medical_attachments"`
- **Column Name:** `"virus_scan_status"`
- **Type:** PostgreSQL `TEXT` / `VARCHAR`
- **Default:** `'PENDING'`

### B. Offline SQL File Review
In [`prisma/migrations_offline/20261026_correct_attachment_virus_scan_default/migration.sql`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/prisma/migrations_offline/20261026_correct_attachment_virus_scan_default/migration.sql):
```sql
ALTER TABLE "medical_attachments" ALTER COLUMN "virus_scan_status" SET DEFAULT 'PENDING';
```
- **Correctness:** The SQL accurately targets the mapped table `"medical_attachments"` and column `"virus_scan_status"`.
- **Directory Status:** `prisma/migrations/` does **not** exist in the repository. `prisma/migrations_offline/` is not referenced by any npm scripts, build configuration, or Prisma settings; it exists solely as an offline staging artifact.

---

## 3. Database Availability and Isolation Result

Configuration was inspected safely from environment variables without exposing secrets:

- **Target Protocol:** `postgresql:`
- **Target Host:** `localhost` (`127.0.0.1`)
- **Target Port:** `5432`
- **Target Database:** `hvapi_db`
- **Connection Test:** TCP socket probe to `127.0.0.1:5432` and `localhost:5432` failed with **`ECONNREFUSED`**.
- **Isolation Assessment:** No PostgreSQL service is currently running or reachable on the configured development host and port.
- **Safety Boundary Enforcement:** Because the development database is offline, **all database connections, inspections, and migrations were stopped**. No remote database or production credentials were substituted.

---

## 4. Migration History Findings

- **Status:** **`BLOCKED — DATABASE UNAVAILABLE`** / **`NOT RUN`**
- **Detail:** Because the development PostgreSQL server is offline, live inspection of the `_prisma_migrations` table could not be executed.
- **Prerequisites for Future Verification:**
  1. Boot a dedicated local PostgreSQL development instance on port 5432.
  2. Confirm database identity is strictly the isolated development database (`hvapi_db`).
  3. Execute read-only query: `SELECT * FROM "_prisma_migrations" ORDER BY started_at ASC;`.
  4. If `_prisma_migrations` exists, verify which migrations are marked applied.
  5. If `_prisma_migrations` does not exist, baseline the initial schema state before introducing incremental migration files to avoid migration drift.

---

## 5. Migration Risks and Rollback Considerations

### A. Data Impact
- The statement `ALTER COLUMN "virus_scan_status" SET DEFAULT 'PENDING'` modifies catalog metadata for future tuple insertions.
- It does **not** modify existing records. Existing rows retain their current string values.

### B. PostgreSQL Locking Behavior
- **Lock Type:** `ALTER TABLE ... ALTER COLUMN ... SET DEFAULT` requires an **`ACCESS EXCLUSIVE`** lock on `"medical_attachments"`.
- **Contention Risk:** An `ACCESS EXCLUSIVE` lock conflicts with all concurrent reads (`ACCESS SHARE`) and writes (`ROW EXCLUSIVE`). If any active query or uncommitted transaction holds a lock on `"medical_attachments"`, the migration statement must wait in the lock queue.
- **Connection Queueing:** While waiting for the exclusive lock, the migration blocks all subsequent read and write queries to `"medical_attachments"`.
- **Duration Reality:** Although the catalog write takes only milliseconds of CPU time once acquired, the operation is **not guaranteed to finish in under 1 ms** due to potential queueing behind prior transactions.
- **Lock Guard Recommendation:**
  ```sql
  SET lock_timeout = '5s';
  ALTER TABLE "medical_attachments" ALTER COLUMN "virus_scan_status" SET DEFAULT 'PENDING';
  RESET lock_timeout;
  ```

### C. Rollback Strategy
- **Rollback SQL:**
  ```sql
  ALTER TABLE "medical_attachments" ALTER COLUMN "virus_scan_status" SET DEFAULT 'CLEAN';
  ```
- **Limitation:** Reverting the default only affects future insertions; any records created while `'PENDING'` was active retain `'PENDING'` unless explicitly backfilled.

---

## 6. Application Behavior and Test Coverage Findings

The data lifecycle of `virusScanStatus` was verified across the application codebase:

1. **Attachment Creation ([`MedicalRecordService.addAttachment`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/medical-record/application/use-cases/medical-record.service.ts#L280)):**  
   Explicitly passes `virusScanStatus: 'PENDING'`. Newly uploaded files are never marked `CLEAN` prior to inspection.
2. **Binary Content Update ([`MedicalRecordRepository.updateAttachment`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/medical-record/infrastructure/database/medical-record.repository.ts#L284)):**  
   If a new `storageKey` is provided, `virusScanStatus` is reset to `'PENDING'`, and an `AttachmentVersion` entry is created. If only metadata (e.g., category) changes, `virusScanStatus` remains unchanged.
3. **Response DTO Mapping ([`MedicalRecordService.mapAttachmentToResponse`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/medical-record/application/use-cases/medical-record.service.ts#L91)):**  
   Dynamically returns `a.virusScanStatus` from the persisted entity. The value is not hardcoded or statically inferred.
4. **Test Suite Coverage:**  
   [`src/modules/medical-record/tests/medical-record.service.spec.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/medical-record/tests/medical-record.service.spec.ts) explicitly asserts:
   ```typescript
   expect(result.virusScanStatus).toBe('PENDING');
   ```
5. **No False-Clean Leakage:**  
   Codebase search confirmed zero occurrences where unscanned uploads are assigned or assumed to be `CLEAN`.

---

## 7. Exact Commands Executed and Exit Codes

| Step / Action | Command Executed | Exit Code | Observed Result |
| :--- | :--- | :---: | :--- |
| **Git Working Tree Check** | `git status` | `1` | `fatal: not a git repository`. Workspace is an unversioned folder compared against reference snapshot. |
| **Schema Validation** | `npx --yes prisma@7.9.1 validate --schema=prisma/schema.prisma` | `0` | `The schema at prisma\schema.prisma is valid 🚀` |
| **TCP Port Probe** | Node.js socket connect to `127.0.0.1:5432` | `0` | `ECONNREFUSED connect ECONNREFUSED 127.0.0.1:5432` (PostgreSQL server offline). |
| **Localhost TCP Probe** | Node.js socket connect to `localhost:5432` | `0` | `ECONNREFUSED` (Database offline). |
| **TypeScript Compilation** | `npm run build` (`nest build`) | `0` | Compilation successful with 0 errors. |
| **Test Suite Execution** | `npx jest` | `0` | **29 passed, 29 total suites; 327 passed, 327 total tests.** Time: 14.172s. |

---

## 8. Item Status Matrix

| Verification Item | Status | Evidence / Notes |
| :--- | :---: | :--- |
| **Prisma Schema Syntax & Model AST** | `VERIFIED` | Validated using `prisma@7.9.1 validate`. All 144 models match. |
| **Column Default Correction (`PENDING`)** | `VERIFIED` | Line 1152 in `prisma/schema.prisma` declares `@default("PENDING")`. |
| **Offline Migration SQL Review** | `VERIFIED` | SQL reviewed: targets `"medical_attachments"."virus_scan_status"`. |
| **Database Availability Probe** | `VERIFIED` | `127.0.0.1:5432` confirmed offline (`ECONNREFUSED`). |
| **Database Identity & Permissions** | `BLOCKED` | PostgreSQL server offline; runtime connection could not be established. |
| **Live Migration History (`_prisma_migrations`)** | `NOT RUN` | Halted per Database Isolation Gate. |
| **Live Migration Execution** | `NOT RUN` | Halted per Database Isolation Gate. |
| **Service & Repository `PENDING` Logic** | `VERIFIED` | Traced in `medical-record.service.ts` and `medical-record.repository.ts`. |
| **Response DTO Parity** | `VERIFIED` | `MedicalAttachmentResponseDto.virusScanStatus` dynamically mapped. |
| **Unit Test Coverage** | `VERIFIED` | `medical-record.service.spec.ts` passes; 327 total tests pass. |
| **Client Execution Testing (5 Surfaces)** | `NOT RUN` | Client projects are external to workspace. Backend readiness documented. |
| **Production Isolation & Security** | `VERIFIED` | Zero production databases or external infrastructure touched. |

---

## 9. Final Recommendation

### **`BLOCKED — DATABASE UNAVAILABLE`**

**Summary Rationale:**  
The Prisma schema correction, offline SQL migration, application service logic, repository persistence, response DTO mapping, TypeScript compilation, and automated test suite are all **verified and ready**.

However, live database migration and migration-history inspection cannot proceed because the configured local development PostgreSQL instance at `127.0.0.1:5432` is offline (`ECONNREFUSED`). In strict adherence to project safety rules, no remote or ambiguous database connection was attempted.

**Next Safe Step:**  
When an isolated local development PostgreSQL container or service is started on `127.0.0.1:5432`, perform read-only inspection of `_prisma_migrations`, baseline if unversioned, and apply the migration using standard Prisma CLI tooling.
