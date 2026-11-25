class ApiConstants {
  static const String baseUrl = 'https://360api.vnvision.in/api/v1';

  // 01. Environment & Health
  static const String health = '/health';
  static const String ready = '/ready';
  static const String live = '/live';

  // 02. Authentication & OTP
  static const String otpRequest = '/auth/otp/request';
  static const String otpVerify = '/auth/otp/verify';
  static const String otpResend = '/auth/otp/resend';
  static const String tokenRefresh = '/auth/token/refresh';
  static const String logout = '/auth/logout';
  static const String logoutAll = '/auth/logout-all';

  // 03. User Profile & Account
  static const String authMe = '/auth/me';
  static const String authSessions = '/auth/sessions';
  static const String authRoles = '/auth/roles';
  static const String authPermissions = '/auth/permissions';

  // 05. Doctor Portal
  static const String doctors = '/doctors';
  static const String doctorsMe = '/doctors/me';
  static const String doctorsSearch = '/doctors/search';
  static const String doctorsStatistics = '/doctors/statistics';

  static String doctorById(String id) => '/doctors/$id';
  static String doctorSlots(String id) => '/doctors/$id/slots';
  static String doctorDocuments(String id) => '/doctors/$id/documents';
  static String doctorHistory(String id) => '/doctors/$id/history';

  // Doctor - Patient Clinical Records & Encounters
  static String doctorPatientMedicalRecords(String patientProfileId) =>
      '/doctors/patients/$patientProfileId/medical-records';
  static String doctorPatientTimeline(String patientProfileId) =>
      '/doctors/patients/$patientProfileId/medical-records/timeline';
  static String doctorPatientEncounters(String patientProfileId) =>
      '/doctors/patients/$patientProfileId/encounters';
  static String doctorPatientRecordById(String patientProfileId, String recordId) =>
      '/doctors/patients/$patientProfileId/medical-records/$recordId';

  // 07. Health Cards
  static const String healthCards = '/health-cards';
  static const String healthCardsSearch = '/health-cards/search';
  static const String healthCardsVerifyQr = '/health-cards/verify-qr';
  static String healthCardById(String id) => '/health-cards/$id';

  // 08. Medical Records (General)
  static const String medicalRecords = '/medical-records';
  static const String medicalRecordsTimeline = '/medical-records/timeline';
  static const String medicalRecordsSearch = '/medical-records/search';
  static String medicalRecordById(String id) => '/medical-records/$id';
  static String medicalRecordArchive(String id) => '/medical-records/$id/archive';
  static String medicalRecordRestore(String id) => '/medical-records/$id/restore';
  static String medicalRecordAttachments(String id) => '/medical-records/$id/attachments';
  static String medicalRecordAddenda(String id) => '/medical-records/$id/addenda';

  // 09. Facilities & Branches
  static const String facilities = '/facilities';
  static const String facilitiesSearch = '/facilities/search';
  static const String facilitiesStatistics = '/facilities/statistics';
  static String facilityById(String id) => '/facilities/$id';
  static String facilityDepartments(String id) => '/facilities/$id/departments';

  // 10. Appointments & Schedules
  static const String appointments = '/appointments';
  static const String doctorMyAppointments = '/appointments/doctor/my-appointments';
  static const String doctorAppointmentsMe = '/appointments/doctor/me';
  static const String schedules = '/schedules';
  static const String schedulesStatistics = '/schedules/statistics';
  static String appointmentById(String id) => '/appointments/$id';
  static String rescheduleAppointment(String id) => '/appointments/$id/reschedule';
  static String cancelAppointment(String id) => '/appointments/$id/cancel';
  static String appointmentStatus(String id) => '/appointments/$id/status';

  // 11. Referrals & Care Coordination
  static const String referrals = '/referrals';
  static const String myIncomingReferrals = '/referrals/my-incoming';
  static const String myOutgoingReferrals = '/referrals/my-outgoing';
  static const String referralsDashboardStats = '/referrals/dashboard/stats';
  static String referralById(String id) => '/referrals/$id';
  static String referralTriage(String id) => '/referrals/$id/triage';
  static String referralStatus(String id) => '/referrals/$id/status';
  static String referralNotes(String id) => '/referrals/$id/notes';
  static String referralAttachments(String id) => '/referrals/$id/attachments';
  static String referralHistory(String id) => '/referrals/$id/history';

  // 14. Notifications & Alerts
  static const String notifications = '/notifications';
  static const String notificationPreferences = '/notifications/preferences';
  static const String notificationDashboardStats = '/notifications/dashboard/stats';

  // 15. OCR & Document Verification
  static const String ocrDashboard = '/ocr/dashboard';
  static const String ocrStatistics = '/ocr/statistics';
  static const String ocrJobs = '/ocr/jobs';
  static String ocrJobById(String id) => '/ocr/jobs/$id';
  static String ocrJobFields(String id) => '/ocr/jobs/$id/fields';
  static String ocrJobText(String id) => '/ocr/jobs/$id/text';
  static String ocrJobJson(String id) => '/ocr/jobs/$id/json';
  static String ocrJobReview(String jobId) => '/ocr/review/$jobId';

  // 16. Attachments
  static const String attachments = '/attachments';
  static String attachmentById(String id) => '/attachments/$id';
  static String attachmentDownloadUrl(String id) => '/attachments/$id/download-url';
  static String attachmentRestore(String id) => '/attachments/$id/restore';
  static String attachmentVersions(String id) => '/attachments/$id/versions';

  // 17. Phase 3 Specialized Clinical Modules (Spec / Integration Contracts)
  static const String dentalRecords = '/dental-records';
  static String dentalRecordById(String id) => '/dental-records/$id';
  static String patientDentalRecords(String patientId) => '/patients/$patientId/dental-records';

  static const String visionRecords = '/vision-records';
  static String visionRecordById(String id) => '/vision-records/$id';
  static String patientVisionRecords(String patientId) => '/patients/$patientId/vision-records';

  static const String laboratoryReports = '/laboratory-reports';
  static String laboratoryReportById(String id) => '/laboratory-reports/$id';
  static String patientLaboratoryReports(String patientId) => '/patients/$patientId/laboratory-reports';

  static const String prescriptions = '/prescriptions';
  static const String prescriptionCheckInteractions = '/prescriptions/check-interactions';
  static String prescriptionById(String id) => '/prescriptions/$id';

  static const String messagingConversations = '/messages/conversations';
  static String messagingConversationMessages(String conversationId) => '/messages/conversations/$conversationId/messages';
  static const String messagingSendMessage = '/messages/send';

  static const String recordShares = '/medical-records/shares';
  static String recordShareRevoke(String shareId) => '/medical-records/shares/$shareId/revoke';

  // 22. Enterprise QR Subsystem
  static const String qr = '/qr';
  static const String qrVerify = '/qr/verify';
  static const String qrSearch = '/qr/search';
  static const String qrStatistics = '/qr/statistics';

  // 25. Support Tickets
  static const String supportTickets = '/support/tickets';
  static String supportTicketById(String id) => '/support/tickets/$id';

  // 26. Pet Health Records
  static const String pets = '/pets';
  static String petById(String id) => '/pets/$id';

  // 28. Treatment Offers (Doctor Subsystem)
  static const String doctorTreatmentOffers = '/doctors/treatment-offers';
  static String doctorTreatmentOfferById(String id) => '/doctors/treatment-offers/$id';
  static String doctorTreatmentOfferDispatch(String id) => '/doctors/treatment-offers/$id/dispatch';
  static String doctorTreatmentOfferStatus(String id) => '/doctors/treatment-offers/$id/status';
  static String doctorTreatmentOfferCancel(String id) => '/doctors/treatment-offers/$id/cancel';

  // Doctor Patients
  static const String doctorPatients = '/doctors/patients';
  static String doctorPatientById(String id) => '/doctors/patients/$id';
  static String doctorPatientVitals(String id) => '/doctors/patients/$id/vitals';
  static String doctorPatientPrescriptions(String id) => '/doctors/patients/$id/prescriptions';

  // 28. CPT & Procedure Catalogue
  static const String cpt = '/cpt';
  static const String cptSearch = '/cpt/search';
  static String cptByCode(String code) => '/cpt/$code';

  // 29. Cath Lab & Interventional Cardiology
  static String appointmentReadiness(String id) => '/appointments/$id/readiness';
  static String appointmentCathLabChecklist(String id) => '/appointments/$id/cath-lab-checklist';
  static String cathLabTimeOut(String id) => '/appointments/$id/time-out';
  static String cathLabSafetyHold(String id) => '/appointments/$id/safety-hold';
}

