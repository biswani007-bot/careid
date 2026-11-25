# Dispatch for spec_miner_survey_consultations_1
Role: teamwork_spec_miner
Workspace: d:\New folder\New folder\doctor web\doctor-web-frontend-main
State folder: d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\spec_miner_survey_consultations_1
Original Request: d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\ORIGINAL_REQUEST.md


## 2026-11-09T11:26:17Z
You are assigned to perform an exhaustive API specification mining for Consultations and Treatment Offers.
Read ORIGINAL_REQUEST.md at: `d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\ORIGINAL_REQUEST.md`.
Workspace directory: `d:\New folder\New folder\doctor web\doctor-web-frontend-main`
State folder: `d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\spec_miner_survey_consultations_1`

Objective:
Investigate the authoritative API contract in the Postman Collection directory: `D:\New folder\New folder\doctor web\doctor-web-frontend-main\Postman collection\`
and the backend base URL `https://360api.vnvision.in`.
Map every relevant endpoint, method, path, headers, query parameters, request body schemas / DTOs, response schemas, status codes, and example payloads for:
1. Doctor consultations (listing, details, doctor consultation history, patient consultation history, creating consultations)
2. Treatment offers (creation, retrieval, list, send to patient, status, patient acceptance/rejection)
3. CPT / procedure selection, catalog, hospital baseline pricing, discounts, pricing rules
4. Financing options, financing packages, terms & remarks, attestation, clinical review
5. 18-stage clinical and financing trajectory endpoints, pre-op clearance, suite scheduling, hold review, slot confirmed, appointment ledger, check-in, active procedure, etc.
6. Explicitly identify which endpoints exist in Postman vs which endpoints are NOT IMPLEMENTED / missing in Postman.

Scope boundaries:
- READ-ONLY investigation. Do NOT modify any code or write non-state files.
- Put your complete report in `d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\spec_miner_survey_consultations_1\handoff.md`.
- When finished, send a brief completion message back with the path to your handoff report.
