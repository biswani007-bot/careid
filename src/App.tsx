import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
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

const ReferralDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <AdminReferralDashboard
      onNavigate={(path) => navigate(path)}
      onLogout={() => navigate('/')}
    />
  );
};

const ReferralMonitoringPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <AdminReferralMonitoring
      onNavigate={(path) => navigate(path)}
      onLogout={() => navigate('/')}
    />
  );
};

const ReferralDetailsPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <AdminReferralDetails
      onNavigate={(path) => navigate(path)}
      onLogout={() => navigate('/')}
    />
  );
};

const ReferralAuditPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <AdminReferralAudit
      onNavigate={(path) => navigate(path)}
      onLogout={() => navigate('/')}
    />
  );
};

const OcrRejectedPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <AdminOcrRejected
      onNavigate={(path) => navigate(path)}
      onLogout={() => navigate('/')}
    />
  );
};

const OcrVerificationWorkspacePage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <AdminOcrVerificationWorkspace
      onNavigate={(path) => navigate(path)}
      onLogout={() => navigate('/')}
    />
  );
};

const OcrQueuePage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <AdminOcrQueue
      onNavigate={(path) => navigate(path)}
      onLogout={() => navigate('/')}
    />
  );
};

const OcrAnalyticsPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <AdminOcrAnalytics
      onNavigate={(path) => navigate(path)}
      onLogout={() => navigate('/')}
    />
  );
};

const HealthRecordsPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <AdminAllHealthRecords
      onNavigate={(path) => navigate(path)}
      onLogout={() => navigate('/')}
    />
  );
};

const MedicalRecordsPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <AdminMedicalRecords
      onNavigate={(path) => navigate(path)}
      onLogout={() => navigate('/')}
    />
  );
};

const DentalRecordsPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <AdminDentalRecords
      onNavigate={(path) => navigate(path)}
      onLogout={() => navigate('/')}
    />
  );
};

const VisionRecordsPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <AdminVisionRecords
      onNavigate={(path) => navigate(path)}
      onLogout={() => navigate('/')}
    />
  );
};

const RecordDetailsPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <AdminRecordDetails
      onNavigate={(path) => navigate(path)}
      onLogout={() => navigate('/')}
    />
  );
};

const UploadRecordPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <AdminUploadRecord
      onNavigate={(path) => navigate(path)}
      onLogout={() => navigate('/')}
    />
  );
};

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  return <AdminLogin onLoginSuccess={() => navigate('/admin/dashboard')} />;
};

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <AdminDashboard
      onNavigate={(path) => navigate(path)}
      onLogout={() => navigate('/')}
    />
  );
};

const UserDirectoryPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <AdminUserDirectory
      onNavigate={(path) => navigate(path)}
      onLogout={() => navigate('/')}
    />
  );
};

const PatientDirectoryPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <AdminPatientDirectory
      onNavigate={(path) => navigate(path)}
      onLogout={() => navigate('/')}
    />
  );
};

const PatientProfilePage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <AdminPatientProfile
      onNavigate={(path) => navigate(path)}
      onLogout={() => navigate('/')}
    />
  );
};

const PatientRegistrationPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <AdminPatientRegistration
      onNavigate={(path) => navigate(path)}
      onLogout={() => navigate('/')}
    />
  );
};

const PatientActionDialogsPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <AdminPatientActionDialogs
      onNavigate={(path) => navigate(path)}
      onLogout={() => navigate('/')}
    />
  );
};

const CreateUserPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <AdminCreateUser
      onNavigate={(path) => navigate(path)}
      onLogout={() => navigate('/')}
    />
  );
};

const UserActionDialogsPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <AdminUserActionDialogs
      onNavigate={(path) => navigate(path)}
      onLogout={() => navigate('/')}
    />
  );
};

const UserDetailsPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <AdminUserDetails
      onNavigate={(path) => navigate(path)}
      onLogout={() => navigate('/')}
    />
  );
};

const DoctorDirectoryPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <AdminDoctorDirectory
      onNavigate={(path) => navigate(path)}
      onLogout={() => navigate('/')}
    />
  );
};

const CreateDoctorPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <AdminAddDoctor
      onNavigate={(path) => navigate(path)}
      onLogout={() => navigate('/')}
    />
  );
};

const DoctorProfilePage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <AdminDoctorProfile
      onNavigate={(path) => navigate(path)}
      onLogout={() => navigate('/')}
    />
  );
};

const DoctorActionDialogsPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <AdminDoctorActionDialogs
      onNavigate={(path) => navigate(path)}
      onLogout={() => navigate('/')}
    />
  );
};

const FacilityDirectoryPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <AdminFacilityDirectory
      onNavigate={(path) => navigate(path)}
      onLogout={() => navigate('/')}
    />
  );
};

const CreateFacilityPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <AdminAddFacility
      onNavigate={(path) => navigate(path)}
      onLogout={() => navigate('/')}
    />
  );
};

const FacilityDetailsPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <AdminFacilityDetails
      onNavigate={(path) => navigate(path)}
      onLogout={() => navigate('/')}
    />
  );
};

const EditFacilityPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <AdminEditFacility
      onNavigate={(path) => navigate(path)}
      onLogout={() => navigate('/')}
    />
  );
};

const StaffMappingPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <AdminStaffMapping
      onNavigate={(path) => navigate(path)}
      onLogout={() => navigate('/')}
    />
  );
};

const MapDoctorPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <AdminMapDoctor
      onNavigate={(path) => navigate(path)}
      onLogout={() => navigate('/')}
    />
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/admin/login" element={<Navigate to="/" replace />} />
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
        <Route path="/admin/patients/profile" element={<Navigate to="/admin/patients/pat-1" replace />} />
        <Route path="/admin/patients/:patientId" element={<PatientProfilePage />} />
        <Route path="/patients" element={<Navigate to="/admin/patients" replace />} />
        <Route path="/admin/doctors" element={<DoctorDirectoryPage />} />
        <Route path="/admin/doctors/directory" element={<Navigate to="/admin/doctors" replace />} />
        <Route path="/admin/doctors/create" element={<CreateDoctorPage />} />
        <Route path="/admin/doctors/add" element={<Navigate to="/admin/doctors/create" replace />} />
        <Route path="/admin/doctors/new" element={<Navigate to="/admin/doctors/create" replace />} />
        <Route path="/admin/doctors/actions" element={<DoctorActionDialogsPage />} />
        <Route path="/admin/doctors/dialogs" element={<Navigate to="/admin/doctors/actions" replace />} />
        <Route path="/admin/doctors/states" element={<Navigate to="/admin/doctors/actions" replace />} />
        <Route path="/admin/doctors/profile" element={<Navigate to="/admin/doctors/doc-2" replace />} />
        <Route path="/admin/doctors/:doctorId" element={<DoctorProfilePage />} />
        <Route path="/admin/doctors/:doctorId/map-facility" element={<MapDoctorPage />} />
        <Route path="/doctors" element={<Navigate to="/admin/doctors" replace />} />
        <Route path="/admin/facilities" element={<FacilityDirectoryPage />} />
        <Route path="/admin/facilities/directory" element={<Navigate to="/admin/facilities" replace />} />
        <Route path="/admin/facilities/create" element={<CreateFacilityPage />} />
        <Route path="/admin/facilities/add" element={<Navigate to="/admin/facilities/create" replace />} />
        <Route path="/admin/facilities/new" element={<Navigate to="/admin/facilities/create" replace />} />
        <Route path="/admin/facilities/details" element={<Navigate to="/admin/facilities/fac-1" replace />} />
        <Route path="/admin/facilities/:facilityId/staff-mapping" element={<StaffMappingPage />} />
        <Route path="/admin/facilities/:facilityId/staff" element={<StaffMappingPage />} />
        <Route path="/admin/facilities/staff-mapping" element={<Navigate to="/admin/facilities/fac-1/staff-mapping" replace />} />
        <Route path="/admin/staff-mapping" element={<Navigate to="/admin/facilities/fac-1/staff-mapping" replace />} />
        <Route path="/admin/facilities/:facilityId/map-doctor" element={<MapDoctorPage />} />
        <Route path="/admin/facilities/:facilityId/map" element={<MapDoctorPage />} />
        <Route path="/admin/facilities/map-doctor" element={<Navigate to="/admin/facilities/fac-1/map-doctor" replace />} />
        <Route path="/admin/map-doctor" element={<Navigate to="/admin/facilities/fac-1/map-doctor" replace />} />
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
        <Route path="/admin/referrals/details" element={<Navigate to="/admin/referrals/ref-9021" replace />} />
        <Route path="/admin/referrals/details/:referralId" element={<ReferralDetailsPage />} />
        <Route path="/admin/referrals/:referralId" element={<ReferralDetailsPage />} />
        <Route path="/admin/referral-details/:referralId" element={<ReferralDetailsPage />} />
        <Route path="/admin/referral-details" element={<Navigate to="/admin/referrals/ref-9021" replace />} />
        <Route path="/referrals" element={<Navigate to="/admin/referrals" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
