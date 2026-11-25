import 'dart:convert';
import 'dart:io';

const String baseUrl = 'https://360api.vnvision.in/api/v1';
const String stagingPhone = '+16505550004';
const String stagingOtp = '123456';

Future<void> main() async {
  final client = HttpClient();
  client.connectionTimeout = const Duration(seconds: 15);

  final req = await client.openUrl('POST', Uri.parse('$baseUrl/auth/otp/request'));
  req.headers.set('Content-Type', 'application/json');
  req.add(utf8.encode(jsonEncode({'phone': stagingPhone})));
  final res1 = await req.close();
  final d1 = jsonDecode(await res1.transform(utf8.decoder).join());
  final challengeId = d1?['data']?['challengeId'] ?? d1?['challengeId'];

  if (challengeId == null) {
    print('Failed to get challengeId: $d1');
    exit(1);
  }

  final ver = await client.openUrl('POST', Uri.parse('$baseUrl/auth/otp/verify'));
  ver.headers.set('Content-Type', 'application/json');
  ver.add(utf8.encode(jsonEncode({
    'challengeId': challengeId,
    'otpCode': stagingOtp,
    'phone': stagingPhone,
  })));
  final res2 = await ver.close();
  final d2 = jsonDecode(await res2.transform(utf8.decoder).join());
  final accessToken = d2?['data']?['accessToken'] ?? d2?['accessToken'];
  final refreshToken = d2?['data']?['refreshToken'] ?? d2?['refreshToken'];

  if (accessToken == null || refreshToken == null) {
    print('Failed to get tokens: $d2');
    exit(1);
  }

  final sessionData = {
    'accessToken': accessToken,
    'refreshToken': refreshToken,
    'phone': stagingPhone,
    'patientId': '787e5187-7859-4320-bb1a-465a57dd086a',
    'userId': 'fd2a7ed3-7c81-496e-82b8-beefbdc9a8e6',
    'updatedAt': DateTime.now().toIso8601String(),
  };

  final file = File('test/device_session.json');
  await file.writeAsString(jsonEncode(sessionData));
  print('Saved valid staging session to test/device_session.json');
  exit(0);
}

