# CareID Doctor Web — Workspace Architecture
## Document Reference: `DOCTOR_WEB_BATCH3_WORKSPACE_ARCHITECTURE`
**Version:** 1.0  
**Date:** 2026-11-20  
**Batch:** CAREID-DOCTOR-WEB-BATCH-03-REVISED  
**Status:** LOCKED — Architecture Decision Approved

---

## Architecture Decision (Option A — Approved and Locked)

CareID uses **one Doctor Web application with two strictly separated clinical workspaces**:

| Workspace | Identifier | Clinical Domain |
|---|---|---|
| Human Doctor Workspace | `HUMAN_DOCTOR` | Human healthcare only |
| Veterinary Workspace | `VETERINARIAN` | Companion animal / pet healthcare only |

**Key principles:**
- The workspaces **never mix** human and veterinary clinical navigation, screens, records, or permissions.
- Separation is enforced at the routing layer (React Router), the layout layer (separate Layout components), and the backend API layer (species isolation guards).
- Both workspaces use the **same NestJS backend** and **same PostgreSQL database**.
- This decision takes precedence over any mixed-workspace implementation.

---

## Workspace Detection

Workspace assignment is determined at login time by evaluating the authenticated user's roles.

**File:** `doctor_web/src/context/AuthContext.tsx`

```typescript
// Workspace detection logic (symmetric evaluation)

const isVet = roles.some(r =>
  r === 'VETERINARIAN' ||
  r === 'DOCTOR_VET' ||
  r.toLowerCase().includes('veterinar')
);

const isHuman = roles.some(r =>
  r === 'DOCTOR' ||
  r === 'DOCTOR_VET' ||
  (r.toLowerCase().includes('doctor') && !r.toLowerCase().includes('veterinar')) ||
  (r.toLowerCase().includes('physician')) ||
  (r.toLowerCase().includes('surgeon') && !r.toLowerCase().includes('veterinar'))
);
```

**Context values exported:**

| Value | Type | Description |
|---|---|---|
| `workspaceType` | `'HUMAN_DOCTOR' \| 'VETERINARIAN' \| null` | Resolved workspace (null if ambiguous) |
| `isHumanDoctor` | `boolean` | True for human workspace users |
| `isVeterinarian` | `boolean` | True for veterinary workspace users |
| `hasDualRoleAmbiguity` | `boolean` | True when user has BOTH human and vet roles without a `DOCTOR_VET` disambiguation |

---

## Dual-Role Ambiguity

If a user has both `DOCTOR` and `VETERINARIAN` roles and no `DOCTOR_VET` disambiguation role, the application renders a **clarification barrier screen** without granting access to either workspace.

```
hasDualRoleAmbiguity = isHuman && isVet && !roles.includes('DOCTOR_VET')
```

The ambiguity screen:
- Explains that the account has dual clinical roles
- Instructs the user to contact their administrator to assign a primary workspace role
- Provides no navigation to either workspace
- Logs the halt event

> **Note:** A workspace-switching mechanism is **not implemented** in Doctor Web. Dual-role users must resolve the ambiguity at the account level before accessing clinical workflows.

---

## Route Architecture

**File:** `doctor_web/src/routes/index.tsx`

The route tree uses **mutually exclusive workspace branches**, each wrapped in `RoleRouteGuard`.

```
/
├── /login               ── Public
├── /reset-password      ── Public
│
├── [HUMAN_DOCTOR workspace]  ← RoleRouteGuard(requiredWorkspace='HUMAN_DOCTOR')
│   ├── /dashboard
│   ├── /patients
│   │   ├── /patients/:patientId
│   │   │   ├── /patients/:patientId/history
│   │   │   ├── /patients/:patientId/vitals
│   │   │   ├── /patients/:patientId/soap
│   │   │   ├── /patients/:patientId/reports
│   │   │   └── /patients/:patientId/prescriptions
│   │   └── /patients/:patientId/appointments
│   ├── /appointments
│   ├── /prescriptions
│   └── /referrals
│
├── [VETERINARIAN workspace]  ← RoleRouteGuard(requiredWorkspace='VETERINARIAN')
│   ├── /veterinary/dashboard
│   ├── /veterinary/pets
│   │   └── /veterinary/pets/:petId
│   └── /veterinary/appointments
│
└── [Shared — both workspaces]
    ├── /settings
    ├── /support
    └── /notifications
```

---

## RoleRouteGuard Contract

**File:** `doctor_web/src/components/shared/RoleRouteGuard.tsx`

The guard wraps any route subtree and enforces workspace isolation.

```typescript
interface RoleRouteGuardProps {
  requiredWorkspace: 'HUMAN_DOCTOR' | 'VETERINARIAN';
  children: React.ReactNode;
}
```

**Behavior:**

| Scenario | Outcome |
|---|---|
| User has correct workspace role | Renders `children` |
| User is unauthenticated | Redirects to `/login` |
| User has the wrong workspace (e.g., vet accessing `/patients`) | Renders 403 barrier — "Access Denied — This clinical area is not available for your role" |
| User has dual-role ambiguity | Renders clarification barrier screen |
| User is loading/session pending | Shows loading spinner |

