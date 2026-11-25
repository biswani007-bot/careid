import 'dart:convert';
import 'dart:io';

void main() async {
  final client = HttpClient();
  
  // 1. Request OTP
  final req = await client.postUrl(Uri.parse('https://360api.vnvision.in/api/v1/auth/otp/request'));
  req.headers.set('Content-Type', 'application/json');
  req.write(jsonEncode({'phone': '+16505550004'}));
  final res = await req.close();
  final body = jsonDecode(await res.transform(utf8.decoder).join());
  final challengeId = body['data']['challengeId'];

  // 2. Verify OTP
  final req2 = await client.postUrl(Uri.parse('https://360api.vnvision.in/api/v1/auth/otp/verify'));
  req2.headers.set('Content-Type', 'application/json');
  req2.write(jsonEncode({'phone': '+16505550004', 'otpCode': '123456', 'challengeId': challengeId}));
  final res2 = await req2.close();
  final body2 = jsonDecode(await res2.transform(utf8.decoder).join());
  final token = body2['data']['accessToken'];
  print('Token issued: ${token != null}');

  // 3. Test GET /appointments
  final req3 = await client.getUrl(Uri.parse('https://360api.vnvision.in/api/v1/appointments'));
  req3.headers.set('Authorization', 'Bearer $token');
  final res3 = await req3.close();
  print('GET /appointments status: ${res3.statusCode}');
  print('GET /appointments body: ${await res3.transform(utf8.decoder).join()}');

  // 4. Test GET /records/dental
  final req4 = await client.getUrl(Uri.parse('https://360api.vnvision.in/api/v1/records/dental'));
  req4.headers.set('Authorization', 'Bearer $token');
  final res4 = await req4.close();
  print('GET /records/dental status: ${res4.statusCode}');
  print('GET /records/dental body: ${await res4.transform(utf8.decoder).join()}');

  // 5. Test GET /records/vision
  final req5 = await client.getUrl(Uri.parse('https://360api.vnvision.in/api/v1/records/vision'));
  req5.headers.set('Authorization', 'Bearer $token');
  final res5 = await req5.close();
  print('GET /records/vision status: ${res5.statusCode}');
  print('GET /records/vision body: ${await res5.transform(utf8.decoder).join()}');

  // 6. Test GET /records/favorites
  final req6 = await client.getUrl(Uri.parse('https://360api.vnvision.in/api/v1/records/favorites'));
  req6.headers.set('Authorization', 'Bearer $token');
  final res6 = await req6.close();
  print('GET /records/favorites status: ${res6.statusCode}');
  print('GET /records/favorites body: ${await res6.transform(utf8.decoder).join()}');

  // 7. Test GET /notifications/unread-count
  final req7 = await client.getUrl(Uri.parse('https://360api.vnvision.in/api/v1/notifications/unread-count'));
  req7.headers.set('Authorization', 'Bearer $token');
  final res7 = await req7.close();
  print('GET /notifications/unread-count status: ${res7.statusCode}');
  print('GET /notifications/unread-count body: ${await res7.transform(utf8.decoder).join()}');
}
