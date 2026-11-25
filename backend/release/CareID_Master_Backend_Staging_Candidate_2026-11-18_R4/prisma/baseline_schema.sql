-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "RoleName" AS ENUM ('PATIENT', 'FAMILY_MEMBER', 'DOCTOR', 'FACILITY_ADMIN', 'STAFF', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "FamilyRelationshipType" AS ENUM ('GUARDIAN', 'DEPENDENT', 'PARENT', 'CHILD', 'SPOUSE', 'SIBLING', 'CAREGIVER', 'OTHER');

-- CreateEnum
CREATE TYPE "FamilyMemberStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ConsentStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ConsentCategory" AS ENUM ('MEDICAL_RECORDS', 'HEALTH_CARD', 'INSURANCE', 'EMERGENCY_ACCESS', 'DOCTOR_ACCESS', 'FACILITY_ACCESS');

-- CreateEnum
CREATE TYPE "InsurancePolicyStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'CANCELLED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'IN_REVIEW', 'CANCELLED');

-- CreateEnum
CREATE TYPE "HealthCardStatus" AS ENUM ('ISSUED', 'ACTIVE', 'DEACTIVATED', 'SUSPENDED', 'BLOCKED', 'EXPIRED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "QrEntityType" AS ENUM ('HEALTH_CARD', 'MEDICAL_RECORD', 'MEDICAL_REPORT', 'INSURANCE', 'IMMUNISATION', 'DOCTOR_ID', 'FACILITY_ID', 'STAFF_ID', 'EMERGENCY_CARD', 'CUSTOM');

-- CreateEnum
CREATE TYPE "QrStatus" AS ENUM ('ACTIVE', 'ROTATED', 'REVOKED', 'EXPIRED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('DRAFT', 'UPLOADED', 'VERIFIED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ReportCategory" AS ENUM ('LAB', 'RADIOLOGY', 'PRESCRIPTION', 'REFERRAL', 'DISCHARGE', 'VACCINATION', 'CLINICAL_NOTES', 'INSURANCE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "FacilityVerificationStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'SUSPENDED', 'REVOKED');

-- CreateEnum
CREATE TYPE "MedicalRecordStatus" AS ENUM ('DRAFT', 'FINAL', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AttachmentCategory" AS ENUM ('IMAGE', 'PDF', 'DICOM', 'SCANNED_DOC', 'PRESCRIPTION', 'REFERRAL_LETTER', 'LAB_RESULT', 'RADIOLOGY', 'CLINICAL_NOTE', 'OTHER');

-- CreateEnum
CREATE TYPE "VaccinationStatus" AS ENUM ('SCHEDULED', 'DUE', 'ADMINISTERED', 'COMPLETED', 'MISSED', 'DEFERRED', 'CANCELLED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "VaccineTargetGroup" AS ENUM ('ALL', 'INFANT', 'CHILD', 'ADOLESCENT', 'ADULT', 'ELDERLY', 'PREGNANT', 'HIGH_RISK');

-- CreateEnum
CREATE TYPE "DoctorVerificationStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'SUSPENDED', 'REVOKED');

-- CreateEnum
CREATE TYPE "StaffVerificationStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'SUSPENDED', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ScheduleOwnerType" AS ENUM ('DOCTOR', 'STAFF', 'FACILITY', 'DEPARTMENT');

-- CreateEnum
CREATE TYPE "SessionType" AS ENUM ('MORNING', 'AFTERNOON', 'EVENING', 'NIGHT', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ShiftType" AS ENUM ('MORNING', 'EVENING', 'NIGHT', 'SPLIT', 'CUSTOM');

-- CreateEnum
CREATE TYPE "SlotStatus" AS ENUM ('AVAILABLE', 'BLOCKED', 'HOLIDAY', 'LEAVE', 'EXCEPTION');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('PAGE', 'FAQ', 'ANNOUNCEMENT', 'NOTICE', 'POLICY', 'BANNER', 'MEDIA', 'CONTENT_BLOCK');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO', 'PDF', 'DOCUMENT', 'AUDIO', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('SUMMARY', 'DETAILED', 'STATISTICAL', 'COMPLIANCE', 'AUDIT', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ExportFormat" AS ENUM ('PDF', 'CSV', 'XLSX', 'JSON');

-- CreateEnum
CREATE TYPE "GeneratedReportStatus" AS ENUM ('GENERATED', 'EXPORTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "GovernanceStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ConfigurationType" AS ENUM ('SYSTEM', 'SECURITY', 'EMAIL', 'STORAGE', 'API', 'AUTH', 'FEATURE', 'UI', 'GENERAL');

-- CreateEnum
CREATE TYPE "FeatureFlagStatus" AS ENUM ('ENABLED', 'DISABLED', 'BETA', 'DEPRECATED');

-- CreateEnum
CREATE TYPE "MaintenanceMode" AS ENUM ('OFF', 'READ_ONLY', 'FULL');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'SMS', 'PUSH', 'WEBHOOK');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'READ');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('SYSTEM', 'SECURITY', 'PATIENT', 'DOCTOR', 'STAFF', 'CMS', 'REPORT', 'GOVERNANCE', 'GENERAL');

-- CreateEnum
CREATE TYPE "OCRJobStatus" AS ENUM ('QUEUED', 'PREPROCESSING', 'OCR_RUNNING', 'EXTRACTING', 'REVIEW_REQUIRED', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "OCRDocumentType" AS ENUM ('UNKNOWN', 'HEALTH_CARD', 'PASSPORT', 'DRIVERS_LICENSE', 'INSURANCE_DOCUMENT', 'LAB_REPORT', 'DIAGNOSTIC_REPORT', 'MEDICAL_REPORT', 'PRESCRIPTION', 'REFERRAL', 'DISCHARGE_SUMMARY', 'CONSENT_FORM', 'REGISTRATION_FORM', 'VACCINATION_RECORD', 'MEDICAL_CERTIFICATE', 'OTHER');

-- CreateEnum
CREATE TYPE "OCRConfidenceLevel" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "SecurityConsentStatus" AS ENUM ('PENDING', 'GRANTED', 'DENIED', 'WITHDRAWN', 'EXPIRED');

-- CreateEnum
CREATE TYPE "SecurityConsentType" AS ENUM ('TREATMENT', 'DATA_COLLECTION', 'DATA_SHARING', 'RESEARCH', 'MARKETING', 'DOCUMENT_PROCESSING', 'OTHER');

-- CreateEnum
CREATE TYPE "EncryptionStatus" AS ENUM ('ACTIVE', 'ROTATING', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "RetentionAction" AS ENUM ('ARCHIVE', 'DELETE', 'ANONYMIZE');

-- CreateEnum
CREATE TYPE "SecurityIncidentSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "SystemHealthStatus" AS ENUM ('HEALTHY', 'DEGRADED', 'UNHEALTHY', 'OFFLINE');

-- CreateEnum
CREATE TYPE "MetricCategory" AS ENUM ('SYSTEM', 'APPLICATION', 'DATABASE', 'CACHE', 'QUEUE', 'API', 'SECURITY', 'OCR', 'NOTIFICATION');

-- CreateEnum
CREATE TYPE "LogSeverity" AS ENUM ('TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL');

-- CreateEnum
CREATE TYPE "TraceStatus" AS ENUM ('STARTED', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "CacheStatus" AS ENUM ('HIT', 'MISS', 'EVICTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'TRIAGED', 'ACCEPTED', 'REJECTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ReferralPriority" AS ENUM ('ROUTINE', 'URGENT', 'EMERGENCY', 'STAT');

-- CreateEnum
CREATE TYPE "ReferralType" AS ENUM ('SPECIALIST_CONSULTATION', 'DIAGNOSTIC_IMAGING', 'LABORATORY_TEST', 'PHYSICAL_THERAPY', 'INPATIENT_TRANSFER', 'OUTPATIENT_CARE', 'SECOND_OPINION');

-- CreateEnum
CREATE TYPE "ReferralTriageOutcome" AS ENUM ('APPROVED', 'MORE_INFO_REQUESTED', 'DECLINED', 'REDIRECTED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "password_hash" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" "RoleName" NOT NULL,
    "description" TEXT,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_otps" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "otp_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "resend_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_otps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "is_revoked" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "patient_number" TEXT,
    "first_name" TEXT,
    "last_name" TEXT,
    "date_of_birth" TIMESTAMP(3),
    "gender" TEXT,
    "blood_group" TEXT,
    "nationality" TEXT,
    "occupation" TEXT,
    "marital_status" TEXT,
    "languages" TEXT[],
    "address" TEXT,
    "current_address_line1" TEXT,
    "current_address_line2" TEXT,
    "current_city" TEXT,
    "current_state" TEXT,
    "current_district" TEXT,
    "current_postal_code" TEXT,
    "current_country" TEXT,
    "permanent_address_line1" TEXT,
    "permanent_address_line2" TEXT,
    "permanent_city" TEXT,
    "permanent_state" TEXT,
    "permanent_postal_code" TEXT,
    "permanent_country" TEXT,
    "photo_url" TEXT,
    "photo_key" TEXT,
    "known_allergies" TEXT[],
    "chronic_conditions" TEXT[],
    "disabilities" TEXT[],
    "pref_contact_method" TEXT,
    "email_notifications" BOOLEAN NOT NULL DEFAULT true,
    "sms_notifications" BOOLEAN NOT NULL DEFAULT true,
    "push_notifications" BOOLEAN NOT NULL DEFAULT true,
    "profile_visibility" TEXT NOT NULL DEFAULT 'PRIVATE',
    "onboarding_step" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_contacts" (
    "id" TEXT NOT NULL,
    "patient_profile_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emergency_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "family_members" (
    "id" TEXT NOT NULL,
    "patient_profile_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "relationship_type" "FamilyRelationshipType" NOT NULL DEFAULT 'OTHER',
    "phone" TEXT NOT NULL,
    "status" "FamilyMemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "is_guardian" BOOLEAN NOT NULL DEFAULT false,
    "is_dependent" BOOLEAN NOT NULL DEFAULT false,
    "is_caregiver" BOOLEAN NOT NULL DEFAULT false,
    "verification_status" TEXT NOT NULL DEFAULT 'UNVERIFIED',
    "notes" TEXT,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "family_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "family_consents" (
    "id" TEXT NOT NULL,
    "patient_profile_id" TEXT NOT NULL,
    "invitee_phone" TEXT NOT NULL,
    "invitee_name" TEXT,
    "relationship" TEXT NOT NULL,
    "relationship_type" "FamilyRelationshipType" NOT NULL DEFAULT 'OTHER',
    "status" "ConsentStatus" NOT NULL DEFAULT 'PENDING',
    "invitation_token" TEXT NOT NULL,
    "resend_count" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3),
    "accepted_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "family_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_records" (
    "id" TEXT NOT NULL,
    "patient_profile_id" TEXT NOT NULL,
    "family_member_id" TEXT NOT NULL,
    "category" "ConsentCategory" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_history" (
    "id" TEXT NOT NULL,
    "consent_record_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "performed_by" TEXT,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insurance_providers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "address" TEXT,
    "network_type" TEXT NOT NULL DEFAULT 'PPO',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insurance_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insurance_plans" (
    "id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "plan_code" TEXT NOT NULL,
    "plan_type" TEXT NOT NULL DEFAULT 'COMPREHENSIVE',
    "deductible_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "copay_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "max_coverage_limit" DOUBLE PRECISION NOT NULL DEFAULT 100000,
    "pre_auth_required" BOOLEAN NOT NULL DEFAULT false,
    "waiting_period_days" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insurance_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insurance_policies" (
    "id" TEXT NOT NULL,
    "patient_profile_id" TEXT NOT NULL,
    "provider_id" TEXT,
    "plan_id" TEXT,
    "provider_name" TEXT NOT NULL,
    "policy_number" TEXT NOT NULL,
    "group_number" TEXT,
    "status" "InsurancePolicyStatus" NOT NULL DEFAULT 'ACTIVE',
    "coverage_details" TEXT,
    "start_date" TIMESTAMP(3),
    "expiry_date" TIMESTAMP(3),
    "verification_status" TEXT NOT NULL DEFAULT 'PENDING',
    "verified_by" TEXT,
    "verified_at" TIMESTAMP(3),
    "copay_amount" DOUBLE PRECISION,
    "deductible_amount" DOUBLE PRECISION,
    "max_limit" DOUBLE PRECISION,
    "pre_auth_required" BOOLEAN NOT NULL DEFAULT false,
    "secondary_provider" TEXT,
    "secondary_policy_number" TEXT,
    "secondary_coverage" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insurance_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insurance_beneficiaries" (
    "id" TEXT NOT NULL,
    "policy_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "date_of_birth" TIMESTAMP(3),
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "insurance_beneficiaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insurance_claim_drafts" (
    "id" TEXT NOT NULL,
    "policy_id" TEXT NOT NULL,
    "patient_profile_id" TEXT NOT NULL,
    "claim_number" TEXT NOT NULL,
    "status" "ClaimStatus" NOT NULL DEFAULT 'DRAFT',
    "total_amount" DOUBLE PRECISION NOT NULL,
    "diagnosis_codes" TEXT[],
    "treatment_date" TIMESTAMP(3),
    "notes" TEXT,
    "attached_record_ids" TEXT[],
    "attached_report_ids" TEXT[],
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insurance_claim_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insurance_history" (
    "id" TEXT NOT NULL,
    "policy_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "previous_status" TEXT,
    "new_status" TEXT NOT NULL,
    "reason" TEXT,
    "performed_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "insurance_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insurance_audit_logs" (
    "id" TEXT NOT NULL,
    "policy_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "performed_by" TEXT,
    "details" TEXT,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "insurance_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insurance_ocr_records" (
    "id" TEXT NOT NULL,
    "patient_profile_id" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "extracted_data" TEXT NOT NULL,
    "is_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insurance_ocr_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_cards" (
    "id" TEXT NOT NULL,
    "patient_profile_id" TEXT NOT NULL,
    "card_number" TEXT NOT NULL,
    "status" "HealthCardStatus" NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "emergency_flag" BOOLEAN NOT NULL DEFAULT false,
    "metadata" TEXT,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "suspended_at" TIMESTAMP(3),
    "blocked_at" TIMESTAMP(3),
    "archived_at" TIMESTAMP(3),
    "replaced_at" TIMESTAMP(3),
    "previous_card_number" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "health_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_card_history" (
    "id" TEXT NOT NULL,
    "health_card_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "previous_status" TEXT,
    "new_status" TEXT NOT NULL,
    "reason" TEXT,
    "performed_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_card_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_card_audit_logs" (
    "id" TEXT NOT NULL,
    "health_card_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "performed_by" TEXT,
    "details" TEXT,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_card_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qr_codes" (
    "id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "entity_type" "QrEntityType" NOT NULL,
    "owner_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "status" "QrStatus" NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "nonce" TEXT NOT NULL,
    "checksum" TEXT,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "rotated_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "revocation_reason" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "qr_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qr_history" (
    "id" TEXT NOT NULL,
    "qr_code_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "previous_token" TEXT,
    "new_token" TEXT,
    "previous_status" TEXT,
    "new_status" TEXT NOT NULL,
    "reason" TEXT,
    "performed_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "qr_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qr_scan_logs" (
    "id" TEXT NOT NULL,
    "qr_code_id" TEXT,
    "entity_id" TEXT NOT NULL,
    "entity_type" "QrEntityType" NOT NULL,
    "verifier_user_id" TEXT,
    "validation_result" TEXT NOT NULL,
    "failure_reason" TEXT,
    "device_info" TEXT,
    "ip_address" TEXT,
    "location" TEXT,
    "platform" TEXT,
    "scanned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "qr_scan_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qr_audit_logs" (
    "id" TEXT NOT NULL,
    "qr_code_id" TEXT,
    "action" TEXT NOT NULL,
    "performed_by" TEXT,
    "details" TEXT,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "qr_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qr_configurations" (
    "id" TEXT NOT NULL,
    "entity_type" "QrEntityType" NOT NULL,
    "default_validity_days" INTEGER NOT NULL DEFAULT 365,
    "allow_rotation" BOOLEAN NOT NULL DEFAULT true,
    "require_one_time_scan" BOOLEAN NOT NULL DEFAULT false,
    "secret_key_hash" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "qr_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_card_qrs" (
    "id" TEXT NOT NULL,
    "health_card_id" TEXT NOT NULL,
    "encrypted_payload" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "health_card_qrs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qr_verification_logs" (
    "id" TEXT NOT NULL,
    "qr_id" TEXT NOT NULL,
    "verifier_user_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "scanned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "qr_verification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medical_reports" (
    "id" TEXT NOT NULL,
    "patient_profile_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "ReportCategory" NOT NULL DEFAULT 'LAB',
    "status" "ReportStatus" NOT NULL DEFAULT 'UPLOADED',
    "report_date" TIMESTAMP(3),
    "prescribed_by" TEXT,
    "provider_name" TEXT,
    "facility_name" TEXT,
    "doctor_name" TEXT,
    "page_count" INTEGER NOT NULL DEFAULT 1,
    "language" TEXT NOT NULL DEFAULT 'en',
    "tags" TEXT[],
    "notes" TEXT,
    "verification_status" TEXT NOT NULL DEFAULT 'UNVERIFIED',
    "verified_by" TEXT,
    "verified_at" TIMESTAMP(3),
    "current_version" INTEGER NOT NULL DEFAULT 1,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medical_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_attachments" (
    "id" TEXT NOT NULL,
    "medical_report_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "original_name" TEXT,
    "file_size" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "storage_key" TEXT,
    "storage_url" TEXT NOT NULL,
    "checksum" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_versions" (
    "id" TEXT NOT NULL,
    "medical_report_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "file_name" TEXT NOT NULL,
    "storage_key" TEXT,
    "storage_url" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_audit_logs" (
    "id" TEXT NOT NULL,
    "medical_report_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "performed_by" TEXT,
    "details" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facilities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legal_name" TEXT,
    "facility_code" TEXT NOT NULL,
    "registration_number" TEXT NOT NULL,
    "facility_type" TEXT NOT NULL DEFAULT 'HOSPITAL',
    "ownership_type" TEXT NOT NULL DEFAULT 'PRIVATE',
    "building_name" TEXT,
    "street_address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "district" TEXT,
    "state" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'Pakistan',
    "pin_code" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Karachi',
    "phone" TEXT NOT NULL,
    "emergency_phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "profile_photo_url" TEXT,
    "verification_status" "FacilityVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verification_notes" TEXT,
    "verified_by" TEXT,
    "verified_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "facilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facility_branches" (
    "id" TEXT NOT NULL,
    "facility_id" TEXT NOT NULL,
    "branch_name" TEXT NOT NULL,
    "branch_code" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "phone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "facility_branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facility_departments" (
    "id" TEXT NOT NULL,
    "facility_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "department_head" TEXT,
    "operating_hours" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "facility_departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctor_facilities" (
    "id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "facility_id" TEXT NOT NULL,
    "department_id" TEXT,
    "assignment_type" TEXT NOT NULL DEFAULT 'PRIMARY',
    "privileges" TEXT[],
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doctor_facilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctor_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "gender" TEXT,
    "date_of_birth" TIMESTAMP(3),
    "profile_photo_url" TEXT,
    "digital_signature_url" TEXT,
    "biography" TEXT,
    "professional_summary" TEXT,
    "years_of_experience" INTEGER NOT NULL DEFAULT 0,
    "primary_specialization" TEXT NOT NULL,
    "secondary_specializations" TEXT[],
    "medical_council" TEXT NOT NULL,
    "registration_number" TEXT NOT NULL,
    "license_number" TEXT NOT NULL,
    "provider_identifier" TEXT NOT NULL,
    "registration_state" TEXT,
    "registration_country" TEXT,
    "registration_issue_date" TIMESTAMP(3),
    "registration_expiry_date" TIMESTAMP(3),
    "verification_status" "DoctorVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verification_notes" TEXT,
    "verified_by" TEXT,
    "verified_at" TIMESTAMP(3),
    "department" TEXT,
    "sub_specializations" TEXT[],
    "clinical_interests" TEXT[],
    "services_offered" TEXT[],
    "languages_spoken" TEXT[],
    "emergency_phone" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doctor_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctor_schedule_slots" (
    "id" TEXT NOT NULL,
    "doctor_profile_id" TEXT NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "is_booked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doctor_schedule_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_articles" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "health_articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faqs" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faqs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ocr_documents" (
    "id" TEXT NOT NULL,
    "patient_profile_id" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ocr_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ocr_extractions" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "extracted_data" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ocr_extractions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ocr_reviews" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "corrected_data" TEXT NOT NULL,
    "reviewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ocr_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_audit_logs" (
    "id" TEXT NOT NULL,
    "patient_profile_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "field_changed" TEXT,
    "previous_value" TEXT,
    "new_value" TEXT,
    "performed_by_user_id" TEXT,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medical_records" (
    "id" TEXT NOT NULL,
    "patient_profile_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "chief_complaint" TEXT,
    "clinical_notes" TEXT,
    "treatment_plan" TEXT,
    "follow_up_instructions" TEXT,
    "status" "MedicalRecordStatus" NOT NULL DEFAULT 'FINAL',
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medical_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medical_encounters" (
    "id" TEXT NOT NULL,
    "medical_record_id" TEXT NOT NULL,
    "encounter_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "provider_name" TEXT,
    "facility_name" TEXT,
    "encounter_type" TEXT NOT NULL DEFAULT 'CONSULTATION',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medical_encounters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_diagnoses" (
    "id" TEXT NOT NULL,
    "medical_record_id" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'PRIMARY',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clinical_diagnoses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vital_signs" (
    "id" TEXT NOT NULL,
    "medical_record_id" TEXT NOT NULL,
    "height_cm" DOUBLE PRECISION,
    "weight_kg" DOUBLE PRECISION,
    "bmi" DOUBLE PRECISION,
    "systolic_bp" INTEGER,
    "diastolic_bp" INTEGER,
    "pulse_bpm" INTEGER,
    "respiration_rate" INTEGER,
    "temperature_c" DOUBLE PRECISION,
    "blood_sugar_mg_dl" DOUBLE PRECISION,
    "oxygen_saturation" DOUBLE PRECISION,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vital_signs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medical_procedures" (
    "id" TEXT NOT NULL,
    "medical_record_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "performed_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medical_procedures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medical_attachments" (
    "id" TEXT NOT NULL,
    "medical_record_id" TEXT,
    "patient_profile_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "category" "AttachmentCategory" NOT NULL DEFAULT 'OTHER',
    "storage_key" TEXT NOT NULL,
    "storage_url" TEXT NOT NULL,
    "checksum" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "virus_scan_status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medical_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachment_versions" (
    "id" TEXT NOT NULL,
    "attachment_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "storage_key" TEXT NOT NULL,
    "storage_url" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachment_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medical_record_audit_logs" (
    "id" TEXT NOT NULL,
    "medical_record_id" TEXT,
    "attachment_id" TEXT,
    "action" TEXT NOT NULL,
    "performed_by" TEXT,
    "details" TEXT,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medical_record_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vaccines" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "manufacturer" TEXT,
    "target_group" "VaccineTargetGroup" NOT NULL DEFAULT 'ALL',
    "min_age_months" INTEGER NOT NULL DEFAULT 0,
    "max_age_months" INTEGER,
    "total_doses_required" INTEGER NOT NULL DEFAULT 1,
    "min_interval_days" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "contraindications" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vaccines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vaccination_schedules" (
    "id" TEXT NOT NULL,
    "vaccine_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dose_number" INTEGER NOT NULL,
    "recommended_age_months" INTEGER NOT NULL,
    "is_booster" BOOLEAN NOT NULL DEFAULT false,
    "booster_interval_days" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vaccination_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vaccination_records" (
    "id" TEXT NOT NULL,
    "patient_profile_id" TEXT NOT NULL,
    "vaccine_id" TEXT NOT NULL,
    "schedule_id" TEXT,
    "dose_number" INTEGER NOT NULL DEFAULT 1,
    "status" "VaccinationStatus" NOT NULL DEFAULT 'SCHEDULED',
    "due_date" TIMESTAMP(3),
    "administered_date" TIMESTAMP(3),
    "administered_by" TEXT,
    "facility_name" TEXT,
    "batch_number" TEXT,
    "lot_number" TEXT,
    "expiration_date" TIMESTAMP(3),
    "site_of_injection" TEXT,
    "route_of_admin" TEXT,
    "notes" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vaccination_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vaccination_certificates" (
    "id" TEXT NOT NULL,
    "patient_profile_id" TEXT NOT NULL,
    "record_id" TEXT NOT NULL,
    "certificate_number" TEXT NOT NULL,
    "issue_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verification_status" TEXT NOT NULL DEFAULT 'VERIFIED',
    "qr_token" TEXT,
    "report_attachment_id" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vaccination_certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vaccination_reminder_configs" (
    "id" TEXT NOT NULL,
    "patient_profile_id" TEXT NOT NULL,
    "vaccine_id" TEXT NOT NULL,
    "reminder_days_before" INTEGER NOT NULL DEFAULT 7,
    "enable_email" BOOLEAN NOT NULL DEFAULT true,
    "enable_sms" BOOLEAN NOT NULL DEFAULT false,
    "enable_push" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vaccination_reminder_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vaccination_history" (
    "id" TEXT NOT NULL,
    "record_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "previous_status" TEXT,
    "new_status" TEXT NOT NULL,
    "reason" TEXT,
    "performed_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vaccination_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vaccination_audit_logs" (
    "id" TEXT NOT NULL,
    "record_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "performed_by" TEXT,
    "details" TEXT,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vaccination_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctor_qualifications" (
    "id" TEXT NOT NULL,
    "doctor_profile_id" TEXT NOT NULL,
    "degree_name" TEXT NOT NULL,
    "institute_name" TEXT NOT NULL,
    "passing_year" INTEGER NOT NULL,
    "specialization" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doctor_qualifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctor_certifications" (
    "id" TEXT NOT NULL,
    "doctor_profile_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "issuing_authority" TEXT NOT NULL,
    "issue_date" TIMESTAMP(3),
    "expiry_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doctor_certifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctor_experiences" (
    "id" TEXT NOT NULL,
    "doctor_profile_id" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "hospital_name" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doctor_experiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctor_documents" (
    "id" TEXT NOT NULL,
    "doctor_profile_id" TEXT NOT NULL,
    "document_type" TEXT NOT NULL,
    "medical_attachment_id" TEXT,
    "verification_status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doctor_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctor_history" (
    "id" TEXT NOT NULL,
    "doctor_profile_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "previous_status" TEXT,
    "new_status" TEXT NOT NULL,
    "reason" TEXT,
    "performed_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doctor_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctor_audit_logs" (
    "id" TEXT NOT NULL,
    "doctor_profile_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "performed_by" TEXT,
    "details" TEXT,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doctor_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facility_rooms" (
    "id" TEXT NOT NULL,
    "facility_id" TEXT NOT NULL,
    "department_id" TEXT,
    "room_number" TEXT NOT NULL,
    "room_name" TEXT,
    "building" TEXT,
    "block" TEXT,
    "floor" TEXT,
    "wing" TEXT,
    "room_category" TEXT NOT NULL DEFAULT 'CONSULTATION_ROOM',
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "is_operational" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "facility_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facility_licenses" (
    "id" TEXT NOT NULL,
    "facility_id" TEXT NOT NULL,
    "license_type" TEXT NOT NULL,
    "license_number" TEXT NOT NULL,
    "issuing_authority" TEXT NOT NULL,
    "issue_date" TIMESTAMP(3),
    "expiry_date" TIMESTAMP(3),
    "renewal_date" TIMESTAMP(3),
    "verification_status" TEXT NOT NULL DEFAULT 'VERIFIED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "facility_licenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facility_accreditations" (
    "id" TEXT NOT NULL,
    "facility_id" TEXT NOT NULL,
    "accreditation_body" TEXT NOT NULL,
    "certificate_number" TEXT NOT NULL,
    "valid_from" TIMESTAMP(3),
    "valid_to" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "facility_accreditations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facility_documents" (
    "id" TEXT NOT NULL,
    "facility_id" TEXT NOT NULL,
    "document_type" TEXT NOT NULL,
    "medical_attachment_id" TEXT,
    "verification_status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "facility_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facility_history" (
    "id" TEXT NOT NULL,
    "facility_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "previous_status" TEXT,
    "new_status" TEXT NOT NULL,
    "reason" TEXT,
    "performed_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "facility_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facility_audit_logs" (
    "id" TEXT NOT NULL,
    "facility_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "performed_by" TEXT,
    "details" TEXT,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "facility_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_members" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "employee_code" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "gender" TEXT,
    "date_of_birth" TIMESTAMP(3),
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "emergency_contact" TEXT,
    "profile_photo_url" TEXT,
    "staff_type" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "primary_facility_id" TEXT NOT NULL,
    "secondary_facility_id" TEXT,
    "primary_department_id" TEXT,
    "secondary_department_id" TEXT,
    "reporting_manager_id" TEXT,
    "employment_type" TEXT NOT NULL DEFAULT 'PERMANENT',
    "employment_status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "joining_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "termination_date" TIMESTAMP(3),
    "notice_period_days" INTEGER NOT NULL DEFAULT 30,
    "biography" TEXT,
    "languages_spoken" TEXT[],
    "verification_status" "StaffVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verification_notes" TEXT,
    "verified_by" TEXT,
    "verified_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_qualifications" (
    "id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "degree_name" TEXT NOT NULL,
    "institute_name" TEXT NOT NULL,
    "passing_year" INTEGER NOT NULL,
    "field_of_study" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_qualifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_certifications" (
    "id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "issuing_authority" TEXT NOT NULL,
    "issue_date" TIMESTAMP(3),
    "expiry_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_certifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_experiences" (
    "id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_experiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_documents" (
    "id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "document_type" TEXT NOT NULL,
    "medical_attachment_id" TEXT,
    "verification_status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_history" (
    "id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "previous_status" TEXT,
    "new_status" TEXT NOT NULL,
    "reason" TEXT,
    "performed_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_audit_logs" (
    "id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "performed_by" TEXT,
    "details" TEXT,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedules" (
    "id" TEXT NOT NULL,
    "owner_type" "ScheduleOwnerType" NOT NULL,
    "doctor_profile_id" TEXT,
    "staff_id" TEXT,
    "facility_id" TEXT,
    "department_id" TEXT,
    "title" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Karachi',
    "slot_duration_minutes" INTEGER NOT NULL DEFAULT 15,
    "buffer_minutes" INTEGER NOT NULL DEFAULT 5,
    "max_patients_per_slot" INTEGER NOT NULL DEFAULT 1,
    "effective_from" TIMESTAMP(3) NOT NULL,
    "effective_to" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "working_hours" (
    "id" TEXT NOT NULL,
    "schedule_id" TEXT NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "session_type" "SessionType" NOT NULL DEFAULT 'MORNING',
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "break_start" TEXT,
    "break_end" TEXT,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "working_hours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurring_schedules" (
    "id" TEXT NOT NULL,
    "schedule_id" TEXT NOT NULL,
    "recurrence_type" TEXT NOT NULL DEFAULT 'WEEKLY',
    "recurrence_days" INTEGER[],
    "skip_holidays" BOOLEAN NOT NULL DEFAULT true,
    "skip_leave" BOOLEAN NOT NULL DEFAULT true,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recurring_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_exceptions" (
    "id" TEXT NOT NULL,
    "schedule_id" TEXT NOT NULL,
    "exception_type" TEXT NOT NULL,
    "start_datetime" TIMESTAMP(3) NOT NULL,
    "end_datetime" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "added_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "schedule_exceptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_blocks" (
    "id" TEXT NOT NULL,
    "schedule_id" TEXT NOT NULL,
    "leave_type" TEXT NOT NULL DEFAULT 'CASUAL',
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "approved_by" TEXT,
    "status" TEXT NOT NULL DEFAULT 'APPROVED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leave_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "holiday_calendars" (
    "id" TEXT NOT NULL,
    "facility_id" TEXT,
    "name" TEXT NOT NULL,
    "holiday_date" TIMESTAMP(3) NOT NULL,
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "holiday_calendars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shifts" (
    "id" TEXT NOT NULL,
    "facility_id" TEXT NOT NULL,
    "department_id" TEXT,
    "name" TEXT NOT NULL,
    "shift_type" "ShiftType" NOT NULL DEFAULT 'MORNING',
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "break_duration_minutes" INTEGER NOT NULL DEFAULT 30,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_assignments" (
    "id" TEXT NOT NULL,
    "shift_id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "assigned_date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ASSIGNED',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shift_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generated_slots" (
    "id" TEXT NOT NULL,
    "schedule_id" TEXT NOT NULL,
    "slot_date" TIMESTAMP(3) NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "status" "SlotStatus" NOT NULL DEFAULT 'AVAILABLE',
    "status_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "generated_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_audit_logs" (
    "id" TEXT NOT NULL,
    "schedule_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "performed_by" TEXT,
    "details" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "schedule_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permission_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permission_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "group_id" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "logo_url" TEXT,
    "primary_color" TEXT,
    "secondary_color" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "street_address" TEXT,
    "city" TEXT,
    "district" TEXT,
    "state" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Pakistan',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Karachi',
    "language" TEXT NOT NULL DEFAULT 'en',
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_settings" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "value_type" TEXT NOT NULL DEFAULT 'STRING',
    "description" TEXT,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms_pages" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "summary" TEXT,
    "seo_title" TEXT,
    "seo_description" TEXT,
    "seo_keywords" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMP(3),
    "created_by" TEXT,
    "updated_by" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cms_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms_faqs" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cms_faqs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms_announcements" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMP(3),
    "created_by" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cms_announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms_policies" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "policy_type" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "content" TEXT NOT NULL,
    "effective_date" TIMESTAMP(3),
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cms_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms_banners" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "mobile_image_url" TEXT,
    "redirect_url" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cms_banners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_library" (
    "id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "media_type" "MediaType" NOT NULL DEFAULT 'OTHER',
    "uploaded_by" TEXT,
    "metadata" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_library_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_blocks" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms_audit_logs" (
    "id" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "content_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "performed_by" TEXT,
    "details" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cms_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_definitions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "report_type" "ReportType" NOT NULL DEFAULT 'SUMMARY',
    "module" TEXT NOT NULL,
    "configuration" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT,
    "updated_by" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generated_reports" (
    "id" TEXT NOT NULL,
    "report_definition_id" TEXT,
    "generated_by" TEXT,
    "report_name" TEXT NOT NULL,
    "filters" TEXT,
    "export_format" "ExportFormat" NOT NULL DEFAULT 'JSON',
    "file_path" TEXT,
    "status" "GeneratedReportStatus" NOT NULL DEFAULT 'GENERATED',
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "generated_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_widgets" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "widget_code" TEXT NOT NULL,
    "widget_type" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "configuration" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dashboard_widgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_snapshots" (
    "id" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "metric_value" DOUBLE PRECISION NOT NULL,
    "snapshot_date" TIMESTAMP(3) NOT NULL,
    "metadata" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_report_audit_logs" (
    "id" TEXT NOT NULL,
    "report_id" TEXT,
    "action" TEXT NOT NULL,
    "performed_by" TEXT,
    "details" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_report_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_configurations" (
    "id" TEXT NOT NULL,
    "category" "ConfigurationType" NOT NULL DEFAULT 'GENERAL',
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "value_type" TEXT NOT NULL DEFAULT 'STRING',
    "description" TEXT,
    "is_encrypted" BOOLEAN NOT NULL DEFAULT false,
    "is_editable" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_by" TEXT,
    "updated_by" TEXT,
    "status" "GovernanceStatus" NOT NULL DEFAULT 'ACTIVE',
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_flags" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "FeatureFlagStatus" NOT NULL DEFAULT 'DISABLED',
    "enabled_for_roles" TEXT[],
    "enabled_for_modules" TEXT[],
    "rollout_percentage" INTEGER NOT NULL DEFAULT 100,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_data_categories" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "GovernanceStatus" NOT NULL DEFAULT 'ACTIVE',
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "master_data_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_data_items" (
    "id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "status" "GovernanceStatus" NOT NULL DEFAULT 'ACTIVE',
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "master_data_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuration_versions" (
    "id" TEXT NOT NULL,
    "configuration_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "previous_value" TEXT,
    "new_value" TEXT NOT NULL,
    "changed_by" TEXT,
    "change_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "configuration_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_governance_policies" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "effective_date" TIMESTAMP(3),
    "status" "GovernanceStatus" NOT NULL DEFAULT 'ACTIVE',
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_governance_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_configurations" (
    "id" TEXT NOT NULL,
    "mode" "MaintenanceMode" NOT NULL DEFAULT 'OFF',
    "message" TEXT,
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "allow_admin_access" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "governance_audit_logs" (
    "id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "performed_by" TEXT,
    "old_value" TEXT,
    "new_value" TEXT,
    "metadata" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "governance_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_templates" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    "variables" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "recipient_user_id" TEXT,
    "recipient_email" TEXT,
    "recipient_phone" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "notification_type" "NotificationType" NOT NULL DEFAULT 'GENERAL',
    "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL',
    "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "metadata" TEXT,
    "scheduled_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "email_enabled" BOOLEAN NOT NULL DEFAULT true,
    "sms_enabled" BOOLEAN NOT NULL DEFAULT true,
    "push_enabled" BOOLEAN NOT NULL DEFAULT true,
    "in_app_enabled" BOOLEAN NOT NULL DEFAULT true,
    "webhook_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_queues" (
    "id" TEXT NOT NULL,
    "notification_id" TEXT NOT NULL,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "status" "NotificationStatus" NOT NULL DEFAULT 'QUEUED',
    "next_retry_at" TIMESTAMP(3),
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_queues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_audit_logs" (
    "id" TEXT NOT NULL,
    "notification_id" TEXT,
    "action" TEXT NOT NULL,
    "performed_by" TEXT,
    "details" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ocr_jobs" (
    "id" TEXT NOT NULL,
    "medical_attachment_id" TEXT NOT NULL,
    "document_type" "OCRDocumentType" NOT NULL DEFAULT 'UNKNOWN',
    "status" "OCRJobStatus" NOT NULL DEFAULT 'QUEUED',
    "submitted_by" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "processing_time_ms" INTEGER,
    "overall_confidence" DOUBLE PRECISION,
    "confidence_level" "OCRConfidenceLevel" NOT NULL DEFAULT 'MEDIUM',
    "failure_reason" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ocr_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ocr_pages" (
    "id" TEXT NOT NULL,
    "ocr_job_id" TEXT NOT NULL,
    "page_number" INTEGER NOT NULL,
    "image_path" TEXT,
    "raw_text" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "rotation_angle" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "processing_metadata" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ocr_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "extracted_fields" (
    "id" TEXT NOT NULL,
    "ocr_job_id" TEXT NOT NULL,
    "field_name" TEXT NOT NULL,
    "field_value" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "bounding_box" TEXT,
    "validation_status" TEXT NOT NULL DEFAULT 'PENDING',
    "requires_review" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "extracted_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ocr_templates" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "document_type" "OCRDocumentType" NOT NULL,
    "field_definitions" TEXT,
    "validation_rules" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ocr_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ocr_verifications" (
    "id" TEXT NOT NULL,
    "ocr_job_id" TEXT NOT NULL,
    "reviewed_by" TEXT NOT NULL,
    "review_status" TEXT NOT NULL DEFAULT 'APPROVED',
    "review_notes" TEXT,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ocr_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ocr_audit_logs" (
    "id" TEXT NOT NULL,
    "ocr_job_id" TEXT,
    "action" TEXT NOT NULL,
    "performed_by" TEXT,
    "details" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ocr_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_consent_records" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "consent_type" "SecurityConsentType" NOT NULL DEFAULT 'TREATMENT',
    "status" "SecurityConsentStatus" NOT NULL DEFAULT 'GRANTED',
    "purpose" TEXT NOT NULL,
    "granted_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "withdrawn_at" TIMESTAMP(3),
    "captured_by" TEXT,
    "evidence_reference" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "security_consent_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "encryption_keys" (
    "id" TEXT NOT NULL,
    "key_identifier" TEXT NOT NULL,
    "algorithm" TEXT NOT NULL DEFAULT 'AES-256-GCM',
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "EncryptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "activated_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "rotation_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "encryption_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retention_policies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "retention_period_days" INTEGER NOT NULL DEFAULT 2555,
    "action" "RetentionAction" NOT NULL DEFAULT 'ARCHIVE',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "retention_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_incidents" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "SecurityIncidentSeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "reported_by" TEXT,
    "resolved_by" TEXT,
    "resolved_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "security_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_platform_audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resource_id" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "result" TEXT NOT NULL DEFAULT 'SUCCESS',
    "details" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_platform_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_reports" (
    "id" TEXT NOT NULL,
    "report_name" TEXT NOT NULL,
    "report_type" TEXT NOT NULL,
    "generated_by" TEXT,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "summary" TEXT,
    "metadata" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compliance_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_metrics" (
    "id" TEXT NOT NULL,
    "metric_category" "MetricCategory" NOT NULL DEFAULT 'APPLICATION',
    "metric_name" TEXT NOT NULL,
    "metric_value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'count',
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_logs" (
    "id" TEXT NOT NULL,
    "severity" "LogSeverity" NOT NULL DEFAULT 'INFO',
    "service" TEXT NOT NULL DEFAULT 'hvapi-backend',
    "module" TEXT NOT NULL DEFAULT 'core',
    "request_id" TEXT,
    "trace_id" TEXT,
    "user_id" TEXT,
    "message" TEXT NOT NULL,
    "context" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trace_executions" (
    "id" TEXT NOT NULL,
    "trace_id" TEXT NOT NULL,
    "service" TEXT NOT NULL DEFAULT 'hvapi-backend',
    "operation" TEXT NOT NULL,
    "status" "TraceStatus" NOT NULL DEFAULT 'STARTED',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "duration_ms" INTEGER,
    "metadata" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trace_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "background_jobs" (
    "id" TEXT NOT NULL,
    "job_name" TEXT NOT NULL,
    "job_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "duration_ms" INTEGER,
    "failure_reason" TEXT,
    "metadata" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "background_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_health_checks" (
    "id" TEXT NOT NULL,
    "component" TEXT NOT NULL,
    "status" "SystemHealthStatus" NOT NULL DEFAULT 'HEALTHY',
    "checked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "response_time_ms" INTEGER NOT NULL DEFAULT 0,
    "details" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_health_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_snapshots" (
    "id" TEXT NOT NULL,
    "cpu_usage" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "memory_usage" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "database_latency" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "cache_hit_rate" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "queue_depth" INTEGER NOT NULL DEFAULT 0,
    "active_users" INTEGER NOT NULL DEFAULT 0,
    "request_rate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "error_rate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "performance_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_referrals" (
    "id" TEXT NOT NULL,
    "referral_number" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "referring_doctor_id" TEXT NOT NULL,
    "referring_facility_id" TEXT NOT NULL,
    "receiving_doctor_id" TEXT,
    "receiving_facility_id" TEXT NOT NULL,
    "medical_record_id" TEXT,
    "referral_type" "ReferralType" NOT NULL DEFAULT 'SPECIALIST_CONSULTATION',
    "priority" "ReferralPriority" NOT NULL DEFAULT 'ROUTINE',
    "status" "ReferralStatus" NOT NULL DEFAULT 'SUBMITTED',
    "reason_for_referral" TEXT NOT NULL,
    "clinical_summary" TEXT,
    "specialty_required" TEXT,
    "expires_at" TIMESTAMP(3),
    "accepted_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_notes" (
    "id" TEXT NOT NULL,
    "referral_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "author_role" TEXT NOT NULL,
    "note_text" TEXT NOT NULL,
    "is_private" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_attachments" (
    "id" TEXT NOT NULL,
    "referral_id" TEXT NOT NULL,
    "attachment_id" TEXT NOT NULL,
    "attached_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_status_histories" (
    "id" TEXT NOT NULL,
    "referral_id" TEXT NOT NULL,
    "from_status" "ReferralStatus",
    "to_status" "ReferralStatus" NOT NULL,
    "changed_by" TEXT NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_status_histories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_user_id_role_id_key" ON "user_roles"("user_id", "role_id");

-- CreateIndex
CREATE UNIQUE INDEX "patient_profiles_user_id_key" ON "patient_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "patient_profiles_patient_number_key" ON "patient_profiles"("patient_number");

-- CreateIndex
CREATE UNIQUE INDEX "emergency_contacts_patient_profile_id_key" ON "emergency_contacts"("patient_profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "family_consents_invitation_token_key" ON "family_consents"("invitation_token");

-- CreateIndex
CREATE UNIQUE INDEX "insurance_providers_code_key" ON "insurance_providers"("code");

-- CreateIndex
CREATE UNIQUE INDEX "insurance_policies_patient_profile_id_key" ON "insurance_policies"("patient_profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "insurance_claim_drafts_claim_number_key" ON "insurance_claim_drafts"("claim_number");

-- CreateIndex
CREATE UNIQUE INDEX "health_cards_patient_profile_id_key" ON "health_cards"("patient_profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "health_cards_card_number_key" ON "health_cards"("card_number");

-- CreateIndex
CREATE UNIQUE INDEX "qr_codes_token_key" ON "qr_codes"("token");

-- CreateIndex
CREATE INDEX "qr_codes_entity_id_entity_type_idx" ON "qr_codes"("entity_id", "entity_type");

-- CreateIndex
CREATE INDEX "qr_codes_owner_id_idx" ON "qr_codes"("owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "qr_configurations_entity_type_key" ON "qr_configurations"("entity_type");

-- CreateIndex
CREATE UNIQUE INDEX "health_card_qrs_health_card_id_key" ON "health_card_qrs"("health_card_id");

-- CreateIndex
CREATE UNIQUE INDEX "facilities_facility_code_key" ON "facilities"("facility_code");

-- CreateIndex
CREATE UNIQUE INDEX "facilities_registration_number_key" ON "facilities"("registration_number");

-- CreateIndex
CREATE UNIQUE INDEX "doctor_facilities_doctor_id_facility_id_key" ON "doctor_facilities"("doctor_id", "facility_id");

-- CreateIndex
CREATE UNIQUE INDEX "doctor_profiles_user_id_key" ON "doctor_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "doctor_profiles_registration_number_key" ON "doctor_profiles"("registration_number");

-- CreateIndex
CREATE UNIQUE INDEX "doctor_profiles_license_number_key" ON "doctor_profiles"("license_number");

-- CreateIndex
CREATE UNIQUE INDEX "doctor_profiles_provider_identifier_key" ON "doctor_profiles"("provider_identifier");

-- CreateIndex
CREATE UNIQUE INDEX "vaccines_code_key" ON "vaccines"("code");

-- CreateIndex
CREATE UNIQUE INDEX "vaccination_certificates_certificate_number_key" ON "vaccination_certificates"("certificate_number");

-- CreateIndex
CREATE UNIQUE INDEX "staff_members_user_id_key" ON "staff_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "staff_members_employee_code_key" ON "staff_members"("employee_code");

-- CreateIndex
CREATE INDEX "holiday_calendars_facility_id_idx" ON "holiday_calendars"("facility_id");

-- CreateIndex
CREATE INDEX "holiday_calendars_holiday_date_idx" ON "holiday_calendars"("holiday_date");

-- CreateIndex
CREATE UNIQUE INDEX "shift_assignments_shift_id_staff_id_assigned_date_key" ON "shift_assignments"("shift_id", "staff_id", "assigned_date");

-- CreateIndex
CREATE INDEX "generated_slots_schedule_id_slot_date_idx" ON "generated_slots"("schedule_id", "slot_date");

-- CreateIndex
CREATE UNIQUE INDEX "permission_groups_name_key" ON "permission_groups"("name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_role_id_permission_id_key" ON "role_permissions"("role_id", "permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_code_key" ON "organizations"("code");

-- CreateIndex
CREATE UNIQUE INDEX "platform_settings_key_key" ON "platform_settings"("key");

-- CreateIndex
CREATE UNIQUE INDEX "cms_pages_slug_key" ON "cms_pages"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "content_blocks_code_key" ON "content_blocks"("code");

-- CreateIndex
CREATE UNIQUE INDEX "report_definitions_code_key" ON "report_definitions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "dashboard_widgets_widget_code_key" ON "dashboard_widgets"("widget_code");

-- CreateIndex
CREATE INDEX "analytics_snapshots_module_metric_snapshot_date_idx" ON "analytics_snapshots"("module", "metric", "snapshot_date");

-- CreateIndex
CREATE UNIQUE INDEX "system_configurations_key_key" ON "system_configurations"("key");

-- CreateIndex
CREATE UNIQUE INDEX "feature_flags_code_key" ON "feature_flags"("code");

-- CreateIndex
CREATE UNIQUE INDEX "master_data_categories_code_key" ON "master_data_categories"("code");

-- CreateIndex
CREATE UNIQUE INDEX "master_data_items_category_id_code_key" ON "master_data_items"("category_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "platform_governance_policies_code_key" ON "platform_governance_policies"("code");

-- CreateIndex
CREATE UNIQUE INDEX "notification_templates_code_key" ON "notification_templates"("code");

-- CreateIndex
CREATE INDEX "notifications_recipient_user_id_status_idx" ON "notifications"("recipient_user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_user_id_key" ON "notification_preferences"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "ocr_templates_code_key" ON "ocr_templates"("code");

-- CreateIndex
CREATE INDEX "security_consent_records_patient_id_status_idx" ON "security_consent_records"("patient_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "encryption_keys_key_identifier_key" ON "encryption_keys"("key_identifier");

-- CreateIndex
CREATE UNIQUE INDEX "retention_policies_resource_type_key" ON "retention_policies"("resource_type");

-- CreateIndex
CREATE INDEX "security_platform_audit_logs_user_id_action_idx" ON "security_platform_audit_logs"("user_id", "action");

-- CreateIndex
CREATE INDEX "system_metrics_metric_category_metric_name_idx" ON "system_metrics"("metric_category", "metric_name");

-- CreateIndex
CREATE INDEX "application_logs_severity_service_idx" ON "application_logs"("severity", "service");

-- CreateIndex
CREATE INDEX "application_logs_request_id_idx" ON "application_logs"("request_id");

-- CreateIndex
CREATE INDEX "application_logs_trace_id_idx" ON "application_logs"("trace_id");

-- CreateIndex
CREATE INDEX "trace_executions_trace_id_idx" ON "trace_executions"("trace_id");

-- CreateIndex
CREATE UNIQUE INDEX "patient_referrals_referral_number_key" ON "patient_referrals"("referral_number");

-- CreateIndex
CREATE INDEX "patient_referrals_patient_id_idx" ON "patient_referrals"("patient_id");

-- CreateIndex
CREATE INDEX "patient_referrals_referring_doctor_id_idx" ON "patient_referrals"("referring_doctor_id");

-- CreateIndex
CREATE INDEX "patient_referrals_receiving_facility_id_idx" ON "patient_referrals"("receiving_facility_id");

-- CreateIndex
CREATE INDEX "patient_referrals_status_priority_idx" ON "patient_referrals"("status", "priority");

-- CreateIndex
CREATE INDEX "referral_notes_referral_id_idx" ON "referral_notes"("referral_id");

-- CreateIndex
CREATE INDEX "referral_attachments_referral_id_idx" ON "referral_attachments"("referral_id");

-- CreateIndex
CREATE INDEX "referral_status_histories_referral_id_idx" ON "referral_status_histories"("referral_id");

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_otps" ADD CONSTRAINT "auth_otps_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_profiles" ADD CONSTRAINT "patient_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_contacts" ADD CONSTRAINT "emergency_contacts_patient_profile_id_fkey" FOREIGN KEY ("patient_profile_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_patient_profile_id_fkey" FOREIGN KEY ("patient_profile_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_consents" ADD CONSTRAINT "family_consents_patient_profile_id_fkey" FOREIGN KEY ("patient_profile_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_patient_profile_id_fkey" FOREIGN KEY ("patient_profile_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_family_member_id_fkey" FOREIGN KEY ("family_member_id") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_history" ADD CONSTRAINT "consent_history_consent_record_id_fkey" FOREIGN KEY ("consent_record_id") REFERENCES "consent_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurance_plans" ADD CONSTRAINT "insurance_plans_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "insurance_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurance_policies" ADD CONSTRAINT "insurance_policies_patient_profile_id_fkey" FOREIGN KEY ("patient_profile_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurance_policies" ADD CONSTRAINT "insurance_policies_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "insurance_providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurance_policies" ADD CONSTRAINT "insurance_policies_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "insurance_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurance_beneficiaries" ADD CONSTRAINT "insurance_beneficiaries_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "insurance_policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurance_claim_drafts" ADD CONSTRAINT "insurance_claim_drafts_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "insurance_policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurance_history" ADD CONSTRAINT "insurance_history_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "insurance_policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurance_audit_logs" ADD CONSTRAINT "insurance_audit_logs_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "insurance_policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_cards" ADD CONSTRAINT "health_cards_patient_profile_id_fkey" FOREIGN KEY ("patient_profile_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_card_history" ADD CONSTRAINT "health_card_history_health_card_id_fkey" FOREIGN KEY ("health_card_id") REFERENCES "health_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_card_audit_logs" ADD CONSTRAINT "health_card_audit_logs_health_card_id_fkey" FOREIGN KEY ("health_card_id") REFERENCES "health_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_history" ADD CONSTRAINT "qr_history_qr_code_id_fkey" FOREIGN KEY ("qr_code_id") REFERENCES "qr_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_scan_logs" ADD CONSTRAINT "qr_scan_logs_qr_code_id_fkey" FOREIGN KEY ("qr_code_id") REFERENCES "qr_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_audit_logs" ADD CONSTRAINT "qr_audit_logs_qr_code_id_fkey" FOREIGN KEY ("qr_code_id") REFERENCES "qr_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_card_qrs" ADD CONSTRAINT "health_card_qrs_health_card_id_fkey" FOREIGN KEY ("health_card_id") REFERENCES "health_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_reports" ADD CONSTRAINT "medical_reports_patient_profile_id_fkey" FOREIGN KEY ("patient_profile_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_attachments" ADD CONSTRAINT "report_attachments_medical_report_id_fkey" FOREIGN KEY ("medical_report_id") REFERENCES "medical_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_versions" ADD CONSTRAINT "report_versions_medical_report_id_fkey" FOREIGN KEY ("medical_report_id") REFERENCES "medical_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_audit_logs" ADD CONSTRAINT "report_audit_logs_medical_report_id_fkey" FOREIGN KEY ("medical_report_id") REFERENCES "medical_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facility_branches" ADD CONSTRAINT "facility_branches_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facility_departments" ADD CONSTRAINT "facility_departments_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_facilities" ADD CONSTRAINT "doctor_facilities_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_facilities" ADD CONSTRAINT "doctor_facilities_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_facilities" ADD CONSTRAINT "doctor_facilities_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "facility_departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_profiles" ADD CONSTRAINT "doctor_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_schedule_slots" ADD CONSTRAINT "doctor_schedule_slots_doctor_profile_id_fkey" FOREIGN KEY ("doctor_profile_id") REFERENCES "doctor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ocr_documents" ADD CONSTRAINT "ocr_documents_patient_profile_id_fkey" FOREIGN KEY ("patient_profile_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ocr_extractions" ADD CONSTRAINT "ocr_extractions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "ocr_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ocr_reviews" ADD CONSTRAINT "ocr_reviews_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "ocr_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_audit_logs" ADD CONSTRAINT "profile_audit_logs_patient_profile_id_fkey" FOREIGN KEY ("patient_profile_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_patient_profile_id_fkey" FOREIGN KEY ("patient_profile_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_encounters" ADD CONSTRAINT "medical_encounters_medical_record_id_fkey" FOREIGN KEY ("medical_record_id") REFERENCES "medical_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_diagnoses" ADD CONSTRAINT "clinical_diagnoses_medical_record_id_fkey" FOREIGN KEY ("medical_record_id") REFERENCES "medical_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vital_signs" ADD CONSTRAINT "vital_signs_medical_record_id_fkey" FOREIGN KEY ("medical_record_id") REFERENCES "medical_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_procedures" ADD CONSTRAINT "medical_procedures_medical_record_id_fkey" FOREIGN KEY ("medical_record_id") REFERENCES "medical_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_attachments" ADD CONSTRAINT "medical_attachments_medical_record_id_fkey" FOREIGN KEY ("medical_record_id") REFERENCES "medical_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_attachments" ADD CONSTRAINT "medical_attachments_patient_profile_id_fkey" FOREIGN KEY ("patient_profile_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachment_versions" ADD CONSTRAINT "attachment_versions_attachment_id_fkey" FOREIGN KEY ("attachment_id") REFERENCES "medical_attachments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_record_audit_logs" ADD CONSTRAINT "medical_record_audit_logs_medical_record_id_fkey" FOREIGN KEY ("medical_record_id") REFERENCES "medical_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccination_schedules" ADD CONSTRAINT "vaccination_schedules_vaccine_id_fkey" FOREIGN KEY ("vaccine_id") REFERENCES "vaccines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccination_records" ADD CONSTRAINT "vaccination_records_patient_profile_id_fkey" FOREIGN KEY ("patient_profile_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccination_records" ADD CONSTRAINT "vaccination_records_vaccine_id_fkey" FOREIGN KEY ("vaccine_id") REFERENCES "vaccines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccination_records" ADD CONSTRAINT "vaccination_records_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "vaccination_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccination_certificates" ADD CONSTRAINT "vaccination_certificates_patient_profile_id_fkey" FOREIGN KEY ("patient_profile_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccination_certificates" ADD CONSTRAINT "vaccination_certificates_record_id_fkey" FOREIGN KEY ("record_id") REFERENCES "vaccination_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccination_reminder_configs" ADD CONSTRAINT "vaccination_reminder_configs_patient_profile_id_fkey" FOREIGN KEY ("patient_profile_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccination_reminder_configs" ADD CONSTRAINT "vaccination_reminder_configs_vaccine_id_fkey" FOREIGN KEY ("vaccine_id") REFERENCES "vaccines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccination_history" ADD CONSTRAINT "vaccination_history_record_id_fkey" FOREIGN KEY ("record_id") REFERENCES "vaccination_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccination_audit_logs" ADD CONSTRAINT "vaccination_audit_logs_record_id_fkey" FOREIGN KEY ("record_id") REFERENCES "vaccination_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_qualifications" ADD CONSTRAINT "doctor_qualifications_doctor_profile_id_fkey" FOREIGN KEY ("doctor_profile_id") REFERENCES "doctor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_certifications" ADD CONSTRAINT "doctor_certifications_doctor_profile_id_fkey" FOREIGN KEY ("doctor_profile_id") REFERENCES "doctor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_experiences" ADD CONSTRAINT "doctor_experiences_doctor_profile_id_fkey" FOREIGN KEY ("doctor_profile_id") REFERENCES "doctor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_documents" ADD CONSTRAINT "doctor_documents_doctor_profile_id_fkey" FOREIGN KEY ("doctor_profile_id") REFERENCES "doctor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_documents" ADD CONSTRAINT "doctor_documents_medical_attachment_id_fkey" FOREIGN KEY ("medical_attachment_id") REFERENCES "medical_attachments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_history" ADD CONSTRAINT "doctor_history_doctor_profile_id_fkey" FOREIGN KEY ("doctor_profile_id") REFERENCES "doctor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_audit_logs" ADD CONSTRAINT "doctor_audit_logs_doctor_profile_id_fkey" FOREIGN KEY ("doctor_profile_id") REFERENCES "doctor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facility_rooms" ADD CONSTRAINT "facility_rooms_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facility_rooms" ADD CONSTRAINT "facility_rooms_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "facility_departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facility_licenses" ADD CONSTRAINT "facility_licenses_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facility_accreditations" ADD CONSTRAINT "facility_accreditations_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facility_documents" ADD CONSTRAINT "facility_documents_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facility_documents" ADD CONSTRAINT "facility_documents_medical_attachment_id_fkey" FOREIGN KEY ("medical_attachment_id") REFERENCES "medical_attachments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facility_history" ADD CONSTRAINT "facility_history_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facility_audit_logs" ADD CONSTRAINT "facility_audit_logs_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_members" ADD CONSTRAINT "staff_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_qualifications" ADD CONSTRAINT "staff_qualifications_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_certifications" ADD CONSTRAINT "staff_certifications_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_experiences" ADD CONSTRAINT "staff_experiences_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_documents" ADD CONSTRAINT "staff_documents_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_documents" ADD CONSTRAINT "staff_documents_medical_attachment_id_fkey" FOREIGN KEY ("medical_attachment_id") REFERENCES "medical_attachments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_history" ADD CONSTRAINT "staff_history_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_audit_logs" ADD CONSTRAINT "staff_audit_logs_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "working_hours" ADD CONSTRAINT "working_hours_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_schedules" ADD CONSTRAINT "recurring_schedules_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_exceptions" ADD CONSTRAINT "schedule_exceptions_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_blocks" ADD CONSTRAINT "leave_blocks_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_assignments" ADD CONSTRAINT "shift_assignments_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_slots" ADD CONSTRAINT "generated_slots_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_audit_logs" ADD CONSTRAINT "schedule_audit_logs_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "permission_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_reports" ADD CONSTRAINT "generated_reports_report_definition_id_fkey" FOREIGN KEY ("report_definition_id") REFERENCES "report_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_data_items" ADD CONSTRAINT "master_data_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "master_data_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "configuration_versions" ADD CONSTRAINT "configuration_versions_configuration_id_fkey" FOREIGN KEY ("configuration_id") REFERENCES "system_configurations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_queues" ADD CONSTRAINT "notification_queues_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ocr_pages" ADD CONSTRAINT "ocr_pages_ocr_job_id_fkey" FOREIGN KEY ("ocr_job_id") REFERENCES "ocr_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extracted_fields" ADD CONSTRAINT "extracted_fields_ocr_job_id_fkey" FOREIGN KEY ("ocr_job_id") REFERENCES "ocr_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ocr_verifications" ADD CONSTRAINT "ocr_verifications_ocr_job_id_fkey" FOREIGN KEY ("ocr_job_id") REFERENCES "ocr_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_notes" ADD CONSTRAINT "referral_notes_referral_id_fkey" FOREIGN KEY ("referral_id") REFERENCES "patient_referrals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_attachments" ADD CONSTRAINT "referral_attachments_referral_id_fkey" FOREIGN KEY ("referral_id") REFERENCES "patient_referrals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_status_histories" ADD CONSTRAINT "referral_status_histories_referral_id_fkey" FOREIGN KEY ("referral_id") REFERENCES "patient_referrals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

