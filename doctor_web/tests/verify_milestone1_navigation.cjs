/**
 * Milestone 1 Verification: Navigation & Route Decoupling
 *
 * Verifies all static contracts, AST patterns, and route configurations
 * for Milestone 1 of the Support Module Integration.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
}

function verifyMilestone1() {
  console.log('Running Milestone 1 Verification: Navigation & Route Decoupling...\n');

  // 1. ProfessionalProfilePage
  const profProfilePath = path.join(ROOT_DIR, 'src/pages/settings/ProfessionalProfilePage.tsx');
  const profProfile = fs.readFileSync(profProfilePath, 'utf8');
  assert(!profProfile.includes("navigate('/settings/support')"), 'ProfessionalProfilePage must not contain navigate to /settings/support');
  assert(!profProfile.includes('>Support</button>'), 'ProfessionalProfilePage must not contain Support tab button');
  assert(profProfile.includes('My Profile') && profProfile.includes('Security') && profProfile.includes('Notifications'), 'ProfessionalProfilePage must preserve My Profile, Security, Notifications tabs');
  console.log('✅ [PASS] ProfessionalProfilePage: Settings tab strip has 3 tabs, Support tab removed');

  // 2. AccountSecurityPage
  const secPagePath = path.join(ROOT_DIR, 'src/pages/settings/AccountSecurityPage.tsx');
  const secPage = fs.readFileSync(secPagePath, 'utf8');
  assert(!secPage.includes("navigate('/settings/support')"), 'AccountSecurityPage must not contain navigate to /settings/support');
  assert(!secPage.includes('>Support</button>'), 'AccountSecurityPage must not contain Support tab button');
  assert(secPage.includes('My Profile') && secPage.includes('Security') && secPage.includes('Notifications'), 'AccountSecurityPage must preserve My Profile, Security, Notifications tabs');
  console.log('✅ [PASS] AccountSecurityPage: Settings tab strip has 3 tabs, Support tab removed');

  // 3. NotificationPreferencesPage
  const notifPagePath = path.join(ROOT_DIR, 'src/pages/settings/NotificationPreferencesPage.tsx');
  const notifPage = fs.readFileSync(notifPagePath, 'utf8');
  assert(!notifPage.includes("navigate('/settings/support')"), 'NotificationPreferencesPage must not contain navigate to /settings/support');
  assert(!notifPage.includes('>Support</button>'), 'NotificationPreferencesPage must not contain Support tab button');
  assert(notifPage.includes('My Profile') && notifPage.includes('Security') && notifPage.includes('Notifications'), 'NotificationPreferencesPage must preserve My Profile, Security, Notifications tabs');
  console.log('✅ [PASS] NotificationPreferencesPage: Settings tab strip has 3 tabs, Support tab removed');

  // 4. Routes index.tsx
  const routesPath = path.join(ROOT_DIR, 'src/routes/index.tsx');
  const routes = fs.readFileSync(routesPath, 'utf8');
  assert(routes.includes('<Navigate to="/support" replace />'), 'src/routes/index.tsx must redirect /settings/support to /support');
  assert(routes.includes("path: '/support'"), 'src/routes/index.tsx must contain /support route');
  assert(routes.includes('element: <SupportCenterPage />'), 'src/routes/index.tsx must map /support to SupportCenterPage');
  console.log('✅ [PASS] routes/index.tsx: /settings/support redirects to /support, /support renders SupportCenterPage');

  // 5. PatientLayout.tsx
  const layoutPath = path.join(ROOT_DIR, 'src/components/layout/PatientLayout.tsx');
  const layout = fs.readFileSync(layoutPath, 'utf8');
  assert(layout.includes('to="/support"'), 'PatientLayout must link sidebar Support item to /support');
  assert(layout.includes("location.pathname === '/support'"), 'PatientLayout isSupportRoute must recognize /support');
  assert(layout.includes("onClick={() => navigate('/support')}"), 'PatientLayout header help button must navigate to /support');
  assert(layout.includes('to="/settings"'), 'PatientLayout Profile item must navigate directly to /settings');
  assert(!layout.includes('isProfileExpanded'), 'PatientLayout Profile must NOT have dropdown state');
  console.log('✅ [PASS] PatientLayout.tsx: Sidebar & header Support links updated to /support, Profile direct link intact');

  // 6. Header.tsx
  const headerPath = path.join(ROOT_DIR, 'src/components/layout/Header.tsx');
  const header = fs.readFileSync(headerPath, 'utf8');
  assert(header.includes("onClick={() => navigate('/support')}"), 'Header.tsx help button must navigate to /support');
  console.log('✅ [PASS] Header.tsx: Help & Support button navigates to /support');

  // 7. SupportCenterPage.tsx
  const supportPath = path.join(ROOT_DIR, 'src/pages/settings/SupportCenterPage.tsx');
  const support = fs.readFileSync(supportPath, 'utf8');
  assert(!support.includes('Settings Tab Navigation Strip'), 'SupportCenterPage must not contain settings tab strip');
  assert(support.includes('Dashboard > Support & Help Center') || support.includes('Support &amp; Help Center'), 'SupportCenterPage breadcrumb must lead to Support & Help Center');
  assert(!support.includes('onClick={() => navigate(\'/settings/security\')}'), 'SupportCenterPage header must not contain settings navigation buttons');
  console.log('✅ [PASS] SupportCenterPage.tsx: Header settings tabs cleaned up, breadcrumb simplified');

  console.log('\n🎉 ALL MILESTONE 1 NAVIGATION & ROUTE DECOUPLING CONTRACTS PASSED.');
}

verifyMilestone1();
