## 2026-11-09T06:16:24Z
You are survey subagent 1 (API Specification Miner).
Working directory: d:\New folder\New folder\doctor web\doctor-web-frontend-main
Your state folder: d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\spec_miner_survey_1\
Original request path: d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\ORIGINAL_REQUEST.md

MANDATORY FIRST STEP:
Read `ORIGINAL_REQUEST.md` before starting work. Do NOT summarize or filter it.

YOUR MISSION:
Exhaustively mine and document the authoritative API contracts from the Postman collection located at:
`d:\New folder\New folder\doctor web\doctor-web-frontend-main\Postman collection\`
and relate them to the live backend `https://360api.vnvision.in`.

SPECIFIC INVESTIGATION TARGETS:
1. Patient Profile / Context Resolution:
   - Identify the exact endpoint, HTTP method, URL path, headers, query parameters, and response structure for fetching patient details.
   - Specifically verify the contract for Test Patient ID: `787e5187-7859-4320-bb1a-465a57dd086a`.
   - What fields are returned (name, Health ID / MRN, DOB, gender, profile ID)?

2. Document Upload API:
   - Identify the exact endpoint for file upload.
   - Multipart form-data vs raw binary, expected field names (e.g. `file`, `document`), query params or headers.
   - What metadata or attachment ID / document reference is returned?
   - Documented constraints: file types (PDF, PNG, JPG, DICOM), maximum size, original filename handling.

3. OCR Job Processing and Management API:
   - Endpoint to initiate OCR job (payload structure, attachment ID passing, options).
   - Endpoint to poll/check OCR job status. Documented statuses (e.g. PENDING, PROCESSING, COMPLETED, FAILED).
   - Endpoint to retrieve extracted OCR fields, structured clinical data, and raw text.
   - Reprocess endpoint if any.

4. Medical Record Persistence & Recent Uploads API:
   - Endpoint for saving/creating medical record with clinical information and attachment references.
   - Request body schema, required fields, deduplication/idempotency handling.
   - Endpoint for fetching recent uploads / patient medical records list.

5. Authentication & Environment Configuration:
   - How are requests authenticated (Bearer token, cookie, API key, custom headers)?
   - Any login or session endpoints in the collection?
   - Any environment files (.env, Postman environment json) in the project.

OUTPUT REQUIREMENTS:
Write your complete, structured specification analysis to:
`d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\spec_miner_survey_1\analysis.md`
and write a self-contained handoff to:
`d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\spec_miner_survey_1\handoff.md`.
Then send a completion message to the caller with a concise summary and references to your artifacts.
Remember: DO NOT modify any source code files. You are a read-only specification miner.
