# Handoff Report — Explorer 2: Routes & Layout Navigation

## 1. Observation

Direct investigation was conducted across `src/routes/index.tsx`, `src/components/layout/PatientLayout.tsx`, and `src/components/layout/Header.tsx`:

### 1.1 `src/routes/index.tsx`
- **Imports (Line 4)**: `Navigate` is already imported from `'react-router-dom'`:
  ```typescript
  import {
    createBrowserRouter,
    Navigate,
    RouterProvider,
    useLocation,
  } from 'react-router-dom';
  ```
  No additional imports are required.
- **Route Mappings (Lines 413-420)**:
  ```typescript
  413:       {
  414:         path: '/settings/support',
  415:         element: <SupportCenterPage />,
  416:       },
  417:       {
  418:         path: '/support',
  419:         element: <SupportCenterPage />,
  420:       },
  ```
  Currently both `/settings/support` and `/support` render `<SupportCenterPage />` directly.

### 1.2 `src/components/layout/PatientLayout.tsx`
- **Active Route Evaluation (Lines 91-96)**:
  ```typescript
  91:   const isSettingsRoute =
  92:     location.pathname.startsWith('/settings') &&
  93:     location.pathname !== '/settings/support';
  94: 
  95:   const isSupportRoute = location.pathname === '/settings/support';
  ```
  `isSupportRoute` only checks `location.pathname === '/settings/support'`. When navigating directly to `/support`, `isSupportRoute` evaluates to `false`, causing the sidebar Support link to lose active highlight.
- **Sidebar Profile Link (Lines 411-428)**:
  ```typescript
  411:             {/* Profile */}
  412:             <NavLink
  413:               to="/settings"
  414:               className={cn(
  415:                 'w-full h-11 flex items-center gap-3 px-4 rounded-full text-sm font-medium transition-colors',
  416:                 isSettingsRoute
  417:                   ? 'bg-[#3f1d8b] text-[#ab8efd] font-semibold'
  418:                   : 'text-[#494552] hover:bg-slate-200/60 hover:text-[#191c1d]'
  419:               )}
  420:             >
  421:               <User
  422:                 className={cn(
  423:                   'size-4.5 shrink-0 transition-colors',
  424:                   isSettingsRoute ? 'text-[#ab8efd]' : 'text-[#494552]'
  425:                 )}
  426:                 aria-hidden="true"
  427:               />
  428:               <span>Profile</span>
  429:             </NavLink>
  ```
  The sidebar Profile item is a direct `<NavLink to="/settings">`. Unlike the `Patients` (lines 214-308) and `Reports` (lines 330-408) navigation items, Profile has no state (`useState`), no collapsible container, no `ChevronDown` icon, and no submenus or nested links.
- **Sidebar Support Link (Lines 434-451)**:
  ```typescript
  434:           <NavLink
  435:             to="/settings/support"
  436:             className={cn(
  437:               'w-full h-11 flex items-center gap-3 px-4 rounded-full text-sm font-medium transition-colors',
  438:               isSupportRoute
  439:                 ? 'bg-[#3f1d8b] text-[#ab8efd] font-semibold'
  440:                 : 'text-[#494552] hover:bg-slate-200/60 hover:text-[#191c1d]'
  441:             )}
  442:           >
  443:             <HelpCircle
  444:               className={cn(
  445:                 'size-5 shrink-0 transition-colors',
  446:                 isSupportRoute ? 'text-[#ab8efd]' : 'text-[#494552]'
  447:               )}
  448:               aria-hidden="true"
  449:             />
  450:             <span>Support</span>
  451:           </NavLink>
  ```
  The sidebar Support link currently points to `to="/settings/support"`.
- **Top Bar Help Button (Lines 500-508)**:
  ```typescript
  500:               {/* Help Button */}
  501:               <button
  502:                 type="button"
  503:                 onClick={() => navigate('/settings/support')}
  504:                 className="p-2 rounded-full text-[#494552] hover:bg-slate-200/60 transition-colors focus:outline-none"
  505:                 aria-label="Help and Clinical Support"
  506:               >
  507:                 <HelpCircle className="size-5" />
  508:               </button>
  ```
  The top bar Help button in `PatientLayout.tsx` calls `navigate('/settings/support')`.

### 1.3 `src/components/layout/Header.tsx`
- **Location & Architecture**:
  `PatientLayout.tsx` renders its own inline `<header>` element (line 471). A standalone reusable header component also exists at `src/components/layout/Header.tsx`.
- **Help Button in Header.tsx (Lines 71-79)**:
  ```typescript
  71:         {/* Help & Support Button */}
  72:         <button
  73:           type="button"
  74:           onClick={() => navigate('/settings')}
  75:           className="p-2 rounded-full text-[#494552] hover:bg-[#f3f4f5] hover:text-[#191c1d] transition-colors focus:outline-none focus:ring-2 focus:ring-[#5b14b8]"
  76:           aria-label="Help and clinical support"
  77:         >
  78:           <HelpCircle className="size-5" />
  79:         </button>
  ```
  In `Header.tsx`, line 74 navigates to `/settings` instead of the standalone support route.

---

## 2. Logic Chain

