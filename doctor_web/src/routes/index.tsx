import React from 'react';
import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
  useLocation,
} from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';
import { PatientLayout } from '@/components/layout/PatientLayout';
import { VeterinaryLayout } from '@/components/layout/VeterinaryLayout';
import { RoleRouteGuard } from '@/components/shared/RoleRouteGuard';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { DashboardPage } from '@/pages/DashboardPage';
import { VeterinaryDashboardPage } from '@/pages/veterinary/VeterinaryDashboardPage';
import { PatientDirectoryPage } from '@/pages/patients/PatientDirectoryPage';
import { PatientProfilePage } from '@/pages/patients/PatientProfilePage';
import { PatientRegistrationPage } from '@/pages/patients/PatientRegistrationPage';
import { MedicalRecordsPage } from '@/pages/records/MedicalRecordsPage';
import { RecordDetailPage } from '@/pages/records/RecordDetailPage';
import { PrescriptionsPage } from '@/pages/records/PrescriptionsPage';
import { LabReportPage } from '@/pages/records/LabReportPage';
import { RadiologyViewerPage } from '@/pages/records/RadiologyViewerPage';
import { InsuranceFinancingHubPage } from '@/pages/financing/InsuranceFinancingHubPage';
import { VeterinaryPetPage } from '@/pages/pets/VeterinaryPetPage';
import { TreatmentOffersDashboardPage } from '@/pages/treatment-offers/TreatmentOffersDashboardPage';
import { TreatmentOfferPrescriptionPage } from '@/pages/treatment-offers/TreatmentOfferPrescriptionPage';
import { TreatmentOfferCreatePage } from '@/pages/treatment-offers/TreatmentOfferCreatePage';
import { TreatmentOfferReviewPage } from '@/pages/treatment-offers/TreatmentOfferReviewPage';
import { TreatmentOfferStatusPage } from '@/pages/treatment-offers/TreatmentOfferStatusPage';
import { TreatmentOfferAcceptedPage } from '@/pages/treatment-offers/TreatmentOfferAcceptedPage';
import { ClinicalHandoffPage } from '@/pages/treatment-offers/ClinicalHandoffPage';
import { ProcedureSchedulingPage } from '@/pages/treatment-offers/ProcedureSchedulingPage';
import { AppointmentDetailsPage } from '@/pages/treatment-offers/AppointmentDetailsPage';
import { PreOpReadinessPage } from '@/pages/treatment-offers/PreOpReadinessPage';
import { DayOfCheckinPage } from '@/pages/treatment-offers/DayOfCheckinPage';
import { CathLabSafetyCheckinPage } from '@/pages/cath-lab/CathLabSafetyCheckinPage';
import { StartClinicalEncounterPage } from '@/pages/cath-lab/StartClinicalEncounterPage';
import { ActiveProcedureDocumentationPage } from '@/pages/cath-lab/ActiveProcedureDocumentationPage';
import { PostProcedureSummaryPage } from '@/pages/cath-lab/PostProcedureSummaryPage';
import { EncounterCompletedPage } from '@/pages/cath-lab/EncounterCompletedPage';
import { MedicalRecordUploadPage } from '@/pages/ocr/MedicalRecordUploadPage';
import { ReferralDashboardPage } from '@/pages/referrals/ReferralDashboardPage';
import { CreateReferralPage } from '@/pages/referrals/CreateReferralPage';
import { ReferralDetailsPage } from '@/pages/referrals/ReferralDetailsPage';
import { IncomingReferralReviewPage } from '@/pages/referrals/IncomingReferralReviewPage';
import { ReferralSuccessPage } from '@/pages/referrals/ReferralSuccessPage';
import { ReportsDashboardPage } from '@/pages/reports/ReportsDashboardPage';
import { CriticalReportReviewPage } from '@/pages/reports/CriticalReportReviewPage';
import { NotificationCenterPage } from '@/pages/notifications/NotificationCenterPage';
import { ProfessionalProfilePage } from '@/pages/settings/ProfessionalProfilePage';
import { AccountSecurityPage } from '@/pages/settings/AccountSecurityPage';
import { NotificationPreferencesPage } from '@/pages/settings/NotificationPreferencesPage';
import { SupportCenterPage } from '@/pages/settings/SupportCenterPage';
import { ScheduleManagementPage } from '@/pages/settings/ScheduleManagementPage';
import { EhrIntegrationPage } from '@/pages/settings/EhrIntegrationPage';
import { FacilityManagementPage } from '@/pages/facilities/FacilityManagementPage';
import { OfficeChatConsolePage } from '@/pages/communication/OfficeChatConsolePage';
import { ClinicalOutcomesPage } from '@/pages/reports/ClinicalOutcomesPage';
import { AuditExportCenterPage } from '@/pages/reports/AuditExportCenterPage';
import { PatientMedicalHistoryPage } from '@/pages/patients/PatientMedicalHistoryPage';
import { PatientVitalsDiagnosticsPage } from '@/pages/patients/PatientVitalsDiagnosticsPage';
import { CreateClinicalNotePage } from '@/pages/records/CreateClinicalNotePage';
import { PathologyReportsPage } from '@/pages/records/PathologyReportsPage';
import { PlaceholderPage } from '@/pages/PlaceholderPage';
import { AuthPlaceholder } from '@/pages/auth/AuthPlaceholder';
import { FoundationPage } from '@/pages/FoundationPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

