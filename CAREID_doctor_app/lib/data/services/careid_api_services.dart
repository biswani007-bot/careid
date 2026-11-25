import '../../core/constants/api_constants.dart';
import '../../core/network/api_client.dart';
import '../../core/services/session_service.dart';
import '../models/api_models.dart';

// ==========================================
// 1. AUTH SERVICE
// ==========================================

class AuthService {
  final ApiClient _client = ApiClient();
  final SessionService _session = SessionService();

  Future<OtpRequestResult> requestOtp(String phone) async {
    final response = await _client.post<OtpRequestResult>(
      ApiConstants.otpRequest,
      body: {'phone': phone, 'role': 'DOCTOR'},
      requiresAuth: false,
      fromJsonT: (json) => OtpRequestResult.fromJson(json as Map<String, dynamic>),
    );
    return response.data!;
  }

  Future<OtpVerifyResult> verifyOtp(String challengeId, String otpCode) async {
    final response = await _client.post<OtpVerifyResult>(
      ApiConstants.otpVerify,
      body: {
        'challengeId': challengeId,
        'otpCode': otpCode,
        'role': 'DOCTOR',
      },
      requiresAuth: false,
      fromJsonT: (json) => OtpVerifyResult.fromJson(json as Map<String, dynamic>),
    );
    final result = response.data!;
    await _session.saveAuthTokens(
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    );
    return result;
  }

  Future<OtpRequestResult> resendOtp(String challengeId) async {
    final response = await _client.post<OtpRequestResult>(
      ApiConstants.otpResend,
      body: {'challengeId': challengeId},
      requiresAuth: false,
      fromJsonT: (json) => OtpRequestResult.fromJson(json as Map<String, dynamic>),
    );
    return response.data!;
  }

  Future<UserMe> getMe() async {
    final response = await _client.get<UserMe>(
      ApiConstants.authMe,
      fromJsonT: (json) => UserMe.fromJson(json as Map<String, dynamic>),
    );
    final user = response.data!;
    await _session.saveUserProfile(
      userId: user.id,
      phone: user.phone,
      roles: user.roles,
      permissions: user.permissions,
    );
    return user;
  }

  Future<List<ActiveSession>> getActiveSessions() async {
    final response = await _client.get<List<ActiveSession>>(
      ApiConstants.authSessions,
      fromJsonT: (json) {
        if (json is List) {
          return json.map((e) => ActiveSession.fromJson(e as Map<String, dynamic>)).toList();
        }
        return [];
      },
    );
    return response.data ?? [];
  }

  Future<bool> revokeSession(String sessionId) async {
    final response = await _client.delete(
      '${ApiConstants.authSessions}/$sessionId',
    );
    return response.success;
  }

  Future<bool> revokeAllOtherSessions() async {
    final response = await _client.delete(
      ApiConstants.authSessions,
    );
    return response.success;
  }

  Future<void> logout() async {
    final refreshToken = await _session.getRefreshToken();
    if (refreshToken != null) {
      try {
        await _client.post(
          ApiConstants.logout,
          body: {'refreshToken': refreshToken},
        );
      } catch (_) {}
    }
    await _session.clearSession();
  }
}

// ==========================================
// 2. DOCTOR SERVICE
// ==========================================

class DoctorService {
  final ApiClient _client = ApiClient();
  final SessionService _session = SessionService();

  Future<DoctorProfile> getMyProfile() async {
    final response = await _client.get<DoctorProfile>(
      ApiConstants.doctorsMe,
      fromJsonT: (json) => DoctorProfile.fromJson(json as Map<String, dynamic>),
    );
    final profile = response.data!;
    await _session.saveDoctorProfile(
      doctorId: profile.id,
      fullName: profile.fullName,
      specialization: profile.primarySpecialization,
      licenseNumber: profile.registrationNumber,
    );
    return profile;
  }

  Future<DoctorProfile> getDoctorById(String id) async {
    final response = await _client.get<DoctorProfile>(
      ApiConstants.doctorById(id),
      fromJsonT: (json) => DoctorProfile.fromJson(json as Map<String, dynamic>),
    );
    return response.data!;
  }

  Future<List<DoctorProfile>> searchDoctors(String query) async {
    final response = await _client.get<List<DoctorProfile>>(
      ApiConstants.doctorsSearch,
      queryParameters: {'q': query},
      fromJsonT: (json) {
        if (json is List) {
          return json.map((e) => DoctorProfile.fromJson(e as Map<String, dynamic>)).toList();
        }
        return [];
      },
    );
    return response.data ?? [];
  }

  Future<DoctorStats> getStatistics() async {
    final response = await _client.get<DoctorStats>(
      ApiConstants.doctorsStatistics,
      fromJsonT: (json) => DoctorStats.fromJson(json as Map<String, dynamic>),
    );
    return response.data!;
  }

  Future<List<DoctorDocumentItem>> getDocuments(String doctorId) async {
    final response = await _client.get<List<DoctorDocumentItem>>(
      ApiConstants.doctorDocuments(doctorId),
      fromJsonT: (json) {
        if (json is List) {
          return json.map((e) => DoctorDocumentItem.fromJson(e as Map<String, dynamic>)).toList();
        }
        return [];
      },
    );
    return response.data ?? [];
  }

  Future<List<Map<String, dynamic>>> getMyPatients({
    int page = 1,
    int limit = 20,
    String? search,
  }) async {
    final params = <String, dynamic>{'page': page, 'limit': limit};
    if (search != null && search.isNotEmpty) params['search'] = search;
    final response = await _client.get<List<Map<String, dynamic>>>(
      ApiConstants.doctorPatients,
      queryParameters: params,
      fromJsonT: (json) {
        if (json is List) {
          return json.whereType<Map<String, dynamic>>().toList();
        }
        if (json is Map<String, dynamic> && json['data'] is List) {
          return (json['data'] as List).whereType<Map<String, dynamic>>().toList();
        }
        return [];
      },
    );
    return response.data ?? [];
  }

