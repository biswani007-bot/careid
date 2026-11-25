# CareID Security & Privacy Audit Findings

**Audit Phase:** Phase 1 Read-Only System Audit  
**Classification Standard:** CVSS v3.1 / OWASP Top 10 API Security Risks (2023)  
**Verification Method:** Static Source Code Review & Non-Mutating Live HTTP Probes  

---

## Summary of Security Findings

| Finding ID | Severity | Category | Affected Component | Route / Location |
| :--- | :--- | :--- | :--- | :--- |
| **CRIT-SEC-01** | **Critical** | Broken Access Control / CORS | HTTP Boundary | `src/main.ts:39-59` |
| **HIGH-SEC-02** | **High** | Broken Object-Level Auth (IDOR) | Doctor Module | `PUT /api/v1/doctors/:id` |
| **HIGH-SEC-03** | **High** | Sensitive Data Exposure / IDOR | Health Card Module | `GET /api/v1/health-cards/search` |
| **HIGH-SEC-04** | **High** | Sensitive Data Exposure / IDOR | Insurance Module | `GET /api/v1/insurance/search` |
| **HIGH-SEC-05** | **High** | Multi-Tenant Authorization Bypass | Facility Module | `PUT /api/v1/facilities/:id` |
| **HIGH-SEC-06** | **High** | Security Architecture / Clustering | Auth Module | `src/modules/auth/infrastructure/services/auth-rate-limiter.service.ts` |
| **HIGH-SEC-07** | **High** | Broken Function-Level Auth (RBAC) | Immunisation Module| `POST /api/v1/immunisation/vaccines`, `POST /schedules` |
| **MED-SEC-08** | **Medium** | Broken Function-Level Auth (RBAC) | Schedule Module | `POST /api/v1/schedules`, `POST /shifts`, `POST /holidays` |
| **MED-SEC-09** | **Medium** | Broken Object-Level Auth (IDOR) | Referral Module | `GET /api/v1/referrals`, `GET /api/v1/referrals/:id` |
| **LOW-SEC-10** | **Low** | Defense in Depth / Bypass Risk | Auth Module | `src/modules/auth/application/use-cases/auth.service.ts:60-93` |

---

## Detailed Vulnerability Reports

### Finding CRIT-SEC-01: Unrestricted Credentialed Cross-Origin Resource Sharing (CORS) Misconfiguration

- **Finding ID**: `CRIT-SEC-01`
- **Severity**: **Critical** (CVSS: 9.3 — CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:H/I:H/A:N)
- **Affected Module/File**: `src/main.ts:39-59`
- **Evidence**:
  In `src/main.ts`:
  ```typescript
  // Enable CORS to allow browser requests from any origin with credentials support
  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
    optionsSuccessStatus: 204,
  });
  ```
  Although `src/config/env.validation.ts:210-218` strictly validates that `CORS_ALLOWED_ORIGINS` is supplied in production, `src/main.ts` **completely ignores** the environment variable and hardcodes `origin: true` with `credentials: true`.
  
  **Live Production Verification**:
  A safe live probe with an untrusted origin was executed against `https://360api.vnvision.in/api/v1/health`:
  ```powershell
  Invoke-WebRequest -Uri "https://360api.vnvision.in/api/v1/health" -Method Get -Headers @{ "Origin" = "https://evil.attacker.com" }
  ```
  **Live Response Headers Received**:
  ```http
  Access-Control-Allow-Origin: https://evil.attacker.com
  Access-Control-Allow-Credentials: true
  ```
- **Potential Impact**: Any malicious website visited by an authenticated patient, doctor, or administrator can issue authenticated cross-origin XMLHttpRequests/fetch requests to `https://360api.vnvision.in` and read the full response body, completely bypassing Same-Origin Policy (SOP). This allows exfiltration of private health records, medical diagnoses, digital health cards, and active session tokens.
- **Existing Mitigation**: None at application layer.
- **Recommended Remediation**:
  In `src/main.ts`, bind CORS origin to the validated environment configuration (`process.env.CORS_ALLOWED_ORIGINS` or `configService.get('cors.allowedOrigins')`). Explicitly reject reflection of arbitrary origins when credentials are enabled.
