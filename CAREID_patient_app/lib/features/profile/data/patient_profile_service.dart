import '../../../core/network/api_client.dart';
import '../../../core/session/session_manager.dart';

class PatientProfileService {
  static final PatientProfileService _instance = PatientProfileService._internal();
  factory PatientProfileService() => _instance;
  static PatientProfileService get instance => _instance;

  PatientProfileService._internal();

  final ApiClient _client = ApiClient.instance;

  /// Fetches lightweight patient identity from GET /patients/me
  Future<ApiResponse<Map<String, dynamic>>> getBasicProfile() async {
    final response = await _client.get('/patients/me');
    if (response.isSuccess && response.data is Map) {
      var map = Map<String, dynamic>.from(response.data as Map);
      if (map['data'] is Map) {
        map = Map<String, dynamic>.from(map['data'] as Map);
      }
      final patientId = map['id']?.toString();
      if (patientId != null && patientId.isNotEmpty) {
        SessionManager.instance.updatePatientId(patientId);
      }
      return ApiResponse.success(response.statusCode, map);
    }
    return ApiResponse.error(response.statusCode, response.errorMessage ?? 'Failed to load profile');
  }

  /// Fetches patient dashboard summary from GET /patients/me/dashboard
  Future<ApiResponse<Map<String, dynamic>>> getDashboard() async {
    final response = await _client.get('/patients/me/dashboard');
    if (response.isSuccess && response.data is Map) {
      var map = Map<String, dynamic>.from(response.data as Map);
      if (map['data'] is Map) {
        map = Map<String, dynamic>.from(map['data'] as Map);
      }
      final pMap = map['patientProfile'] is Map ? map['patientProfile'] as Map : null;
      final patientId = pMap?['id']?.toString();
      if (patientId != null && patientId.isNotEmpty) {
        SessionManager.instance.updatePatientId(patientId);
      }
      return ApiResponse.success(response.statusCode, map);
    }
    return ApiResponse.error(response.statusCode, response.errorMessage ?? 'Failed to load dashboard');
  }

  /// Fetches complete patient profile from GET /patients/me/full
  Future<ApiResponse<Map<String, dynamic>>> getFullProfile() async {
    final response = await _client.get('/patients/me/full');
    if (response.isSuccess && response.data is Map) {
      var map = Map<String, dynamic>.from(response.data as Map);
      if (map['data'] is Map) {
        map = Map<String, dynamic>.from(map['data'] as Map);
      }
      final patientId = map['id']?.toString();
      if (patientId != null && patientId.isNotEmpty) {
        SessionManager.instance.updatePatientId(patientId);
      }
      return ApiResponse.success(response.statusCode, map);
    }
    return ApiResponse.error(response.statusCode, response.errorMessage ?? 'Failed to load profile');
  }

  /// Updates basic demographics via PATCH /patients/me/basic
  Future<ApiResponse<dynamic>> updateBasicDetails({
    String? firstName,
    String? lastName,
    String? dateOfBirth,
    String? gender,
    String? bloodGroup,
  }) async {
    final Map<String, dynamic> body = {};
    if (firstName != null) body['firstName'] = firstName;
    if (lastName != null) body['lastName'] = lastName;
    if (dateOfBirth != null) body['dateOfBirth'] = dateOfBirth;
    if (gender != null) body['gender'] = gender.toUpperCase();
    if (bloodGroup != null) body['bloodGroup'] = bloodGroup;

    return await _client.patch('/patients/me/basic', body: body);
  }

  /// Updates contact info via PATCH /patients/me/contact
  Future<ApiResponse<dynamic>> updateContactDetails({
    String? email,
    String? phone,
  }) async {
    final Map<String, dynamic> body = {};
    if (email != null) body['email'] = email;
    if (phone != null) body['phone'] = phone;

    return await _client.patch('/patients/me/contact', body: body);
  }

  /// Updates physical address via PATCH /patients/me/address
  Future<ApiResponse<dynamic>> updateAddress({
    required String line1,
    String? line2,
    String? city,
    String? state,
    String? postalCode,
    String? country,
  }) async {
    final body = {
      'currentAddress': {
        'line1': line1,
        if (line2 != null) 'line2': line2,
        'city': city ?? 'City',
        'state': state ?? 'State',
        'postalCode': postalCode ?? '00000',
        'country': country ?? 'US',
      },
    };

    return await _client.patch('/patients/me/address', body: body);
  }

  /// Uploads or replaces patient profile photo via POST /patients/me/photo
  Future<ApiResponse<dynamic>> uploadPhoto({String? photoUrl}) async {
    final body = {
      if (photoUrl != null) 'photoUrl': photoUrl,
    };
    return await _client.post('/patients/me/photo', body: body);
  }

  /// Updates notification/privacy preferences via PATCH /patients/me/preferences
  Future<ApiResponse<dynamic>> updatePreferences({
    bool? emailNotifications,
    bool? smsNotifications,
    bool? pushNotifications,
    String? prefContactMethod,
    String? profileVisibility,
  }) async {
    final body = <String, dynamic>{};
    if (emailNotifications != null) body['emailNotifications'] = emailNotifications;
    if (smsNotifications != null) body['smsNotifications'] = smsNotifications;
    if (pushNotifications != null) body['pushNotifications'] = pushNotifications;
    if (prefContactMethod != null) body['prefContactMethod'] = prefContactMethod;
    if (profileVisibility != null) body['profileVisibility'] = profileVisibility;

    return await _client.patch('/patients/me/preferences', body: body);
  }

  /// Deletes patient profile photo via DELETE /patients/me/photo
  Future<ApiResponse<dynamic>> deletePhoto() async {
    return await _client.delete('/patients/me/photo');
  }
}

