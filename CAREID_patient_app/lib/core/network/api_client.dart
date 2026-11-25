import 'dart:async';
import 'dart:convert';
import 'dart:io';
import '../session/session_manager.dart';
import 'api_constants.dart';

class ApiResponse<T> {
  final int statusCode;
  final T? data;
  final bool isSuccess;
  final String? errorMessage;

  const ApiResponse({
    required this.statusCode,
    this.data,
    required this.isSuccess,
    this.errorMessage,
  });

  factory ApiResponse.success(int statusCode, T data) {
    return ApiResponse(
      statusCode: statusCode,
      data: data,
      isSuccess: true,
    );
  }

  factory ApiResponse.error(int statusCode, String message, [T? data]) {
    return ApiResponse(
      statusCode: statusCode,
      data: data,
      isSuccess: false,
      errorMessage: message,
    );
  }
}

class ApiClient {
  static final ApiClient _instance = ApiClient._internal();
  factory ApiClient() => _instance;
  static ApiClient get instance => _instance;

  final HttpClient _httpClient;

  ApiClient._internal() : _httpClient = HttpClient() {
    _httpClient.connectionTimeout = ApiConstants.connectTimeout;
    _httpClient.idleTimeout = const Duration(seconds: 15);
  }

  Uri _buildUri(String path, [Map<String, dynamic>? queryParams]) {
    String cleanPath = path.startsWith('/') ? path : '/$path';
    // Prevent duplicate /api/v1 prefix if path already includes it
    if (cleanPath.startsWith('/api/v1/')) {
      cleanPath = cleanPath.substring('/api/v1'.length);
    } else if (cleanPath == '/api/v1') {
      cleanPath = '/';
    }
    final String base = ApiConstants.baseUrl.endsWith('/')
        ? ApiConstants.baseUrl.substring(0, ApiConstants.baseUrl.length - 1)
        : ApiConstants.baseUrl;
    final String fullUrl = '$base$cleanPath';
    final Uri baseUri = Uri.parse(fullUrl);

    if (queryParams != null && queryParams.isNotEmpty) {
      final Map<String, String> stringParams = {};
      queryParams.forEach((key, value) {
        if (value != null) {
          stringParams[key] = value.toString();
        }
      });
      return baseUri.replace(queryParameters: stringParams);
    }
    return baseUri;
  }

  Future<ApiResponse<dynamic>> get(
    String path, {
    Map<String, dynamic>? queryParams,
    Map<String, String>? headers,
    bool retryOn401 = true,
  }) async {
    return _sendRequest('GET', path, queryParams: queryParams, headers: headers, retryOn401: retryOn401);
  }

  Future<ApiResponse<dynamic>> post(
    String path, {
    dynamic body,
    Map<String, dynamic>? queryParams,
    Map<String, String>? headers,
    bool retryOn401 = true,
  }) async {
    return _sendRequest('POST', path, body: body, queryParams: queryParams, headers: headers, retryOn401: retryOn401);
  }

  Future<ApiResponse<dynamic>> patch(
    String path, {
    dynamic body,
    Map<String, dynamic>? queryParams,
    Map<String, String>? headers,
    bool retryOn401 = true,
  }) async {
    return _sendRequest('PATCH', path, body: body, queryParams: queryParams, headers: headers, retryOn401: retryOn401);
  }

  Future<ApiResponse<dynamic>> put(
    String path, {
    dynamic body,
    Map<String, dynamic>? queryParams,
    Map<String, String>? headers,
    bool retryOn401 = true,
  }) async {
    return _sendRequest('PUT', path, body: body, queryParams: queryParams, headers: headers, retryOn401: retryOn401);
  }

  Future<ApiResponse<dynamic>> delete(
    String path, {
    dynamic body,
    Map<String, dynamic>? queryParams,
    Map<String, String>? headers,
    bool retryOn401 = true,
  }) async {
    return _sendRequest('DELETE', path, body: body, queryParams: queryParams, headers: headers, retryOn401: retryOn401);
  }

  /// Downloads binary bytes (e.g. PDF or images) directly with strict timeout
  Future<ApiResponse<List<int>>> downloadBytes(
    String path, {
    Map<String, dynamic>? queryParams,
    Map<String, String>? headers,
    Duration? timeout,
  }) async {
    final Uri uri = _buildUri(path, queryParams);
    final effectiveTimeout = timeout ?? ApiConstants.fileDownloadTimeout;

    try {
      final HttpClientRequest request = await _httpClient.getUrl(uri).timeout(
        ApiConstants.connectTimeout,
        onTimeout: () => throw TimeoutException('Connection timeout while downloading from $uri'),
      );

      request.headers.set(HttpHeaders.acceptHeader, 'application/pdf, application/octet-stream, */*');

      final token = SessionManager.instance.accessToken;
      if (token != null && token.isNotEmpty) {
        request.headers.set(HttpHeaders.authorizationHeader, 'Bearer $token');
      }

      if (headers != null) {
        headers.forEach((key, value) {
          request.headers.set(key, value);
        });
      }

      final HttpClientResponse response = await request.close().timeout(
        effectiveTimeout,
        onTimeout: () => throw TimeoutException('Receive timeout while downloading bytes from $uri'),
      );

      if (response.statusCode >= 200 && response.statusCode < 300) {
        final bytes = await response.fold<List<int>>([], (prev, element) => prev..addAll(element)).timeout(
          effectiveTimeout,
          onTimeout: () => throw TimeoutException('Timeout while reading binary stream from $uri'),
        );
        return ApiResponse.success(response.statusCode, bytes);
      } else {
        final String errorBody = await response.transform(utf8.decoder).join();
        return ApiResponse.error(response.statusCode, 'Download failed (HTTP ${response.statusCode}): $errorBody');
      }
    } on TimeoutException catch (e) {
      return ApiResponse.error(408, e.message ?? 'Download timed out (<= 15s limit)');
    } on SocketException catch (e) {
      return ApiResponse.error(0, 'Network unavailable: ${e.message}');
    } catch (e) {
      return ApiResponse.error(500, 'Download error: $e');
    }
  }

