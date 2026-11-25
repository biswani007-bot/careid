# CareID — API Endpoint Status & Contract Catalog

**Project:** CareID / Health Vault 360  
**Version:** 1.0.0 (Remediated Staging Release)  
**Date:** November 3, 2026  
**Global Prefix:** `/api/v1` (with direct root aliases where documented)  
**Standard Envelope:** `{ success: boolean, statusCode: number, message: string, data: T, meta?: any }`  

---

## 1. Domain A: Patient Referrals

| Method | Endpoint | Required Roles | Payload / Query | Response Structure | Operational Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/referrals` | `DOCTOR`, `STAFF`, `FACILITY_ADMIN`, `ADMIN` | `CreateReferralDto` (`patientId`, `receivingFacilityId`, `reasonForReferral`, `priority`, `referralType`, `specialtyRequired`) | `ReferralResponseDto` | **VERIFIED OPERATIONAL**. Safe non-colliding `REF-YYYY-XXXXX`. Transaction-safe audit log with resolved user ID. |
| `GET` | `/api/v1/referrals` | Authenticated | `patientId`, `status`, `priority`, `doctorId`, `page`, `limit` | `{ data: ReferralResponseDto[], total: number }` | **VERIFIED OPERATIONAL**. Role-scoped: Patients see own; Doctors see own referring/assigned; Staff see affiliated facility. |
| `GET` | `/api/v1/referrals/:id` | Authenticated | Param: `id` | `ReferralResponseDto` | **VERIFIED OPERATIONAL**. Role access verified. Enriched with patient, doctor, and facility summaries. |
| `GET` | `/api/v1/referrals/my-incoming` | `DOCTOR` | `status`, `priority`, `page`, `limit` | `{ data: ReferralResponseDto[], total: number }` | **VERIFIED OPERATIONAL**. Scoped to receiving doctor profile ID. |
| `GET` | `/api/v1/referrals/my-outgoing` | `DOCTOR` | `status`, `priority`, `page`, `limit` | `{ data: ReferralResponseDto[], total: number }` | **VERIFIED OPERATIONAL**. Scoped to referring doctor profile ID. |
| `PUT` | `/api/v1/referrals/:id` | `DOCTOR`, `ADMIN` | `UpdateReferralDto` | `ReferralResponseDto` | **VERIFIED OPERATIONAL**. Referring doctor or admin only. Rejects updates to completed/cancelled referrals. |
| `POST` | `/api/v1/referrals/:id/triage` | `DOCTOR`, `STAFF`, `FACILITY_ADMIN`, `ADMIN` | `TriageReferralDto` (`outcome`, `receivingDoctorId`, `reason`) | `ReferralResponseDto` | **VERIFIED OPERATIONAL**. Receiving facility staff/doctor only. Enforces facility affiliation of assigned doctor. |
| `POST` | `/api/v1/referrals/:id/notes` | `DOCTOR`, `STAFF`, `ADMIN` | `AddReferralNoteDto` (`noteText`, `isPrivate`) | `ReferralNoteResponseDto` | **VERIFIED OPERATIONAL**. |
| `GET` | `/api/v1/referrals/:id/notes` | Authenticated | Param: `id` | `ReferralNoteResponseDto[]` | **VERIFIED OPERATIONAL**. Filters private notes for non-clinical roles. |
| `POST` | `/api/v1/referrals/:id/attachments` | `DOCTOR`, `STAFF`, `ADMIN` | `AddReferralAttachmentDto` (`attachmentId`) | `ReferralAttachmentResponseDto` | **VERIFIED OPERATIONAL**. |
| `GET` | `/api/v1/referrals/:id/history` | Authenticated | Param: `id` | `ReferralStatusHistoryResponseDto[]` | **VERIFIED OPERATIONAL**. Status audit trail. |
| `GET` | `/api/v1/referrals/dashboard/stats` | `FACILITY_ADMIN`, `ADMIN` | Query: `facilityId` (optional) | `ReferralDashboardStatsResponseDto` | **VERIFIED OPERATIONAL**. Aggregated counts by status and priority. |

---

## 2. Domain B: Executive & Analytics Reporting

| Method | Endpoint | Required Roles | Payload / Query | Response Structure | Operational Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/reports/dashboard/executive` | `ADMIN`, `SUPER_ADMIN`, `FACILITY_ADMIN` | Query: `startDate`, `endDate`, `facilityId` | `ExecutiveDashboardResponseDto` | **VERIFIED OPERATIONAL**. Safe lazy counts. Facility-scoped for `FACILITY_ADMIN`. Live database health check. |
| `GET` | `/api/v1/reports/analytics/modules/:module` | `ADMIN`, `SUPER_ADMIN`, `FACILITY_ADMIN` | Param: `module`; Query: `startDate`, `endDate` | Domain breakdown object | **VERIFIED OPERATIONAL**. Supports patient, doctor, facility, staff analytics. |
| `GET` | `/api/v1/reports/definitions` | `ADMIN`, `SUPER_ADMIN` | Query: `module` | `ReportDefinitionResponseDto[]` | **VERIFIED OPERATIONAL**. |
| `POST` | `/api/v1/reports/definitions` | `ADMIN`, `SUPER_ADMIN` | `CreateReportDefinitionDto` | `ReportDefinitionResponseDto` | **VERIFIED OPERATIONAL**. Enforces unique definition code. |
| `POST` | `/api/v1/reports/generated` | `ADMIN`, `SUPER_ADMIN` | `GenerateReportDto` (`reportDefinitionId`, `exportFormat`) | `GeneratedReportResponseDto` | **VERIFIED OPERATIONAL**. Records audit log entry. |

