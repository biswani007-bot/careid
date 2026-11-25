# CareID Doctor Web — Existing Frontend Inventory
**Analysis Date:** November 2026  
**Repository:** `doctor-web-frontend-main`  
**Framework:** React 18.3.1 + TypeScript 5.7.3 + Vite 6.1.0 + Tailwind CSS 3.4.17

---

## 1. Project Directory Structure

```text
doctor-web-frontend-main/
├── .env.example
├── .gitignore
├── design.md
├── eslint.config.js
├── HANDOVER.md
├── implementation.md
├── index.html
├── package.json
├── package-lock.json
├── phases.md
├── postcss.config.js
├── README.md
├── tailwind.config.ts
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── src/
│   ├── assets/
│   │   ├── avatars/               (17 images: doctor & patient avatars)
│   │   ├── branding/              (5 images: CareID logos, auth marks)
│   │   ├── illustrations/         (1 image: careid-otp-hero.png)
│   │   ├── medical/               (2 images: scanned-lab-report, fluoroscopy)
│   │   └── README.md
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx      (10 lines - UNUSED / DEAD CODE)
│   │   │   ├── AuthLayout.tsx     (104 lines - Auth shell)
│   │   │   ├── Breadcrumbs.tsx    (88 lines - Breadcrumb navigation)
│   │   │   ├── Header.tsx         (111 lines - UNUSED / DEAD CODE)
│   │   │   ├── OtpLayout.tsx      (178 lines - Dedicated OTP screen)
│   │   │   ├── PatientLayout.tsx  (516 lines - Monolithic primary layout)
│   │   │   └── Sidebar.tsx        (163 lines - UNUSED / DEAD CODE)
│   │   └── shared/
│   │       └── Logo.tsx           (74 lines - ONLY shared UI component!)
│   ├── context/
│   │   └── AuthContext.tsx        (103 lines - Static clinician session)
│   ├── lib/
│   │   └── utils.ts               (6 lines - cn / clsx + tailwind-merge)
│   ├── pages/
│   │   ├── DashboardPage.tsx      (505 lines)
│   │   ├── FoundationPage.tsx     (78 lines - Verification helper)
│   │   ├── NotFoundPage.tsx       (93 lines - 404 wildcard)
│   │   ├── PlaceholderPage.tsx    (81 lines - Reusable mockup placeholder)
│   │   ├── auth/
│   │   │   └── AuthPlaceholder.tsx (189 lines - Generic auth form)
│   │   ├── cath-lab/              (5 pages + types.ts)
│   │   ├── financing/             (1 page: InsuranceFinancingHubPage.tsx)
│   │   ├── notifications/         (1 page + types.ts)
│   │   ├── ocr/                   (1 page: 1516 lines + types.ts)
│   │   ├── patients/              (2 pages: Directory & Profile)
│   │   ├── records/               (5 pages: MedicalRecords, Detail, Labs, Prescriptions, Radiology)
│   │   ├── referrals/             (5 pages + types.ts)
│   │   ├── reports/               (2 pages + types.ts)
│   │   ├── settings/              (4 pages + types.ts)
│   │   └── treatment-offers/      (8 pages + types.ts)
│   ├── routes/
│   │   └── index.tsx              (556 lines - Monolithic static router with 85 routes)
│   ├── styles/
│   │   ├── globals.css            (64 lines)
│   │   └── tokens.ts              (131 lines)
│   └── types/
│       └── index.ts               (32 lines - Common utility types)
```

---

## 2. Dependencies & Build Tools

### Production Dependencies (`dependencies` in `package.json`)
| Package | Version | Purpose | Usage Status |
|---------|---------|---------|--------------|
| `clsx` | `^2.1.1` | Class name concatenation | Actively used in `lib/utils.ts` (`cn` helper) |
| `lucide-react` | `^0.475.0` | SVG icons library | Heavy usage across all UI components |
| `react` | `^18.3.1` | UI Library | Core framework |
| `react-dom` | `^18.3.1` | DOM Renderer | Root mounting |
| `react-router-dom` | `^6.28.2` | Client-side routing | Used for `createBrowserRouter`, navigation |
| `tailwind-merge` | `^2.6.0` | Tailwind class deduplication | Actively used in `lib/utils.ts` |

### Critical Missing Dependencies (Identified from Task Scope & Architecture)
1. **Form Validation Library:** Neither `zod`, `yup`, nor `react-hook-form` is installed. All forms currently manage raw HTML input elements with unvalidated local `useState`.
2. **Server State / API Fetching Library:** Neither `@tanstack/react-query`, `swr`, nor `axios` is installed. All data is hardcoded in static mock files or inline constants.
3. **Global State Management:** Neither `zustand`, `jotai`, nor `@reduxjs/toolkit` is installed. State across the 18-step procedure lifecycle is isolated per-component.
4. **UI Primitive / Accessibility Library:** Neither `@radix-ui/*`, `headlessui`, nor `aria-kit` is installed. Custom dropdowns, modals, and toolbars lack keyboard trap and ARIA compliance.

