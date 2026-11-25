# CareID Backend (HVAPI) — Environment Variables Specification

This document defines the configuration schema for the CareID NestJS backend monolith (`hvapi`).

> **Security Policy:** Never commit live database credentials, production API keys, or JWT secrets to this repository. All production credentials must be managed securely through the host environment or a secret manager.

---

## 1. Current Active Configuration (Consumed by Application Code)

The following variables are actively loaded and consumed by the codebase via `@nestjs/config` (`src/config/env.config.ts`, `src/config/env.validation.ts`, `src/main.ts`, and individual modules).

| Variable Name | Required | Default / Format | Consumed In | Description |
| :--- | :--- | :--- | :--- | :--- |
| `NODE_ENV` | **Yes** | `development` | `src/config/env.validation.ts`<br>`src/app.module.ts` | Application execution environment (`development`, `staging`, `production`). Validated via `class-validator` `IsEnum`. |
| `PORT` | **Yes** | `3073` (or `3000`) | `src/config/env.validation.ts`<br>`src/main.ts` | TCP port for the NestJS HTTP listener. Validated as a numeric integer. |
| `GLOBAL_PREFIX` | **Yes** | `api` | `src/config/env.validation.ts`<br>`src/main.ts` | Base API routing prefix. Sets endpoints to `/{GLOBAL_PREFIX}/v1/...`. *(Note: Previously mislabeled as `API_PREFIX` in older deployment notes).* |
| `DATABASE_URL` | **Yes** | `postgresql://...` | `src/config/env.validation.ts`<br>`src/database/database.service.ts` | PostgreSQL connection string for Prisma and `pg.Pool`. Must point to a local database during development. |
| `SWAGGER_PATH` | No | `docs` | `src/main.ts`<br>`src/config/env.config.ts` | Route path for OpenAPI Swagger documentation UI (e.g., `http://localhost:3073/docs`). |
| `LOG_LEVEL` | No | `info` | `src/app.module.ts`<br>`src/config/env.config.ts` | Pino logger verbosity level (`trace`, `debug`, `info`, `warn`, `error`, `fatal`). |
| `JWT_SECRET` | No* | `hvapi_default_secret_key` | `src/modules/auth/auth.module.ts`<br>`src/modules/auth/application/use-cases/auth.service.ts`<br>`src/modules/auth/infrastructure/validators/jwt.strategy.ts` | Symmetric secret key for signing and verifying both Access Tokens and Refresh Tokens. *(Must be set to a cryptographically random 64+ char string in production).* |
| `JWT_EXPIRATION` | No | `15m` | `src/modules/auth/auth.module.ts`<br>`src/modules/auth/application/use-cases/auth.service.ts` | Lifespan for JWT access tokens (e.g., `15m`, `1h`). |
| `REFRESH_TOKEN_EXPIRATION` | No | `7d` | `src/modules/auth/application/use-cases/auth.service.ts` | Lifespan for long-lived refresh tokens (e.g., `7d`, `30d`). *(Note: Previously mislabeled as `JWT_REFRESH_EXPIRATION` in older deployment notes).* |
| `QR_HMAC_SECRET` | No* | `hvapi_enterprise_qr_super_secret_key_360` | `src/modules/qr/application/use-cases/qr.service.ts` | HMAC secret for signing and verifying cryptographic digital health card QR codes. |

*\*While marked optional by code fallbacks, these secrets are mandatory in production for cryptographic security.*

---

## 2. Documentation Discrepancies & Excluded Variables

The following variables previously appeared in deployment documentation but are **not consumed by the current application source code**:

* `API_PREFIX`: Not read; code reads `GLOBAL_PREFIX`.
* `API_VERSION`: Not read; code hardcodes URI versioning default to `'1'`.
* `JWT_REFRESH_SECRET`: Not read; refresh tokens are signed with `JWT_SECRET`.
* `JWT_REFRESH_EXPIRATION`: Not read; code reads `REFRESH_TOKEN_EXPIRATION`.
* `CORS_ORIGIN`: Not read; `src/main.ts` enables CORS with `origin: true` (reflects request origin).
* `BCRYPT_ROUNDS`: Not read; code hardcodes `10` rounds in `bcrypt.hash(..., 10)`.
* `UPLOAD_DIR`: Not read; no local filesystem upload controller is bound to this path.

---

## 3. Planned Integrations (Specification for Upcoming Phases)

The following variables are designated for approved authentication remediation, Brevo email delivery, Firebase Admin phone verification, and Backblaze B2 storage:

### A. Controlled Security & Development Testing
* `ENABLE_TEST_OTP`: `'true'` or `'false'`. Enables controlled test OTP bypass in staging/development. **Strictly disabled in production via code guard.**
* `TEST_PHONE_NUMBERS`: Comma-separated list of E.164 phone numbers (e.g. `+16505553434,+919876543210`) allowed to use test OTP.
* `TEST_OTP_CODE`: 6-digit static code (e.g. `123456`) issued only for whitelisted test numbers in non-production environments.

### B. Brevo Transactional Email Service
* `BREVO_API_KEY`: API key for Brevo Transactional Email API v3 (`https://api.brevo.com/v3/smtp/email`).
* `BREVO_SENDER_EMAIL`: Verified sender email address (e.g. `auth@careid.vnvision.in`).
* `BREVO_SENDER_NAME`: Outbound sender name (e.g. `CareID Health Security`).

### C. Firebase Admin SDK Phone Verification
* `FIREBASE_PROJECT_ID`: GCP/Firebase Project ID (`careid-5e423`).
* `FIREBASE_CLIENT_EMAIL`: Service account client email.
* `FIREBASE_PRIVATE_KEY`: Service account RSA private key (multiline with escaped `\n`).

### D. Durable Identity Mapping & Rate-Limiting Store
* `REDIS_URL`: Redis / Valkey URI (e.g. `redis://localhost:6379`) for email-to-userId mapping and PM2 cluster-mode session synchronization.

### E. Backblaze B2 Private Document Storage (Active Implementation)
Consumed by: `src/config/env.validation.ts`, `src/modules/storage/infrastructure/b2-storage.service.ts`, `src/modules/report/application/use-cases/report.service.ts`
* `B2_ENDPOINT`: Regional S3 endpoint (e.g. `https://s3.us-east-005.backblazeb2.com`).
* `B2_REGION`: S3 region identifier (`us-east-005`).
* `B2_BUCKET_NAME`: Isolated private bucket name (`careid-patient-docs-prod`).
* `B2_KEY_ID`: Application Key ID (AWS S3-compatible Access Key ID).
* `B2_APPLICATION_KEY`: Application Key secret (AWS S3-compatible Secret Access Key).
* `B2_DOWNLOAD_EXPIRY_SECONDS`: Pre-signed URL expiration duration in seconds (optional, default: `900` / 15 minutes, clamped range: 60 to 3600 seconds).