- **Regression Test Required**: Unit and e2e test verifying that unauthorized `Origin` headers (e.g. `https://evil.attacker.com`) receive no `Access-Control-Allow-Origin` header or receive an explicit rejection.
- **Deployment Verification Required**: Execute live curl/Invoke-WebRequest with arbitrary `Origin` header against staging and production post-deploy to confirm no wildcard reflection.

---

### Finding HIGH-SEC-02: Broken Object-Level Authorization (IDOR) on Doctor Profile Updates

- **Finding ID**: `HIGH-SEC-02`
- **Severity**: **High** (CVSS: 8.5 — CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:L)
- **Affected Module/File**: `src/modules/doctor/presentation/controllers/doctor.controller.ts:76-83`, `doctor.service.ts:156-169`
- **Evidence**:
  In `DoctorController`:
  ```typescript
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update doctor profile details' })
  @ApiParam({ name: 'id', description: 'Doctor Profile ID' })
  @SwaggerResponse({ status: 200, type: DoctorProfileFullResponseDto })
  async updateDoctor(@Param('id') id: string, @Body() dto: Partial<RegisterDoctorDto>): Promise<DoctorProfileFullResponseDto> {
    return this.doctorService.updateDoctor(id, dto);
  }
  ```
  Notice:
  1. The controller has `@UseGuards(AuthGuard('jwt'), RolesGuard)` at class level, but `@Put(':id')` has **no `@Roles` decorator**. Under `RolesGuard`, any authenticated user without roles specified passes activation.
  2. `updateDoctor` does not accept `req.user.userId`.
  3. `doctorService.updateDoctor(id, dto)` performs `this.repository.updateDoctor(id, dto)` with zero ownership validation.
- **Potential Impact**: Any authenticated user (including a standard PATIENT account) can submit `PUT /api/v1/doctors/:id` with arbitrary target doctor IDs and rewrite doctor licenses, departmental assignments, provider IDs, and qualifications.
- **Existing Mitigation**: None.
- **Recommended Remediation**: Add `@Roles('ADMIN', 'SUPER_ADMIN', 'DOCTOR')` to `@Put(':id')`. In `doctor.service.ts`, verify that if the caller is not an admin, `doctor.userId === callerUserId`.
- **Regression Test Required**: Unit test verifying that a user with role `PATIENT` or a doctor attempting to update another doctor's profile ID receives `403 Forbidden`.
- **Deployment Verification Required**: Verify with test accounts in staging that non-owner update requests are rejected.

---

### Finding HIGH-SEC-03: Sensitive Information Disclosure & Mass Data Harvesting in Health Card Directory

- **Finding ID**: `HIGH-SEC-03`
- **Severity**: **High** (CVSS: 7.7 — CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N)
- **Affected Module/File**: `src/modules/health-card/presentation/controllers/health-card.controller.ts:34-41`, `health-card.service.ts:394-398`
- **Evidence**:
  In `HealthCardController`:
  ```typescript
  @Get('search')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Search Health Cards by card number or patient name' })
  @ApiQuery({ name: 'q', required: true, description: 'Search term' })
  @SwaggerResponse({ status: 200, type: [FullHealthCardResponseDto] })
  async searchCards(@Query('q') query: string): Promise<FullHealthCardResponseDto[]> {
    return this.healthCardService.searchCards(query);
  }
  ```
  In `HealthCardService`:
  ```typescript
  async searchCards(query: string): Promise<FullHealthCardResponseDto[]> {
    if (!query || query.trim().length === 0) return [];
    const cards = await this.repository.searchCards(query.trim());
    return cards.map((c) => this.mapCard(c));
  }
  ```
  The endpoint requires only JWT authentication (`AuthGuard('jwt')`). It has no `@Roles` decorator and enforces no patient ownership scope.
