# CareID Doctor Web — Technical & Architecture Audit
**Analysis Date:** November 2026  
**Repository:** `doctor-web-frontend-main`  
**Tooling:** TypeScript 5.7.3 (`tsc -b`), ESLint 9.20.0, Vite 6.1.0 (Rollup)

---

## 1. Executive Technical Summary

| Metric | Measured Value | Standard / Target | Severity Rating |
|--------|----------------|-------------------|-----------------|
| **TypeScript Compiler Errors** | 0 errors (`tsc -b --noEmit`) | 0 errors | **EXCELLENT** |
| **ESLint Warnings / Errors** | 0 (`eslint .`) | 0 | **EXCELLENT** |
| **Vite Production Build** | Successful (`5.76s`) | Successful | **PASS** |
| **Main JS Bundle Size** | **1,162.93 kB** (242 kB gzip) | < 500 kB | **HIGH SEVERITY (No Code Splitting)** |
| **Dead Code / Orphan Files** | 3 files (284 lines) | 0 files | **MEDIUM SEVERITY** |
| **Monolithic Page Files** | 8 files > 600 lines (max 1516 lines) | < 400 lines per file | **HIGH SEVERITY** |
| **Shared UI Primitives** | 1 component (`Logo.tsx`) | Complete Primitives Library | **CRITICAL SEVERITY** |
| **Global State Isolation** | Isolated component `useState` | Centralized Stores | **HIGH SEVERITY** |

---

## 2. Bundle Performance & Code Splitting Flaw

When executing `npm run build`, Vite issues the following critical warning:
```text
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rollupOptions.output.manualChunks to improve chunking
dist/assets/index-hRRTlqoj.js   1,162.93 kB │ gzip: 242.26 kB
```

### Root Cause Analysis
In `src/routes/index.tsx`, every single page component (all 40 pages!) is imported synchronously at top level:
```tsx
import { DashboardPage } from '@/pages/DashboardPage';
import { PatientDirectoryPage } from '@/pages/patients/PatientDirectoryPage';
import { MedicalRecordUploadPage } from '@/pages/ocr/MedicalRecordUploadPage';
import { CathLabSafetyCheckinPage } from '@/pages/cath-lab/CathLabSafetyCheckinPage';
import { ProcedureSchedulingPage } from '@/pages/treatment-offers/ProcedureSchedulingPage';
// ... 35 additional static imports
```
Because `React.lazy()` and `Suspense` are completely absent:
- A user loading the simple `/auth/login` page downloads the entire Cath Lab surgical workstation, the 1500-line OCR parser, all 17 specialist referral views, and every mock dataset upfront!
- This causes slow First Contentful Paint (FCP) and Time to Interactive (TTI), which violates clinical web standards.

---

## 3. Dead Code & Architecture Smells

### 1. Dead Layout Components
Three layout components exist in `src/components/layout/` that are completely unused anywhere in the codebase:
1. **`src/components/layout/AppLayout.tsx` (10 lines):**
   - Merely delegates to `<PatientLayout />`.
   - Never imported in `src/routes/index.tsx` or anywhere else.
2. **`src/components/layout/Header.tsx` (111 lines):**
   - Contains a standalone header with search bar, bell, and doctor avatar.
   - Never imported or routed! `PatientLayout.tsx` completely duplicates the entire header markup inline (lines 350-450).
3. **`src/components/layout/Sidebar.tsx` (163 lines):**
   - Contains a flat sidebar navigation menu.
   - Never imported or routed! `PatientLayout.tsx` completely duplicates the sidebar markup inline (lines 80-350) with collapsible sections.

### 2. Massive Monolithic Files
Several page files exceed manageable complexity thresholds, mixing rendering, state logic, SVG coordinate calculations, and mock data in single files:
- **`src/pages/ocr/MedicalRecordUploadPage.tsx`:** **1,516 lines (74.4 kB)**
  - Combines initial file drop, animated OCR processing simulation, SVG document bounding-box coordinate tracking, and medical record success states in a single component!
