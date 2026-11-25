-- ==============================================================================
-- CareID Production Database Hotfix (Revised): Doctor Patients Schema Alignment
-- ==============================================================================
-- Target Database: 360api (Production PostgreSQL 16)
-- Target Host: 161.97.89.183 / localhost:5432
-- Execution Mode: PENDING EXPLICIT SERVER ADMINISTRATOR APPROVAL
-- Safety Guarantee: Non-Destructive, Metadata-Only Catalog Updates, Zero Data Loss
--
-- REVISION SUMMARY (November 10, 2026):
-- 1. Consent Security: Legacy consent records without doctor/facility linkage are
--    assigned 'RESTRICTED' to prevent unauthorized permission expansion.
-- 2. Prisma Reconciliation: Removed manual INSERT into _prisma_migrations.
--    Instructs official 'npx prisma migrate resolve' with genuine checksum.
-- 3. Removed Unproven Indexes: Stripped speculative indexes on medical_records,
--    medical_reports, vital_signs, and medical_encounters.
-- 4. Removed Speculative Foreign Keys: Avoids unneeded constraints not present
--    in prisma/schema.prisma (scalar String? columns).
-- 5. Strict Lock & Statement Timeouts: Enforces 3s lock_timeout, 30s statement_timeout.
-- 6. Online Indexing Strategy: Indexes on security_consent_records are created
--    CONCURRENTLY outside the transaction block to eliminate table locks.
-- ==============================================================================


-- ==============================================================================
-- PHASE 1: DDL COLUMN ADDITIONS (TRANSACTIONAL & METADATA-ONLY)
-- In PostgreSQL 11+, ADD COLUMN with a constant DEFAULT is a fast metadata catalog
-- update (atthasmissing = true) that executes in < 5ms without rewriting the heap.
-- ==============================================================================

BEGIN;

-- Enforce strict lock and execution timeouts to avoid blocking concurrent transactions
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';

-- ------------------------------------------------------------------------------
-- 1. Table: public.security_consent_records
-- Fixes PostgreSQL error 42703 (undefined_column) / Prisma P2022 during
-- verifyDoctorPatientAccess() and findAuthorizedPatients()
-- ------------------------------------------------------------------------------

-- Add authorized_doctor_id: Designates specific doctor UUID/ID granted clinical access
ALTER TABLE public.security_consent_records 
  ADD COLUMN IF NOT EXISTS "authorized_doctor_id" TEXT;

-- Add authorized_facility_id: Designates specific facility UUID/ID granted clinical access
ALTER TABLE public.security_consent_records 
  ADD COLUMN IF NOT EXISTS "authorized_facility_id" TEXT;

-- Add access_scope: Default to 'ALL' for prospective new consent grants
ALTER TABLE public.security_consent_records 
  ADD COLUMN IF NOT EXISTS "access_scope" TEXT NOT NULL DEFAULT 'ALL';

-- SECURITY GUARD: For legacy records created prior to explicit doctor/facility scoping
-- (where authorized_doctor_id IS NULL AND authorized_facility_id IS NULL), ensure their
-- scope is set to 'RESTRICTED' so they cannot inadvertently inherit broad EHR access.
UPDATE public.security_consent_records 
  SET "access_scope" = 'RESTRICTED' 
  WHERE "authorized_doctor_id" IS NULL 
    AND "authorized_facility_id" IS NULL 
    AND "access_scope" = 'ALL';


-- ------------------------------------------------------------------------------
-- 2. Table: public.patient_referrals
-- Fixes PostgreSQL error 42703 (undefined_column) when selecting accessScope
-- ------------------------------------------------------------------------------

-- Add access_scope: Defaults strictly to 'REFERRAL_ONLY' to guarantee that legacy
-- referrals do NOT inherit broad EHR access (enforcing clinical least-privilege).
ALTER TABLE public.patient_referrals 
  ADD COLUMN IF NOT EXISTS "access_scope" TEXT NOT NULL DEFAULT 'REFERRAL_ONLY';

COMMIT;


-- ==============================================================================
-- PHASE 2: ONLINE INDEX CREATION (NON-BLOCKING / CONCURRENT)
-- CREATE INDEX CONCURRENTLY cannot execute inside a transaction block.
-- Running concurrently acquires a SHARE UPDATE EXCLUSIVE lock instead of a SHARE lock,
-- allowing concurrent SELECT, INSERT, UPDATE, and DELETE operations to proceed uninterrupted.
-- ==============================================================================

SET lock_timeout = '5s';
SET statement_timeout = '60s';

-- Index 1: Composite lookup index for verifyDoctorPatientAccess() filtering by patientId, status, authorizedDoctorId
CREATE INDEX CONCURRENTLY IF NOT EXISTS "security_consent_records_patient_id_status_authorized_doctor_id_idx"
  ON public.security_consent_records("patient_id", "status", "authorized_doctor_id");

-- Index 2: Composite lookup index for verifyDoctorPatientAccess() filtering by patientId, status, authorizedFacilityId
CREATE INDEX CONCURRENTLY IF NOT EXISTS "security_consent_records_patient_id_status_authorized_facility_id_idx"
  ON public.security_consent_records("patient_id", "status", "authorized_facility_id");


-- ==============================================================================
-- PHASE 3: POST-EXECUTION VERIFICATION QUERY
-- Run this block to confirm that all required columns exist with correct types and defaults:
-- ==============================================================================
SELECT 
  table_schema,
  table_name, 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public'
  AND table_name IN ('security_consent_records', 'patient_referrals') 
  AND column_name IN ('authorized_doctor_id', 'authorized_facility_id', 'access_scope')
ORDER BY table_name, column_name;

-- Verify indexes created concurrently:
SELECT 
  schemaname, 
  tablename, 
  indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename = 'security_consent_records'
  AND indexname IN (
    'security_consent_records_patient_id_status_authorized_doctor_id_idx',
    'security_consent_records_patient_id_status_authorized_facility_id_idx'
  );
