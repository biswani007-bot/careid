import 'dart:async';
import 'dart:convert';
import 'dart:io';

/// Expected synthetic PATIENT-only integration account constants.
class E2eAccount {
  E2eAccount._();

  static const String phone = '+16505550004';
  static const String userId = '88e35929-d3e0-41a4-856a-c9696bf22dea';
  static const String patientProfileId = '3896bc97-bd3b-40ae-80c1-0cc0455ca3a4';
  static const String firstName = 'John';
  static const String lastName = 'Doe';
  static const String patientNumber = 'PT-CAREID-2026-0004';
  static const String healthCardNumber = 'HC-CAREID-2026-0004';
  static const String openedTreatmentOfferId =
      'b4058785-ded3-4c1e-8c8a-e3a09c5bcfeb';
  static const String petId = '0b3269ab-1841-47f6-beca-a4ae2a9cbdc9';
  static const String petName = 'Barnaby';
}

/// Resolves and strictly validates the Integration Backend base URL using a positive allowlist.
class E2eConfig {
  E2eConfig._();

  static const String defaultBaseUrl = 'http://127.0.0.1:3001/api/v1';

  static String resolveBaseUrl() {
    const fromDefine = String.fromEnvironment('API_BASE_URL');
    final fromEnv = Platform.environment['API_BASE_URL'] ?? '';
    final raw = fromDefine.trim().isNotEmpty
        ? fromDefine.trim()
        : (fromEnv.trim().isNotEmpty ? fromEnv.trim() : defaultBaseUrl);

    final normalized =
        raw.endsWith('/') ? raw.substring(0, raw.length - 1) : raw;
    final uri = Uri.tryParse(normalized);
    if (uri == null) {
      throw StateError('Invalid API_BASE_URL: $raw');
    }

    final validScheme = uri.scheme == 'http';
    final validHost = uri.host == '127.0.0.1' || uri.host == 'localhost';
    final validPort = uri.port == 3001;
    final validPath = uri.path.endsWith('/api/v1');

    if (!validScheme || !validHost || !validPort || !validPath) {
      throw StateError(
        'API_BASE_URL failed positive allowlist check (must be http://127.0.0.1:3001/api/v1 or http://localhost:3001/api/v1): $raw',
      );
    }

    return normalized;
  }
}

class E2eHttpResponse {
  final int statusCode;
  final String body;
  final dynamic json;
  final Map<String, List<String>> headers;

  const E2eHttpResponse({
    required this.statusCode,
    required this.body,
    required this.json,
    required this.headers,
  });

  bool get is2xx => statusCode >= 200 && statusCode < 300;

  Map<String, dynamic>? get jsonMap =>
      json is Map<String, dynamic> ? json as Map<String, dynamic> : null;

  dynamic get data {
    final map = jsonMap;
    if (map != null && map.containsKey('data')) {
      return map['data'];
    }
    return json;
  }

  Map<String, dynamic>? get dataMap =>
      data is Map<String, dynamic> ? data as Map<String, dynamic> : null;

  List<dynamic>? get dataList => data is List<dynamic> ? data as List<dynamic> : null;

  Map<String, dynamic>? get metaMap {
    final map = jsonMap;
    if (map != null && map['meta'] is Map<String, dynamic>) {
      return map['meta'] as Map<String, dynamic>;
    }
    return null;
  }

  String get message {
    final map = jsonMap;
    if (map == null) return body;
    final msg = map['message'];
    if (msg is List) return msg.join('; ');
    return msg?.toString() ?? body;
  }
}

class E2eHttpClient {
  final String baseUrl;
  final HttpClient _client;

  E2eHttpClient({String? baseUrl})
      : baseUrl = baseUrl ?? E2eConfig.resolveBaseUrl(),
        _client = HttpClient()
          ..connectionTimeout = const Duration(seconds: 15);

  Uri buildUri(String path, {Map<String, String>? queryParameters}) {
    final cleanPath = path.startsWith('/') ? path : '/$path';
    final rawUrl = '$baseUrl$cleanPath';
    final uri = Uri.parse(rawUrl);
    if (queryParameters == null || queryParameters.isEmpty) {
      return uri;
    }
    final merged = Map<String, String>.from(uri.queryParameters)
      ..addAll(queryParameters);
    return uri.replace(queryParameters: merged);
  }

