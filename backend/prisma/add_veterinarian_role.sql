ALTER TYPE "RoleName" ADD VALUE IF NOT EXISTS 'VETERINARIAN';
ALTER TYPE "RoleName" ADD VALUE IF NOT EXISTS 'DOCTOR_VET';

INSERT INTO roles (id, name, description) 
VALUES (gen_random_uuid(), 'VETERINARIAN', 'Veterinary Medical Practitioner with animal clinical management capabilities')
ON CONFLICT (name) DO NOTHING;

INSERT INTO roles (id, name, description) 
VALUES (gen_random_uuid(), 'DOCTOR_VET', 'Dual-scope clinician with verified human and veterinary clinical credentials')
ON CONFLICT (name) DO NOTHING;

ALTER TABLE doctor_profiles 
ADD COLUMN IF NOT EXISTS clinical_practice_type TEXT DEFAULT 'HUMAN_HEALTHCARE';

ALTER TABLE master_data_items 
ADD COLUMN IF NOT EXISTS clinical_practice_type TEXT DEFAULT 'HUMAN_HEALTHCARE';

UPDATE master_data_items 
SET clinical_practice_type = 'VETERINARY_MEDICINE' 
WHERE code = 'VETERINARY_MEDICINE' OR name ILIKE '%veterinary%';

UPDATE master_data_items 
SET clinical_practice_type = 'HUMAN_HEALTHCARE' 
WHERE code != 'VETERINARY_MEDICINE' AND name NOT ILIKE '%veterinary%';
