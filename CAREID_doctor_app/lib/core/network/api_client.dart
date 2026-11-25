import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import '../constants/api_constants.dart';
import '../routes/app_routes.dart';
import '../services/session_service.dart';

class ApiException implements Exception {
  final int statusCode;
  final String message;
  final String? error;
  final String? path;

  ApiException({
    required this.statusCode,
    required this.message,
    this.error,
    this.path,
  });

  @override
  String toString() => 'ApiException [$statusCode]: $message';
}

class ApiResponse<T> {
  final bool success;
  final int statusCode;
  final String message;
  final T? data;
  final Map<String, dynamic>? meta;

  ApiResponse({
    required this.success,
    required this.statusCode,
    required this.message,
    this.data,
    this.meta,
  });

  factory ApiResponse.fromJson(
    Map<String, dynamic> json,
    T Function(dynamic)? fromJsonT,
  ) {
    return ApiResponse<T>(
      success: json['success'] ?? false,
      statusCode: json['statusCode'] ?? 200,
      message: json['message'] ?? '',
      data: json['data'] != null && fromJsonT != null
          ? fromJsonT(json['data'])
          : json['data'] as T?,
      meta: json['meta'] as Map<String, dynamic>?,
    );
  }
}

class ApiClient {
  static final ApiClient _instance = ApiClient._internal();
  factory ApiClient() => _instance;
  ApiClient._internal();

  final SessionService _session = SessionService();
  final http.Client _httpClient = http.Client();

  static const Duration _timeout = Duration(seconds: 15);

  Uri _buildUri(String path, [Map<String, dynamic>? queryParameters]) {
    final String cleanPath = path.startsWith('/') ? path : '/$path';
    final fullUrl = '${ApiConstants.baseUrl}$cleanPath';
    if (queryParameters == null || queryParameters.isEmpty) {
      return Uri.parse(fullUrl);
    }
    final cleanParams = <String, String>{};
    queryParameters.forEach((key, value) {
      if (value != null) {
        cleanParams[key] = value.toString();
      }
    });
    return Uri.parse(fullUrl).replace(queryParameters: cleanParams);
  }

  Future<Map<String, String>> _headers({bool requiresAuth = true}) async {
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (requiresAuth) {
      final token = await _session.getAccessToken();
      if (token != null && token.isNotEmpty) {
        headers['Authorization'] = 'Bearer $token';
      }
    }
    return headers;
  }

  static bool get isTestEnvironment {
    try {
      return Platform.environment.containsKey('FLUTTER_TEST');
    } catch (_) {
      return false;
    }
  }

  Future<http.Response> _executeWithRefresh(
    Future<http.Response> Function() requestFn,
  ) async {
    if (isTestEnvironment) {
      throw ApiException(
        statusCode: 0,
        message: 'Network execution disabled in test environment.',
      );
    }
    try {
      final response = await requestFn().timeout(_timeout);
      if (response.statusCode == 401) {
        // Attempt silent token refresh
        final refreshed = await _refreshToken();
        if (refreshed) {
          // Retry original request with newly acquired token
          return await requestFn().timeout(_timeout);
        }
      }
      return response;
    } on SocketException {
      throw ApiException(
        statusCode: 0,
        message: 'No internet connection or cannot reach CareID backend.',
      );
    } on TimeoutException {
      throw ApiException(
        statusCode: 408,
        message: 'Connection timed out. Please try again.',
      );
    }
  }