- **Potential Impact**: Any authenticated user (including a low-privileged patient account) can query `GET /api/v1/health-cards/search?q=a` and enumerate active digital health cards, full patient names, card numbers, QR payloads, expiration dates, and blood groups across the platform.
- **Existing Mitigation**: None.
- **Recommended Remediation**: Restrict `GET /health-cards/search` to administrative and clinical roles (`@Roles('ADMIN', 'SUPER_ADMIN', 'DOCTOR', 'STAFF')`).
- **Regression Test Required**: Test verifying that a caller with role `PATIENT` receives `403 Forbidden` when attempting to search global health cards.
- **Deployment Verification Required**: Confirm that unprivileged search requests return 403.

---

### Finding HIGH-SEC-04: Sensitive Information Disclosure in Global Insurance Policy Search

- **Finding ID**: `HIGH-SEC-04`
- **Severity**: **High** (CVSS: 7.5 — CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N)
- **Affected Module/File**: `src/modules/insurance/presentation/controllers/insurance.controller.ts:78-85`, `insurance.service.ts:436-440`
- **Evidence**:
  In `InsuranceController`:
  ```typescript
  @Get('search')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Search insurance policies by provider or policy number' })
  @ApiQuery({ name: 'q', required: true })
  @SwaggerResponse({ status: 200, type: [InsurancePolicyResponseDto] })
  async searchPolicies(@Query('q') query: string): Promise<InsurancePolicyResponseDto[]> {
    return this.insuranceService.searchPolicies(query);
  }
  ```
  The endpoint is protected only by `@UseGuards(AuthGuard('jwt'))` without role restrictions. It returns global policy records containing policy numbers, coverage amounts, beneficiary links, and provider plans across all patients.
- **Potential Impact**: Any authenticated patient can harvest insurance policy numbers, plan details, and patient profile links belonging to other individuals.
- **Existing Mitigation**: None.
- **Recommended Remediation**: Apply `@Roles('ADMIN', 'SUPER_ADMIN', 'STAFF', 'FACILITY_ADMIN')` or restrict search results strictly to the caller's own patient profile.
- **Regression Test Required**: Test verifying `403 Forbidden` for standard patient role on global insurance policy search.
- **Deployment Verification Required**: Verify role rejection on staging API.

---

### Finding HIGH-SEC-05: Multi-Tenant / Cross-Facility Administrative Privilege Escalation

- **Finding ID**: `HIGH-SEC-05`
- **Severity**: **High** (CVSS: 7.4 — CVSS:3.1/AV:N/AC:L/PR:H/UI:N/S:U/C:N/I:H/A:L)
- **Affected Module/File**: `src/modules/facility/presentation/controllers/facility.controller.ts:70-78`, `facility.service.ts:166-179`
- **Evidence**:
  In `FacilityController`:
  ```typescript
  @Put(':id')
  @Roles('ADMIN', 'SUPER_ADMIN', 'FACILITY_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update facility details' })
  @ApiParam({ name: 'id', description: 'Facility Profile ID' })
  @SwaggerResponse({ status: 200, type: FacilityFullResponseDto })
  async updateFacility(@Param('id') id: string, @Body() dto: Partial<RegisterFacilityDto>): Promise<FacilityFullResponseDto> {
    return this.facilityService.updateFacility(id, dto);
  }
  ```
  In `FacilityService`:
  ```typescript
  async updateFacility(id: string, dto: Partial<RegisterFacilityDto>): Promise<FacilityFullResponseDto> {
    const facility = await this.repository.findFacilityById(id);
    if (!facility) throw new NotFoundException('Facility profile not found');
    const updated = await this.repository.updateFacility(id, dto);
    return this.mapFacility(updated);
  }
  ```
  There is no check validating whether a user holding the `FACILITY_ADMIN` role is actually affiliated with the target facility being modified.
- **Potential Impact**: A `FACILITY_ADMIN` representing Facility A can alter contact details, regulatory licenses, operational status, and departments of competing Facility B.
- **Existing Mitigation**: None.
- **Recommended Remediation**: Validate the caller's staff or admin facility affiliation in `FacilityService` before applying updates when the caller does not hold global `SUPER_ADMIN` privileges.
- **Regression Test Required**: Unit test validating that a `FACILITY_ADMIN` attempting to update a facility other than their own receives `403 Forbidden`.
- **Deployment Verification Required**: Staging verification of tenant boundary enforcement.

