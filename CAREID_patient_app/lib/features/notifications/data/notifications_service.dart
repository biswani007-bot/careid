import '../../../core/network/api_client.dart';

class NotificationsService {
  static final NotificationsService _instance = NotificationsService._internal();
  factory NotificationsService() => _instance;
  static NotificationsService get instance => _instance;

  NotificationsService._internal();

  final ApiClient _client = ApiClient.instance;

  /// Fetches unread & recent notifications from GET /notifications
  Future<ApiResponse<List<Map<String, dynamic>>>> getNotifications() async {
    final response = await _client.get('/notifications');
    if (response.isSuccess) {
      dynamic list = response.data;
      if (list is Map && list['data'] is List) {
        list = list['data'];
      }
      if (list is List) {
        final parsed = list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
        return ApiResponse.success(response.statusCode, parsed);
      }
      return ApiResponse.success(response.statusCode, []);
    }
    return ApiResponse.error(response.statusCode, response.errorMessage ?? 'Failed to load notifications', []);
  }

  /// Fetches notification preferences from GET /notifications/preferences
  Future<ApiResponse<Map<String, dynamic>>> getPreferences() async {
    final response = await _client.get('/notifications/preferences');
    if (response.isSuccess && response.data is Map) {
      return ApiResponse.success(response.statusCode, Map<String, dynamic>.from(response.data as Map));
    }
    return ApiResponse.error(response.statusCode, response.errorMessage ?? 'Failed to load preferences');
  }

  /// Fetches unread count via GET /notifications/unread-count
  Future<ApiResponse<int>> getUnreadCount() async {
    final response = await _client.get('/notifications/unread-count');
    if (response.isSuccess && response.data is Map) {
      final map = response.data as Map;
      final inner = map['data'] is Map ? map['data'] as Map : map;
      final count = (inner['unreadCount'] as num?)?.toInt() ?? 0;
      return ApiResponse.success(response.statusCode, count);
    }
    return ApiResponse.error(response.statusCode, response.errorMessage ?? 'Failed to load unread count', 0);
  }

  /// Marks a notification as read via PUT /notifications/:id/read
  Future<ApiResponse<dynamic>> markAsRead(String notificationId) async {
    return await _client.put('/notifications/$notificationId/read');
  }

  /// Marks all notifications as read via PUT /notifications/read-all
  Future<ApiResponse<dynamic>> markAllAsRead() async {
    return await _client.put('/notifications/read-all');
  }

  /// Updates notification channel preferences via PUT /notifications/preferences
  Future<ApiResponse<dynamic>> updatePreferences(Map<String, dynamic> preferences) async {
    return await _client.put('/notifications/preferences', body: preferences);
  }
}

