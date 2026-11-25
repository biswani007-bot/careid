import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:care_id_patient_app/core/session/session_manager.dart';

String createTestJwt(int expTimestamp) {
  final header = base64Url.encode(utf8.encode(jsonEncode({'alg': 'HS256', 'typ': 'JWT'})));
  final payload = base64Url.encode(utf8.encode(jsonEncode({'sub': 'user1', 'exp': expTimestamp})));
  return '$header.$payload.signature';
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('SessionManager Persistence & Expiration Tests', () {
    test('isJwtExpired identifies expired and active tokens', () {
      final nowSec = DateTime.now().millisecondsSinceEpoch ~/ 1000;

      // Expired token (exp 1 hour ago)
      final expiredToken = createTestJwt(nowSec - 3600);
      expect(SessionManager.isJwtExpired(expiredToken), isTrue);

      // Active token (exp 1 hour in future)
      final activeToken = createTestJwt(nowSec + 3600);
      expect(SessionManager.isJwtExpired(activeToken), isFalse);

      // Null or empty token
      expect(SessionManager.isJwtExpired(null), isTrue);
      expect(SessionManager.isJwtExpired(''), isTrue);
    });

    test('setSession sets authenticated state and session credentials', () async {
      final sm = SessionManager.instance;
      await sm.clearSession();
      expect(sm.isAuthenticated, isFalse);

      await sm.setSession(
        accessToken: 'mock_access_token_123',
        refreshToken: 'mock_refresh_token_456',
        phone: '+16505550004',
        patientId: 'patient_uuid_789',
        userId: 'user_uuid_101',
      );

      expect(sm.isAuthenticated, isTrue);
      expect(sm.accessToken, equals('mock_access_token_123'));
      expect(sm.refreshToken, equals('mock_refresh_token_456'));
      expect(sm.phone, equals('+16505550004'));
      expect(sm.patientId, equals('patient_uuid_789'));
      expect(sm.userId, equals('user_uuid_101'));

      await sm.clearSession();
      expect(sm.isAuthenticated, isFalse);
      expect(sm.accessToken, isNull);
      expect(sm.refreshToken, isNull);
    });
  });
}