---

### Finding HIGH-SEC-06: Distributed Rate Limiter & Concurrency Replay Bypasses via In-Memory Storage

- **Finding ID**: `HIGH-SEC-06`
- **Severity**: **High** (CVSS: 7.5 — CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:L/I:H/A:L)
- **Affected Module/File**: `src/modules/auth/infrastructure/services/auth-rate-limiter.service.ts:15`, `auth.service.ts:34-44`
- **Evidence**:
  ```typescript
  // AuthRateLimiterService:
  private readonly records: Map<string, ClientRecord> = new Map();

  // AuthService:
  private readonly recentRotations = new Map<string, { rotatedAt: number; result: RefreshTokenResponseDto }>();
  ```
  Both the authentication rate-limiter service and the concurrent refresh-token rotation grace window cache use in-memory Node.js `Map` structures.
- **Potential Impact**:
  1. **Rate Limit Bypass**: When deployed in a multi-instance, clustered (PM2 cluster mode), or containerized environment behind a round-robin reverse proxy, an attacker can bypass IP and phone rate limits by cycling requests across worker processes.
  2. **False-Positive Account Lockouts / Replay Trigger**: A client issuing concurrent token refresh requests that land on different worker processes will fail the `recentRotations` cache lookup on worker B. Worker B will interpret the rotated token as an active replay attack, immediately revoking all refresh tokens for that user and forcibly invalidating all active sessions.
- **Existing Mitigation**: `auth-rate-limiter.service.ts` auto-prunes stale records every 5 minutes to prevent heap exhaustion within a single worker.
- **Recommended Remediation**: Migrate shared rate-limiting counters and token rotation concurrency records to a shared distributed store (e.g. Redis via `ioredis`) with atomic Lua scripts or sliding-window keys.
- **Regression Test Required**: Integration test simulating concurrent refresh token rotations across distinct service instances.
- **Deployment Verification Required**: Validate rate-limiter behavior across multiple PM2 worker threads in staging.

---

### Finding HIGH-SEC-07: Unauthenticated Master Directory Mutation in Immunisation Platform

- **Finding ID**: `HIGH-SEC-07`
- **Severity**: **High** (CVSS: 7.3 — CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:L)
- **Affected Module/File**: `src/modules/immunisation/presentation/controllers/immunisation.controller.ts:25-56`
- **Evidence**:
  In `ImmunisationController`:
  ```typescript
  @Post('vaccines')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a vaccine in directory' })
  async createVaccine(@Body() dto: CreateVaccineDto): Promise<VaccineResponseDto> {
    return this.service.createVaccine(dto);
  }

  @Post('schedules')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a vaccination schedule / dose rule' })
  async createSchedule(@Body() dto: CreateVaccinationScheduleDto): Promise<VaccinationScheduleResponseDto> {
    return this.service.createSchedule(dto);
  }
  ```
  Both endpoints only require `@UseGuards(AuthGuard('jwt'))` at class level without `@Roles`. Any authenticated user can create vaccines and dose scheduling rules.
- **Potential Impact**: Any patient account can inject arbitrary vaccines, falsified dose guidelines, and synthetic contraindication rules into the master medical registry.
- **Existing Mitigation**: None.
- **Recommended Remediation**: Add `@Roles('ADMIN', 'SUPER_ADMIN')` to `POST /vaccines` and `POST /schedules`.
- **Regression Test Required**: Unit test validating that standard users receive `403 Forbidden` on vaccine and schedule creation.
- **Deployment Verification Required**: Verify role enforcement in staging.

---

### Finding MED-SEC-08: Unrestricted Master Schedule, Shift, and Holiday Modifications

