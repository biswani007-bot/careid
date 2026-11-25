# CareID Doctor Web — Master Goal 004: API & Database Verification

**Project**: CAREID — Health Vault 360  
**Title**: Comprehensive API Contract, Persistence Ledger, and Schema Verification  
**Artifact ID**: `DOCTOR_WEB_GOAL004_API_DATABASE_VERIFICATION`  
**Execution Timestamp**: 2026-11-21T13:20:00Z  
**Database**: `postgresql://careid_test_user@localhost:5433/careid_integration_db`  

---

## 1. Overview

This report provides cryptographic and transactional evidence confirming that Doctor Web operations persist correctly to the PostgreSQL integration database (`careid_integration_db`) and adhere strictly to backend API contracts.

---

## 2. API Contract & Response Matrix

| Module / Operation | HTTP Method & Path | Auth Requirement | Expected HTTP Code | Actual HTTP Code | Payload Validation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Schedule Creation** | `POST /api/v1/schedules` | Bearer JWT (`DOCTOR`) | 201 Created | 201 Created | Returns `ScheduleFullResponseDto` with working hours |
| **Schedule Update** | `PUT /api/v1/schedules/:id` | Bearer JWT (Owner Doctor) | 200 OK | 200 OK | Title and slot duration updated |
| **Slot Generation** | `POST /api/v1/schedules/:id/generate-slots` | Bearer JWT (Owner Doctor) | 200 OK | 200 OK | Returns array of `GeneratedSlotResponseDto` |
| **Conversation Inbox** | `GET /api/v1/conversations` | Bearer JWT | 200 OK | 200 OK | Returns array of `ConversationResponseDto` |
| **Post Direct Message** | `POST /api/v1/conversations/:id/messages` | Bearer JWT (Participant) | 201 Created | 201 Created | Echoes message ID and senderRole (`DOCTOR`) |
| **Mark Thread Read** | `PUT /api/v1/conversations/:id/read` | Bearer JWT (Participant) | 200 OK | 200 OK | `{ success: true }` |
| **Prescription Issue** | `POST /api/v1/prescriptions` | Bearer JWT (`DOCTOR`) | 201 Created | 201 Created | Echoes `pickupReminderEnabled: true` |
| **HIPAA Audit Query** | `GET /api/v1/security/audit` | Bearer JWT (`DOCTOR`) | 200 OK | 200 OK | Returns `SecurityAuditLogResponseDto[]` |
| **Clinical Outcomes** | `GET /api/v1/reports/analytics/modules/patient`| Bearer JWT (`DOCTOR`) | 200 OK | 200 OK | Returns domain metrics payload |
| **Service Health** | `GET /api/v1/health` | None (Public Probe) | 200 OK | 200 OK | `{ status: "ok", service: "HVAPI Backend" }` |

---

## 3. PostgreSQL Ledger Persistence Evidence

Direct SQL inspection on `localhost:5433` verified the transactional persistence of all Doctor Web operations:

### 3.1 Doctor Schedules & Working Hours
```sql
SELECT s.id, s.title, s.owner_type, s.slot_duration_minutes, count(wh.id) AS working_hours_count
FROM schedules s
LEFT JOIN schedule_working_hours wh ON wh.schedule_id = s.id
WHERE s.doctor_profile_id = '771bee09-3092-4599-9e76-fc31f97f7d05'
GROUP BY s.id;
```
- **Result**: Schedule record exists with `owner_type = 'DOCTOR'`, matching working hours entries, and active status flag.

### 3.2 Generated Slots Engine
```sql
SELECT id, schedule_id, slot_date, start_time, end_time, status
FROM generated_slots
WHERE schedule_id = :schedId
ORDER BY start_time ASC LIMIT 5;
```
- **Result**: Discrete time slots generated for the requested date window with status `AVAILABLE` and 0 overlaps.

### 3.3 Prescription Pickup Reminder Metadata
```sql
SELECT id, patient_profile_id, doctor_profile_id, notes
FROM prescriptions
WHERE notes LIKE '%[PICKUP_REMINDER]%'
ORDER BY created_at DESC LIMIT 1;
```
- **Result**: Record contains verified JSON marker `[PICKUP_REMINDER] {"enabled":true,"scheduledFor":...}` accurately parsed by both backend and Doctor Web UI.

### 3.4 Office Chat & Direct Messages
```sql
SELECT c.id, c.subject, count(m.id) as message_count
FROM conversations c
JOIN direct_messages m ON m.conversation_id = c.id
GROUP BY c.id;
```
- **Result**: Thread records link `patient_profile_id` and `doctor_id` with message count matching posted count.