  Future<E2eHttpResponse> request(
    String method,
    String path, {
    String? bearerToken,
    Object? body,
    Map<String, String>? queryParameters,
    Map<String, String>? extraHeaders,
  }) async {
    final uri = buildUri(path, queryParameters: queryParameters);
    final req = await _client.openUrl(method.toUpperCase(), uri);
    req.headers.set(HttpHeaders.acceptHeader, 'application/json');
    if (bearerToken != null && bearerToken.isNotEmpty) {
      req.headers.set(HttpHeaders.authorizationHeader, 'Bearer $bearerToken');
    }
    if (extraHeaders != null) {
      for (final entry in extraHeaders.entries) {
        req.headers.set(entry.key, entry.value);
      }
    }
    if (body != null) {
      req.headers.contentType = ContentType.json;
      final encoded = body is String ? body : jsonEncode(body);
      req.write(encoded);
    }

    final resp = await req.close().timeout(const Duration(seconds: 30));
    final respBody = await resp.transform(utf8.decoder).join();

    final headers = <String, List<String>>{};
    resp.headers.forEach((name, values) {
      headers[name] = List<String>.from(values);
    });

    dynamic parsed;
    if (respBody.trim().isNotEmpty) {
      try {
        parsed = jsonDecode(respBody);
      } catch (_) {
        parsed = null;
      }
    }

    return E2eHttpResponse(
      statusCode: resp.statusCode,
      body: respBody,
      json: parsed,
      headers: headers,
    );
  }

  Future<E2eHttpResponse> get(
    String path, {
    String? bearerToken,
    Map<String, String>? queryParameters,
  }) =>
      request(
        'GET',
        path,
        bearerToken: bearerToken,
        queryParameters: queryParameters,
      );

  Future<E2eHttpResponse> post(
    String path, {
    String? bearerToken,
    Object? body,
    Map<String, String>? queryParameters,
  }) =>
      request(
        'POST',
        path,
        bearerToken: bearerToken,
        body: body,
        queryParameters: queryParameters,
      );

  Future<E2eHttpResponse> put(
    String path, {
    String? bearerToken,
    Object? body,
    Map<String, String>? queryParameters,
  }) =>
      request(
        'PUT',
        path,
        bearerToken: bearerToken,
        body: body,
        queryParameters: queryParameters,
      );

  Future<E2eHttpResponse> patch(
    String path, {
    String? bearerToken,
    Object? body,
    Map<String, String>? queryParameters,
  }) =>
      request(
        'PATCH',
        path,
        bearerToken: bearerToken,
        body: body,
        queryParameters: queryParameters,
      );

  Future<E2eHttpResponse> delete(
    String path, {
    String? bearerToken,
    Object? body,
    Map<String, String>? queryParameters,
  }) =>
      request(
        'DELETE',
        path,
        bearerToken: bearerToken,
        body: body,
        queryParameters: queryParameters,
      );

  void close() {
    _client.close(force: true);
  }
}

class E2eSession {
  final E2eHttpClient client;
  String? accessToken;
  String? refreshToken;
  String? userId;
  String? patientProfileId;
  String? challengeId;
  String? lastOtpCode;
  String phone;

  E2eSession(this.client, {this.phone = E2eAccount.phone});

  bool get isAuthenticated =>
      accessToken != null &&
      accessToken!.isNotEmpty &&
      refreshToken != null &&
      refreshToken!.isNotEmpty;

  Future<String> requestOtp({String? phoneOverride}) async {
    final targetPhone = phoneOverride ?? phone;
    final res = await client.post(
      '/auth/otp/request',
      body: {'phone': targetPhone},
    );
    E2eAssert.status(res, 200, context: 'POST /auth/otp/request');
    final id = res.dataMap?['challengeId']?.toString() ?? '';
    E2eAssert.isTrue(id.isNotEmpty, 'challengeId must be non-empty');
    challengeId = id;
    return id;
  }

  Future<String> fetchLatestOtpFromSandbox({String? phoneOverride}) async {
    final targetPhone = phoneOverride ?? phone;
    final res = await client.get(
      '/test-support/sms-inbox/latest',
      queryParameters: {'phone': targetPhone},
    );
    E2eAssert.status(res, 200, context: 'GET /test-support/sms-inbox/latest');
    final code = res.dataMap?['otpCode']?.toString() ?? '';
    E2eAssert.isTrue(
      RegExp(r'^\d{6}$').hasMatch(code),
      'Sandbox OTP must be 6 digits, got "$code"',
    );
    lastOtpCode = code;
    return code;
  }