- **Finding ID**: `MED-SEC-08`
- **Severity**: **Medium** (CVSS: 6.5 — CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:M/A:L)
- **Affected Module/File**: `src/modules/schedule/presentation/controllers/schedule.controller.ts`, `shift.controller.ts`, `holiday.controller.ts`
- **Evidence**:
  The controllers `ScheduleController`, `ShiftController`, and `HolidayController` only apply `@UseGuards(AuthGuard('jwt'))` at class level. None define `@Roles` on endpoints such as `POST /schedules`, `PUT /schedules/:id`, `DELETE /schedules/:id`, `POST /shifts`, and `POST /holidays`.
- **Potential Impact**: Authenticated patients can create or delete facility schedule profiles, alter doctor shift assignments, and inject bogus holidays that block patient appointment booking.
- **Existing Mitigation**: None.
- **Recommended Remediation**: Add `@Roles('ADMIN', 'SUPER_ADMIN', 'FACILITY_ADMIN')` to all schedule and shift mutations.
- **Regression Test Required**: Unit test verifying that callers with role `PATIENT` receive `403 Forbidden` on all scheduling mutations.
- **Deployment Verification Required**: Post-deploy role verification.

---

### Finding MED-SEC-09: Unrestricted Clinical Care Referral Directory Access

- **Finding ID**: `MED-SEC-09`
- **Severity**: **Medium** (CVSS: 6.5 — CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N)
- **Affected Module/File**: `src/modules/referral/presentation/controllers/referral.controller.ts:30-55, 82-89`
- **Evidence**:
  In `ReferralController`:
  ```typescript
  @Get()
  async getReferrals(@Query('patientId') patientId?: string, ...) {
    return this.referralService.getReferrals({ patientId, ... });
  }

  @Get(':id')
  async getReferralById(@Param('id') id: string): Promise<ReferralResponseDto> {
    return this.referralService.getReferralById(id);
  }
  ```
  Neither route verifies that the caller is the patient, referring doctor, receiving doctor, or facility administrator associated with the referral.
- **Potential Impact**: Any authenticated user can enumerate clinical referrals across facilities and inspect sensitive diagnosis reasons and care transfer notes.
- **Existing Mitigation**: None.
- **Recommended Remediation**: Enforce ownership and clinical participation checks: callers may only view referrals where they are the patient, referring provider, or receiving provider, unless holding `ADMIN` privileges.
- **Regression Test Required**: Unit test confirming that an unrelated patient or doctor cannot view another party's referral.
- **Deployment Verification Required**: Verify referral access boundaries on staging API.

---

### Finding LOW-SEC-10: Synthetic Test OTP Bypass Logic Present in Source Code

- **Finding ID**: `LOW-SEC-10`
- **Severity**: **Low** (CVSS: 3.1 — CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:L/I:N/A:N)
- **Affected Module/File**: `src/modules/auth/application/use-cases/auth.service.ts:60-93`, `src/config/env.validation.ts:139-166`
- **Evidence**:
  `AuthService.generateSecureOtp(phone)` allows a hardcoded test OTP (`123456` by default) when `ENABLE_TEST_OTP=true` and the phone is listed in `TEST_PHONE_NUMBERS`.
- **Existing Mitigation**:
  Strict multi-layered startup and runtime guards in `src/config/env.validation.ts`:
  1. Server startup immediately aborts with an exception if `ENABLE_TEST_OTP=true` when `APP_ENV=production` or `DEPLOYMENT_ENV=production` or `NODE_ENV=production`.
  2. Conflicting environment declarations (e.g. `APP_ENV=staging` and `DEPLOYMENT_ENV=production`) cause immediate startup failure.
  3. In `AuthService.generateSecureOtp()`, any environment indicating production forces cryptographically secure `crypto.randomInt(100000, 1000000)`.
- **Potential Impact**: If an operator incorrectly configures environment variables, fixed OTP codes could potentially be used on allowlisted staging numbers.
- **Recommended Remediation**: Maintain current defense-in-depth guards. Ensure automated CI/CD pipeline scans prevent `ENABLE_TEST_OTP=true` from ever reaching production `.env` profiles.
- **Regression Test Required**: Existing `seed-and-auth-verification.spec.ts` covers 12 test assertions verifying that production environments always reject test OTPs.
- **Deployment Verification Required**: Run preflight checks (`scripts/deploy-preflight.js`) before production container launches.

