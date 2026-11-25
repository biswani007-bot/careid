# Settings Navigation Architecture & R1 Survey Analysis

**Date:** 2026-11-11  
**Author:** Settings Navigation Explorer (`explorer_settings_survey_2`)  
**Target:** CareID Doctor Web Portal (`doctor-web-frontend-main`)  
**Scope:** Requirement R1 — Profile Settings Top Navigation, Tab Decoupling, Route Mapping, Standalone Support Route, and Sidebar Navigation.

---

## 1. Executive Summary

A comprehensive architectural and source code audit was conducted on the CareID Doctor Web Portal navigation systems to formulate a non-breaking implementation plan for **Requirement R1**.

### Key Findings
1. **Settings Top Navigation Duplication**: The 4-tab navigation strip (`My Profile`, `Security`, `Notifications`, `Support`) is not a centralized layout component; it is duplicated independently in:
   - `src/pages/settings/ProfessionalProfilePage.tsx` (lines 246–274)
   - `src/pages/settings/AccountSecurityPage.tsx` (lines 374–402)
   - `src/pages/settings/NotificationPreferencesPage.tsx` (lines 204–232)
   - `src/pages/settings/SupportCenterPage.tsx` (lines 113–141)
2. **Current Route Mapping**: `src/routes/index.tsx` contains two distinct routes pointing to `<SupportCenterPage />`:
   - `/settings/support` (line 414) under Section 8 (Doctor Profile & Clinic Settings)
   - `/support` (line 418) standalone entry
3. **Sidebar Profile Item**: In `src/components/layout/PatientLayout.tsx` (lines 411–429), the sidebar Profile item is already implemented as a direct `<NavLink to="/settings">` with **no dropdown**, **no accordion**, and **no submenu**. It fully satisfies R1 criteria out of the box.
4. **Sidebar Support Item Target**: In `src/components/layout/PatientLayout.tsx` (line 435), the sidebar Support item currently links to `/settings/support`. Clicking it opens `SupportCenterPage`, but under the settings path. It must be updated to `to="/support"` to navigate directly to the standalone Support page.
5. **Sidebar Active State Logic**: `isSupportRoute` in `PatientLayout.tsx` (line 95) currently checks only `location.pathname === '/settings/support'`. If a user navigates to `/support`, the sidebar item does not light up. It must be updated to match `location.pathname === '/support' || location.pathname === '/settings/support'`.
6. **Header Help Button**: In `PatientLayout.tsx` (line 503), the global header help button also navigates to `/settings/support`. Updating this to `/support` ensures complete system consistency.
7. **SupportCenterPage Tab Strip**: `SupportCenterPage.tsx` currently displays the 4-tab settings strip at lines 113–141. Since Support is being separated into a standalone workstation, removing this strip from `SupportCenterPage.tsx` completes the decoupling while leaving the underlying bento grid layout and cards 100% intact.

---

## 2. Component Hierarchy & Navigation Flow

The clinical portal navigation is organized hierarchically:

```
App.tsx
 └── AuthProvider (context/AuthContext.tsx)
      └── AppRouter (routes/index.tsx)
           └── ProtectedLayout (routes/index.tsx:54-74)
                └── PatientLayout (components/layout/PatientLayout.tsx)
                     ├── Clinical Sidebar (aside, lines 125-465)
                     │    ├── Brand Logo (line 132) -> /dashboard
                     │    ├── Clinician Identity Card (lines 142-164)
                     │    ├── New Consultation CTA (lines 168-189)
                     │    ├── Nav Menu:
                     │    │    ├── Dashboard (NavLink to /dashboard)
                     │    │    ├── Patients (collapsible accordion)
                     │    │    ├── Referrals (NavLink to /referrals)
                     │    │    ├── Reports (collapsible accordion)
                     │    │    └── Profile (DIRECT NavLink to /settings) [NO DROPDOWN]
                     │    └── Bottom Utility Actions:
                     │         ├── Support (NavLink -> /settings/support [needs /support])
                     │         └── Sign Out (button -> logout)
                     ├── Workspace Header (header, lines 471-545)
                     │    ├── Search Input
                     │    ├── Notifications Button -> /notifications
                     │    ├── Help Button -> /settings/support [needs /support]
                     │    ├── Settings Button -> /settings
                     │    └── Clinician Avatar -> /settings
                     └── Main Content (<Outlet />)
                          ├── /settings -> ProfessionalProfilePage
                          ├── /settings/profile -> ProfessionalProfilePage
                          ├── /settings/security -> AccountSecurityPage
                          ├── /settings/notifications -> NotificationPreferencesPage
                          ├── /settings/support -> SupportCenterPage (to be decoupled)
                          └── /support -> SupportCenterPage (standalone workstation)
```

