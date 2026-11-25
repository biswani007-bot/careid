import '../../../core/network/api_client.dart';

class QrService {
  static final QrService _instance = QrService._internal();
  factory QrService() => _instance;
  static QrService get instance => _instance;

  QrService._internal();

  final ApiClient _client = ApiClient.instance;

  /// Lists patient QR codes via GET /qr
  Future<ApiResponse<List<Map<String, dynamic>>>> getQrCodes() async {
    final response = await _client.get('/qr');
    if (response.isSuccess) {
      dynamic list = response.data;
      if (list is Map && list['data'] is List) {
        list = list['data'];
      }
      if (list is List) {
        return ApiResponse.success(
          response.statusCode,
          list.map((e) => Map<String, dynamic>.from(e as Map)).toList(),
        );
      }
      return ApiResponse.success(response.statusCode, []);
    }
    return ApiResponse.error(
      response.statusCode,
      response.errorMessage ?? 'Failed to fetch QR codes',
    );
  }

  /// Generates a new QR token via POST /qr/generate
  /// Note: Uses entityType "CUSTOM" per verified backend contract.
  Future<ApiResponse<Map<String, dynamic>>> generateQr({
    required String entityId,
    String entityType = 'CUSTOM',
    int validityDays = 365,
  }) async {
    final response = await _client.post(
      '/qr/generate',
      body: {
        'entityId': entityId,
        'entityType': entityType,
        'validityDays': validityDays,
      },
    );
    if (response.isSuccess && response.data is Map) {
      var map = Map<String, dynamic>.from(response.data as Map);
      if (map['data'] is Map) {
        map = Map<String, dynamic>.from(map['data'] as Map);
      }
      return ApiResponse.success(response.statusCode, map);
    }
    return ApiResponse.error(
      response.statusCode,
      response.errorMessage ?? 'Failed to generate QR code',
    );
  }

  /// Revokes a generated QR token via POST /qr/:id/revoke
  Future<ApiResponse<dynamic>> revokeQr(String qrId) async {
    return await _client.post('/qr/$qrId/revoke');
  }
}
