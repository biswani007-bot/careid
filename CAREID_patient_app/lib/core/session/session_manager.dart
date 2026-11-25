import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../network/api_constants.dart';

class SessionManager extends ChangeNotifier {
  static final SessionManager _instance = SessionManager._internal();
  factory SessionManager() => _instance;
  static SessionManager get instance => _instance;

  SessionManager._internal();

  static const _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(
      resetOnError: true,
    ),
  );

  static const String _kAccessToken = 'careid_access_token';
  static const String _kRefreshToken = 'careid_refresh_token';
  static const String _kPhone = 'careid_phone';
  static const String _kPatientId = 'careid_patient_id';
  static const String _kUserId = 'careid_user_id';
  static const String _kChallengeId = 'careid_challenge_id';

  String? _accessToken;
  String? _refreshToken;
  String? _lastChallengeId;
  String _phone = ApiConstants.defaultPhone;
  String _patientId = ApiConstants.defaultPatientId;
  String _userId = ApiConstants.defaultUserId;
  bool _isAuthenticated = false;

  String? get accessToken => _accessToken;
  String? get refreshToken => _refreshToken;
  String? get lastChallengeId => _lastChallengeId;
  String get phone => _phone;
  String get patientId => _patientId;
  String get userId => _userId;
  bool get isAuthenticated => _isAuthenticated && _accessToken != null && _accessToken!.isNotEmpty;

  /// Inspects JWT exp claim to detect expiration without requiring third-party library
  static bool isJwtExpired(String? token, {int bufferSeconds = 60}) {
    if (token == null || token.isEmpty) return true;
    try {
      final parts = token.split('.');
      if (parts.length != 3) return false;
      final normalized = base64Url.normalize(parts[1]);
      final payloadString = utf8.decode(base64Url.decode(normalized));
      final payload = jsonDecode(payloadString) as Map<String, dynamic>;
      if (payload['exp'] == null) return false;
      final exp = payload['exp'] as int;
      final now = DateTime.now().millisecondsSinceEpoch ~/ 1000;
      return now >= (exp - bufferSeconds);
    } catch (_) {
      return false;
    }
  }

  bool isAccessTokenExpired({int bufferSeconds = 60}) =>
      isJwtExpired(_accessToken, bufferSeconds: bufferSeconds);

  bool isRefreshTokenExpired({int bufferSeconds = 60}) =>
      isJwtExpired(_refreshToken, bufferSeconds: bufferSeconds);

  void _cleanupLegacyPlaintextFile() {
    try {
      if (Platform.isAndroid) {
        const paths = [
          '/data/user/0/com.example.care_id_doctor_app/files/careid_session.json',
          '/data/data/com.example.care_id_doctor_app/files/careid_session.json',
        ];
        for (final p in paths) {
          final f = File(p);
          if (f.existsSync()) {
            f.deleteSync();
          }
        }
      }
    } catch (_) {}
  }

  Future<void> init() async {
    try {
      // 1. Primary & Exclusive: Hardware-backed Keystore FlutterSecureStorage
      String? token;
      String? refresh;
      String? phone;
      String? patientId;
      String? userId;

      try {
        token = await _storage.read(key: _kAccessToken);
        refresh = await _storage.read(key: _kRefreshToken);
        phone = await _storage.read(key: _kPhone);
        patientId = await _storage.read(key: _kPatientId);
        userId = await _storage.read(key: _kUserId);
      } catch (_) {
        // Secure storage platform channel might fail in unit test environment
      }

      // Security hardening: purge any legacy unencrypted session file from disk
      _cleanupLegacyPlaintextFile();

      if (token != null && token.isNotEmpty && refresh != null && refresh.isNotEmpty) {
        _accessToken = token;
        _refreshToken = refresh;
        if (phone != null && phone.isNotEmpty) _phone = phone;
        if (patientId != null && patientId.isNotEmpty) _patientId = patientId;
        if (userId != null && userId.isNotEmpty) _userId = userId;
        _isAuthenticated = true;
        notifyListeners();
      }
    } catch (_) {}
  }

  void setChallengeId(String challengeId) {
    _lastChallengeId = challengeId;
    _storage.write(key: _kChallengeId, value: challengeId).catchError((_) {});
  }

  void setPhone(String phone) {
    _phone = phone;
    _storage.write(key: _kPhone, value: phone).catchError((_) {});
  }

  Future<void> setSession({
    required String accessToken,
    required String refreshToken,
    String? phone,
    String? patientId,
    String? userId,
  }) async {
    _accessToken = accessToken;
    _refreshToken = refreshToken;
    if (phone != null && phone.isNotEmpty) _phone = phone;
    if (patientId != null && patientId.isNotEmpty) _patientId = patientId;
    if (userId != null && userId.isNotEmpty) _userId = userId;
    _isAuthenticated = true;

    await _persistAll();
    notifyListeners();
  }

  Future<void> updateTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    _accessToken = accessToken;
    _refreshToken = refreshToken;

    try {
      await _storage.write(key: _kAccessToken, value: accessToken);
      await _storage.write(key: _kRefreshToken, value: refreshToken);
    } catch (_) {}

    notifyListeners();
  }

  Future<void> updatePatientId(String patientId) async {
    _patientId = patientId;
    try {
      await _storage.write(key: _kPatientId, value: patientId);
    } catch (_) {}
    notifyListeners();
  }

  Future<void> _persistAll() async {
    try {
      if (_accessToken != null) await _storage.write(key: _kAccessToken, value: _accessToken!);
      if (_refreshToken != null) await _storage.write(key: _kRefreshToken, value: _refreshToken!);
      await _storage.write(key: _kPhone, value: _phone);
      await _storage.write(key: _kPatientId, value: _patientId);
      await _storage.write(key: _kUserId, value: _userId);
    } catch (_) {}
  }

  Future<void> clearSession() async {
    _accessToken = null;
    _refreshToken = null;
    _lastChallengeId = null;
    _isAuthenticated = false;

    try {
      await _storage.deleteAll();
    } catch (_) {}

    _cleanupLegacyPlaintextFile();

    notifyListeners();
  }
}
