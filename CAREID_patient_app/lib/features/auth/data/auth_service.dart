import '../../../core/network/api_client.dart';
import '../../../core/network/api_constants.dart';
import '../../../core/session/session_manager.dart';

class AuthService {
  static final AuthService _instance = AuthService._internal();
  factory AuthService() => _instance;
  static AuthService get instance => _instance;

  AuthService._internal();

  final ApiClient _client = ApiClient.instance;

  /// Requests a 6-digit OTP for the given phone number (E.164 format: +16505550004)
  Future<ApiResponse<String>> requestOtp(String phone, {String? role}) async {
    final cleanPhone = phone.trim().replaceAll(' ', '');
    final body = <String, dynamic>{'phone': cleanPhone};
    if (role != null && role.isNotEmpty) body['role'] = role;

    final response = await _client.post(
      '/auth/otp/request',
      body: body,
      retryOn401: false,
    );

    if (response.isSuccess && response.data is Map) {
      final map = response.data as Map<String, dynamic>;
      final inner = map['data'] is Map ? map['data'] as Map<String, dynamic> : map;
      final challengeId = inner['challengeId']?.toString() ?? map['challengeId']?.toString();
      if (challengeId != null && challengeId.isNotEmpty) {
        return ApiResponse.success(response.statusCode, challengeId);
      }
    }
    return ApiResponse.error(
      response.statusCode,
      response.errorMessage ?? 'Failed to request OTP challenge',
    );
  }

  /// Verifies OTP code with challengeId
  Future<ApiResponse<Map<String, dynamic>>> verifyOtp({
    required String challengeId,
    required String otpCode,
    required String phone,
    String? role,
  }) async {
    final cleanPhone = phone.trim().replaceAll(' ', '');
    final body = <String, dynamic>{
      'challengeId': challengeId,
      'otpCode': otpCode.trim(),
      'phone': cleanPhone,
    };
    if (role != null && role.isNotEmpty) body['role'] = role;

    final response = await _client.post(
      '/auth/otp/verify',
      body: body,
      retryOn401: false,
    );

    if (response.isSuccess && response.data is Map) {
      final map = response.data as Map<String, dynamic>;
      final inner = map['data'] is Map ? map['data'] as Map<String, dynamic> : map;
      final accessToken = inner['accessToken']?.toString() ?? map['accessToken']?.toString();
      final refreshToken = inner['refreshToken']?.toString() ?? map['refreshToken']?.toString();

      if (accessToken != null && refreshToken != null) {
        final userObj = inner['user'] is Map ? inner['user'] as Map<String, dynamic> : null;
        final userId = userObj?['id']?.toString() ?? inner['userId']?.toString();
        final patientObj = inner['patientProfile'] is Map
            ? inner['patientProfile'] as Map<String, dynamic>
            : (userObj?['patientProfile'] is Map ? userObj!['patientProfile'] as Map<String, dynamic> : null);
        final patientId = inner['patientId']?.toString() ?? patientObj?['id']?.toString();

        await SessionManager.instance.setSession(
          accessToken: accessToken,
          refreshToken: refreshToken,
          phone: cleanPhone,
          userId: userId,
          patientId: patientId,
        );
        return ApiResponse.success(response.statusCode, inner);
      }
    }

    return ApiResponse.error(
      response.statusCode,
      response.errorMessage ?? 'Failed to verify OTP code',
    );
  }

  /// Ensures an active authenticated session for the app, auto-authenticating with staging test identity if needed.
  Future<bool> ensureAuthenticatedSession() async {
    if (SessionManager.instance.isAuthenticated) {
      return true;
    }

    try {
      final reqRes = await requestOtp(ApiConstants.defaultPhone, role: 'PATIENT');
      if (!reqRes.isSuccess || reqRes.data == null) {
        return false;
      }

      final verRes = await verifyOtp(
        challengeId: reqRes.data!,
        otpCode: ApiConstants.defaultOtp,
        phone: ApiConstants.defaultPhone,
        role: 'PATIENT',
      );

      return verRes.isSuccess;
    } catch (_) {
      return false;
    }
  }
}

