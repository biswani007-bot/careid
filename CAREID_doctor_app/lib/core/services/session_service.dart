import 'package:shared_preferences/shared_preferences.dart';

class SessionService {
  static final SessionService _instance = SessionService._internal();
  factory SessionService() => _instance;
  SessionService._internal();

  static const String _keyAccessToken = 'careid_doctor_access_token';
  static const String _keyRefreshToken = 'careid_doctor_refresh_token';
  static const String _keyUserId = 'careid_doctor_user_id';
  static const String _keyDoctorId = 'careid_doctor_profile_id';
  static const String _keyDoctorName = 'careid_doctor_name';
  static const String _keyDoctorSpecialization = 'careid_doctor_specialization';
  static const String _keyDoctorFacility = 'careid_doctor_facility';
  static const String _keyDoctorLicense = 'careid_doctor_license';
  static const String _keyPhone = 'careid_doctor_phone';
  static const String _keyRoles = 'careid_doctor_roles';
  static const String _keyPermissions = 'careid_doctor_permissions';

  SharedPreferences? _prefs;

  Future<void> init() async {
    _prefs ??= await SharedPreferences.getInstance();
  }

  Future<void> saveAuthTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    await init();
    await _prefs?.setString(_keyAccessToken, accessToken);
    await _prefs?.setString(_keyRefreshToken, refreshToken);
  }

  Future<String?> getAccessToken() async {
    await init();
    return _prefs?.getString(_keyAccessToken);
  }

  Future<String?> getRefreshToken() async {
    await init();
    return _prefs?.getString(_keyRefreshToken);
  }

  Future<void> saveUserProfile({
    required String userId,
    required String phone,
    List<String>? roles,
    List<String>? permissions,
  }) async {
    await init();
    await _prefs?.setString(_keyUserId, userId);
    await _prefs?.setString(_keyPhone, phone);
    if (roles != null) {
      await _prefs?.setStringList(_keyRoles, roles);
    }
    if (permissions != null) {
      await _prefs?.setStringList(_keyPermissions, permissions);
    }
  }

  Future<void> saveDoctorProfile({
    required String doctorId,
    required String fullName,
    String? specialization,
    String? facility,
    String? licenseNumber,
  }) async {
    await init();
    await _prefs?.setString(_keyDoctorId, doctorId);
    await _prefs?.setString(_keyDoctorName, fullName);
    if (specialization != null) {
      await _prefs?.setString(_keyDoctorSpecialization, specialization);
    }
    if (facility != null) {
      await _prefs?.setString(_keyDoctorFacility, facility);
    }
    if (licenseNumber != null) {
      await _prefs?.setString(_keyDoctorLicense, licenseNumber);
    }
  }

  Future<String?> getUserId() async {
    await init();
    return _prefs?.getString(_keyUserId);
  }

  Future<String?> getDoctorId() async {
    await init();
    return _prefs?.getString(_keyDoctorId);
  }

  Future<String> getDoctorName() async {
    await init();
    return _prefs?.getString(_keyDoctorName) ?? 'Dr. Sarah Jenkins, MD';
  }

  Future<String> getDoctorSpecialization() async {
    await init();
    return _prefs?.getString(_keyDoctorSpecialization) ?? 'Cardiology';
  }

  Future<String> getDoctorFacility() async {
    await init();
    return _prefs?.getString(_keyDoctorFacility) ?? 'City General Hospital';
  }

  Future<String> getDoctorLicense() async {
    await init();
    return _prefs?.getString(_keyDoctorLicense) ?? 'MED-REG-2026-9081';
  }

  Future<String?> getPhone() async {
    await init();
    return _prefs?.getString(_keyPhone);
  }

  Future<bool> isLoggedIn() async {
    final token = await getAccessToken();
    return token != null && token.isNotEmpty;
  }

  Future<void> clearSession() async {
    await init();
    await _prefs?.remove(_keyAccessToken);
    await _prefs?.remove(_keyRefreshToken);
    await _prefs?.remove(_keyUserId);
    await _prefs?.remove(_keyDoctorId);
    await _prefs?.remove(_keyDoctorName);
    await _prefs?.remove(_keyDoctorSpecialization);
    await _prefs?.remove(_keyDoctorFacility);
    await _prefs?.remove(_keyDoctorLicense);
    await _prefs?.remove(_keyPhone);
    await _prefs?.remove(_keyRoles);
    await _prefs?.remove(_keyPermissions);
  }
}