  Future<Map<String, dynamic>> getPatientById(String patientProfileId) async {
    final response = await _client.get<Map<String, dynamic>>(
      ApiConstants.doctorPatientById(patientProfileId),
      fromJsonT: (json) => json is Map<String, dynamic> ? json : {},
    );
    return response.data ?? {};
  }

  /// Get patient vitals
  /// GET /api/v1/doctors/patients/:id/vitals
  Future<List<Map<String, dynamic>>> getPatientVitals(String patientProfileId) async {
    final response = await _client.get<List<Map<String, dynamic>>>(
      ApiConstants.doctorPatientVitals(patientProfileId),
      fromJsonT: (json) {
        if (json is List) {
          return json.whereType<Map<String, dynamic>>().toList();
        }
        if (json is Map<String, dynamic> && json['data'] is List) {
          return (json['data'] as List).whereType<Map<String, dynamic>>().toList();
        }
        return [];
      },
    );
    return response.data ?? [];
  }

  /// Add new vitals entry for patient
  /// POST /api/v1/doctors/patients/:id/vitals
  Future<Map<String, dynamic>> addPatientVitals(String patientProfileId, Map<String, dynamic> vitalsData) async {
    final response = await _client.post<Map<String, dynamic>>(
      ApiConstants.doctorPatientVitals(patientProfileId),
      body: vitalsData,
      fromJsonT: (json) => json is Map<String, dynamic> ? json : {},
    );
    return response.data ?? {};
  }

  /// Get patient prescriptions
  /// GET /api/v1/doctors/patients/:id/prescriptions
  Future<List<Map<String, dynamic>>> getPatientPrescriptions(String patientProfileId) async {
    final response = await _client.get<List<Map<String, dynamic>>>(
      ApiConstants.doctorPatientPrescriptions(patientProfileId),
      fromJsonT: (json) {
        if (json is List) {
          return json.whereType<Map<String, dynamic>>().toList();
        }
        if (json is Map<String, dynamic> && json['data'] is List) {
          return (json['data'] as List).whereType<Map<String, dynamic>>().toList();
        }
        return [];
      },
    );
    return response.data ?? [];
  }

  /// Add patient prescription
  /// POST /api/v1/doctors/patients/:id/prescriptions
  Future<Map<String, dynamic>> addPatientPrescription(String patientProfileId, Map<String, dynamic> prescriptionData) async {
    final response = await _client.post<Map<String, dynamic>>(
      ApiConstants.doctorPatientPrescriptions(patientProfileId),
      body: prescriptionData,
      fromJsonT: (json) => json is Map<String, dynamic> ? json : {},
    );
    return response.data ?? {};
  }

  /// Get patient medical records
  /// GET /api/v1/doctors/patients/:id/medical-records
  Future<List<Map<String, dynamic>>> getPatientMedicalRecords(String patientProfileId, {int page = 1, int limit = 20}) async {
    final response = await _client.get<List<Map<String, dynamic>>>(
      ApiConstants.doctorPatientMedicalRecords(patientProfileId),
      queryParameters: {'page': page, 'limit': limit},
      fromJsonT: (json) {
        if (json is List) {
          return json.whereType<Map<String, dynamic>>().toList();
        }
        if (json is Map<String, dynamic> && json['data'] is List) {
          return (json['data'] as List).whereType<Map<String, dynamic>>().toList();
        }
        return [];
      },
    );
    return response.data ?? [];
  }

  /// Get patient medical records timeline
  /// GET /api/v1/doctors/patients/:id/medical-records/timeline
  Future<List<Map<String, dynamic>>> getPatientTimeline(String patientProfileId, {int page = 1, int limit = 20}) async {
    final response = await _client.get<List<Map<String, dynamic>>>(
      ApiConstants.doctorPatientTimeline(patientProfileId),
      queryParameters: {'page': page, 'limit': limit},
      fromJsonT: (json) {
        if (json is List) {
          return json.whereType<Map<String, dynamic>>().toList();
        }
        if (json is Map<String, dynamic> && json['data'] is List) {
          return (json['data'] as List).whereType<Map<String, dynamic>>().toList();
        }
        return [];
      },
    );
    return response.data ?? [];
  }

  /// Get patient hospital admissions
  /// GET /api/v1/doctors/patients/:id/admissions
  Future<List<Map<String, dynamic>>> getPatientAdmissions(String patientProfileId) async {
    final response = await _client.get<List<Map<String, dynamic>>>(
      '/doctors/patients/$patientProfileId/admissions',
      fromJsonT: (json) {
        if (json is List) {
          return json.whereType<Map<String, dynamic>>().toList();
        }
        if (json is Map<String, dynamic> && json['data'] is List) {
          return (json['data'] as List).whereType<Map<String, dynamic>>().toList();
        }
        return [];
      },
    );
    return response.data ?? [];
  }
}

// ==========================================
// 3. FACILITY SERVICE
// ==========================================

class FacilityService {
  final ApiClient _client = ApiClient();

  Future<List<FacilityItem>> getFacilities({int page = 1, int limit = 20}) async {
    final response = await _client.get<List<FacilityItem>>(
      ApiConstants.facilities,
      queryParameters: {'page': page, 'limit': limit},
      fromJsonT: (json) {
        if (json is List) {
          return json.map((e) => FacilityItem.fromJson(e as Map<String, dynamic>)).toList();
        }
        return [];
      },
    );
    return response.data ?? [];
  }

  Future<List<FacilityItem>> searchFacilities(String query) async {
    final response = await _client.get<List<FacilityItem>>(
      ApiConstants.facilitiesSearch,
      queryParameters: {'q': query},
      fromJsonT: (json) {
        if (json is List) {
          return json.map((e) => FacilityItem.fromJson(e as Map<String, dynamic>)).toList();
        }
        return [];
      },
    );
    return response.data ?? [];
  }

  Future<FacilityItem> getFacilityById(String id) async {
    final response = await _client.get<FacilityItem>(
      ApiConstants.facilityById(id),
      fromJsonT: (json) => FacilityItem.fromJson(json as Map<String, dynamic>),
    );
    return response.data!;
  }

