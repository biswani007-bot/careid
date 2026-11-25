import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, Outlet } from 'react-router-dom';
import { AuthProvider, ProtectedRoute, PublicRoute, useAuth } from './context/AuthContext';
import { BrandingProvider } from './context/BrandingContext';
import AdminLogin from './components/auth/AdminLogin';
import AdminDashboard from './components/dashboard/AdminDashboard';
import AdminUserDirectory from './components/users/AdminUserDirectory';
import AdminUserDetails from './components/users/AdminUserDetails';
import AdminCreateUser from './components/users/AdminCreateUser';
import AdminUserActionDialogs from './components/users/AdminUserActionDialogs';
import AdminPatientDirectory from './components/patients/AdminPatientDirectory';
import AdminPatientProfile from './components/patients/AdminPatientProfile';
import AdminPatientRegistration from './components/patients/AdminPatientRegistration';
import AdminPatientActionDialogs from './components/patients/AdminPatientActionDialogs';
import AdminPetDirectory from './components/pets/AdminPetDirectory';
import AdminDoctorDirectory from './components/doctors/AdminDoctorDirectory';
import AdminAddDoctor from './components/doctors/AdminAddDoctor';
import AdminDoctorProfile from './components/doctors/AdminDoctorProfile';
import AdminDoctorActionDialogs from './components/doctors/AdminDoctorActionDialogs';
import AdminFacilityDirectory from './components/facilities/AdminFacilityDirectory';
import AdminAddFacility from './components/facilities/AdminAddFacility';
import AdminFacilityDetails from './components/facilities/AdminFacilityDetails';
import AdminEditFacility from './components/facilities/AdminEditFacility';
import AdminStaffMapping from './components/facilities/AdminStaffMapping';
import AdminMapDoctor from './components/facilities/AdminMapDoctor';
import AdminAllHealthRecords from './components/records/AdminAllHealthRecords';
import AdminMedicalRecords from './components/records/AdminMedicalRecords';
import AdminDentalRecords from './components/records/AdminDentalRecords';
import AdminVisionRecords from './components/records/AdminVisionRecords';
import AdminRecordDetails from './components/records/AdminRecordDetails';
import AdminUploadRecord from './components/records/AdminUploadRecord';
import AdminOcrQueue from './components/ocr/AdminOcrQueue';
import AdminOcrAnalytics from './components/ocr/AdminOcrAnalytics';
import AdminOcrVerificationWorkspace from './components/ocr/AdminOcrVerificationWorkspace';
import AdminOcrRejected from './components/ocr/AdminOcrRejected';
import AdminReferralDashboard from './components/referrals/AdminReferralDashboard';
import AdminReferralMonitoring from './components/referrals/AdminReferralMonitoring';
import AdminReferralDetails from './components/referrals/AdminReferralDetails';
import AdminReferralAudit from './components/referrals/AdminReferralAudit';
import AdminReportsDashboard from './components/reports/AdminReportsDashboard';
import AdminOcrPerformanceReport from './components/reports/AdminOcrPerformanceReport';
import AdminSystemHealthExport from './components/reports/AdminSystemHealthExport';
import AdminReferralActivityReport from './components/reports/AdminReferralActivityReport';
import AdminSystemSettingsGeneral from './components/settings/AdminSystemSettingsGeneral';
import AdminSystemSettingsBranding from './components/settings/AdminSystemSettingsBranding';
import AdminSystemSettingsSecurity from './components/settings/AdminSystemSettingsSecurity';
import AdminSystemSettingsRoles from './components/settings/AdminSystemSettingsRoles';
import AdminSystemSettingsOcr from './components/settings/AdminSystemSettingsOcr';
import AdminSystemSettingsIntegrations from './components/settings/AdminSystemSettingsIntegrations';
import AdminSystemSettingsAnnouncements from './components/settings/AdminSystemSettingsAnnouncements';
import AdminSystemSettingsPracticeTypes from './components/settings/AdminSystemSettingsPracticeTypes';
import AdminConsultationManagementHub from './components/consultation/AdminConsultationManagementHub';
import AdminNotificationDashboard from './components/notifications/AdminNotificationDashboard';
import AdminAuditDashboard from './components/audit/AdminAuditDashboard';
import AdminAuditLogExplorer from './components/audit/AdminAuditLogExplorer';
import AdminAuditEventDetails from './components/audit/AdminAuditEventDetails';
import AdminSecurityCompliance from './components/security/AdminSecurityCompliance';
import AdminSecuritySessionManagement from './components/security/AdminSecuritySessionManagement';
import AdminProfileInformation from './components/profile/AdminProfileInformation';
import AdminPrivacyPolicyPage from './components/legal/AdminPrivacyPolicyPage';
import AdminTermsConditionsPage from './components/legal/AdminTermsConditionsPage';
import AdminFinancingDashboard from './components/financial/AdminFinancingDashboard';
import AdminCmsManagement from './components/cms/AdminCmsManagement';
import AdminCapacityMonitoring from './components/operations/AdminCapacityMonitoring';
import AdminPrescriptionPickupDashboard from './components/operations/AdminPrescriptionPickupDashboard';
import AdminChatOversight from './components/communication/AdminChatOversight';

// Common admin hook for seamless navigation and real backend logout
const useAdminActions = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const handleLogout = async () => {
    await logout();
    navigate('/');
  };
  return { navigate, handleLogout };
};

const ReferralDashboardPage: React.FC = () => {
  const { navigate, handleLogout } = useAdminActions();
  return (
    <AdminReferralDashboard
      onNavigate={(path) => navigate(path)}
      onLogout={handleLogout}
    />
  );
};

const ReferralMonitoringPage: React.FC = () => {
  const { navigate, handleLogout } = useAdminActions();
  return (
    <AdminReferralMonitoring
      onNavigate={(path) => navigate(path)}
      onLogout={handleLogout}
    />
  );
};

