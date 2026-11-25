# Scope: Milestone 1 — Navigation & Route Decoupling

## Architecture
- Module boundary: Application navigation and routing layer.
- Components involved:
  - Settings views: `src/pages/settings/ProfessionalProfilePage.tsx`, `src/pages/settings/AccountSecurityPage.tsx`, `src/pages/settings/NotificationPreferencesPage.tsx`
  - Route definitions: `src/routes/index.tsx`
  - Global navigation layout: `src/components/layout/PatientLayout.tsx`, `src/components/layout/Header.tsx`
  - Standalone Support view: `src/pages/settings/SupportCenterPage.tsx`

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Settings Tab Navigation Correction | Remove Support tab from top nav in `ProfessionalProfilePage`, `AccountSecurityPage`, `NotificationPreferencesPage` | M1 | R1 |
| 2 | Route Mapping Decoupling | Decouple `/settings/support` route with redirect `<Navigate to="/support" replace />` in `routes/index.tsx` | M1 | R1 |
| 3 | Sidebar & Header Support Navigation | Update sidebar Support target to `to="/support"`, active check to include `/support`, and verify direct Profile nav without dropdown | M1 | R1 |
| 4 | Support Page Header Clean-up | Remove duplicate settings tab strip and simplify breadcrumb in `SupportCenterPage.tsx` | M1 | R1, R6 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Navigation & Route Decoupling | Settings tab removal, route redirect, sidebar/header updates, SupportCenterPage header cleanup | none | IN_PROGRESS |

## Interface Contracts
- `/settings` top nav: Only 3 tabs rendered across all settings pages (`My Profile`, `Security`, `Notifications`).
- `/settings/support`: Unconditional redirect `<Navigate to="/support" replace />`.
- `/support`: Standalone route rendering `<SupportCenterPage />`.
- `PatientLayout.tsx`:
  - `to="/support"` for Support sidebar item.
  - `isSupportRoute`: matches `location.pathname === '/support' || location.pathname === '/settings/support'`.
  - Header help button: navigates to `/support`.
  - Profile NavLink: direct `to="/settings"`, no dropdown or nested submenu.
- `SupportCenterPage.tsx`:
  - No settings tab strip rendered.
  - Breadcrumb simplified to `Dashboard > Support & Help Center`.

## Code Layout (Ownership for Milestone 1)
- `src/pages/settings/ProfessionalProfilePage.tsx`
- `src/pages/settings/AccountSecurityPage.tsx`
- `src/pages/settings/NotificationPreferencesPage.tsx`
- `src/routes/index.tsx`
- `src/components/layout/PatientLayout.tsx`
- `src/components/layout/Header.tsx`
- `src/pages/settings/SupportCenterPage.tsx` (header/tab strip only)