---

## 3. Settings Top Navigation Strip Details

### Visual Styling and Token Specification
In all settings views, the tab navigation strip follows this exact CSS specification:
- **Container**:
  ```tsx
  <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
  ```
  - Background: `bg-slate-100` (`#f1f5f9`)
  - Border radius: `rounded-xl` (`12px`)
  - Padding: `p-1` (`4px`)
  - Item spacing: `gap-1.5` (`6px`)
- **Active Tab**:
  ```tsx
  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-[#28006d] shadow-xs"
  ```
  - Background: `bg-white` (`#ffffff`)
  - Text color: `text-[#28006d]` (deep CareID brand purple)
  - Typography: `text-xs font-bold` (`12px`, 700 weight)
  - Elevation: `shadow-xs` (`box-shadow: 0 1px 2px 0 rgba(0,0,0,0.05)`)
- **Inactive Tab**:
  ```tsx
  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
  ```
  - Background: Transparent
  - Text color: `text-slate-600` (`#475569`), hover `text-slate-900` (`#0f172a`)
  - Typography: `text-xs font-medium` (`12px`, 500 weight)

### Occurrence 1: `ProfessionalProfilePage.tsx`
- **File**: `src/pages/settings/ProfessionalProfilePage.tsx`
- **Lines**: 246–274
- **Current JSX**:
  ```tsx
  {/* Settings Tab Navigation Strip */}
  <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
    <button
      type="button"
      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-[#28006d] shadow-xs"
    >
      My Profile
    </button>
    <button
      type="button"
      onClick={() => navigate('/settings/security')}
      className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
    >
      Security
    </button>
    <button
      type="button"
      onClick={() => navigate('/settings/notifications')}
      className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
    >
      Notifications
    </button>
    <button
      type="button"
      onClick={() => navigate('/settings/support')}
      className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
    >
      Support
    </button>
  </div>
  ```
- **Action**: Delete lines 267–273 (the Support `<button>` element).
- **Post-Change Result**: Exactly 3 tabs (`My Profile`, `Security`, `Notifications`). Zero changes to container classes or remaining button styles.

### Occurrence 2: `AccountSecurityPage.tsx`
- **File**: `src/pages/settings/AccountSecurityPage.tsx`
- **Lines**: 374–402
- **Current JSX**:
  ```tsx
  {/* Settings Tab Navigation Strip */}
  <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
    <button
      type="button"
      onClick={() => navigate('/settings')}
      className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
    >
      My Profile
    </button>
    <button
      type="button"
      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-[#28006d] shadow-xs"
    >
      Security
    </button>
    <button
      type="button"
      onClick={() => navigate('/settings/notifications')}
      className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
    >
      Notifications
    </button>
    <button
      type="button"
      onClick={() => navigate('/settings/support')}
      className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
    >
      Support
    </button>
  </div>
  ```
- **Action**: Delete lines 395–401 (the Support `<button>` element).
- **Post-Change Result**: Exactly 3 tabs (`My Profile`, `Security`, `Notifications`). Container and remaining tab aesthetics remain perfectly preserved.