const ReferralDetailsPage: React.FC = () => {
  const { navigate, handleLogout } = useAdminActions();
  return (
    <AdminReferralDetails
      onNavigate={(path) => navigate(path)}
      onLogout={handleLogout}
    />
  );
};

const ReferralAuditPage: React.FC = () => {
  const { navigate, handleLogout } = useAdminActions();
  return (
    <AdminReferralAudit
      onNavigate={(path) => navigate(path)}
      onLogout={handleLogout}
    />
  );
};

const ReportsDashboardPage: React.FC = () => {
  const { navigate, handleLogout } = useAdminActions();
  return (
    <AdminReportsDashboard
      onNavigate={(path) => navigate(path)}
      onLogout={handleLogout}
    />
  );
};

const OcrPerformanceReportPage: React.FC = () => {
  const { navigate, handleLogout } = useAdminActions();
  return (
    <AdminOcrPerformanceReport
      onNavigate={(path) => navigate(path)}
      onLogout={handleLogout}
    />
  );
};

const SystemHealthExportPage: React.FC = () => {
  const { navigate, handleLogout } = useAdminActions();
  return (
    <AdminSystemHealthExport
      onNavigate={(path) => navigate(path)}
      onLogout={handleLogout}
    />
  );
};

const ReferralActivityReportPage: React.FC = () => {
  const { navigate, handleLogout } = useAdminActions();
  return (
    <AdminReferralActivityReport
      onNavigate={(path) => navigate(path)}
      onLogout={handleLogout}
    />
  );
};

const SystemSettingsGeneralPage: React.FC = () => {
  const { navigate, handleLogout } = useAdminActions();
  return (
    <AdminSystemSettingsGeneral
      onNavigate={(path) => navigate(path)}
      onLogout={handleLogout}
    />
  );
};

const SystemSettingsBrandingPage: React.FC = () => {
  const { navigate, handleLogout } = useAdminActions();
  return (
    <AdminSystemSettingsBranding
      onNavigate={(path) => navigate(path)}
      onLogout={handleLogout}
    />
  );
};

const SettingsSecurityPage: React.FC = () => {
  const { navigate, handleLogout } = useAdminActions();
  return (
    <AdminSystemSettingsSecurity
      onNavigate={(path) => navigate(path)}
      onLogout={handleLogout}
    />
  );
};

const SettingsRolesPage: React.FC = () => {
  const { navigate, handleLogout } = useAdminActions();
  return (
    <AdminSystemSettingsRoles
      onNavigate={(path) => navigate(path)}
      onLogout={handleLogout}
    />
  );
};

const SettingsOcrPage: React.FC = () => {
  const { navigate, handleLogout } = useAdminActions();
  return (
    <AdminSystemSettingsOcr
      onNavigate={(path) => navigate(path)}
      onLogout={handleLogout}
    />
  );
};

const SettingsIntegrationsPage: React.FC = () => {
  const { navigate, handleLogout } = useAdminActions();
  return (
    <AdminSystemSettingsIntegrations
      onNavigate={(path) => navigate(path)}
      onLogout={handleLogout}
    />
  );
};

const SettingsAnnouncementsPage: React.FC = () => {
  const { navigate, handleLogout } = useAdminActions();
  return (
    <AdminSystemSettingsAnnouncements
      onNavigate={(path) => navigate(path)}
      onLogout={handleLogout}
    />
  );
};

const SettingsPracticeTypesPage: React.FC = () => {
  const { navigate, handleLogout } = useAdminActions();
  return (
    <AdminSystemSettingsPracticeTypes
      onNavigate={(path) => navigate(path)}
      onLogout={handleLogout}
    />
  );
};

const ConsultationManagementPage: React.FC = () => {
  const { navigate, handleLogout } = useAdminActions();
  return (
    <AdminConsultationManagementHub
      onNavigate={(path) => navigate(path)}
      onLogout={handleLogout}
    />
  );
};

const AuditDashboardPage: React.FC = () => {
  const { navigate, handleLogout } = useAdminActions();
  return (
    <AdminAuditDashboard
      onNavigate={(path) => navigate(path)}
      onLogout={handleLogout}
    />
  );
};

const AuditLogExplorerPage: React.FC = () => {
  const { navigate, handleLogout } = useAdminActions();
  return (
    <AdminAuditLogExplorer
      onNavigate={(path, state) => navigate(path, { state })}
      onLogout={handleLogout}
    />
  );
};

const AuditEventDetailsPage: React.FC = () => {
  const { navigate, handleLogout } = useAdminActions();
  return (
    <AdminAuditEventDetails
      onNavigate={(path) => navigate(path)}
      onLogout={handleLogout}
    />
  );
};

const SecurityCompliancePage: React.FC = () => {
  const { navigate, handleLogout } = useAdminActions();
  return (
    <AdminSecurityCompliance
      onNavigate={(path) => navigate(path)}
      onLogout={handleLogout}
    />
  );
};

const SecuritySessionManagementPage: React.FC = () => {
  const { navigate, handleLogout } = useAdminActions();
  return (
    <AdminSecuritySessionManagement
      onNavigate={(path) => navigate(path)}
      onLogout={handleLogout}
    />
  );
};

const SupportPage: React.FC = () => {
  const { navigate, handleLogout } = useAdminActions();
  return (
    <AdminNotificationDashboard
      initialTab="support"
      onNavigate={(path) => navigate(path)}
      onLogout={handleLogout}
    />
  );
};

const NotificationDashboardPage: React.FC = () => {
  const { navigate, handleLogout } = useAdminActions();
  return (
    <AdminNotificationDashboard
      initialTab="notifications"
      onNavigate={(path) => navigate(path)}
      onLogout={handleLogout}
    />
  );
};