const RootRedirect: React.FC = () => {
  const { user, isAuthenticated, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-[#5b14b8]" />
          <span className="text-sm font-medium text-[#494552]">Verifying clinical session...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  if (user.workspaceType === 'VETERINARIAN') {
    return <Navigate to="/veterinary/dashboard" replace />;
  }

  return <Navigate to="/dashboard" replace />;
};

const PublicAuthRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, isInitializing } = useAuth();

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-[#5b14b8]" />
          <span className="text-sm font-medium text-[#494552]">Verifying clinical session...</span>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    if (user.workspaceType === 'VETERINARIAN') {
      return <Navigate to="/veterinary/dashboard" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const SharedWorkspaceLayout: React.FC = () => {
  const { user } = useAuth();
  if (user.workspaceType === 'VETERINARIAN') {
    return <VeterinaryLayout />;
  }
  return <PatientLayout />;
};

const router = createBrowserRouter([
  // Root Redirect to Role-Scoped Portal Dashboard
  {
    path: '/',
    element: <RootRedirect />,
  },

  // Milestone 1 Foundation Verification View
  {
    path: '/foundation',
    element: <FoundationPage />,
  },

  // Authentication Route Group (AuthLayout)
  {
    path: '/auth',
    element: (
      <PublicAuthRoute>
        <AuthLayout />
      </PublicAuthRoute>
    ),
    children: [
      {
        path: 'login',
        element: (
          <AuthPlaceholder
            title="Welcome Back"
            subtitle="Sign in to access your clinical workspace securely."
            buttonText="Request OTP"
            nextRoute="/auth/verify-otp"
            nodeId="1:2"
          />
        ),
      },
      {
        path: 'verify-otp',
        element: (
          <AuthPlaceholder
            title="Two-Factor Authentication"
            subtitle="Enter the 6-digit clinical security code sent to your registered device."
            buttonText="Verify & Login"
            nextRoute="/dashboard"
            nodeId="1:79"
          />
        ),
      },
      {
        path: 'register',
        element: (
          <AuthPlaceholder
            title="Provider Registration"
            subtitle="Submit credentials for medical board verification."
            buttonText="Continue Registration"
            nextRoute="/dashboard"
            nodeId="1:1048"
          />
        ),
      },
      {
        path: 'forgot-password',
        element: (
          <AuthPlaceholder
            title="Account Recovery"
            subtitle="Verify your identity to reset clinical access."
            buttonText="Send Reset Link"
            nextRoute="/auth/reset-password"
            nodeId="1:1120"
          />
        ),
      },
      {
        path: 'reset-password',
        element: (
          <AuthPlaceholder
            title="Reset Password"
            subtitle="Create a new HIPAA-compliant password."
            buttonText="Update Password"
            nextRoute="/auth/login"
            nodeId="1:1180"
          />
        ),
      },
    ],
  },

  // Veterinary Medicine Clinical Workspace (Option A - Strictly Isolated)
  {
    path: '/veterinary',
    element: (
      <RoleRouteGuard requiredWorkspace="VETERINARIAN">
        <VeterinaryLayout />
      </RoleRouteGuard>
    ),
    children: [
      {
        path: '',
        element: <Navigate to="/veterinary/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <VeterinaryDashboardPage />,
      },
      {
        path: 'pets',
        element: <VeterinaryPetPage />,
      },
    ],
  },

  // Direct URL /pets -> guarded by VETERINARIAN workspace
  {
    path: '/pets',
    element: (
      <RoleRouteGuard requiredWorkspace="VETERINARIAN">
        <VeterinaryLayout />
      </RoleRouteGuard>
    ),
    children: [
      {
        path: '',
        element: <Navigate to="/veterinary/pets" replace />,
      },
      {
        path: '*',
        element: <Navigate to="/veterinary/pets" replace />,
      },
    ],
  },

  // Human Healthcare Clinical Workspace (Option A - Strictly Isolated)
  {
    element: (
      <RoleRouteGuard requiredWorkspace="HUMAN">
        <PatientLayout />
      </RoleRouteGuard>
    ),
    children: [
      // 1. Dashboard
      {
        path: '/dashboard',
        element: <DashboardPage />,
      },

      // 2. Patient Management
      {
        path: '/patients',
        element: <PatientDirectoryPage />,
      },
      {
        path: '/patients/new',
        element: <PatientRegistrationPage />,
      },
      {
        path: '/patients/:id',
        element: <PatientProfilePage />,
      },
      {
        path: '/patients/:id/financing',
        element: <InsuranceFinancingHubPage />,
      },
      {
        path: '/patients/:id/history',
        element: <PatientMedicalHistoryPage />,
      },
      {
        path: '/patients/:id/vitals',
        element: <PatientVitalsDiagnosticsPage />,
      },

      // 3. Medical Records
      {
        path: '/records',
        element: <MedicalRecordsPage />,
      },
      {
        path: '/records/new',
        element: <CreateClinicalNotePage />,
      },
      {
        path: '/records/notes/new',
        element: <CreateClinicalNotePage />,
      },
      {
        path: '/records/clinical',
        element: <RecordDetailPage />,
      },
      {
        path: '/records/clinical/:id',
        element: <RecordDetailPage />,
      },
      {
        path: '/records/labs',
        element: <LabReportPage />,
      },
      {
        path: '/records/labs/:id',
        element: <LabReportPage />,
      },
      {
        path: '/records/imaging',
        element: <RadiologyViewerPage />,
      },
      {
        path: '/records/imaging/:id',
        element: <RadiologyViewerPage />,
      },
      {
        path: '/records/:id',
        element: <RecordDetailPage />,
      },
      {
        path: '/records/pathology',
        element: <PathologyReportsPage />,
      },
      {
        path: '/records/prescriptions',
        element: <PrescriptionsPage />,
      },
      {
        path: '/records/prescriptions/new',
        element: <TreatmentOfferPrescriptionPage />,
      },

      // 4. OCR & Document Processing
      {
        path: '/records/upload',
        element: <MedicalRecordUploadPage />,
      },
      {
        path: '/records/ocr',
        element: <MedicalRecordUploadPage />,
      },
      {
        path: '/records/ocr/upload',
        element: <MedicalRecordUploadPage />,
      },
      {
        path: '/records/ocr/processing',
        element: <MedicalRecordUploadPage />,
      },
      {
        path: '/records/ocr/review',
        element: <MedicalRecordUploadPage />,
      },
      {
        path: '/records/ocr/success',
        element: <MedicalRecordUploadPage />,
      },
      {
        path: '/ocr/upload',
        element: <MedicalRecordUploadPage />,
      },
      {
        path: '/ocr/verify/:id',
        element: <MedicalRecordUploadPage />,
      },

      // 5. Referrals & Consultations (Group C / Milestone 12)
      {
        path: '/referrals',
        element: <ReferralDashboardPage />,
      },
      {
        path: '/referrals/new',
        element: <CreateReferralPage />,
      },
      {
        path: '/referrals/success',
        element: <ReferralSuccessPage />,
      },
      {
        path: '/referrals/consult',
        element: <CreateReferralPage />,
      },
      {
        path: '/referrals/incoming/:id',
        element: <IncomingReferralReviewPage />,
      },
      {
        path: '/referrals/:id',
        element: <ReferralDetailsPage />,
      },

      // 6. Clinical Reports & Analytics (Group D / Milestone 13)
      {
        path: '/reports',
        element: <ReportsDashboardPage />,
      },
      {
        path: '/reports/critical',
        element: <CriticalReportReviewPage />,
      },
      {
        path: '/reports/critical/:id',
        element: <CriticalReportReviewPage />,
      },
      {
        path: '/reports/outcomes',
        element: <ClinicalOutcomesPage />,
      },
      {
        path: '/reports/exports',
        element: <AuditExportCenterPage />,
      },

      // 7. CareID Treatment Offer & Procedure Lifecycle (All 18 authorized steps)
      {
        path: '/treatment-offers',
        element: <TreatmentOffersDashboardPage />,
      },
      {
        path: '/treatment-offers/new',
        element: <TreatmentOfferCreatePage />,
      },
      {
        path: '/treatment-offers/new/step-1',
        element: <TreatmentOfferCreatePage />,
      },
      {
        path: '/treatment-offers/new/step-2',
        element: <TreatmentOfferCreatePage />,
      },
      {
        path: '/treatment-offers/new/step-3',
        element: <TreatmentOfferCreatePage />,
      },
      {
        path: '/treatment-offers/new/step-4',
        element: <TreatmentOfferCreatePage />,
      },
      {
        path: '/treatment-offers/new/step-5',
        element: <TreatmentOfferCreatePage />,
      },
      {
        path: '/treatment-offers/:id/review',
        element: <TreatmentOfferReviewPage />,
      },
      {
        path: '/treatment-offers/:id/sent',
        element: <TreatmentOfferStatusPage />,
      },
      {
        path: '/treatment-offers/:id/status',
        element: <TreatmentOfferStatusPage />,
      },
      {
        path: '/treatment-offers/:id/accepted',
        element: <TreatmentOfferAcceptedPage />,
      },
      {
        path: '/treatment-offers/:id/clearance',
        element: <ClinicalHandoffPage />,
      },
      {
        path: '/treatment-offers/:id/schedule',
        element: <ProcedureSchedulingPage initialMode="select" />,
      },
      {
        path: '/treatment-offers/:id/schedule/review',
        element: <ProcedureSchedulingPage initialMode="review" />,
      },
      {
        path: '/treatment-offers/:id/scheduled',
        element: <ProcedureSchedulingPage initialMode="confirmed" />,
      },
      {
        path: '/treatment-offers/:id/appointment',
        element: <AppointmentDetailsPage />,
      },
      {
        path: '/treatment-offers/:id/pre-op',
        element: <PreOpReadinessPage />,
      },
      {
        path: '/treatment-offers/:id/check-in',
        element: <DayOfCheckinPage />,
      },
      {
        path: '/treatment-offers/:id/day-of-checkin',
        element: <DayOfCheckinPage />,
      },
      {
        path: '/treatment-offers/:id/cath-lab-safety',
        element: <CathLabSafetyCheckinPage />,
      },
      {
        path: '/cath-lab-safety',
        element: <CathLabSafetyCheckinPage />,
      },
      {
        path: '/treatment-offers/:id/encounter',
        element: <StartClinicalEncounterPage />,
      },
      {
        path: '/treatment-offers/:id/encounter/start',
        element: <StartClinicalEncounterPage />,
      },
      {
        path: '/cath-lab/encounter/:id/start',
        element: <StartClinicalEncounterPage />,
      },
      {
        path: '/treatment-offers/:id/in-progress',
        element: <ActiveProcedureDocumentationPage />,
      },
      {
        path: '/treatment-offers/:id/encounter/active',
        element: <ActiveProcedureDocumentationPage />,
      },
      {
        path: '/cath-lab/encounter/:id/active',
        element: <ActiveProcedureDocumentationPage />,
      },
      {
        path: '/treatment-offers/:id/notes',
        element: (
          <PlaceholderPage
            title="Intra-Op Clinical Notes"
            description="Anesthesia records, implant lot numbers, and procedure notes."
            module="CareID Treatment Lifecycle"
            nodeId="1:15610"
            targetMilestone="Milestone 7"
          />
        ),
      },
      {
        path: '/treatment-offers/:id/post-op',
        element: <PostProcedureSummaryPage />,
      },
      {
        path: '/treatment-offers/:id/encounter/post-op',
        element: <PostProcedureSummaryPage />,
      },
      {
        path: '/treatment-offers/:id/prescription',
        element: <TreatmentOfferPrescriptionPage />,
      },
      {
        path: '/treatment-offers/:id/follow-up',
        element: (
          <PlaceholderPage
            title="Follow-Up Appointment Booking"
            description="Post-operative checkup scheduling."
            module="CareID Treatment Lifecycle"
            nodeId="1:15850"
            targetMilestone="Milestone 7"
          />
        ),
      },
      {
        path: '/treatment-offers/:id/summary',
        element: <EncounterCompletedPage />,
      },
      {
        path: '/treatment-offers/:id/completed',
        element: <EncounterCompletedPage />,
      },
    ],
  },

  // Shared Account & Utility Routes (Accessible to both HUMAN and VETERINARIAN workspaces)
  {
    element: (
      <RoleRouteGuard requiredWorkspace="ANY">
        <SharedWorkspaceLayout />
      </RoleRouteGuard>
    ),
    children: [
      {
        path: '/notifications',
        element: <NotificationCenterPage />,
      },
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
        element: <Navigate to="/support" replace />,
      },
      {
        path: '/support',
        element: <SupportCenterPage />,
      },
      {
        path: '/settings/schedule',
        element: <ScheduleManagementPage />,
      },
      {
        path: '/facilities',
        element: <FacilityManagementPage />,
      },
      {
        path: '/communication/chat',
        element: <OfficeChatConsolePage />,
      },
      {
        path: '/chat',
        element: <OfficeChatConsolePage />,
      },
      {
        path: '/templates',
        element: <OfficeChatConsolePage />,
      },
      {
        path: '/communication/templates',
        element: <OfficeChatConsolePage />,
      },
      {
        path: '/settings/ehr',
        element: <EhrIntegrationPage />,
      },
    ],
  },

  // Fallback Wildcard
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);

export const AppRouter: React.FC = () => {
  return <RouterProvider router={router} />;
};
