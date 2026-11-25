# CAREID-CR08-BACKEND-REMINDER-001: Phase A Discovery & Baseline Audit
## Prescription Pickup Reminder Engine — Option A Architecture

### 1. Executive Summary
Approved Change Request **CR-08** requires recurring automated reminders to be delivered to patients following consultation until their prescription is marked as collected. Doctor/Facility staff configure reminder status and hours, patients receive recurring reminders, and administrators monitor pickup operations and collection status.

Under approved **Option A**, the internal reminder lifecycle (scheduling, persistence, recurring background evaluation, durable notification generation, collection-based cancellation, and audit logging) is implemented natively in NestJS and PostgreSQL. External third-party integrations (Twilio SMS, Firebase Cloud Messaging push, SendGrid email) are deferred.

This audit establishes the baseline of the CareID codebase across `backend`, `doctor_web`, `Admin_web`, PostgreSQL database `careid_integration_db`, and existing test suites.

---

### 2. Inventory of Current Implementation

#### 2.1 Prescription Entities & Storage
- **Canonical Model (`prescriptions` table)**:
  - Columns: `id`, `patient_profile_id`, `doctor_id`, `diagnosis_code`, `status` (default: `'ACTIVE'`), `discontinue_reason`, `notes` (TEXT), `prescribed_at`, `created_at`, `updated_at`.
  - Relations: `patient_profiles`, `doctor_profiles`, `prescription_items`, `prescription_refills`.
  - Current Total Records in `careid_integration_db`: **32 prescriptions** (24 containing `[PICKUP_REMINDER]` metadata).
- **Secondary Model (`medical_reports` table)**:
  - Category `PRESCRIPTION` was historically supported in legacy fallback methods; currently **0 records** exist in `careid_integration_db` with `category='PRESCRIPTION'`.

#### 2.2 Historical Reminder Configuration & Metadata Encoding
- The existing codebase stores reminder configuration serialized as a text trailer within `prescription.notes`:
  - **Active reminder format**:
    ```text
    [PICKUP_REMINDER]:{"enabled":true,"hours":4}
    ```
  - **Collected / Suppressed format**:
    ```text
    [PICKUP_REMINDER]:{"enabled":false,"hours":4,"collected":true,"collectedAt":"2026-11-22T09:05:37.330Z"}
    ```
- **Doctor Web (`doctor_web/src/pages/records/PrescriptionsPage.tsx`)**:
  - Exposes reminder toggle (`formPickupReminder`) and interval selection (`formPickupReminderHours`, default 2 hours, range 1–12h).
  - Reads `pickupReminderEnabled`, `pickupReminderHours`, `collected`, `collectedAt` from API responses.
  - Submits collection via `PATCH /api/v1/prescriptions/:id/collect` or `PATCH /api/v1/doctors/patients/:patientProfileId/prescriptions/:id/collect`.
- **Admin Web (`Admin_web/src/components/operations/AdminPrescriptionPickupDashboard.tsx`)**:
  - Lists prescriptions via `GET /api/v1/prescriptions`.
  - Marks prescriptions collected via `PATCH /api/v1/prescriptions/:id/collect`.
  - Expects `collected: true` and `remindersSuppressed: true`.

#### 2.3 Notification Infrastructure
- **Existing Models in `schema.prisma`**:
  - `Notification`: Columns `id`, `recipient_user_id`, `recipient_email`, `recipient_phone`, `title`, `message`, `notification_type` (`PATIENT`), `priority`, `channel` (`IN_APP`, `SMS`, `EMAIL`, `PUSH`), `status` (`PENDING`, `QUEUED`, `SENT`, `DELIVERED`, `FAILED`, `READ`), `metadata`, `scheduled_at`, `sent_at`, `read_at`.
  - `NotificationQueue`: Bounded retry queue.
  - `NotificationAuditLog`: Audit trail for notifications.
  - `NotificationService`: Handles template dispatch, queue processing, read/unread states, and patient-specific isolation.

#### 2.4 Background Schedulers & Workers
- Currently, **zero** active background schedulers exist for prescription pickup reminders.
- Prescriptions with `[PICKUP_REMINDER]:{"enabled":true,"hours":4}` remained un-evaluated post-consultation because no background engine identified due dates or created notifications.

---

### 3. Gap Analysis

| Requirement | Current Status | Option A Resolution |
| :--- | :--- | :--- |
| **Durable Reminder Schedule Model** | Missing dedicated relational table; only stored in `notes` text string | Add additive `prescription_reminder_schedules` table linking prescription to patient, doctor, interval, start time, next due time, and status |
| **Reminder Event Audit Table** | Missing | Add additive `prescription_reminder_events` table recording each scheduled occurrence, execution timestamp, internal notification reference, retry count, and status |
| **Recurring Background Scheduler** | Missing background loop | Implement `PrescriptionReminderScheduler` running periodic evaluations with PostgreSQL row-level locking (`FOR UPDATE SKIP LOCKED`) |
| **Durable In-App Notification Generation** | Not wired to reminders | Wire scheduler to create `Notification` records (`channel: IN_APP`, `notification_type: PATIENT`) with privacy-safe copy |
| **Collection-Based Cancellation** | Only updated `notes` text trailer | Cancel DB reminder schedule atomically on collection in addition to preserving notes marker compatibility |
| **Duplicate Prevention** | No transactional guarantee across instances | Implement database-level concurrency controls and state transitions |
| **Backend Restart Recovery** | N/A (no scheduler existed) | Scheduler queries durable PostgreSQL `next_due_at <= NOW()` on boot |
| **External Delivery Boundary** | Direct gateway stubs | Define `NotificationDeliveryAdapter` interface with default `InternalOnlyDeliveryAdapter` |

---

### 4. Compatibility & Migration Strategy
1. **Additive Schema Only**:
   - Add `PrescriptionReminderSchedule` and `PrescriptionReminderEvent` models to `prisma/schema.prisma`.
   - Maintain zero destructive alterations to existing tables.
   - Preserves all 32 existing prescriptions and existing notification records in `careid_integration_db`.
2. **Deterministic Dual-Sync with Prescription Notes**:
   - The canonical state will be stored in `prescription_reminder_schedules`.
   - The serialized `[PICKUP_REMINDER]` JSON trailer in `prescription.notes` will remain synchronized on every create, update, and collection call.
   - Doctor Web and Admin Web will continue receiving identical fields without requiring any frontend code changes.
3. **Historical Backfill**:
   - Safe migration/bootstrap routine identifies existing active prescriptions with `[PICKUP_REMINDER]:{"enabled":true}` and seeds corresponding `PrescriptionReminderSchedule` records based on `prescribedAt` + `hours`.

---

### 5. Authorization, Security & Privacy Rules
- **Clinical Role Guard**: Only `DOCTOR`, `ADMIN`, `SUPER_ADMIN`, and authorized clinic staff can configure reminders or mark prescriptions collected.
- **Patient Privacy**: Reminders generated for patients have notification messages restricted to:
  `"Your prescription is ready for pickup. Please check your CareID account for details."`
  Medication names, dosage details, and diagnostic ICD-10 codes are never included in reminder preview notifications.
- **Veterinary Record Isolation**: Veterinary prescriptions are associated with pet clinical records and cannot trigger human patient notifications or bypass clinical domain checks.
