import '../../../core/network/api_client.dart';

class HealthCardService {
  static final HealthCardService _instance = HealthCardService._internal();
  factory HealthCardService() => _instance;
  static HealthCardService get instance => _instance;

  HealthCardService._internal();

  final ApiClient _client = ApiClient.instance;

  /// Fetches digital health cards from GET /health-cards
  Future<ApiResponse<List<Map<String, dynamic>>>> getHealthCards() async {
    final response = await _client.get('/health-cards');
    if (response.isSuccess) {
      dynamic cur = response.data;
      while (cur is Map && cur['data'] != null && cur['data'] != cur) {
        cur = cur['data'];
      }
      if (cur is List) {
        final list = cur.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
        return ApiResponse.success(response.statusCode, list);
      }
      if (cur is Map && (cur.containsKey('cardNumber') || cur.containsKey('id'))) {
        return ApiResponse.success(response.statusCode, [Map<String, dynamic>.from(cur)]);
      }
      return ApiResponse.success(response.statusCode, []);
    }
    return ApiResponse.error(response.statusCode, response.errorMessage ?? 'Failed to load health cards');
  }

  /// Activates digital health card via POST /health-cards/:id/activate
  Future<ApiResponse<dynamic>> activateCard(String cardId) async {
    return await _client.post('/health-cards/$cardId/activate');
  }
}