- **`src/pages/treatment-offers/ProcedureSchedulingPage.tsx`:** **1,388 lines (81.9 kB)**
  - Combines clinical suite selection, date/time matrix, conflict detection, review modal, and confirmation card in one file.
- **`src/pages/cath-lab/CathLabSafetyCheckinPage.tsx`:** **1,186 lines (57.3 kB)**
  - Combines patient identity wristband scanning, allergy protocols, anesthesia sign-offs, and surgical time-out in one file.
- **`src/pages/treatment-offers/TreatmentOfferCreatePage.tsx`:** **932 lines (46.1 kB)**
- **`src/pages/financing/InsuranceFinancingHubPage.tsx`:** **914 lines (38.7 kB)**

---

## 4. State Management & Data Flow Vulnerabilities

1. **Absence of Global State for Core Clinical Workflows:**
   - The only React Context in the project is `AuthContext.tsx`.
   - The entire 18-step Treatment Offer & Procedure Lifecycle spans across 17 different routes. However, there is **no TreatmentOfferContext or Zustand store**.
   - Every page (`ProcedureSchedulingPage`, `PreOpReadinessPage`, `DayOfCheckinPage`, `CathLabSafetyCheckinPage`) creates its own isolated dummy state using `useState`.
   - If a clinician selects "Mount Sinai Cath Lab Suite 3" at 9:30 AM on `/schedule`, and navigates to `/appointment`, the appointment page displays hardcoded static text rather than the chosen values.
   - Reloading any page in the browser instantly resets all modified clinical checkboxes, inputs, and selections!
2. **Unvalidated Native Form Inputs:**
   - Forms in `TreatmentOfferCreatePage`, `CreateReferralPage`, and `AuthPlaceholder` use uncontrolled or loosely controlled raw `<input>` elements.
   - There are no schema validation rules (e.g. via Zod), allowing users to submit negative financial discount percentages, malformed telephone numbers, or empty clinical indications.

---

## 5. Accessibility & Responsive Deficiencies

1. **Global Header Search Input:**
   - `<input type="search" placeholder="Search patients, ID, or appointments..." />` in `Header.tsx` and `PatientLayout.tsx`:
     - Has no `id`, no `<label>`, and no `aria-label`.
     - Has no keyboard listener (`onKeyDown` for Enter) or state handler. It is completely unresponsive to user input.
2. **ARIA Compliance in Complex Components:**
   - Custom country dropdown in `AuthPlaceholder.tsx` has basic ARIA attributes (`aria-haspopup="listbox"`), but lacks keyboard navigation (ArrowUp, ArrowDown, Esc to close).
   - Custom modal dialogs (such as the document mismatch modal in OCR) do not implement focus trapping (`FocusTrap`), allowing keyboard focus to bleed out into the background page.
3. **Responsive Breakpoints:**
   - Complex data tables (`PatientDirectoryPage`, `MedicalRecordsPage`) do not provide mobile card fallback layouts. On screens <1024px, tables trigger horizontal scrollbars that clip action dropdowns.
   - Specialized Cath Lab surgical pages (`ActiveProcedureDocumentationPage`, `PostProcedureSummaryPage`) assume a 1280px minimum desktop display and break significantly when viewed on mobile or small tablet viewports.

---

## 6. TypeScript & Dependency Health

### Positive Findings
- TypeScript is configured in strict mode (`"strict": true` in `tsconfig.app.json`).
- Compiler execution passes with zero type errors.
- ESLint passes cleanly with modern flat configuration (`eslint.config.js`).

### Dependency Health
- Zero obsolete dependencies in `package.json`.
- Production bundle is lightweight in terms of external libraries (only `react`, `react-dom`, `react-router-dom`, `lucide-react`, `clsx`, `tailwind-merge`).
- All assets referenced in `src/assets/` resolve correctly during Vite bundling without 404 image errors.

