# Dispatch for explorer_m1_consultations_1
Role: teamwork_explorer
Workspace: d:\New folder\New folder\doctor web\doctor-web-frontend-main
State folder: d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\explorer_m1_consultations_1
Original Request: d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\ORIGINAL_REQUEST.md
Project Spec: d:\New folder\New folder\doctor web\doctor-web-frontend-main\PROJECT.md


## 2026-11-09T11:50:02Z
Sender: 53af432e-22d9-4708-98b8-a589bf7d3f85
Priority: MESSAGE_PRIORITY_HIGH

You are assigned to explore and architect Milestone 1 - Component 2: `src/services/consultationService.ts` refactoring.
Read ORIGINAL_REQUEST.md at: `d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\ORIGINAL_REQUEST.md`.
Read PROJECT.md at: `d:\New folder\New folder\doctor web\doctor-web-frontend-main\PROJECT.md`.
Read survey findings at: `d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\explorer_survey_module_a_1\handoff.md`.
Workspace directory: `d:\New folder\New folder\doctor web\doctor-web-frontend-main`
State folder: `d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\explorer_m1_consultations_1`

Objective:
Detail the exact implementation blueprint for refactoring `src/services/consultationService.ts`:
1. Remove all references to `localStorage.getItem/setItem('careid_treatment_offers_store')` and `careid_active_encounters_store`.
2. Update `listConsultations()` to query live `GET /api/v1/appointments/doctor/me` and live `GET /api/v1/doctors/treatment-offers` (via `treatmentOfferService`), normalizing them into `ConsultationItem[]`.
3. Eliminate hardcoded static procedural attributes (`cptCode: 'CPT #93458'`, `procedureName: 'Left Heart Catheterization with Coronary Angiogram'`) and static fallback facilities. Use genuine data from appointments and treatment offers.
4. Ensure `getFinancingOptions()` calls live `GET /api/v1/financing/options` and returns real partner packages.
5. Provide helper method or logic for dynamic metric aggregation (Total, Active/Scheduled, Accepted & Financed, Procedures Completed).
Scope boundaries: READ-ONLY exploration. Write report to `d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\explorer_m1_consultations_1\handoff.md`.