  Future<List<FacilityDepartment>> getDepartments(String facilityId) async {
    final response = await _client.get<List<FacilityDepartment>>(
      ApiConstants.facilityDepartments(facilityId),
      fromJsonT: (json) {
        if (json is List) {
          return json.map((e) => FacilityDepartment.fromJson(e as Map<String, dynamic>)).toList();
        }
        return [];
      },
    );
    return response.data ?? [];
  }
}

// ==========================================
// 4. QR & PATIENT SEARCH SERVICE
// ==========================================

class QrService {
  final ApiClient _client = ApiClient();

  Future<QrVerificationResult> verifyQrToken(
    String token, {
    String deviceInfo = 'CAREiD Doctor Android',
    String location = '37.7749,-122.4194',
  }) async {
    final response = await _client.post<QrVerificationResult>(
      ApiConstants.qrVerify,
      body: {
        'token': token,
        'deviceInfo': deviceInfo,
        'location': location,
      },
      fromJsonT: (json) => QrVerificationResult.fromJson(json as Map<String, dynamic>),
    );
    return response.data!;
  }

  Future<Map<String, dynamic>> verifyHealthCardQr(String qrPayload) async {
    final response = await _client.post<Map<String, dynamic>>(
      ApiConstants.healthCardsVerifyQr,
      body: {'qrPayload': qrPayload},
      fromJsonT: (json) => json is Map<String, dynamic> ? json : <String, dynamic>{},
    );
    return response.data ?? {};
  }

  Future<List<HealthCardItem>> searchHealthCards(String query) async {
    final response = await _client.get<List<HealthCardItem>>(
      ApiConstants.healthCardsSearch,
      queryParameters: {'q': query},
      fromJsonT: (json) {
        if (json is List) {
          return json.map((e) => HealthCardItem.fromJson(e as Map<String, dynamic>)).toList();
        }
        return [];
      },
    );
    return response.data ?? [];
  }
}

// ==========================================
// 5. APPOINTMENT SERVICE
// ==========================================

class AppointmentService {
  final ApiClient _client = ApiClient();

  Future<List<AppointmentModel>> getMyAppointments({int page = 1, int limit = 20}) async {
    try {
      final response = await _client.get<List<AppointmentModel>>(
        ApiConstants.doctorMyAppointments,
        queryParameters: {'page': page, 'limit': limit},
        fromJsonT: (json) {
          if (json is List) {
            return json.map((e) => AppointmentModel.fromJson(e as Map<String, dynamic>)).toList();
          }
          return [];
        },
      );
      if (response.data != null && response.data!.isNotEmpty) {
        return response.data!;
      }
    } catch (_) {}
    return getAppointments(page: page, limit: limit);
  }

  Future<List<AppointmentModel>> getAppointments({int page = 1, int limit = 20}) async {
    final response = await _client.get<List<AppointmentModel>>(
      ApiConstants.appointments,
      queryParameters: {'page': page, 'limit': limit},
      fromJsonT: (json) {
        if (json is List) {
          return json.map((e) => AppointmentModel.fromJson(e as Map<String, dynamic>)).toList();
        }
        return [];
      },
    );
    return response.data ?? [];
  }

  Future<AppointmentModel> getAppointmentById(String id) async {
    final response = await _client.get<AppointmentModel>(
      ApiConstants.appointmentById(id),
      fromJsonT: (json) => AppointmentModel.fromJson(json as Map<String, dynamic>),
    );
    return response.data!;
  }

  Future<AppointmentModel> rescheduleAppointment(
    String id, {
    required String appointmentDate,
    required String startTime,
    int durationMinutes = 30,
    required String reason,
  }) async {
    final response = await _client.put<AppointmentModel>(
      ApiConstants.rescheduleAppointment(id),
      body: {
        'appointmentDate': appointmentDate,
        'startTime': startTime,
        'durationMinutes': durationMinutes,
        'reason': reason,
      },
      fromJsonT: (json) => AppointmentModel.fromJson(json as Map<String, dynamic>),
    );
    return response.data!;
  }

  Future<bool> cancelAppointment(String id, {required String reason}) async {
    final response = await _client.put(
      ApiConstants.cancelAppointment(id),
      body: {'reason': reason},
    );
    return response.success;
  }
}

// ==========================================
// 6. REFERRAL SERVICE
// ==========================================

class ReferralService {
  final ApiClient _client = ApiClient();

  Future<ReferralStats> getDashboardStats() async {
    final response = await _client.get<ReferralStats>(
      ApiConstants.referralsDashboardStats,
      fromJsonT: (json) => ReferralStats.fromJson(json as Map<String, dynamic>),
    );
    return response.data!;
  }

  Future<List<ReferralModel>> getIncomingReferrals({int page = 1, int limit = 20}) async {
    try {
      final response = await _client.get<List<ReferralModel>>(
        ApiConstants.myIncomingReferrals,
        queryParameters: {'page': page, 'limit': limit},
        fromJsonT: (json) {
          if (json is List) {
            return json.map((e) => ReferralModel.fromJson(e as Map<String, dynamic>)).toList();
          }
          return [];
        },
      );
      if (response.data != null && response.data!.isNotEmpty) {
        return response.data!;
      }
    } catch (_) {}
    return getReferrals(page: page, limit: limit);
  }

  Future<List<ReferralModel>> getReferrals({int page = 1, int limit = 20}) async {
    final response = await _client.get<List<ReferralModel>>(
      ApiConstants.referrals,
      queryParameters: {'page': page, 'limit': limit},
      fromJsonT: (json) {
        if (json is List) {
          return json.map((e) => ReferralModel.fromJson(e as Map<String, dynamic>)).toList();
        }
        return [];
      },
    );
    return response.data ?? [];
  }

  Future<List<ReferralModel>> getOutgoingReferrals({int page = 1, int limit = 20}) async {
    final response = await _client.get<List<ReferralModel>>(
      ApiConstants.myOutgoingReferrals,
      queryParameters: {'page': page, 'limit': limit},
      fromJsonT: (json) {
        if (json is List) {
          return json.map((e) => ReferralModel.fromJson(e as Map<String, dynamic>)).toList();
        }
        return [];
      },
    );
    return response.data ?? [];
  }