const PrivacyPolicyPage: React.FC = () => {
  const { navigate, handleLogout } = useAdminActions();
  return (
    <AdminPrivacyPolicyPage
      onNavigate={(path, state) => navigate(path, { state })}
      onLogout={handleLogout}
    />
  );
};

const TermsConditionsPage: React.FC = () => {
  const { navigate, handleLogout } = useAdminActions();
  return (
    <AdminTermsConditionsPage
      onNavigate={(path, state) => navigate(path, { state })}
      onLogout={handleLogout}
    />
  );
};

const FinancingDashboardPage: React.FC = () => {
  const { navigate, handleLogout } = useAdminActions();
  return (
    <AdminFinancingDashboard
      onNavigate={(path, state) => navigate(path, { state })}
      onLogout={handleLogout}
    />
  );
};

const CmsManagementPage: React.FC = () => {
  const { navigate, handleLogout } = useAdminActions();
  return (
    <AdminCmsManagement
      onNavigate={(path, state) => navigate(path, { state })}
      onLogout={handleLogout}
    />
  );
};

const CapacityMonitoringPage: React.FC = () => {
  const { navigate, handleLogout } = useAdminActions();
  return (
    <AdminCapacityMonitoring
      onNavigate={(path, state) => navigate(path, { state })}
      onLogout={handleLogout}
    />
  );
};

const PrescriptionPickupDashboardPage: React.FC = () => {
  const { navigate, handleLogout } = useAdminActions();
  return (
    <AdminPrescriptionPickupDashboard
      onNavigate={(path, state) => navigate(path, { state })}
      onLogout={handleLogout}
    />
  );
};

const ChatOversightPage: React.FC = () => {
  const { navigate, handleLogout } = useAdminActions();
  return (
    <AdminChatOversight
      onNavigate={(path, state) => navigate(path, { state })}
      onLogout={handleLogout}
    />
  );
};

const OcrRejectedPage: React.FC = () => {
  const { navigate, handleLogout } = useAdminActions();
  return (
    <AdminOcrRejected
      onNavigate={(path) => navigate(path)}
      onLogout={handleLogout}
    />
  );
};

const OcrVerificationWorkspacePage: React.FC = () => {
  const { navigate, handleLogout } = useAdminActions();
  return (
    <AdminOcrVerificationWorkspace
      onNavigate={(path) => navigate(path)}
      onLogout={handleLogout}
    />
  );
};

const OcrQueuePage: React.FC = () => {
  const { navigate, handleLogout } = useAdminActions();
  return (
    <AdminOcrQueue
      onNavigate={(path) => navigate(path)}
      onLogout={handleLogout}
    />
  );
};

const OcrAnalyticsPage: React.FC = () => {
  const { navigate, handleLogout } = useAdminActions();
  return (
    <AdminOcrAnalytics
      onNavigate={(path) => navigate(path)}
      onLogout={handleLogout}
    />
  );
};

const HealthRecordsPage: React.FC = () => {
  const { navigate, handleLogout } = useAdminActions();
  return (
    <AdminAllHealthRecords
      onNavigate={(path) => navigate(path)}
      onLogout={handleLogout}
    />
  );
};

const MedicalRecordsPage: React.FC = () => {
  const { navigate, handleLogout } = useAdminActions();
  return (
    <AdminMedicalRecords
      onNavigate={(path) => navigate(path)}
      onLogout={handleLogout}
    />
  );
};

const DentalRecordsPage: React.FC = () => {
  const { navigate, handleLogout } = useAdminActions();
  return (
    <AdminDentalRecords
      onNavigate={(path) => navigate(path)}
      onLogout={handleLogout}
    />
  );
};

const VisionRecordsPage: React.FC = () => {
  const { navigate, handleLogout } = useAdminActions();
  return (
    <AdminVisionRecords
      onNavigate={(path) => navigate(path)}
      onLogout={handleLogout}
    />
  );
};

const RecordDetailsPage: React.FC = () => {
  const { navigate, handleLogout } = useAdminActions();
  return (
    <AdminRecordDetails
      onNavigate={(path) => navigate(path)}
      onLogout={handleLogout}
    />
  );
};

const UploadRecordPage: React.FC = () => {
  const { navigate, handleLogout } = useAdminActions();
  return (
    <AdminUploadRecord
      onNavigate={(path) => navigate(path)}
      onLogout={handleLogout}
    />
  );
};

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <PublicRoute>
      <AdminLogin onLoginSuccess={() => navigate('/admin/dashboard')} />
    </PublicRoute>
  );
};

const DashboardPage: React.FC = () => {
  const { navigate, handleLogout } = useAdminActions();
  return (
    <AdminDashboard
      onNavigate={(path) => navigate(path)}
      onLogout={handleLogout}
    />
  );
};

const UserDirectoryPage: React.FC = () => {
  const { navigate, handleLogout } = useAdminActions();
  return (
    <AdminUserDirectory
      onNavigate={(path) => navigate(path)}
      onLogout={handleLogout}
    />
  );
};

const PatientDirectoryPage: React.FC = () => {
  const { navigate, handleLogout } = useAdminActions();
  return (
    <AdminPatientDirectory
      onNavigate={(path) => navigate(path)}
      onLogout={handleLogout}
    />
  );
};

const PatientProfilePage: React.FC = () => {
  const { navigate, handleLogout } = useAdminActions();
  return (
    <AdminPatientProfile
      onNavigate={(path) => navigate(path)}
      onLogout={handleLogout}
    />
  );
};

const PatientRegistrationPage: React.FC = () => {
  const { navigate, handleLogout } = useAdminActions();
  return (
    <AdminPatientRegistration
      onNavigate={(path) => navigate(path)}
      onLogout={handleLogout}
    />
  );
};

const PatientActionDialogsPage: React.FC = () => {
  const { navigate, handleLogout } = useAdminActions();
  return (
    <AdminPatientActionDialogs
      onNavigate={(path) => navigate(path)}
      onLogout={handleLogout}
    />
  );
};

