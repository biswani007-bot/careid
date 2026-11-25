import 'dart:convert';
import 'dart:io';

const String baseUrl = 'https://360api.vnvision.in/api/v1';
const String stagingPhone = '+16505550004';
const String stagingOtp = '123456';

Future<void> main() async {
  final client = HttpClient();
  client.connectionTimeout = const Duration(seconds: 15);

  print('=== TESTING STAGING AUTH BOUNDARIES ===');

  // Helper
  Future<Map<String, dynamic>> post(String path, Map<String, dynamic> body, {String? token}) async {
    final req = await client.openUrl('POST', Uri.parse('$baseUrl$path'));
    req.headers.set('Content-Type', 'application/json');
    if (token != null) req.headers.set('Authorization', 'Bearer $token');
    req.add(utf8.encode(jsonEncode(body)));
    final res = await req.close();
    final bodyStr = await res.transform(utf8.decoder).join();
    dynamic data;
    try { data = jsonDecode(bodyStr); } catch (_) { data = bodyStr; }
    return {'statusCode': res.statusCode, 'data': data};
  }

  // 1. Test Incorrect OTP
  print('\n[A] Testing Incorrect OTP (999999)...');
  final req1 = await post('/auth/otp/request', {'phone': stagingPhone});
  String? challengeId = req1['data']?['data']?['challengeId'] ?? req1['data']?['challengeId'];
  print('Challenge ID: $challengeId (HTTP ${req1['statusCode']})');

  if (challengeId != null) {
    final badOtp = await post('/auth/otp/verify', {
      'challengeId': challengeId,
      'otpCode': '999999',
      'phone': stagingPhone,
    });
    print('Incorrect OTP Result: HTTP ${badOtp['statusCode']}, Body: ${jsonEncode(badOtp['data'])}');
  }

  // 2. Test Expired / Invalid Challenge ID
  print('\n[B] Testing Invalid Challenge ID...');
  final badChallenge = await post('/auth/otp/verify', {
    'challengeId': '00000000-0000-0000-0000-000000000000',
    'otpCode': stagingOtp,
    'phone': stagingPhone,
  });
  print('Invalid Challenge Result: HTTP ${badChallenge['statusCode']}, Body: ${jsonEncode(badChallenge['data'])}');

  // 3. Test Genuine OTP Verify & Token Refresh
  print('\n[C] Testing Genuine OTP Verify & Token Refresh...');
  final req2 = await post('/auth/otp/request', {'phone': stagingPhone});
  String? validChallenge = req2['data']?['data']?['challengeId'] ?? req2['data']?['challengeId'];
  
  if (validChallenge != null) {
    final goodOtp = await post('/auth/otp/verify', {
      'challengeId': validChallenge,
      'otpCode': stagingOtp,
      'phone': stagingPhone,
    });
    print('Genuine OTP Verify Result: HTTP ${goodOtp['statusCode']}');
    final refreshTok = goodOtp['data']?['data']?['refreshToken'] ?? goodOtp['data']?['refreshToken'];
    final accessTok = goodOtp['data']?['data']?['accessToken'] ?? goodOtp['data']?['accessToken'];
    print('Access Token received: ${accessTok != null ? "YES (Valid JWT)" : "NO"}');
    print('Refresh Token received: ${refreshTok != null ? "YES (Valid JWT)" : "NO"}');

    if (refreshTok != null) {
      final refreshRes = await post('/auth/token/refresh', {'refreshToken': refreshTok});
      print('Token Refresh Result: HTTP ${refreshRes['statusCode']}, Body: ${jsonEncode(refreshRes['data'])}');
    }
  }

  exit(0);
}