### Occurrence 3: `NotificationPreferencesPage.tsx`
- **File**: `src/pages/settings/NotificationPreferencesPage.tsx`
- **Lines**: 204–232
- **Current JSX**:
  ```tsx
  {/* Settings Tab Navigation Strip */}
  <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
    <button
      type="button"
      onClick={() => navigate('/settings')}
      className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
    >
      My Profile
    </button>
    <button
      type="button"
      onClick={() => navigate('/settings/security')}
      className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
    >
      Security
    </button>
    <button
      type="button"
      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-[#28006d] shadow-xs"
    >
      Notifications
    </button>
    <button
      type="button"
      onClick={() => navigate('/settings/support')}
      className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
    >
      Support
    </button>
  </div>
  ```
- **Action**: Delete lines 225–231 (the Support `<button>` element).
- **Post-Change Result**: Exactly 3 tabs (`My Profile`, `Security`, `Notifications`).

---

## 4. Route Mapping & Support Route Decoupling

### Current Route Configuration in `src/routes/index.tsx`
Lines 397–421:
```tsx
// 8. Doctor Profile & Clinic Settings (Milestone 14 - Group E)
{
  path: '/settings',
  element: <ProfessionalProfilePage />,
},
{
  path: '/settings/profile',
  element: <ProfessionalProfilePage />,
},
{
  path: '/settings/security',
  element: <AccountSecurityPage />,
},
{
  path: '/settings/notifications',
  element: <NotificationPreferencesPage />,
},
{
  path: '/settings/support',
  element: <SupportCenterPage />,
},
{
  path: '/support',
  element: <SupportCenterPage />,
},
```

### Decoupling Strategy & Acceptance Criteria Alignment
- **Acceptance Criteria**: *"Support tab is completely removed from `/settings` tab navigation and route mapping."*
- **Acceptance Criteria**: *"Sidebar Support navigation remains intact and navigates to the standalone Support page."*

#### Route Mapping Recommendation:
To satisfy the requirement that Support is removed from `/settings` route mapping while guaranteeing zero regressions for any user bookmarks or cached links:
1. **Redirect `/settings/support` to `/support`**:
   ```tsx
   {
     path: '/settings/support',
     element: <Navigate to="/support" replace />,
   },
   ```
   *Rationale*: This removes `SupportCenterPage` as an element under `/settings/support`, redirecting any incoming traffic directly to the canonical standalone `/support` route.
2. **Move `/support` to Standalone Route Group**:
   ```tsx
   // 10. Clinical IT Support & Helpdesk Hub (Standalone Workstation)
   {
     path: '/support',
     element: <SupportCenterPage />,
   },
   ```
   *Rationale*: This cleanly decouples the Support workstation from settings.

---

## 5. Sidebar Navigation Analysis

### File: `src/components/layout/PatientLayout.tsx`

#### 1. Profile Navigation Item (Lines 411–429)
```tsx
{/* Profile */}
<NavLink
  to="/settings"
  className={cn(
    'w-full h-11 flex items-center gap-3 px-4 rounded-full text-sm font-medium transition-colors',
    isSettingsRoute
      ? 'bg-[#3f1d8b] text-[#ab8efd] font-semibold'
      : 'text-[#494552] hover:bg-slate-200/60 hover:text-[#191c1d]'
  )}
>
  <User
    className={cn(
      'size-4.5 shrink-0 transition-colors',
      isSettingsRoute ? 'text-[#ab8efd]' : 'text-[#494552]'
    )}
    aria-hidden="true"
  />
  <span>Profile</span>
</NavLink>
```
- **Direct Navigation**: It uses `<NavLink to="/settings">`.
- **No Dropdown / Accordion**: Unlike the `Patients` (lines 216–253) and `Reports` (lines 332–369) sections, which have state variables `isPatientsExpanded` and `isReportsExpanded`, chevron icons with `rotate-180`, and submenu `<div>`s, the `Profile` item is a simple standalone link.
- **Verification Result**: Meets R1 criteria in full. No modifications needed for the Profile item.