---

## 3. Implemented Components Inventory

### Layout Components (`src/components/layout/`)
1. **`PatientLayout.tsx` (516 lines):** The active primary layout for all authenticated routes (`/dashboard`, `/patients`, `/records`, etc.). Contains:
   - Inlined sidebar with collapsible categories: `PATIENTS`, `REPORTS`, `PROFILE`.
   - Inlined sticky top header with brand logo, search bar, notification bell, and doctor profile button.
   - Breadcrumb navigation integration.
   - Route-conditional layout hiding for full-screen surgical and document workstations.
2. **`AuthLayout.tsx` (104 lines):** Split two-column authentication shell for `/auth/login`. Conditionally delegates directly to `OtpLayout` when on `/auth/verify-otp`.
3. **`OtpLayout.tsx` (178 lines):** Dedicated two-column layout matching Figma Frame `1:79` with 6-digit OTP inputs and dark navy hero illustration.
4. **`Breadcrumbs.tsx` (88 lines):** Dynamic path-based breadcrumb bar with route label normalization.
5. **`AppLayout.tsx` (10 lines):** **DEAD CODE**. Merely returns `<PatientLayout />`. Never imported or routed.
6. **`Header.tsx` (111 lines):** **DEAD CODE**. Standalone topbar component that is never imported or used anywhere in the project.
7. **`Sidebar.tsx` (163 lines):** **DEAD CODE**. Standalone flat sidebar component that is never imported or used anywhere in the project.

### Shared UI Components (`src/components/shared/`)
- **`Logo.tsx` (74 lines):** The **ONLY** shared component in `src/components/shared/`. Supports sizes `sm`, `md`, `lg` and variant `auth`.
- **CRITICAL GAP:** There are **ZERO** shared primitives for:
  - `Button` (Every page writes custom `<button className="w-full h-14 rounded-full bg-gradient-to-b...">` inline)
  - `Input` / `TextField`
  - `Select` / `Dropdown`
  - `Modal` / `Dialog`
  - `Table` / `Pagination`
  - `Card`
  - `Badge` / `StatusChip`
  - `Spinner` / `Loader`
  - `Tabs`
  - `EmptyState`

---

## 4. Page Components Inventory (`src/pages/`)

