-- AlterTable
-- CareID Schema Correction: Correct MedicalAttachment.virusScanStatus default from 'CLEAN' to 'PENDING'
-- Rationale: In uninspected attachments, defaulting to 'CLEAN' violates clinical upload security protocols.
-- Application logic initializes uploads as 'PENDING', awaiting background inspection.
ALTER TABLE "medical_attachments" ALTER COLUMN "virus_scan_status" SET DEFAULT 'PENDING';
