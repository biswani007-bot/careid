# Handoff Report: Backend Architecture Survey & Root Cause Analysis

**Agent:** `explorer_survey_backend_1` (Teamwork Explorer)  
**Date:** 2026-11-09  
**Handoff Type:** Hard (Task Complete)  
**Artifact Generated:** [`c:\Users\PABANI\Downloads\hvapi-main\hvapi-main\.agents\teamwork\explorer_survey_backend_1\analysis.md`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/.agents/teamwork/explorer_survey_backend_1/analysis.md)

---

## 1. Observation

1. **`GET /api/v1/doctors/patients` Controller & Guard:**
   - In [`src/modules/doctor/presentation/controllers/doctor.controller.ts:102-114`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/doctor/presentation/controllers/doctor.controller.ts#L102):
     ```typescript
     @Get('patients')
     @Roles('DOCTOR')
     @HttpCode(HttpStatus.OK)
     async getPatients(
       @Req() req: any,
       @Query() query: DoctorPatientsQueryDto,
     ): Promise<PaginatedResponseDto<DoctorPatientSummaryDto>> {
       return this.doctorService.getAuthorizedPatients(req.user.userId, query, req.ip);
     }
     ```
   - Class-level guard: `@UseGuards(AuthGuard('jwt'), RolesGuard)` (line 41).
   - In `RolesGuard` ([`src/modules/auth/infrastructure/guards/roles.guard.ts:19`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/auth/infrastructure/guards/roles.guard.ts#L19)):
     `return requiredRoles.some((role) => user.roles.includes(role));`
     If user lacks `DOCTOR`, returns false -> NestJS throws `ForbiddenException` (HTTP 403).

2. **`DoctorService.getAuthorizedPatients` Implementation:**
   - In [`src/modules/doctor/application/use-cases/doctor.service.ts:803-812`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/doctor/application/use-cases/doctor.service.ts#L803):
     ```typescript
     const doctor = await this.repository.findProfileByUserId(userId);
     if (!doctor) {
       throw new NotFoundException('Doctor profile not found');
     }
     if (doctor.verificationStatus === 'SUSPENDED') {
       throw new ForbiddenException('Doctor registration is currently suspended');
     }
     if (doctor.verificationStatus === 'REJECTED') {
       throw new ForbiddenException('Doctor registration was rejected');
     }
     ```
   - In lines 826-842:
     `createdAt: new Date(p.createdAt).toISOString()`
     `updatedAt: new Date(p.updatedAt).toISOString()`
   - In line 844:
     Calls `await this.repository.createSecurityAuditLog({...})` which invokes `this.db.securityPlatformAuditLog.create({...})` synchronously without try/catch fallback.

3. **Attachment Upload Route & Absence of `/records/upload`:**
   - Controller in [`src/modules/medical-record/presentation/controllers/medical-record.controller.ts:137-157`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/medical-record/presentation/controllers/medical-record.controller.ts#L137):
     ```typescript
     @ApiTags('Attachments Platform')
     @Controller('attachments')
     @UseGuards(AuthGuard('jwt'))
     export class AttachmentController {
       @Post()
       @UseInterceptors(FileInterceptor('file'))
       @HttpCode(HttpStatus.CREATED)
       async uploadGlobalAttachment(
         @Req() req: any,
         @Body() dto: any,
         @UploadedFile() file?: any,
       ): Promise<MedicalAttachmentResponseDto>
     ```
   - An exact codebase search across all controllers confirmed that **`/records/upload` does not exist**.
   - Storage destination: `data/uploads/attachments/` (`targetDiskPath = path.join(uploadDir, fileName)`).
   - Response DTO maps the newly created record ID as `id` (`MedicalAttachmentResponseDto.id`), NOT `medicalAttachmentId`.

4. **`POST /api/v1/ocr/jobs` DTO & Contract:**
   - In [`src/modules/ocr/presentation/dto/ocr-enterprise.dto.ts:6-16`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/ocr/presentation/dto/ocr-enterprise.dto.ts#L6):
     ```typescript
     export class CreateOCRJobDto {
       @ApiProperty({ example: 'attachment-uuid-1' })
       @IsNotEmpty()
       @IsString()
       medicalAttachmentId!: string;

       @ApiProperty({ example: 'LAB_REPORT', required: false })
       @IsOptional()
       @IsString()
       documentType?: string;
     }
     ```
   - In `src/main.ts:58-66`:
     `new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })`.
     Sending `attachmentId` instead of `medicalAttachmentId` triggers HTTP 400 Bad Request.

5. **PaddleOCR Worker Connection & Absence from PM2:**
   - In [`ecosystem.config.js:14-35`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/ecosystem.config.js#L14): Only `careid-backend-api` is defined (`dist/src/main.js`). The Python OCR daemon (`services/ocr-worker/server.py`) is completely absent.
   - In [`src/modules/ocr/infrastructure/clients/ocr-worker.client.ts:62-77, 251-255`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/ocr/infrastructure/clients/ocr-worker.client.ts#L62):
     ```typescript
     this.workerUrl = configService.get('CAREID_OCR_WORKER_URL') || 'http://127.0.0.1:5050';
     ...
     this.logger.error(`Failed to connect to persistent OCR worker at ${this.workerUrl}: ${err.message}`);
     throw new ServiceUnavailableException(
       `Persistent PaddleOCR worker is unreachable at ${this.workerUrl}. Verify that services/ocr-worker daemon is running.`,
     );
     ```
   - In `ocr.service.ts:469`: Catch block sets job status in database to `FAILED` with `failureReason = err.message` and rethrows, returning HTTP 503 to caller.

6. **Medical Record Creation Route:**
   - In [`src/modules/doctor/presentation/controllers/doctor.controller.ts:167-179`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/doctor/presentation/controllers/doctor.controller.ts#L167):
     `@Post('patients/:patientProfileId/medical-records')` with `@Body() dto: CreateMedicalRecordDto`.
   - Validated via `verifyDoctorPatientAccess()`: checks active facility and active appointment/referral/consent.
   - Persisted via Prisma transaction in `DoctorRepository.createMedicalRecord()`.

---

## 2. Logic Chain

1. **R3: Resolution of Conflicting Reports (HTTP 403 vs HTTP 500 for `GET /api/v1/doctors/patients`):**
   - *Premise 1:* `RolesGuard` strictly validates that the JWT caller has `roles: ['DOCTOR']`. If a patient token, staff token, or token without `DOCTOR` role is supplied, line 19 of `roles.guard.ts` rejects the request with HTTP 403.
   - *Premise 2:* If the doctor's account in PostgreSQL has `verification_status` equal to `SUSPENDED` or `REJECTED`, lines 808 & 811 of `doctor.service.ts` throw `ForbiddenException` (HTTP 403).
   - *Premise 3:* On specific patient sub-routes (`/doctors/patients/:patientProfileId/*`), if the doctor has zero active facility affiliations in `doctor_facilities`, line 541 of `doctor.service.ts` throws `ForbiddenException` (HTTP 403).
   - *Premise 4:* In `getAuthorizedPatients` (`doctor.service.ts:840`), the service calls `new Date(p.createdAt).toISOString()`. If null or malformed data exists, a `RangeError` is thrown, caught by `GlobalExceptionFilter` as HTTP 500.
   - *Premise 5:* In `doctor.service.ts:844`, `createSecurityAuditLog` is called synchronously. If the table `security_platform_audit_logs` does not exist in the staging database or fails to write, Prisma throws `P2021`, causing `GlobalExceptionFilter` to return HTTP 500.
   - *Inference:* Reports of HTTP 403 correspond to authentication/role mismatch or unverified status, whereas reports of HTTP 500 correspond to unhandled date formatting errors or database schema unreadiness (`security_platform_audit_logs`).

2. **R4: PaddleOCR Worker Unreachability on Port 5050:**
   - *Premise 1:* The Python worker daemon is located at `services/ocr-worker/server.py` and listens on `http://127.0.0.1:5050`.
   - *Premise 2:* `ecosystem.config.js` only contains the NestJS process (`careid-backend-api`).
   - *Premise 3:* In aaPanel staging, starting or restarting the application via `pm2 start ecosystem.config.js` never starts `server.py`.
   - *Premise 4:* When `POST /api/v1/ocr/jobs` attempts to reach `http://127.0.0.1:5050/internal/ocr/process`, the loopback socket is closed, resulting in `ECONNREFUSED`.
   - *Premise 5:* `OcrWorkerClient.handleFetchError` wraps `ECONNREFUSED` into `ServiceUnavailableException` (HTTP 503).
   - *Inference:* The worker is unreachable because it has not been configured into the server's process supervision tree (PM2/systemd) and has not been started.

3. **Attachment Upload and OCR Job Contract Integrity:**
   - *Premise 1:* `/records/upload` is non-existent in backend routing; only `POST /api/v1/attachments` exists.
   - *Premise 2:* `POST /api/v1/attachments` returns `{ data: { id: "..." } }`.
   - *Premise 3:* `POST /api/v1/ocr/jobs` expects `{ "medicalAttachmentId": "..." }`.
   - *Inference:* The frontend must upload to `/api/v1/attachments`, take the returned `id`, and send it as `medicalAttachmentId` to `/api/v1/ocr/jobs`.

---

## 3. Caveats

1. Direct SSH / terminal access to the remote staging host `360api.vnvision.in` is unavailable; staging server daemon state was diagnosed through codebase analysis, deployment scripts, configuration files, and API contracts.
2. The staging database content was not altered (strictly following safety constraints against unauthorized database migrations or updates).

---

## 4. Conclusion

1. **R3 Root Cause:**
   - HTTP 403 is produced when caller lacks the `DOCTOR` role in JWT or has `SUSPENDED`/`REJECTED` status in `doctor_profiles`, or when hitting specific patient routes without facility linkage.
   - HTTP 500 is produced when `security_platform_audit_logs` table is absent or when `new Date().toISOString()` receives an invalid date value.
2. **R4 Root Cause:**
   - The PaddleOCR worker on port 5050 is not supervised by `ecosystem.config.js` and was not started as a persistent daemon on the staging server.
3. **Upload & OCR Contracts:**
   - Valid upload route: `POST /api/v1/attachments`.
   - Returned property: `.id`.
   - Required OCR job property: `.medicalAttachmentId`.
   - Valid medical record save route: `POST /api/v1/doctors/patients/:patientProfileId/medical-records`.

---

## 5. Verification Method

To independently verify all findings:
1. **Verify absence of `/records/upload` & presence of `/attachments`:**
   ```powershell
   Get-ChildItem -Path src -Recurse -Filter "*controller*.ts" | Select-String -Pattern "records/upload"
   Get-ChildItem -Path src -Recurse -Filter "*controller*.ts" | Select-String -Pattern "'attachments'"
   ```
2. **Verify OCR Job DTO property:**
   Inspect `src/modules/ocr/presentation/dto/ocr-enterprise.dto.ts` line 10 (`medicalAttachmentId`).
3. **Verify PM2 ecosystem gap:**
   Inspect `ecosystem.config.js` to observe that only `careid-backend-api` is present.
4. **Run existing resilience & unit tests:**
   ```powershell
   npx jest src/modules/ocr/tests/ocr-worker.client.spec.ts --passWithNoTests
   npx jest src/modules/doctor/tests/doctor-patient-management.spec.ts --passWithNoTests
   ```