const PetDirectoryPage: React.FC = () => {
  const { navigate, handleLogout } = useAdminActions();
  return (
    <AdminPetDirectory
      onNavigate={(path) => navigate(path)}
      onLogout={handleLogout}
    />
  );
};

const CreateUserPage: React.FC = () => {
  const { navigate, handleLogout } = useAdminActions();
  return (
    <AdminCreateUser
      onNavigate={(path) => navigate(path)}
      onLogout={handleLogout}
    />
  );
};

const UserActionDialogsPage: React.FC = () => {
  const { navigate, handleLogout } = useAdminActions();
  return (
    <AdminUserActionDialogs
      onNavigate={(path) => navigate(path)}
      onLogout={handleLogout}
    />
  );
};

const UserDetailsPage: React.FC = () => {
  const { navigate, handleLogout } = useAdminActions();
  return (
    <AdminUserDetails
      onNavigate={(path) => navigate(path)}
      onLogout={handleLogout}
    />
  );
};

const DoctorDirectoryPage: React.FC = () => {
  const { navigate, handleLogout } = useAdminActions();
  return (
    <AdminDoctorDirectory
      onNavigate={(path) => navigate(path)}
      onLogout={handleLogout}
    />
  );
};

const CreateDoctorPage: React.FC = () => {
  const { navigate, handleLogout } = useAdminActions();
  return (
    <AdminAddDoctor
      onNavigate={(path) => navigate(path)}
      onLogout={handleLogout}
    />
  );
};

const DoctorProfilePage: React.FC = () => {
  const { navigate, handleLogout } = useAdminActions();
  return (
    <AdminDoctorProfile
      onNavigate={(path) => navigate(path)}
      onLogout={handleLogout}
    />
  );
};

const DoctorActionDialogsPage: React.FC = () => {
  const { navigate, handleLogout } = useAdminActions();
  return (
    <AdminDoctorActionDialogs
      onNavigate={(path) => navigate(path)}
      onLogout={handleLogout}
    />
  );
};

const FacilityDirectoryPage: React.FC = () => {
  const { navigate, handleLogout } = useAdminActions();
  return (
    <AdminFacilityDirectory
      onNavigate={(path) => navigate(path)}
      onLogout={handleLogout}
    />
  );
};

const CreateFacilityPage: React.FC = () => {
  const { navigate, handleLogout } = useAdminActions();
  return (
    <AdminAddFacility
      onNavigate={(path) => navigate(path)}
      onLogout={handleLogout}
    />
  );
};

const FacilityDetailsPage: React.FC = () => {
  const { navigate, handleLogout } = useAdminActions();
  return (
    <AdminFacilityDetails
      onNavigate={(path) => navigate(path)}
      onLogout={handleLogout}
    />
  );
};

const EditFacilityPage: React.FC = () => {
  const { navigate, handleLogout } = useAdminActions();
  return (
    <AdminEditFacility
      onNavigate={(path) => navigate(path)}
      onLogout={handleLogout}
    />
  );
};

const StaffMappingPage: React.FC = () => {
  const { navigate, handleLogout } = useAdminActions();
  return (
    <AdminStaffMapping
      onNavigate={(path) => navigate(path)}
      onLogout={handleLogout}
    />
  );
};

const MapDoctorPage: React.FC = () => {
  const { navigate, handleLogout } = useAdminActions();
  return (
    <AdminMapDoctor
      onNavigate={(path, state) => navigate(path, { state })}
      onLogout={handleLogout}
    />
  );
};

const AdminProfilePage: React.FC = () => {
  const { navigate, handleLogout } = useAdminActions();
  return (
    <AdminProfileInformation
      onNavigate={(path) => navigate(path)}
      onLogout={handleLogout}
    />
  );
};

/**
 * Layout wrapper that enforces Super Admin route protection across all /admin/* routes
 */