  Future<Map<String, dynamic>> verifyOtp({
    required String challengeId,
    required String otpCode,
  }) async {
    final res = await client.post(
      '/auth/otp/verify',
      body: {'challengeId': challengeId, 'otpCode': otpCode},
    );
    E2eAssert.status(res, 200, context: 'POST /auth/otp/verify');
    final data = res.dataMap;
    E2eAssert.isNotNull(data, 'verifyOtp data must be a JSON object');
    accessToken = data!['accessToken']?.toString();
    refreshToken = data['refreshToken']?.toString();
    final user = data['user'] is Map<String, dynamic>
        ? data['user'] as Map<String, dynamic>
        : null;
    userId = user?['id']?.toString();
    E2eAssert.isTrue(
      accessToken != null && accessToken!.isNotEmpty,
      'accessToken must be non-empty',
    );
    E2eAssert.isTrue(
      refreshToken != null && refreshToken!.isNotEmpty,
      'refreshToken must be non-empty',
    );
    return data;
  }

  Future<void> loginPatient() async {
    final cid = await requestOtp();
    final otp = await fetchLatestOtpFromSandbox();
    await verifyOtp(challengeId: cid, otpCode: otp);
    final profileRes = await client.get(
      '/patients/me/full',
      bearerToken: accessToken,
    );
    E2eAssert.status(profileRes, 200, context: 'GET /patients/me/full on login');
    patientProfileId = profileRes.dataMap?['id']?.toString();
  }

  Future<void> refreshTokens() async {
    E2eAssert.isNotNull(refreshToken, 'refreshToken required to refresh');
    final res = await client.post(
      '/auth/token/refresh',
      body: {'refreshToken': refreshToken},
    );
    E2eAssert.status(res, 200, context: 'POST /auth/token/refresh');
    final data = res.dataMap;
    E2eAssert.isNotNull(data, 'refresh data must be map');
    accessToken = data!['accessToken']?.toString();
    refreshToken = data['refreshToken']?.toString();
    E2eAssert.isTrue(
      accessToken != null && accessToken!.isNotEmpty,
      'refreshed accessToken must be non-empty',
    );
    E2eAssert.isTrue(
      refreshToken != null && refreshToken!.isNotEmpty,
      'refreshed refreshToken must be non-empty',
    );
  }

  Future<void> logout() async {
    if (!isAuthenticated) return;
    await client.post(
      '/auth/logout',
      bearerToken: accessToken,
      body: {'refreshToken': refreshToken},
    );
    accessToken = null;
    refreshToken = null;
  }
}

/// Shared execution context passed across Tiers 1-4 when run via run_all_dart_e2e.dart.
class E2eContext {
  final E2eHttpClient client;
  final E2eSession session;
  final Map<String, dynamic> cache = {};

  E2eContext(this.client, this.session);

  Future<void> ensureLoggedIn() async {
    if (!session.isAuthenticated) {
      await session.loginPatient();
    }
  }
}

class E2eAssertionError implements Exception {
  final String message;
  E2eAssertionError(this.message);

  @override
  String toString() => 'E2eAssertionError: $message';
}

class E2eAssert {
  E2eAssert._();

  static void isTrue(bool condition, String message) {
    if (!condition) {
      throw E2eAssertionError(message);
    }
  }

  static void isFalse(bool condition, String message) {
    if (condition) {
      throw E2eAssertionError(message);
    }
  }

  static void isNotNull(Object? value, String message) {
    if (value == null) {
      throw E2eAssertionError(message);
    }
  }

  static void equals(Object? actual, Object? expected, String message) {
    if (actual != expected) {
      throw E2eAssertionError('$message (expected: $expected, actual: $actual)');
    }
  }

  static void notEquals(Object? actual, Object? unexpected, String message) {
    if (actual == unexpected) {
      throw E2eAssertionError('$message (unexpectedly equal to: $unexpected)');
    }
  }

  static void greaterOrEqual(num actual, num min, String message) {
    if (actual < min) {
      throw E2eAssertionError('$message (expected >= $min, actual: $actual)');
    }
  }

  static void status(
    E2eHttpResponse res,
    int expectedStatus, {
    String context = '',
  }) {
    if (res.statusCode != expectedStatus) {
      final prefix = context.isEmpty ? '' : '$context: ';
      throw E2eAssertionError(
        '${prefix}expected HTTP $expectedStatus, got ${res.statusCode}. Body: ${_truncate(res.body)}',
      );
    }
  }