1. **Route Decoupling**:
   - According to Requirement R1 and SCOPE.md, the Support center must exist as a standalone workstation at `/support`.
   - `/settings/support` must decouple from the settings layout and automatically redirect to `/support`.
   - In `src/routes/index.tsx`, `Navigate` is already imported on line 4. Replacing `<SupportCenterPage />` with `<Navigate to="/support" replace />` on `/settings/support` ensures any legacy bookmark or direct URL access immediately redirects to `/support` with HTTP replace semantics (preventing browser back-button loops).
   - The standalone `/support` route mapping `<SupportCenterPage />` remains intact.

2. **Active State Synchronization**:
   - In `PatientLayout.tsx`, when users are at `/support` or momentarily at `/settings/support` prior to redirect, the sidebar Support link should indicate active state.
   - Updating `isSupportRoute` from `location.pathname === '/settings/support'` to `location.pathname === '/support' || location.pathname === '/settings/support'` guarantees active styling under all navigation circumstances.
   - Concurrently, `isSettingsRoute` (`location.pathname.startsWith('/settings') && location.pathname !== '/settings/support'`) ensures the Profile link is never active when on `/support` or `/settings/support`.

3. **Sidebar Direct Navigation**:
   - Requirement R1 explicitly dictates that sidebar Profile navigation must remain direct without dropdowns, submenus, or accordion behavior.
   - Direct inspection confirms `Profile` is a simple `<NavLink to="/settings">`. No alterations to Profile structure are needed.
   - Sidebar Support link currently targets `/settings/support`. Changing it to `to="/support"` aligns primary user interaction with the standalone route directly without incurring an unnecessary redirect cycle.

4. **Help Button Consistency Across Layouts**:
   - In `PatientLayout.tsx`, the inline header Help button navigates to `/settings/support`. Updating it to `navigate('/support')` ensures direct routing to the standalone Support page.
   - In `Header.tsx`, the standalone component navigates to `/settings`. Updating it to `navigate('/support')` ensures behavioral consistency across both layout variations.

---

## 3. Caveats

- **Scope Boundary**: Explorer 1 is investigating the settings page tab headers (`ProfessionalProfilePage.tsx`, `AccountSecurityPage.tsx`, `NotificationPreferencesPage.tsx`) and `SupportCenterPage.tsx` header breadcrumbs. This report strictly addresses routing and navigation layout (`routes/index.tsx`, `PatientLayout.tsx`, `Header.tsx`).
- **No Git Repository**: The workspace does not have a local `.git` repository; code searches must rely on filesystem tools rather than `git grep`.
- **Breadcrumbs Integration**: `src/components/layout/Breadcrumbs.tsx` already contains `location.pathname === '/support'` at line 87 to suppress outer breadcrumbs, enabling `SupportCenterPage.tsx` to display its own contextual breadcrumbs. No changes are required in `Breadcrumbs.tsx`.

---

## 4. Conclusion & Proposed Implementation Plan

The routing and navigation architecture is clean and ready for implementation. The required modifications are localized to 3 files:

### File 1: `src/routes/index.tsx`
- **Location**: Line 414-416
- **Current**:
  ```typescript
        {
          path: '/settings/support',
          element: <SupportCenterPage />,
        },
  ```
- **Proposed**:
  ```typescript
        {
          path: '/settings/support',
          element: <Navigate to="/support" replace />,
        },
  ```

### File 2: `src/components/layout/PatientLayout.tsx`
- **Location 1**: Line 95
  - **Current**: `const isSupportRoute = location.pathname === '/settings/support';`
  - **Proposed**: `const isSupportRoute = location.pathname === '/support' || location.pathname === '/settings/support';`
- **Location 2**: Line 435
  - **Current**: `<NavLink to="/settings/support"`
  - **Proposed**: `<NavLink to="/support"`
- **Location 3**: Line 503
  - **Current**: `onClick={() => navigate('/settings/support')}`
  - **Proposed**: `onClick={() => navigate('/support')}`
- **Confirmation**: Profile `<NavLink to="/settings">` at lines 411-428 remains unchanged as a direct NavLink without dropdowns or submenus.

### File 3: `src/components/layout/Header.tsx`
- **Location**: Line 74
  - **Current**: `onClick={() => navigate('/settings')}`
  - **Proposed**: `onClick={() => navigate('/support')}`

---

## 5. Verification Method

1. **Type Check & Build**:
   ```powershell
   npm run build
   ```
   Must compile with 0 TypeScript and Vite bundle errors.
2. **Route Redirection Verification**:
   - Accessing `/settings/support` in browser must redirect to `/support`.
   - Accessing `/support` directly must render `<SupportCenterPage />`.
3. **Sidebar & Header Navigation Verification**:
   - Clicking sidebar `Support` navigates to `/support` and applies active styling (`bg-[#3f1d8b] text-[#ab8efd]`).
   - Clicking sidebar `Profile` navigates to `/settings` directly without opening any dropdown or submenu.
   - Clicking the Help icon in the top header navigates directly to `/support`.
4. **Invalidation Conditions**:
   - If `/settings/support` renders `SupportCenterPage` instead of redirecting to `/support`.
   - If clicking sidebar `Profile` reveals a dropdown menu or chevron.
   - If `isSupportRoute` is `false` when path is `/support`.