| Page File | Lines | Size (Bytes) | Associated Route(s) | Primary Capability |
|-----------|-------|--------------|---------------------|--------------------|
| `DashboardPage.tsx` | 505 | 22,230 | `/dashboard` | Daily schedule, telemetry feeds, KPI metrics |
| `FoundationPage.tsx` | 78 | 4,226 | `/foundation` | Design tokens & asset verification gallery |
| `NotFoundPage.tsx` | 93 | 4,226 | `/*` (wildcard) | 404 error page |
| `PlaceholderPage.tsx` | 81 | 3,026 | 11 placeholder routes | Reusable stub card with Milestone badges |
| `auth/AuthPlaceholder.tsx` | 189 | 8,344 | `/auth/*` | Simulated login, OTP, registration card |
| `patients/PatientDirectoryPage.tsx` | 681 | 30,061 | `/patients` | Searchable patient table, filters |
| `patients/PatientProfilePage.tsx` | 546 | 21,725 | `/patients/:id` | Longitudinal EHR profile, biometrics |
| `financing/InsuranceFinancingHubPage.tsx` | 914 | 38,750 | `/patients/:id/financing` | Multi-tier loan comparison, sliders |
| `records/MedicalRecordsPage.tsx` | 478 | 20,871 | `/records` | Records registry, Medical/Dental/Vision tabs |
| `records/RecordDetailPage.tsx` | 307 | 14,349 | `/records/:id` | Timeline record detail viewer |
| `records/LabReportPage.tsx` | 309 | 15,294 | `/records/labs`, `/records/labs/:id` | CMP / Lipid panel lab report viewer |
| `records/PrescriptionsPage.tsx` | 376 | 18,029 | `/records/prescriptions` | Active e-prescriptions registry |
| `records/RadiologyViewerPage.tsx` | 331 | 14,843 | `/records/imaging`, `/records/imaging/:id` | DICOM radiology viewer |
| `ocr/MedicalRecordUploadPage.tsx` | 1516 | 74,477 | `/records/upload`, `/ocr/*` (8 paths) | 4-stage OCR ingestion workflow |
| `referrals/ReferralDashboardPage.tsx` | 507 | 22,486 | `/referrals` | Referrals registry, metrics |
| `referrals/CreateReferralPage.tsx` | 492 | 21,240 | `/referrals/new`, `/referrals/consult` | Specialist referral dispatch form |
| `referrals/ReferralDetailsPage.tsx` | 407 | 17,422 | `/referrals/:id` | Longitudinal referral dossier |
| `referrals/IncomingReferralReviewPage.tsx` | 438 | 19,214 | `/referrals/incoming/:id` | Incoming clinical package triage |
| `referrals/ReferralSuccessPage.tsx` | 76 | 3,355 | `/referrals/success` | Referral dispatch confirmation |
| `reports/ReportsDashboardPage.tsx` | 484 | 21,765 | `/reports` | Diagnostic reports overview |
| `reports/CriticalReportReviewPage.tsx` | 469 | 21,278 | `/reports/critical`, `/reports/critical/:id` | Critical alert immediate review |
| `notifications/NotificationCenterPage.tsx` | 559 | 25,157 | `/notifications` | Notification triage and preferences |
| `settings/ProfessionalProfilePage.tsx` | 533 | 24,678 | `/settings`, `/settings/profile` | Doctor credentials & bio |
| `settings/AccountSecurityPage.tsx` | 594 | 26,471 | `/settings/security` | 2FA management & active sessions |
| `settings/NotificationPreferencesPage.tsx` | 463 | 21,080 | `/settings/notifications` | Delivery channel toggles |
| `settings/SupportCenterPage.tsx` | 614 | 28,433 | `/settings/support`, `/support` | IT tickets & clinical documentation |
| `treatment-offers/TreatmentOfferCreatePage.tsx` | 932 | 46,177 | `/treatment-offers/new/*` | 5-step proposal authoring |
| `treatment-offers/TreatmentOfferReviewPage.tsx` | 641 | 32,754 | `/treatment-offers/:id/review` | Offer preview & patient dispatch |
| `treatment-offers/TreatmentOfferStatusPage.tsx` | 683 | 36,009 | `/treatment-offers/:id/status`, `/sent` | Tracking delivery & acceptance |
| `treatment-offers/TreatmentOfferAcceptedPage.tsx` | 785 | 43,934 | `/treatment-offers/:id/accepted` | Patient financial ratification |
| `treatment-offers/ClinicalHandoffPage.tsx` | 694 | 38,108 | `/treatment-offers/:id/clearance` | Clinical clearance & pre-op sign-off |
| `treatment-offers/ProcedureSchedulingPage.tsx` | 1388 | 81,924 | `/treatment-offers/:id/schedule/*` | Suite selection, review, confirmation |
| `treatment-offers/AppointmentDetailsPage.tsx` | 646 | 34,157 | `/treatment-offers/:id/appointment` | Locked procedure booking details |
| `treatment-offers/PreOpReadinessPage.tsx` | 697 | 38,453 | `/treatment-offers/:id/pre-op` | 3-category clinical pre-op checklist |
| `treatment-offers/DayOfCheckinPage.tsx` | 627 | 34,078 | `/treatment-offers/:id/check-in` | Day-of-surgery arrival verification |
| `cath-lab/CathLabSafetyCheckinPage.tsx` | 1186 | 57,363 | `/cath-lab-safety`, `.../cath-lab-safety` | WHO surgical safety time-out |
| `cath-lab/StartClinicalEncounterPage.tsx` | 647 | 35,323 | `/treatment-offers/:id/encounter/*` | Fluoroscopy induction & vital baselines |
| `cath-lab/ActiveProcedureDocumentationPage.tsx` | 689 | 36,487 | `/treatment-offers/:id/in-progress` | Intra-op stent logging & vitals |
| `cath-lab/PostProcedureSummaryPage.tsx` | 635 | 34,113 | `/treatment-offers/:id/post-op` | Operative note & contrast volume |
| `cath-lab/EncounterCompletedPage.tsx` | 477 | 25,528 | `/treatment-offers/:id/completed` | Final encounter sign-off |

---

## 5. State Management & Hooks

### Global Context (`src/context/AuthContext.tsx`)
- Provides `useAuth()` hook exposing:
  - `user`: Static clinician profile (`id: 'DOC-948210-VANCE'`, name: `'Dr. Julian Vance'`, credentials: `['MD', 'FACC', 'FSCAI']`).
  - `updateProfile(updatedProfile: Partial<DoctorProfile>)`
  - `updateAvatar(newAvatarUrl: string)`
  - `resetAvatar()`
  - `isDemoSession: true`
- **Architectural Limitation:** This is the **only** context provider in the entire project. There are no contexts or stores for:
  - Active patient session
  - OCR document workflow
  - Treatment offer lifecycle
  - Telemetry notifications

### Custom Hooks
- **No standalone custom hooks exist in the project.**
- Every page implements repeated logic for timeouts, query parameter parsing, window resize listeners, and modal handling via inline `useState` and `useEffect`.