  Future<ReferralModel> getReferralById(String id) async {
    final response = await _client.get<ReferralModel>(
      ApiConstants.referralById(id),
      fromJsonT: (json) => ReferralModel.fromJson(json as Map<String, dynamic>),
    );
    return response.data!;
  }

  Future<ReferralModel> createReferral({
    required String patientId,
    required String receivingFacilityId,
    String? receivingDoctorId,
    String priority = 'URGENT',
    String referralType = 'SPECIALIST_CONSULTATION',
    required String reasonForReferral,
    String? clinicalSummary,
    String? specialtyRequired,
  }) async {
    final response = await _client.post<ReferralModel>(
      ApiConstants.referrals,
      body: {
        'patientId': patientId,
        'receivingFacilityId': receivingFacilityId,
        'receivingDoctorId': ?receivingDoctorId,
        'priority': priority,
        'referralType': referralType,
        'reasonForReferral': reasonForReferral,
        'clinicalSummary': ?clinicalSummary,
        'specialtyRequired': ?specialtyRequired,
      },
      fromJsonT: (json) => ReferralModel.fromJson(json as Map<String, dynamic>),
    );
    return response.data!;
  }

  Future<bool> triageReferral(
    String id, {
    required String priority,
    required String reasonForReferral,
    String? clinicalSummary,
    String? specialtyRequired,
  }) async {
    final response = await _client.put(
      ApiConstants.referralTriage(id),
      body: {
        'priority': priority,
        'reasonForReferral': reasonForReferral,
        'clinicalSummary': ?clinicalSummary,
        'specialtyRequired': ?specialtyRequired,
      },
    );
    return response.success;
  }

  Future<bool> updateStatus(String id, {required String status, String? reason}) async {
    final response = await _client.put(
      ApiConstants.referralStatus(id),
      body: {
        'status': status,
        'reason': ?reason,
      },
    );
    return response.success;
  }
}

// ==========================================
// 7. NOTIFICATION SERVICE
// ==========================================

class NotificationService {
  final ApiClient _client = ApiClient();

  Future<List<NotificationItem>> getNotifications({int page = 1, int limit = 20}) async {
    final response = await _client.get<List<NotificationItem>>(
      ApiConstants.notifications,
      queryParameters: {'page': page, 'limit': limit},
      fromJsonT: (json) {
        if (json is List) {
          return json.map((e) => NotificationItem.fromJson(e as Map<String, dynamic>)).toList();
        }
        return [];
      },
    );
    return response.data ?? [];
  }

  Future<NotificationPreferencesModel> getPreferences() async {
    final response = await _client.get<NotificationPreferencesModel>(
      ApiConstants.notificationPreferences,
      fromJsonT: (json) => NotificationPreferencesModel.fromJson(json as Map<String, dynamic>),
    );
    return response.data!;
  }

  Future<bool> updatePreferences(NotificationPreferencesModel prefs) async {
    final response = await _client.put(
      ApiConstants.notificationPreferences,
      body: prefs.toJson(),
    );
    return response.success;
  }
}

// ==========================================
// 8. OCR SERVICE
// ==========================================

class OcrService {
  final ApiClient _client = ApiClient();

  Future<List<OcrJobItem>> getOcrJobs({int page = 1, int limit = 20, String? documentType}) async {
    final queryParams = <String, dynamic>{'page': page, 'limit': limit};
    if (documentType != null) queryParams['documentType'] = documentType;
    final response = await _client.get<List<OcrJobItem>>(
      ApiConstants.ocrJobs,
      queryParameters: queryParams,
      fromJsonT: (json) {
        if (json is List) {
          return json.map((e) => OcrJobItem.fromJson(e as Map<String, dynamic>)).toList();
        }
        return [];
      },
    );
    return response.data ?? [];
  }

  Future<OcrJobItem> getOcrJobById(String id) async {
    final response = await _client.get<OcrJobItem>(
      ApiConstants.ocrJobById(id),
      fromJsonT: (json) => OcrJobItem.fromJson(json as Map<String, dynamic>),
    );
    return response.data!;
  }

  Future<List<OcrExtractedField>> getOcrJobFields(String id) async {
    final response = await _client.get<List<OcrExtractedField>>(
      ApiConstants.ocrJobFields(id),
      fromJsonT: (json) {
        if (json is List) {
          return json.map((e) => OcrExtractedField.fromJson(e as Map<String, dynamic>)).toList();
        }
        return [];
      },
    );
    return response.data ?? [];
  }

  Future<Map<String, dynamic>> uploadAttachment({
    required String filePath,
    required String patientProfileId,
    String category = 'LAB_REPORT',
  }) async {
    final response = await _client.uploadMultipart<Map<String, dynamic>>(
      ApiConstants.attachments,
      filePath: filePath,
      fileFieldName: 'file',
      fields: {
        'category': category,
        'patientProfileId': patientProfileId,
      },
      fromJsonT: (json) => json as Map<String, dynamic>,
    );
    return response.data ?? {};
  }

  Future<OcrJobItem?> createOcrJob({
    required String medicalAttachmentId,
    String documentType = 'LAB_REPORT',
  }) async {
    final response = await _client.post<OcrJobItem>(
      ApiConstants.ocrJobs,
      body: {
        'medicalAttachmentId': medicalAttachmentId,
        'documentType': documentType,
      },
      fromJsonT: (json) => OcrJobItem.fromJson(json as Map<String, dynamic>),
    );
    return response.data;
  }

  Future<bool> submitReview(
    String jobId, {
    String reviewStatus = 'APPROVED',
    String reviewNotes = 'Verified by doctor',
    List<Map<String, dynamic>> corrections = const [],
  }) async {
    final response = await _client.post(
      ApiConstants.ocrJobReview(jobId),
      body: {
        'reviewStatus': reviewStatus,
        'reviewNotes': reviewNotes,
        'corrections': corrections,
      },
    );
    return response.success;
  }
}

// ==========================================
// 9. SUPPORT & HELP DESK SERVICE
// ==========================================

class SupportService {
  final ApiClient _client = ApiClient();