---

## 3. Domain C: Security & Patient Consents

| Method | Endpoint | Required Roles | Payload / Query | Response Structure | Operational Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/security/consents` | Authenticated | `patientId`, `status`, `consentType`, `page`, `limit` | `{ data: ConsentRecordResponseDto[], total: number }` | **VERIFIED OPERATIONAL**. Strict scoping: Patients see own; Doctors see consents authorized to them; Staff see facility. |
| `POST` | `/api/v1/security/consents` | `PATIENT`, `DOCTOR`, `STAFF`, `FACILITY_ADMIN`, `ADMIN` | `CreateConsentDto` | `ConsentRecordResponseDto` | **VERIFIED OPERATIONAL**. Patient creation -> `GRANTED`; Staff/Doctor creation -> `PENDING` (requires patient confirmation). |
| `GET` | `/api/v1/security/consents/:id` | Authenticated | Param: `id` | `ConsentRecordResponseDto` | **VERIFIED OPERATIONAL**. Access control verified. Safe date serialization. |
| `POST` | `/api/v1/security/consents/:id/confirm` | `PATIENT` | Param: `id` | `ConsentRecordResponseDto` | **VERIFIED OPERATIONAL**. Only designated patient owner may confirm pending consent. |
| `POST` | `/api/v1/security/consents/:id/withdraw` | `PATIENT`, `ADMIN` | Param: `id` | `ConsentRecordResponseDto` | **VERIFIED OPERATIONAL**. Only patient or admin may withdraw. |

---

## 4. Domain D: Notifications Platform

| Method | Endpoint | Required Roles | Payload / Query | Response Structure | Operational Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/notifications/preferences` | Authenticated | None (uses JWT `userId`) | `NotificationPreferenceResponseDto` | **VERIFIED OPERATIONAL**. Also accessible via `/api/v1/notification/preferences`. |
| `PUT` | `/api/v1/notifications/preferences` | Authenticated | `UpdateNotificationPreferenceDto` | `NotificationPreferenceResponseDto` | **VERIFIED OPERATIONAL**. Updates email, SMS, push, in-app channels. |
| `PATCH`| `/api/v1/notifications/preferences` | Authenticated | `UpdateNotificationPreferenceDto` | `NotificationPreferenceResponseDto` | **VERIFIED OPERATIONAL**. Alias for HTTP `PUT`. |
| `GET` | `/api/v1/notifications/queue` | `ADMIN`, `SUPER_ADMIN` | `status`, `notificationType`, `dateFrom`, `dateTo`, `page`, `limit` | `NotificationQueueResponseDto[]` | **VERIFIED OPERATIONAL**. Enums normalized. Live OTP codes redacted (`******`). |
| `POST` | `/api/v1/notifications/queue/retry` | `ADMIN`, `SUPER_ADMIN` | `RetryQueueDto` | `{ retried: number }` | **VERIFIED OPERATIONAL**. Increments retry attempt, updates status to `SENT`. |
| `GET` | `/api/v1/notifications/dashboard/stats` | `ADMIN`, `SUPER_ADMIN` | None | `NotificationDashboardResponseDto` | **VERIFIED OPERATIONAL**. |

