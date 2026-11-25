# CAREID PENDING CLOSURE 007 — REMAINING TASKS & ROADMAP REGISTER

**Project:** CAREID / HEALTH VAULT 360  
**Phase:** CAREID-MASTER-PENDING-CLOSURE-LIVE-E2E-007  
**Auditor:** Antigravity Autonomous Integration Agent  

---

## 1. Remaining Tasks Inventory

| Task ID | Description | Owning Module | Priority | Owner | Status | External Dependency | Acceptance Criteria |
|---|---|---|---|---|---|---|---|
| **TASK-EXT-01** | CR-06 External Bidirectional EHR Exchange Integration | Backend / EHR Module | P3 | Backend Lead / Hospital Partners | BLOCKED | Hospital partner FHIR / HL7 v2 endpoints and partner mTLS certs | Bidirectional synchronization with live partner hospital EHR |
| **TASK-EXT-02** | CR-08 Phase 2: External SMS & WhatsApp Delivery Integration | Backend / Notifications | P3 | Telecommunications Lead | DEFERRED | Twilio / Meta WhatsApp Business Cloud API keys | Real-time SMS and WhatsApp delivery to patient phone numbers |
| **TASK-EXT-03** | CR-08 Phase 3: Mobile Push (FCM / APNs) Delivery Integration | Mobile App / Backend | P3 | Developer 2 / Mobile Lead | DEFERRED | Firebase Cloud Messaging (FCM) / Apple APNs service account credentials | Push notifications rendered on patient iOS/Android lock screens |
| **TASK-EXT-04** | CR-03 Advanced Predictive AI Slot Recommendation Model | Backend / AI Engine | P3 | Data Science / ML Team | DEFERRED | External LLM / ML inference service (Vertex AI or OpenAI) | Automated patient rescheduling recommendations based on no-show propensity |

---

## 2. Zero Internal In-Scope Tasks Remaining

All required internal Admin Web, Doctor Web, NestJS backend, and PostgreSQL workflows are **100% complete, verified, and accepted**.
