# Dispatch Log

## 2026-11-11T10:10:26Z
This is a single self-contained fix; keep it small and focused. Resolve HTTP 403 Forbidden error on the security audit endpoint for authenticated doctor accounts in the CareID NestJS backend, scoping audit history to the authenticated doctor while preserving admin and compliance access.

Integrity mode: development

API Base: https://360api.vnvision.in/api/v1
Affected Module: Doctor Web -> Settings -> Security

## Requirements

### R1. Investigate Root Cause and Implement Scoped Access
Investigate the security audit controller, service, authentication guards, role/permission guards, and JWT identity extraction to determine why the DOCTOR role is rejected with HTTP 403. Implement doctor-scoped access on `GET /api/v1/security/audit` (or `GET /api/v1/doctors/me/security/audit` if the existing endpoint is intentionally admin-only), deriving the user ID from the JWT token, validating the `userId` query parameter if supplied, and returning only that doctor's audit records while preserving authorized admin/compliance access.

### R2. Stored Audit Event Data
Return actual stored security events where available (login, failed login, logout, password change, session creation/termination, device logout, security-related account changes) including event type, timestamp, client/device info, IP address, and status. Do not expose passwords, tokens, or session secrets, and do not fabricate historical records.

### R3. Implementation Restrictions
Apply backend changes only; do not modify the React frontend. Do not disable authorization guards, grant doctors administrative permissions, create fake audit records, or modify unrelated Security APIs. Preserve existing database history.

## Acceptance Criteria

### Security & Access Control
- [ ] Doctor A can access only Doctor A's audit history
- [ ] Doctor B can access only Doctor B's audit history
- [ ] Doctor A cannot access Doctor B's history by modifying the `userId` query parameter
- [ ] Unauthenticated requests return HTTP 401
- [ ] Unauthorized roles return HTTP 403
- [ ] Authorized admin/compliance access remains functional
- [ ] Empty audit history returns HTTP 200 with an empty collection
- [ ] Verified using real Doctor JWT tokens
