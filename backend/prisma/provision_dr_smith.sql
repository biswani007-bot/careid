DO $$
DECLARE
  new_user_id UUID := gen_random_uuid();
  doctor_role_id UUID;
  new_doc_id UUID := gen_random_uuid();
  pw_hash TEXT := '$2b$10$1VJqxXmcaA8hcafXv.RMCedQDrfPg5ObmIQ3XQGi6eEjcKDlXajp2';
BEGIN
  SELECT id INTO doctor_role_id FROM roles WHERE name = 'DOCTOR';

  -- Insert user if not exists
  INSERT INTO users (id, email, phone, password_hash, status, created_at, updated_at)
  VALUES (new_user_id, 'dr.smith@careid.com', '+16505553388', pw_hash, 'ACTIVE', NOW(), NOW())
  ON CONFLICT (email) DO NOTHING;

  -- Ensure we have the user_id
  SELECT id INTO new_user_id FROM users WHERE email = 'dr.smith@careid.com';

  -- Assign DOCTOR role
  INSERT INTO user_roles (id, user_id, role_id, created_at)
  VALUES (gen_random_uuid(), new_user_id, doctor_role_id, NOW())
  ON CONFLICT DO NOTHING;

  -- Insert doctor profile
  INSERT INTO doctor_profiles (
    id, user_id, full_name, primary_specialization, clinical_practice_type,
    medical_council, registration_number, license_number, provider_identifier,
    verification_status, years_of_experience, department,
    secondary_specializations, sub_specializations, clinical_interests, services_offered, languages_spoken,
    is_deleted, created_at, updated_at
  )
  VALUES (
    new_doc_id, new_user_id, 'Dr. John Smith, MD', 'Cardiology', 'HUMAN_HEALTHCARE',
    'State Medical Board', 'MED-REG-2026-SMITH', 'LIC-MD-2026-SMITH', 'DOC-360-SMITH1',
    'VERIFIED', 10, 'Department of Cardiology',
    ARRAY['Interventional Cardiology']::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY['English']::text[],
    FALSE, NOW(), NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    clinical_practice_type = 'HUMAN_HEALTHCARE',
    primary_specialization = 'Cardiology',
    verification_status = 'VERIFIED';

END $$;