  static void statusIn(
    E2eHttpResponse res,
    List<int> allowedStatuses, {
    String context = '',
  }) {
    if (!allowedStatuses.contains(res.statusCode)) {
      final prefix = context.isEmpty ? '' : '$context: ';
      throw E2eAssertionError(
        '${prefix}expected HTTP in $allowedStatuses, got ${res.statusCode}. Body: ${_truncate(res.body)}',
      );
    }
  }

  static void hasKeys(
    Map<String, dynamic> map,
    List<String> keys, {
    String context = '',
  }) {
    for (final k in keys) {
      if (!map.containsKey(k)) {
        final prefix = context.isEmpty ? '' : '$context: ';
        throw E2eAssertionError('${prefix}missing required key "$k"');
      }
    }
  }

  static void contains(String haystack, String needle, String message) {
    if (!haystack.contains(needle)) {
      throw E2eAssertionError(
        '$message (missing "$needle" in "${_truncate(haystack)}")',
      );
    }
  }

  static void doesNotContain(String haystack, String needle, String message) {
    if (haystack.contains(needle)) {
      throw E2eAssertionError('$message (unexpectedly found "$needle")');
    }
  }

  static String _truncate(String s, {int max = 240}) =>
      s.length <= max ? s : '${s.substring(0, max)}...';
}

/// Safely reads notification preferences, executes [action], and always restores exact original 5 booleans in `finally`.
Future<void> withRestoredNotificationPreferences(
  E2eHttpClient client,
  String bearerToken,
  Future<void> Function(Map<String, bool> original5) action,
) async {
  final getRes = await client.get(
    '/notifications/preferences',
    bearerToken: bearerToken,
  );
  E2eAssert.status(getRes, 200, context: 'Read original notification preferences');
  final raw = getRes.dataMap;
  E2eAssert.isNotNull(raw, 'Notification preferences payload must be map');

  final original5 = <String, bool>{
    'emailEnabled': raw!['emailEnabled'] == true,
    'smsEnabled': raw['smsEnabled'] == true,
    'pushEnabled': raw['pushEnabled'] == true,
    'inAppEnabled': raw['inAppEnabled'] == true,
    'webhookEnabled': raw['webhookEnabled'] == true,
  };

  try {
    await action(original5);
  } finally {
    final restoreRes = await client.put(
      '/notifications/preferences',
      bearerToken: bearerToken,
      body: original5,
    );
    E2eAssert.status(
      restoreRes,
      200,
      context: 'Restore original notification preferences in finally',
    );
  }
}

class E2eTestCase {
  final String feature;
  final String name;
  final Future<void> Function() body;

  const E2eTestCase({
    required this.feature,
    required this.name,
    required this.body,
  });
}

class E2eTierResult {
  final String tierName;
  final int total;
  final int passed;
  final int failed;
  final Map<String, int> perFeatureCounts;
  final List<String> failures;

  const E2eTierResult({
    required this.tierName,
    required this.total,
    required this.passed,
    required this.failed,
    required this.perFeatureCounts,
    required this.failures,
  });
}

class E2eTestRunner {
  final String tierName;
  final List<E2eTestCase> _cases = [];

  E2eTestRunner(this.tierName);

  void test(String feature, String name, Future<void> Function() body) {
    _cases.add(E2eTestCase(feature: feature, name: name, body: body));
  }

  int get count => _cases.length;

  Future<E2eTierResult> run() async {
    stdout.writeln('');
    stdout.writeln('=== $tierName (${_cases.length} cases) ===');
    var passed = 0;
    var failed = 0;
    final perFeature = <String, int>{};
    final failures = <String>[];

    for (var i = 0; i < _cases.length; i++) {
      final tc = _cases[i];
      perFeature[tc.feature] = (perFeature[tc.feature] ?? 0) + 1;
      final label = '[${tc.feature}] ${tc.name}';
      try {
        await tc.body();
        passed++;
        stdout.writeln('[PASS] (${i + 1}/${_cases.length}) $label');
      } catch (e, st) {
        failed++;
        final msg = '[FAIL] (${i + 1}/${_cases.length}) $label -> $e';
        stdout.writeln(msg);
        stderr.writeln('$msg\n$st');
        failures.add(msg);
      }
    }

    stdout.writeln(
      '--- $tierName Summary: $passed/${_cases.length} passed, $failed failed ---',
    );
    return E2eTierResult(
      tierName: tierName,
      total: _cases.length,
      passed: passed,
      failed: failed,
      perFeatureCounts: perFeature,
      failures: failures,
    );
  }
}