const AdminProtectedLayout: React.FC = () => {
  const navigate = useNavigate();

  React.useEffect(() => {
    const handleGlobalAvatarClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest(
        '.header-avatar-btn, .users-header-avatar, .user-details-header-avatar, .create-user-header-avatar, .patients-header-avatar, .doctors-header-avatar, .facility-header-avatar, .sec-user-profile, .notification-profile-btn, .settings-profile-pill, .announcements-profile-pill, .roles-user-profile-btn, .ocr-user-profile-btn, .int-user-profile-btn, .header-circle-btn.avatar-btn, .audit-avatar-btn, .monitoring-avatar-btn, .referral-header-avatar, .referral-activity-avatar-btn, [data-node-id="20:174"], [data-node-id="20:176"], [data-node-id="20:906"], [data-node-id="20:542"], [data-node-id="20:9281"], [data-node-id="20:9562"]'
      );
      if (target) {
        e.preventDefault();
        e.stopPropagation();
        navigate('/admin/profile');
      }
    };
    document.addEventListener('click', handleGlobalAvatarClick, true);
    return () => {
      document.removeEventListener('click', handleGlobalAvatarClick, true);
    };
  }, [navigate]);

  return (
    <ProtectedRoute>
      <Outlet />
    </ProtectedRoute>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrandingProvider>
        <BrowserRouter>
        <Routes>
          {/* Public Login Routes */}
          <Route path="/" element={<LoginPage />} />
          <Route path="/admin/login" element={<Navigate to="/" replace />} />

          {/* Protected Admin Routes */}
          <Route element={<AdminProtectedLayout />}>
            <Route path="/admin/dashboard" element={<DashboardPage />} />
            <Route path="/dashboard" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/users" element={<UserDirectoryPage />} />
            <Route path="/admin/users/create" element={<CreateUserPage />} />
            <Route path="/admin/users/new" element={<Navigate to="/admin/users/create" replace />} />
            <Route path="/admin/users/add" element={<Navigate to="/admin/users/create" replace />} />
            <Route path="/admin/users/dialogs" element={<UserActionDialogsPage />} />
            <Route path="/admin/users/actions" element={<Navigate to="/admin/users/dialogs" replace />} />
            <Route path="/admin/users/:userId" element={<UserDetailsPage />} />
            <Route path="/admin/users/details" element={<Navigate to="/admin/users/user-1" replace />} />
            <Route path="/users" element={<Navigate to="/admin/users" replace />} />
            <Route path="/admin/patients" element={<PatientDirectoryPage />} />
            <Route path="/admin/patients/directory" element={<Navigate to="/admin/patients" replace />} />
            <Route path="/admin/patients/create" element={<PatientRegistrationPage />} />
            <Route path="/admin/patients/register" element={<Navigate to="/admin/patients/create" replace />} />
            <Route path="/admin/patients/new" element={<Navigate to="/admin/patients/create" replace />} />
            <Route path="/admin/patients/dialogs" element={<PatientActionDialogsPage />} />
            <Route path="/admin/patients/actions" element={<Navigate to="/admin/patients/dialogs" replace />} />
            <Route path="/admin/patients/profile" element={<Navigate to="/admin/patients" replace />} />
            <Route path="/admin/patients/:patientId" element={<PatientProfilePage />} />
            <Route path="/patients" element={<Navigate to="/admin/patients" replace />} />
            <Route path="/admin/pets" element={<PetDirectoryPage />} />
            <Route path="/admin/pets/directory" element={<Navigate to="/admin/pets" replace />} />
            <Route path="/pets" element={<Navigate to="/admin/pets" replace />} />
            <Route path="/admin/doctors" element={<DoctorDirectoryPage />} />
            <Route path="/admin/doctors/directory" element={<Navigate to="/admin/doctors" replace />} />
            <Route path="/admin/doctors/create" element={<CreateDoctorPage />} />
            <Route path="/admin/doctors/add" element={<Navigate to="/admin/doctors/create" replace />} />
            <Route path="/admin/doctors/new" element={<Navigate to="/admin/doctors/create" replace />} />
            <Route path="/admin/doctors/actions" element={<DoctorActionDialogsPage />} />
            <Route path="/admin/doctors/dialogs" element={<Navigate to="/admin/doctors/actions" replace />} />
            <Route path="/admin/doctors/states" element={<Navigate to="/admin/doctors/actions" replace />} />
            <Route path="/admin/doctors/profile" element={<Navigate to="/admin/doctors" replace />} />
            <Route path="/admin/doctors/:doctorId" element={<DoctorProfilePage />} />
            <Route path="/admin/doctors/:doctorId/map-facility" element={<MapDoctorPage />} />
            <Route path="/doctors" element={<Navigate to="/admin/doctors" replace />} />
            <Route path="/admin/facilities" element={<FacilityDirectoryPage />} />
            <Route path="/admin/facilities/directory" element={<Navigate to="/admin/facilities" replace />} />
            <Route path="/admin/facilities/create" element={<CreateFacilityPage />} />
            <Route path="/admin/facilities/add" element={<Navigate to="/admin/facilities/create" replace />} />
            <Route path="/admin/facilities/new" element={<Navigate to="/admin/facilities/create" replace />} />
            <Route path="/admin/facilities/details" element={<Navigate to="/admin/facilities" replace />} />
            <Route path="/admin/facilities/:facilityId/staff-mapping" element={<StaffMappingPage />} />
            <Route path="/admin/facilities/:facilityId/staff" element={<StaffMappingPage />} />
            <Route path="/admin/facilities/staff-mapping" element={<Navigate to="/admin/facilities" replace />} />
            <Route path="/admin/staff-mapping" element={<Navigate to="/admin/facilities" replace />} />
            <Route path="/admin/facilities/:facilityId/map-doctor" element={<MapDoctorPage />} />
            <Route path="/admin/facilities/:facilityId/map" element={<MapDoctorPage />} />
            <Route path="/admin/facilities/map-doctor" element={<Navigate to="/admin/facilities" replace />} />
            <Route path="/admin/map-doctor" element={<Navigate to="/admin/facilities" replace />} />
            <Route path="/admin/facilities/:facilityId/edit" element={<EditFacilityPage />} />
            <Route path="/admin/facilities/edit/:facilityId" element={<EditFacilityPage />} />
            <Route path="/admin/facilities/:facilityId" element={<FacilityDetailsPage />} />
            <Route path="/facilities" element={<Navigate to="/admin/facilities" replace />} />
            <Route path="/admin/records" element={<HealthRecordsPage />} />
            <Route path="/admin/health-records" element={<HealthRecordsPage />} />
            <Route path="/admin/records/all" element={<HealthRecordsPage />} />
            <Route path="/admin/health-records/all" element={<Navigate to="/admin/health-records" replace />} />
            <Route path="/admin/records/overview" element={<Navigate to="/admin/records" replace />} />
            <Route path="/admin/records/upload" element={<UploadRecordPage />} />
            <Route path="/admin/records/new" element={<Navigate to="/admin/records/upload" replace />} />
            <Route path="/admin/health-records/upload" element={<Navigate to="/admin/records/upload" replace />} />
            <Route path="/admin/records/medical" element={<MedicalRecordsPage />} />
            <Route path="/admin/health-records/medical" element={<Navigate to="/admin/records/medical" replace />} />
            <Route path="/admin/records/dental" element={<DentalRecordsPage />} />
            <Route path="/admin/health-records/dental" element={<Navigate to="/admin/records/dental" replace />} />
            <Route path="/admin/records/vision" element={<VisionRecordsPage />} />
            <Route path="/admin/health-records/vision" element={<Navigate to="/admin/records/vision" replace />} />
            <Route path="/admin/records/:recordId" element={<RecordDetailsPage />} />
            <Route path="/admin/records/:recordId/details" element={<RecordDetailsPage />} />
            <Route path="/admin/health-records/:recordId" element={<RecordDetailsPage />} />
            <Route path="/records" element={<Navigate to="/admin/records" replace />} />
            <Route path="/health-records" element={<Navigate to="/admin/health-records" replace />} />
            {/* OCR Verification */}
            <Route path="/admin/ocr" element={<Navigate to="/admin/ocr/queue" replace />} />
            <Route path="/admin/ocr/queue" element={<OcrQueuePage />} />
            <Route path="/admin/ocr/analytics" element={<OcrAnalyticsPage />} />
            <Route path="/admin/ocr/performance" element={<Navigate to="/admin/reports/ocr-performance" replace />} />
            <Route path="/admin/ocr/performance-report" element={<Navigate to="/admin/reports/ocr-performance" replace />} />
            <Route path="/admin/ocr/report" element={<Navigate to="/admin/reports/ocr-performance" replace />} />
            <Route path="/admin/reports/ocr" element={<Navigate to="/admin/reports/ocr-performance" replace />} />
            <Route path="/admin/reports/ocr-performance" element={<OcrPerformanceReportPage />} />
            <Route path="/reports/ocr-performance" element={<Navigate to="/admin/reports/ocr-performance" replace />} />
            <Route path="/admin/ocr/rejected" element={<OcrRejectedPage />} />
            <Route path="/admin/ocr/history" element={<OcrRejectedPage />} />
            <Route path="/admin/ocr/rejected-history" element={<Navigate to="/admin/ocr/rejected" replace />} />
            <Route path="/admin/ocr/verify/:id" element={<OcrVerificationWorkspacePage />} />
            <Route path="/admin/ocr/verify" element={<OcrVerificationWorkspacePage />} />
            <Route path="/admin/ocr/workspace/:id" element={<OcrVerificationWorkspacePage />} />
            <Route path="/admin/ocr/workspace" element={<OcrVerificationWorkspacePage />} />
            <Route path="/admin/ocr-verification" element={<Navigate to="/admin/ocr/queue" replace />} />
            <Route path="/admin/ocr-verification/queue" element={<Navigate to="/admin/ocr/queue" replace />} />
            <Route path="/admin/ocr-verification/analytics" element={<Navigate to="/admin/ocr/analytics" replace />} />
            <Route path="/admin/ocr-verification/rejected" element={<Navigate to="/admin/ocr/rejected" replace />} />
            <Route path="/admin/ocr-verification/history" element={<Navigate to="/admin/ocr/history" replace />} />
            <Route path="/admin/ocr-verification/workspace/:id" element={<OcrVerificationWorkspacePage />} />
            <Route path="/admin/ocr-verification/workspace" element={<OcrVerificationWorkspacePage />} />
            {/* Referral Management & Escalation Monitoring */}
            <Route path="/admin/referrals" element={<ReferralDashboardPage />} />
            <Route path="/admin/referrals/overview" element={<Navigate to="/admin/referrals" replace />} />
            <Route path="/admin/referral-dashboard" element={<Navigate to="/admin/referrals" replace />} />
            <Route path="/admin/referrals/escalations" element={<ReferralMonitoringPage />} />
            <Route path="/admin/referrals/monitoring" element={<Navigate to="/admin/referrals/escalations" replace />} />
            <Route path="/admin/referrals/queue" element={<Navigate to="/admin/referrals/escalations" replace />} />
            <Route path="/admin/referral-monitoring" element={<Navigate to="/admin/referrals/escalations" replace />} />
            {/* Referral Audit Log & Empty States */}
            <Route path="/admin/referrals/audit" element={<ReferralAuditPage />} />
            <Route path="/admin/referrals/audit-history" element={<Navigate to="/admin/referrals/audit" replace />} />
            <Route path="/admin/referrals/history" element={<Navigate to="/admin/referrals/audit" replace />} />
            <Route path="/admin/referrals/details" element={<Navigate to="/admin/referrals" replace />} />
            <Route path="/admin/referrals/details/:referralId" element={<ReferralDetailsPage />} />
            <Route path="/admin/referrals/:referralId" element={<ReferralDetailsPage />} />
            <Route path="/admin/referral-details/:referralId" element={<ReferralDetailsPage />} />
            <Route path="/admin/referral-details" element={<Navigate to="/admin/referrals" replace />} />
            <Route path="/referrals" element={<Navigate to="/admin/referrals" replace />} />
            {/* Reports & Analytics Dashboard (Figma 20:5782) */}
            <Route path="/admin/reports" element={<ReportsDashboardPage />} />
            <Route path="/admin/reports/dashboard" element={<Navigate to="/admin/reports" replace />} />
            <Route path="/admin/reports-dashboard" element={<Navigate to="/admin/reports" replace />} />
            <Route path="/reports" element={<Navigate to="/admin/reports" replace />} />
            {/* System Health & Export (Figma 20:6239) */}
            <Route path="/admin/reports/system-health" element={<SystemHealthExportPage />} />
            <Route path="/admin/reports/system-health-export" element={<Navigate to="/admin/reports/system-health" replace />} />
            <Route path="/admin/reports/health" element={<Navigate to="/admin/reports/system-health" replace />} />
            <Route path="/admin/reports/export" element={<Navigate to="/admin/reports/system-health" replace />} />
            {/* Referral Activity Report (Figma 20:6510) */}
            <Route path="/admin/reports/referral-activity" element={<ReferralActivityReportPage />} />
            <Route path="/admin/reports/referrals" element={<Navigate to="/admin/reports/referral-activity" replace />} />
            <Route path="/admin/referrals/report" element={<Navigate to="/admin/reports/referral-activity" replace />} />
            <Route path="/admin/referrals/activity-report" element={<Navigate to="/admin/reports/referral-activity" replace />} />
            {/* System Settings — General & Organization (Figma 20:12532) */}
            <Route path="/admin/settings" element={<Navigate to="/admin/settings/general" replace />} />
            <Route path="/admin/settings/general" element={<SystemSettingsGeneralPage />} />
            <Route path="/admin/settings/organization" element={<Navigate to="/admin/settings/general" replace />} />
            <Route path="/settings" element={<Navigate to="/admin/settings/general" replace />} />
            <Route path="/settings/general" element={<Navigate to="/admin/settings/general" replace />} />
            {/* System Settings — Branding & Identity (Figma 20:12786) */}
            <Route path="/admin/settings/branding" element={<SystemSettingsBrandingPage />} />
            <Route path="/admin/settings/branding-identity" element={<Navigate to="/admin/settings/branding" replace />} />
            <Route path="/settings/branding" element={<Navigate to="/admin/settings/branding" replace />} />
            {/* System Settings — Security Policies */}
            <Route path="/admin/settings/security" element={<SettingsSecurityPage />} />
            <Route path="/admin/settings/security-policies" element={<Navigate to="/admin/settings/security" replace />} />
            <Route path="/settings/security" element={<Navigate to="/admin/settings/security" replace />} />
            {/* System Settings — Roles & Permissions (Figma 20:13500) */}
            <Route path="/admin/settings/roles" element={<SettingsRolesPage />} />
            <Route path="/admin/settings/roles-permissions" element={<Navigate to="/admin/settings/roles" replace />} />
            <Route path="/admin/settings/permissions" element={<Navigate to="/admin/settings/roles" replace />} />
            <Route path="/admin/settings/rbac" element={<Navigate to="/admin/settings/roles" replace />} />
            <Route path="/settings/roles" element={<Navigate to="/admin/settings/roles" replace />} />
            <Route path="/settings/roles-permissions" element={<Navigate to="/admin/settings/roles" replace />} />
            <Route path="/settings/rbac" element={<Navigate to="/admin/settings/roles" replace />} />
            {/* System Settings — OCR & Notifications */}
            <Route path="/admin/settings/ocr" element={<SettingsOcrPage />} />
            <Route path="/admin/settings/ocr-notifications" element={<Navigate to="/admin/settings/ocr" replace />} />
            <Route path="/settings/ocr" element={<Navigate to="/admin/settings/ocr" replace />} />
            <Route path="/settings/ocr-notifications" element={<Navigate to="/admin/settings/ocr" replace />} />
            {/* System Settings — Integrations & Backup */}
            <Route path="/admin/settings/integrations" element={<SettingsIntegrationsPage />} />
            <Route path="/admin/settings/integrations-backup" element={<Navigate to="/admin/settings/integrations" replace />} />
            <Route path="/settings/integrations" element={<Navigate to="/admin/settings/integrations" replace />} />
            {/* System Settings — Clinical Practice Types */}
            <Route path="/admin/settings/clinical-practice-types" element={<SettingsPracticeTypesPage />} />
            <Route path="/admin/settings/practice-types" element={<Navigate to="/admin/settings/clinical-practice-types" replace />} />
            <Route path="/settings/clinical-practice-types" element={<Navigate to="/admin/settings/clinical-practice-types" replace />} />
            {/* Consultation Management (Goal 015) */}
            <Route path="/admin/consultation-management" element={<ConsultationManagementPage />} />
            <Route path="/admin/settings/consultation-management" element={<Navigate to="/admin/consultation-management" replace />} />
            <Route path="/admin/procedures" element={<Navigate to="/admin/consultation-management" replace />} />
            <Route path="/admin/chargemaster" element={<Navigate to="/admin/consultation-management" replace />} />
            <Route path="/admin/financing-packages" element={<Navigate to="/admin/consultation-management" replace />} />
            <Route path="/settings/consultation-management" element={<Navigate to="/admin/consultation-management" replace />} />
            {/* Announcements & Preferences (Figma Node ID: 20:8723) */}
            <Route path="/admin/announcements" element={<SettingsAnnouncementsPage />} />
            <Route path="/admin/announcements-preferences" element={<Navigate to="/admin/announcements" replace />} />
            <Route path="/admin/notifications/announcements" element={<Navigate to="/admin/announcements" replace />} />
            <Route path="/announcements" element={<Navigate to="/admin/announcements" replace />} />
            <Route path="/admin/settings/announcements" element={<SettingsAnnouncementsPage />} />
            <Route path="/admin/settings/announcements-preferences" element={<Navigate to="/admin/settings/announcements" replace />} />
            <Route path="/admin/settings/preferences" element={<Navigate to="/admin/settings/announcements" replace />} />
            <Route path="/settings/announcements" element={<Navigate to="/admin/settings/announcements" replace />} />
            <Route path="/settings/announcements-preferences" element={<Navigate to="/admin/settings/announcements" replace />} />
            {/* Audit Dashboard & Logs Routes (Figma Node IDs: 20:6795, 20:7190, 20:7732) */}
            <Route path="/admin/audit-dashboard" element={<AuditDashboardPage />} />
            <Route path="/admin/audit-log-explorer" element={<AuditLogExplorerPage />} />
            <Route path="/admin/audit-events/:eventId" element={<AuditEventDetailsPage />} />
            <Route path="/admin/audit-events" element={<Navigate to="/admin/audit-events/EVT-9921" replace />} />
            <Route path="/admin/audit/events/:eventId" element={<Navigate to="/admin/audit-events/:eventId" replace />} />
            <Route path="/admin/audit-event-details/:eventId" element={<Navigate to="/admin/audit-events/:eventId" replace />} />
            <Route path="/admin/audit-event-details" element={<Navigate to="/admin/audit-events/EVT-9921" replace />} />
            <Route path="/admin/audit-explorer" element={<Navigate to="/admin/audit-log-explorer" replace />} />
            <Route path="/admin/logs" element={<Navigate to="/admin/audit-log-explorer" replace />} />
            <Route path="/audit-log-explorer" element={<Navigate to="/admin/audit-log-explorer" replace />} />
            <Route path="/admin/audit" element={<Navigate to="/admin/audit-dashboard" replace />} />
            <Route path="/admin/audit-logs" element={<Navigate to="/admin/audit-log-explorer" replace />} />
            <Route path="/audit" element={<Navigate to="/admin/audit-dashboard" replace />} />
            <Route path="/audit-dashboard" element={<Navigate to="/admin/audit-dashboard" replace />} />
            {/* Security & Compliance (Figma Node ID: 20:8001) */}
            <Route path="/admin/security-compliance" element={<SecurityCompliancePage />} />
            <Route path="/admin/compliance" element={<Navigate to="/admin/security-compliance" replace />} />
            <Route path="/admin/security" element={<Navigate to="/admin/security-compliance" replace />} />
            <Route path="/security-compliance" element={<Navigate to="/admin/security-compliance" replace />} />
            <Route path="/compliance" element={<Navigate to="/admin/security-compliance" replace />} />
            {/* Security & Session Management (Figma Node ID: 20:9632) */}
            <Route path="/admin/security-session-management" element={<SecuritySessionManagementPage />} />
            <Route path="/admin/security-sessions" element={<Navigate to="/admin/security-session-management" replace />} />
            <Route path="/admin/sessions" element={<Navigate to="/admin/security-session-management" replace />} />
            <Route path="/security-session-management" element={<Navigate to="/admin/security-session-management" replace />} />
            <Route path="/security-sessions" element={<Navigate to="/admin/security-session-management" replace />} />
            {/* Help & Support */}
            <Route path="/admin/support" element={<SupportPage />} />
            <Route path="/support" element={<Navigate to="/admin/notifications" replace />} />
            {/* Notification Management Dashboard (Figma Node ID: 20:9051) */}
            <Route path="/admin/notifications" element={<NotificationDashboardPage />} />
            <Route path="/admin/notification-dashboard" element={<Navigate to="/admin/notifications" replace />} />
            <Route path="/admin/support/notifications" element={<Navigate to="/admin/notifications" replace />} />
            <Route path="/notifications" element={<Navigate to="/admin/notifications" replace />} />
            {/* My Profile & Information (Figma Node ID: 20:9351) */}
            <Route path="/admin/profile" element={<AdminProfilePage />} />
            <Route path="/admin/my-profile" element={<Navigate to="/admin/profile" replace />} />
            <Route path="/admin/profile-information" element={<Navigate to="/admin/profile" replace />} />
            <Route path="/profile" element={<Navigate to="/admin/profile" replace />} />

            {/* Legal Document Management (PRD Section 4.4.6 & 4.4.7) */}
            <Route path="/admin/legal/privacy-policy" element={<PrivacyPolicyPage />} />
            <Route path="/admin/privacy-policy" element={<Navigate to="/admin/legal/privacy-policy" replace />} />
            <Route path="/admin/privacy" element={<Navigate to="/admin/legal/privacy-policy" replace />} />
            <Route path="/privacy" element={<Navigate to="/admin/legal/privacy-policy" replace />} />
            <Route path="/admin/legal/terms-conditions" element={<TermsConditionsPage />} />
            <Route path="/admin/terms-conditions" element={<Navigate to="/admin/legal/terms-conditions" replace />} />
            <Route path="/admin/terms" element={<Navigate to="/admin/legal/terms-conditions" replace />} />
            <Route path="/terms" element={<Navigate to="/admin/legal/terms-conditions" replace />} />

            {/* Healthcare Financing & Financial Assistance (Change Request CR-02) */}
            <Route path="/admin/financing" element={<FinancingDashboardPage />} />
            <Route path="/admin/financing/applications" element={<Navigate to="/admin/financing" replace />} />
            <Route path="/admin/financial" element={<Navigate to="/admin/financing" replace />} />
            <Route path="/financing" element={<Navigate to="/admin/financing" replace />} />

            {/* Content Management System (CMS) (PRD Section 4.4.10) */}
            <Route path="/admin/cms" element={<CmsManagementPage />} />
            <Route path="/admin/cms/pages" element={<Navigate to="/admin/cms" replace />} />
            <Route path="/admin/cms/faqs" element={<Navigate to="/admin/cms" replace />} />
            <Route path="/admin/cms/banners" element={<Navigate to="/admin/cms" replace />} />

            {/* Operational Scheduling & Clinic Capacity Monitoring (CR-03 & CR-04) */}
            <Route path="/admin/operations/capacity" element={<CapacityMonitoringPage />} />
            <Route path="/admin/capacity" element={<Navigate to="/admin/operations/capacity" replace />} />
            <Route path="/admin/scheduling-capacity" element={<Navigate to="/admin/operations/capacity" replace />} />

            {/* Prescription Collection Tracking & Reminder Suppression (CR-08) */}
            <Route path="/admin/operations/prescriptions" element={<PrescriptionPickupDashboardPage />} />
            <Route path="/admin/prescriptions/pickup" element={<Navigate to="/admin/operations/prescriptions" replace />} />
            <Route path="/admin/prescription-pickup" element={<Navigate to="/admin/operations/prescriptions" replace />} />

            {/* Office Chat Exchange Oversight & Governance (CR-07) */}
            <Route path="/admin/communication/chat-oversight" element={<ChatOversightPage />} />
            <Route path="/admin/chat-oversight" element={<Navigate to="/admin/communication/chat-oversight" replace />} />
            <Route path="/admin/chat" element={<Navigate to="/admin/communication/chat-oversight" replace />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </BrandingProvider>
  </AuthProvider>
  );
};

export default App;