---

## 5. Domain E: Support Tickets

| Method | Endpoint | Required Roles | Payload / Query | Response Structure | Operational Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/support/tickets` | Authenticated | `CreateTicketDto` (`subject`, `description`, `category`, `priority`) | `SupportTicketResponseDto` | **VERIFIED OPERATIONAL**. Demonstration persistence disclosure included. |
| `GET` | `/api/v1/support/tickets` | Authenticated | `status`, `priority`, `category`, `search`, `page`, `limit` | `{ data: SupportTicketResponseDto[], total: number }` | **VERIFIED OPERATIONAL**. Users view own tickets; Staff/Admin view all tickets. |
| `GET` | `/api/v1/support/tickets/:id` | Authenticated | Param: `id` | `SupportTicketResponseDto` | **VERIFIED OPERATIONAL**. Ownership/staff check enforced. |
| `PUT` | `/api/v1/support/tickets/:id` | `STAFF`, `FACILITY_ADMIN`, `ADMIN` | `UpdateTicketDto` (`status`, `priority`, `assignedTo`) | `SupportTicketResponseDto` | **VERIFIED OPERATIONAL**. Staff/Admin only. |
| `POST` | `/api/v1/support/tickets/:id/reply` | Authenticated | `TicketReplyDto` (`message`) | `TicketReply` | **VERIFIED OPERATIONAL**. Ownership/staff check enforced. |

---

## 6. Domain F: Integration API Keys

| Method | Endpoint | Required Roles | Payload / Query | Response Structure | Operational Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/security/api-keys` | `ADMIN`, `SUPER_ADMIN` | `CreateApiKeyDto` (`name`, `expiresAt`) | `ApiKeyResponseDto` | **VERIFIED OPERATIONAL**. Raw secret returned once. Disabled in production environment. |
| `GET` | `/api/v1/security/api-keys` | `ADMIN`, `SUPER_ADMIN` | None | `ApiKeyResponseDto[]` | **VERIFIED OPERATIONAL**. Secret keys masked. |
| `GET` | `/api/v1/security/api-keys/:id` | `ADMIN`, `SUPER_ADMIN` | Param: `id` | `ApiKeyResponseDto` | **VERIFIED OPERATIONAL**. Secret keys masked. |
| `DELETE`| `/api/v1/security/api-keys/:id` | `ADMIN`, `SUPER_ADMIN` | Param: `id` | `{ message: string }` | **VERIFIED OPERATIONAL**. Deletes encryption key record with audit log. |
| `PATCH`| `/api/v1/security/api-keys/:id/revoke` | `ADMIN`, `SUPER_ADMIN` | Param: `id` | `ApiKeyResponseDto` | **VERIFIED OPERATIONAL**. Updates status to `REVOKED`. |

---

## 7. Domain G & H: Admin User & Role Management