  /// Uploads multipart form data with file attachment
  Future<ApiResponse<dynamic>> uploadMultipart(
    String path, {
    required String fileField,
    required List<int> fileBytes,
    required String filename,
    String mimeType = 'application/octet-stream',
    Map<String, String>? fields,
    Map<String, dynamic>? queryParams,
    Map<String, String>? headers,
  }) async {
    final Uri uri = _buildUri(path, queryParams);
    final boundary = '----CareIDFormBoundary${DateTime.now().millisecondsSinceEpoch}';

    try {
      final HttpClientRequest request = await _httpClient.postUrl(uri).timeout(
        ApiConstants.connectTimeout,
        onTimeout: () => throw TimeoutException('Connection timeout while reaching $uri'),
      );

      request.headers.set(HttpHeaders.contentTypeHeader, 'multipart/form-data; boundary=$boundary');
      request.headers.set(HttpHeaders.acceptHeader, 'application/json');

      final token = SessionManager.instance.accessToken;
      if (token != null && token.isNotEmpty) {
        request.headers.set(HttpHeaders.authorizationHeader, 'Bearer $token');
      }

      if (headers != null) {
        headers.forEach((key, value) {
          request.headers.set(key, value);
        });
      }

      final bodyBytes = <int>[];
      // Add form fields
      if (fields != null) {
        for (final entry in fields.entries) {
          bodyBytes.addAll(utf8.encode('--$boundary\r\n'));
          bodyBytes.addAll(utf8.encode('Content-Disposition: form-data; name="${entry.key}"\r\n\r\n'));
          bodyBytes.addAll(utf8.encode('${entry.value}\r\n'));
        }
      }

      // Add file
      bodyBytes.addAll(utf8.encode('--$boundary\r\n'));
      bodyBytes.addAll(utf8.encode('Content-Disposition: form-data; name="$fileField"; filename="$filename"\r\n'));
      bodyBytes.addAll(utf8.encode('Content-Type: $mimeType\r\n\r\n'));
      bodyBytes.addAll(fileBytes);
      bodyBytes.addAll(utf8.encode('\r\n'));

      // Close boundary
      bodyBytes.addAll(utf8.encode('--$boundary--\r\n'));

      request.contentLength = bodyBytes.length;
      request.add(bodyBytes);

      final HttpClientResponse response = await request.close().timeout(ApiConstants.receiveTimeout);
      final String responseBody = await response.transform(utf8.decoder).join();

      dynamic decodedData;
      if (responseBody.isNotEmpty) {
        try {
          decodedData = jsonDecode(responseBody);
        } catch (_) {
          decodedData = responseBody;
        }
      }

      if (response.statusCode >= 200 && response.statusCode < 300) {
        return ApiResponse.success(response.statusCode, decodedData);
      } else {
        return ApiResponse.error(response.statusCode, 'Upload failed (HTTP ${response.statusCode})', decodedData);
      }
    } catch (e) {
      return ApiResponse.error(500, 'Upload error: $e');
    }
  }

