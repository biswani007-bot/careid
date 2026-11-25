# Dispatch for explorer_m1_services_1
Role: teamwork_explorer
Workspace: d:\New folder\New folder\doctor web\doctor-web-frontend-main
State folder: d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\explorer_m1_services_1
Original Request: d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\ORIGINAL_REQUEST.md
Project Spec: d:\New folder\New folder\doctor web\doctor-web-frontend-main\PROJECT.md

## 2026-11-09T11:49:56Z
You are assigned to explore and architect Milestone 1 - Component 1: `src/services/treatmentOfferService.ts`.
Read ORIGINAL_REQUEST.md at: `d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\ORIGINAL_REQUEST.md`.
Read PROJECT.md at: `d:\New folder\New folder\doctor web\doctor-web-frontend-main\PROJECT.md`.
Read Postman contracts summary at: `d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\spec_miner_survey_consultations_1\handoff.md`.
Workspace directory: `d:\New folder\New folder\doctor web\doctor-web-frontend-main`
State folder: `d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\explorer_m1_services_1`

Objective:
Detail the exact implementation blueprint for `src/services/treatmentOfferService.ts` using `apiClient.ts`:
1. `createTreatmentOffer(payload: CreateTreatmentOfferPayload)`: maps to `POST /api/v1/doctors/treatment-offers`.
2. `listTreatmentOffers(params?: { status?: string; patientId?: string; search?: string; page?: number; limit?: number })`: maps to `GET /api/v1/doctors/treatment-offers`.
3. `getTreatmentOffer(id: string)`: maps to `GET /api/v1/doctors/treatment-offers/:id`.
4. `updateTreatmentOffer(id: string, payload: UpdateTreatmentOfferPayload)`: maps to `PUT /api/v1/doctors/treatment-offers/:id`.
5. `dispatchTreatmentOffer(id: string, expectedVersion: number)`: maps to `POST /api/v1/doctors/treatment-offers/:id/dispatch`.
6. `getTreatmentOfferStatus(id: string)`: maps to `GET /api/v1/doctors/treatment-offers/:id/status`.
7. `cancelTreatmentOffer(id: string, reason: string, expectedVersion: number)`: maps to `POST /api/v1/doctors/treatment-offers/:id/cancel`.
8. `patientAcceptTreatmentOffer(id: string, payload: { signatureConsent: boolean; patientResponseNotes?: string; expectedVersion: number })`: maps to `POST /api/v1/patients/treatment-offers/:id/accept`.
Ensure exact type interfaces, response unwrapping (`response.data.data` vs `response.data`), and error handling.
Scope boundaries: READ-ONLY exploration. Write report to `d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\explorer_m1_services_1\handoff.md`.
