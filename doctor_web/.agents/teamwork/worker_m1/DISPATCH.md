# Task Assignment: Milestone 1 — Navigation & Route Decoupling

## Scope & Target Files
You are assigned to implement Milestone 1 of the CareID Doctor Web Portal Support Module Integration.
Target files owned exclusively by Milestone 1:
- `src/pages/settings/ProfessionalProfilePage.tsx`
- `src/pages/settings/AccountSecurityPage.tsx`
- `src/pages/settings/NotificationPreferencesPage.tsx`
- `src/routes/index.tsx`
- `src/components/layout/PatientLayout.tsx`
- `src/components/layout/Header.tsx`
- `src/pages/settings/SupportCenterPage.tsx` (Header tab strip clean-up only)

## Context & Inputs
Read the following files before making changes:
- `d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\ORIGINAL_REQUEST.md`
- `d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\PROJECT.md`
- `d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\explorer_settings_survey_2\handoff.md`

## Instructions
1. In `src/pages/settings/ProfessionalProfilePage.tsx`:
   - Remove the `<button>Support</button>` element (calling `navigate('/settings/support')`) from the settings tab navigation strip. Leave My Profile, Security, and Notifications intact.
2. In `src/pages/settings/AccountSecurityPage.tsx`:
   - Remove the `<button>Support</button>` element from the settings tab navigation strip. Leave My Profile, Security, and Notifications intact.
3. In `src/pages/settings/NotificationPreferencesPage.tsx`:
   - Remove the `<button>Support</button>` element from the settings tab navigation strip. Leave My Profile, Security, and Notifications intact.
4. In `src/routes/index.tsx`:
   - Update `/settings/support` to redirect: `<Navigate to="/support" replace />` (ensure `Navigate` is imported from `react-router-dom`).
   - Keep `/support` mapping to `<SupportCenterPage />`.
5. In `src/components/layout/PatientLayout.tsx`:
   - Change the sidebar Support navigation item target from `/settings/support` to `/support`.
   - Update `isSupportRoute` so `/support` is recognized as the active route.
   - Update the Header help button from `navigate('/settings/support')` to `navigate('/support')`.
   - Verify that the Profile item remains a direct `<NavLink to="/settings">` without any dropdown or submenu.
6. In `src/components/layout/Header.tsx`:
   - Verify/update the help button to navigate to `/support` if applicable.
7. In `src/pages/settings/SupportCenterPage.tsx`:
   - Remove the redundant settings tab navigation strip (lines 113-141) from the header, while keeping all bento cards, modals, and layout below strictly untouched.
   - Simplify breadcrumb to standalone `Dashboard > Support & Help Center`.
8. MANDATORY INTEGRITY WARNING:
   DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
9. Verification:
   Run:
   - `npm run type-check`
   - `npm run lint`
   - `node tests/runtime_profile_verification.cjs`
   - `npm run build`
10. Deliver a comprehensive `handoff.md` report in `d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\worker_m1\handoff.md` and message the orchestrator when complete.


## 2026-11-11T13:03:34Z
You are assigned to implement Milestone 1: Navigation & Route Decoupling.
Read task assignment in:
d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\worker_m1\DISPATCH.md
Read the context:
d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\ORIGINAL_REQUEST.md
d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\PROJECT.md
d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\explorer_settings_survey_2\handoff.md

Your state folder is:
d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\worker_m1