| Method | Endpoint | Required Roles | Payload / Query | Response Structure | Operational Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/admin/users` | `ADMIN`, `SUPER_ADMIN` | `search`, `status`, `role`, `sortBy`, `sortOrder`, `page`, `limit` | `{ items: ManagedUser[], data: ManagedUser[], total: number, page: number, limit: number }` | **VERIFIED OPERATIONAL**. Handles enum validation, comma-separated roles, returns dual envelope. |
| `POST` | `/api/v1/admin/users` | `ADMIN`, `SUPER_ADMIN` | `CreateAdminUserDto` | `ManagedUserResponseDto` | **VERIFIED OPERATIONAL**. Creates platform user with audit log; guides clinical users to onboarding. |
| `GET` | `/api/v1/admin/users/:id` | `ADMIN`, `SUPER_ADMIN` | Param: `id` | `ManagedUserResponseDto` | **VERIFIED OPERATIONAL**. |
| `PUT` | `/api/v1/admin/users/:id` | `ADMIN`, `SUPER_ADMIN` | `UpdateAdminUserDto` | `ManagedUserResponseDto` | **VERIFIED OPERATIONAL**. Direct demographic update. |
| `POST` | `/api/v1/admin/users/:id/reset-password` | `ADMIN`, `SUPER_ADMIN` | `AdminResetPasswordDto` (`newPassword`) | `{ message: string, userId: string }` | **VERIFIED OPERATIONAL**. Strictly rejects OTP-only accounts (Patients/Family). |
| `GET` | `/api/v1/admin/roles` | `ADMIN`, `SUPER_ADMIN` | None | `RoleResponseDto[]` | **VERIFIED OPERATIONAL**. Returns roles with linked permissions. |
| `POST` | `/api/v1/admin/roles` | `SUPER_ADMIN` | `CreateRoleDto` | `RoleResponseDto` | **VERIFIED OPERATIONAL**. Custom role creation. |

---

## 8. Domain I: Audit Logs

| Method | Endpoint | Required Roles | Payload / Query | Response Structure | Operational Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/admin/audit-logs` | `ADMIN`, `SUPER_ADMIN` | `userId`, `action`, `startDate`, `endDate`, `page`, `limit` | `{ data: AuditLogResponseDto[], total: number }` | **VERIFIED OPERATIONAL**. Append-only, zero DELETE/PUT routes exist. |
| `GET` | `/api/v1/admin/audit-logs/export` | `ADMIN`, `SUPER_ADMIN` | Query: `format` (`json` or `csv`), filters | File download or JSON payload | **VERIFIED OPERATIONAL**. Validated RFC-4180 CSV and JSON exports. |

---

## 9. Domain J: Admin Profile & Password Management

| Method | Endpoint | Required Roles | Payload / Query | Response Structure | Operational Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `PUT` | `/api/v1/auth/me` | Authenticated | `UpdateProfileDto` (`email`, `phone`) | User Profile Object | **VERIFIED OPERATIONAL**. Uniqueness validation enforced. |
| `PATCH`| `/api/v1/auth/me` | Authenticated | `UpdateProfileDto` | User Profile Object | **VERIFIED OPERATIONAL**. Alias for `PUT`. |
| `POST` | `/api/v1/auth/password/change` | `ADMIN`, `SUPER_ADMIN`, `DOCTOR`, `STAFF` | `ChangePasswordDto` (`currentPassword`, `newPassword`) | `{ message: string }` | **VERIFIED OPERATIONAL**. Bcrypt hash verification of current password. Rejects OTP-only users. |

---

## 10. Domain K: OpenAPI / Swagger Specification

| Method | Endpoint | Required Roles | Payload / Query | Response Structure | Operational Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/docs-json` | Public / Staging | None | OpenAPI 3.0 Specification JSON | **VERIFIED OPERATIONAL**. Direct root adapter route. |
| `GET` | `/api/docs-json` | Public / Staging | None | OpenAPI 3.0 Specification JSON | **VERIFIED OPERATIONAL**. API prefix route. |
| `GET` | `/api/v1/docs-json` | Public / Staging | None | OpenAPI 3.0 Specification JSON | **VERIFIED OPERATIONAL**. Versioned prefix route. |