  Future<List<SupportTicketItem>> getTickets({int page = 1, int limit = 20}) async {
    final response = await _client.get<List<SupportTicketItem>>(
      ApiConstants.supportTickets,
      queryParameters: {'page': page, 'limit': limit},
      fromJsonT: (json) {
        if (json is List) {
          return json.map((e) => SupportTicketItem.fromJson(e as Map<String, dynamic>)).toList();
        }
        return [];
      },
    );
    return response.data ?? [];
  }

  Future<SupportTicketItem> createTicket({
    required String subject,
    required String description,
    String priority = 'MEDIUM',
  }) async {
    final response = await _client.post<SupportTicketItem>(
      ApiConstants.supportTickets,
      body: {
        'subject': subject,
        'description': description,
        'priority': priority,
      },
      fromJsonT: (json) => SupportTicketItem.fromJson(json as Map<String, dynamic>),
    );
    return response.data!;
  }
}

// ==========================================
// 10. PET HEALTH RECORDS SERVICE
// ==========================================

class PetService {
  final ApiClient _client = ApiClient();

  Future<List<PetItem>> getPets({int page = 1, int limit = 20}) async {
    final response = await _client.get<List<PetItem>>(
      ApiConstants.pets,
      queryParameters: {'page': page, 'limit': limit},
      fromJsonT: (json) {
        if (json is Map && json['data'] is List) {
          return (json['data'] as List).map((e) => PetItem.fromJson(e as Map<String, dynamic>)).toList();
        } else if (json is List) {
          return json.map((e) => PetItem.fromJson(e as Map<String, dynamic>)).toList();
        }
        return [];
      },
    );
    return response.data ?? [];
  }
}

// ==========================================
// 11. DOCTOR TREATMENT OFFER SERVICE
// ==========================================

class DoctorTreatmentOfferService {
  final ApiClient _client = ApiClient();

  /// List all treatment offers created by the doctor
  /// GET /api/v1/doctors/treatment-offers
  Future<List<Map<String, dynamic>>> getTreatmentOffers({
    String? status,
    int page = 1,
    int limit = 20,
  }) async {
    final params = <String, dynamic>{'page': page, 'limit': limit};
    if (status != null && status.isNotEmpty) params['status'] = status;
    final response = await _client.get<List<Map<String, dynamic>>>(
      ApiConstants.doctorTreatmentOffers,
      queryParameters: params,
      fromJsonT: (json) {
        if (json is List) {
          return json.whereType<Map<String, dynamic>>().toList();
        }
        if (json is Map<String, dynamic> && json['data'] is List) {
          return (json['data'] as List).whereType<Map<String, dynamic>>().toList();
        }
        return [];
      },
    );
    return response.data ?? [];
  }

  /// Get details of a single treatment offer
  /// GET /api/v1/doctors/treatment-offers/:id
  Future<Map<String, dynamic>> getOfferById(String id) async {
    final response = await _client.get<Map<String, dynamic>>(
      ApiConstants.doctorTreatmentOfferById(id),
      fromJsonT: (json) => json is Map<String, dynamic> ? json : {},
    );
    return response.data ?? {};
  }

  /// Create a draft treatment offer
  /// POST /api/v1/doctors/treatment-offers
  Future<Map<String, dynamic>> createTreatmentOffer(Map<String, dynamic> offerData) async {
    final response = await _client.post<Map<String, dynamic>>(
      ApiConstants.doctorTreatmentOffers,
      body: offerData,
      fromJsonT: (json) => json is Map<String, dynamic> ? json : {},
    );
    return response.data ?? {};
  }

  /// Update an existing treatment offer
  /// PUT /api/v1/doctors/treatment-offers/:id
  Future<Map<String, dynamic>> updateTreatmentOffer(String id, Map<String, dynamic> offerData) async {
    final response = await _client.put<Map<String, dynamic>>(
      ApiConstants.doctorTreatmentOfferById(id),
      body: offerData,
      fromJsonT: (json) => json is Map<String, dynamic> ? json : {},
    );
    return response.data ?? {};
  }

  /// Dispatch offer to patient
  /// POST /api/v1/doctors/treatment-offers/:id/dispatch
  Future<Map<String, dynamic>> dispatchTreatmentOffer(String id) async {
    final response = await _client.post<Map<String, dynamic>>(
      ApiConstants.doctorTreatmentOfferDispatch(id),
      fromJsonT: (json) => json is Map<String, dynamic> ? json : {},
    );
    return response.data ?? {};
  }

  /// Check status of an offer
  /// GET /api/v1/doctors/treatment-offers/:id/status
  Future<Map<String, dynamic>> getOfferStatus(String id) async {
    final response = await _client.get<Map<String, dynamic>>(
      ApiConstants.doctorTreatmentOfferStatus(id),
      fromJsonT: (json) => json is Map<String, dynamic> ? json : {},
    );
    return response.data ?? {};
  }

  /// Cancel an offer
  /// POST /api/v1/doctors/treatment-offers/:id/cancel
  Future<Map<String, dynamic>> cancelTreatmentOffer(String id, {String? reason}) async {
    final body = <String, dynamic>{};
    if (reason != null && reason.isNotEmpty) body['reason'] = reason;
    final response = await _client.post<Map<String, dynamic>>(
      ApiConstants.doctorTreatmentOfferCancel(id),
      body: body,
      fromJsonT: (json) => json is Map<String, dynamic> ? json : {},
    );
    return response.data ?? {};
  }
}

// ==========================================
// 12. CPT & PROCEDURE CATALOGUE SERVICE
// ==========================================

class CptService {
  final ApiClient _client = ApiClient();

  /// List CPT procedures by category/pagination
  /// GET /api/v1/cpt
  Future<List<Map<String, dynamic>>> getCptCodes({
    String? category,
    int page = 1,
    int limit = 50,
  }) async {
    final params = <String, dynamic>{'page': page, 'limit': limit};
    if (category != null && category.isNotEmpty) params['category'] = category;
    final response = await _client.get<List<Map<String, dynamic>>>(
      ApiConstants.cpt,
      queryParameters: params,
      fromJsonT: (json) {
        if (json is List) {
          return json.whereType<Map<String, dynamic>>().toList();
        }
        if (json is Map<String, dynamic> && json['data'] is List) {
          return (json['data'] as List).whereType<Map<String, dynamic>>().toList();
        }
        return [];
      },
    );
    return response.data ?? [];
  }