  Future<bool> _refreshToken() async {
    final refreshToken = await _session.getRefreshToken();
    if (refreshToken == null || refreshToken.isEmpty) {
      return false;
    }
    try {
      final uri = _buildUri(ApiConstants.tokenRefresh);
      final response = await _httpClient.post(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'refreshToken': refreshToken}),
      ).timeout(_timeout);

      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        if (body['success'] == true && body['data'] != null) {
          final newAccessToken = body['data']['accessToken'] as String?;
          final newRefreshToken = body['data']['refreshToken'] as String? ?? refreshToken;
          if (newAccessToken != null) {
            await _session.saveAuthTokens(
              accessToken: newAccessToken,
              refreshToken: newRefreshToken,
            );
            return true;
          }
        }
      }
      await _session.clearSession();
      AppRoutes.navigatorKey.currentState?.pushNamedAndRemoveUntil(AppRoutes.login, (route) => false);
      return false;
    } catch (_) {
      return false;
    }
  }

  ApiResponse<T> _processResponse<T>(
    http.Response response,
    T Function(dynamic)? fromJsonT,
  ) {
    dynamic decoded;
    try {
      decoded = jsonDecode(utf8.decode(response.bodyBytes));
    } catch (e) {
      throw ApiException(
        statusCode: response.statusCode,
        message: 'Invalid response format from server: ${response.body}',
      );
    }

    if (decoded is! Map<String, dynamic>) {
      throw ApiException(
        statusCode: response.statusCode,
        message: 'Server returned unexpected response structure.',
      );
    }

    final success = decoded['success'] == true;
    final statusCode = decoded['statusCode'] ?? response.statusCode;
    final message = decoded['message']?.toString() ?? 'Operation completed';
    final error = decoded['error']?.toString();
    final path = decoded['meta']?['path']?.toString();

    if (!success || statusCode >= 400) {
      throw ApiException(
        statusCode: statusCode,
        message: message.isNotEmpty ? message : (error ?? 'Request failed with status $statusCode'),
        error: error,
        path: path,
      );
    }

    return ApiResponse.fromJson(decoded, fromJsonT);
  }

  // HTTP GET
  Future<ApiResponse<T>> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    bool requiresAuth = true,
    T Function(dynamic)? fromJsonT,
  }) async {
    final response = await _executeWithRefresh(() async {
      final uri = _buildUri(path, queryParameters);
      final headers = await _headers(requiresAuth: requiresAuth);
      return _httpClient.get(uri, headers: headers);
    });
    return _processResponse<T>(response, fromJsonT);
  }

  // HTTP POST
  Future<ApiResponse<T>> post<T>(
    String path, {
    dynamic body,
    Map<String, dynamic>? queryParameters,
    bool requiresAuth = true,
    T Function(dynamic)? fromJsonT,
  }) async {
    final response = await _executeWithRefresh(() async {
      final uri = _buildUri(path, queryParameters);
      final headers = await _headers(requiresAuth: requiresAuth);
      return _httpClient.post(
        uri,
        headers: headers,
        body: body != null ? jsonEncode(body) : null,
      );
    });
    return _processResponse<T>(response, fromJsonT);
  }

  // HTTP PUT
  Future<ApiResponse<T>> put<T>(
    String path, {
    dynamic body,
    Map<String, dynamic>? queryParameters,
    bool requiresAuth = true,
    T Function(dynamic)? fromJsonT,
  }) async {
    final response = await _executeWithRefresh(() async {
      final uri = _buildUri(path, queryParameters);
      final headers = await _headers(requiresAuth: requiresAuth);
      return _httpClient.put(
        uri,
        headers: headers,
        body: body != null ? jsonEncode(body) : null,
      );
    });
    return _processResponse<T>(response, fromJsonT);
  }

  // HTTP PATCH
  Future<ApiResponse<T>> patch<T>(
    String path, {
    dynamic body,
    Map<String, dynamic>? queryParameters,
    bool requiresAuth = true,
    T Function(dynamic)? fromJsonT,
  }) async {
    final response = await _executeWithRefresh(() async {
      final uri = _buildUri(path, queryParameters);
      final headers = await _headers(requiresAuth: requiresAuth);
      return _httpClient.patch(
        uri,
        headers: headers,
        body: body != null ? jsonEncode(body) : null,
      );
    });
    return _processResponse<T>(response, fromJsonT);
  }

  // HTTP DELETE
  Future<ApiResponse<T>> delete<T>(
    String path, {
    dynamic body,
    Map<String, dynamic>? queryParameters,
    bool requiresAuth = true,
    T Function(dynamic)? fromJsonT,
  }) async {
    final response = await _executeWithRefresh(() async {
      final uri = _buildUri(path, queryParameters);
      final headers = await _headers(requiresAuth: requiresAuth);
      return _httpClient.delete(
        uri,
        headers: headers,
        body: body != null ? jsonEncode(body) : null,
      );
    });
    return _processResponse<T>(response, fromJsonT);
  }

  // HTTP Multipart Upload
  Future<ApiResponse<T>> uploadMultipart<T>(
    String path, {
    required String filePath,
    required String fileFieldName,
    Map<String, String>? fields,
    bool requiresAuth = true,
    T Function(dynamic)? fromJsonT,
  }) async {
    final uri = _buildUri(path);
    final request = http.MultipartRequest('POST', uri);
    
    if (requiresAuth) {
      final token = await _session.getAccessToken();
      if (token != null && token.isNotEmpty) {
        request.headers['Authorization'] = 'Bearer $token';
      }
    }
    request.headers['Accept'] = 'application/json';

    if (fields != null) {
      request.fields.addAll(fields);
    }

    final multipartFile = await http.MultipartFile.fromPath(fileFieldName, filePath);
    request.files.add(multipartFile);

    if (isTestEnvironment) {
      throw ApiException(
        statusCode: 0,
        message: 'Network execution disabled in test environment.',
      );
    }

    try {
      final streamedResponse = await request.send().timeout(_timeout);
      final response = await http.Response.fromStream(streamedResponse);
      return _processResponse<T>(response, fromJsonT);
    } on SocketException {
      throw ApiException(
        statusCode: 0,
        message: 'No internet connection or cannot reach CareID backend.',
      );
    } on TimeoutException {
      throw ApiException(
        statusCode: 408,
        message: 'Connection timed out. Please try again.',
      );
    }
  }
}


