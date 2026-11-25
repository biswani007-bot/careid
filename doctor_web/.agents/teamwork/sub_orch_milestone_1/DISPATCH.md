# Dispatch: Sub-Orchestrator Milestone 1 (Navigation & Route Decoupling)

## Identity
- Role: Sub-Orchestrator Milestone 1
- State folder: d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\sub_orch_milestone_1
- Working directory: d:\New folder\New folder\doctor web\doctor-web-frontend-main
- Scope document: d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\PROJECT.md
- Original request: d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\ORIGINAL_REQUEST.md
- Predecessor survey report: d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\explorer_settings_survey_2\handoff.md

## Mission & Scope
Execute Milestone 1 per Requirement R1:
1. Remove the Support tab button and its route association from the Profile settings top navigation inside `/settings` across:
   - `src/pages/settings/ProfessionalProfilePage.tsx`
   - `src/pages/settings/AccountSecurityPage.tsx`
   - `src/pages/settings/NotificationPreferencesPage.tsx`
   Keeping only My Profile, Security, and Notifications tabs with identical styling and layout.
2. In `src/routes/index.tsx`: decouple `/settings/support` by replacing it with a redirect `<Navigate to="/support" replace />` while preserving standalone `/support` route mapping to `<SupportCenterPage />`.
3. In `src/components/layout/PatientLayout.tsx`:
   - Update sidebar Support navigation to `to="/support"`
   - Update `isSupportRoute` active check to include `/support`
   - Update Header Help button to navigate to `/support`
   - Verify sidebar Profile item remains direct `<NavLink to="/settings">` without dropdown
4. In `src/components/layout/Header.tsx`:
   - Update help button to navigate to `/support`
5. In `src/pages/settings/SupportCenterPage.tsx`:
   - Remove the settings tab strip and simplify breadcrumb to standalone `Dashboard > Support & Help Center`
6. Run the full iteration loop: Explorer -> Worker -> Reviewer -> Challenger -> Auditor -> Gate check.
7. Report back when Milestone 1 is verified and complete.