  /// Search CPT codes
  /// GET /api/v1/cpt/search?q=...
  Future<List<Map<String, dynamic>>> searchCpt(String query) async {
    final response = await _client.get<List<Map<String, dynamic>>>(
      ApiConstants.cptSearch,
      queryParameters: {'q': query},
      fromJsonT: (json) {
        if (json is List) {
          return json.whereType<Map<String, dynamic>>().toList();
        }
        if (json is Map<String, dynamic> && json['data'] is List) {
          return (json['data'] as List).whereType<Map<String, dynamic>>().toList();
        }
        return [];
      },
    );
    return response.data ?? [];
  }

  /// Get CPT code details
  /// GET /api/v1/cpt/:code
  Future<Map<String, dynamic>> getCptByCode(String code) async {
    final response = await _client.get<Map<String, dynamic>>(
      ApiConstants.cptByCode(code),
      fromJsonT: (json) => json is Map<String, dynamic> ? json : {},
    );
    return response.data ?? {};
  }
}

// ==========================================
// 13. CATH LAB & INTERVENTIONAL CARDIOLOGY SERVICE
// ==========================================

class CathLabService {
  final ApiClient _client = ApiClient();

  /// Get Pre-Op Day -1 Readiness Checklist for an appointment
  /// GET /api/v1/appointments/:id/readiness
  Future<Map<String, dynamic>> getReadinessChecklist(String appointmentId) async {
    final response = await _client.get<Map<String, dynamic>>(
      ApiConstants.appointmentReadiness(appointmentId),
      fromJsonT: (json) => json is Map<String, dynamic> ? json : {},
    );
    return response.data ?? {};
  }

  /// Update Pre-Op Day -1 Readiness Checklist
  /// PATCH /api/v1/appointments/:id/readiness
  Future<Map<String, dynamic>> updateReadinessChecklist(
    String appointmentId,
    Map<String, dynamic> checklistData,
  ) async {
    final response = await _client.patch<Map<String, dynamic>>(
      ApiConstants.appointmentReadiness(appointmentId),
      body: checklistData,
      fromJsonT: (json) => json is Map<String, dynamic> ? json : {},
    );
    return response.data ?? {};
  }

  /// Get Cath Lab Safety Checklist (Day of Procedure)
  /// GET /api/v1/appointments/:id/cath-lab-checklist
  Future<Map<String, dynamic>> getCathLabChecklist(String appointmentId) async {
    final response = await _client.get<Map<String, dynamic>>(
      ApiConstants.appointmentCathLabChecklist(appointmentId),
      fromJsonT: (json) => json is Map<String, dynamic> ? json : {},
    );
    return response.data ?? {};
  }

  /// Submit/update Cath Lab Safety Checklist
  /// POST /api/v1/appointments/:id/cath-lab-checklist
  Future<Map<String, dynamic>> submitCathLabChecklist(
    String appointmentId,
    Map<String, dynamic> checklistData,
  ) async {
    final response = await _client.post<Map<String, dynamic>>(
      ApiConstants.appointmentCathLabChecklist(appointmentId),
      body: checklistData,
      fromJsonT: (json) => json is Map<String, dynamic> ? json : {},
    );
    return response.data ?? {};
  }
}

// ==========================================
// 14. MEDICAL RECORD SERVICE
// ==========================================

class MedicalRecordService {
  final ApiClient _client = ApiClient();

  /// List medical records with pagination & filters
  /// GET /api/v1/medical-records
  Future<List<MedicalRecordModel>> getMedicalRecords({
    int page = 1,
    int limit = 20,
    String? search,
    String? recordType,
  }) async {
    final params = <String, dynamic>{'page': page, 'limit': limit};
    if (search != null && search.isNotEmpty) params['search'] = search;
    if (recordType != null && recordType.isNotEmpty) params['recordType'] = recordType;

    final response = await _client.get<List<MedicalRecordModel>>(
      ApiConstants.medicalRecords,
      queryParameters: params,
      fromJsonT: (json) {
        if (json is List) {
          return json.map((e) => MedicalRecordModel.fromJson(e as Map<String, dynamic>)).toList();
        }
        if (json is Map<String, dynamic> && json['data'] is List) {
          return (json['data'] as List)
              .map((e) => MedicalRecordModel.fromJson(e as Map<String, dynamic>))
              .toList();
        }
        return [];
      },
    );
    return response.data ?? [];
  }

  /// Get medical records timeline
  /// GET /api/v1/medical-records/timeline
  Future<List<MedicalRecordModel>> getTimeline({
    int page = 1,
    int limit = 20,
    String? patientProfileId,
  }) async {
    final params = <String, dynamic>{'page': page, 'limit': limit};
    if (patientProfileId != null && patientProfileId.isNotEmpty) {
      params['patientProfileId'] = patientProfileId;
    }

    final response = await _client.get<List<MedicalRecordModel>>(
      ApiConstants.medicalRecordsTimeline,
      queryParameters: params,
      fromJsonT: (json) {
        if (json is List) {
          return json.map((e) => MedicalRecordModel.fromJson(e as Map<String, dynamic>)).toList();
        }
        if (json is Map<String, dynamic> && json['data'] is List) {
          return (json['data'] as List)
              .map((e) => MedicalRecordModel.fromJson(e as Map<String, dynamic>))
              .toList();
        }
        return [];
      },
    );
    return response.data ?? [];
  }

  /// Search medical records by query string
  /// GET /api/v1/medical-records/search?q=...
  Future<List<MedicalRecordModel>> searchMedicalRecords(String query) async {
    final response = await _client.get<List<MedicalRecordModel>>(
      ApiConstants.medicalRecordsSearch,
      queryParameters: {'q': query},
      fromJsonT: (json) {
        if (json is List) {
          return json.map((e) => MedicalRecordModel.fromJson(e as Map<String, dynamic>)).toList();
        }
        if (json is Map<String, dynamic> && json['data'] is List) {
          return (json['data'] as List)
              .map((e) => MedicalRecordModel.fromJson(e as Map<String, dynamic>))
              .toList();
        }
        return [];
      },
    );
    return response.data ?? [];
  }

