import 'package:flutter/foundation.dart';

class ApiConstants {
  ApiConstants._();

  static const String localBackendUrl = 'http://127.0.0.1:3000/api/v1';
  static const String hostedBackendUrl = 'https://360api.vnvision.in/api/v1';

  /// Compile-time flags to explicitly control target environment:
  /// e.g. flutter run --dart-define=USE_LOCAL_BACKEND=true
  /// or flutter run --dart-define=API_BASE_URL=http://127.0.0.1:3000/api/v1
  static const bool _explicitLocal = bool.fromEnvironment('USE_LOCAL_BACKEND', defaultValue: true);
  static const bool _explicitHosted = bool.fromEnvironment('USE_HOSTED_BACKEND', defaultValue: false);

  static String get baseUrl {
    const String custom = String.fromEnvironment('API_BASE_URL');
    if (custom.isNotEmpty) return custom;
    if (_explicitHosted) return hostedBackendUrl;
    if (_explicitLocal || kDebugMode) return localBackendUrl;
    return hostedBackendUrl;
  }

  // API Call Timeouts (Strict compliance with guidelines)
  static const Duration connectTimeout = Duration(seconds: 15);
  static const Duration receiveTimeout = Duration(seconds: 30);
  static const Duration fileDownloadTimeout = Duration(seconds: 15);

  // Staging Test Defaults
  static const String defaultPhone = '+16505550004';
  static const String defaultOtp = '123456';
  static const String defaultPatientId = '787e5187-7859-4320-bb1a-465a57dd086a';
  static const String defaultUserId = '04be3d93-a0c5-49e9-93a3-d14cbd80c115';
}
