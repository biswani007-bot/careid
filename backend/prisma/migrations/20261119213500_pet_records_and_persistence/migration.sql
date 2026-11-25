-- AlterTable
ALTER TABLE "appointments" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "dental_records" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "laboratory_reports" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "prescriptions" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "vision_records" ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "pets" (
    "id" TEXT NOT NULL,
    "owner_user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "species" TEXT NOT NULL,
    "breed" TEXT,
    "age" INTEGER,
    "dob" TEXT,
    "gender" TEXT,
    "weight" DOUBLE PRECISION,
    "microchip_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "pet_vaccinations" (
    "id" TEXT NOT NULL,
    "pet_id" TEXT NOT NULL,
    "vaccine_name" TEXT NOT NULL,
    "administered_date" TEXT NOT NULL,
    "due_date" TEXT,
    "batch_number" TEXT,
    "veterinarian" TEXT,
    "clinic_name" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pet_vaccinations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "pet_clinical_records" (
    "id" TEXT NOT NULL,
    "pet_id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "doctor_name" TEXT,
    "diagnosis" TEXT NOT NULL,
    "treatment_plan" TEXT,
    "notes" TEXT,
    "weight_kg" DOUBLE PRECISION,
    "temperature_c" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pet_clinical_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "pets_owner_user_id_idx" ON "pets"("owner_user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "pets_species_idx" ON "pets"("species");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "pets_microchip_id_idx" ON "pets"("microchip_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "pet_vaccinations_pet_id_idx" ON "pet_vaccinations"("pet_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "pet_clinical_records_pet_id_idx" ON "pet_clinical_records"("pet_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "pet_clinical_records_doctor_id_idx" ON "pet_clinical_records"("doctor_id");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'pets_owner_user_id_fkey'
    ) THEN
        ALTER TABLE "pets" ADD CONSTRAINT "pets_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'pet_vaccinations_pet_id_fkey'
    ) THEN
        ALTER TABLE "pet_vaccinations" ADD CONSTRAINT "pet_vaccinations_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'pet_clinical_records_pet_id_fkey'
    ) THEN
        ALTER TABLE "pet_clinical_records" ADD CONSTRAINT "pet_clinical_records_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- RenameIndex
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'security_consent_records_patient_id_status_authorized_doctor_id'
    ) THEN
        ALTER INDEX "security_consent_records_patient_id_status_authorized_doctor_id" RENAME TO "security_consent_records_patient_id_status_authorized_docto_idx";
    END IF;
    IF EXISTS (
        SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'security_consent_records_patient_id_status_authorized_facility_'
    ) THEN
        ALTER INDEX "security_consent_records_patient_id_status_authorized_facility_" RENAME TO "security_consent_records_patient_id_status_authorized_facil_idx";
    END IF;
END $$;