  /// Get single record by ID
  /// GET /api/v1/medical-records/:id
  Future<MedicalRecordModel?> getMedicalRecordById(String id) async {
    final response = await _client.get<MedicalRecordModel>(
      ApiConstants.medicalRecordById(id),
      fromJsonT: (json) => MedicalRecordModel.fromJson(json as Map<String, dynamic>),
    );
    return response.data;
  }

  /// Create new medical record
  /// POST /api/v1/medical-records
  Future<MedicalRecordModel?> createMedicalRecord(Map<String, dynamic> data) async {
    final response = await _client.post<MedicalRecordModel>(
      ApiConstants.medicalRecords,
      body: data,
      fromJsonT: (json) => MedicalRecordModel.fromJson(json as Map<String, dynamic>),
    );
    return response.data;
  }

  /// Update existing medical record
  /// PUT /api/v1/medical-records/:id
  Future<MedicalRecordModel?> updateMedicalRecord(String id, Map<String, dynamic> data) async {
    final response = await _client.put<MedicalRecordModel>(
      ApiConstants.medicalRecordById(id),
      body: data,
      fromJsonT: (json) => MedicalRecordModel.fromJson(json as Map<String, dynamic>),
    );
    return response.data;
  }

  /// Delete/archive record
  /// DELETE /api/v1/medical-records/:id
  Future<bool> deleteMedicalRecord(String id) async {
    final response = await _client.delete(ApiConstants.medicalRecordById(id));
    return response.success;
  }

  /// Archive record
  /// POST /api/v1/medical-records/:id/archive
  Future<bool> archiveMedicalRecord(String id) async {
    final response = await _client.post(ApiConstants.medicalRecordArchive(id));
    return response.success;
  }

  /// Restore archived record
  /// POST /api/v1/medical-records/:id/restore
  Future<bool> restoreMedicalRecord(String id) async {
    final response = await _client.post(ApiConstants.medicalRecordRestore(id));
    return response.success;
  }

  /// Get attachments for a medical record
  /// GET /api/v1/medical-records/:id/attachments
  Future<List<AttachmentModel>> getRecordAttachments(String recordId) async {
    final response = await _client.get<List<AttachmentModel>>(
      ApiConstants.medicalRecordAttachments(recordId),
      fromJsonT: (json) {
        if (json is List) {
          return json.map((e) => AttachmentModel.fromJson(e as Map<String, dynamic>)).toList();
        }
        if (json is Map<String, dynamic> && json['data'] is List) {
          return (json['data'] as List)
              .map((e) => AttachmentModel.fromJson(e as Map<String, dynamic>))
              .toList();
        }
        return [];
      },
    );
    return response.data ?? [];
  }
}

// ==========================================
// 15. ATTACHMENT SERVICE
// ==========================================

class AttachmentService {
  final ApiClient _client = ApiClient();

  /// Get attachment metadata by ID
  /// GET /api/v1/attachments/:id
  Future<AttachmentModel?> getAttachmentById(String id) async {
    final response = await _client.get<AttachmentModel>(
      ApiConstants.attachmentById(id),
      fromJsonT: (json) => AttachmentModel.fromJson(json as Map<String, dynamic>),
    );
    return response.data;
  }

  /// Get secure download/signed URL
  /// GET /api/v1/attachments/:id/download-url
  Future<String?> getDownloadUrl(String id) async {
    final response = await _client.get<Map<String, dynamic>>(
      ApiConstants.attachmentDownloadUrl(id),
      fromJsonT: (json) => json is Map<String, dynamic> ? json : {},
    );
    final data = response.data;
    if (data != null && data.containsKey('downloadUrl')) {
      return data['downloadUrl']?.toString();
    }
    if (data != null && data.containsKey('url')) {
      return data['url']?.toString();
    }
    return null;
  }

  /// Soft-delete attachment
  /// DELETE /api/v1/attachments/:id
  Future<bool> deleteAttachment(String id) async {
    final response = await _client.delete(ApiConstants.attachmentById(id));
    return response.success;
  }

  /// Restore deleted attachment
  /// POST /api/v1/attachments/:id/restore
  Future<bool> restoreAttachment(String id) async {
    final response = await _client.post(ApiConstants.attachmentRestore(id));
    return response.success;
  }
}

// ==========================================
// 16. PHASE 3 SPECIALIZED CLINICAL SERVICES
// ==========================================

class DentalService {
  final ApiClient _client = ApiClient();

  /// Fetch dental records for a patient
  /// Note: Falls back gracefully if backend endpoint is in deployment
  Future<List<DentalRecordModel>> getPatientDentalRecords(String patientId) async {
    try {
      final response = await _client.get<List<DentalRecordModel>>(
        ApiConstants.patientDentalRecords(patientId),
        fromJsonT: (json) {
          if (json is List) {
            return json.map((e) => DentalRecordModel.fromJson(e as Map<String, dynamic>)).toList();
          }
          return [];
        },
      );
      if (response.data != null && response.data!.isNotEmpty) {
        return response.data!;
      }
    } catch (_) {}
    return [];
  }

  /// Save dental examination record
  Future<DentalRecordModel?> createDentalRecord(DentalRecordModel record) async {
    try {
      final response = await _client.post<DentalRecordModel>(
        ApiConstants.dentalRecords,
        body: {
          'patientId': record.patientId,
          'toothNumber': record.toothNumber,
          'surface': record.surface,
          'procedureCode': record.procedureCode,
          'procedureName': record.procedureName,
          'diagnosis': record.diagnosis,
          'status': record.status,
          if (record.notes != null) 'notes': record.notes,
        },
        fromJsonT: (json) => DentalRecordModel.fromJson(json as Map<String, dynamic>),
      );
      return response.data;
    } catch (_) {
      return null;
    }
  }
}

class VisionService {
  final ApiClient _client = ApiClient();

