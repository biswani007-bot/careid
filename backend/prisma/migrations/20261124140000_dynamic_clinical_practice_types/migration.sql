-- 1. Create ClinicalAuthorizationScope Enum
DO $$ BEGIN
  CREATE TYPE "ClinicalAuthorizationScope" AS ENUM ('HUMAN_HEALTHCARE', 'VETERINARY_MEDICINE', 'UNMAPPED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Create clinical_practice_types Table
CREATE TABLE IF NOT EXISTS "clinical_practice_types" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "description" TEXT,
    "status" "GovernanceStatus" NOT NULL DEFAULT 'ACTIVE',
    "clinical_authorization_mapping" "ClinicalAuthorizationScope" NOT NULL DEFAULT 'UNMAPPED',
    "is_canonical" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_by" TEXT,
    "updated_by" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3) WITHOUT TIME ZONE,
    "created_at" TIMESTAMP(3) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "clinical_practice_types_pkey" PRIMARY KEY ("id")
);

-- 3. Create Unique Index on code
CREATE UNIQUE INDEX IF NOT EXISTS "clinical_practice_types_code_key" ON "clinical_practice_types"("code");

-- 4. Seed Canonical Entries (Human Healthcare & Veterinary Medicine)
INSERT INTO "clinical_practice_types" ("id", "code", "display_name", "description", "status", "clinical_authorization_mapping", "is_canonical", "sort_order", "created_at", "updated_at")
VALUES 
    (gen_random_uuid(), 'HUMAN_HEALTHCARE', 'Human Healthcare', 'Standard clinical medicine and healthcare for human patients', 'ACTIVE', 'HUMAN_HEALTHCARE', true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'VETERINARY_MEDICINE', 'Veterinary Medicine', 'Veterinary clinical practice and animal medical care', 'ACTIVE', 'VETERINARY_MEDICINE', true, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO UPDATE SET
    "display_name" = EXCLUDED."display_name",
    "clinical_authorization_mapping" = EXCLUDED."clinical_authorization_mapping",
    "is_canonical" = true;

-- 5. Establish Foreign Key Constraints with ON UPDATE CASCADE ON DELETE RESTRICT
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'doctor_profiles_clinical_practice_type_fkey'
  ) THEN
    ALTER TABLE "doctor_profiles" 
    ADD CONSTRAINT "doctor_profiles_clinical_practice_type_fkey" 
    FOREIGN KEY ("clinical_practice_type") REFERENCES "clinical_practice_types"("code") 
    ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'master_data_items_clinical_practice_type_fkey'
  ) THEN
    ALTER TABLE "master_data_items" 
    ADD CONSTRAINT "master_data_items_clinical_practice_type_fkey" 
    FOREIGN KEY ("clinical_practice_type") REFERENCES "clinical_practice_types"("code") 
    ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;
END $$;