#### 2. Support Navigation Item (Lines 434–451)
```tsx
{/* 5. Bottom Actions: Support & Sign Out (Figma node 1:7002) */}
<div className="mt-auto px-2 pb-2 space-y-1">
  <NavLink
    to="/settings/support"
    className={cn(
      'w-full h-11 flex items-center gap-3 px-4 rounded-full text-sm font-medium transition-colors',
      isSupportRoute
        ? 'bg-[#3f1d8b] text-[#ab8efd] font-semibold'
        : 'text-[#494552] hover:bg-slate-200/60 hover:text-[#191c1d]'
    )}
  >
    <HelpCircle
      className={cn(
        'size-5 shrink-0 transition-colors',
        isSupportRoute ? 'text-[#ab8efd]' : 'text-[#494552]'
      )}
      aria-hidden="true"
    />
    <span>Support</span>
  </NavLink>
```
- **Current Issue**: The `to` attribute points to `/settings/support`.
- **Required Change**: Change `to="/settings/support"` to `to="/support"`.
- **Active State Computation (Line 95)**:
  - Current: `const isSupportRoute = location.pathname === '/settings/support';`
  - Update to: `const isSupportRoute = location.pathname === '/support' || location.pathname === '/settings/support';`
  - This ensures that clicking Support in the sidebar or directly visiting `/support` properly highlights the sidebar item in purple (`bg-[#3f1d8b] text-[#ab8efd]`).

#### 3. Header Help Button (Lines 501–509)
```tsx
{/* Help Button */}
<button
  type="button"
  onClick={() => navigate('/settings/support')}
  className="p-2 rounded-full text-[#494552] hover:bg-slate-200/60 transition-colors focus:outline-none"
  aria-label="Help and Clinical Support"
>
  <HelpCircle className="size-5" />
</button>
```
- **Current Issue**: Navigates to `/settings/support`.
- **Required Change**: Change `onClick={() => navigate('/settings/support')}` to `onClick={() => navigate('/support')`.

---

## 6. Standalone Support Page Top Section Analysis

### File: `src/pages/settings/SupportCenterPage.tsx`
Lines 95–142 contain the header and settings tab strip:
```tsx
{/* Page Header (1:5115) */}
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
  <div>
    <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-500 mb-1">
      <span className="hover:text-slate-800 cursor-pointer" onClick={() => navigate('/dashboard')}>
        Dashboard
      </span>
      <ChevronRight className="size-3 text-slate-400" />
      <span className="text-slate-700 font-medium">Settings</span>
      <ChevronRight className="size-3 text-slate-400" />
      <span className="text-slate-900 font-bold">Support & Help Center</span>
    </nav>
    <h1 className="text-2xl font-bold text-slate-900">Support & Legal</h1>
    <p className="text-xs text-slate-500 mt-0.5">
      Manage your app preferences, find help, and review clinical legal agreements.
    </p>
  </div>

  {/* Settings Tab Navigation Strip */}
  <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
    <button
      type="button"
      onClick={() => navigate('/settings')}
      className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
    >
      My Profile
    </button>
    <button
      type="button"
      onClick={() => navigate('/settings/security')}
      className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
    >
      Security
    </button>
    <button
      type="button"
      onClick={() => navigate('/settings/notifications')}
      className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
    >
      Notifications
    </button>
    <button
      type="button"
      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-[#28006d] shadow-xs"
    >
      Support
    </button>
  </div>
</div>
```

### Evaluation Against R1 and R6
- **Requirement R1**: *Remove the Support tab and its route association from the Profile settings top navigation inside `/settings`, keeping only My Profile, Security, and Notifications. Preserve the standalone Support route and sidebar Support navigation so that clicking Support in the sidebar opens the existing Support page.*
- **Requirement R6**: *do not alter the visual styling, card dimensions, typography, colors, or component structure of the Support page.*