**Direct URL enforcement:** Direct URL navigation (e.g., a veterinarian typing `/patients` in the browser) is blocked by the guard before any clinical data is loaded. The guard fires synchronously from `AuthContext`, so there is no flash of content.

---

## Layout Components

### Human Doctor Workspace

**File:** `doctor_web/src/components/layout/PatientLayout.tsx`

- Purple design tokens (`#5b14b8`, `#3f1d8b`)
- Navigation: Dashboard, Patients, Appointments, Prescriptions, Referrals
- **No veterinary links**
- Shows human patient list in sidebar
- Breadcrumb root: `/dashboard`

### Veterinary Workspace

**File:** `doctor_web/src/components/layout/VeterinaryLayout.tsx`

- Dedicated purple design tokens (consistent with PatientLayout)
- Navigation: Vet Dashboard, Pet Vault, Vet Appointments, Companion Action Bar
- **No human clinical links**
- Shows companion animal list in sidebar
- Breadcrumb root: `/veterinary/dashboard`

---

## Backend Species Isolation

**File:** `backend/src/modules/doctor/application/use-cases/doctor.service.ts`

The backend enforces species isolation independently of the frontend. Frontend guards are UX-layer only; the backend is the security boundary.

| Endpoint pattern | Authorized roles | Species guard |
|---|---|---|
| `GET /api/v1/doctors/patients/**` | `DOCTOR`, `DOCTOR_VET`, `ADMIN` | Rejects `VETERINARIAN` role |
| `POST /api/v1/doctors/patients/:id/prescriptions` | `DOCTOR`, `DOCTOR_VET` | Rejects `VETERINARIAN` role |
| `GET /api/v1/doctors/pets/**` | `VETERINARIAN`, `DOCTOR_VET`, `ADMIN` | Rejects `DOCTOR` role (human-only) |
| `POST /api/v1/doctors/pets/:petId/vaccinations` | `VETERINARIAN`, `DOCTOR_VET`, `ADMIN` | Rejects `DOCTOR` role (human-only) |
| `POST /api/v1/doctors/pets/:petId/records` | `VETERINARIAN`, `DOCTOR_VET`, `ADMIN` | Rejects `DOCTOR` role (human-only) |

**Practice-scoped pet directory:** Veterinarians query pets by practice/care-relationship, not by personal `ownerUserId`. The `PetRepository` returns all companion animals registered at the treating veterinarian's practice facility, subject to care-relationship authorization.

---

## Shared Non-Clinical Routes

The following routes are accessible from both workspaces and are not wrapped in a workspace guard:

- `/settings` — Account and profile settings
- `/support` — Support and help center
- `/notifications` — Notification center

These routes use a neutral layout that does not expose clinical navigation from either workspace.

---

## Security Checklist

| Control | Layer | Status |
|---|---|---|
| Human vet accessing `/patients` → 403 | Frontend (RoleRouteGuard) | ✅ Implemented |
| Human vet accessing `/patients` → 403 | Backend (species guard) | ✅ Implemented |
| Vet accessing `/veterinary/**` without vet role → 403 | Frontend (RoleRouteGuard) | ✅ Implemented |
| Vet calling human medical record endpoints → 403 | Backend | ✅ Implemented |
| Human doctor calling pet endpoints → 403 | Backend | ✅ Implemented |
| Dual-role ambiguity → clarification barrier | Frontend | ✅ Implemented |
| Direct URL navigation bypassing guard → blocked | Frontend (guard fires before render) | ✅ Implemented |
| No camera/WebRTC QR scanner in Doctor Web | Frontend | ✅ Confirmed — QRScannerModal deleted |
| Whitespace role trimming | AuthContext | ✅ Implemented |

---

## File Index

| File | Purpose |
|---|---|
| `doctor_web/src/context/AuthContext.tsx` | Workspace detection, role evaluation |
| `doctor_web/src/components/shared/RoleRouteGuard.tsx` | Workspace route guard, 403 barriers |
| `doctor_web/src/routes/index.tsx` | Route tree with workspace branches |
| `doctor_web/src/components/layout/PatientLayout.tsx` | Human workspace layout |
| `doctor_web/src/components/layout/VeterinaryLayout.tsx` | Veterinary workspace layout |
| `doctor_web/src/pages/veterinary/VeterinaryDashboardPage.tsx` | Veterinary workspace dashboard |
| `doctor_web/src/pages/pets/VeterinaryPetPage.tsx` | Veterinary Health Vault |
| `backend/src/modules/doctor/application/use-cases/doctor.service.ts` | Backend species isolation |
| `backend/src/modules/pet/application/use-cases/pet.service.ts` | Pet service with vet authorization |
| `backend/src/modules/pet/presentation/controllers/doctor-pet.controller.ts` | Vaccination and clinical record endpoints |