  Future<ApiResponse<dynamic>> _sendRequest(
    String method,
    String path, {
    dynamic body,
    Map<String, dynamic>? queryParams,
    Map<String, String>? headers,
    bool retryOn401 = true,
  }) async {
    final Uri uri = _buildUri(path, queryParams);

    try {
      final HttpClientRequest request = await _httpClient.openUrl(method, uri).timeout(
        ApiConstants.connectTimeout,
        onTimeout: () => throw TimeoutException('Connection timeout while reaching $uri'),
      );

      // Default Headers
      request.headers.set(HttpHeaders.contentTypeHeader, 'application/json');
      request.headers.set(HttpHeaders.acceptHeader, 'application/json');

      final token = SessionManager.instance.accessToken;
      if (token != null && token.isNotEmpty) {
        request.headers.set(HttpHeaders.authorizationHeader, 'Bearer $token');
      }

      if (headers != null) {
        headers.forEach((key, value) {
          request.headers.set(key, value);
        });
      }

      if (body != null) {
        final encodedBody = body is String ? body : jsonEncode(body);
        request.write(encodedBody);
      }

      final HttpClientResponse response = await request.close().timeout(
        ApiConstants.receiveTimeout,
        onTimeout: () => throw TimeoutException('Receive timeout while awaiting response from $uri'),
      );

      final String responseBody = await response.transform(utf8.decoder).join().timeout(
        ApiConstants.receiveTimeout,
        onTimeout: () => throw TimeoutException('Timeout while reading response stream from $uri'),
      );

      dynamic decodedData;
      if (responseBody.isNotEmpty) {
        try {
          decodedData = jsonDecode(responseBody);
        } catch (_) {
          decodedData = responseBody;
        }
      }

      final int statusCode = response.statusCode;

      // Handle 401 Unauthorized token refresh with single-flight mutex
      if (statusCode == 401 && retryOn401 && SessionManager.instance.refreshToken != null) {
        final refreshed = await refreshToken();
        if (refreshed) {
          return await _sendRequest(
            method,
            path,
            body: body,
            queryParams: queryParams,
            headers: headers,
            retryOn401: false,
          );
        }
      }

      if (statusCode >= 200 && statusCode < 300) {
        return ApiResponse.success(statusCode, decodedData);
      } else {
        String errorMsg = 'HTTP $statusCode';
        if (decodedData is Map && decodedData['message'] != null) {
          final m = decodedData['message'];
          errorMsg = m is List ? m.join(', ') : m.toString();
        }
        return ApiResponse.error(statusCode, errorMsg, decodedData);
      }
    } on SocketException catch (e) {
      final msg = e.message.toLowerCase();
      final osCode = e.osError?.errorCode;
      if (msg.contains('refused') || osCode == 111 || osCode == 1225) {
        return ApiResponse.error(
          0,
          'Server unreachable: Staging API at ${uri.host} refused the connection (port ${uri.port}). The server service is offline.',
        );
      }
      return ApiResponse.error(0, 'Network connection unavailable: ${e.message}');
    } on HandshakeException catch (e) {
      return ApiResponse.error(0, 'TLS Handshake failed: ${e.message}');
    } on CertificateException catch (e) {
      return ApiResponse.error(0, 'SSL Certificate verification failed: ${e.message}');
    } on TimeoutException catch (e) {
      return ApiResponse.error(408, e.message ?? 'Operation timed out connecting to ${uri.host} (<= 30s limit)');
    } on HttpException catch (e) {
      return ApiResponse.error(0, 'HTTP protocol error: ${e.message}');
    } on FormatException catch (e) {
      return ApiResponse.error(0, 'Invalid data format from server: ${e.message}');
    } catch (e) {
      return ApiResponse.error(500, 'Network error: $e');
    }
  }

  Completer<bool>? _refreshCompleter;

  /// Single-flight token refresh mutex: prevents multiple parallel refresh calls
  Future<bool> refreshToken() async {
    if (_refreshCompleter != null) {
      return _refreshCompleter!.future;
    }

    _refreshCompleter = Completer<bool>();
    try {
      final success = await _attemptTokenRefresh();
      _refreshCompleter!.complete(success);
      return success;
    } catch (e) {
      _refreshCompleter!.complete(false);
      return false;
    } finally {
      _refreshCompleter = null;
    }
  }

  Future<bool> _attemptTokenRefresh() async {
    final refreshToken = SessionManager.instance.refreshToken;
    if (refreshToken == null || refreshToken.isEmpty) return false;

    try {
      final Uri uri = _buildUri('/auth/token/refresh');
      final HttpClientRequest request = await _httpClient.openUrl('POST', uri).timeout(ApiConstants.connectTimeout);
      request.headers.set(HttpHeaders.contentTypeHeader, 'application/json');
      request.headers.set(HttpHeaders.acceptHeader, 'application/json');
      request.write(jsonEncode({'refreshToken': refreshToken}));

      final HttpClientResponse response = await request.close().timeout(ApiConstants.receiveTimeout);
      final String body = await response.transform(utf8.decoder).join();

      if (response.statusCode >= 200 && response.statusCode < 300) {
        final decoded = jsonDecode(body);
        Map<String, dynamic>? dataMap;
        if (decoded is Map<String, dynamic>) {
          if (decoded['data'] is Map<String, dynamic>) {
            dataMap = decoded['data'] as Map<String, dynamic>;
          } else {
            dataMap = decoded;
          }
        }

        if (dataMap != null && dataMap['accessToken'] != null) {
          final newAccess = dataMap['accessToken'].toString();
          final newRefresh = dataMap['refreshToken']?.toString() ?? refreshToken;
          await SessionManager.instance.updateTokens(accessToken: newAccess, refreshToken: newRefresh);
          return true;
        }
      } else if (response.statusCode == 401 || response.statusCode == 403) {
        // Refresh token genuinely revoked, invalid, or session terminated on backend
        await SessionManager.instance.clearSession();
        return false;
      }
      // On 500, 429, or network errors, DO NOT clear the session!
    } catch (_) {
      // Network timeout / connection drop: preserve existing session
    }
    return false;
  }
}