#### Recommendations for `SupportCenterPage.tsx`:
1. **Remove Tab Navigation Strip from `SupportCenterPage.tsx`**:
   The tab navigation strip belongs to `/settings`. Showing `My Profile`, `Security`, `Notifications`, `Support` on `/support` presents it as a sub-page of settings. Removing lines 112–141 makes `SupportCenterPage` purely standalone.
2. **Streamline Breadcrumbs**:
   Change breadcrumbs from `Dashboard > Settings > Support & Help Center` to `Dashboard > Support & Help Center`. This aligns with the fact that Support is accessed directly from the sidebar.
3. **Preserve Bento Grid and Cards**:
   All 5 cards and modal states remain 100% unaltered:
   - Row 1: `Help Center & FAQ` (Span 8) and `Contact Support` (Span 4)
   - Row 2: `Direct Assistance` (Span 4) and `System Status & SLAs` (Span 8)
   - Row 3: `Legal Agreements & Compliance` (Span 12)
   - Modals: `IT Support Ticket Modal` and `Helpdesk Call Modal`

---

## 7. Breadcrumb Component Verification

### File: `src/components/layout/Breadcrumbs.tsx`
Lines 85–88:
```tsx
location.pathname.startsWith('/settings') ||
location.pathname === '/notifications' ||
location.pathname === '/support'
```
- Line 87 already explicitly checks `location.pathname === '/support'` and suppresses the global breadcrumb banner because `SupportCenterPage` renders its own contextual header.
- No changes are needed in `Breadcrumbs.tsx`.

---

## 8. Summary of Proposed Changes (Concrete Plan)

| File | Lines | Proposed Change | Purpose |
|------|-------|-----------------|---------|
| `src/pages/settings/ProfessionalProfilePage.tsx` | 267–273 | Remove Support tab `<button>` | Satisfy R1 (3 tabs: My Profile, Security, Notifications) |
| `src/pages/settings/AccountSecurityPage.tsx` | 395–401 | Remove Support tab `<button>` | Satisfy R1 (3 tabs: My Profile, Security, Notifications) |
| `src/pages/settings/NotificationPreferencesPage.tsx` | 225–231 | Remove Support tab `<button>` | Satisfy R1 (3 tabs: My Profile, Security, Notifications) |
| `src/routes/index.tsx` | 414–416 | Replace `/settings/support` route with redirect `<Navigate to="/support" replace />` | Decouple Support from `/settings` route mapping while avoiding 404s |
| `src/components/layout/PatientLayout.tsx` | 95 | Update `isSupportRoute` to check `location.pathname === '/support' \|\| location.pathname === '/settings/support'` | Ensure sidebar highlights when on standalone `/support` |
| `src/components/layout/PatientLayout.tsx` | 435 | Change `<NavLink to="/settings/support">` to `<NavLink to="/support">` | Sidebar Support opens standalone Support page |
| `src/components/layout/PatientLayout.tsx` | 503 | Change `onClick={() => navigate('/settings/support')}` to `onClick={() => navigate('/support')}` | Header Help button points to standalone Support |
| `src/pages/settings/SupportCenterPage.tsx` | 101–103, 112–141 | Remove Settings breadcrumb segment and settings tab strip | Present Support as a standalone workstation |

---

## 9. Non-Breaking Verification Strategy

1. **TypeScript Type-Check**:
   `npm run type-check` (`tsc -b --noEmit`) must complete with 0 errors.
2. **ESLint**:
   `npm run lint` must pass with 0 errors.
3. **Runtime Profile Verification**:
   `node tests/runtime_profile_verification.cjs` must pass all tests. (The test checks `!layoutContent.includes('isProfileExpanded')`, `!layoutContent.includes('profile-submenu')`, and `layoutContent.includes('to="/settings"')`, all of which remain true).
4. **Build Check**:
   `npm run build` (`vite build`) must build production assets without errors.