  /// Fetch vision examination history
  Future<List<VisionRecordModel>> getPatientVisionRecords(String patientId) async {
    try {
      final response = await _client.get<List<VisionRecordModel>>(
        ApiConstants.patientVisionRecords(patientId),
        fromJsonT: (json) {
          if (json is List) {
            return json.map((e) => VisionRecordModel.fromJson(e as Map<String, dynamic>)).toList();
          }
          return [];
        },
      );
      if (response.data != null && response.data!.isNotEmpty) {
        return response.data!;
      }
    } catch (_) {}
    return [];
  }

  /// Create new optometric examination
  Future<VisionRecordModel?> createVisionRecord(VisionRecordModel record) async {
    try {
      final response = await _client.post<VisionRecordModel>(
        ApiConstants.visionRecords,
        body: {
          'patientId': record.patientId,
          'odSphere': record.odSphere,
          'odCylinder': record.odCylinder,
          'odAxis': record.odAxis,
          'odVcu': record.odVcu,
          'osSphere': record.osSphere,
          'osCylinder': record.osCylinder,
          'osAxis': record.osAxis,
          'osVcu': record.osVcu,
          if (record.intraocularPressure != null) 'intraocularPressure': record.intraocularPressure,
          if (record.notes != null) 'notes': record.notes,
        },
        fromJsonT: (json) => VisionRecordModel.fromJson(json as Map<String, dynamic>),
      );
      return response.data;
    } catch (_) {
      return null;
    }
  }
}

class LaboratoryService {
  final ApiClient _client = ApiClient();

  /// Fetch laboratory tests and pathology reports
  Future<List<LaboratoryReportModel>> getPatientLabReports(String patientId) async {
    try {
      final response = await _client.get<List<LaboratoryReportModel>>(
        ApiConstants.patientLaboratoryReports(patientId),
        fromJsonT: (json) {
          if (json is List) {
            return json.map((e) => LaboratoryReportModel.fromJson(e as Map<String, dynamic>)).toList();
          }
          return [];
        },
      );
      if (response.data != null && response.data!.isNotEmpty) {
        return response.data!;
      }
    } catch (_) {}
    return [];
  }
}

class AddendumService {
  final ApiClient _client = ApiClient();

  /// Append an addendum to an existing signed medical record
  Future<MedicalRecordAddendumModel?> addAddendum({
    required String medicalRecordId,
    required String note,
    required String reason,
  }) async {
    try {
      final response = await _client.post<MedicalRecordAddendumModel>(
        ApiConstants.medicalRecordAddenda(medicalRecordId),
        body: {
          'note': note,
          'reason': reason,
        },
        fromJsonT: (json) => MedicalRecordAddendumModel.fromJson(json as Map<String, dynamic>),
      );
      return response.data;
    } catch (_) {
      return null;
    }
  }
}

class PrescriptionService {
  final ApiClient _client = ApiClient();

  /// Submit digital prescription with medications, dosage, frequency
  Future<bool> submitPrescription(PrescriptionSubmissionModel submission) async {
    try {
      final response = await _client.post(
        ApiConstants.prescriptions,
        body: submission.toJson(),
      );
      return response.success;
    } catch (_) {
      return false;
    }
  }
}

class InteractionService {
  final ApiClient _client = ApiClient();

  /// Check clinical drug-drug interactions
  Future<List<DrugInteractionResultModel>> checkInteractions(List<String> drugNames) async {
    try {
      final response = await _client.post<List<DrugInteractionResultModel>>(
        ApiConstants.prescriptionCheckInteractions,
        body: {'medications': drugNames},
        fromJsonT: (json) {
          if (json is List) {
            return json.map((e) => DrugInteractionResultModel.fromJson(e as Map<String, dynamic>)).toList();
          }
          return [];
        },
      );
      return response.data ?? [];
    } catch (_) {
      return [];
    }
  }
}

class MessagingService {
  final ApiClient _client = ApiClient();

  /// List patient-doctor conversations
  Future<List<PatientConversationModel>> getConversations() async {
    try {
      final response = await _client.get<List<PatientConversationModel>>(
        ApiConstants.messagingConversations,
        fromJsonT: (json) {
          if (json is List) {
            return json.map((e) => PatientConversationModel.fromJson(e as Map<String, dynamic>)).toList();
          }
          return [];
        },
      );
      return response.data ?? [];
    } catch (_) {
      return [];
    }
  }

  /// Get messages in conversation
  Future<List<DirectMessageModel>> getMessages(String conversationId) async {
    try {
      final response = await _client.get<List<DirectMessageModel>>(
        ApiConstants.messagingConversationMessages(conversationId),
        fromJsonT: (json) {
          if (json is List) {
            return json.map((e) => DirectMessageModel.fromJson(e as Map<String, dynamic>)).toList();
          }
          return [];
        },
      );
      return response.data ?? [];
    } catch (_) {
      return [];
    }
  }

  /// Send message
  Future<bool> sendMessage(String conversationId, String text) async {
    try {
      final response = await _client.post(
        ApiConstants.messagingSendMessage,
        body: {'conversationId': conversationId, 'text': text},
      );
      return response.success;
    } catch (_) {
      return false;
    }
  }
}

class ShareRecordService {
  final ApiClient _client = ApiClient();

  /// Share a record with another doctor/facility
  Future<RecordShareGrantModel?> shareRecord({
    required String medicalRecordId,
    required String recipientDoctorId,
    required String permissions,
    required String expiresAt,
  }) async {
    try {
      final response = await _client.post<RecordShareGrantModel>(
        ApiConstants.recordShares,
        body: {
          'medicalRecordId': medicalRecordId,
          'recipientDoctorId': recipientDoctorId,
          'permissions': permissions,
          'expiresAt': expiresAt,
        },
        fromJsonT: (json) => RecordShareGrantModel.fromJson(json as Map<String, dynamic>),
      );
      return response.data;
    } catch (_) {
      return null;
    }
  }

  /// Revoke an active share grant
  Future<bool> revokeShare(String shareId) async {
    try {
      final response = await _client.post(
        ApiConstants.recordShareRevoke(shareId),
      );
      return response.success;
    } catch (_) {
      return false;
    }
  }
}
